import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Peças apresentacionais do kit de gráficos.
 *
 * Estão fora de `interativos.tsx` de propósito: não usam estado nem efeito, e
 * por isso são Server Components. Isso importa porque as páginas passam o
 * ícone como componente (`icone={TrendingUp}`) — uma função, que o React não
 * serializa através da fronteira servidor→cliente. Sendo servidor dos dois lados,
 * não há fronteira e o ícone renderiza direto.
 *
 * `import { StatTile } from '@/components/charts'` continua funcionando: o
 * index reexporta daqui.
 */

/** Vermelho da marca — mesmo token da série 1 de `interativos.tsx`. */
const SERIE_1 = '#D24237'

// ── Sparkline ──────────────────────────────────────────────────────────────

export function Sparkline({
  valores,
  cor = SERIE_1,
  className,
}: {
  valores: number[]
  cor?: string
  className?: string
}) {
  if (valores.length < 2) return null
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  const faixa = max - min || 1
  const d = valores
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (valores.length - 1)) * 100},${20 - ((v - min) / faixa) * 18}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className={cn('h-5 w-full', className)} aria-hidden>
      <path d={d} fill="none" stroke={cor} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  )
}

// ── Barra planejado vs produzido ───────────────────────────────────────────

export function BarraProgresso({
  atual,
  meta,
  tom = 'brand',
  className,
}: {
  atual: number
  meta: number
  tom?: 'brand' | 'leaf' | 'caution'
  className?: string
}) {
  const pct = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0
  const cores = { brand: SERIE_1, leaf: '#2E7D5B', caution: '#B8730F' }
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-paper-sunken', className)}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(pct === 0 ? 0 : 2, pct)}%`, background: cores[tom] }} />
    </div>
  )
}

// ── Cartão de KPI ──────────────────────────────────────────────────────────

export function StatTile({
  rotulo,
  valor,
  apoio,
  variacao,
  sparkline,
  icone: Icone,
  tomVariacao = 'auto',
  className,
}: {
  rotulo: string
  valor: React.ReactNode
  apoio?: React.ReactNode
  /** Já formatada, ex.: "+12,4%". */
  variacao?: string | null
  sparkline?: number[]
  icone?: React.ComponentType<{ className?: string }>
  /** 'auto' pinta verde para alta e vermelho para queda; 'inverso' troca (perdas). */
  tomVariacao?: 'auto' | 'inverso' | 'neutro'
  className?: string
}) {
  const sobe = variacao?.startsWith('+') ?? false
  const cai = variacao?.startsWith('−') || variacao?.startsWith('-')
  const bom = tomVariacao === 'inverso' ? cai : sobe
  const ruim = tomVariacao === 'inverso' ? sobe : cai

  return (
    <div className={cn('rounded-card border border-hairline bg-paper-raised p-5 shadow-card', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{rotulo}</p>
        {Icone ? <Icone className="size-4 shrink-0 text-body-subtle" /> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight tabular-nums" data-numeric>
        {valor}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {variacao ? (
          <span
            className={cn(
              'text-xs font-bold',
              tomVariacao === 'neutro' ? 'text-body-muted' : bom ? 'text-leaf' : ruim ? 'text-danger' : 'text-body-muted',
            )}
            data-numeric
          >
            {variacao}
          </span>
        ) : null}
        {apoio ? <span className="truncate text-xs text-body-muted">{apoio}</span> : null}
      </div>
      {sparkline?.length ? <Sparkline valores={sparkline} className="mt-3" /> : null}
    </div>
  )
}

