import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Tabelas do sistema.
 *
 * Duas regras que valem em todas as telas:
 *  1. Conteúdo largo rola dentro do próprio container (`TableWrap`), nunca no
 *     body da página.
 *  2. Colunas de dinheiro e quantidade recebem `numerico` — alinhamento à
 *     direita e algarismos tabulares, para a coluna "bater" na leitura.
 */
export function TableWrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('w-full overflow-x-auto overscroll-x-contain', className)}>
      <div className="min-w-full align-middle">{children}</div>
    </div>
  )
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-hairline bg-paper-sunken/60', className)} {...props} />
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-hairline', className)} {...props} />
}

export function TFoot({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn('border-t-2 border-hairline-strong bg-paper-sunken/60 font-semibold', className)} {...props} />
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-paper-sunken/40', className)} {...props} />
}

export function TH({
  className,
  numerico,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-2xs font-bold tracking-wider text-body-subtle uppercase whitespace-nowrap',
        numerico ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  )
}

export function TD({
  className,
  numerico,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numerico?: boolean }) {
  return (
    <td
      data-numeric={numerico ? '' : undefined}
      className={cn('px-4 py-3 align-middle', numerico ? 'text-right font-medium' : 'text-left', className)}
      {...props}
    />
  )
}

/** Linha de estado vazio dentro da tabela, com colspan correto. */
export function TREmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-0">
        {children}
      </td>
    </tr>
  )
}

/** Célula de duas linhas: título forte + apoio discreto. */
export function CellStack({
  principal,
  apoio,
  className,
}: {
  principal: React.ReactNode
  apoio?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="truncate font-semibold">{principal}</div>
      {apoio ? <div className="truncate text-xs text-body-muted">{apoio}</div> : null}
    </div>
  )
}

/** Código de documento — sempre em mono, como no papel da comanda. */
export function CodigoDoc({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-xs font-semibold tracking-tight text-body-muted', className)}>{children}</span>
}
