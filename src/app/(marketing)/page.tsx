import type { Metadata } from 'next'

import {
  CARDAPIO,
  CONTATO,
  DEPOIMENTO,
  ENCOMENDA,
  ENDERECO,
  HISTORIA,
  HORARIO_RESUMO,
  LETREIRO,
  LOJA,
  MAIS_CITADOS,
  NUMEROS,
} from './conteudo'
import { EstadoDaLoja } from './estado-da-loja'
import { Circulo, Donut, Fachada, Xicara } from './ilustracoes'

/**
 * Site da Nobru Coffee.
 *
 * O desenho parte do lugar real: fachada escura com madeira, luz baixa e
 * amarelada, lousa de menu a giz. Por isso a página é escura e densa, e não
 * clara e minimalista — quem já foi na loja tem que reconhecer.
 */

// `absolute` para o título da home não receber o sufixo do template do
// layout raiz, que existe para as telas do sistema.
export const metadata: Metadata = {
  title: { absolute: `${LOJA.nomeCompleto} — ${LOJA.linha} em ${ENDERECO.cidade}` },
}

function Eyebrow({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <p
      className={`flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase ${
        claro ? 'text-amber-nobru' : 'text-nobru-600'
      }`}
    >
      <Circulo className="size-3" />
      {children}
    </p>
  )
}

export default function Site() {
  return (
    <>
      {/* ── Fachada ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-hairline-dark bg-ink">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-nobru-500/12 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="surge">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-amber-nobru">
              <span aria-hidden="true">{LOJA.assinatura}</span>
              {LOJA.linha}
              <span className="text-on-dark-muted/50" aria-hidden="true">
                ·
              </span>
              <EstadoDaLoja className="flex items-center gap-2 text-on-dark-muted" />
            </p>

            <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,4.5rem)] leading-[0.98] font-extrabold tracking-tight text-cream text-balance">
              Um jeito diferente
              <br />
              de servir <span className="text-nobru-400">café</span> e{' '}
              <span className="text-amber-nobru">donuts</span>.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-on-dark-muted">
              Produção própria todo dia numa esquina do {ENDERECO.bairro}, em {ENDERECO.cidade}. Donut que sai
              quentinho, café autoral e uma vitrine que muda conforme o dia rende.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={ENDERECO.mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-control bg-nobru-500 px-6 py-3.5 font-bold text-white shadow-pop transition-transform hover:-translate-y-0.5 hover:bg-nobru-600"
              >
                Como chegar
              </a>
              <a
                href={CONTATO.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-control border border-hairline-dark px-6 py-3.5 font-bold text-cream transition-colors hover:border-amber-nobru hover:text-amber-nobru"
              >
                Ver no Instagram
              </a>
            </div>

            <div className="mt-9 flex items-center gap-4 border-t border-hairline-dark pt-6">
              <p className="font-display text-3xl font-extrabold text-cream">
                5,0<span className="text-amber-nobru">★</span>
              </p>
              <p className="text-sm leading-snug text-on-dark-muted">
                228 avaliações no Google
                <br />
                <span className="text-on-dark-muted/70">nota cheia desde {LOJA.desde}</span>
              </p>
            </div>
          </div>

          <div className="relative">
            <Fachada className="w-full brilha" />
            <Donut className="absolute -top-6 -right-2 w-24 gira-devagar sm:w-32" />
            <div className="stamp absolute -bottom-3 left-2 bg-ink px-4 py-2 font-display text-sm font-extrabold text-nobru-400">
              desde {LOJA.desde}
            </div>
          </div>
        </div>
      </section>

      {/* ── Letreiro ─────────────────────────────────────────────────────── */}
      <div className="letreiro-caixa overflow-hidden border-b border-nobru-700 bg-nobru-500 py-3.5">
        <div className="letreiro">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex shrink-0 items-center" aria-hidden={copia === 1}>
              {LETREIRO.map((frase) => (
                <span
                  key={`${copia}-${frase}`}
                  className="flex items-center gap-5 px-5 font-display text-sm font-extrabold tracking-wide text-cream uppercase"
                >
                  {frase}
                  <span className="text-amber-nobru">{LOJA.assinatura}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── A casa ───────────────────────────────────────────────────────── */}
      <section id="historia" className="bg-paper py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <Eyebrow>A casa</Eyebrow>
              <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.02] font-extrabold tracking-tight text-body text-balance">
                Nobru é apelido de gente,
                <br />
                não nome de rede.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-body-muted">
                O fundador é confeiteiro, atende no salão e responde as avaliações uma por uma. Em quase dez anos a
                loja mudou de ponto sem sair do bairro, e virou parada obrigatória da tarde no corredor da Av. São
                João.
              </p>
              <Donut className="mt-10 hidden w-40 flutua lg:block" cobertura="#f7a96c" />
            </div>

            <ol className="relative space-y-8 border-l-2 border-hairline-strong pl-7">
              {HISTORIA.map((h) => (
                <li key={h.marco} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[35px] size-4 rounded-full border-[3px] border-paper bg-nobru-500"
                  />
                  <p className="font-mono text-xs font-bold tracking-[0.12em] text-nobru-600 uppercase">{h.marco}</p>
                  <h3 className="mt-1.5 font-display text-xl font-extrabold text-body">{h.titulo}</h3>
                  <p className="mt-2 leading-relaxed text-body-muted">{h.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── BLENDS NC ────────────────────────────────────────────────────── */}
      <section className="border-y border-hairline-dark bg-ink py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="order-2 flex justify-center lg:order-1">
            <Xicara className="w-56 sm:w-72" />
          </div>
          <div className="order-1 lg:order-2">
            <Eyebrow claro>Blends NC</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.02] font-extrabold tracking-tight text-cream text-balance">
              Café para beber.
              <br />
              Café para comer.
              <br />
              <span className="text-amber-nobru">Café em tudo.</span>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-on-dark-muted">
              A casa criou um cardápio exclusivo de café especial — e passou a usar café também na confeitaria. É o
              movimento que transformou a donuteria em cafeteria autoral, sem abrir mão do donut que trouxe todo
              mundo até aqui.
            </p>
            <p className="mt-8 border-l-2 border-nobru-500 pl-5 text-lg leading-relaxed text-cream italic">
              “{DEPOIMENTO.texto}”
              <span className="mt-2 block text-sm text-on-dark-muted/80 not-italic">— {DEPOIMENTO.fonte}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Cardápio na lousa ────────────────────────────────────────────── */}
      <section id="cardapio" className="bg-paper py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Da vitrine</Eyebrow>
              <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.02] font-extrabold tracking-tight text-body">
                O que costuma ter
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-body-muted">
              A vitrine muda conforme o dia rende — e quando acaba, acaba. Confira o que saiu hoje no Instagram
              antes de vir de longe.
            </p>
          </div>

          <div className="chalkboard mt-10 rounded-card p-6 shadow-card sm:p-10">
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {CARDAPIO.map((item) => (
                <article key={item.nome} className="border-b border-white/10 pb-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3
                      className={`font-display font-extrabold ${
                        item.destaque ? 'text-2xl text-amber-nobru' : 'text-xl text-cream'
                      }`}
                    >
                      {item.nome}
                    </h3>
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-cream/50 uppercase">
                      {item.marca}
                    </span>
                  </div>
                  <p className="mt-2 leading-relaxed text-cream/75">{item.texto}</p>
                  {item.detalhe ? (
                    <p className="mt-2 font-mono text-xs text-amber-nobru/80">{item.detalhe}</p>
                  ) : null}
                </article>
              ))}
            </div>
            <p className="mt-8 text-center font-display text-sm font-bold tracking-wide text-cream/60 uppercase">
              {LOJA.assinatura} sem preço fixo aqui — o cardápio do dia sai no balcão e no Instagram
            </p>
          </div>
        </div>
      </section>

      {/* ── Reconhecimento ───────────────────────────────────────────────── */}
      <section className="border-y border-hairline bg-paper-sunken py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Eyebrow>Quem veio, contou</Eyebrow>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {NUMEROS.map((n) => (
              <div key={n.rotulo} className="border-t-2 border-nobru-500 pt-4">
                <p className="font-display text-4xl font-extrabold tracking-tight text-body tabular-nums">
                  {n.valor}
                  <span className="text-nobru-500">{n.unidade}</span>
                </p>
                <p className="mt-1 font-bold text-body">{n.rotulo}</p>
                <p className="text-sm text-body-muted">{n.apoio}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <p className="mr-2 text-sm font-bold text-body-muted">Mais citados nas avaliações:</p>
            {MAIS_CITADOS.map((m) => (
              <span
                key={m.palavra}
                className="rounded-full border border-hairline-strong bg-paper-raised px-4 py-1.5 text-sm font-semibold text-body"
              >
                {m.palavra}
                <span className="ml-2 font-mono text-xs text-body-subtle tabular-nums">{m.vezes}×</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Encomendas ───────────────────────────────────────────────────── */}
      <section id="encomendas" className="bg-paper py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="ticket relative overflow-hidden bg-cream px-6 py-12 sm:px-14 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <Eyebrow>Encomendas</Eyebrow>
                <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.02] font-extrabold tracking-tight text-ink text-balance">
                  {ENCOMENDA.titulo}
                </h2>
                <p className="mt-2 font-display text-2xl font-extrabold text-nobru-600">{ENCOMENDA.chamada}</p>
                <p className="mt-5 max-w-lg leading-relaxed text-ink/75">{ENCOMENDA.texto}</p>
                <a
                  href={CONTATO.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-block rounded-control bg-ink px-6 py-3.5 font-bold text-cream transition-transform hover:-translate-y-0.5"
                >
                  Falar no WhatsApp
                </a>
              </div>
              <div className="hidden justify-center lg:flex">
                <Donut className="w-52 gira-devagar" cobertura="#8e2a23" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Onde e quando ────────────────────────────────────────────────── */}
      <section id="onde" className="border-t border-hairline-dark bg-ink py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <Eyebrow claro>Onde estamos</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.02] font-extrabold tracking-tight text-cream text-balance">
              Na esquina da São João,
              <br />
              com a porta aberta.
            </h2>
            <address className="mt-6 text-lg leading-relaxed text-on-dark-muted not-italic">
              {ENDERECO.rua}
              <br />
              {ENDERECO.bairro} — {ENDERECO.cidade}, {ENDERECO.uf}
              <br />
              CEP {ENDERECO.cep}
            </address>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={ENDERECO.mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-control bg-nobru-500 px-6 py-3.5 font-bold text-white transition-colors hover:bg-nobru-600"
              >
                Abrir no Google Maps
              </a>
              <a
                href={CONTATO.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-control border border-hairline-dark px-6 py-3.5 font-bold text-cream transition-colors hover:border-amber-nobru hover:text-amber-nobru"
              >
                {CONTATO.whatsapp}
              </a>
            </div>
          </div>

          <div className="rounded-card border border-hairline-dark bg-ink-raised p-7 sm:p-9">
            <div className="flex items-center justify-between gap-4 border-b border-hairline-dark pb-5">
              <p className="font-display text-lg font-extrabold text-cream">Horário</p>
              <EstadoDaLoja className="flex items-center gap-2 text-sm font-semibold text-on-dark-muted" />
            </div>
            <dl className="mt-5 space-y-4">
              {HORARIO_RESUMO.map((h) => (
                <div key={h.quando} className="flex items-baseline justify-between gap-4 border-b border-hairline-dark/60 pb-4 last:border-0">
                  <dt className="font-semibold text-cream">{h.quando}</dt>
                  <dd
                    className={`font-mono text-sm tabular-nums ${
                      h.horas === 'Fechado' ? 'text-on-dark-muted/60' : 'text-amber-nobru'
                    }`}
                  >
                    {h.horas}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-on-dark-muted">
              Também dá para pedir por delivery no iFood. Para encomenda de bolo, chame no WhatsApp com alguns dias
              de antecedência.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
