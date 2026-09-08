import type { Metadata } from 'next'
import Link from 'next/link'

import { MarcaNobru } from '@/components/app-shell/marca'
import { CONTATO, ENDERECO, HORARIO_RESUMO, LOJA } from './conteudo'
import { EstadoDaLoja } from './estado-da-loja'

/**
 * Casca do site público.
 *
 * É o site da loja, não do sistema: não há link de entrar, nem menção a
 * software. Quem trabalha lá acessa o sistema direto por `/system`.
 */
export const metadata: Metadata = {
  title: {
    default: `${LOJA.nomeCompleto} — ${LOJA.linha} em São José dos Campos`,
    template: `%s · ${LOJA.nome}`,
  },
  description: `${LOJA.frase} Donuts de produção própria, cookies, salgados e café autoral no ${ENDERECO.bairro}, São José dos Campos. Desde ${LOJA.desde}.`,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: `${LOJA.nomeCompleto} — ${ENDERECO.bairro}, SJC`,
    description: LOJA.frase,
    siteName: LOJA.nomeCompleto,
  },
}

const SECOES = [
  { rotulo: 'A casa', href: '#historia' },
  { rotulo: 'Cardápio', href: '#cardapio' },
  { rotulo: 'Encomendas', href: '#encomendas' },
  { rotulo: 'Onde estamos', href: '#onde' },
]

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-cream focus:px-4 focus:py-2 focus:font-bold focus:text-ink"
      >
        Ir para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-hairline-dark/60 bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
          <Link href="/" aria-label={`${LOJA.nome} — início`}>
            <MarcaNobru tamanho={34} subtitulo={LOJA.linha} />
          </Link>

          <nav className="ml-auto hidden items-center gap-7 md:flex" aria-label="Seções do site">
            {SECOES.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="text-sm font-semibold text-on-dark-muted transition-colors hover:text-cream"
              >
                {s.rotulo}
              </a>
            ))}
          </nav>

          <a
            href={CONTATO.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-control bg-nobru-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-nobru-600 md:ml-0"
          >
            Chamar no WhatsApp
          </a>
        </div>
      </header>

      <main id="conteudo">{children}</main>

      <footer className="border-t border-hairline-dark bg-ink">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <MarcaNobru tamanho={42} subtitulo={LOJA.linha} />
              <p className="mt-4 max-w-xs leading-relaxed text-on-dark-muted">{LOJA.frase}</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-on-dark-muted">
                <EstadoDaLoja className="flex items-center gap-2" />
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-amber-nobru uppercase">Onde</p>
              <address className="mt-3 text-sm leading-relaxed text-on-dark-muted not-italic">
                {ENDERECO.rua}
                <br />
                {ENDERECO.bairro}
                <br />
                {ENDERECO.cidade} — {ENDERECO.uf}
                <br />
                CEP {ENDERECO.cep}
              </address>
              <a
                href={ENDERECO.mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-semibold text-cream underline underline-offset-4 hover:text-amber-nobru"
              >
                Abrir no mapa
              </a>
            </div>

            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-amber-nobru uppercase">Falar com a gente</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href={CONTATO.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-on-dark-muted hover:text-cream">
                    WhatsApp {CONTATO.whatsapp}
                  </a>
                </li>
                <li>
                  <a href={CONTATO.instagram} target="_blank" rel="noopener noreferrer" className="text-on-dark-muted hover:text-cream">
                    Instagram {CONTATO.instagramArroba}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTATO.email}`} className="text-on-dark-muted hover:text-cream">
                    {CONTATO.email}
                  </a>
                </li>
              </ul>

              <p className="mt-5 text-[11px] font-bold tracking-[0.16em] text-amber-nobru uppercase">Horário</p>
              <ul className="mt-3 space-y-1 text-sm text-on-dark-muted">
                {HORARIO_RESUMO.map((h) => (
                  <li key={h.quando}>
                    {h.quando} — {h.horas}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-hairline-dark pt-6 text-xs text-on-dark-muted/70">
            <p>
              {LOJA.assinatura} {LOJA.nomeCompleto} · {ENDERECO.cidade} — {ENDERECO.uf} · desde {LOJA.desde}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
