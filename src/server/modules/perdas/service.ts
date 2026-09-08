import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num } from '@/lib/money'

/**
 * Perdas.
 *
 * O valor de um módulo de perdas não é a lista — é o total do mês e o ranking
 * de onde ele vem. "R$ 1.240 em donuts não vendidos" muda a decisão de produção
 * de amanhã; uma tabela de 300 linhas não muda nada.
 */
export type FiltroPerdas = {
  lojaId: string
  motivo?: string
  de?: Date
  ate?: Date
  tipo?: 'todos' | 'produto' | 'insumo'
  pagina?: number
  porPagina?: number
}

export async function listarPerdas(filtro: FiltroPerdas) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 30

  const where: Prisma.PerdaWhereInput = { lojaId: filtro.lojaId }
  if (filtro.motivo && filtro.motivo !== 'todos') where.motivo = filtro.motivo as never
  if (filtro.tipo === 'produto') where.produtoId = { not: null }
  if (filtro.tipo === 'insumo') where.ingredienteId = { not: null }
  if (filtro.de || filtro.ate) {
    where.criadoEm = { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
  }

  const [total, perdas, soma] = await Promise.all([
    db.perda.count({ where }),
    db.perda.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        produto: { select: { id: true, nome: true, unidade: true } },
        ingrediente: { select: { id: true, nome: true, unidade: true } },
        usuario: { select: { nome: true } },
        ordemProducao: { select: { id: true, codigo: true } },
      },
    }),
    db.perda.aggregate({ where, _sum: { custoEstimado: true } }),
  ])

  return {
    itens: perdas.map((p) => ({
      id: p.id,
      criadoEm: p.criadoEm,
      item: p.produto?.nome ?? p.ingrediente?.nome ?? '—',
      itemId: p.produtoId ?? p.ingredienteId,
      ehProduto: Boolean(p.produtoId),
      unidade: p.produto?.unidade ?? p.ingrediente?.unidade ?? 'UN',
      quantidade: num(p.quantidade),
      motivo: p.motivo,
      custoEstimado: num(p.custoEstimado),
      observacao: p.observacao,
      usuario: p.usuario.nome,
      ordem: p.ordemProducao,
    })),
    total,
    pagina,
    porPagina,
    custoTotal: num(soma._sum.custoEstimado),
  }
}

/** Painel de perdas: total do mês, comparação e ranking por motivo e por item. */
export async function resumoPerdas(lojaId: string, referencia = new Date()) {
  const inicioMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1)
  const inicioMesAnterior = new Date(referencia.getFullYear(), referencia.getMonth() - 1, 1)

  const [mes, mesAnterior, porMotivo, porProduto, porInsumo] = await Promise.all([
    db.perda.aggregate({ where: { lojaId, criadoEm: { gte: inicioMes } }, _sum: { custoEstimado: true }, _count: true }),
    db.perda.aggregate({
      where: { lojaId, criadoEm: { gte: inicioMesAnterior, lt: inicioMes } },
      _sum: { custoEstimado: true },
    }),
    db.perda.groupBy({
      by: ['motivo'],
      where: { lojaId, criadoEm: { gte: inicioMes } },
      _sum: { custoEstimado: true },
      _count: true,
    }),
    db.perda.groupBy({
      by: ['produtoId'],
      where: { lojaId, criadoEm: { gte: inicioMes }, produtoId: { not: null } },
      _sum: { custoEstimado: true, quantidade: true },
    }),
    db.perda.groupBy({
      by: ['ingredienteId'],
      where: { lojaId, criadoEm: { gte: inicioMes }, ingredienteId: { not: null } },
      _sum: { custoEstimado: true, quantidade: true },
    }),
  ])

  const idsProduto = porProduto.map((p) => p.produtoId!).filter(Boolean)
  const idsInsumo = porInsumo.map((p) => p.ingredienteId!).filter(Boolean)
  const [produtos, insumos] = await Promise.all([
    idsProduto.length
      ? db.produto.findMany({ where: { id: { in: idsProduto } }, select: { id: true, nome: true, unidade: true } })
      : [],
    idsInsumo.length
      ? db.ingrediente.findMany({ where: { id: { in: idsInsumo } }, select: { id: true, nome: true, unidade: true } })
      : [],
  ])

  const ranking = [
    ...porProduto.map((p) => {
      const prod = produtos.find((x) => x.id === p.produtoId)
      return {
        rotulo: prod?.nome ?? 'Produto removido',
        valor: num(p._sum.custoEstimado),
        apoio: `${num(p._sum.quantidade)} ${(prod?.unidade ?? 'un').toLowerCase()}`,
      }
    }),
    ...porInsumo.map((p) => {
      const ing = insumos.find((x) => x.id === p.ingredienteId)
      return {
        rotulo: ing?.nome ?? 'Insumo removido',
        valor: num(p._sum.custoEstimado),
        apoio: `${num(p._sum.quantidade)} ${(ing?.unidade ?? 'un').toLowerCase()}`,
      }
    }),
  ].sort((a, b) => b.valor - a.valor)

  const totalMes = num(mes._sum.custoEstimado)
  const totalAnterior = num(mesAnterior._sum.custoEstimado)

  return {
    totalMes: brl(totalMes),
    totalMesAnterior: brl(totalAnterior),
    ocorrencias: mes._count,
    porMotivo: porMotivo
      .map((m) => ({ rotulo: m.motivo, valor: num(m._sum.custoEstimado), apoio: `${m._count} registro(s)` }))
      .sort((a, b) => b.valor - a.valor),
    ranking: ranking.slice(0, 8),
  }
}
