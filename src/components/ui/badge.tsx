import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-hairline-strong bg-paper-sunken text-body-muted',
        brand: 'border-nobru-200 bg-nobru-50 text-nobru-700',
        leaf: 'border-leaf/25 bg-leaf-soft text-leaf',
        caution: 'border-caution/25 bg-caution-soft text-caution',
        danger: 'border-danger/25 bg-danger-soft text-danger',
        info: 'border-info/25 bg-info-soft text-info',
        dark: 'border-transparent bg-ink text-cream',
      },
      size: { sm: 'px-2 py-0 text-[10px]', md: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

/**
 * Carimbo — o sotaque visual do sistema.
 * Vem do vocabulário da própria loja: os posts de "SOLD OUT!" no Instagram.
 * Usado onde um estado precisa parecer batido à mão sobre o documento:
 * esgotado, cancelado, pago, entregue.
 */
export function Stamp({
  children,
  tone = 'brand',
  className,
}: {
  children: React.ReactNode
  tone?: 'brand' | 'leaf' | 'ink'
  className?: string
}) {
  return (
    <span className={cn('stamp', className)} data-tone={tone === 'brand' ? undefined : tone}>
      {children}
    </span>
  )
}

/** Ponto de status para listas densas (mesas, pedidos, caixas). */
export function StatusDot({
  tone = 'neutral',
  pulse = false,
  className,
}: {
  tone?: 'neutral' | 'leaf' | 'caution' | 'danger' | 'brand'
  pulse?: boolean
  className?: string
}) {
  const cores: Record<string, string> = {
    neutral: 'bg-body-subtle',
    leaf: 'bg-leaf',
    caution: 'bg-caution',
    danger: 'bg-danger',
    brand: 'bg-nobru-500',
  }
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)}>
      {pulse ? (
        <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', cores[tone])} aria-hidden />
      ) : null}
      <span className={cn('relative size-2 rounded-full', cores[tone])} />
    </span>
  )
}
