/**
 * Formatação pt-BR. Todo texto que o operador lê passa por aqui.
 * Regra: nunca use `toLocaleString` solto nas telas — sempre estes helpers,
 * para que moeda, data e unidade fiquem idênticas em todo o sistema.
 */

import { num, type DecimalLike } from './money'

const TZ = 'America/Sao_Paulo'

const fmtMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const fmtMoedaCompacta = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const fmtDecimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
const fmtPercent = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** R$ 3.842,90 */
export function moeda(value: DecimalLike): string {
  return fmtMoeda.format(num(value))
}

/** R$ 3,8 mil — para KPIs em telas estreitas. */
export function moedaCompacta(value: DecimalLike): string {
  return fmtMoedaCompacta.format(num(value))
}

/** 187 */
export function numero(value: DecimalLike): string {
  return fmtNumero.format(num(value))
}

/** 1.250,5 */
export function decimal(value: DecimalLike): string {
  return fmtDecimal.format(num(value))
}

/** 62,4% */
export function percentual(value: DecimalLike): string {
  return `${fmtPercent.format(num(value))}%`
}

/** +12,4% / −3,1% — com o sinal explícito, para comparativos. */
export function variacaoTexto(value: number | null): string {
  if (value === null) return '—'
  const sinal = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sinal}${fmtPercent.format(Math.abs(value))}%`
}

/** 80 g, 1,5 kg, 250 ml, 3 un */
export function quantidade(value: DecimalLike, unidade?: string | null): string {
  const base = fmtDecimal.format(num(value))
  if (!unidade) return base
  const rotulos: Record<string, string> = {
    G: 'g',
    KG: 'kg',
    ML: 'ml',
    L: 'L',
    UN: 'un',
    PCT: 'pct',
    CX: 'cx',
  }
  return `${base} ${rotulos[unidade] ?? unidade.toLowerCase()}`
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 08/09/2026 */
export function data(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short' }).format(d)
}

/** 08/09/2026 14:32 */
export function dataHora(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** 14:32 */
export function hora(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(d)
}

/** 8 de setembro */
export function dataLonga(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric', month: 'long' }).format(d)
}

/** ter, 08/09 */
export function dataCurtaSemana(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(d)
}

/** "há 3 min", "em 2 dias" — para filas de pedido e encomendas. */
export function tempoRelativo(value: Date | string | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  const diffMs = d.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const min = 60_000
  const hora_ = 3_600_000
  const dia = 86_400_000
  if (abs < min) return 'agora'
  if (abs < hora_) return rtf.format(Math.round(diffMs / min), 'minute')
  if (abs < dia) return rtf.format(Math.round(diffMs / hora_), 'hour')
  if (abs < 30 * dia) return rtf.format(Math.round(diffMs / dia), 'day')
  return data(d)
}

/** Minutos decorridos, no formato "1h 12min" — usado na fila do PDV. */
export function duracao(minutos: number): string {
  if (minutos < 1) return 'menos de 1 min'
  const h = Math.floor(minutos / 60)
  const m = Math.round(minutos % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/** (12) 99608-5508 */
export function telefone(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return value
}

/** 25.350.633/0001-50 ou 123.456.789-09 */
export function documento(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.replace(/\D/g, '')
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  }
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }
  return value
}

/** 12242-840 */
export function cep(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.replace(/\D/g, '')
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`
  return value
}

/** Rótulos legíveis para os enums do banco. */
export const rotulos = {
  tipoPedido: {
    BALCAO: 'Balcão',
    MESA: 'Mesa',
    VIAGEM: 'Viagem',
    DELIVERY: 'Delivery',
    ENCOMENDA: 'Encomenda',
    IFOOD: 'iFood',
  },
  statusPedido: {
    ABERTO: 'Aberto',
    EM_PREPARO: 'Em preparo',
    PRONTO: 'Pronto',
    FINALIZADO: 'Finalizado',
    CANCELADO: 'Cancelado',
  },
  statusItemPedido: {
    PENDENTE: 'Pendente',
    PREPARANDO: 'Preparando',
    PRONTO: 'Pronto',
    ENTREGUE: 'Entregue',
    CANCELADO: 'Cancelado',
  },
  statusMesa: {
    LIVRE: 'Livre',
    OCUPADA: 'Ocupada',
    AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
    RESERVADA: 'Reservada',
    INATIVA: 'Inativa',
  },
  statusCaixa: { ABERTO: 'Aberto', FECHADO: 'Fechado', CONFERIDO: 'Conferido' },
  tipoMovimentoCaixa: {
    ABERTURA: 'Abertura',
    VENDA: 'Venda',
    SANGRIA: 'Sangria',
    SUPRIMENTO: 'Suprimento',
    ESTORNO: 'Estorno',
    DESPESA: 'Despesa',
    FECHAMENTO: 'Fechamento',
  },
  tipoProduto: {
    SIMPLES: 'Revenda',
    PRODUZIDO: 'Produção própria',
    PREPARADO: 'Preparado na hora',
    COMBO: 'Combo',
  },
  tipoMovimento: {
    ENTRADA_COMPRA: 'Entrada por compra',
    ENTRADA_MANUAL: 'Entrada manual',
    ENTRADA_PRODUCAO: 'Entrada de produção',
    SAIDA_PRODUCAO: 'Consumo na produção',
    SAIDA_VENDA: 'Baixa por venda',
    SAIDA_MANUAL: 'Saída manual',
    AJUSTE_INVENTARIO: 'Ajuste de inventário',
    PERDA: 'Perda',
    ESTORNO_VENDA: 'Estorno de venda',
  },
  statusProducao: {
    PLANEJADA: 'Planejada',
    EM_PRODUCAO: 'Em produção',
    CONCLUIDA: 'Concluída',
    CANCELADA: 'Cancelada',
  },
  motivoPerda: {
    QUEIMADO: 'Queimado',
    DANIFICADO: 'Danificado',
    VENCIDO: 'Vencido',
    ERRO_PRODUCAO: 'Erro de produção',
    NAO_VENDIDO: 'Não vendido',
    EMBALAGEM: 'Embalagem violada',
    CORTESIA: 'Cortesia',
    OUTRO: 'Outro',
  },
  statusCompra: {
    RASCUNHO: 'Rascunho',
    ENVIADO: 'Enviado',
    PARCIAL: 'Recebido parcial',
    RECEBIDO: 'Recebido',
    CANCELADO: 'Cancelado',
  },
  statusEncomenda: {
    ORCAMENTO: 'Orçamento',
    CONFIRMADA: 'Confirmada',
    EM_PRODUCAO: 'Em produção',
    PRONTA: 'Pronta',
    ENTREGUE: 'Entregue',
    CANCELADA: 'Cancelada',
  },
  statusConta: {
    PENDENTE: 'Pendente',
    PARCIAL: 'Parcial',
    LIQUIDADO: 'Liquidado',
    ATRASADO: 'Atrasado',
    CANCELADO: 'Cancelado',
  },
  statusInventario: { ABERTO: 'Aberto', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado' },
  tipoFormaPagamento: {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    DEBITO: 'Débito',
    CREDITO: 'Crédito',
    VOUCHER: 'Voucher',
    FIADO: 'Fiado',
    OUTRO: 'Outro',
  },
  tipoFidelidade: {
    ACUMULO: 'Acúmulo',
    RESGATE: 'Resgate',
    AJUSTE: 'Ajuste',
    EXPIRACAO: 'Expiração',
  },
  unidade: { G: 'gramas', KG: 'quilos', ML: 'mililitros', L: 'litros', UN: 'unidades', PCT: 'pacotes', CX: 'caixas' },
} as const

export function rotulo<G extends keyof typeof rotulos>(grupo: G, chave: string): string {
  const mapa = rotulos[grupo] as Record<string, string>
  return mapa[chave] ?? chave
}
