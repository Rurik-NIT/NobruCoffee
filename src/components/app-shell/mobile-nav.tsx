'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { ItemNav } from './navegacao'

/**
 * Barra inferior do mobile.
 *
 * Não é a sidebar encolhida: são só as quatro telas que alguém abre com o
 * celular na mão durante o turno. O resto vive no menu completo (hambúrguer),
 * porque cadastro e relatório ninguém faz em 375px.
 */
export function MobileNav({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname()
  if (itens.length === 0) return null

  return (
    <nav
      aria-label="Atalhos"
      className="sticky bottom-0 z-30 flex shrink-0 border-t border-hairline bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {itens.map((item) => {
        const ativo = item.prefixo ? pathname.startsWith(item.href) : pathname === item.href
        const Icone = item.icone
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors',
              ativo ? 'text-nobru-600' : 'text-body-subtle',
            )}
          >
            <Icone className="size-5" />
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
