import 'server-only'

import { db, type Tx } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num } from '@/lib/money'

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  CAIXA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Um `MovimentoCaixa` é gravado para **todo** pagamento, inclusive cartão e PIX
 * — é isso que permite o fechamento mostrar "quanto entrou em cada forma".
 *
 * Mas a conferência do fechamento compara só **dinheiro em espécie**: cartão
 * não está na gaveta. Quem separa uma coisa da outra é `contaNoCaixa` na forma
 * de pagamento. Toda a aritmética disso vive aqui, em um lugar só, porque é o
 * número que o operador vai ter que explicar no fim do turno.
 */

export type ResumoFormaPagamento = {
  formaPagamentoId: string | null
  nome: string
  contaNoCaixa: boolean
  total: number
  quantidade: number
}

export type ResumoCaixa = {
  id: string
  codigo: string
  status: 'ABERTO' | 'FECHADO' | 'CONFERIDO'
  abertoEm: Date
  fechadoEm: Date | null
  saldoInicial: number
  /** Vendas finalizadas no caixa, todas as formas. */
  totalVendas: number
  /** Quantidade de pedidos finalizados. */
  pedidos: number
  ticketMedio: number
  suprimentos: number
  sangrias: number
  despesas: number
  estornos: number
  /** Entrou em espécie (vendas em dinheiro). */
  vendasEspecie: number
  /** O que deveria estar na gaveta agora. */
  saldoEsperado: number
  saldoInformado: number | null
  diferenca: number | null
  porForma: ResumoFormaPagamento[]
  usuarioAbertura: string
  usuarioFechamento: string | null
  observacaoAbertura: string | null
  observacaoFechamento: string | null
}

export async function calcularResumo(cliente: Tx | typeof db, caixaId: string): Promise<ResumoCaixa> {
  const caixa = await cliente.caixa.findUnique({
    where: { id: caixaId },
    include: {
      usuarioAbertura: { select: { nome: true } },
      usuarioFechamento: { select: { nome: true } },
      movimentos: {
        include: { formaPagamento: { select: { id: true, nome: true, contaNoCaixa: true } } },
        orderBy: { criadoEm: 'asc' },
      },
      pedidos: {
        where: { status: 'FINALIZADO' },
        select: { id: true, total: true },
      },
    },
  })
  if (!caixa) throw new ErroDeNegocio('Caixa não encontrado.', 'NAO_ENCONTRADO')

  const saldoInicial = num(caixa.saldoInicial)

  let suprimentos = 0
  let sangrias = 0
  let despesas = 0
  let estornos = 0
  let vendasEspecie = 0
  const porFormaMapa = new Map<string, ResumoFormaPagamento>()

  for (const m of caixa.movimentos) {
    const valor = num(m.valor)
    switch (m.tipo) {
      case 'SUPRIMENTO':
        suprimentos += valor
        break
      case 'SANGRIA':
        sangrias += Math.abs(valor)
        break
      case 'DESPESA':
        despesas += Math.abs(valor)
        break
      case 'ESTORNO':
        estornos += Math.abs(valor)
        if (m.formaPagamento?.contaNoCaixa) vendasEspecie -= Math.abs(valor)
        break
      case 'VENDA': {
        if (m.formaPagamento?.contaNoCaixa) vendasEspecie += valor
        const chave = m.formaPagamento?.id ?? 'sem-forma'
        const atual = porFormaMapa.get(chave) ?? {
          formaPagamentoId: m.formaPagamento?.id ?? null,
          nome: m.formaPagamento?.nome ?? 'Não informado',
          contaNoCaixa: m.formaPagamento?.contaNoCaixa ?? false,
          total: 0,
          quantidade: 0,
        }
        atual.total += valor
        atual.quantidade += 1
        porFormaMapa.set(chave, atual)
        break
      }
      default:
        break
    }
  }

  const totalVendas = brl([...porFormaMapa.values()].reduce((acc, f) => acc + f.total, 0))
  const pedidos = caixa.pedidos.length
  const saldoEsperado = brl(saldoInicial + vendasEspecie + suprimentos - sangrias - despesas)
  const saldoInformado = caixa.saldoFinalInformado === null ? null : num(caixa.saldoFinalInformado)

  return {
    id: caixa.id,
    codigo: caixa.codigo,
    status: caixa.status,
    abertoEm: caixa.abertoEm,
    fechadoEm: caixa.fechadoEm,
    saldoInicial,
    totalVendas,
    pedidos,
    ticketMedio: pedidos > 0 ? brl(totalVendas / pedidos) : 0,
    suprimentos: brl(suprimentos),
    sangrias: brl(sangrias),
    despesas: brl(despesas),
    estornos: brl(estornos),
    vendasEspecie: brl(vendasEspecie),
    saldoEsperado,
    saldoInformado,
    diferenca: saldoInformado === null ? null : brl(saldoInformado - saldoEsperado),
    porForma: [...porFormaMapa.values()]
      .map((f) => ({ ...f, total: brl(f.total) }))
      .sort((a, b) => b.total - a.total),
    usuarioAbertura: caixa.usuarioAbertura.nome,
    usuarioFechamento: caixa.usuarioFechamento?.nome ?? null,
    observacaoAbertura: caixa.observacaoAbertura,
    observacaoFechamento: caixa.observacaoFechamento,
  }
}

/** Caixa aberto da loja, se houver. Regra: um caixa aberto por loja. */
export async function caixaAbertoDaLoja(cliente: Tx | typeof db, lojaId: string) {
  return cliente.caixa.findFirst({
    where: { lojaId, status: 'ABERTO' },
    select: { id: true, codigo: true, saldoInicial: true, abertoEm: true, usuarioAberturaId: true },
  })
}

/**
 * Exige caixa aberto. A venda não é gravada sem caixa — é o que amarra o
 * dinheiro ao turno e permite o fechamento fazer sentido.
 */
export async function exigirCaixaAberto(cliente: Tx | typeof db, lojaId: string) {
  const caixa = await caixaAbertoDaLoja(cliente, lojaId)
  if (!caixa) {
    throw new ErroDeNegocio(
      'Nenhum caixa aberto. Abra o caixa em Vendas › Caixas antes de registrar vendas.',
      'CAIXA_FECHADO',
    )
  }
  return caixa
}

/** Saldo em espécie na gaveta — usado no cabeçalho do sistema. */
export async function saldoEspecie(cliente: Tx | typeof db, caixaId: string) {
  const movimentos = await cliente.movimentoCaixa.findMany({
    where: { caixaId },
    select: { tipo: true, valor: true, formaPagamento: { select: { contaNoCaixa: true } } },
  })
  const caixa = await cliente.caixa.findUnique({ where: { id: caixaId }, select: { saldoInicial: true } })
  let saldo = num(caixa?.saldoInicial)
  for (const m of movimentos) {
    const valor = num(m.valor)
    if (m.tipo === 'VENDA' || m.tipo === 'ESTORNO') {
      if (m.formaPagamento?.contaNoCaixa) saldo += valor
    } else if (m.tipo === 'SUPRIMENTO' || m.tipo === 'SANGRIA' || m.tipo === 'DESPESA') {
      saldo += valor
    }
  }
  return brl(saldo)
}

/** Histórico de caixas com os números do fechamento. */
export async function listarCaixas(lojaId: string, limite = 40) {
  const caixas = await db.caixa.findMany({
    where: { lojaId },
    orderBy: { abertoEm: 'desc' },
    take: limite,
    include: {
      usuarioAbertura: { select: { nome: true } },
      usuarioFechamento: { select: { nome: true } },
      _count: { select: { pedidos: true } },
      movimentos: { where: { tipo: 'VENDA' }, select: { valor: true } },
    },
  })

  return caixas.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    status: c.status,
    abertoEm: c.abertoEm,
    fechadoEm: c.fechadoEm,
    saldoInicial: num(c.saldoInicial),
    saldoFinalInformado: c.saldoFinalInformado === null ? null : num(c.saldoFinalInformado),
    saldoFinalEsperado: c.saldoFinalEsperado === null ? null : num(c.saldoFinalEsperado),
    diferenca: c.diferenca === null ? null : num(c.diferenca),
    vendas: brl(c.movimentos.reduce((a, m) => a + num(m.valor), 0)),
    pedidos: c._count.pedidos,
    abertoPor: c.usuarioAbertura.nome,
    fechadoPor: c.usuarioFechamento?.nome ?? null,
  }))
}

/** Movimentos do caixa para o extrato do detalhe. */
export async function extratoCaixa(caixaId: string) {
  const movimentos = await db.movimentoCaixa.findMany({
    where: { caixaId },
    orderBy: { criadoEm: 'desc' },
    include: {
      formaPagamento: { select: { nome: true } },
      usuario: { select: { nome: true } },
      pedido: { select: { id: true, codigo: true } },
    },
  })
  return movimentos.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    valor: num(m.valor),
    descricao: m.descricao,
    forma: m.formaPagamento?.nome ?? null,
    usuario: m.usuario.nome,
    pedido: m.pedido,
    criadoEm: m.criadoEm,
  }))
}
