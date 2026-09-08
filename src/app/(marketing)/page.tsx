import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CalendarClock,
  Check,
  ChartNoAxesColumn,
  ChefHat,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CirculoNobru } from '@/components/app-shell/marca'
import { textos } from './conteudo'
import { MockupEstoque, MockupFicha, MockupPainel, MockupPdv, MockupProducao } from './mockups'

export const metadata: Metadata = {
  title: 'Nobru Coffee — o sistema operacional de cafeterias e donuterias',
  description:
    'Venda, produção, estoque, clientes e financeiro num sistema só. Feito para quem produz o que vende.',
  openGraph: {
    title: 'Cuide do seu café. Não da planilha.',
    description: 'PDV, ficha técnica, produção, estoque e financeiro para cafeterias, padarias e donuterias.',
    locale: 'pt_BR',
    type: 'website',
  },
}

const ICONES_RECURSO = [ShoppingCart, BookOpen, ChefHat, Boxes, Wallet, CalendarClock, Users, ChartNoAxesColumn]
const MOCKUPS = [MockupPdv, MockupFicha, MockupEstoque, MockupPainel]
const ANCORAS = ['pdv', 'producao', 'estoque', 'financeiro']

export default function PaginaMarketing() {
  const t = textos()

  return (
    <>
      {/* ══ HERO ═══════════════════════════════════════════════════════════
          A tese: o produto é o herói. Em vez de uma ilustração genérica, a
          primeira coisa que se vê é o PDV real, com um donut esgotado — a
          situação que define a loja. */}
      <section className="chalkboard relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #F7A96C 0, transparent 45%), radial-gradient(circle at 85% 10%, #D24237 0, transparent 40%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-16 sm:px-8 lg:pt-20 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-hairline-dark bg-ink-raised px-3 py-1.5 text-[11px] font-bold tracking-wide text-amber-nobru">
                <CirculoNobru className="border-amber-nobru" />
                {t.hero.selo}
              </p>

              <h1 className="mt-6 font-display text-[2.6rem] leading-[1.05] font-black text-cream sm:text-6xl">
                {t.hero.titulo[0]}
                <br />
                <span className="text-nobru-400">{t.hero.titulo[1]}</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-on-dark-muted">{t.hero.subtitulo}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/entrar">
                    {t.hero.ctaPrimario}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild className="border-hairline-dark bg-ink-raised text-cream hover:bg-ink-muted">
                  <a href="#pdv">{t.hero.ctaSecundario}</a>
                </Button>
              </div>

              <p className="mt-5 max-w-sm text-xs leading-relaxed text-on-dark-muted/80">{t.hero.rodape}</p>
            </div>

            <div className="lg:-mr-16">
              <MockupPdv className="rotate-[0.5deg]" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROVA SOCIAL ═══════════════════════════════════════════════════ */}
      <section className="border-b border-hairline bg-paper-raised">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">{t.prova.titulo}</h2>
              <p className="mt-3 text-sm leading-relaxed text-body-muted">{t.prova.descricao}</p>
            </div>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {t.prova.indicadores.map((i) => (
                <div key={i.rotulo}>
                  <dt className="font-display text-3xl font-black text-nobru-500">{i.numero}</dt>
                  <dd className="mt-1 text-xs leading-snug text-body-muted">{i.rotulo}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ══ PROBLEMA ═══════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="eyebrow">{t.problema.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              {t.problema.titulo}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-body-muted">{t.problema.texto}</p>
          </div>
          <ul className="space-y-3 self-center">
            {t.problema.itens.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-card border border-hairline bg-paper-raised px-4 py-3.5 shadow-raise"
              >
                <span className="mt-0.5 font-display text-lg font-black text-nobru-400">?</span>
                <span className="text-sm font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══ RECURSOS ═══════════════════════════════════════════════════════ */}
      <section id="recursos" className="border-y border-hairline bg-paper-raised">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">{t.recursos.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              {t.recursos.titulo}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-body-muted">{t.recursos.descricao}</p>
          </div>

          <ul className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {t.recursos.itens.map((r, i) => {
              const Icone = ICONES_RECURSO[i] ?? ShoppingCart
              return (
                <li key={r.titulo}>
                  <span className="flex size-10 items-center justify-center rounded-control bg-nobru-50 text-nobru-600">
                    <Icone className="size-5" />
                  </span>
                  <h3 className="mt-3.5 text-base font-extrabold tracking-tight">{r.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-body-muted">{r.texto}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ══ SHOWCASES ══════════════════════════════════════════════════════ */}
      {t.showcases.map((s, i) => {
        const Mockup = MOCKUPS[i]
        const invertido = i % 2 === 1
        return (
          <section
            key={s.titulo}
            id={ANCORAS[i]}
            className={cn('scroll-mt-20', invertido ? 'border-y border-hairline bg-paper-raised' : '')}
          >
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
              <div className={cn('grid items-center gap-12 lg:grid-cols-2 lg:gap-16')}>
                <div className={invertido ? 'lg:order-2' : ''}>
                  <p className="eyebrow">{s.eyebrow}</p>
                  <h2 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                    {s.titulo}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-body-muted">{s.texto}</p>
                  <ul className="mt-6 space-y-2.5">
                    {s.pontos.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-leaf-soft">
                          <Check className="size-2.5 text-leaf" strokeWidth={3.5} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={invertido ? 'lg:order-1' : ''}>
                  <Mockup className={invertido ? '-rotate-[0.4deg]' : 'rotate-[0.4deg]'} />
                </div>
              </div>
            </div>
          </section>
        )
      })}

      {/* ══ PRODUÇÃO EM DESTAQUE ═══════════════════════════════════════════ */}
      <section className="chalkboard">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-amber-nobru uppercase">O quadro da manhã</p>
              <h2 className="mt-3 font-display text-3xl leading-tight font-black text-cream sm:text-4xl">
                Planejado, produzido, vendido — na mesma linha
              </h2>
              <p className="mt-4 text-base leading-relaxed text-on-dark-muted">
                É o quadro que a equipe olha às 7h e às 19h. De manhã, para saber quanto fazer. À noite, para saber o que
                sobrou, o que esgotou cedo demais e o que ajustar amanhã.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-6 border-t border-hairline-dark pt-6">
                {[
                  { n: '7 dias', r: 'de média para sugerir a produção' },
                  { n: '1 clique', r: 'consome insumo e dá entrada no acabado' },
                  { n: '0 planilha', r: 'para chegar ao custo real' },
                ].map((i) => (
                  <div key={i.r}>
                    <p className="font-display text-xl font-extrabold text-cream">{i.n}</p>
                    <p className="mt-1 text-[11px] leading-snug text-on-dark-muted">{i.r}</p>
                  </div>
                ))}
              </div>
            </div>
            <MockupProducao />
          </div>
        </div>
      </section>

      {/* ══ PLANOS ═════════════════════════════════════════════════════════ */}
      <section id="planos" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t.planos.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              {t.planos.titulo}
            </h2>
            <p className="mt-4 text-base text-body-muted">{t.planos.descricao}</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {t.planos.itens.map((p) => (
              <div
                key={p.nome}
                className={cn(
                  'relative flex flex-col rounded-panel border bg-paper-raised p-6',
                  p.destaque ? 'border-nobru-500 shadow-pop lg:-my-3 lg:py-9' : 'border-hairline shadow-card',
                )}
              >
                {p.destaque ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-nobru-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
                    Mais escolhido
                  </span>
                ) : null}
                <p className="font-display text-sm font-black tracking-[0.12em] text-nobru-600">{p.nome}</p>
                <p className="mt-2 text-sm text-body-muted">{p.alvo}</p>
                <p className="mt-5 font-display text-4xl font-black tracking-tight">
                  {p.preco}
                  <span className="text-base font-bold text-body-subtle">{t.planos.periodo}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-leaf-soft">
                        <Check className="size-2.5 text-leaf" strokeWidth={3.5} />
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
                <Button className="mt-7" full variant={p.destaque ? 'primary' : 'secondary'} asChild>
                  <Link href="/entrar">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-body-subtle">{t.planos.rodape}</p>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <section className="border-y border-hairline bg-paper-raised">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <p className="eyebrow">{t.faq.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t.faq.titulo}</h2>

          <div className="mt-9 divide-y divide-hairline border-y border-hairline">
            {t.faq.itens.map((f) => (
              <details key={f.pergunta} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <span className="text-base font-bold">{f.pergunta}</span>
                  <span className="mt-1 shrink-0 font-display text-lg leading-none text-nobru-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-8 text-sm leading-relaxed text-body-muted">{f.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ══════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="chalkboard relative overflow-hidden rounded-panel px-8 py-14 text-center sm:px-14">
          <CirculoNobru className="mx-auto mb-5 size-4 border-amber-nobru" />
          <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight font-black text-cream sm:text-4xl">
            {t.ctaFinal.titulo}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-on-dark-muted">{t.ctaFinal.texto}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/entrar">
                {t.ctaFinal.ctaPrimario}
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild className="border-hairline-dark bg-ink-raised text-cream hover:bg-ink-muted">
              <a href="#recursos">{t.ctaFinal.ctaSecundario}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
