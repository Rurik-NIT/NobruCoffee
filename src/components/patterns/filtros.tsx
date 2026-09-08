'use client'

import * as React from 'react'
import { Filter, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { SelectSimples } from '@/components/ui/select'
import { DateInput } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { useFiltrosUrl } from '@/hooks/use-filtros-url'

/**
 * Barra de filtros ligada à URL.
 *
 * Filtro na URL, não em estado local: o gerente compartilha "vendas de setembro
 * no PIX" por link, o botão voltar funciona, e a consulta continua acontecendo
 * no servidor — a página segue Server Component.
 */
export function FiltrosLista({
  buscaPlaceholder = 'Buscar…',
  selects = [],
  datas = false,
  children,
  className,
}: {
  buscaPlaceholder?: string
  selects?: Array<{
    chave: string
    rotulo: string
    opcoes: Array<{ valor: string; rotulo: string }>
    larguraClasse?: string
  }>
  datas?: boolean
  children?: React.ReactNode
  className?: string
}) {
  const { aplicar, ler, limpar, params } = useFiltrosUrl()
  const [busca, setBusca] = React.useState(ler('busca'))
  const buscaDebounced = useDebounce(busca, 350)
  const primeiraRenderizacao = React.useRef(true)

  React.useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    aplicar({ busca: buscaDebounced || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDebounced])

  const temFiltro = [...params.keys()].some((k) => k !== 'pagina')

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-paper-raised p-2.5 shadow-raise',
        className,
      )}
    >
      <div className="min-w-48 flex-1">
        <SearchInput value={busca} onValueChange={setBusca} placeholder={buscaPlaceholder} />
      </div>

      {selects.map((s) => (
        <div key={s.chave} className={s.larguraClasse ?? 'w-44'}>
          <SelectSimples
            value={ler(s.chave, 'todos')}
            onValueChange={(v) => aplicar({ [s.chave]: v })}
            opcoes={[{ valor: 'todos', rotulo: s.rotulo }, ...s.opcoes]}
          />
        </div>
      ))}

      {datas ? (
        <div className="flex items-center gap-1.5">
          <DateInput
            aria-label="Data inicial"
            value={ler('de')}
            onChange={(e) => aplicar({ de: e.target.value })}
            className="w-36"
          />
          <span className="text-xs text-body-subtle">até</span>
          <DateInput
            aria-label="Data final"
            value={ler('ate')}
            onChange={(e) => aplicar({ ate: e.target.value })}
            className="w-36"
          />
        </div>
      ) : null}

      {children}

      {temFiltro ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setBusca('')
            limpar()
          }}
        >
          <X className="size-3.5" />
          Limpar
        </Button>
      ) : (
        <span className="hidden items-center gap-1 px-1 text-xs text-body-subtle sm:flex">
          <Filter className="size-3.5" />
          Filtros
        </span>
      )}
    </div>
  )
}

/** Paginação ligada à URL — usada no rodapé das listas. */
export function PaginacaoUrl({
  pagina,
  porPagina,
  total,
}: {
  pagina: number
  porPagina: number
  total: number
}) {
  const { aplicar } = useFiltrosUrl()
  return (
    <Pagination
      pagina={pagina}
      porPagina={porPagina}
      total={total}
      onPaginaChange={(p) => aplicar({ pagina: p }, { resetarPagina: false })}
    />
  )
}
