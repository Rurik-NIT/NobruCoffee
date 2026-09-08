import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num, qty } from '@/lib/money'

export type FiltroIngredientes = {
  lojaId: string
  busca?: string
  situacao?: 'todos' | 'baixo' | 'zerado' | 'inativos'
  local?: string
  pagina?: number
  porPagina?: number
}

export async function listarIngredientes(filtro: FiltroIngredientes) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 30

  const where: Prisma.IngredienteWhereInput = { lojaId: filtro.lojaId }
  if (filtro.situacao === 'inativos') where.ativo = false
  else where.ativo = true
  if (filtro.local) where.localArmazenagem = filtro.local
  if (filtro.busca) {
    where.OR = [
      { nome: { contains: filtro.busca, mode: 'insensitive' } },
      { sku: { contains: filtro.busca, mode: 'insensitive' } },
    ]
  }
  if (filtro.situacao === 'zerado') where.estoqueAtual = { lte: 0 }

  const registros = await db.ingrediente.findMany({
    where,
    orderBy: { nome: 'asc' },
    include: {
      fornecedorPadrao: { select: { id: true, nome: true } },
      _count: { select: { fichaItens: true } },
      lotes: {
        where: { quantidade: { gt: 0 }, validade: { not: null } },
        orderBy: { validade: 'asc' },
        take: 1,
        select: { validade: true, codigo: true },
      },
    },
  })

  const mapeados = registros.map((i) => {
    const atual = num(i.estoqueAtual)
    const minimo = num(i.estoqueMinimo)
    return {
      id: i.id,
      nome: i.nome,
      sku: i.sku,
      unidade: i.unidade,
      custoMedio: num(i.custoMedio),
      estoqueAtual: atual,
      estoqueMinimo: minimo,
      estoqueMaximo: i.estoqueMaximo === null ? null : num(i.estoqueMaximo),
      localArmazenagem: i.localArmazenagem,
      perecivel: i.perecivel,
      ativo: i.ativo,
      fornecedor: i.fornecedorPadrao,
      usadoEmFichas: i._count.fichaItens,
      valorEmEstoque: brl(atual * num(i.custoMedio)),
      abaixoDoMinimo: minimo > 0 && atual <= minimo,
      zerado: atual <= 0,
      proximaValidade: i.lotes[0]?.validade ?? null,
    }
  })

  const filtrados = filtro.situacao === 'baixo' ? mapeados.filter((i) => i.abaixoDoMinimo) : mapeados

  return {
    itens: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
    total: filtrados.length,
    pagina,
    porPagina,
    /** Totais da seleção inteira, não só da página. */
    valorTotal: brl(filtrados.reduce((acc, i) => acc + i.valorEmEstoque, 0)),
    emAlerta: mapeados.filter((i) => i.abaixoDoMinimo).length,
    zerados: mapeados.filter((i) => i.zerado).length,
  }
}

export async function locaisDeArmazenagem(lojaId: string) {
  const locais = await db.ingrediente.findMany({
    where: { lojaId, ativo: true, localArmazenagem: { not: null } },
    select: { localArmazenagem: true },
    distinct: ['localArmazenagem'],
  })
  return locais.map((l) => l.localArmazenagem!).filter(Boolean).sort()
}

export type FiltroMovimentos = {
  lojaId: string
  ingredienteId?: string
  produtoId?: string
  tipo?: string
  de?: Date
  ate?: Date
  pagina?: number
  porPagina?: number
}

export async function listarMovimentos(filtro: FiltroMovimentos) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 40

  const where: Prisma.MovimentoEstoqueWhereInput = { lojaId: filtro.lojaId }
  if (filtro.ingredienteId) where.ingredienteId = filtro.ingredienteId
  if (filtro.produtoId) where.produtoId = filtro.produtoId
  if (filtro.tipo && filtro.tipo !== 'todos') where.tipo = filtro.tipo as never
  if (filtro.de || filtro.ate) {
    where.criadoEm = { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
  }

  const [total, movimentos] = await Promise.all([
    db.movimentoEstoque.count({ where }),
    db.movimentoEstoque.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        ingrediente: { select: { id: true, nome: true, unidade: true } },
        produto: { select: { id: true, nome: true, unidade: true } },
        usuario: { select: { nome: true } },
        lote: { select: { codigo: true, validade: true } },
      },
    }),
  ])

  return {
    itens: movimentos.map((m) => ({
      id: m.id,
      criadoEm: m.criadoEm,
      tipo: m.tipo,
      item: m.ingrediente?.nome ?? m.produto?.nome ?? '—',
      itemId: m.ingredienteId ?? m.produtoId,
      ehProduto: Boolean(m.produtoId),
      unidade: m.ingrediente?.unidade ?? 'UN',
      quantidade: num(m.quantidade),
      custoUnitario: num(m.custoUnitario),
      valor: brl(Math.abs(num(m.quantidade)) * num(m.custoUnitario)),
      saldoApos: num(m.saldoApos),
      origemTipo: m.origemTipo,
      origemId: m.origemId,
      observacao: m.observacao,
      usuario: m.usuario?.nome ?? 'Sistema',
      lote: m.lote,
    })),
    total,
    pagina,
    porPagina,
  }
}

export async function obterInventarioAberto(lojaId: string) {
  const inventario = await db.inventario.findFirst({
    where: { lojaId, status: 'ABERTO' },
    include: {
      usuario: { select: { nome: true } },
      itens: {
        include: { ingrediente: { select: { id: true, nome: true, sku: true, unidade: true, estoqueAtual: true } } },
        orderBy: { ingrediente: { nome: 'asc' } },
      },
    },
  })
  if (!inventario) return null

  const itens = inventario.itens.map((i) => {
    const sistema = num(i.ingrediente.estoqueAtual)
    const contada = i.quantidadeContada === null ? null : num(i.quantidadeContada)
    const diferenca = contada === null ? null : qty(contada - sistema)
    return {
      id: i.id,
      ingredienteId: i.ingredienteId,
      nome: i.ingrediente.nome,
      sku: i.ingrediente.sku,
      unidade: i.ingrediente.unidade,
      quantidadeSistema: sistema,
      quantidadeCongelada: num(i.quantidadeSistema),
      quantidadeContada: contada,
      diferenca,
      custoUnitario: num(i.custoUnitario),
      impacto: diferenca === null ? null : brl(diferenca * num(i.custoUnitario)),
    }
  })

  return {
    id: inventario.id,
    codigo: inventario.codigo,
    iniciadoEm: inventario.iniciadoEm,
    responsavel: inventario.usuario.nome,
    observacao: inventario.observacao,
    itens,
    contados: itens.filter((i) => i.quantidadeContada !== null).length,
    divergentes: itens.filter((i) => i.diferenca !== null && i.diferenca !== 0).length,
    impactoPrevisto: brl(itens.reduce((acc, i) => acc + (i.impacto ?? 0), 0)),
  }
}

export async function listarInventariosAnteriores(lojaId: string, limite = 20) {
  const inventarios = await db.inventario.findMany({
    where: { lojaId, status: { not: 'ABERTO' } },
    orderBy: { iniciadoEm: 'desc' },
    take: limite,
    include: { usuario: { select: { nome: true } }, _count: { select: { itens: true } } },
  })
  return inventarios.map((i) => ({
    id: i.id,
    codigo: i.codigo,
    status: i.status,
    iniciadoEm: i.iniciadoEm,
    finalizadoEm: i.finalizadoEm,
    responsavel: i.usuario.nome,
    itens: i._count.itens,
    ajusteValor: num(i.ajusteValor),
  }))
}

/** Insumos para comboboxes (ficha técnica, compras, perdas). */
export async function opcoesIngredientes(lojaId: string) {
  const itens = await db.ingrediente.findMany({
    where: { lojaId, ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, sku: true, unidade: true, custoMedio: true, estoqueAtual: true },
  })
  return itens.map((i) => ({
    ...i,
    custoMedio: num(i.custoMedio),
    estoqueAtual: num(i.estoqueAtual),
  }))
}
