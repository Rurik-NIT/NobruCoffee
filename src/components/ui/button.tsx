'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold',
    'transition-[background-color,box-shadow,transform,color] duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:translate-y-px',
    '[&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-nobru-500 text-white shadow-raise hover:bg-nobru-600 active:bg-nobru-700',
        secondary:
          'bg-paper-raised text-body border border-hairline-strong shadow-raise hover:bg-paper-sunken hover:border-body-subtle',
        ghost: 'text-body-muted hover:bg-paper-sunken hover:text-body',
        dark: 'bg-ink text-cream shadow-raise hover:bg-ink-raised',
        danger: 'bg-danger text-white shadow-raise hover:brightness-95',
        leaf: 'bg-leaf text-white shadow-raise hover:brightness-95',
        link: 'text-nobru-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 rounded-[8px] px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 rounded-control px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 rounded-control px-6 text-base [&_svg]:size-[18px]',
        /** Alvo de toque do PDV: 56px, confortável em iPad com a loja cheia. */
        touch: 'h-14 rounded-card px-6 text-base [&_svg]:size-5',
        icon: 'size-10 rounded-control [&_svg]:size-4',
        'icon-sm': 'size-8 rounded-[8px] [&_svg]:size-3.5',
        'icon-touch': 'size-14 rounded-card [&_svg]:size-5',
      },
      full: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Mostra spinner e bloqueia cliques. Use com `useTransition`. */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
