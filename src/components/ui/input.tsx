'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

const base = [
  'w-full rounded-control border border-hairline-strong bg-paper-raised px-3 text-sm text-body',
  'placeholder:text-body-subtle',
  'transition-[border-color,box-shadow] duration-150',
  'hover:border-body-subtle',
  'focus:border-nobru-500 focus:outline-none focus:ring-2 focus:ring-nobru-500/20',
  'disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-body-subtle',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/15',
].join(' ')

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-10', className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(base, 'resize-y py-2 leading-relaxed', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

/** Input com ícone à esquerda. */
export function InputComIcone({
  icone: Icone,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icone: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-body-subtle" />
      <input className={cn(base, 'h-10 pl-9', className)} {...props} />
    </div>
  )
}

/**
 * Campo de busca com limpar. O debounce fica em quem usa (`useBuscaDebounce`),
 * porque a origem da busca varia: URL, estado local ou server action.
 */
export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Buscar…',
  className,
  autoFocus,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-body-subtle" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(base, 'h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-body-subtle hover:bg-paper-sunken hover:text-body"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Campo de dinheiro.
 * Digita-se em centavos, da direita para a esquerda — como numa maquininha.
 * Nunca deixa o operador em dúvida sobre onde está a vírgula.
 */
export function MoneyInput({
  value,
  onValueChange,
  className,
  id,
  placeholder = '0,00',
  disabled,
  autoFocus,
  onKeyDown,
  ...rest
}: {
  value: number
  onValueChange: (v: number) => void
  className?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onKeyDown'>) {
  const texto = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 11)
    onValueChange(digitos ? Number(digitos) / 100 : 0)
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-body-subtle">
        R$
      </span>
      <input
        id={id}
        inputMode="numeric"
        value={value === 0 ? '' : texto}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        data-numeric
        className={cn(base, 'h-10 pl-10 text-right font-semibold', className)}
        {...rest}
      />
    </div>
  )
}

/** Campo numérico de quantidade com sufixo de unidade. */
export function QuantityInput({
  value,
  onValueChange,
  unidade,
  step = 1,
  min = 0,
  className,
  id,
  disabled,
  autoFocus,
}: {
  value: number
  onValueChange: (v: number) => void
  unidade?: string
  step?: number
  min?: number
  className?: string
  id?: string
  disabled?: boolean
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        disabled={disabled}
        autoFocus={autoFocus}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onValueChange(e.target.value === '' ? 0 : Number(e.target.value))}
        data-numeric
        className={cn(
          base,
          'h-10 text-right font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
          unidade ? 'pr-12' : '',
          className,
        )}
      />
      {unidade ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-body-subtle uppercase">
          {unidade}
        </span>
      ) : null}
    </div>
  )
}

/** Stepper de toque para o PDV: −  qtd  + com alvos de 44px. */
export function QuantityStepper({
  value,
  onValueChange,
  min = 1,
  max = 999,
  className,
}: {
  value: number
  onValueChange: (v: number) => void
  min?: number
  max?: number
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center rounded-control border border-hairline-strong bg-paper-raised', className)}>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={value <= min}
        onClick={() => onValueChange(Math.max(min, value - 1))}
        className="flex size-11 items-center justify-center rounded-l-control text-lg font-bold text-body-muted hover:bg-paper-sunken disabled:opacity-40"
      >
        −
      </button>
      <span data-numeric className="min-w-10 text-center text-sm font-bold">
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={value >= max}
        onClick={() => onValueChange(Math.min(max, value + 1))}
        className="flex size-11 items-center justify-center rounded-r-control text-lg font-bold text-body-muted hover:bg-paper-sunken disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

/** Input de data nativo — em pt-BR o navegador já mostra dd/mm/aaaa. */
export const DateInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} type="date" className={cn(base, 'h-10 [&::-webkit-calendar-picker-indicator]:opacity-60', className)} {...props} />
  ),
)
DateInput.displayName = 'DateInput'

export const DateTimeInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="datetime-local"
      className={cn(base, 'h-10 [&::-webkit-calendar-picker-indicator]:opacity-60', className)}
      {...props}
    />
  ),
)
DateTimeInput.displayName = 'DateTimeInput'

export { base as inputBaseClass }
