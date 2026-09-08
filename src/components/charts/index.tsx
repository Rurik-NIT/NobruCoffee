'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { moeda, numero } from '@/lib/format'

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  KIT DE GRÁFICOS — SVG à mão, sem biblioteca
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Por que sem biblioteca: são cinco formas, todas simples, e o controle total
 * do SVG deixa os gráficos com o mesmo peso de traço e a mesma tipografia do
 * resto do sistema — em vez do visual "dashboard genérico".
 *
 * A REGRA DE COR deste kit foi validada com o script de CVD do design system,
 * não escolhida a olho:
 *
 *   1 série   → vermelho da marca, matiz único, sem legenda (o título nomeia).
 *   2 séries  → #D24237 + #7A4E9B. É o único par próximo da paleta quente que
 *               passa em protanopia (ΔE 17,2), deuteranopia e tritanopia.
 *               Vermelho + verde reprova (ΔE 5,8 protan) — por isso o verde da
 *               marca só aparece em status com ícone e texto, nunca como série.
 *   3+ itens  → NÃO se inventa um terceiro matiz. Vira barra horizontal
 *               ordenada por magnitude, com rampa de um só matiz e rótulo de
 *               valor em cada barra. É também a forma que o operador lê melhor.
 *
 * Todo gráfico traz "Ver dados" — a mesma informação em tabela, para leitor de
 * tela, impressão e conferência.
 */

// ── Tokens do kit ──────────────────────────────────────────────────────────
const SERIE_1 = '#D24237'
const SERIE_2 = '#7A4E9B'
/** Rampa sequencial de um matiz: luminância estritamente decrescente. */
const RAMPA = ['#FADCD4', '#EFA79A', '#DE6E5D', '#D24237', '#A02C24', '#6B1C17']
const GRADE = '#E8DCC9'
const TINTA_FRACA = '#948A82'
const SUPERFICIE = '#FFFDF8'

export const CORES_GRAFICO = { serie1: SERIE_1, serie2: SERIE_2, rampa: RAMPA }

/** Passo da rampa por posição no ranking (0 = maior). */
function passoRampa(indice: number, total: number) {
  if (total <= 1) return RAMPA[3]
  // Maior valor recebe o passo mais escuro e mais saturado.
  const ordem = [3, 2, 1, 0]
  const faixa = Math.min(ordem.length - 1, Math.floor((indice / Math.max(1, total - 1)) * ordem.length))
  return RAMPA[ordem[faixa]]
}

// ── Moldura comum ──────────────────────────────────────────────────────────

export function ChartFrame({
  titulo,
  descricao,
  destaque,
  legenda,
  acao,
  dados,
  children,
  className,
}: {
  titulo: string
  descricao?: string
  destaque?: React.ReactNode
  legenda?: Array<{ rotulo: string; cor: string }>
  acao?: React.ReactNode
  /** Fonte para o "Ver dados" — cabeçalhos e linhas já formatadas. */
  dados?: { colunas: string[]; linhas: string[][] }
  children: React.ReactNode
  className?: string
}) {
  return (
    <figure className={cn('rounded-card border border-hairline bg-paper-raised shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <figcaption className="min-w-0">
          <h3 className="text-sm font-extrabold tracking-tight">{titulo}</h3>
          {descricao ? <p className="mt-0.5 text-xs text-body-muted">{descricao}</p> : null}
          {destaque ? <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{destaque}</p> : null}
        </figcaption>
        <div className="flex shrink-0 items-center gap-3">
          {legenda?.length ? (
            <ul className="flex flex-wrap items-center gap-3">
              {legenda.map((l) => (
                <li key={l.rotulo} className="flex items-center gap-1.5 text-xs font-medium text-body-muted">
                  <span className="size-2.5 rounded-[3px]" style={{ background: l.cor }} aria-hidden />
                  {l.rotulo}
                </li>
              ))}
            </ul>
          ) : null}
          {acao}
        </div>
      </div>
      <div className="px-2 pt-3 pb-2">{children}</div>
      {dados ? (
        <details className="group border-t border-hairline px-5 py-2.5">
          <summary className="cursor-pointer list-none text-xs font-semibold text-body-muted hover:text-body">
            Ver dados
          </summary>
          <div className="mt-3 max-h-56 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-body-subtle">
                <tr>
                  {dados.colunas.map((c, i) => (
                    <th key={c} className={cn('pb-1.5 font-bold', i > 0 && 'text-right')}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {dados.linhas.map((linha, i) => (
                  <tr key={i}>
                    {linha.map((celula, j) => (
                      <td key={j} className={cn('py-1.5', j > 0 && 'text-right font-medium')} data-numeric>
                        {celula}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </figure>
  )
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({
  x,
  y,
  largura,
  children,
}: {
  x: number
  y: number
  largura: number
  children: React.ReactNode
}) {
  const alinhaDireita = x > largura * 0.6
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-28 rounded-[8px] bg-ink px-2.5 py-1.5 text-xs text-cream shadow-pop"
      style={{
        left: alinhaDireita ? undefined : x + 10,
        right: alinhaDireita ? largura - x + 10 : undefined,
        top: Math.max(0, y - 12),
      }}
    >
      {children}
    </div>
  )
}

// ── Barras verticais (vendas por hora) ─────────────────────────────────────

export type PontoBarra = { rotulo: string; valor: number; apoio?: string }

export function BarrasVerticais({
  dados,
  formatador = moeda,
  altura = 176,
  className,
}: {
  dados: PontoBarra[]
  formatador?: (v: number) => string
  altura?: number
  className?: string
}) {
  const [ativo, setAtivo] = React.useState<number | null>(null)
  const max = Math.max(1, ...dados.map((d) => d.valor))
  const larguraTotal = 100 // percentual, o SVG escala
  const passo = larguraTotal / Math.max(1, dados.length)
  // Vão de 2px entre barras exigido pelo design system: aqui em % do passo.
  const larguraBarra = Math.max(1.5, passo * 0.62)

  if (dados.every((d) => d.valor === 0)) {
    return <SemDados altura={altura} texto="Nenhuma venda registrada neste período." />
  }

  return (
    <div className={cn('relative px-3', className)}>
      <svg
        viewBox={`0 0 ${larguraTotal} ${altura}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: altura }}
        role="img"
        aria-label="Vendas por hora"
        onPointerLeave={() => setAtivo(null)}
      >
        {/* Grade recessiva: 3 linhas, sem moldura. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={larguraTotal}
            y1={altura - altura * f}
            y2={altura - altura * f}
            stroke={GRADE}
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {dados.map((d, i) => {
          const h = d.valor === 0 ? 0 : Math.max(3, (d.valor / max) * (altura - 12))
          const x = i * passo + (passo - larguraBarra) / 2
          return (
            <g key={d.rotulo}>
              {/* Alvo de toque maior que a barra. */}
              <rect
                x={i * passo}
                y={0}
                width={passo}
                height={altura}
                fill="transparent"
                onPointerEnter={() => setAtivo(i)}
                style={{ cursor: 'pointer' }}
              />
              <rect
                x={x}
                y={altura - h}
                width={larguraBarra}
                height={h}
                rx={1.6}
                fill={ativo === i ? '#A02C24' : SERIE_1}
                pointerEvents="none"
              />
            </g>
          )
        })}
        <line
          x1={0}
          x2={larguraTotal}
          y1={altura}
          y2={altura}
          stroke={GRADE}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1.5 flex justify-between px-1 text-[10px] font-medium text-body-subtle">
        {dados.map((d, i) => (
          <span key={d.rotulo} className={cn(dados.length > 10 && i % 2 === 1 && 'invisible')}>
            {d.rotulo}
          </span>
        ))}
      </div>
      {ativo !== null && dados[ativo] ? (
        <div className="pointer-events-none absolute inset-x-3 top-0" style={{ height: altura }}>
          <Tooltip x={(ativo + 0.5) * (100 / dados.length) * 3.4} y={16} largura={340}>
            <span className="block font-semibold">{dados[ativo].rotulo}</span>
            <span className="block" data-numeric>
              {formatador(dados[ativo].valor)}
            </span>
            {dados[ativo].apoio ? <span className="block text-on-dark-muted">{dados[ativo].apoio}</span> : null}
          </Tooltip>
        </div>
      ) : null}
    </div>
  )
}

// ── Área/linha de tendência (1 ou 2 séries) ────────────────────────────────

export type PontoSerie = { rotulo: string; valor: number; valor2?: number }

export function AreaTendencia({
  dados,
  formatador = moeda,
  nomeSerie1 = 'Atual',
  nomeSerie2,
  altura = 200,
  className,
}: {
  dados: PontoSerie[]
  formatador?: (v: number) => string
  nomeSerie1?: string
  nomeSerie2?: string
  altura?: number
  className?: string
}) {
  const [ativo, setAtivo] = React.useState<number | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)
  const [larguraPx, setLarguraPx] = React.useState(600)

  React.useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(([e]) => setLarguraPx(e.contentRect.width))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  if (dados.length < 2) return <SemDados altura={altura} texto="Poucos dados para desenhar a tendência." />

  const temSerie2 = dados.some((d) => typeof d.valor2 === 'number')
  const max = Math.max(1, ...dados.map((d) => Math.max(d.valor, d.valor2 ?? 0)))
  const W = 100
  const H = altura
  const padTopo = 10
  const px = (i: number) => (i / (dados.length - 1)) * W
  const py = (v: number) => H - padTopo - (v / max) * (H - padTopo - 4)

  const linha = (chave: 'valor' | 'valor2') =>
    dados
      .map((d, i) => {
        const v = chave === 'valor' ? d.valor : (d.valor2 ?? 0)
        return `${i === 0 ? 'M' : 'L'}${px(i).toFixed(2)},${py(v).toFixed(2)}`
      })
      .join(' ')

  const area = `${linha('valor')} L${W},${H} L0,${H} Z`

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setAtivo(Math.round(frac * (dados.length - 1)))
  }

  return (
    <div className={cn('relative px-3', className)} ref={ref} onPointerMove={aoMover} onPointerLeave={() => setAtivo(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: altura }}
        role="img"
        aria-label={nomeSerie2 ? `${nomeSerie1} e ${nomeSerie2}` : nomeSerie1}
      >
        <defs>
          <linearGradient id="nobru-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIE_1} stopOpacity="0.18" />
            <stop offset="100%" stopColor={SERIE_1} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={H - (H - padTopo) * f}
            y2={H - (H - padTopo) * f}
            stroke={GRADE}
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill="url(#nobru-area)" />
        {temSerie2 ? (
          <path
            d={linha('valor2')}
            fill="none"
            stroke={SERIE_2}
            strokeWidth={2}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
        ) : null}
        <path
          d={linha('valor')}
          fill="none"
          stroke={SERIE_1}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {ativo !== null ? (
          <>
            <line
              x1={px(ativo)}
              x2={px(ativo)}
              y1={0}
              y2={H}
              stroke={TINTA_FRACA}
              strokeWidth={0.8}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            {/* Marcador ≥8px com anel da superfície. */}
            <circle cx={px(ativo)} cy={py(dados[ativo].valor)} r={2.2} fill={SERIE_1} stroke={SUPERFICIE} strokeWidth={1.2} />
            {temSerie2 ? (
              <circle
                cx={px(ativo)}
                cy={py(dados[ativo].valor2 ?? 0)}
                r={2.2}
                fill={SERIE_2}
                stroke={SUPERFICIE}
                strokeWidth={1.2}
              />
            ) : null}
          </>
        ) : null}
      </svg>
      <div className="mt-1.5 flex justify-between px-1 text-[10px] font-medium text-body-subtle">
        <span>{dados[0]?.rotulo}</span>
        {dados.length > 2 ? <span>{dados[Math.floor(dados.length / 2)]?.rotulo}</span> : null}
        <span>{dados[dados.length - 1]?.rotulo}</span>
      </div>
      {ativo !== null && dados[ativo] ? (
        <Tooltip x={(px(ativo) / 100) * larguraPx} y={12} largura={larguraPx}>
          <span className="block font-semibold">{dados[ativo].rotulo}</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ background: SERIE_1 }} aria-hidden />
            <span data-numeric>{formatador(dados[ativo].valor)}</span>
          </span>
          {temSerie2 ? (
            <span className="flex items-center gap-1.5 text-on-dark-muted">
              <span className="size-2 rounded-[2px]" style={{ background: SERIE_2 }} aria-hidden />
              <span data-numeric>{formatador(dados[ativo].valor2 ?? 0)}</span>
            </span>
          ) : null}
        </Tooltip>
      ) : null}
    </div>
  )
}

// ── Ranking horizontal (3+ categorias) ─────────────────────────────────────

export type ItemRanking = { rotulo: string; valor: number; apoio?: string }

/**
 * A forma para 3+ categorias: barras horizontais ordenadas, rampa de um matiz
 * e valor escrito em cada linha. Substitui o gráfico de rosca — o operador
 * compara "PIX vs Dinheiro" muito melhor em barras, e não há problema de
 * daltonismo porque a identidade vem do rótulo, não da cor.
 */
export function BarrasRanking({
  itens,
  formatador = moeda,
  mostrarPercentual = false,
  limite,
  className,
}: {
  itens: ItemRanking[]
  formatador?: (v: number) => string
  mostrarPercentual?: boolean
  limite?: number
  className?: string
}) {
  const ordenados = [...itens].sort((a, b) => b.valor - a.valor)
  const visiveis = limite ? ordenados.slice(0, limite) : ordenados
  const max = Math.max(1, ...visiveis.map((i) => i.valor))
  const total = ordenados.reduce((acc, i) => acc + i.valor, 0)

  if (visiveis.length === 0) return <SemDados altura={140} texto="Nada para ranquear ainda." />

  return (
    <ul className={cn('space-y-2.5 px-3', className)}>
      {visiveis.map((item, i) => (
        <li key={item.rotulo}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-semibold">{item.rotulo}</span>
            <span className="shrink-0 text-xs font-bold" data-numeric>
              {formatador(item.valor)}
              {mostrarPercentual && total > 0 ? (
                <span className="ml-1.5 font-medium text-body-subtle">
                  {((item.valor / total) * 100).toFixed(0)}%
                </span>
              ) : null}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-sunken">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(2, (item.valor / max) * 100)}%`, background: passoRampa(i, visiveis.length) }}
            />
          </div>
          {item.apoio ? <p className="mt-0.5 text-[10px] text-body-subtle">{item.apoio}</p> : null}
        </li>
      ))}
    </ul>
  )
}

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

function SemDados({ altura, texto }: { altura: number; texto: string }) {
  return (
    <div className="flex items-center justify-center px-4 text-center text-xs text-body-subtle" style={{ height: altura }}>
      {texto}
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

export { numero, moeda }
