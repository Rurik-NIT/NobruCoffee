import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num, qty } from '@/lib/money'

/**
 * Compras: Fornecedor → Pedido → Recebimento → Estoque.
 *
 * O recebimento pode ser parcial (o fornecedor mandou 8 das 10 caixas), e é o
 * recebimento — não o pedido — que move estoque e custo. Um pedido de compra
 * sozinho não muda nada no saldo: é intenção, não mercadoria.
 */
export async function listarFornecedores(lojaId: string, busca?: string, incluirInativos = false) {
  const fornecedores = await db.fornecedor.findMany({
    where: {
      lojaId,
      ...(incluirInativos ? {} : { ativo: true }),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: 'insensitive' } },
              { razaoSocial: { contains: busca, mode: 'insensitive' } },
              { cnpjCpf: { contains: busca.replace(/\D/g, '') || busca } },
            ],
          }
        : {}),
    },
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { ingredientes: true, pedidosCompra: true } },
      pedidosCompra: {
        where: { status: { in: ['RECEBIDO', 'PARCIAL'] } },
        orderBy: { dataPedido: 'desc' },
        take: 1,
        select: { dataPedido: true, total: true },
      },
    },
  })

  return fornecedores.map((f) => ({
    id: f.id,
    nome: f.nome,
    razaoSocial: f.razaoSocial,
    cnpjCpf: f.cnpjCpf,
    telefone: f.telefone,
    email: f.email,
    contato: f.contato,
    cidade: f.cidade,
    uf: f.uf,
    prazoEntregaDias: f.prazoEntregaDias,
    observacao: f.observacao,
    ativo: f.ativo,
    insumos: f._count.ingredientes,
    pedidos: f._count.pedidosCompra,
    ultimaCompra: f.pedidosCompra[0]?.dataPedido ?? null,
    ultimoValor: f.pedidosCompra[0] ? num(f.pedidosCompra[0].total) : null,
  }))
}

export type FiltroCompras = {
  lojaId: string
  status?: string
  fornecedorId?: string
  pagina?: number
  porPagina?: number
}

export async function listarPedidosCompra(filtro: FiltroCompras) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 25

  const where: Prisma.PedidoCompraWhereInput = { lojaId: filtro.lojaId }
  if (filtro.status && filtro.status !== 'todos') where.status = filtro.status as never
  if (filtro.fornecedorId) where.fornecedorId = filtro.fornecedorId

  const [total, pedidos, abertoValor] = await Promise.all([
    db.pedidoCompra.count({ where }),
    db.pedidoCompra.findMany({
      where,
      orderBy: { dataPedido: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        fornecedor: { select: { id: true, nome: true } },
        usuario: { select: { nome: true } },
        itens: { select: { quantidade: true, quantidadeRecebida: true } },
        _count: { select: { recebimentos: true } },
      },
    }),
    db.pedidoCompra.aggregate({
      where: { ...where, status: { in: ['ENVIADO', 'PARCIAL'] } },
      _sum: { total: true },
    }),
  ])

  return {
    itens: pedidos.map((p) => {
      const pedido = p.itens.reduce((a, i) => a + num(i.quantidade), 0)
      const recebido = p.itens.reduce((a, i) => a + num(i.quantidadeRecebida), 0)
      return {
        id: p.id,
        codigo: p.codigo,
        status: p.status,
        fornecedor: p.fornecedor,
        dataPedido: p.dataPedido,
        dataPrevista: p.dataPrevista,
        total: num(p.total),
        linhas: p.itens.length,
        recebimentos: p._count.recebimentos,
        percentualRecebido: pedido > 0 ? Math.round((recebido / pedido) * 100) : 0,
        usuario: p.usuario.nome,
        atrasado:
          Boolean(p.dataPrevista && p.dataPrevista < new Date()) && ['ENVIADO', 'PARCIAL'].includes(p.status),
      }
    }),
    total,
    pagina,
    porPagina,
    valorEmAberto: num(abertoValor._sum.total),
  }
}

export async function obterPedidoCompra(lojaId: string, id: string) {
  const pedido = await db.pedidoCompra.findFirst({
    where: { id, lojaId },
    include: {
      fornecedor: true,
      usuario: { select: { nome: true } },
      itens: {
        include: { ingrediente: { select: { id: true, nome: true, sku: true, unidade: true, custoMedio: true, estoqueAtual: true } } },
        orderBy: { ingrediente: { nome: 'asc' } },
      },
      recebimentos: {
        orderBy: { data: 'desc' },
        include: {
          usuario: { select: { nome: true } },
          itens: { include: { ingrediente: { select: { nome: true, unidade: true } } } },
        },
      },
      contasPagar: { select: { id: true, status: true, valor: true, valorPago: true, vencimento: true } },
    },
  })
  if (!pedido) return null

  const itens = pedido.itens.map((i) => {
    const pedida = num(i.quantidade)
    const recebida = num(i.quantidadeRecebida)
    return {
      id: i.id,
      ingredienteId: i.ingredienteId,
      nome: i.ingrediente.nome,
      sku: i.ingrediente.sku,
      unidade: i.ingrediente.unidade,
      custoMedioAtual: num(i.ingrediente.custoMedio),
      estoqueAtual: num(i.ingrediente.estoqueAtual),
      quantidade: pedida,
      quantidadeRecebida: recebida,
      pendente: qty(Math.max(0, pedida - recebida)),
      precoUnitario: num(i.precoUnitario),
      total: num(i.total),
      /** Variação do preço desta compra contra o custo médio atual. */
      variacaoCusto:
        num(i.ingrediente.custoMedio) > 0
          ? brl(((num(i.precoUnitario) - num(i.ingrediente.custoMedio)) / num(i.ingrediente.custoMedio)) * 100)
          : null,
    }
  })

  return {
    id: pedido.id,
    codigo: pedido.codigo,
    status: pedido.status,
    fornecedor: pedido.fornecedor,
    dataPedido: pedido.dataPedido,
    dataPrevista: pedido.dataPrevista,
    observacao: pedido.observacao,
    total: num(pedido.total),
    usuario: pedido.usuario.nome,
    itens,
    pendentes: itens.filter((i) => i.pendente > 0),
    recebimentos: pedido.recebimentos.map((r) => ({
      id: r.id,
      data: r.data,
      notaFiscal: r.notaFiscal,
      total: num(r.total),
      observacao: r.observacao,
      usuario: r.usuario.nome,
      itens: r.itens.map((i) => ({
        nome: i.ingrediente.nome,
        unidade: i.ingrediente.unidade,
        quantidade: num(i.quantidade),
        precoUnitario: num(i.precoUnitario),
        lote: i.lote,
        validade: i.validade,
      })),
    })),
    contasPagar: pedido.contasPagar.map((c) => ({ ...c, valor: num(c.valor), valorPago: num(c.valorPago) })),
  }
}

export async function listarRecebimentos(lojaId: string, limite = 40) {
  const recebimentos = await db.recebimento.findMany({
    where: { pedidoCompra: { lojaId } },
    orderBy: { data: 'desc' },
    take: limite,
    include: {
      usuario: { select: { nome: true } },
      pedidoCompra: { select: { id: true, codigo: true, fornecedor: { select: { nome: true } } } },
      _count: { select: { itens: true } },
    },
  })
  return recebimentos.map((r) => ({
    id: r.id,
    data: r.data,
    notaFiscal: r.notaFiscal,
    total: num(r.total),
    linhas: r._count.itens,
    usuario: r.usuario.nome,
    pedido: r.pedidoCompra,
  }))
}

/** Sugestão de compra: insumos no mínimo, agrupados por fornecedor padrão. */
export async function sugerirCompra(lojaId: string) {
  const ingredientes = await db.ingrediente.findMany({
    where: { lojaId, ativo: true, estoqueMinimo: { gt: 0 } },
    include: { fornecedorPadrao: { select: { id: true, nome: true } } },
    orderBy: { nome: 'asc' },
  })

  const abaixo = ingredientes.filter((i) => num(i.estoqueAtual) <= num(i.estoqueMinimo))
  const grupos = new Map<
    string,
    { fornecedorId: string | null; fornecedor: string; itens: Array<{ ingredienteId: string; nome: string; unidade: string; sugestao: number; custoMedio: number; total: number }> }
  >()

  for (const i of abaixo) {
    const chave = i.fornecedorPadraoId ?? 'sem-fornecedor'
    const alvo = i.estoqueMaximo ? num(i.estoqueMaximo) : num(i.estoqueMinimo) * 2
    const sugestao = qty(Math.max(0, alvo - num(i.estoqueAtual)))
    const grupo = grupos.get(chave) ?? {
      fornecedorId: i.fornecedorPadraoId,
      fornecedor: i.fornecedorPadrao?.nome ?? 'Sem fornecedor definido',
      itens: [],
    }
    grupo.itens.push({
      ingredienteId: i.id,
      nome: i.nome,
      unidade: i.unidade,
      sugestao,
      custoMedio: num(i.custoMedio),
      total: brl(sugestao * num(i.custoMedio)),
    })
    grupos.set(chave, grupo)
  }

  return [...grupos.values()].map((g) => ({ ...g, total: brl(g.itens.reduce((a, i) => a + i.total, 0)) }))
}
