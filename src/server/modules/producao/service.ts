import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num, qty } from '@/lib/money'
import { calcularConsumo } from '@/server/modules/estoque/service'

/**
 * Produção.
 *
 * A tela que a loja usa de manhã responde a uma pergunta só: **quanto fazer
 * hoje?** Para isso ela cruza o planejado, o produzido e o vendido do dia, e
 * mostra o que já vendeu mais do que se produziu — o sinal de que vai dar
 * "SOLD OUT" antes da hora.
 */
export async function producaoDoDia(lojaId: string, data: Date) {
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 1)

  const [ordens, vendas, produtos] = await Promise.all([
    db.ordemProducao.findMany({
      where: { lojaId, data: { gte: inicio, lt: fim } },
      include: {
        responsavel: { select: { nome: true } },
        itens: { include: { produto: { select: { id: true, nome: true, sku: true, imagemUrl: true } } } },
      },
      orderBy: { criadoEm: 'asc' },
    }),
    db.pedidoItem.groupBy({
      by: ['produtoId'],
      where: {
        status: { not: 'CANCELADO' },
        pedido: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: inicio, lt: fim } },
      },
      _sum: { quantidade: true },
    }),
    db.produto.findMany({
      where: { lojaId, ativo: true, tipo: 'PRODUZIDO' },
      select: { id: true, nome: true, sku: true, imagemUrl: true, estoqueAtual: true, disponivel: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const vendidoPor = new Map(vendas.map((v) => [v.produtoId, num(v._sum.quantidade)]))

  // Uma linha por produto produzido: junta todas as ordens do dia.
  const linhas = new Map<
    string,
    {
      produtoId: string
      nome: string
      sku: string
      imagemUrl: string | null
      planejado: number
      produzido: number
      perdido: number
      vendido: number
      estoque: number
      disponivel: boolean
    }
  >()

  for (const p of produtos) {
    linhas.set(p.id, {
      produtoId: p.id,
      nome: p.nome,
      sku: p.sku,
      imagemUrl: p.imagemUrl,
      planejado: 0,
      produzido: 0,
      perdido: 0,
      vendido: vendidoPor.get(p.id) ?? 0,
      estoque: num(p.estoqueAtual),
      disponivel: p.disponivel,
    })
  }

  for (const ordem of ordens) {
    for (const item of ordem.itens) {
      const linha = linhas.get(item.produtoId)
      if (!linha) continue
      linha.planejado += num(item.quantidadePlanejada)
      linha.produzido += num(item.quantidadeProduzida)
      linha.perdido += num(item.quantidadePerdida)
    }
  }

  const itens = [...linhas.values()]
    .filter((l) => l.planejado > 0 || l.produzido > 0 || l.vendido > 0 || l.estoque > 0)
    .map((l) => ({
      ...l,
      aproveitamento: l.produzido + l.perdido > 0 ? brl((l.produzido / (l.produzido + l.perdido)) * 100) : null,
      /** Vendeu mais do que sobrou: risco de acabar. */
      risco: l.estoque <= 0 && l.vendido > 0,
    }))
    .sort((a, b) => b.vendido - a.vendido)

  return {
    data: inicio,
    ordens: ordens.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      status: o.status,
      turno: o.turno,
      responsavel: o.responsavel.nome,
      itens: o.itens.length,
      custoEstimado: num(o.custoEstimado),
      custoReal: num(o.custoReal),
      iniciadaEm: o.iniciadaEm,
      concluidaEm: o.concluidaEm,
    })),
    itens,
    totais: {
      planejado: itens.reduce((a, i) => a + i.planejado, 0),
      produzido: itens.reduce((a, i) => a + i.produzido, 0),
      perdido: itens.reduce((a, i) => a + i.perdido, 0),
      vendido: itens.reduce((a, i) => a + i.vendido, 0),
    },
  }
}

export type FiltroOrdens = {
  lojaId: string
  status?: string
  de?: Date
  ate?: Date
  pagina?: number
  porPagina?: number
}

export async function listarOrdens(filtro: FiltroOrdens) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 25

  const where: Prisma.OrdemProducaoWhereInput = { lojaId: filtro.lojaId }
  if (filtro.status && filtro.status !== 'todos') where.status = filtro.status as never
  if (filtro.de || filtro.ate) {
    where.data = { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
  }

  const [total, ordens] = await Promise.all([
    db.ordemProducao.count({ where }),
    db.ordemProducao.findMany({
      where,
      orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        responsavel: { select: { nome: true } },
        itens: { select: { quantidadePlanejada: true, quantidadeProduzida: true, quantidadePerdida: true } },
      },
    }),
  ])

  return {
    itens: ordens.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      data: o.data,
      turno: o.turno,
      status: o.status,
      responsavel: o.responsavel.nome,
      linhas: o.itens.length,
      planejado: o.itens.reduce((a, i) => a + num(i.quantidadePlanejada), 0),
      produzido: o.itens.reduce((a, i) => a + num(i.quantidadeProduzida), 0),
      perdido: o.itens.reduce((a, i) => a + num(i.quantidadePerdida), 0),
      custoEstimado: num(o.custoEstimado),
      custoReal: num(o.custoReal),
    })),
    total,
    pagina,
    porPagina,
  }
}

/**
 * Ordem com a explosão de insumos: mostra o que vai consumir e o que falta,
 * antes de o padeiro começar.
 */
export async function obterOrdem(lojaId: string, ordemId: string) {
  const ordem = await db.ordemProducao.findFirst({
    where: { id: ordemId, lojaId },
    include: {
      responsavel: { select: { id: true, nome: true } },
      itens: {
        include: {
          produto: { select: { id: true, nome: true, sku: true, imagemUrl: true, precoVenda: true } },
          fichaTecnica: { select: { id: true, versao: true, rendimento: true } },
        },
        orderBy: { produto: { nome: 'asc' } },
      },
      perdas: {
        include: { produto: { select: { nome: true } }, ingrediente: { select: { nome: true } }, usuario: { select: { nome: true } } },
      },
    },
  })
  if (!ordem) return null

  // Necessidade de insumos consolidada — soma o consumo de todos os itens.
  const necessidade = new Map<
    string,
    { ingredienteId: string; nome: string; unidade: string; quantidade: number; estoqueAtual: number; custoTotal: number }
  >()

  for (const item of ordem.itens) {
    const alvo = num(item.quantidadeProduzida) > 0 ? num(item.quantidadeProduzida) : num(item.quantidadePlanejada)
    const consumo = await calcularConsumo(db, item.produtoId, alvo, item.fichaTecnicaId)
    for (const c of consumo.itens) {
      const atual = necessidade.get(c.ingredienteId) ?? {
        ingredienteId: c.ingredienteId,
        nome: c.nome,
        unidade: c.unidade,
        quantidade: 0,
        estoqueAtual: c.estoqueAtual,
        custoTotal: 0,
      }
      atual.quantidade = qty(atual.quantidade + c.quantidade)
      atual.custoTotal = brl(atual.custoTotal + c.custoTotal)
      necessidade.set(c.ingredienteId, atual)
    }
  }

  const insumos = [...necessidade.values()]
    .map((n) => ({ ...n, falta: qty(Math.max(0, n.quantidade - n.estoqueAtual)) }))
    .sort((a, b) => b.custoTotal - a.custoTotal)

  return {
    id: ordem.id,
    codigo: ordem.codigo,
    data: ordem.data,
    turno: ordem.turno,
    status: ordem.status,
    observacao: ordem.observacao,
    responsavel: ordem.responsavel,
    iniciadaEm: ordem.iniciadaEm,
    concluidaEm: ordem.concluidaEm,
    custoEstimado: num(ordem.custoEstimado),
    custoReal: num(ordem.custoReal),
    itens: ordem.itens.map((i) => ({
      id: i.id,
      produtoId: i.produtoId,
      produto: i.produto.nome,
      sku: i.produto.sku,
      imagemUrl: i.produto.imagemUrl,
      precoVenda: num(i.produto.precoVenda),
      fichaId: i.fichaTecnicaId,
      fichaVersao: i.fichaTecnica?.versao ?? null,
      quantidadePlanejada: num(i.quantidadePlanejada),
      quantidadeProduzida: num(i.quantidadeProduzida),
      quantidadePerdida: num(i.quantidadePerdida),
      custoUnitario: num(i.custoUnitario),
      observacao: i.observacao,
    })),
    insumos,
    custoInsumos: brl(insumos.reduce((a, i) => a + i.custoTotal, 0)),
    faltando: insumos.filter((i) => i.falta > 0),
    perdas: ordem.perdas.map((p) => ({
      id: p.id,
      item: p.produto?.nome ?? p.ingrediente?.nome ?? '—',
      quantidade: num(p.quantidade),
      motivo: p.motivo,
      custoEstimado: num(p.custoEstimado),
      usuario: p.usuario.nome,
      criadoEm: p.criadoEm,
    })),
  }
}

/** Sugestão de produção: média vendida nos últimos 7 dias menos o estoque. */
export async function sugerirProducao(lojaId: string) {
  const desde = new Date(Date.now() - 7 * 86_400_000)
  const [vendas, produtos] = await Promise.all([
    db.pedidoItem.groupBy({
      by: ['produtoId'],
      where: {
        status: { not: 'CANCELADO' },
        pedido: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: desde } },
      },
      _sum: { quantidade: true },
    }),
    db.produto.findMany({
      where: { lojaId, ativo: true, tipo: 'PRODUZIDO', fichasTecnicas: { some: { ativa: true } } },
      select: { id: true, nome: true, sku: true, estoqueAtual: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const mediaPor = new Map(vendas.map((v) => [v.produtoId, num(v._sum.quantidade) / 7]))

  return produtos
    .map((p) => {
      const media = mediaPor.get(p.id) ?? 0
      const estoque = num(p.estoqueAtual)
      return {
        produtoId: p.id,
        nome: p.nome,
        sku: p.sku,
        mediaDiaria: Math.round(media * 10) / 10,
        estoque,
        sugestao: Math.max(0, Math.ceil(media - estoque)),
      }
    })
    .filter((p) => p.sugestao > 0 || p.mediaDiaria > 0)
    .sort((a, b) => b.sugestao - a.sugestao)
}
