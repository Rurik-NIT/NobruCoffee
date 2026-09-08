import 'server-only'

import { db } from '@/server/db'
import { brl, num, variacao } from '@/lib/money'
import { listarEstoqueBaixo, listarValidadesProximas } from '@/server/modules/estoque/service'

/**
 * Painel do dia.
 *
 * Responde a uma pergunta: **como está a loja hoje?** Tudo que não ajuda a
 * responder isso ficou de fora — relatório histórico tem tela própria.
 *
 * A comparação é sempre com o **mesmo dia da semana anterior**, não com ontem:
 * numa cafeteria, terça e sábado são negócios diferentes, e comparar sábado com
 * sexta produz alarme falso toda semana.
 */
export async function painelDoDia(lojaId: string, agora = new Date()) {
  const inicioHoje = new Date(agora)
  inicioHoje.setHours(0, 0, 0, 0)
  const fimHoje = new Date(inicioHoje)
  fimHoje.setDate(fimHoje.getDate() + 1)

  const inicioComparacao = new Date(inicioHoje)
  inicioComparacao.setDate(inicioComparacao.getDate() - 7)
  const fimComparacao = new Date(inicioComparacao)
  fimComparacao.setDate(fimComparacao.getDate() + 1)

  const inicio14dias = new Date(inicioHoje)
  inicio14dias.setDate(inicio14dias.getDate() - 13)

  const [
    hoje,
    semanaAnterior,
    itensHoje,
    porHora,
    topProdutos,
    porCategoria,
    porForma,
    ultimos14,
    pedidosAbertos,
    producaoHoje,
    caixas,
    encomendasProximas,
    perdasMes,
    baixos,
    validades,
  ] = await Promise.all([
    db.pedido.aggregate({
      where: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: inicioHoje, lt: fimHoje } },
      _sum: { total: true, custoTotal: true },
      _count: true,
    }),
    db.pedido.aggregate({
      where: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: inicioComparacao, lt: fimComparacao } },
      _sum: { total: true },
      _count: true,
    }),
    db.pedidoItem.aggregate({
      where: {
        status: { not: 'CANCELADO' },
        pedido: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: inicioHoje, lt: fimHoje } },
      },
      _sum: { quantidade: true },
    }),
    db.$queryRaw<Array<{ hora: number; total: number; pedidos: bigint }>>`
      SELECT EXTRACT(HOUR FROM finalizado_em AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
             COALESCE(SUM(total), 0)::float AS total,
             COUNT(*) AS pedidos
      FROM pedidos
      WHERE loja_id = ${lojaId}::uuid
        AND status = 'FINALIZADO'
        AND finalizado_em >= ${inicioHoje} AND finalizado_em < ${fimHoje}
      GROUP BY 1 ORDER BY 1
    `,
    db.pedidoItem.groupBy({
      by: ['produtoId'],
      where: {
        status: { not: 'CANCELADO' },
        pedido: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: inicioHoje, lt: fimHoje } },
      },
      _sum: { quantidade: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 6,
    }),
    db.$queryRaw<Array<{ nome: string; total: number }>>`
      SELECT c.nome, COALESCE(SUM(pi.total), 0)::float AS total
      FROM pedido_itens pi
      JOIN pedidos p ON p.id = pi.pedido_id
      JOIN produtos pr ON pr.id = pi.produto_id
      JOIN categorias c ON c.id = pr.categoria_id
      WHERE p.loja_id = ${lojaId}::uuid AND p.status = 'FINALIZADO'
        AND p.finalizado_em >= ${inicioHoje} AND p.finalizado_em < ${fimHoje}
        AND pi.status <> 'CANCELADO'
      GROUP BY c.nome ORDER BY total DESC LIMIT 6
    `,
    db.$queryRaw<Array<{ nome: string; total: number; qtd: bigint }>>`
      SELECT fp.nome, COALESCE(SUM(pg.valor), 0)::float AS total, COUNT(*) AS qtd
      FROM pagamentos pg
      JOIN formas_pagamento fp ON fp.id = pg.forma_pagamento_id
      JOIN pedidos p ON p.id = pg.pedido_id
      WHERE p.loja_id = ${lojaId}::uuid AND pg.status = 'APROVADO'
        AND pg.criado_em >= ${inicioHoje} AND pg.criado_em < ${fimHoje}
      GROUP BY fp.nome ORDER BY total DESC
    `,
    db.$queryRaw<Array<{ dia: string; total: number }>>`
      SELECT to_char(finalizado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM') AS dia,
             COALESCE(SUM(total), 0)::float AS total
      FROM pedidos
      WHERE loja_id = ${lojaId}::uuid AND status = 'FINALIZADO'
        AND finalizado_em >= ${inicio14dias} AND finalizado_em < ${fimHoje}
      GROUP BY 1, date_trunc('day', finalizado_em AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY date_trunc('day', finalizado_em AT TIME ZONE 'America/Sao_Paulo')
    `,
    db.pedido.findMany({
      where: { lojaId, status: { in: ['ABERTO', 'EM_PREPARO', 'PRONTO'] }, emEspera: false },
      select: { id: true, codigo: true, tipo: true, status: true, total: true, abertoEm: true, mesa: { select: { numero: true } } },
      orderBy: { abertoEm: 'asc' },
      take: 8,
    }),
    db.ordemProducao.findMany({
      where: { lojaId, data: { gte: inicioHoje, lt: fimHoje } },
      select: {
        id: true,
        codigo: true,
        status: true,
        itens: { select: { quantidadePlanejada: true, quantidadeProduzida: true } },
      },
    }),
    db.caixa.findMany({
      where: { lojaId, status: 'ABERTO' },
      select: { id: true, codigo: true, abertoEm: true, saldoInicial: true, usuarioAbertura: { select: { nome: true } } },
    }),
    db.encomenda.findMany({
      where: {
        lojaId,
        status: { in: ['CONFIRMADA', 'EM_PRODUCAO', 'PRONTA'] },
        dataEntrega: { lte: new Date(agora.getTime() + 48 * 3_600_000) },
      },
      select: { id: true, codigo: true, dataEntrega: true, status: true, valorTotal: true, cliente: { select: { nome: true } } },
      orderBy: { dataEntrega: 'asc' },
      take: 6,
    }),
    db.perda.aggregate({
      where: { lojaId, criadoEm: { gte: new Date(agora.getFullYear(), agora.getMonth(), 1) } },
      _sum: { custoEstimado: true },
    }),
    listarEstoqueBaixo(db, lojaId, 6),
    listarValidadesProximas(db, lojaId, 7, 6),
  ])

  const faturamento = num(hoje._sum.total)
  const custo = num(hoje._sum.custoTotal)
  const pedidos = hoje._count
  const faturamentoAnterior = num(semanaAnterior._sum.total)

  const nomesTop = topProdutos.length
    ? await db.produto.findMany({
        where: { id: { in: topProdutos.map((t) => t.produtoId) } },
        select: { id: true, nome: true },
      })
    : []

  // Grade de horas: 8h às 21h, com zeros — a lacuna do meio da tarde é
  // informação, não ausência de dados.
  const horas = Array.from({ length: 14 }, (_, i) => i + 8).map((h) => {
    const registro = porHora.find((p) => p.hora === h)
    return {
      rotulo: `${String(h).padStart(2, '0')}h`,
      valor: registro ? brl(registro.total) : 0,
      apoio: registro ? `${Number(registro.pedidos)} pedido(s)` : undefined,
    }
  })

  return {
    faturamento: brl(faturamento),
    faturamentoAnterior: brl(faturamentoAnterior),
    variacaoFaturamento: variacao(faturamento, faturamentoAnterior),
    pedidos,
    pedidosAnterior: semanaAnterior._count,
    variacaoPedidos: variacao(pedidos, semanaAnterior._count),
    ticketMedio: pedidos > 0 ? brl(faturamento / pedidos) : 0,
    itensVendidos: num(itensHoje._sum.quantidade),
    cmv: brl(custo),
    lucroBruto: brl(faturamento - custo),
    margemBruta: faturamento > 0 ? brl(((faturamento - custo) / faturamento) * 100) : 0,
    perdasMes: num(perdasMes._sum.custoEstimado),

    vendasPorHora: horas,
    tendencia14dias: ultimos14.map((d) => ({ rotulo: d.dia, valor: brl(d.total) })),
    topProdutos: topProdutos.map((t) => ({
      rotulo: nomesTop.find((n) => n.id === t.produtoId)?.nome ?? 'Produto removido',
      valor: num(t._sum.total),
      apoio: `${num(t._sum.quantidade)} un`,
    })),
    porCategoria: porCategoria.map((c) => ({ rotulo: c.nome, valor: brl(c.total) })),
    porFormaPagamento: porForma.map((f) => ({
      rotulo: f.nome,
      valor: brl(f.total),
      apoio: `${Number(f.qtd)} pagamento(s)`,
    })),

    pedidosAbertos: pedidosAbertos.map((p) => ({
      ...p,
      total: num(p.total),
      minutos: Math.round((agora.getTime() - p.abertoEm.getTime()) / 60_000),
    })),
    producao: {
      ordens: producaoHoje.length,
      planejado: producaoHoje.reduce((a, o) => a + o.itens.reduce((s, i) => s + num(i.quantidadePlanejada), 0), 0),
      produzido: producaoHoje.reduce((a, o) => a + o.itens.reduce((s, i) => s + num(i.quantidadeProduzida), 0), 0),
      pendentes: producaoHoje.filter((o) => o.status === 'PLANEJADA').length,
      emAndamento: producaoHoje.filter((o) => o.status === 'EM_PRODUCAO').length,
    },
    caixas: caixas.map((c) => ({ ...c, saldoInicial: num(c.saldoInicial) })),
    encomendasProximas: encomendasProximas.map((e) => ({
      ...e,
      valorTotal: num(e.valorTotal),
      horas: Math.round((e.dataEntrega.getTime() - agora.getTime()) / 3_600_000),
    })),
    estoqueBaixo: baixos,
    validades,
  }
}
