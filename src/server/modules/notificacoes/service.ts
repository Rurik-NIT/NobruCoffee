import 'server-only'

import type { SeveridadeNotificacao, TipoNotificacao } from '@prisma/client'

import { db } from '@/server/db'
import { moeda, quantidade as fmtQtd } from '@/lib/format'
import { num } from '@/lib/money'
import { listarEstoqueBaixo, listarValidadesProximas } from '@/server/modules/estoque/service'

/**
 * Central de avisos.
 *
 * Um aviso só existe se levar a uma ação: todo registro carrega um `link` para
 * a tela onde o problema se resolve. E todo aviso tem uma `chave` estável
 * ("estoque_baixo:<id>:2026-09-08"), então rodar o gerador dez vezes no mesmo
 * dia não enche o sino de repetição.
 */
type Rascunho = {
  tipo: TipoNotificacao
  severidade: SeveridadeNotificacao
  titulo: string
  mensagem: string
  link: string
  chave: string
  entidadeTipo?: string
  entidadeId?: string
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export async function gerarNotificacoes(lojaId: string) {
  const config = await db.configuracao.findUnique({
    where: { lojaId },
    select: { alertaValidadeDias: true },
  })
  const janelaValidade = config?.alertaValidadeDias ?? 7
  const dia = hojeISO()
  const rascunhos: Rascunho[] = []

  // 1. Insumo no mínimo — é o aviso que evita "acabou a farinha na quinta".
  const baixos = await listarEstoqueBaixo(db, lojaId, 20)
  for (const i of baixos) {
    const zerado = i.estoqueAtual <= 0
    rascunhos.push({
      tipo: 'ESTOQUE_BAIXO',
      severidade: zerado ? 'CRITICO' : 'ALERTA',
      titulo: zerado ? `${i.nome} zerou` : `${i.nome} no mínimo`,
      mensagem: zerado
        ? `Sem saldo em estoque. Mínimo definido: ${fmtQtd(i.estoqueMinimo, i.unidade)}.`
        : `Restam ${fmtQtd(i.estoqueAtual, i.unidade)} — o mínimo é ${fmtQtd(i.estoqueMinimo, i.unidade)}.`,
      link: `/estoque?busca=${encodeURIComponent(i.sku)}`,
      chave: `estoque_baixo:${i.id}:${dia}`,
      entidadeTipo: 'ingrediente',
      entidadeId: i.id,
    })
  }

  // 2. Validade chegando.
  const validades = await listarValidadesProximas(db, lojaId, janelaValidade, 20)
  for (const l of validades) {
    rascunhos.push({
      tipo: 'VALIDADE_PROXIMA',
      severidade: l.vencido ? 'CRITICO' : 'ALERTA',
      titulo: l.vencido ? `Lote vencido: ${l.ingrediente.nome}` : `${l.ingrediente.nome} vence em ${l.diasRestantes}d`,
      mensagem: `Lote ${l.codigo} · ${fmtQtd(l.quantidade, l.ingrediente.unidade)} · ${moeda(l.valorEmRisco)} em risco.`,
      link: '/estoque/validades',
      chave: `validade:${l.id}:${dia}`,
      entidadeTipo: 'lote',
      entidadeId: l.id,
    })
  }

  // 3. Produção planejada e não iniciada.
  const producaoPendente = await db.ordemProducao.findMany({
    where: { lojaId, status: 'PLANEJADA', data: { lte: new Date() } },
    select: { id: true, codigo: true, data: true, _count: { select: { itens: true } } },
    take: 10,
  })
  for (const op of producaoPendente) {
    rascunhos.push({
      tipo: 'PRODUCAO_PENDENTE',
      severidade: 'ALERTA',
      titulo: `Produção ${op.codigo} não começou`,
      mensagem: `${op._count.itens} item(ns) planejados para hoje aguardando início.`,
      link: `/producao/ordens/${op.id}`,
      chave: `producao:${op.id}:${dia}`,
      entidadeTipo: 'ordem_producao',
      entidadeId: op.id,
    })
  }

  // 4. Encomenda nas próximas 48h.
  const limite = new Date(Date.now() + 48 * 3_600_000)
  const encomendas = await db.encomenda.findMany({
    where: {
      lojaId,
      status: { in: ['CONFIRMADA', 'EM_PRODUCAO'] },
      dataEntrega: { lte: limite },
    },
    select: { id: true, codigo: true, dataEntrega: true, status: true, cliente: { select: { nome: true } } },
    orderBy: { dataEntrega: 'asc' },
    take: 10,
  })
  for (const e of encomendas) {
    const horas = Math.max(0, Math.round((e.dataEntrega.getTime() - Date.now()) / 3_600_000))
    rascunhos.push({
      tipo: 'ENCOMENDA_PROXIMA',
      severidade: horas <= 12 ? 'CRITICO' : 'ALERTA',
      titulo: `Encomenda ${e.codigo} em ${horas}h`,
      mensagem: `${e.cliente.nome} · status ${e.status === 'CONFIRMADA' ? 'confirmada, sem produção' : 'em produção'}.`,
      link: `/encomendas/${e.id}`,
      chave: `encomenda:${e.id}:${dia}`,
      entidadeTipo: 'encomenda',
      entidadeId: e.id,
    })
  }

  // 5. Conta vencendo ou vencida.
  const em3dias = new Date(Date.now() + 3 * 86_400_000)
  const contas = await db.contaPagar.findMany({
    where: { lojaId, status: { in: ['PENDENTE', 'PARCIAL', 'ATRASADO'] }, vencimento: { lte: em3dias } },
    select: { id: true, descricao: true, valor: true, valorPago: true, vencimento: true },
    orderBy: { vencimento: 'asc' },
    take: 10,
  })
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (const c of contas) {
    const atrasada = c.vencimento < hoje
    rascunhos.push({
      tipo: 'CONTA_VENCENDO',
      severidade: atrasada ? 'CRITICO' : 'ALERTA',
      titulo: atrasada ? `Conta atrasada: ${c.descricao}` : `Vence em breve: ${c.descricao}`,
      mensagem: `${moeda(num(c.valor) - num(c.valorPago))} em aberto.`,
      link: '/financeiro/pagar',
      chave: `conta:${c.id}:${dia}`,
      entidadeTipo: 'conta_pagar',
      entidadeId: c.id,
    })
  }

  // 6. Caixa fechado com divergência não conferida.
  const divergentes = await db.caixa.findMany({
    where: { lojaId, status: 'FECHADO', NOT: { diferenca: 0 } },
    select: { id: true, codigo: true, diferenca: true },
    take: 5,
  })
  for (const c of divergentes) {
    rascunhos.push({
      tipo: 'CAIXA_DIVERGENCIA',
      severidade: 'CRITICO',
      titulo: `Caixa ${c.codigo} com diferença`,
      mensagem: `${moeda(num(c.diferenca))} de diferença aguardando conferência.`,
      link: `/caixas/${c.id}`,
      chave: `caixa_div:${c.id}`,
      entidadeTipo: 'caixa',
      entidadeId: c.id,
    })
  }

  // 7. Aniversário do cliente — gancho de fidelidade que a marca já usa.
  const agora = new Date()
  const aniversariantes = await db.$queryRaw<Array<{ id: string; nome: string; telefone: string }>>`
    SELECT id, nome, telefone FROM clientes
    WHERE loja_id = ${lojaId}::uuid
      AND ativo = true
      AND data_nascimento IS NOT NULL
      AND EXTRACT(MONTH FROM data_nascimento) = ${agora.getMonth() + 1}
      AND EXTRACT(DAY FROM data_nascimento) = ${agora.getDate()}
    LIMIT 10
  `
  for (const c of aniversariantes) {
    rascunhos.push({
      tipo: 'ANIVERSARIO_CLIENTE',
      severidade: 'INFO',
      titulo: `${c.nome} faz aniversário hoje`,
      mensagem: 'Emita um cupom de aniversário e chame no WhatsApp.',
      link: `/clientes/${c.id}`,
      chave: `aniversario:${c.id}:${dia}`,
      entidadeTipo: 'cliente',
      entidadeId: c.id,
    })
  }

  if (rascunhos.length === 0) return 0

  // `chave` é única por loja: o upsert torna o gerador idempotente no dia.
  const resultado = await db.notificacao.createMany({
    data: rascunhos.map((r) => ({ lojaId, ...r })),
    skipDuplicates: true,
  })
  return resultado.count
}

export async function listarNotificacoes(lojaId: string, limite = 12) {
  const [itens, naoLidas] = await Promise.all([
    db.notificacao.findMany({
      where: { lojaId },
      orderBy: [{ lida: 'asc' }, { criadoEm: 'desc' }],
      take: limite,
      select: {
        id: true,
        titulo: true,
        mensagem: true,
        severidade: true,
        link: true,
        lida: true,
        criadoEm: true,
      },
    }),
    db.notificacao.count({ where: { lojaId, lida: false } }),
  ])

  return {
    itens: itens.map((n) => ({ ...n, criadoEm: n.criadoEm.toISOString() })),
    naoLidas,
  }
}

/** Remove avisos antigos já lidos — mantém a caixa útil. */
export async function limparNotificacoesAntigas(lojaId: string) {
  await db.notificacao.deleteMany({
    where: { lojaId, lida: true, criadoEm: { lt: new Date(Date.now() - 30 * 86_400_000) } },
  })
}
