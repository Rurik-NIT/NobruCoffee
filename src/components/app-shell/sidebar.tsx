'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { MarcaNobru, SeloNobru } from './marca'
import type { GrupoNav } from './navegacao'

/**
 * Sidebar escura.
 *
 * O chrome do sistema é preto fosco porque é a cor da loja: uniformes, fachada,
 * lousa de menu. Deixa o conteúdo — papel creme — brilhar, e à noite, com a luz
 * baixa do salão, não ofusca quem está no balcão.
 *
 * Recolhida, a sidebar vira uma coluna de ícones de 68px: em telas de 1280px o
 * PDV e as tabelas de estoque ganham espaço real.
 */
export function Sidebar({ grupos, nomeLoja }: { grupos: GrupoNav[]; nomeLoja: string }) {
  const pathname = usePathname()
  const [recolhida, setRecolhida] = React.useState(false)

  React.useEffect(() => {
    setRecolhida(localStorage.getItem('nobru:sidebar') === 'recolhida')
  }, [])

  function alternar() {
    setRecolhida((v) => {
      const proximo = !v
      localStorage.setItem('nobru:sidebar', proximo ? 'recolhida' : 'aberta')
      return proximo
    })
  }

  return (
    <aside
      className={cn(
        'chalkboard sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-hairline-dark lg:flex',
        recolhida ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      <div className={cn('flex h-16 shrink-0 items-center border-b border-hairline-dark', recolhida ? 'justify-center px-2' : 'px-4')}>
        {recolhida ? (
          <Link href="/dashboard" aria-label="Painel do dia">
            <SeloNobru tamanho={36} />
          </Link>
        ) : (
          <Link href="/dashboard" className="min-w-0">
            <MarcaNobru subtitulo={nomeLoja} />
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3" aria-label="Navegação principal">
        {grupos.map((grupo, gi) => (
          <div key={grupo.titulo ?? `grupo-${gi}`} className={gi > 0 ? 'mt-4' : ''}>
            {grupo.titulo && !recolhida ? (
              <p className="px-3 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-on-dark-muted/70 uppercase">
                {grupo.titulo}
              </p>
            ) : null}
            {grupo.titulo && recolhida && gi > 0 ? <div className="mx-3 mb-2 h-px bg-hairline-dark" /> : null}
            <ul className="space-y-0.5">
              {grupo.itens.map((item) => {
                const ativo = item.prefixo ? pathname.startsWith(item.href) : pathname === item.href
                const Icone = item.icone
                const conteudo = (
                  <Link
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors',
                      recolhida && 'justify-center px-0',
                      ativo
                        ? 'bg-nobru-500 text-white shadow-raise'
                        : 'text-on-dark-muted hover:bg-ink-raised hover:text-cream',
                    )}
                  >
                    <Icone className="size-[18px] shrink-0" />
                    {!recolhida ? <span className="truncate">{item.rotulo}</span> : null}
                  </Link>
                )
                return (
                  <li key={item.href}>
                    {recolhida ? (
                      <Tooltip texto={item.rotulo} side="right">
                        {conteudo}
                      </Tooltip>
                    ) : (
                      conteudo
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-hairline-dark p-2">
        <button
          type="button"
          onClick={alternar}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-xs font-semibold text-on-dark-muted transition-colors hover:bg-ink-raised hover:text-cream',
            recolhida && 'justify-center px-0',
          )}
        >
          {recolhida ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!recolhida ? 'Recolher menu' : null}
          <span className="sr-only">{recolhida ? 'Expandir menu' : 'Recolher menu'}</span>
        </button>
      </div>
    </aside>
  )
}
