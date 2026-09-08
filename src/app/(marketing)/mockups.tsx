import { cn } from '@/lib/utils'

/**
 * Mockups da interface.
 *
 * São renderizados com os mesmos tokens do design system do produto, não como
 * imagem: assim a landing nunca mostra uma tela que o sistema não tem mais, e o
 * texto continua nítido em qualquer densidade de tela.
 */

function Janela({
  titulo,
  children,
  className,
}: {
  titulo: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-panel border border-hairline bg-paper-raised shadow-pop', className)}>
      <div className="flex items-center gap-2 border-b border-hairline bg-paper px-3 py-2">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-nobru-400" />
          <span className="size-2.5 rounded-full bg-amber-nobru" />
          <span className="size-2.5 rounded-full bg-leaf/60" />
        </span>
        <span className="ml-1 truncate text-[11px] font-semibold text-body-subtle">{titulo}</span>
      </div>
      {children}
    </div>
  )
}

// ── PDV ────────────────────────────────────────────────────────────────────

const PRODUTOS_MOCK = [
  { nome: 'Donut Nutella', preco: '14,90', estoque: '18 un', cor: '#D24237' },
  { nome: 'Donut Oreo', preco: '14,90', estoque: '12 un', cor: '#D24237' },
  { nome: 'Donut Morango', preco: '15,90', estoque: '0 un', cor: '#D24237', esgotado: true },
  { nome: 'Cappuccino', preco: '13,90', estoque: null, cor: '#6B4A2F' },
  { nome: 'Cookie 55%', preco: '12,90', estoque: '9 un', cor: '#B8730F' },
  { nome: 'Coxinha cremosa', preco: '11,90', estoque: '14 un', cor: '#2E7D5B' },
  { nome: 'Latte', preco: '13,50', estoque: null, cor: '#6B4A2F' },
  { nome: 'Copo de morango', preco: '18,90', estoque: '6 un', cor: '#7A4E9B' },
]

export function MockupPdv({ className }: { className?: string }) {
  return (
    <Janela titulo="nobru.app/pdv — Camila F. · Caixa CX-000042" className={className}>
      <div className="grid gap-0 sm:grid-cols-[1fr_218px]">
        {/* Catálogo */}
        <div className="border-hairline p-3 sm:border-r">
          <div className="flex items-center gap-1.5">
            <div className="h-7 flex-1 rounded-control border border-hairline-strong bg-paper px-2.5 text-[11px] leading-7 text-body-subtle">
              Buscar produto ou código…
            </div>
            <span className="rounded-full border border-leaf/25 bg-leaf-soft px-2 py-1 text-[10px] font-bold text-leaf">
              Caixa aberto
            </span>
          </div>

          <div className="mt-2 flex gap-1 overflow-hidden">
            {['Tudo', 'Donuts', 'BLENDS NC', 'Cookies', 'Salgados'].map((c, i) => (
              <span
                key={c}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold',
                  i === 0 ? 'border-ink bg-ink text-cream' : 'border-hairline-strong bg-paper text-body-muted',
                )}
              >
                {c}
              </span>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {PRODUTOS_MOCK.map((p) => (
              <div
                key={p.nome}
                className={cn(
                  'relative overflow-hidden rounded-card border border-hairline bg-paper-raised',
                  p.esgotado && 'opacity-60',
                )}
              >
                <div className="flex h-9 items-center justify-center" style={{ background: `${p.cor}1f` }}>
                  <span className="font-display text-[11px] font-black" style={{ color: p.cor }}>
                    {p.nome.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="p-1.5">
                  <p className="line-clamp-2 text-[9px] leading-tight font-semibold">{p.nome}</p>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="font-display text-[10px] font-extrabold">R$ {p.preco}</span>
                    {p.estoque ? (
                      <span
                        className={cn(
                          'text-[8px] font-bold',
                          p.esgotado ? 'text-danger' : 'text-body-subtle',
                        )}
                      >
                        {p.estoque}
                      </span>
                    ) : null}
                  </div>
                </div>
                {p.esgotado ? (
                  <span className="stamp absolute top-1 left-1/2 -translate-x-1/2 scale-[0.62] text-[8px]">Sold out</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Comanda */}
        <div className="ticket bg-paper-raised p-3">
          <div className="flex gap-1 rounded-control bg-paper-sunken p-0.5">
            {['Balcão', 'Viagem', 'Entrega'].map((t, i) => (
              <span
                key={t}
                className={cn(
                  'flex-1 rounded-[6px] py-1 text-center text-[9px] font-bold',
                  i === 0 ? 'bg-paper-raised text-body shadow-raise' : 'text-body-muted',
                )}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-2 border-y border-hairline py-2">
            {[
              { nome: 'Donut Nutella', qtd: 2, valor: '29,80' },
              { nome: 'Cappuccino · 300 ml', qtd: 1, valor: '17,90', extra: '+ Calda de Nutella' },
              { nome: 'Coxinha cremosa', qtd: 1, valor: '11,90' },
            ].map((i) => (
              <div key={i.nome} className="flex items-start justify-between gap-2 py-1">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold">{i.nome}</p>
                  {i.extra ? <p className="text-[9px] text-body-muted">{i.extra}</p> : null}
                  <p className="text-[9px] text-body-subtle">{i.qtd} un</p>
                </div>
                <span className="shrink-0 text-[10px] font-bold">R$ {i.valor}</span>
              </div>
            ))}
          </div>

          <div className="space-y-0.5 py-2 font-mono text-[9px]">
            <div className="flex justify-between text-body-muted">
              <span>Subtotal</span>
              <span>R$ 59,60</span>
            </div>
            <div className="flex justify-between text-nobru-600">
              <span>Desconto (NOBRU10)</span>
              <span>−R$ 5,96</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-hairline-strong pt-1.5">
              <span className="font-sans text-[10px] font-bold">Total</span>
              <span className="font-display text-base font-extrabold">R$ 53,64</span>
            </div>
          </div>

          <div className="rounded-control bg-nobru-500 py-2 text-center text-[10px] font-bold text-white">
            Cobrar R$ 53,64
          </div>
        </div>
      </div>
    </Janela>
  )
}

// ── Ficha técnica ──────────────────────────────────────────────────────────

export function MockupFicha({ className }: { className?: string }) {
  const itens = [
    { nome: 'Creme de avelã', qtd: '25 g', custo: '1,80', pct: 100 },
    { nome: 'Farinha de trigo', qtd: '80 g', custo: '0,50', pct: 28 },
    { nome: 'Manteiga sem sal', qtd: '12 g', custo: '0,59', pct: 33 },
    { nome: 'Ovos', qtd: '0,35 un', custo: '0,27', pct: 15 },
    { nome: 'Óleo de fritura', qtd: '25 ml · perda 8%', custo: '0,26', pct: 14 },
    { nome: 'Leite integral', qtd: '30 ml', custo: '0,17', pct: 10 },
  ]
  return (
    <Janela titulo="nobru.app/fichas-tecnicas — Donut Nutella · v3" className={className}>
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { r: 'Custo/un', v: 'R$ 4,12' },
            { r: 'Venda', v: 'R$ 14,90' },
            { r: 'Lucro/un', v: 'R$ 10,78' },
            { r: 'Margem', v: '72,3%', tom: 'text-leaf' },
          ].map((k) => (
            <div key={k.r} className="rounded-card border border-hairline bg-paper p-2">
              <p className="text-[8px] font-bold tracking-wider text-body-subtle uppercase">{k.r}</p>
              <p className={cn('mt-0.5 font-display text-sm font-extrabold', k.tom)}>{k.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 space-y-1.5">
          {itens.map((i) => (
            <div key={i.nome}>
              <div className="flex items-baseline justify-between text-[10px]">
                <span className="font-semibold">{i.nome}</span>
                <span className="font-bold">R$ {i.custo}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-sunken">
                  <div className="h-full rounded-full bg-nobru-500" style={{ width: `${i.pct}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-[8px] text-body-subtle">{i.qtd}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2.5 rounded-control bg-caution-soft px-2 py-1.5 text-[9px] font-semibold text-caution">
          A avelã responde por 44% do custo. Se subir 20%, a margem cai para 68,4%.
        </p>
      </div>
    </Janela>
  )
}

// ── Produção do dia ────────────────────────────────────────────────────────

export function MockupProducao({ className }: { className?: string }) {
  const linhas = [
    { nome: 'Donut Nutella', planejado: 50, produzido: 50, vendido: 37, estoque: 13 },
    { nome: 'Donut Oreo', planejado: 40, produzido: 40, vendido: 32, estoque: 8 },
    { nome: 'Donut Morango', planejado: 30, produzido: 29, vendido: 29, estoque: 0 },
    { nome: 'Cookie 55%', planejado: 24, produzido: 24, vendido: 15, estoque: 9 },
    { nome: 'Coxinha cremosa', planejado: 35, produzido: 35, vendido: 21, estoque: 14 },
  ]
  return (
    <Janela titulo="nobru.app/producao — 8 de setembro · turno manhã" className={className}>
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { r: 'Planejado', v: '179' },
            { r: 'Produzido', v: '178' },
            { r: 'Vendido', v: '134' },
            { r: 'Aproveitamento', v: '99,4%', tom: 'text-leaf' },
          ].map((k) => (
            <div key={k.r} className="rounded-card border border-hairline bg-paper p-2">
              <p className="text-[8px] font-bold tracking-wider text-body-subtle uppercase">{k.r}</p>
              <p className={cn('mt-0.5 font-display text-sm font-extrabold', k.tom)}>{k.v}</p>
            </div>
          ))}
        </div>

        <table className="mt-2.5 w-full text-[9px]">
          <thead>
            <tr className="border-b border-hairline text-left text-body-subtle">
              <th className="pb-1 font-bold">Produto</th>
              <th className="pb-1 text-right font-bold">Plan.</th>
              <th className="pb-1 text-right font-bold">Prod.</th>
              <th className="pb-1 text-right font-bold">Vend.</th>
              <th className="pb-1 text-right font-bold">Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {linhas.map((l) => (
              <tr key={l.nome}>
                <td className="py-1.5 font-semibold">{l.nome}</td>
                <td className="py-1.5 text-right">{l.planejado}</td>
                <td className="py-1.5 text-right">{l.produzido}</td>
                <td className="py-1.5 text-right">{l.vendido}</td>
                <td className="py-1.5 text-right">
                  {l.estoque === 0 ? (
                    <span className="stamp scale-[0.6] text-[7px]">Sold out</span>
                  ) : (
                    <span className="font-bold">{l.estoque}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Janela>
  )
}

// ── Estoque ────────────────────────────────────────────────────────────────

export function MockupEstoque({ className }: { className?: string }) {
  const linhas = [
    { nome: 'Farinha de trigo especial', saldo: '18,4 kg', min: '20 kg', valor: 'R$ 114', alerta: true },
    { nome: 'Creme de avelã', saldo: '6,2 kg', min: '5 kg', valor: 'R$ 446', alerta: false },
    { nome: 'Leite integral', saldo: '31 L', min: '20 L', valor: 'R$ 180', alerta: false },
    { nome: 'Morango fresco', saldo: '2,1 kg', min: '3 kg', valor: 'R$ 59', alerta: true, validade: 'vence em 2d' },
    { nome: 'Café BLENDS NC', saldo: '9,8 kg', min: '6 kg', valor: 'R$ 774', alerta: false },
  ]
  return (
    <Janela titulo="nobru.app/estoque — 32 insumos ativos" className={className}>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { r: 'Valor em estoque', v: 'R$ 4.128' },
            { r: 'No mínimo', v: '2', tom: 'text-caution' },
            { r: 'Vencendo', v: '1', tom: 'text-danger' },
          ].map((k) => (
            <div key={k.r} className="rounded-card border border-hairline bg-paper p-2">
              <p className="text-[8px] font-bold tracking-wider text-body-subtle uppercase">{k.r}</p>
              <p className={cn('mt-0.5 font-display text-sm font-extrabold', k.tom)}>{k.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 divide-y divide-hairline">
          {linhas.map((l) => (
            <div key={l.nome} className="flex items-center gap-2 py-1.5">
              <span
                className={cn('size-1.5 shrink-0 rounded-full', l.alerta ? 'bg-caution' : 'bg-leaf')}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold">{l.nome}</p>
                <p className="text-[8px] text-body-subtle">
                  mínimo {l.min}
                  {l.validade ? ` · ${l.validade}` : ''}
                </p>
              </div>
              <span className={cn('text-[10px] font-bold', l.alerta && 'text-caution')}>{l.saldo}</span>
              <span className="w-14 shrink-0 text-right text-[9px] text-body-muted">{l.valor}</span>
            </div>
          ))}
        </div>

        <p className="mt-2 rounded-control bg-nobru-50 px-2 py-1.5 text-[9px] font-semibold text-nobru-700">
          Reposição sugerida: R$ 612 no Moinho Vale do Paraíba · gerar pedido
        </p>
      </div>
    </Janela>
  )
}

// ── Painel financeiro ──────────────────────────────────────────────────────

const HORAS = [
  { h: '10', v: 12 },
  { h: '11', v: 20 },
  { h: '12', v: 26 },
  { h: '13', v: 22 },
  { h: '14', v: 38 },
  { h: '15', v: 64 },
  { h: '16', v: 78 },
  { h: '17', v: 71 },
  { h: '18', v: 58 },
  { h: '19', v: 24 },
]

export function MockupPainel({ className }: { className?: string }) {
  const max = Math.max(...HORAS.map((h) => h.v))
  return (
    <Janela titulo="nobru.app/dashboard — Painel do dia" className={className}>
      <div className="p-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { r: 'Faturamento', v: 'R$ 3.842,90', d: '+12,4%', tom: 'text-leaf' },
            { r: 'Pedidos', v: '187', d: '+6,1%', tom: 'text-leaf' },
            { r: 'Ticket médio', v: 'R$ 20,55', d: null },
            { r: 'Lucro bruto', v: 'R$ 2.517', d: 'margem 65,5%' },
          ].map((k) => (
            <div key={k.r} className="rounded-card border border-hairline bg-paper p-2">
              <p className="text-[8px] font-bold tracking-wider text-body-subtle uppercase">{k.r}</p>
              <p className="mt-0.5 font-display text-[13px] font-extrabold">{k.v}</p>
              {k.d ? <p className={cn('text-[8px] font-bold', k.tom ?? 'text-body-muted')}>{k.d}</p> : null}
            </div>
          ))}
        </div>

        <div className="mt-2.5 grid gap-2 sm:grid-cols-[1.5fr_1fr]">
          <div className="rounded-card border border-hairline bg-paper p-2.5">
            <p className="text-[9px] font-extrabold">Vendas por hora</p>
            <div className="mt-2 flex h-20 items-end gap-1">
              {HORAS.map((h) => (
                <div key={h.h} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-[2px] bg-nobru-500"
                    style={{ height: `${(h.v / max) * 100}%` }}
                  />
                  <span className="text-[7px] text-body-subtle">{h.h}h</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-hairline bg-paper p-2.5">
            <p className="text-[9px] font-extrabold">Formas de pagamento</p>
            <div className="mt-2 space-y-1.5">
              {[
                { n: 'PIX', v: 'R$ 1.462', p: 100 },
                { n: 'Débito', v: 'R$ 921', p: 63 },
                { n: 'Crédito', v: 'R$ 692', p: 47 },
                { n: 'Dinheiro', v: 'R$ 461', p: 32 },
                { n: 'iFood', v: 'R$ 307', p: 21 },
              ].map((f, i) => (
                <div key={f.n}>
                  <div className="flex justify-between text-[9px]">
                    <span className="font-semibold">{f.n}</span>
                    <span className="font-bold">{f.v}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-paper-sunken">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${f.p}%`,
                        background: ['#6B1C17', '#A02C24', '#D24237', '#DE6E5D', '#EFA79A'][i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Janela>
  )
}
