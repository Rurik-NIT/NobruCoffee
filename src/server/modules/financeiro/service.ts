import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/server/db'
import { brl, num } from '@/lib/money'

/**
 * Financeiro.
 *
 * Decisão de modelagem: **despesa é uma conta a pagar liquidada** e **receita é
 * uma conta a receber liquidada**. Tabelas separadas de "despesa" e "receita"
 * repetiriam os mesmos campos e criariam duas versões da verdade sobre o mesmo
 * lançamento (docs/ARQUITETURA.md § Financeiro).
 *
 * O fluxo de caixa soma três origens:
 *   • vendas do PDV (pagamentos aprovados),
 *   • contas a receber liquidadas que não vieram de venda,
 *   • contas a pagar liquidadas.
 */
export type FiltroContas = {
  lojaId: string
  status?: string
  categoriaId?: string
  de?: Date
  ate?: Date
  busca?: string
  pagina?: number
  porPagina?: number
}

function janela(filtro: FiltroContas) {
  if (!filtro.de && !filtro.ate) return undefined
  return { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
}

/** Atualiza para ATRASADO o que passou do vencimento — leitura sempre honesta. */
async function marcarAtrasadas(lojaId: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  await Promise.all([
    db.contaPagar.updateMany({
      where: { lojaId, status: { in: ['PENDENTE', 'PARCIAL'] }, vencimento: { lt: hoje } },
      data: { status: 'ATRASADO' },
    }),
    db.contaReceber.updateMany({
      where: { lojaId, status: { in: ['PENDENTE', 'PARCIAL'] }, vencimento: { lt: hoje } },
      data: { status: 'ATRASADO' },
    }),
  ])
}

export async function listarContasPagar(filtro: FiltroContas) {
  await marcarAtrasadas(filtro.lojaId)
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 30

  const where: Prisma.ContaPagarWhereInput = { lojaId: filtro.lojaId }
  if (filtro.status && filtro.status !== 'todos') where.status = filtro.status as never
  if (filtro.categoriaId) where.categoriaId = filtro.categoriaId
  const vencimento = janela(filtro)
  if (vencimento) where.vencimento = vencimento
  if (filtro.busca) where.descricao = { contains: filtro.busca, mode: 'insensitive' }

  const [total, contas, somas] = await Promise.all([
    db.contaPagar.count({ where }),
    db.contaPagar.findMany({
      where,
      orderBy: [{ status: 'asc' }, { vencimento: 'asc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        fornecedor: { select: { id: true, nome: true } },
        categoria: { select: { id: true, nome: true, cor: true } },
        pedidoCompra: { select: { id: true, codigo: true } },
      },
    }),
    db.contaPagar.aggregate({ where, _sum: { valor: true, valorPago: true } }),
  ])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return {
    itens: contas.map((c) => ({
      id: c.id,
      descricao: c.descricao,
      valor: num(c.valor),
      valorPago: num(c.valorPago),
      saldo: brl(num(c.valor) - num(c.valorPago)),
      vencimento: c.vencimento,
      pagoEm: c.pagoEm,
      status: c.status,
      recorrencia: c.recorrencia,
      fornecedor: c.fornecedor,
      categoria: c.categoria,
      compra: c.pedidoCompra,
      diasParaVencer: Math.round((c.vencimento.getTime() - hoje.getTime()) / 86_400_000),
    })),
    total,
    pagina,
    porPagina,
    totalPrevisto: num(somas._sum.valor),
    totalPago: num(somas._sum.valorPago),
    saldoAberto: brl(num(somas._sum.valor) - num(somas._sum.valorPago)),
  }
}

export async function listarContasReceber(filtro: FiltroContas) {
  await marcarAtrasadas(filtro.lojaId)
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 30

  const where: Prisma.ContaReceberWhereInput = { lojaId: filtro.lojaId }
  if (filtro.status && filtro.status !== 'todos') where.status = filtro.status as never
  if (filtro.categoriaId) where.categoriaId = filtro.categoriaId
  const vencimento = janela(filtro)
  if (vencimento) where.vencimento = vencimento
  if (filtro.busca) where.descricao = { contains: filtro.busca, mode: 'insensitive' }

  const [total, contas, somas] = await Promise.all([
    db.contaReceber.count({ where }),
    db.contaReceber.findMany({
      where,
      orderBy: [{ status: 'asc' }, { vencimento: 'asc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        categoria: { select: { id: true, nome: true, cor: true } },
        encomenda: { select: { id: true, codigo: true } },
        pedido: { select: { id: true, codigo: true } },
      },
    }),
    db.contaReceber.aggregate({ where, _sum: { valor: true, valorRecebido: true } }),
  ])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return {
    itens: contas.map((c) => ({
      id: c.id,
      descricao: c.descricao,
      valor: num(c.valor),
      valorRecebido: num(c.valorRecebido),
      saldo: brl(num(c.valor) - num(c.valorRecebido)),
      vencimento: c.vencimento,
      recebidoEm: c.recebidoEm,
      status: c.status,
      cliente: c.cliente,
      categoria: c.categoria,
      encomenda: c.encomenda,
      pedido: c.pedido,
      diasParaVencer: Math.round((c.vencimento.getTime() - hoje.getTime()) / 86_400_000),
    })),
    total,
    pagina,
    porPagina,
    totalPrevisto: num(somas._sum.valor),
    totalRecebido: num(somas._sum.valorRecebido),
    saldoAberto: brl(num(somas._sum.valor) - num(somas._sum.valorRecebido)),
  }
}

/**
 * Fluxo de caixa do período, dia a dia, com saldo acumulado.
 * As vendas entram pela data do pagamento — é quando o dinheiro chega.
 */
export async function fluxoDeCaixa(lojaId: string, de: Date, ate: Date) {
  const [pagamentos, recebidas, pagas, categoriasDespesa] = await Promise.all([
    db.pagamento.findMany({
      where: {
        status: 'APROVADO',
        criadoEm: { gte: de, lte: ate },
        OR: [{ pedido: { lojaId } }, { encomenda: { lojaId } }],
      },
      select: { valor: true, criadoEm: true, taxaValor: true, formaPagamento: { select: { nome: true } } },
    }),
    db.contaReceber.findMany({
      where: { lojaId, status: 'LIQUIDADO', recebidoEm: { gte: de, lte: ate }, pedidoId: null, encomendaId: null },
      select: { valorRecebido: true, recebidoEm: true, descricao: true, categoria: { select: { nome: true } } },
    }),
    db.contaPagar.findMany({
      where: { lojaId, status: 'LIQUIDADO', pagoEm: { gte: de, lte: ate } },
      select: { valorPago: true, pagoEm: true, descricao: true, categoria: { select: { nome: true } } },
    }),
    db.contaPagar.groupBy({
      by: ['categoriaId'],
      where: { lojaId, status: 'LIQUIDADO', pagoEm: { gte: de, lte: ate } },
      _sum: { valorPago: true },
    }),
  ])

  const dias = new Map<string, { data: string; entradas: number; saidas: number }>()
  const chave = (d: Date) => d.toISOString().slice(0, 10)

  for (let d = new Date(de); d <= ate; d.setDate(d.getDate() + 1)) {
    dias.set(chave(d), { data: chave(d), entradas: 0, saidas: 0 })
  }

  let receitaVendas = 0
  let taxasCartao = 0
  for (const p of pagamentos) {
    const k = chave(p.criadoEm)
    const dia = dias.get(k)
    if (dia) dia.entradas += num(p.valor)
    receitaVendas += num(p.valor)
    taxasCartao += num(p.taxaValor)
  }

  let outrasReceitas = 0
  for (const r of recebidas) {
    if (!r.recebidoEm) continue
    const dia = dias.get(chave(r.recebidoEm))
    if (dia) dia.entradas += num(r.valorRecebido)
    outrasReceitas += num(r.valorRecebido)
  }

  let despesas = 0
  for (const p of pagas) {
    if (!p.pagoEm) continue
    const dia = dias.get(chave(p.pagoEm))
    if (dia) dia.saidas += num(p.valorPago)
    despesas += num(p.valorPago)
  }

  const idsCategoria = categoriasDespesa.map((c) => c.categoriaId).filter(Boolean) as string[]
  const nomesCategoria = idsCategoria.length
    ? await db.categoriaFinanceira.findMany({ where: { id: { in: idsCategoria } }, select: { id: true, nome: true } })
    : []

  let acumulado = 0
  const serie = [...dias.values()].map((d) => {
    acumulado += d.entradas - d.saidas
    return {
      rotulo: d.data.slice(8, 10) + '/' + d.data.slice(5, 7),
      valor: brl(d.entradas),
      valor2: brl(d.saidas),
      acumulado: brl(acumulado),
    }
  })

  const receitaTotal = brl(receitaVendas + outrasReceitas)
  const resultado = brl(receitaTotal - despesas)

  return {
    de,
    ate,
    receitaVendas: brl(receitaVendas),
    outrasReceitas: brl(outrasReceitas),
    receitaTotal,
    despesas: brl(despesas),
    taxasCartao: brl(taxasCartao),
    resultado,
    margem: receitaTotal > 0 ? brl((resultado / receitaTotal) * 100) : 0,
    serie,
    despesasPorCategoria: categoriasDespesa
      .map((c) => ({
        rotulo: nomesCategoria.find((n) => n.id === c.categoriaId)?.nome ?? 'Sem categoria',
        valor: num(c._sum.valorPago),
      }))
      .sort((a, b) => b.valor - a.valor),
  }
}

export async function listarCategoriasFinanceiras(lojaId: string) {
  const categorias = await db.categoriaFinanceira.findMany({
    where: { lojaId },
    orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { contasPagar: true, contasReceber: true } } },
  })
  return categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    cor: c.cor,
    ativo: c.ativo,
    lancamentos: c._count.contasPagar + c._count.contasReceber,
  }))
}

/** Cartões do topo do financeiro: o que vence, o que atrasou, o que entra. */
export async function resumoFinanceiro(lojaId: string) {
  await marcarAtrasadas(lojaId)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em7 = new Date(hoje)
  em7.setDate(em7.getDate() + 7)
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [aPagar, atrasadoPagar, aReceber, atrasadoReceber, vendasMes, despesasMes] = await Promise.all([
    db.contaPagar.aggregate({
      where: { lojaId, status: { in: ['PENDENTE', 'PARCIAL'] }, vencimento: { lte: em7 } },
      _sum: { valor: true, valorPago: true },
      _count: true,
    }),
    db.contaPagar.aggregate({ where: { lojaId, status: 'ATRASADO' }, _sum: { valor: true, valorPago: true }, _count: true }),
    db.contaReceber.aggregate({
      where: { lojaId, status: { in: ['PENDENTE', 'PARCIAL'] } },
      _sum: { valor: true, valorRecebido: true },
      _count: true,
    }),
    db.contaReceber.aggregate({ where: { lojaId, status: 'ATRASADO' }, _sum: { valor: true, valorRecebido: true }, _count: true }),
    db.pagamento.aggregate({
      where: { status: 'APROVADO', criadoEm: { gte: inicioMes }, OR: [{ pedido: { lojaId } }, { encomenda: { lojaId } }] },
      _sum: { valor: true },
    }),
    db.contaPagar.aggregate({ where: { lojaId, status: 'LIQUIDADO', pagoEm: { gte: inicioMes } }, _sum: { valorPago: true } }),
  ])

  const receitaMes = num(vendasMes._sum.valor)
  const despesaMes = num(despesasMes._sum.valorPago)

  return {
    aPagar7Dias: brl(num(aPagar._sum.valor) - num(aPagar._sum.valorPago)),
    aPagar7DiasQtd: aPagar._count,
    atrasadoPagar: brl(num(atrasadoPagar._sum.valor) - num(atrasadoPagar._sum.valorPago)),
    atrasadoPagarQtd: atrasadoPagar._count,
    aReceber: brl(num(aReceber._sum.valor) - num(aReceber._sum.valorRecebido)),
    aReceberQtd: aReceber._count,
    atrasadoReceber: brl(num(atrasadoReceber._sum.valor) - num(atrasadoReceber._sum.valorRecebido)),
    atrasadoReceberQtd: atrasadoReceber._count,
    receitaMes: brl(receitaMes),
    despesaMes: brl(despesaMes),
    resultadoMes: brl(receitaMes - despesaMes),
  }
}
