'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { proximoCodigo } from '@/server/counters'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num, qty } from '@/lib/money'
import { moeda, quantidade as fmtQtd } from '@/lib/format'
import { movimentar, recalcularCustoFicha } from './service'

const uuid = z.string().uuid()

// ═══════════════════════════════════════════════════════════════════════════
//  INSUMOS
// ═══════════════════════════════════════════════════════════════════════════

const ingredienteSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Dê um nome ao insumo.').max(80),
  sku: z
    .string()
    .trim()
    .min(2, 'Informe um código.')
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen.'),
  unidade: z.enum(['G', 'KG', 'ML', 'L', 'UN', 'PCT', 'CX']),
  custoMedio: z.number().min(0).max(999_999),
  estoqueMinimo: z.number().min(0).max(9_999_999).default(0),
  estoqueMaximo: z.number().min(0).max(9_999_999).nullable().optional(),
  localArmazenagem: z.string().trim().max(60).optional().or(z.literal('')),
  perecivel: z.boolean().default(false),
  fornecedorPadraoId: uuid.nullable().optional(),
  ativo: z.boolean().default(true),
  /** Saldo inicial, aceito apenas na criação. */
  saldoInicial: z.number().min(0).max(9_999_999).default(0),
})

export const salvarIngrediente = acao(ingredienteSchema, async (entrada) => {
  const sessao = await exigirPermissao('estoque.gerenciar')

  if (entrada.estoqueMaximo && entrada.estoqueMaximo < entrada.estoqueMinimo) {
    throw new ErroDeNegocio('O máximo não pode ser menor que o mínimo.', 'VALIDACAO', {
      estoqueMaximo: 'Precisa ser maior que o mínimo.',
    })
  }

  const dados = {
    nome: entrada.nome,
    sku: entrada.sku.toUpperCase(),
    unidade: entrada.unidade,
    custoMedio: entrada.custoMedio,
    estoqueMinimo: entrada.estoqueMinimo,
    estoqueMaximo: entrada.estoqueMaximo ?? null,
    localArmazenagem: entrada.localArmazenagem || null,
    perecivel: entrada.perecivel,
    fornecedorPadraoId: entrada.fornecedorPadraoId ?? null,
    ativo: entrada.ativo,
  }

  const ingrediente = await db.$transaction(async (tx) => {
    if (entrada.id) {
      const anterior = await tx.ingrediente.findFirst({ where: { id: entrada.id, lojaId: sessao.lojaId } })
      if (!anterior) throw new ErroDeNegocio('Insumo não encontrado.', 'NAO_ENCONTRADO')
      // Trocar a unidade de um insumo com saldo invalidaria fichas e histórico.
      if (anterior.unidade !== entrada.unidade && num(anterior.estoqueAtual) !== 0) {
        throw new ErroDeNegocio(
          'Não é possível mudar a unidade de um insumo com saldo. Zere o estoque por ajuste e tente de novo.',
          'CONFLITO',
          { unidade: 'Insumo com saldo em estoque.' },
        )
      }
      return tx.ingrediente.update({ where: { id: entrada.id }, data: dados })
    }

    const criado = await tx.ingrediente.create({ data: { ...dados, lojaId: sessao.lojaId } })
    if (entrada.saldoInicial > 0) {
      await movimentar(tx, {
        lojaId: sessao.lojaId,
        ingredienteId: criado.id,
        tipo: 'ENTRADA_MANUAL',
        quantidade: entrada.saldoInicial,
        custoUnitario: entrada.custoMedio,
        origemTipo: 'cadastro',
        origemId: criado.id,
        usuarioId: sessao.id,
        observacao: 'Saldo inicial do cadastro',
      })
    }
    return criado
  })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'ingrediente.editado' : 'ingrediente.criado',
    entidade: 'ingrediente',
    entidadeId: ingrediente.id,
    novo: dados,
  })

  revalidatePath('/estoque')
  return { id: ingrediente.id, nome: ingrediente.nome }
})

export const arquivarIngrediente = acao(z.object({ id: uuid, ativo: z.boolean() }), async ({ id, ativo }) => {
  const sessao = await exigirPermissao('estoque.gerenciar')
  const ing = await db.ingrediente.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { nome: true } })
  if (!ing) throw new ErroDeNegocio('Insumo não encontrado.', 'NAO_ENCONTRADO')

  if (!ativo) {
    const emUso = await db.fichaTecnicaItem.count({ where: { ingredienteId: id, ficha: { ativa: true } } })
    if (emUso > 0) {
      throw new ErroDeNegocio(
        `${ing.nome} está em ${emUso} ficha(s) técnica(s) ativa(s). Remova das fichas antes de arquivar.`,
        'CONFLITO',
      )
    }
  }

  await db.ingrediente.update({ where: { id }, data: { ativo } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: ativo ? 'ingrediente.reativado' : 'ingrediente.arquivado',
    entidade: 'ingrediente',
    entidadeId: id,
  })
  revalidatePath('/estoque')
  return { nome: ing.nome, ativo }
})

// ═══════════════════════════════════════════════════════════════════════════
//  MOVIMENTAÇÕES MANUAIS
// ═══════════════════════════════════════════════════════════════════════════

const movimentoSchema = z.object({
  ingredienteId: uuid,
  tipo: z.enum(['ENTRADA_MANUAL', 'SAIDA_MANUAL']),
  quantidade: z.number().min(0.001, 'Informe a quantidade.').max(9_999_999),
  custoUnitario: z.number().min(0).max(999_999).optional(),
  lote: z.string().trim().max(40).optional().or(z.literal('')),
  validade: z.string().optional().or(z.literal('')),
  observacao: z.string().trim().min(3, 'Explique o motivo do lançamento.').max(200),
})

export const lancarMovimento = acao(movimentoSchema, async (entrada) => {
  const sessao = await exigirPermissao('estoque.movimentar')

  const resultado = await db.$transaction(async (tx) => {
    const ingrediente = await tx.ingrediente.findFirst({
      where: { id: entrada.ingredienteId, lojaId: sessao.lojaId },
      select: { id: true, nome: true, unidade: true, custoMedio: true, perecivel: true },
    })
    if (!ingrediente) throw new ErroDeNegocio('Insumo não encontrado.', 'NAO_ENCONTRADO')

    let loteId: string | null = null
    if (entrada.tipo === 'ENTRADA_MANUAL' && (entrada.lote || entrada.validade)) {
      const lote = await tx.lote.create({
        data: {
          ingredienteId: ingrediente.id,
          codigo: entrada.lote || `MAN-${Date.now().toString(36).toUpperCase()}`,
          quantidade: entrada.quantidade,
          quantidadeInicial: entrada.quantidade,
          custoUnitario: entrada.custoUnitario ?? num(ingrediente.custoMedio),
          validade: entrada.validade ? new Date(entrada.validade) : null,
        },
        select: { id: true },
      })
      loteId = lote.id
    }

    const mov = await movimentar(tx, {
      lojaId: sessao.lojaId,
      ingredienteId: ingrediente.id,
      tipo: entrada.tipo,
      quantidade: entrada.quantidade,
      custoUnitario: entrada.custoUnitario,
      loteId,
      origemTipo: 'manual',
      origemId: null,
      usuarioId: sessao.id,
      observacao: entrada.observacao,
    })

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: 'estoque.movimento_manual',
        entidade: 'ingrediente',
        entidadeId: ingrediente.id,
        novo: {
          tipo: entrada.tipo,
          quantidade: fmtQtd(entrada.quantidade, ingrediente.unidade),
          saldoApos: fmtQtd(mov.saldoApos, ingrediente.unidade),
          observacao: entrada.observacao,
        },
      },
      tx,
    )

    return { nome: ingrediente.nome, saldoApos: mov.saldoApos, unidade: ingrediente.unidade }
  })

  revalidatePath('/estoque')
  revalidatePath('/estoque/movimentacoes')
  return resultado
})

/** Ajuste direto de saldo — a operação mais sensível do estoque. */
export const ajustarSaldo = acao(
  z.object({
    ingredienteId: uuid,
    saldoNovo: z.number().min(0).max(9_999_999),
    motivo: z.string().trim().min(3, 'Explique o motivo do ajuste.').max(200),
  }),
  async ({ ingredienteId, saldoNovo, motivo }) => {
    const sessao = await exigirPermissao('estoque.ajustar')

    const resultado = await db.$transaction(async (tx) => {
      const ing = await tx.ingrediente.findFirst({
        where: { id: ingredienteId, lojaId: sessao.lojaId },
        select: { nome: true, unidade: true, estoqueAtual: true, custoMedio: true },
      })
      if (!ing) throw new ErroDeNegocio('Insumo não encontrado.', 'NAO_ENCONTRADO')

      const saldoAtual = num(ing.estoqueAtual)
      const diferenca = qty(saldoNovo - saldoAtual)
      if (diferenca === 0) throw new ErroDeNegocio('O saldo informado é igual ao atual — nada a ajustar.')

      await movimentar(tx, {
        lojaId: sessao.lojaId,
        ingredienteId,
        tipo: diferenca > 0 ? 'ENTRADA_MANUAL' : 'AJUSTE_INVENTARIO',
        quantidade: Math.abs(diferenca),
        origemTipo: 'ajuste',
        usuarioId: sessao.id,
        observacao: motivo,
        permitirNegativo: true,
      })

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'estoque.ajustado',
          entidade: 'ingrediente',
          entidadeId: ingredienteId,
          anterior: { saldo: fmtQtd(saldoAtual, ing.unidade) },
          novo: {
            saldo: fmtQtd(saldoNovo, ing.unidade),
            diferenca: fmtQtd(diferenca, ing.unidade),
            impacto: moeda(brl(diferenca * num(ing.custoMedio))),
            motivo,
          },
        },
        tx,
      )

      return { nome: ing.nome, saldoNovo, diferenca }
    })

    revalidatePath('/estoque')
    revalidatePath('/estoque/movimentacoes')
    return resultado
  },
)

// ═══════════════════════════════════════════════════════════════════════════
//  INVENTÁRIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Contagem de estoque.
 *
 * Abrir o inventário congela o saldo do sistema em cada item — sem esse retrato
 * a diferença apurada no fim não significa nada, porque o estoque continua se
 * mexendo durante a contagem.
 */
export const abrirInventario = acao(
  z.object({ observacao: z.string().trim().max(200).optional().or(z.literal('')) }),
  async ({ observacao }) => {
    const sessao = await exigirPermissao('estoque.inventariar')

    const inventario = await db.$transaction(async (tx) => {
      const aberto = await tx.inventario.findFirst({
        where: { lojaId: sessao.lojaId, status: 'ABERTO' },
        select: { id: true, codigo: true },
      })
      if (aberto) {
        throw new ErroDeNegocio(`O inventário ${aberto.codigo} já está aberto. Finalize antes de abrir outro.`, 'CONFLITO')
      }

      const ingredientes = await tx.ingrediente.findMany({
        where: { lojaId: sessao.lojaId, ativo: true },
        select: { id: true, estoqueAtual: true, custoMedio: true },
      })
      if (ingredientes.length === 0) throw new ErroDeNegocio('Cadastre insumos antes de abrir um inventário.')

      const codigo = await proximoCodigo(tx, sessao.lojaId, 'inventario')
      return tx.inventario.create({
        data: {
          lojaId: sessao.lojaId,
          codigo,
          usuarioId: sessao.id,
          observacao: observacao || null,
          itens: {
            createMany: {
              data: ingredientes.map((i) => ({
                ingredienteId: i.id,
                quantidadeSistema: i.estoqueAtual,
                custoUnitario: i.custoMedio,
              })),
            },
          },
        },
        select: { id: true, codigo: true },
      })
    })

    revalidatePath('/estoque/inventario')
    return inventario
  },
)

export const contarItemInventario = acao(
  z.object({ itemId: uuid, quantidadeContada: z.number().min(0).max(9_999_999).nullable() }),
  async ({ itemId, quantidadeContada }) => {
    const sessao = await exigirPermissao('estoque.inventariar')
    const item = await db.inventarioItem.findUnique({
      where: { id: itemId },
      select: { inventario: { select: { lojaId: true, status: true } } },
    })
    if (!item || item.inventario.lojaId !== sessao.lojaId) throw new ErroDeNegocio('Item não encontrado.', 'NAO_ENCONTRADO')
    if (item.inventario.status !== 'ABERTO') throw new ErroDeNegocio('Este inventário já foi finalizado.')

    await db.inventarioItem.update({ where: { id: itemId }, data: { quantidadeContada } })
    revalidatePath('/estoque/inventario')
    return true
  },
)

export const finalizarInventario = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('estoque.inventariar')

  const resultado = await db.$transaction(
    async (tx) => {
      const inventario = await tx.inventario.findFirst({
        where: { id, lojaId: sessao.lojaId },
        include: { itens: { include: { ingrediente: { select: { nome: true, unidade: true } } } } },
      })
      if (!inventario) throw new ErroDeNegocio('Inventário não encontrado.', 'NAO_ENCONTRADO')
      if (inventario.status !== 'ABERTO') throw new ErroDeNegocio('Este inventário já foi finalizado.')

      const contados = inventario.itens.filter((i) => i.quantidadeContada !== null)
      if (contados.length === 0) throw new ErroDeNegocio('Conte pelo menos um item antes de finalizar.')

      let ajusteValor = 0
      let ajustados = 0

      for (const item of contados) {
        const contada = num(item.quantidadeContada)
        // Compara com o saldo ATUAL, não com o congelado: o que interessa é
        // deixar o sistema igual à prateleira agora.
        const atual = await tx.ingrediente.findUniqueOrThrow({
          where: { id: item.ingredienteId },
          select: { estoqueAtual: true },
        })
        const diferenca = qty(contada - num(atual.estoqueAtual))
        if (diferenca === 0) continue

        await movimentar(tx, {
          lojaId: sessao.lojaId,
          ingredienteId: item.ingredienteId,
          tipo: diferenca > 0 ? 'ENTRADA_MANUAL' : 'AJUSTE_INVENTARIO',
          quantidade: Math.abs(diferenca),
          origemTipo: 'inventario',
          origemId: inventario.id,
          usuarioId: sessao.id,
          observacao: `Inventário ${inventario.codigo}`,
          permitirNegativo: true,
        })

        ajusteValor += diferenca * num(item.custoUnitario)
        ajustados += 1
      }

      await tx.inventario.update({
        where: { id },
        data: { status: 'FINALIZADO', finalizadoEm: new Date(), ajusteValor: brl(ajusteValor) },
      })

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'inventario.finalizado',
          entidade: 'inventario',
          entidadeId: id,
          novo: { codigo: inventario.codigo, itensAjustados: ajustados, impacto: moeda(brl(ajusteValor)) },
        },
        tx,
      )

      return { codigo: inventario.codigo, ajustados, ajusteValor: brl(ajusteValor) }
    },
    { timeout: 30_000 },
  )

  revalidatePath('/estoque')
  revalidatePath('/estoque/inventario')
  return resultado
})

export const cancelarInventario = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('estoque.inventariar')
  const inv = await db.inventario.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { status: true, codigo: true } })
  if (!inv) throw new ErroDeNegocio('Inventário não encontrado.', 'NAO_ENCONTRADO')
  if (inv.status !== 'ABERTO') throw new ErroDeNegocio('Só é possível cancelar um inventário aberto.')

  await db.inventario.update({ where: { id }, data: { status: 'CANCELADO', finalizadoEm: new Date() } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'inventario.cancelado',
    entidade: 'inventario',
    entidadeId: id,
    anterior: { codigo: inv.codigo },
  })
  revalidatePath('/estoque/inventario')
  return true
})

/** Recalcula o custo de todas as fichas afetadas por mudança de custo médio. */
export const recalcularCustos = acao(z.object({ produtoId: uuid.optional() }), async ({ produtoId }) => {
  const sessao = await exigirPermissao('fichas.gerenciar')
  const fichas = await db.fichaTecnica.findMany({
    where: { ativa: true, produto: { lojaId: sessao.lojaId, ...(produtoId ? { id: produtoId } : {}) } },
    select: { id: true },
  })

  await db.$transaction(
    async (tx) => {
      for (const f of fichas) await recalcularCustoFicha(tx, f.id)
    },
    { timeout: 60_000 },
  )

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'fichas.custos_recalculados',
    entidade: 'ficha_tecnica',
    novo: { fichas: fichas.length },
  })

  revalidatePath('/fichas-tecnicas')
  revalidatePath('/produtos')
  return { fichas: fichas.length }
})
