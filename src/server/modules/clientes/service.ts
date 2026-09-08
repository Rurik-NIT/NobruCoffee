import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num } from '@/lib/money'

/**
 * CRM da cafeteria.
 *
 * O que a loja precisa saber de um cliente não é o cadastro — é quando ele
 * esteve aqui pela última vez, quanto costuma gastar e qual é o produto dele.
 * Essas três informações abrem qualquer conversa no balcão.
 */
export type FiltroClientes = {
  lojaId: string
  busca?: string
  situacao?: 'todos' | 'ativos' | 'inativos' | 'aniversariantes' | 'sumidos'
  pagina?: number
  porPagina?: number
}

export async function listarClientes(filtro: FiltroClientes) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 25

  const where: Prisma.ClienteWhereInput = { lojaId: filtro.lojaId }
  if (filtro.situacao === 'inativos') where.ativo = false
  else if (filtro.situacao !== 'todos') where.ativo = true
  if (filtro.busca) {
    where.OR = [
      { nome: { contains: filtro.busca, mode: 'insensitive' } },
      { telefone: { contains: filtro.busca.replace(/\D/g, '') || filtro.busca } },
      { email: { contains: filtro.busca, mode: 'insensitive' } },
    ]
  }
  // Sumido: comprou alguma vez e não voltou há mais de 60 dias.
  if (filtro.situacao === 'sumidos') {
    where.ultimaCompraEm = { lt: new Date(Date.now() - 60 * 86_400_000) }
  }
  if (filtro.situacao === 'aniversariantes') {
    const hoje = new Date()
    const ids = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM clientes
      WHERE loja_id = ${filtro.lojaId}::uuid
        AND data_nascimento IS NOT NULL
        AND EXTRACT(MONTH FROM data_nascimento) = ${hoje.getMonth() + 1}
    `
    where.id = { in: ids.map((i) => i.id) }
  }

  const [total, clientes, agregados] = await Promise.all([
    db.cliente.count({ where }),
    db.cliente.findMany({
      where,
      orderBy: [{ ultimaCompraEm: { sort: 'desc', nulls: 'last' } }, { nome: 'asc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        nome: true,
        telefone: true,
        email: true,
        dataNascimento: true,
        pontos: true,
        totalGasto: true,
        totalPedidos: true,
        ultimaCompraEm: true,
        ativo: true,
        cidade: true,
      },
    }),
    db.cliente.aggregate({ where, _sum: { totalGasto: true }, _avg: { totalGasto: true } }),
  ])

  return {
    itens: clientes.map((c) => ({
      ...c,
      totalGasto: num(c.totalGasto),
      ticketMedio: c.totalPedidos > 0 ? brl(num(c.totalGasto) / c.totalPedidos) : 0,
      diasSemComprar: c.ultimaCompraEm
        ? Math.floor((Date.now() - c.ultimaCompraEm.getTime()) / 86_400_000)
        : null,
    })),
    total,
    pagina,
    porPagina,
    faturamentoTotal: num(agregados._sum.totalGasto),
    gastoMedio: num(agregados._avg.totalGasto),
  }
}

export async function obterCliente(lojaId: string, id: string) {
  const cliente = await db.cliente.findFirst({
    where: { id, lojaId },
    include: {
      pedidos: {
        where: { status: 'FINALIZADO' },
        orderBy: { finalizadoEm: 'desc' },
        take: 20,
        select: {
          id: true,
          codigo: true,
          tipo: true,
          total: true,
          finalizadoEm: true,
          itens: { select: { nome: true, quantidade: true }, take: 4 },
        },
      },
      encomendas: {
        orderBy: { dataEntrega: 'desc' },
        take: 10,
        select: { id: true, codigo: true, status: true, dataEntrega: true, valorTotal: true },
      },
      fidelidade: { orderBy: { criadoEm: 'desc' }, take: 20 },
      cupons: { where: { ativo: true }, select: { id: true, codigo: true, tipo: true, valor: true, validoAte: true } },
    },
  })
  if (!cliente) return null

  // Produtos favoritos: o que ele mais levou, em quantidade.
  const favoritos = await db.pedidoItem.groupBy({
    by: ['produtoId'],
    where: { pedido: { clienteId: id, status: 'FINALIZADO' }, status: { not: 'CANCELADO' } },
    _sum: { quantidade: true, total: true },
    orderBy: { _sum: { quantidade: 'desc' } },
    take: 5,
  })
  const produtos = favoritos.length
    ? await db.produto.findMany({
        where: { id: { in: favoritos.map((f) => f.produtoId) } },
        select: { id: true, nome: true },
      })
    : []

  return {
    ...cliente,
    totalGasto: num(cliente.totalGasto),
    ticketMedio: cliente.totalPedidos > 0 ? brl(num(cliente.totalGasto) / cliente.totalPedidos) : 0,
    pedidos: cliente.pedidos.map((p) => ({
      ...p,
      total: num(p.total),
      itens: p.itens.map((i) => ({ ...i, quantidade: num(i.quantidade) })),
    })),
    encomendas: cliente.encomendas.map((e) => ({ ...e, valorTotal: num(e.valorTotal) })),
    cupons: cliente.cupons.map((c) => ({ ...c, valor: num(c.valor) })),
    favoritos: favoritos.map((f) => ({
      rotulo: produtos.find((p) => p.id === f.produtoId)?.nome ?? 'Produto removido',
      valor: num(f._sum.quantidade),
      apoio: `${num(f._sum.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no total`,
    })),
  }
}

/** Busca rápida usada no PDV e nas encomendas. */
export async function buscarClientes(lojaId: string, termo: string, limite = 20) {
  const digitos = termo.replace(/\D/g, '')
  const clientes = await db.cliente.findMany({
    where: {
      lojaId,
      ativo: true,
      OR: [
        { nome: { contains: termo, mode: 'insensitive' } },
        ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
      ],
    },
    select: { id: true, nome: true, telefone: true, pontos: true, totalPedidos: true },
    orderBy: { nome: 'asc' },
    take: limite,
  })
  return clientes
}

export async function listarCupons(lojaId: string) {
  const cupons = await db.cupom.findMany({
    where: { lojaId },
    orderBy: [{ ativo: 'desc' }, { criadoEm: 'desc' }],
    include: { cliente: { select: { id: true, nome: true } }, _count: { select: { pedidos: true } } },
  })
  const hoje = new Date()
  return cupons.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    descricao: c.descricao,
    tipo: c.tipo,
    valor: num(c.valor),
    minimoCompra: num(c.minimoCompra),
    usoMaximo: c.usoMaximo,
    usosFeitos: c.usosFeitos,
    validoDe: c.validoDe,
    validoAte: c.validoAte,
    cliente: c.cliente,
    ativo: c.ativo,
    vencido: Boolean(c.validoAte && c.validoAte < hoje),
    esgotado: c.usoMaximo !== null && c.usosFeitos >= c.usoMaximo,
    pedidos: c._count.pedidos,
  }))
}

/** Painel de fidelidade: quanto de ponto está na rua e quem mais acumula. */
export async function resumoFidelidade(lojaId: string) {
  const [saldo, top, movimentos, config] = await Promise.all([
    db.cliente.aggregate({ where: { lojaId, ativo: true }, _sum: { pontos: true }, _count: true }),
    db.cliente.findMany({
      where: { lojaId, ativo: true, pontos: { gt: 0 } },
      orderBy: { pontos: 'desc' },
      take: 8,
      select: { id: true, nome: true, pontos: true, totalGasto: true },
    }),
    db.transacaoFidelidade.findMany({
      where: { cliente: { lojaId } },
      orderBy: { criadoEm: 'desc' },
      take: 25,
      include: { cliente: { select: { id: true, nome: true } }, usuario: { select: { nome: true } } },
    }),
    db.configuracao.findUnique({ where: { lojaId }, select: { pontosPorReal: true, valorPorPonto: true } }),
  ])

  const pontosEmCirculacao = saldo._sum.pontos ?? 0
  const valorPorPonto = num(config?.valorPorPonto ?? 0.05)

  return {
    pontosEmCirculacao,
    passivoEstimado: brl(pontosEmCirculacao * valorPorPonto),
    clientesComPontos: top.length,
    pontosPorReal: num(config?.pontosPorReal ?? 1),
    valorPorPonto,
    top: top.map((c) => ({ ...c, totalGasto: num(c.totalGasto) })),
    movimentos: movimentos.map((m) => ({
      id: m.id,
      cliente: m.cliente,
      tipo: m.tipo,
      pontos: m.pontos,
      saldoApos: m.saldoApos,
      descricao: m.descricao,
      usuario: m.usuario?.nome ?? 'Sistema',
      criadoEm: m.criadoEm,
    })),
  }
}
