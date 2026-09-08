'use client'

import * as React from 'react'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import { cn } from '@/lib/utils'

export type OpcaoCombo = {
  valor: string
  rotulo: string
  apoio?: string
  /** Texto adicional considerado na busca (SKU, telefone). */
  busca?: string
  desabilitado?: boolean
}

/**
 * Combobox com busca.
 *
 * Onde o operador escolhe entre dezenas ou centenas de registros — cliente,
 * insumo, produto — um select nativo não serve: a busca precisa casar por nome,
 * SKU e telefone ao mesmo tempo.
 */
export function Combobox({
  value,
  onValueChange,
  opcoes,
  placeholder = 'Selecione…',
  buscaPlaceholder = 'Buscar…',
  vazioTexto = 'Nada encontrado.',
  id,
  disabled,
  className,
  permiteLimpar = false,
}: {
  value: string | null | undefined
  onValueChange: (v: string | null) => void
  opcoes: OpcaoCombo[]
  placeholder?: string
  buscaPlaceholder?: string
  vazioTexto?: string
  id?: string
  disabled?: boolean
  className?: string
  permiteLimpar?: boolean
}) {
  const [aberto, setAberto] = React.useState(false)
  const idLista = React.useId()
  const selecionada = opcoes.find((o) => o.valor === value)

  return (
    <PopoverPrimitive.Root open={aberto} onOpenChange={setAberto}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={aberto}
          aria-controls={idLista}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-control border border-hairline-strong bg-paper-raised px-3 text-sm',
            'hover:border-body-subtle focus:border-nobru-500 focus:ring-2 focus:ring-nobru-500/20 focus:outline-none',
            'disabled:cursor-not-allowed disabled:bg-paper-sunken',
            'aria-[invalid=true]:border-danger',
            className,
          )}
        >
          <span className={cn('truncate text-left', !selecionada && 'text-body-subtle')}>
            {selecionada ? selecionada.rotulo : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-body-subtle" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden rounded-card border border-hairline bg-paper-raised shadow-pop data-[state=open]:animate-fade"
        >
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-hairline px-3">
              <Search className="size-4 shrink-0 text-body-subtle" />
              <Command.Input
                placeholder={buscaPlaceholder}
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-body-subtle"
              />
            </div>
            <Command.List id={idLista} className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-body-muted">{vazioTexto}</Command.Empty>
              {permiteLimpar && value ? (
                <Command.Item
                  value="__limpar__"
                  onSelect={() => {
                    onValueChange(null)
                    setAberto(false)
                  }}
                  className="cursor-pointer rounded-[8px] px-3 py-2 text-sm text-body-muted data-[selected=true]:bg-paper-sunken"
                >
                  Limpar seleção
                </Command.Item>
              ) : null}
              {opcoes.map((o) => (
                <Command.Item
                  key={o.valor}
                  value={`${o.rotulo} ${o.apoio ?? ''} ${o.busca ?? ''}`}
                  disabled={o.desabilitado}
                  onSelect={() => {
                    onValueChange(o.valor)
                    setAberto(false)
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-sm',
                    'data-[selected=true]:bg-paper-sunken data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
                  )}
                >
                  <Check className={cn('size-3.5 shrink-0 text-nobru-500', o.valor === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.rotulo}</span>
                    {o.apoio ? <span className="block truncate text-xs text-body-muted">{o.apoio}</span> : null}
                  </span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-card border border-hairline bg-paper-raised p-4 shadow-pop data-[state=open]:animate-fade',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
