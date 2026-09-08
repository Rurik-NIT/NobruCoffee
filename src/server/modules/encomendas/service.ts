import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num } from '@/lib/money'

/**
 * Encomendas (bolos, festas, kits de donut).
 *
 * É o fluxo com mais dinheiro por pedido e o mais fácil de esquecer, porque
 * acontece no futuro. Por isso a tela padrão é a **agenda dos próximos dias**,
 * não a lista de tudo: o que importa é o que precisa sair amanhã.
 *
 * Fluxo: Orçamento → Confirmada (com sinal) → Em produção → Pronta → Entregue.
 */
export type FiltroEncomendas = {
  lojaId: string
  busca?: string
  status?: string
  de?: Date
  ate?: Date
  pagina?: number
  porPagina?: number
}

export async function listarEncomendas(filtro: FiltroEncomendas) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 25

  const where: Prisma.EncomendaWhereInput = { lojaId: filtro.lojaId }
  if (filtro.status && filtro.status !== 'todos') where.status = filtro.status as never
  if (filtro.de || filtro.ate) {
    where.dataEntrega = { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
  }
  if (filtro.busca) {
    where.OR = [
      { codigo: { contains: filtro.busca, mode: 'insensitive' } },
      { tema: { contains: filtro.busca, mode: 'insensitive' } },
      { cliente: { nome: { contains: filtro.busca, mode: 'insensitive' } } },
      { cliente: { telefone: { contains: filtro.busca.replace(/\D/g, '') || filtro.busca } } },
    ]
  }

  const [total, encomendas] = await Promise.all([
    db.encomenda.count({ where }),
    db.encomenda.findMany({
      where,
      orderBy: { dataEntrega: 'asc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        _count: { select: { itens: true } },
      },
    }),
  ])

  return {
    itens: encomendas.map((e) => mapearResumo(e)),
    total,
    pagina,
    porPagina,
  }
}

function mapearResumo(e: {
  id: string
  codigo: string
  status: string
  tipoEntrega: string
  dataEntrega: Date
  tema: string | null
  valorTotal: unknown
  valorSinal: unknown
  valorPago: unknown
  cliente: { id: string; nome: string; telefone: string }
  _count: { itens: number }
}) {
  const total = num(e.valorTotal as never)
  const pago = num(e.valorPago as never)
  const horasRestantes = Math.round((e.dataEntrega.getTime() - Date.now()) / 3_600_000)
  return {
    id: e.id,
    codigo: e.codigo,
    status: e.status,
    tipoEntrega: e.tipoEntrega,
    dataEntrega: e.dataEntrega,
    tema: e.tema,
    cliente: e.cliente,
    itens: e._count.itens,
    valorTotal: total,
    valorSinal: num(e.valorSinal as never),
    valorPago: pago,
    saldo: brl(total - pago),
    horasRestantes,
    atrasada: horasRestantes < 0 && !['ENTREGUE', 'CANCELADA'].includes(e.status),
    urgente: horasRestantes >= 0 && horasRestantes <= 24 && !['ENTREGUE', 'CANCELADA'].includes(e.status),
  }
}

/** Agenda: o que sai hoje, amanhã e nos próximos 7 dias. */
export async function agendaEncomendas(lojaId: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const semana = new Date(hoje)
  semana.setDate(semana.getDate() + 8)

  const [pendentes, atrasadas, resumo] = await Promise.all([
    db.encomenda.findMany({
      where: {
        lojaId,
        status: { in: ['CONFIRMADA', 'EM_PRODUCAO', 'PRONTA'] },
        dataEntrega: { gte: hoje, lt: semana },
      },
      orderBy: { dataEntrega: 'asc' },
      include: { cliente: { select: { id: true, nome: true, telefone: true } }, _count: { select: { itens: true } } },
    }),
    db.encomenda.findMany({
      where: { lojaId, status: { in: ['CONFIRMADA', 'EM_PRODUCAO', 'PRONTA'] }, dataEntrega: { lt: hoje } },
      orderBy: { dataEntrega: 'asc' },
      include: { cliente: { select: { id: true, nome: true, telefone: true } }, _count: { select: { itens: true } } },
    }),
    db.encomenda.groupBy({
      by: ['status'],
      where: { lojaId, status: { notIn: ['ENTREGUE', 'CANCELADA'] } },
      _count: true,
      _sum: { valorTotal: true },
    }),
  ])

  const mapeadas = pendentes.map(mapearResumo)

  return {
    hoje: mapeadas.filter((e) => e.dataEntrega < amanha),
    proximas: mapeadas.filter((e) => e.dataEntrega >= amanha),
    atrasadas: atrasadas.map(mapearResumo),
    porStatus: resumo.map((r) => ({ status: r.status, quantidade: r._count, valor: num(r._sum.valorTotal) })),
    aReceber: brl(
      [...mapeadas, ...atrasadas.map(mapearResumo)].reduce((acc, e) => acc + e.saldo, 0),
    ),
  }
}

export async function obterEncomenda(lojaId: string, id: string) {
  const encomenda = await db.encomenda.findFirst({
    where: { id, lojaId },
    include: {
      cliente: true,
      usuario: { select: { nome: true } },
      itens: { include: { produto: { select: { id: true, nome: true, precoVenda: true } } } },
      pagamentos: { include: { formaPagamento: { select: { nome: true } } }, orderBy: { criadoEm: 'asc' } },
    },
  })
  if (!encomenda) return null

  const total = num(encomenda.valorTotal)
  const pago = num(encomenda.valorPago)

  return {
    ...encomenda,
    valorTotal: total,
    valorSinal: num(encomenda.valorSinal),
    valorPago: pago,
    saldo: brl(total - pago),
    cliente: { ...encomenda.cliente, totalGasto: num(encomenda.cliente.totalGasto) },
    itens: encomenda.itens.map((i) => ({
      id: i.id,
      produtoId: i.produtoId,
      descricao: i.descricao,
      sabor: i.sabor,
      quantidade: num(i.quantidade),
      precoUnitario: num(i.precoUnitario),
      total: num(i.total),
      produto: i.produto ? { ...i.produto, precoVenda: num(i.produto.precoVenda) } : null,
    })),
    pagamentos: encomenda.pagamentos.map((p) => ({
      id: p.id,
      valor: num(p.valor),
      forma: p.formaPagamento.nome,
      status: p.status,
      criadoEm: p.criadoEm,
    })),
  }
}
