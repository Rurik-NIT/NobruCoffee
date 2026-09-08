'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao, exigirSessao } from '@/server/auth/session'
import { temPermissao } from '@/server/auth/permissions'
import { proximoCodigo } from '@/server/counters'
import { db, type Tx } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num, type DecimalLike } from '@/lib/money'
import { moeda } from '@/lib/format'
import { exigirCaixaAberto } from '@/server/modules/caixa/service'
import { movimentar } from '@/server/modules/estoque/service'
import { finalizarNaTransacao } from './finalizar'
import { precoDoItem, recalcularPedido } from './service'

const uuid = z.string().uuid()

// ═══════════════════════════════════════════════════════════════════════════
//  ABRIR / FECHAR O DOCUMENTO
// ═══════════════════════════════════════════════════════════════════════════

const abrirSchema = z.object({
  tipo: z.enum(['BALCAO', 'MESA', 'VIAGEM', 'DELIVERY', 'ENCOMENDA', 'IFOOD']).default('BALCAO'),
  mesaId: uuid.nullable().optional(),
  clienteId: uuid.nullable().optional(),
  nomeCliente: z.string().trim().max(80).optional().or(z.literal('')),
})

export const abrirPedido = acao(abrirSchema, async (entrada) => {
  const sessao = await exigirPermissao('pdv.operar')

  if (entrada.tipo === 'MESA' && !entrada.mesaId) {
    throw new ErroDeNegocio('Escolha a mesa.', 'VALIDACAO', { mesaId: 'Escolha a mesa.' })
  }

  const pedido = await db.$transaction(async (tx) => {
    if (entrada.mesaId) {
      const mesa = await tx.mesa.findFirst({ where: { id: entrada.mesaId, lojaId: sessao.lojaId } })
      if (!mesa) throw new ErroDeNegocio('Mesa não encontrada.', 'NAO_ENCONTRADO')
      const jaAberto = await tx.pedido.findFirst({
        where: { mesaId: entrada.mesaId, status: { in: ['ABERTO', 'EM_PREPARO', 'PRONTO'] } },
        select: { id: true, codigo: true },
      })
      if (jaAberto) {
        throw new ErroDeNegocio(
          `A mesa ${mesa.numero} já tem o pedido ${jaAberto.codigo} aberto. Abra esse pedido para adicionar itens.`,
          'CONFLITO',
        )
      }
      await tx.mesa.update({ where: { id: entrada.mesaId }, data: { status: 'OCUPADA' } })
    }

    const codigo = await proximoCodigo(tx, sessao.lojaId, 'pedido')
    return tx.pedido.create({
      data: {
        lojaId: sessao.lojaId,
        codigo,
        tipo: entrada.tipo,
        mesaId: entrada.mesaId ?? null,
        clienteId: entrada.clienteId ?? null,
        nomeCliente: entrada.nomeCliente || null,
        usuarioId: sessao.id,
      },
      select: { id: true, codigo: true },
    })
  })

  revalidatePath('/pdv')
  revalidatePath('/mesas')
  return pedido
})

// ═══════════════════════════════════════════════════════════════════════════
//  ITENS
// ═══════════════════════════════════════════════════════════════════════════

const adicionarItemSchema = z.object({
  pedidoId: uuid,
  produtoId: uuid,
  variacaoId: uuid.nullable().optional(),
  quantidade: z.number().min(0.001).max(999),
  observacao: z.string().trim().max(160).optional().or(z.literal('')),
  adicionais: z.array(z.object({ adicionalId: uuid, quantidade: z.number().min(1).max(20).default(1) })).max(15).default([]),
})

export const adicionarItem = acao(adicionarItemSchema, async (entrada) => {
  const sessao = await exigirPermissao('pdv.operar')

  const resultado = await db.$transaction(async (tx) => {
    const pedido = await exigirPedidoAberto(tx, sessao.lojaId, entrada.pedidoId)

    const produto = await tx.produto.findFirst({
      where: { id: entrada.produtoId, lojaId: sessao.lojaId },
      include: { variacoes: true },
    })
    if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')
    if (!produto.ativo) throw new ErroDeNegocio(`${produto.nome} está arquivado e não pode ser vendido.`)
    if (!produto.disponivel) throw new ErroDeNegocio(`${produto.nome} está marcado como esgotado hoje.`)

    const variacao = entrada.variacaoId ? produto.variacoes.find((v) => v.id === entrada.variacaoId) : null
    if (entrada.variacaoId && !variacao) throw new ErroDeNegocio('Variação inválida para este produto.')

    const adicionais = entrada.adicionais.length
      ? await tx.adicional.findMany({
          where: { id: { in: entrada.adicionais.map((a) => a.adicionalId) }, lojaId: sessao.lojaId, ativo: true },
        })
      : []

    const listaAdicionais = entrada.adicionais.map((pedido_) => {
      const ad = adicionais.find((a) => a.id === pedido_.adicionalId)
      if (!ad) throw new ErroDeNegocio('Adicional indisponível.')
      return { adicionalId: ad.id, nome: ad.nome, preco: num(ad.preco), quantidade: pedido_.quantidade }
    })

    const { unitario, extras } = precoDoItem({
      precoBase: num(produto.precoVenda),
      precoDeltaVariacao: variacao ? num(variacao.precoDelta) : 0,
      adicionais: listaAdicionais,
    })
    const custoUnitario = num(produto.precoCusto) + (variacao ? num(variacao.custoDelta) : 0)

    const item = await tx.pedidoItem.create({
      data: {
        pedidoId: pedido.id,
        produtoId: produto.id,
        variacaoId: variacao?.id ?? null,
        nome: variacao ? `${produto.nome} · ${variacao.nome}` : produto.nome,
        quantidade: entrada.quantidade,
        precoUnitario: unitario,
        custoUnitario,
        total: brl(entrada.quantidade * unitario + extras),
        observacao: entrada.observacao || null,
        adicionais: listaAdicionais.length
          ? {
              createMany: {
                data: listaAdicionais.map((a) => ({
                  adicionalId: a.adicionalId,
                  nome: a.nome,
                  preco: a.preco,
                  quantidade: a.quantidade,
                })),
              },
            }
          : undefined,
      },
      select: { id: true, nome: true },
    })

    const totais = await recalcularPedido(tx, pedido.id)
    return { itemId: item.id, nome: item.nome, ...totais }
  })

  revalidatePath('/pdv')
  return resultado
})

export const alterarQuantidadeItem = acao(
  z.object({ itemId: uuid, quantidade: z.number().min(0.001).max(999) }),
  async ({ itemId, quantidade }) => {
    const sessao = await exigirPermissao('pdv.operar')
    const resultado = await db.$transaction(async (tx) => {
      const item = await tx.pedidoItem.findUnique({ where: { id: itemId }, select: { pedidoId: true } })
      if (!item) throw new ErroDeNegocio('Item não encontrado.', 'NAO_ENCONTRADO')
      await exigirPedidoAberto(tx, sessao.lojaId, item.pedidoId)
      await tx.pedidoItem.update({ where: { id: itemId }, data: { quantidade } })
      return recalcularPedido(tx, item.pedidoId)
    })
    revalidatePath('/pdv')
    return resultado
  },
)

export const removerItem = acao(z.object({ itemId: uuid, motivo: z.string().trim().max(160).optional() }), async ({ itemId, motivo }) => {
  const sessao = await exigirPermissao('pdv.cancelar_item')
  const resultado = await db.$transaction(async (tx) => {
    const item = await tx.pedidoItem.findUnique({
      where: { id: itemId },
      select: { pedidoId: true, nome: true, quantidade: true, total: true },
    })
    if (!item) throw new ErroDeNegocio('Item não encontrado.', 'NAO_ENCONTRADO')
    const pedido = await exigirPedidoAberto(tx, sessao.lojaId, item.pedidoId)

    await tx.pedidoItem.delete({ where: { id: itemId } })
    const totais = await recalcularPedido(tx, item.pedidoId)

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: 'pedido.item_cancelado',
        entidade: 'pedido',
        entidadeId: pedido.id,
        anterior: { item: item.nome, quantidade: num(item.quantidade), valor: moeda(item.total) },
        novo: { motivo: motivo || null },
      },
      tx,
    )
    return totais
  })
  revalidatePath('/pdv')
  return resultado
})

// ═══════════════════════════════════════════════════════════════════════════
//  DESCONTO, CUPOM, CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

const descontoSchema = z.object({
  pedidoId: uuid,
  tipo: z.enum(['PERCENTUAL', 'VALOR']),
  valor: z.number().min(0).max(999_999),
  motivo: z.string().trim().max(160).optional().or(z.literal('')),
})

export const aplicarDesconto = acao(descontoSchema, async (entrada) => {
  const sessao = await exigirPermissao(['pdv.desconto', 'pdv.desconto_livre'])

  const resultado = await db.$transaction(async (tx) => {
    const pedido = await exigirPedidoAberto(tx, sessao.lojaId, entrada.pedidoId)
    const config = await tx.configuracao.findUnique({
      where: { lojaId: sessao.lojaId },
      select: { descontoMaximoOperador: true },
    })

    const subtotal = num(pedido.subtotal)
    const valorDesconto =
      entrada.tipo === 'PERCENTUAL' ? brl((subtotal * entrada.valor) / 100) : Math.min(entrada.valor, subtotal)
    const percentual = subtotal > 0 ? (valorDesconto / subtotal) * 100 : 0
    const limite = num(config?.descontoMaximoOperador ?? 10)

    // O limite da loja só é ultrapassado por quem tem permissão para isso.
    if (percentual > limite && !temPermissao(sessao.permissoes, 'pdv.desconto_livre')) {
      throw new ErroDeNegocio(
        `Seu limite de desconto é ${limite}%. Este pedido precisa de ${percentual.toFixed(1)}% — chame um gerente.`,
        'SEM_PERMISSAO',
      )
    }
    if (valorDesconto > 0 && !entrada.motivo) {
      throw new ErroDeNegocio('Informe o motivo do desconto.', 'VALIDACAO', { motivo: 'Obrigatório para desconto.' })
    }

    await tx.pedido.update({
      where: { id: pedido.id },
      data: { descontoValor: valorDesconto, descontoMotivo: entrada.motivo || null },
    })

    const totais = await recalcularPedido(tx, pedido.id)

    if (valorDesconto > 0) {
      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'pedido.desconto_aplicado',
          entidade: 'pedido',
          entidadeId: pedido.id,
          novo: { valor: moeda(valorDesconto), percentual: `${percentual.toFixed(1)}%`, motivo: entrada.motivo },
        },
        tx,
      )
    }
    return totais
  })

  revalidatePath('/pdv')
  return resultado
})

export const aplicarCupom = acao(
  z.object({ pedidoId: uuid, codigo: z.string().trim().min(1, 'Informe o código.').max(30) }),
  async ({ pedidoId, codigo }) => {
    const sessao = await exigirPermissao('pdv.operar')

    const resultado = await db.$transaction(async (tx) => {
      const pedido = await exigirPedidoAberto(tx, sessao.lojaId, pedidoId)
      const cupom = await tx.cupom.findFirst({
        where: { lojaId: sessao.lojaId, codigo: codigo.toUpperCase() },
      })
      if (!cupom) throw new ErroDeNegocio('Cupom não encontrado.', 'VALIDACAO', { codigo: 'Cupom não encontrado.' })
      if (!cupom.ativo) throw new ErroDeNegocio('Este cupom está desativado.')

      const hoje = new Date()
      if (cupom.validoDe && cupom.validoDe > hoje) throw new ErroDeNegocio('Este cupom ainda não começou a valer.')
      if (cupom.validoAte && cupom.validoAte < hoje) throw new ErroDeNegocio('Este cupom já venceu.')
      if (cupom.usoMaximo !== null && cupom.usosFeitos >= cupom.usoMaximo) {
        throw new ErroDeNegocio('Este cupom já atingiu o limite de usos.')
      }
      if (num(pedido.subtotal) < num(cupom.minimoCompra)) {
        throw new ErroDeNegocio(`Este cupom vale a partir de ${moeda(cupom.minimoCompra)}.`)
      }
      if (cupom.clienteId && cupom.clienteId !== pedido.clienteId) {
        throw new ErroDeNegocio('Este cupom é nominal e pertence a outro cliente.')
      }

      await tx.pedido.update({ where: { id: pedido.id }, data: { cupomId: cupom.id } })
      const totais = await recalcularPedido(tx, pedido.id)
      return { ...totais, cupom: cupom.codigo }
    })

    revalidatePath('/pdv')
    return resultado
  },
)

export const removerCupom = acao(z.object({ pedidoId: uuid }), async ({ pedidoId }) => {
  const sessao = await exigirPermissao('pdv.operar')
  const resultado = await db.$transaction(async (tx) => {
    await exigirPedidoAberto(tx, sessao.lojaId, pedidoId)
    await tx.pedido.update({ where: { id: pedidoId }, data: { cupomId: null } })
    return recalcularPedido(tx, pedidoId)
  })
  revalidatePath('/pdv')
  return resultado
})

export const vincularCliente = acao(
  z.object({ pedidoId: uuid, clienteId: uuid.nullable(), nomeCliente: z.string().trim().max(80).optional() }),
  async ({ pedidoId, clienteId, nomeCliente }) => {
    const sessao = await exigirPermissao('pdv.operar')
    await db.$transaction(async (tx) => {
      await exigirPedidoAberto(tx, sessao.lojaId, pedidoId)
      if (clienteId) {
        const cliente = await tx.cliente.findFirst({ where: { id: clienteId, lojaId: sessao.lojaId } })
        if (!cliente) throw new ErroDeNegocio('Cliente não encontrado.', 'NAO_ENCONTRADO')
      }
      await tx.pedido.update({
        where: { id: pedidoId },
        data: { clienteId, nomeCliente: nomeCliente || null },
      })
    })
    revalidatePath('/pdv')
    return true
  },
)

export const definirTaxas = acao(
  z.object({ pedidoId: uuid, taxaEntrega: z.number().min(0).max(999).default(0), taxaServico: z.number().min(0).max(9999).default(0) }),
  async ({ pedidoId, taxaEntrega, taxaServico }) => {
    const sessao = await exigirPermissao('pdv.operar')
    const resultado = await db.$transaction(async (tx) => {
      await exigirPedidoAberto(tx, sessao.lojaId, pedidoId)
      await tx.pedido.update({ where: { id: pedidoId }, data: { taxaEntrega, taxaServico } })
      return recalcularPedido(tx, pedidoId)
    })
    revalidatePath('/pdv')
    return resultado
  },
)

/** Deixa o pedido em espera para atender outro cliente e voltar depois. */
export const alternarEspera = acao(z.object({ pedidoId: uuid, emEspera: z.boolean() }), async ({ pedidoId, emEspera }) => {
  const sessao = await exigirPermissao('pdv.operar')
  await db.$transaction(async (tx) => {
    const pedido = await exigirPedidoAberto(tx, sessao.lojaId, pedidoId)
    if (emEspera) {
      const itens = await tx.pedidoItem.count({ where: { pedidoId: pedido.id } })
      if (itens === 0) throw new ErroDeNegocio('Adicione ao menos um item antes de colocar em espera.')
    }
    await tx.pedido.update({ where: { id: pedidoId }, data: { emEspera } })
  })
  revalidatePath('/pdv')
  return { emEspera }
})

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  FINALIZAR — a transação central do sistema
//
//  Dois caminhos, um núcleo (ver ./finalizar.ts):
//   • venderDireto     → balcão: carrinho montado na tela, pedido nasce pago.
//   • finalizarPedido  → mesa/delivery/encomenda: pedido já existe, só fecha.
// ═══════════════════════════════════════════════════════════════════════════

const pagamentosSchema = z
  .array(
    z.object({
      formaPagamentoId: uuid,
      valor: z.number().min(0.01, 'Valor do pagamento inválido.'),
      valorRecebido: z.number().min(0).optional(),
      nsu: z.string().trim().max(40).optional().or(z.literal('')),
    }),
  )
  .min(1, 'Escolha ao menos uma forma de pagamento.')
  .max(4, 'No máximo 4 formas por pedido.')

const finalizarSchema = z.object({
  pedidoId: uuid,
  pagamentos: pagamentosSchema,
  pontosResgatar: z.number().int().min(0).max(1_000_000).default(0),
})

export const finalizarPedido = acao(finalizarSchema, async (entrada) => {
  const sessao = await exigirPermissao('pdv.operar')

  const resultado = await db.$transaction(
    async (tx) => {
      await exigirPedidoAberto(tx, sessao.lojaId, entrada.pedidoId)
      const caixa = await exigirCaixaAberto(tx, sessao.lojaId)

      return finalizarNaTransacao(tx, {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        pedidoId: entrada.pedidoId,
        caixaId: caixa.id,
        caixaCodigo: caixa.codigo,
        pagamentos: entrada.pagamentos,
        pontosResgatar: entrada.pontosResgatar,
      })
    },
    { timeout: 20_000 },
  )

  revalidatePath('/pdv')
  revalidatePath('/pedidos')
  revalidatePath('/dashboard')
  revalidatePath('/caixas')
  revalidatePath('/mesas')
  return resultado
})

const itemCarrinhoSchema = z.object({
  produtoId: uuid,
  variacaoId: uuid.nullable().optional(),
  quantidade: z.number().min(0.001).max(999),
  observacao: z.string().trim().max(160).optional().or(z.literal('')),
  adicionais: z
    .array(z.object({ adicionalId: uuid, quantidade: z.number().min(1).max(20).default(1) }))
    .max(15)
    .default([]),
})

const venderDiretoSchema = z.object({
  tipo: z.enum(['BALCAO', 'VIAGEM', 'DELIVERY', 'IFOOD']).default('BALCAO'),
  clienteId: uuid.nullable().optional(),
  nomeCliente: z.string().trim().max(80).optional().or(z.literal('')),
  itens: z.array(itemCarrinhoSchema).min(1, 'O carrinho está vazio.').max(80),
  descontoValor: z.number().min(0).max(999_999).default(0),
  descontoMotivo: z.string().trim().max(160).optional().or(z.literal('')),
  cupomCodigo: z.string().trim().max(30).optional().or(z.literal('')),
  taxaEntrega: z.number().min(0).max(999).default(0),
  taxaServico: z.number().min(0).max(9999).default(0),
  observacao: z.string().trim().max(240).optional().or(z.literal('')),
  pagamentos: pagamentosSchema,
  pontosResgatar: z.number().int().min(0).max(1_000_000).default(0),
})

/**
 * Venda de balcão em um só golpe.
 *
 * O carrinho vive na tela até o pagamento — assim tocar num donut é instantâneo,
 * sem ida ao servidor por item. No "Confirmar", tudo acontece numa transação:
 * pedido, itens, pagamentos, caixa, estoque e fidelidade. Se qualquer parte
 * falhar (um insumo sem saldo, por exemplo), nada é gravado e o operador vê o
 * motivo — melhor do que uma venda registrada pela metade.
 */
export const venderDireto = acao(venderDiretoSchema, async (entrada) => {
  const sessao = await exigirPermissao('pdv.operar')

  const resultado = await db.$transaction(
    async (tx) => {
      const caixa = await exigirCaixaAberto(tx, sessao.lojaId)

      // ── Monta o pedido com os preços do banco, nunca os do cliente ──────
      const produtos = await tx.produto.findMany({
        where: { id: { in: [...new Set(entrada.itens.map((i) => i.produtoId))] }, lojaId: sessao.lojaId },
        include: { variacoes: true },
      })
      const idsAdicionais = [...new Set(entrada.itens.flatMap((i) => i.adicionais.map((a) => a.adicionalId)))]
      const adicionais = idsAdicionais.length
        ? await tx.adicional.findMany({ where: { id: { in: idsAdicionais }, lojaId: sessao.lojaId, ativo: true } })
        : []

      const codigo = await proximoCodigo(tx, sessao.lojaId, 'pedido')
      const pedido = await tx.pedido.create({
        data: {
          lojaId: sessao.lojaId,
          codigo,
          tipo: entrada.tipo,
          clienteId: entrada.clienteId ?? null,
          nomeCliente: entrada.nomeCliente || null,
          usuarioId: sessao.id,
          caixaId: caixa.id,
          descontoValor: entrada.descontoValor,
          descontoMotivo: entrada.descontoMotivo || null,
          taxaEntrega: entrada.taxaEntrega,
          taxaServico: entrada.taxaServico,
          observacao: entrada.observacao || null,
        },
        select: { id: true, codigo: true },
      })

      for (const linha of entrada.itens) {
        const produto = produtos.find((p) => p.id === linha.produtoId)
        if (!produto) throw new ErroDeNegocio('Um dos produtos do carrinho não existe mais.')
        if (!produto.ativo) throw new ErroDeNegocio(`${produto.nome} está arquivado e não pode ser vendido.`)
        if (!produto.disponivel) throw new ErroDeNegocio(`${produto.nome} está marcado como esgotado hoje.`)

        const variacao = linha.variacaoId ? produto.variacoes.find((v) => v.id === linha.variacaoId) : null
        if (linha.variacaoId && !variacao) throw new ErroDeNegocio(`Variação inválida em ${produto.nome}.`)

        const listaAdicionais = linha.adicionais.map((a) => {
          const ad = adicionais.find((x) => x.id === a.adicionalId)
          if (!ad) throw new ErroDeNegocio('Um dos adicionais não está mais disponível.')
          return { adicionalId: ad.id, nome: ad.nome, preco: num(ad.preco), quantidade: a.quantidade }
        })

        const { unitario, extras } = precoDoItem({
          precoBase: num(produto.precoVenda),
          precoDeltaVariacao: variacao ? num(variacao.precoDelta) : 0,
          adicionais: listaAdicionais,
        })

        await tx.pedidoItem.create({
          data: {
            pedidoId: pedido.id,
            produtoId: produto.id,
            variacaoId: variacao?.id ?? null,
            nome: variacao ? `${produto.nome} · ${variacao.nome}` : produto.nome,
            quantidade: linha.quantidade,
            precoUnitario: unitario,
            custoUnitario: num(produto.precoCusto) + (variacao ? num(variacao.custoDelta) : 0),
            total: brl(linha.quantidade * unitario + extras),
            observacao: linha.observacao || null,
            adicionais: listaAdicionais.length
              ? {
                  createMany: {
                    data: listaAdicionais.map((a) => ({
                      adicionalId: a.adicionalId,
                      nome: a.nome,
                      preco: a.preco,
                      quantidade: a.quantidade,
                    })),
                  },
                }
              : undefined,
          },
        })
      }

      // ── Cupom, se informado ─────────────────────────────────────────────
      if (entrada.cupomCodigo) {
        const cupom = await tx.cupom.findFirst({
          where: { lojaId: sessao.lojaId, codigo: entrada.cupomCodigo.toUpperCase(), ativo: true },
        })
        if (!cupom) throw new ErroDeNegocio('Cupom não encontrado ou desativado.', 'VALIDACAO')
        const hoje = new Date()
        if (cupom.validoDe && cupom.validoDe > hoje) throw new ErroDeNegocio('Este cupom ainda não começou a valer.')
        if (cupom.validoAte && cupom.validoAte < hoje) throw new ErroDeNegocio('Este cupom já venceu.')
        if (cupom.usoMaximo !== null && cupom.usosFeitos >= cupom.usoMaximo) {
          throw new ErroDeNegocio('Este cupom já atingiu o limite de usos.')
        }
        if (cupom.clienteId && cupom.clienteId !== (entrada.clienteId ?? null)) {
          throw new ErroDeNegocio('Este cupom é nominal e pertence a outro cliente.')
        }
        await tx.pedido.update({ where: { id: pedido.id }, data: { cupomId: cupom.id } })
      }

      // ── Limite de desconto do operador ──────────────────────────────────
      if (entrada.descontoValor > 0) {
        const totais = await recalcularPedido(tx, pedido.id)
        const config = await tx.configuracao.findUnique({
          where: { lojaId: sessao.lojaId },
          select: { descontoMaximoOperador: true },
        })
        const limite = num(config?.descontoMaximoOperador ?? 10)
        const percentual = totais.subtotal > 0 ? (entrada.descontoValor / totais.subtotal) * 100 : 0
        if (percentual > limite && !temPermissao(sessao.permissoes, 'pdv.desconto_livre')) {
          throw new ErroDeNegocio(
            `Seu limite de desconto é ${limite}%. Este pedido precisa de ${percentual.toFixed(1)}% — chame um gerente.`,
            'SEM_PERMISSAO',
          )
        }
        if (!entrada.descontoMotivo) {
          throw new ErroDeNegocio('Informe o motivo do desconto.', 'VALIDACAO', { descontoMotivo: 'Obrigatório.' })
        }
      }

      return finalizarNaTransacao(tx, {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        pedidoId: pedido.id,
        caixaId: caixa.id,
        caixaCodigo: caixa.codigo,
        pagamentos: entrada.pagamentos,
        pontosResgatar: entrada.pontosResgatar,
      })
    },
    { timeout: 25_000 },
  )

  revalidatePath('/pdv')
  revalidatePath('/pedidos')
  revalidatePath('/dashboard')
  revalidatePath('/caixas')
  return resultado
})


// ═══════════════════════════════════════════════════════════════════════════
//  CANCELAR E ESTORNAR
// ═══════════════════════════════════════════════════════════════════════════

export const cancelarPedido = acao(
  z.object({ pedidoId: uuid, motivo: z.string().trim().min(3, 'Informe o motivo.').max(200) }),
  async ({ pedidoId, motivo }) => {
    const sessao = await exigirPermissao('pdv.cancelar_pedido')

    await db.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: { id: pedidoId, lojaId: sessao.lojaId },
        include: { pagamentos: { where: { status: 'APROVADO' } } },
      })
      if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
      if (pedido.status === 'CANCELADO') throw new ErroDeNegocio('Este pedido já está cancelado.')

      // Pedido já finalizado: desfaz estoque, pagamentos e fidelidade.
      if (pedido.status === 'FINALIZADO') {
        await exigirPermissao('pdv.estornar')
        await estornarEfeitos(tx, { pedido, usuarioId: sessao.id, lojaId: sessao.lojaId, motivo })
      }

      if (pedido.mesaId) {
        await tx.mesa.update({ where: { id: pedido.mesaId }, data: { status: 'LIVRE' } })
      }

      await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          status: 'CANCELADO',
          canceladoEm: new Date(),
          canceladoMotivo: motivo,
          canceladoPorId: sessao.id,
          emEspera: false,
          itens: { updateMany: { where: {}, data: { status: 'CANCELADO' } } },
        },
      })

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'pedido.cancelado',
          entidade: 'pedido',
          entidadeId: pedidoId,
          anterior: { status: pedido.status, total: moeda(pedido.total) },
          novo: { motivo },
        },
        tx,
      )
    })

    revalidatePath('/pdv')
    revalidatePath('/pedidos')
    revalidatePath('/caixas')
    revalidatePath('/dashboard')
    return true
  },
)

/** Desfaz os lançamentos de uma venda finalizada. */
async function estornarEfeitos(
  tx: Tx,
  params: {
    pedido: { id: string; codigo: string; clienteId: string | null; total: DecimalLike; caixaId: string | null; pontosGerados: number; pontosResgatados: number; cupomId: string | null }
    usuarioId: string
    lojaId: string
    motivo: string
  },
) {
  const { pedido } = params

  // 1. Devolve os movimentos de estoque originados por este pedido.
  const movimentos = await tx.movimentoEstoque.findMany({
    where: { origemTipo: 'pedido', origemId: pedido.id, tipo: 'SAIDA_VENDA' },
  })
  for (const m of movimentos) {
    await movimentar(tx, {
      lojaId: params.lojaId,
      ...(m.ingredienteId ? { ingredienteId: m.ingredienteId } : { produtoId: m.produtoId! }),
      tipo: 'ESTORNO_VENDA',
      quantidade: Math.abs(num(m.quantidade)),
      custoUnitario: num(m.custoUnitario),
      origemTipo: 'pedido_estorno',
      origemId: pedido.id,
      usuarioId: params.usuarioId,
      observacao: `Estorno do pedido ${pedido.codigo}: ${params.motivo}`,
    })
  }

  // 2. Estorna pagamentos e lança a contrapartida no caixa.
  const pagamentos = await tx.pagamento.findMany({ where: { pedidoId: pedido.id, status: 'APROVADO' } })
  for (const p of pagamentos) {
    await tx.pagamento.update({
      where: { id: p.id },
      data: { status: 'ESTORNADO', estornadoEm: new Date(), estornoMotivo: params.motivo },
    })
    if (p.caixaId) {
      await tx.movimentoCaixa.create({
        data: {
          caixaId: p.caixaId,
          tipo: 'ESTORNO',
          formaPagamentoId: p.formaPagamentoId,
          valor: -num(p.valor),
          descricao: `Estorno do pedido ${pedido.codigo}`,
          pedidoId: pedido.id,
          usuarioId: params.usuarioId,
        },
      })
    }
  }

  // 3. Desfaz métricas e pontos do cliente.
  if (pedido.clienteId) {
    const cliente = await tx.cliente.update({
      where: { id: pedido.clienteId },
      data: {
        totalGasto: { decrement: num(pedido.total) },
        totalPedidos: { decrement: 1 },
        pontos: { decrement: pedido.pontosGerados - pedido.pontosResgatados },
      },
      select: { pontos: true },
    })
    await tx.transacaoFidelidade.create({
      data: {
        clienteId: pedido.clienteId,
        tipo: 'AJUSTE',
        pontos: -(pedido.pontosGerados - pedido.pontosResgatados),
        saldoApos: cliente.pontos,
        pedidoId: pedido.id,
        descricao: `Estorno do pedido ${pedido.codigo}`,
        usuarioId: params.usuarioId,
      },
    })
  }

  // 4. Libera o uso do cupom e cancela fiado gerado.
  if (pedido.cupomId) {
    await tx.cupom.update({ where: { id: pedido.cupomId }, data: { usosFeitos: { decrement: 1 } } })
  }
  await tx.contaReceber.updateMany({
    where: { pedidoId: pedido.id, status: { in: ['PENDENTE', 'PARCIAL'] } },
    data: { status: 'CANCELADO' },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILA DE PREPARO
// ═══════════════════════════════════════════════════════════════════════════

export const avancarStatusPedido = acao(
  z.object({ pedidoId: uuid, status: z.enum(['ABERTO', 'EM_PREPARO', 'PRONTO']) }),
  async ({ pedidoId, status }) => {
    const sessao = await exigirPermissao('pedidos.editar')
    const pedido = await db.pedido.findFirst({ where: { id: pedidoId, lojaId: sessao.lojaId }, select: { status: true } })
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
    if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
      throw new ErroDeNegocio('Este pedido já foi encerrado.')
    }
    await db.pedido.update({ where: { id: pedidoId }, data: { status } })
    revalidatePath('/pedidos')
    revalidatePath('/pdv')
    return { status }
  },
)

export const avancarStatusItem = acao(
  z.object({ itemId: uuid, status: z.enum(['PENDENTE', 'PREPARANDO', 'PRONTO', 'ENTREGUE']) }),
  async ({ itemId, status }) => {
    await exigirPermissao('pedidos.editar')
    await db.pedidoItem.update({ where: { id: itemId }, data: { status } })
    revalidatePath('/pedidos')
    return { status }
  },
)

// ───────────────────────────────────────────────────────────────────────────

async function exigirPedidoAberto(tx: Tx, lojaId: string, pedidoId: string) {
  const pedido = await tx.pedido.findFirst({ where: { id: pedidoId, lojaId } })
  if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
  if (pedido.status === 'FINALIZADO') throw new ErroDeNegocio('Este pedido já foi finalizado.')
  if (pedido.status === 'CANCELADO') throw new ErroDeNegocio('Este pedido está cancelado.')
  return pedido
}

/** Usada pelo recibo e pela reimpressão. */
export const obterReciboAction = acao(z.object({ pedidoId: uuid }), async ({ pedidoId }) => {
  const sessao = await exigirSessao()
  const { obterPedido } = await import('./service')
  const pedido = await obterPedido(sessao.lojaId, pedidoId)
  if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
  return pedido
})
