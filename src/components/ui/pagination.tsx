'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { numero } from '@/lib/format'
import { Button } from './button'

/**
 * Paginação por offset. Mostra a faixa de registros ("21–40 de 137") porque em
 * operação o número absoluto é mais útil que a página: o gerente procura "o
 * pedido de ontem à tarde", não "a página 3".
 */
export function Pagination({
  pagina,
  porPagina,
  total,
  onPaginaChange,
  className,
}: {
  pagina: number
  porPagina: number
  total: number
  onPaginaChange: (p: number) => void
  className?: string
}) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  if (total === 0) return null
  const de = (pagina - 1) * porPagina + 1
  const ate = Math.min(pagina * porPagina, total)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3', className)}>
      <p className="text-xs text-body-muted">
        <span className="font-semibold text-body" data-numeric>
          {numero(de)}–{numero(ate)}
        </span>{' '}
        de <span data-numeric>{numero(total)}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="px-2 text-xs font-semibold text-body-muted" data-numeric>
          {pagina} / {totalPaginas}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Próxima página"
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
