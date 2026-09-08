import 'server-only'

import { db } from '@/server/db'
import { brl, margem, num, variacao } from '@/lib/money'

/**
 * Relatórios.
 *
 * Todo relatório aqui é uma consulta agregada no banco, não um `findMany` que
 * soma em JavaScript: com um ano de vendas isso é a diferença entre 40ms e
 * travar a página.
 */
export type Periodo = { de: Date; ate: Date }

export function periodoDe(atalho: string, hoje = new Date()): Periodo {
  const inicio = new Date(hoje)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 1)

  switch (atalho) {
    case 'hoje':
      return { de: inicio, ate: fim }
    case 'ontem': {
      const de = new Date(inicio)
      de.setDate(de.getDate() - 1)
      return { de, ate: inicio }
    }
    case '7dias': {
      const de = new Date(inicio)
      de.setDate(de.getDate() - 6)
      return { de, ate: fim }
    }
    case '30dias': {
      const de = new Date(inicio)
      de.setDate(de.getDate() - 29)
      return { de, ate: fim }
    }
    case 'mes':
      return { de: new Date(hoje.getFullYear(), hoje.getMonth(), 1), ate: fim }
    case 'mesAnterior': {
      const de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const ate = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      return { de, ate }
    }
    case 'ano':
      return { de: new Date(hoje.getFullYear(), 0, 1), ate: fim }
    default: {
      const de = new Date(inicio)
      de.setDate(de.getDate() - 29)
      return { de, ate: fim }
    }
  }
}

/** Período de igual duração imediatamente anterior — base da comparação. */
export function periodoAnterior(p: Periodo): Periodo {
  const duracao = p.ate.getTime() - p.de.getTime()
  return { de: new Date(p.de.getTime() - duracao), ate: new Date(p.de) }
}

export async function relatorioVendas(lojaId: string, periodo: Periodo) {
  const anterior = periodoAnterior(periodo)

  const [atual, passado, porDia, porTipo, porOperador, porForma, itens] = await Promise.all([
    db.pedido.aggregate({
      where: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: periodo.de, lt: periodo.ate } },
      _sum: { total: true, custoTotal: true, descontoValor: true },
      _count: true,
    }),
    db.pedido.aggregate({
      where: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: anterior.de, lt: anterior.ate } },
      _sum: { total: true },
      _count: true,
    }),
    db.$queryRaw<Array<{ dia: string; total: number; pedidos: bigint }>>`
      SELECT to_char(finalizado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM') AS dia,
             SUM(total)::float AS total, COUNT(*) AS pedidos
      FROM pedidos
      WHERE loja_id = ${lojaId}::uuid AND status = 'FINALIZADO'
        AND finalizado_em >= ${periodo.de} AND finalizado_em < ${periodo.ate}
      GROUP BY 1, date_trunc('day', finalizado_em AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('day', finalizado_em AT TIME ZONE 'America/Sao_Paulo')
    `,
    db.pedido.groupBy({
      by: ['tipo'],
      where: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: periodo.de, lt: periodo.ate } },
      _sum: { total: true },
      _count: true,
    }),
    db.$queryRaw<Array<{ nome: string; total: number; pedidos: bigint }>>`
      SELECT u.nome, SUM(p.total)::float AS total, COUNT(*) AS pedidos
      FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.loja_id = ${lojaId}::uuid AND p.status = 'FINALIZADO'
        AND p.finalizado_em >= ${periodo.de} AND p.finalizado_em < ${periodo.ate}
      GROUP BY u.nome ORDER BY total DESC
    `,
    db.$queryRaw<Array<{ nome: string; total: number; taxas: number }>>`
      SELECT fp.nome, SUM(pg.valor)::float AS total, SUM(pg.taxa_valor)::float AS taxas
      FROM pagamentos pg
      JOIN formas_pagamento fp ON fp.id = pg.forma_pagamento_id
      LEFT JOIN pedidos p ON p.id = pg.pedido_id
      WHERE pg.status = 'APROVADO' AND fp.loja_id = ${lojaId}::uuid
        AND pg.criado_em >= ${periodo.de} AND pg.criado_em < ${periodo.ate}
      GROUP BY fp.nome ORDER BY total DESC
    `,
    db.$queryRaw<Array<{ nome: string; categoria: string; qtd: number; total: number; custo: number }>>`
      SELECT pr.nome, c.nome AS categoria,
             SUM(pi.quantidade)::float AS qtd,
             SUM(pi.total)::float AS total,
             SUM(pi.quantidade * pi.custo_unitario)::float AS custo
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id
      JOIN produtos pr ON pr.id = pi.produto_id
      JOIN categorias c ON c.id = pr.categoria_id
      WHERE p.loja_id = ${lojaId}::uuid AND p.status = 'FINALIZADO' AND pi.status <> 'CANCELADO'
        AND p.finalizado_em >= ${periodo.de} AND p.finalizado_em < ${periodo.ate}
      GROUP BY pr.nome, c.nome ORDER BY total DESC LIMIT 50
    `,
  ])

  const faturamento = num(atual._sum.total)
  const custo = num(atual._sum.custoTotal)
  const anteriorTotal = num(passado._sum.total)

  return {
    periodo,
    faturamento: brl(faturamento),
    pedidos: atual._count,
    ticketMedio: atual._count > 0 ? brl(faturamento / atual._count) : 0,
    descontos: num(atual._sum.descontoValor),
    cmv: brl(custo),
    lucroBruto: brl(faturamento - custo),
    margemBruta: margem(faturamento, custo),
    variacaoFaturamento: variacao(faturamento, anteriorTotal),
    variacaoPedidos: variacao(atual._count, passado._count),
    faturamentoAnterior: brl(anteriorTotal),
    porDia: porDia.map((d) => ({ rotulo: d.dia, valor: brl(d.total), apoio: `${Number(d.pedidos)} pedidos` })),
    porTipo: porTipo.map((t) => ({ rotulo: t.tipo, valor: num(t._sum.total), apoio: `${t._count} pedidos` })),
    porOperador: porOperador.map((o) => ({ rotulo: o.nome, valor: brl(o.total), apoio: `${Number(o.pedidos)} pedidos` })),
    porFormaPagamento: porForma.map((f) => ({
      rotulo: f.nome,
      valor: brl(f.total),
      apoio: f.taxas > 0 ? `${brl(f.taxas).toFixed(2)} em taxas` : undefined,
    })),
    produtos: itens.map((i) => ({
      nome: i.nome,
      categoria: i.categoria,
      quantidade: i.qtd,
      faturamento: brl(i.total),
      custo: brl(i.custo),
      lucro: brl(i.total - i.custo),
      margem: margem(i.total, i.custo),
    })),
  }
}

export async function relatorioEstoque(lojaId: string) {
  const [ingredientes, movimentos, perdas] = await Promise.all([
    db.ingrediente.findMany({
      where: { lojaId, ativo: true },
      select: { id: true, nome: true, sku: true, unidade: true, estoqueAtual: true, estoqueMinimo: true, custoMedio: true },
      orderBy: { nome: 'asc' },
    }),
    db.movimentoEstoque.groupBy({
      by: ['tipo'],
      where: { lojaId, criadoEm: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      _count: true,
    }),
    db.perda.aggregate({
      where: { lojaId, criadoEm: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      _sum: { custoEstimado: true },
      _count: true,
    }),
  ])

  const linhas = ingredientes.map((i) => ({
    ...i,
    estoqueAtual: num(i.estoqueAtual),
    estoqueMinimo: num(i.estoqueMinimo),
    custoMedio: num(i.custoMedio),
    valor: brl(num(i.estoqueAtual) * num(i.custoMedio)),
    abaixoDoMinimo: num(i.estoqueMinimo) > 0 && num(i.estoqueAtual) <= num(i.estoqueMinimo),
  }))

  return {
    itens: linhas,
    valorTotal: brl(linhas.reduce((a, i) => a + i.valor, 0)),
    emAlerta: linhas.filter((i) => i.abaixoDoMinimo).length,
    maioresValores: [...linhas].sort((a, b) => b.valor - a.valor).slice(0, 8).map((i) => ({ rotulo: i.nome, valor: i.valor })),
    movimentosPorTipo: movimentos.map((m) => ({ rotulo: m.tipo, valor: m._count })),
    perdas30d: num(perdas._sum.custoEstimado),
    perdasQtd30d: perdas._count,
  }
}

export async function relatorioProducao(lojaId: string, periodo: Periodo) {
  const itens = await db.$queryRaw<
    Array<{ nome: string; planejado: number; produzido: number; perdido: number; custo: number }>
  >`
    SELECT pr.nome,
           SUM(opi.quantidade_planejada)::float AS planejado,
           SUM(opi.quantidade_produzida)::float AS produzido,
           SUM(opi.quantidade_perdida)::float AS perdido,
           SUM(opi.quantidade_produzida * opi.custo_unitario)::float AS custo
    FROM ordem_producao_itens opi
    JOIN ordens_producao op ON op.id = opi.ordem_id
    JOIN produtos pr ON pr.id = opi.produto_id
    WHERE op.loja_id = ${lojaId}::uuid AND op.status = 'CONCLUIDA'
      AND op.data >= ${periodo.de} AND op.data < ${periodo.ate}
    GROUP BY pr.nome ORDER BY produzido DESC
  `

  const vendidos = await db.$queryRaw<Array<{ nome: string; qtd: number }>>`
    SELECT pr.nome, SUM(pi.quantidade)::float AS qtd
    FROM pedido_itens pi
    JOIN pedidos p ON p.id = pi.pedido_id
    JOIN produtos pr ON pr.id = pi.produto_id
    WHERE p.loja_id = ${lojaId}::uuid AND p.status = 'FINALIZADO' AND pi.status <> 'CANCELADO'
      AND p.finalizado_em >= ${periodo.de} AND p.finalizado_em < ${periodo.ate}
    GROUP BY pr.nome
  `
  const mapaVendidos = new Map(vendidos.map((v) => [v.nome, v.qtd]))

  const linhas = itens.map((i) => ({
    nome: i.nome,
    planejado: i.planejado,
    produzido: i.produzido,
    perdido: i.perdido,
    vendido: mapaVendidos.get(i.nome) ?? 0,
    custo: brl(i.custo),
    aderencia: i.planejado > 0 ? brl((i.produzido / i.planejado) * 100) : null,
    aproveitamento: i.produzido + i.perdido > 0 ? brl((i.produzido / (i.produzido + i.perdido)) * 100) : null,
  }))

  return {
    periodo,
    itens: linhas,
    totais: {
      planejado: linhas.reduce((a, i) => a + i.planejado, 0),
      produzido: linhas.reduce((a, i) => a + i.produzido, 0),
      perdido: linhas.reduce((a, i) => a + i.perdido, 0),
      vendido: linhas.reduce((a, i) => a + i.vendido, 0),
      custo: brl(linhas.reduce((a, i) => a + i.custo, 0)),
    },
  }
}
