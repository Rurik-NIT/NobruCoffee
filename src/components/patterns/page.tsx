import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Cabeçalho de página.
 * Título curto à esquerda, ações à direita, e — quando a tela é um detalhe —
 * um "voltar" explícito, porque em tablet ninguém confia no gesto do navegador
 * no meio de um atendimento.
 */
export function PageHeader({
  titulo,
  descricao,
  voltar,
  acoes,
  children,
  className,
}: {
  titulo: string
  descricao?: React.ReactNode
  voltar?: { href: string; rotulo: string }
  acoes?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-5', className)}>
      {voltar ? (
        <Link
          href={voltar.href}
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-body-muted transition-colors hover:text-body"
        >
          <ChevronLeft className="size-3.5" />
          {voltar.rotulo}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{titulo}</h2>
          {descricao ? <p className="mt-1 max-w-2xl text-sm text-body-muted">{descricao}</p> : null}
        </div>
        {acoes ? <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
      {children}
    </header>
  )
}

/** Faixa de filtros acima da lista — sempre uma linha só, rolando no mobile. */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-paper-raised p-2.5 shadow-raise',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Painel branco que embrulha uma tabela: borda, sombra e cantos consistentes. */
export function Panel({
  children,
  className,
  titulo,
  descricao,
  acao,
}: {
  children: React.ReactNode
  className?: string
  titulo?: React.ReactNode
  descricao?: React.ReactNode
  acao?: React.ReactNode
}) {
  return (
    <section className={cn('overflow-hidden rounded-card border border-hairline bg-paper-raised shadow-card', className)}>
      {titulo ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold tracking-tight">{titulo}</h3>
            {descricao ? <p className="mt-0.5 text-xs text-body-muted">{descricao}</p> : null}
          </div>
          {acao ? <div className="shrink-0">{acao}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** Grade de KPIs: 1 coluna no celular, 2 no tablet, 4 no desktop. */
export function KpiGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
}

/** Par rótulo/valor para painéis de detalhe. */
export function DefRow({
  rotulo,
  children,
  className,
}: {
  rotulo: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2', className)}>
      <dt className="text-xs font-semibold text-body-muted">{rotulo}</dt>
      <dd className="text-sm font-semibold" data-numeric>
        {children}
      </dd>
    </div>
  )
}

/** Linha de total, com peso maior e régua acima. */
export function TotalRow({
  rotulo,
  children,
  destaque = false,
}: {
  rotulo: string
  children: React.ReactNode
  destaque?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 border-t border-hairline pt-2.5',
        destaque && 'border-t-2 border-hairline-strong',
      )}
    >
      <span className={cn('font-semibold', destaque ? 'text-sm' : 'text-xs text-body-muted')}>{rotulo}</span>
      <span
        className={cn('font-display font-extrabold', destaque ? 'text-lg' : 'text-sm')}
        data-numeric
      >
        {children}
      </span>
    </div>
  )
}
