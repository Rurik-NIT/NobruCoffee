'use server'

import { revalidatePath } from 'next/cache'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { proximoCodigo } from '@/server/counters'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num, qty } from '@/lib/money'
import { moeda } from '@/lib/format'
import { movimentar } from '@/server/modules/estoque/service'
import {
  arquivarFornecedorSchema,
  cancelarCompraSchema,
  fornecedorSchema,
  idSchema,
  pedidoCompraSchema,
  recebimentoSchema,
  sugestaoCompraSchema,
} from './schemas'

// ── Fornecedores ──────────────────────────────────────────────────────────

export const salvarFornecedor = acao(fornecedorSchema, async (entrada) => {
  const sessao = await exigirPermissao('fornecedores.gerenciar')
  const dados = {
    nome: entrada.nome,
    razaoSocial: entrada.razaoSocial || null,
    cnpjCpf: entrada.cnpjCpf || null,
    telefone: entrada.telefone || null,
    email: entrada.email || null,
    contato: entrada.contato || null,
    cidade: entrada.cidade || null,
    uf: entrada.uf ? entrada.uf.toUpperCase() : null,
    prazoEntregaDias: entrada.prazoEntregaDias ?? null,
    observacao: entrada.observacao || null,
    ativo: entrada.ativo,
  }
  const fornecedor = entrada.id
    ? await db.fornecedor.update({ where: { id: entrada.id }, data: dados })
    : await db.fornecedor.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'fornecedor.editado' : 'fornecedor.criado',
    entidade: 'fornecedor',
    entidadeId: fornecedor.id,
    novo: { nome: fornecedor.nome },
  })
  revalidatePath('/compras/fornecedores')
  return { id: fornecedor.id, nome: fornecedor.nome }
})

export const arquivarFornecedor = acao(arquivarFornecedorSchema, async ({ id, ativo }) => {
  const sessao = await exigirPermissao('fornecedores.gerenciar')
  const f = await db.fornecedor.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { nome: true } })
  if (!f) throw new ErroDeNegocio('Fornecedor não encontrado.', 'NAO_ENCONTRADO')
  await db.fornecedor.update({ where: { id }, data: { ativo } })
  revalidatePath('/compras/fornecedores')
  return { nome: f.nome, ativo }
})

// ── Pedidos de compra ──────────────────────────────────────────────────────

export const salvarPedidoCompra = acao(pedidoCompraSchema, async (entrada) => {
  const sessao = await exigirPermissao('compras.gerenciar')

  const fornecedor = await db.fornecedor.findFirst({
    where: { id: entrada.fornecedorId, lojaId: sessao.lojaId },
    select: { id: true, nome: true },
  })
  if (!fornecedor) throw new ErroDeNegocio('Fornecedor inválido.', 'VALIDACAO', { fornecedorId: 'Escolha um fornecedor.' })

  if (new Set(entrada.itens.map((i) => i.ingredienteId)).size !== entrada.itens.length) {
    throw new ErroDeNegocio('Há insumos repetidos no pedido. Some as quantidades em uma linha só.', 'VALIDACAO')
  }

  const itens = entrada.itens.map((i) => ({
    ingredienteId: i.ingredienteId,
    quantidade: i.quantidade,
    precoUnitario: i.precoUnitario,
    total: brl(i.quantidade * i.precoUnitario),
  }))
  const total = brl(itens.reduce((a, i) => a + i.total, 0))

  const pedido = await db.$transaction(async (tx) => {
    const dados = {
      fornecedorId: entrada.fornecedorId,
      dataPrevista: entrada.dataPrevista ? new Date(`${entrada.dataPrevista}T12:00:00`) : null,
      observacao: entrada.observacao || null,
      total,
    }

    if (entrada.id) {
      const atual = await tx.pedidoCompra.findFirst({ where: { id: entrada.id, lojaId: sessao.lojaId }, select: { status: true } })
      if (!atual) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
      // Depois do primeiro recebimento os itens ficam travados: mudar as
      // quantidades faria o histórico de recebimento não fechar.
      if (atual.status !== 'RASCUNHO' && atual.status !== 'ENVIADO') {
        throw new ErroDeNegocio('Este pedido já teve recebimento e não pode mais ser editado.')
      }
      await tx.pedidoCompraItem.deleteMany({ where: { pedidoId: entrada.id } })
      return tx.pedidoCompra.update({
        where: { id: entrada.id },
        data: { ...dados, itens: { createMany: { data: itens } } },
        select: { id: true, codigo: true },
      })
    }

    const codigo = await proximoCodigo(tx, sessao.lojaId, 'compra')
    return tx.pedidoCompra.create({
      data: { ...dados, lojaId: sessao.lojaId, codigo, usuarioId: sessao.id, itens: { createMany: { data: itens } } },
      select: { id: true, codigo: true },
    })
  })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'compra.editada' : 'compra.criada',
    entidade: 'pedido_compra',
    entidadeId: pedido.id,
    novo: { codigo: pedido.codigo, fornecedor: fornecedor.nome, total: moeda(total) },
  })

  revalidatePath('/compras')
  return { id: pedido.id, codigo: pedido.codigo, total }
})

export const enviarPedidoCompra = acao(idSchema, async ({ id }) => {
  const sessao = await exigirPermissao('compras.gerenciar')
  const pedido = await db.pedidoCompra.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { status: true, codigo: true } })
  if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
  if (pedido.status !== 'RASCUNHO') throw new ErroDeNegocio('Este pedido já foi enviado.')

  await db.pedidoCompra.update({ where: { id }, data: { status: 'ENVIADO' } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'compra.enviada',
    entidade: 'pedido_compra',
    entidadeId: id,
    novo: { codigo: pedido.codigo },
  })
  revalidatePath('/compras')
  revalidatePath(`/compras/${id}`)
  return { codigo: pedido.codigo }
})

export const cancelarPedidoCompra = acao(cancelarCompraSchema, async ({ id, motivo }) => {
    const sessao = await exigirPermissao('compras.gerenciar')
    const pedido = await db.pedidoCompra.findFirst({
      where: { id, lojaId: sessao.lojaId },
      select: { status: true, codigo: true, _count: { select: { recebimentos: true } } },
    })
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
    if (pedido._count.recebimentos > 0) {
      throw new ErroDeNegocio('Este pedido já teve recebimento. Cancelar apagaria entradas de estoque reais.')
    }

    await db.pedidoCompra.update({ where: { id }, data: { status: 'CANCELADO', observacao: motivo } })
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'compra.cancelada',
      entidade: 'pedido_compra',
      entidadeId: id,
      novo: { codigo: pedido.codigo, motivo },
    })
    revalidatePath('/compras')
    return true
})

// ── Recebimento ────────────────────────────────────────────────────────────

/**
 * Registra o recebimento.
 *
 * É o momento em que a mercadoria vira estoque e o preço da nota vira custo
 * médio. Recebimento parcial é normal: o pedido fica `PARCIAL` até fechar, e
 * fecha sozinho quando o último item chega.
 */
export const registrarRecebimento = acao(recebimentoSchema, async (entrada) => {
  const sessao = await exigirPermissao('compras.receber')

  const resultado = await db.$transaction(
    async (tx) => {
      const pedido = await tx.pedidoCompra.findFirst({
        where: { id: entrada.pedidoCompraId, lojaId: sessao.lojaId },
        include: {
          fornecedor: { select: { id: true, nome: true } },
          itens: { include: { ingrediente: { select: { id: true, nome: true, unidade: true, perecivel: true } } } },
        },
      })
      if (!pedido) throw new ErroDeNegocio('Pedido de compra não encontrado.', 'NAO_ENCONTRADO')
      if (pedido.status === 'CANCELADO') throw new ErroDeNegocio('Este pedido está cancelado.')
      if (pedido.status === 'RECEBIDO') throw new ErroDeNegocio('Este pedido já foi totalmente recebido.')

      const aReceber = entrada.itens.filter((i) => i.quantidade > 0)
      if (aReceber.length === 0) throw new ErroDeNegocio('Informe a quantidade recebida de pelo menos um item.')

      let totalRecebimento = 0
      const itensRecebimento: Array<{
        pedidoCompraItemId: string
        ingredienteId: string
        quantidade: number
        precoUnitario: number
        lote: string | null
        validade: Date | null
      }> = []

      for (const linha of aReceber) {
        const item = pedido.itens.find((i) => i.id === linha.pedidoCompraItemId)
        if (!item) throw new ErroDeNegocio('Item do pedido não encontrado.')

        const pendente = qty(num(item.quantidade) - num(item.quantidadeRecebida))
        if (linha.quantidade > pendente + 0.0005) {
          throw new ErroDeNegocio(
            `${item.ingrediente.nome}: faltam apenas ${pendente} ${item.ingrediente.unidade.toLowerCase()} para receber.`,
            'VALIDACAO',
          )
        }

        const validade = linha.validade ? new Date(`${linha.validade}T12:00:00`) : null
        if (item.ingrediente.perecivel && !validade) {
          throw new ErroDeNegocio(
            `${item.ingrediente.nome} é perecível — informe a validade do lote recebido.`,
            'VALIDACAO',
          )
        }

        let loteId: string | null = null
        if (validade || linha.lote) {
          const lote = await tx.lote.create({
            data: {
              ingredienteId: item.ingredienteId,
              codigo: linha.lote || `${pedido.codigo}-${item.ingrediente.nome.slice(0, 3).toUpperCase()}`,
              quantidade: linha.quantidade,
              quantidadeInicial: linha.quantidade,
              custoUnitario: linha.precoUnitario,
              validade,
            },
            select: { id: true },
          })
          loteId = lote.id
        }

        await movimentar(tx, {
          lojaId: sessao.lojaId,
          ingredienteId: item.ingredienteId,
          tipo: 'ENTRADA_COMPRA',
          quantidade: linha.quantidade,
          custoUnitario: linha.precoUnitario,
          loteId,
          origemTipo: 'recebimento',
          origemId: pedido.id,
          usuarioId: sessao.id,
          observacao: `Compra ${pedido.codigo}${entrada.notaFiscal ? ` · NF ${entrada.notaFiscal}` : ''}`,
        })

        await tx.pedidoCompraItem.update({
          where: { id: item.id },
          data: { quantidadeRecebida: { increment: linha.quantidade } },
        })

        totalRecebimento += linha.quantidade * linha.precoUnitario
        itensRecebimento.push({
          pedidoCompraItemId: item.id,
          ingredienteId: item.ingredienteId,
          quantidade: linha.quantidade,
          precoUnitario: linha.precoUnitario,
          lote: linha.lote || null,
          validade,
        })
      }

      const recebimento = await tx.recebimento.create({
        data: {
          pedidoCompraId: pedido.id,
          notaFiscal: entrada.notaFiscal || null,
          observacao: entrada.observacao || null,
          total: brl(totalRecebimento),
          usuarioId: sessao.id,
          itens: { createMany: { data: itensRecebimento } },
        },
        select: { id: true },
      })

      // O pedido fecha quando não há mais pendência.
      const atualizados = await tx.pedidoCompraItem.findMany({
        where: { pedidoId: pedido.id },
        select: { quantidade: true, quantidadeRecebida: true },
      })
      const completo = atualizados.every((i) => num(i.quantidadeRecebida) >= num(i.quantidade) - 0.0005)
      await tx.pedidoCompra.update({
        where: { id: pedido.id },
        data: { status: completo ? 'RECEBIDO' : 'PARCIAL' },
      })

      if (entrada.gerarContaPagar && totalRecebimento > 0) {
        await tx.contaPagar.create({
          data: {
            lojaId: sessao.lojaId,
            fornecedorId: pedido.fornecedorId,
            pedidoCompraId: pedido.id,
            descricao: `${pedido.fornecedor.nome} — compra ${pedido.codigo}${entrada.notaFiscal ? ` · NF ${entrada.notaFiscal}` : ''}`,
            valor: brl(totalRecebimento),
            vencimento: new Date(Date.now() + entrada.diasVencimento * 86_400_000),
            status: 'PENDENTE',
          },
        })
      }

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'compra.recebida',
          entidade: 'pedido_compra',
          entidadeId: pedido.id,
          novo: {
            codigo: pedido.codigo,
            recebimento: recebimento.id,
            linhas: itensRecebimento.length,
            total: moeda(brl(totalRecebimento)),
            completo,
          },
        },
        tx,
      )

      return { codigo: pedido.codigo, total: brl(totalRecebimento), completo, linhas: itensRecebimento.length }
    },
    { timeout: 30_000 },
  )

  revalidatePath('/compras')
  revalidatePath(`/compras/${entrada.pedidoCompraId}`)
  revalidatePath('/compras/recebimentos')
  revalidatePath('/estoque')
  revalidatePath('/financeiro/pagar')
  return resultado
})

/** Cria um pedido de compra a partir da sugestão de reposição. */
export const criarPedidoDaSugestao = acao(sugestaoCompraSchema, async ({ fornecedorId, itens }) => {
    const sessao = await exigirPermissao('compras.gerenciar')
    const total = brl(itens.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0))

    const pedido = await db.$transaction(async (tx) => {
      const codigo = await proximoCodigo(tx, sessao.lojaId, 'compra')
      return tx.pedidoCompra.create({
        data: {
          lojaId: sessao.lojaId,
          codigo,
          fornecedorId,
          usuarioId: sessao.id,
          total,
          observacao: 'Gerado a partir da sugestão de reposição',
          itens: {
            createMany: {
              data: itens.map((i) => ({
                ingredienteId: i.ingredienteId,
                quantidade: i.quantidade,
                precoUnitario: i.precoUnitario,
                total: brl(i.quantidade * i.precoUnitario),
              })),
            },
          },
        },
        select: { id: true, codigo: true },
      })
    })

    revalidatePath('/compras')
    return pedido
})
