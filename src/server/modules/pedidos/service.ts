import 'server-only'

import type { Prisma } from '@prisma/client'

import { db, type Tx } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num, ratear } from '@/lib/money'

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  PEDIDO — o documento único de venda
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Decisão de modelagem (docs/ARQUITETURA.md § Pedido vs Venda): não existe
 * tabela `vendas` separada. Uma venda **é** um pedido com `status =
 * FINALIZADO` e pagamentos aprovados. Manter dois documentos para o mesmo fato
 * significaria duplicar itens, totais e custo, e abrir espaço para divergirem —
 * o pior defeito possível num sistema de caixa.
 *
 * Consequência prática: relatório de vendas, ticket médio e CMV consultam
 * `pedidos` com esse filtro. Balcão, mesa, delivery e encomenda são o mesmo
 * documento com `tipo` diferente.
 */

export const PEDIDO_FINALIZADO: Prisma.PedidoWhereInput = { status: 'FINALIZADO' }

/**
 * Recalcula subtotal, desconto, taxas, total e custo a partir dos itens.
 * Chamada depois de qualquer mexida em item — nunca confiamos no total que
 * veio do cliente.
 */
export async function recalcularPedido(tx: Tx, pedidoId: string) {
  const pedido = await tx.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      itens: { where: { status: { not: 'CANCELADO' } }, include: { adicionais: true } },
      cupom: true,
    },
  })
  if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')

  let subtotal = 0
  let custoTotal = 0

  for (const item of pedido.itens) {
    const qtd = num(item.quantidade)
    const adicionais = item.adicionais.reduce((acc, a) => acc + num(a.preco) * num(a.quantidade), 0)
    const totalItem = brl(qtd * num(item.precoUnitario) + adicionais - num(item.descontoValor))
    subtotal += totalItem
    custoTotal += qtd * num(item.custoUnitario)
    if (num(item.total) !== totalItem) {
      await tx.pedidoItem.update({ where: { id: item.id }, data: { total: totalItem } })
    }
  }

  subtotal = brl(subtotal)

  // Desconto manual e cupom não se somam: vale o maior, e o operador vê qual.
  let descontoManual = num(pedido.descontoValor)
  let descontoCupom = 0
  if (pedido.cupom) {
    descontoCupom =
      pedido.cupom.tipo === 'PERCENTUAL'
        ? brl((subtotal * num(pedido.cupom.valor)) / 100)
        : Math.min(num(pedido.cupom.valor), subtotal)
  }
  if (descontoCupom > 0 && descontoCupom >= descontoManual) descontoManual = 0

  const desconto = Math.min(brl(descontoManual + descontoCupom), subtotal)
  const total = brl(subtotal - desconto + num(pedido.taxaEntrega) + num(pedido.taxaServico))

  await tx.pedido.update({
    where: { id: pedidoId },
    data: { subtotal, total, custoTotal: brl(custoTotal) },
  })

  return { subtotal, desconto, descontoCupom, total: brl(total), custoTotal: brl(custoTotal) }
}

/** Preço final de um item, considerando variação e adicionais. */
export function precoDoItem(params: {
  precoBase: number
  precoDeltaVariacao?: number
  adicionais?: Array<{ preco: number; quantidade: number }>
}) {
  const unitario = brl(params.precoBase + (params.precoDeltaVariacao ?? 0))
  const extras = brl((params.adicionais ?? []).reduce((acc, a) => acc + a.preco * a.quantidade, 0))
  return { unitario, extras }
}

// ───────────────────────────────────────────────────────────────────────────
//  CONSULTAS
// ───────────────────────────────────────────────────────────────────────────

export type PedidoCompleto = Awaited<ReturnType<typeof obterPedido>>

export async function obterPedido(lojaId: string, pedidoId: string) {
  const pedido = await db.pedido.findFirst({
    where: { id: pedidoId, lojaId },
    include: {
      itens: {
        orderBy: { criadoEm: 'asc' },
        include: {
          adicionais: true,
          produto: { select: { id: true, nome: true, imagemUrl: true, unidade: true } },
          variacao: { select: { id: true, nome: true } },
        },
      },
      pagamentos: {
        orderBy: { criadoEm: 'asc' },
        include: { formaPagamento: { select: { nome: true, tipo: true } } },
      },
      cliente: { select: { id: true, nome: true, telefone: true, pontos: true } },
      mesa: { select: { id: true, numero: true, nome: true } },
      cupom: { select: { id: true, codigo: true, tipo: true, valor: true } },
      usuario: { select: { id: true, nome: true } },
      canceladoPor: { select: { nome: true } },
      encomenda: { select: { id: true, codigo: true } },
    },
  })
  if (!pedido) return null

  return {
    ...pedido,
    subtotal: num(pedido.subtotal),
    descontoValor: num(pedido.descontoValor),
    taxaEntrega: num(pedido.taxaEntrega),
    taxaServico: num(pedido.taxaServico),
    total: num(pedido.total),
    custoTotal: num(pedido.custoTotal),
    itens: pedido.itens.map((i) => ({
      ...i,
      quantidade: num(i.quantidade),
      precoUnitario: num(i.precoUnitario),
      custoUnitario: num(i.custoUnitario),
      descontoValor: num(i.descontoValor),
      total: num(i.total),
      adicionais: i.adicionais.map((a) => ({ ...a, preco: num(a.preco), quantidade: num(a.quantidade) })),
    })),
    pagamentos: pedido.pagamentos.map((p) => ({
      ...p,
      valor: num(p.valor),
      valorRecebido: p.valorRecebido === null ? null : num(p.valorRecebido),
      troco: num(p.troco),
      taxaValor: num(p.taxaValor),
    })),
    cupom: pedido.cupom ? { ...pedido.cupom, valor: num(pedido.cupom.valor) } : null,
    pagoTotal: brl(
      pedido.pagamentos.filter((p) => p.status === 'APROVADO').reduce((acc, p) => acc + num(p.valor), 0),
    ),
  }
}

export type FiltroPedidos = {
  lojaId: string
  busca?: string
  status?: string
  tipo?: string
  de?: Date
  ate?: Date
  caixaId?: string
  usuarioId?: string
  pagina?: number
  porPagina?: number
}

export async function listarPedidos(filtro: FiltroPedidos) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 25

  const where: Prisma.PedidoWhereInput = { lojaId: filtro.lojaId, emEspera: false }
  if (filtro.status && filtro.status !== 'todos') where.status = filtro.status as never
  if (filtro.tipo && filtro.tipo !== 'todos') where.tipo = filtro.tipo as never
  if (filtro.caixaId) where.caixaId = filtro.caixaId
  if (filtro.usuarioId) where.usuarioId = filtro.usuarioId
  if (filtro.de || filtro.ate) {
    where.abertoEm = { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
  }
  if (filtro.busca) {
    where.OR = [
      { codigo: { contains: filtro.busca, mode: 'insensitive' } },
      { nomeCliente: { contains: filtro.busca, mode: 'insensitive' } },
      { cliente: { nome: { contains: filtro.busca, mode: 'insensitive' } } },
      { cliente: { telefone: { contains: filtro.busca } } },
    ]
  }

  const [total, pedidos, somas] = await Promise.all([
    db.pedido.count({ where }),
    db.pedido.findMany({
      where,
      orderBy: { abertoEm: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        cliente: { select: { nome: true } },
        mesa: { select: { numero: true } },
        usuario: { select: { nome: true } },
        _count: { select: { itens: true } },
        pagamentos: { where: { status: 'APROVADO' }, select: { formaPagamento: { select: { nome: true } } } },
      },
    }),
    db.pedido.aggregate({ where: { ...where, status: 'FINALIZADO' }, _sum: { total: true }, _count: true }),
  ])

  return {
    itens: pedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      tipo: p.tipo,
      status: p.status,
      abertoEm: p.abertoEm,
      finalizadoEm: p.finalizadoEm,
      total: num(p.total),
      itens: p._count.itens,
      cliente: p.cliente?.nome ?? p.nomeCliente ?? null,
      mesa: p.mesa?.numero ?? null,
      operador: p.usuario.nome,
      formas: [...new Set(p.pagamentos.map((pg) => pg.formaPagamento.nome))],
    })),
    total,
    pagina,
    porPagina,
    totalFaturado: num(somas._sum.total),
    finalizados: somas._count,
  }
}

/** Pedidos em espera (hold) do operador — a fila do balcão cheio. */
export async function listarEmEspera(lojaId: string) {
  const pedidos = await db.pedido.findMany({
    where: { lojaId, emEspera: true, status: 'ABERTO' },
    orderBy: { abertoEm: 'asc' },
    include: { _count: { select: { itens: true } }, cliente: { select: { nome: true } } },
  })
  return pedidos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    tipo: p.tipo,
    abertoEm: p.abertoEm,
    total: num(p.total),
    itens: p._count.itens,
    cliente: p.cliente?.nome ?? p.nomeCliente ?? null,
  }))
}

/** Fila da cozinha/balcão: o que precisa sair agora. */
export async function listarFilaPreparo(lojaId: string) {
  const pedidos = await db.pedido.findMany({
    where: { lojaId, status: { in: ['ABERTO', 'EM_PREPARO', 'PRONTO'] }, emEspera: false },
    orderBy: { abertoEm: 'asc' },
    include: {
      itens: {
        where: { status: { not: 'CANCELADO' } },
        select: { id: true, nome: true, quantidade: true, observacao: true, status: true },
      },
      mesa: { select: { numero: true } },
      cliente: { select: { nome: true } },
    },
    take: 40,
  })
  return pedidos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    tipo: p.tipo,
    status: p.status,
    abertoEm: p.abertoEm,
    minutosAberto: Math.round((Date.now() - p.abertoEm.getTime()) / 60_000),
    mesa: p.mesa?.numero ?? null,
    cliente: p.cliente?.nome ?? p.nomeCliente ?? null,
    total: num(p.total),
    itens: p.itens.map((i) => ({ ...i, quantidade: num(i.quantidade) })),
  }))
}

/** Catálogo pronto para o PDV: uma consulta, tudo que a grade precisa. */
export async function catalogoParaPdv(lojaId: string) {
  const [categorias, produtos, adicionais, formas] = await Promise.all([
    db.categoria.findMany({
      where: { lojaId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, cor: true },
    }),
    db.produto.findMany({
      where: { lojaId, ativo: true },
      orderBy: [{ destaque: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        sku: true,
        imagemUrl: true,
        categoriaId: true,
        tipo: true,
        precoVenda: true,
        precoCusto: true,
        disponivel: true,
        controlaEstoque: true,
        estoqueAtual: true,
        destaque: true,
        variacoes: {
          where: { ativo: true },
          orderBy: { ordem: 'asc' },
          select: { id: true, nome: true, precoDelta: true, custoDelta: true },
        },
        adicionais: { select: { adicionalId: true } },
      },
    }),
    db.adicional.findMany({
      where: { lojaId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, preco: true },
    }),
    db.formaPagamento.findMany({
      where: { lojaId, ativo: true },
      orderBy: { ordem: 'asc' },
      select: { id: true, nome: true, tipo: true, permiteTroco: true, contaNoCaixa: true, taxaPercentual: true },
    }),
  ])

  return {
    categorias,
    produtos: produtos.map((p) => ({
      ...p,
      precoVenda: num(p.precoVenda),
      precoCusto: num(p.precoCusto),
      estoqueAtual: num(p.estoqueAtual),
      variacoes: p.variacoes.map((v) => ({ ...v, precoDelta: num(v.precoDelta), custoDelta: num(v.custoDelta) })),
      adicionaisIds: p.adicionais.map((a) => a.adicionalId),
    })),
    adicionais: adicionais.map((a) => ({ ...a, preco: num(a.preco) })),
    formasPagamento: formas.map((f) => ({ ...f, taxaPercentual: num(f.taxaPercentual) })),
  }
}

/**
 * Divide o custo do combo entre os componentes na hora da baixa de estoque,
 * proporcional ao preço de venda de cada um.
 */
export function ratearCombo(
  total: number,
  componentes: Array<{ produtoId: string; quantidade: number; precoVenda: number }>,
) {
  const partes = ratear(
    total,
    componentes.map((c) => c.precoVenda * c.quantidade),
  )
  return componentes.map((c, i) => ({ ...c, valor: partes[i] }))
}
