'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Label({
  className,
  obrigatorio,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { obrigatorio?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn('text-xs font-bold tracking-wide text-body-muted uppercase', className)}
      {...props}
    >
      {props.children}
      {obrigatorio ? (
        <span className="ml-0.5 text-nobru-500" aria-hidden>
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  )
}

/**
 * Envelope de campo: rótulo, controle, dica e erro.
 * Usar sempre este componente garante que o erro fique visível, associado ao
 * input via aria-describedby, e com o mesmo espaçamento em todo o sistema.
 */
export function Field({
  label,
  htmlFor,
  erro,
  dica,
  obrigatorio,
  className,
  children,
}: {
  label?: React.ReactNode
  htmlFor?: string
  erro?: string
  dica?: React.ReactNode
  obrigatorio?: boolean
  className?: string
  children: React.ReactNode
}) {
  const idErro = htmlFor ? `${htmlFor}-erro` : undefined
  const idDica = htmlFor ? `${htmlFor}-dica` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <Label htmlFor={htmlFor} obrigatorio={obrigatorio}>
          {label}
        </Label>
      ) : null}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            'aria-invalid': erro ? true : undefined,
            'aria-describedby': [erro ? idErro : null, dica ? idDica : null].filter(Boolean).join(' ') || undefined,
          })
        : children}
      {dica && !erro ? (
        <p id={idDica} className="text-xs text-body-subtle">
          {dica}
        </p>
      ) : null}
      {erro ? (
        <p id={idErro} className="flex items-center gap-1 text-xs font-semibold text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {erro}
        </p>
      ) : null}
    </div>
  )
}

/** Linha de campos que empilha no mobile. */
export function FieldRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>
}

/** Bloco de formulário com título — separa seções longas de cadastro. */
export function FieldSection({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h4 className="eyebrow">{titulo}</h4>
        {descricao ? <p className="mt-1 text-sm text-body-muted">{descricao}</p> : null}
      </div>
      {children}
    </section>
  )
}
