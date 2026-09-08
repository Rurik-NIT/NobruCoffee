'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-[18px] shrink-0 rounded-[5px] border-2 border-hairline-strong bg-paper-raised',
      'hover:border-body-subtle focus-visible:ring-2 focus-visible:ring-nobru-500/25',
      'data-[state=checked]:border-nobru-500 data-[state=checked]:bg-nobru-500',
      'data-[state=indeterminate]:border-nobru-500 data-[state=indeterminate]:bg-nobru-500',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
      {props.checked === 'indeterminate' ? <Minus className="size-3" strokeWidth={3.5} /> : <Check className="size-3" strokeWidth={3.5} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

/** Checkbox com rótulo clicável — o padrão em formulários e filtros. */
export function CheckboxCampo({
  id,
  checked,
  onCheckedChange,
  label,
  descricao,
  disabled,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: React.ReactNode
  descricao?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} disabled={disabled} className="mt-0.5" />
      <label htmlFor={id} className={cn('cursor-pointer select-none', disabled && 'opacity-60')}>
        <span className="block text-sm font-medium">{label}</span>
        {descricao ? <span className="block text-xs text-body-muted">{descricao}</span> : null}
      </label>
    </div>
  )
}

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      'focus-visible:ring-2 focus-visible:ring-nobru-500/25',
      'data-[state=checked]:bg-leaf data-[state=unchecked]:bg-hairline-strong',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-raise transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

/** Linha de configuração: rótulo + descrição à esquerda, switch à direita. */
export function SwitchLinha({
  id,
  checked,
  onCheckedChange,
  label,
  descricao,
  disabled,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label: React.ReactNode
  descricao?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {descricao ? <span className="mt-0.5 block text-xs text-body-muted">{descricao}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

export const RadioGroup = RadioGroupPrimitive.Root

export const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'size-[18px] shrink-0 rounded-full border-2 border-hairline-strong bg-paper-raised',
      'focus-visible:ring-2 focus-visible:ring-nobru-500/25 data-[state=checked]:border-nobru-500',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex size-full items-center justify-center">
      <span className="size-2 rounded-full bg-nobru-500" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = 'RadioGroupItem'

/**
 * Grupo de escolha em "cartões" — usado para tipo de pedido no PDV e tipo de
 * entrega em encomendas, onde a opção precisa ser um alvo grande de toque.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  opcoes,
  className,
  tamanho = 'md',
}: {
  value: T
  onValueChange: (v: T) => void
  opcoes: Array<{ valor: T; rotulo: string; icone?: React.ComponentType<{ className?: string }> }>
  className?: string
  tamanho?: 'md' | 'touch'
}) {
  return (
    <div
      role="radiogroup"
      className={cn('inline-flex w-full gap-1 rounded-control bg-paper-sunken p-1', className)}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === value
        const Icone = o.icone
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onValueChange(o.valor)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-[8px] font-semibold transition-colors',
              tamanho === 'touch' ? 'h-11 text-sm' : 'h-8 text-xs',
              ativo ? 'bg-paper-raised text-body shadow-raise' : 'text-body-muted hover:text-body',
            )}
          >
            {Icone ? <Icone className={tamanho === 'touch' ? 'size-4' : 'size-3.5'} /> : null}
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
