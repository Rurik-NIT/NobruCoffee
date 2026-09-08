import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { MarcaNobru } from '@/components/app-shell/marca'
import { textos } from './conteudo'

export default function LayoutMarketing({ children }: { children: React.ReactNode }) {
  const t = textos()

  return (
    <div className="min-h-dvh bg-paper">
      {/* Cabeçalho: escuro só até o hero terminar, então o header é
          transparente sobre a lousa e ganha fundo ao rolar (CSS puro). */}
      <header className="sticky top-0 z-40 border-b border-hairline-dark/40 bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
          <Link href="/" aria-label="Nobru Coffee — início">
            <MarcaNobru tamanho={34} subtitulo="Sistema da loja" />
          </Link>

          <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Seções">
            {[
              { rotulo: t.nav.recursos, href: '#recursos' },
              { rotulo: t.nav.pdv, href: '#pdv' },
              { rotulo: t.nav.producao, href: '#producao' },
              { rotulo: t.nav.planos, href: '#planos' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-on-dark-muted transition-colors hover:text-cream"
              >
                {l.rotulo}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-on-dark-muted hover:bg-ink-raised hover:text-cream"
            >
              <Link href="/entrar">{t.nav.entrar}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/entrar">{t.nav.comecar}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="chalkboard border-t border-hairline-dark">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
            <div>
              <MarcaNobru tamanho={40} subtitulo="Cafeteria BLENDS NC" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-on-dark-muted">{t.rodape.descricao}</p>
              <p className="mt-4 text-xs text-on-dark-muted/70">{t.rodape.endereco}</p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {t.rodape.colunas.map((coluna) => (
                <div key={coluna.titulo}>
                  <p className="text-[11px] font-bold tracking-[0.16em] text-amber-nobru uppercase">{coluna.titulo}</p>
                  <ul className="mt-3 space-y-2">
                    {coluna.links.map((l) => (
                      <li key={l.rotulo}>
                        <a
                          href={l.href}
                          className="text-sm text-on-dark-muted transition-colors hover:text-cream"
                          {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {l.rotulo}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline-dark pt-6">
            <p className="text-xs text-on-dark-muted/70">{t.rodape.direitos}</p>
            <p className="text-xs text-on-dark-muted/70">{t.rodape.aviso}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
