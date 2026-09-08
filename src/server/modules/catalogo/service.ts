import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, margem, num } from '@/lib/money'

export type FiltroProdutos = {
  lojaId: string
  busca?: string
  categoriaId?: string
  tipo?: string
  situacao?: 'todos' | 'ativos' | 'inativos' | 'esgotados' | 'sem-ficha'
  pagina?: number
  porPagina?: number
}

export type ProdutoLista = {
  id: string
  nome: string
  sku: string
  imagemUrl: string | null
  tipo: string
  categoria: { id: string; nome: string; cor: string }
  precoCusto: number
  precoVenda: number
  margem: number
  estoqueAtual: number
  estoqueMinimo: number
  controlaEstoque: boolean
  ativo: boolean
  disponivel: boolean
  destaque: boolean
  temFicha: boolean
  variacoes: number
  vendidos30d: number
}

/**
 * Catálogo com os números que decidem: margem, saldo e giro dos últimos 30 dias.
 * Uma lista de produtos sem margem obriga o gerente a abrir cada item para
 * saber se está ganhando dinheiro — por isso a margem é coluna, não detalhe.
 */
export async function listarProdutos(filtro: FiltroProdutos) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 25

  const where: Prisma.ProdutoWhereInput = { lojaId: filtro.lojaId }
  if (filtro.busca) {
    where.OR = [
      { nome: { contains: filtro.busca, mode: 'insensitive' } },
      { sku: { contains: filtro.busca, mode: 'insensitive' } },
    ]
  }
  if (filtro.categoriaId) where.categoriaId = filtro.categoriaId
  if (filtro.tipo) where.tipo = filtro.tipo as Prisma.EnumTipoProdutoFilter['equals']
  if (filtro.situacao === 'ativos') where.ativo = true
  if (filtro.situacao === 'inativos') where.ativo = false
  if (filtro.situacao === 'esgotados') where.disponivel = false
  if (filtro.situacao === 'sem-ficha') where.fichasTecnicas = { none: { ativa: true } }

  const [total, produtos] = await Promise.all([
    db.produto.count({ where }),
    db.produto.findMany({
      where,
      orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        categoria: { select: { id: true, nome: true, cor: true } },
        _count: { select: { variacoes: true } },
        fichasTecnicas: { where: { ativa: true }, select: { id: true }, take: 1 },
      },
    }),
  ])

  // Giro de 30 dias em uma consulta agregada, não N+1.
  const desde = new Date(Date.now() - 30 * 86_400_000)
  const vendidos = produtos.length
    ? await db.pedidoItem.groupBy({
        by: ['produtoId'],
        where: {
          produtoId: { in: produtos.map((p) => p.id) },
          status: { not: 'CANCELADO' },
          pedido: { status: 'FINALIZADO', finalizadoEm: { gte: desde } },
        },
        _sum: { quantidade: true },
      })
    : []
  const mapaVendidos = new Map(vendidos.map((v) => [v.produtoId, num(v._sum.quantidade)]))

  const itens: ProdutoLista[] = produtos.map((p) => {
    const custo = num(p.precoCusto)
    const venda = num(p.precoVenda)
    return {
      id: p.id,
      nome: p.nome,
      sku: p.sku,
      imagemUrl: p.imagemUrl,
      tipo: p.tipo,
      categoria: p.categoria,
      precoCusto: custo,
      precoVenda: venda,
      margem: margem(venda, custo),
      estoqueAtual: num(p.estoqueAtual),
      estoqueMinimo: num(p.estoqueMinimo),
      controlaEstoque: p.controlaEstoque,
      ativo: p.ativo,
      disponivel: p.disponivel,
      destaque: p.destaque,
      temFicha: p.fichasTecnicas.length > 0,
      variacoes: p._count.variacoes,
      vendidos30d: mapaVendidos.get(p.id) ?? 0,
    }
  })

  return { itens, total, pagina, porPagina }
}

export async function obterProduto(lojaId: string, id: string) {
  const produto = await db.produto.findFirst({
    where: { id, lojaId },
    include: {
      categoria: true,
      variacoes: { orderBy: { ordem: 'asc' } },
      adicionais: { include: { adicional: true } },
      comboItens: { include: { produto: { select: { id: true, nome: true, precoVenda: true, precoCusto: true } } } },
      fichasTecnicas: {
        orderBy: { versao: 'desc' },
        include: { itens: { include: { ingrediente: true } } },
      },
    },
  })
  if (!produto) return null

  return {
    ...produto,
    precoCusto: num(produto.precoCusto),
    precoVenda: num(produto.precoVenda),
    estoqueAtual: num(produto.estoqueAtual),
    estoqueMinimo: num(produto.estoqueMinimo),
    margem: margem(num(produto.precoVenda), num(produto.precoCusto)),
    variacoes: produto.variacoes.map((v) => ({
      ...v,
      precoDelta: num(v.precoDelta),
      custoDelta: num(v.custoDelta),
      fatorFicha: num(v.fatorFicha),
    })),
    comboItens: produto.comboItens.map((c) => ({
      produtoId: c.produtoId,
      quantidade: num(c.quantidade),
      nome: c.produto.nome,
      precoVenda: num(c.produto.precoVenda),
      precoCusto: num(c.produto.precoCusto),
    })),
    adicionaisIds: produto.adicionais.map((a) => a.adicionalId),
  }
}

export async function listarCategorias(lojaId: string, apenasAtivas = false) {
  const categorias = await db.categoria.findMany({
    where: { lojaId, ...(apenasAtivas ? { ativo: true } : {}) },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { produtos: true } } },
  })
  return categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    descricao: c.descricao,
    cor: c.cor,
    ordem: c.ordem,
    ativo: c.ativo,
    produtos: c._count.produtos,
  }))
}

export async function listarAdicionais(lojaId: string, apenasAtivos = false) {
  const adicionais = await db.adicional.findMany({
    where: { lojaId, ...(apenasAtivos ? { ativo: true } : {}) },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    include: { ingrediente: { select: { id: true, nome: true, unidade: true, estoqueAtual: true } } },
  })
  return adicionais.map((a) => ({
    id: a.id,
    nome: a.nome,
    preco: num(a.preco),
    custo: num(a.custo),
    ingredienteId: a.ingredienteId,
    quantidadeIngrediente: num(a.quantidadeIngrediente),
    ordem: a.ordem,
    ativo: a.ativo,
    ingrediente: a.ingrediente
      ? { ...a.ingrediente, estoqueAtual: num(a.ingrediente.estoqueAtual) }
      : null,
  }))
}

/** Produtos que podem entrar num combo (não-combos ativos). */
export async function listarProdutosParaCombo(lojaId: string, excluirId?: string) {
  const produtos = await db.produto.findMany({
    where: { lojaId, ativo: true, tipo: { not: 'COMBO' }, ...(excluirId ? { id: { not: excluirId } } : {}) },
    select: { id: true, nome: true, sku: true, precoVenda: true, precoCusto: true },
    orderBy: { nome: 'asc' },
  })
  return produtos.map((p) => ({ ...p, precoVenda: num(p.precoVenda), precoCusto: num(p.precoCusto) }))
}

/** Soma dos itens do combo — mostra ao gerente o desconto que está dando. */
export function calcularValorCombo(itens: Array<{ quantidade: number; precoVenda: number; precoCusto: number }>) {
  const somaVenda = brl(itens.reduce((acc, i) => acc + i.quantidade * i.precoVenda, 0))
  const somaCusto = brl(itens.reduce((acc, i) => acc + i.quantidade * i.precoCusto, 0))
  return { somaVenda, somaCusto }
}
