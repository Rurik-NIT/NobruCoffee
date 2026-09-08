import * as React from 'react'
import { AlertTriangle, Lock, WifiOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />
}

/** Esqueleto de tabela: mesma altura de linha da tabela real, sem "salto". */
export function SkeletonTabela({ linhas = 6, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="divide-y divide-hairline" aria-busy>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: colunas }).map((__, j) => (
            <Skeleton key={j} className={j === 0 ? 'w-1/3' : 'w-full'} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="rounded-card border border-hairline bg-paper-raised p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Estado vazio.
 * Um estado vazio é um convite à ação, não um aviso — sempre com o próximo
 * passo à mão.
 */
export function EmptyState({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: React.ComponentType<{ className?: string }>
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icone ? (
        <div className="mb-4 flex size-14 items-center justify-center rounded-panel bg-paper-sunken text-body-subtle">
          <Icone className="size-6" />
        </div>
      ) : null}
      <p className="font-display text-base font-extrabold">{titulo}</p>
      {descricao ? <p className="mt-1 max-w-sm text-sm text-body-muted">{descricao}</p> : null}
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  )
}

export function ErrorState({
  titulo = 'Não foi possível carregar',
  descricao = 'Tente novamente. Se continuar, avise o suporte.',
  onRetry,
  className,
}: {
  titulo?: string
  descricao?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-panel bg-danger-soft text-danger">
        <AlertTriangle className="size-6" />
      </div>
      <p className="font-display text-base font-extrabold">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm text-body-muted">{descricao}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  )
}

/** Bloqueio por permissão — explica o que fazer, não só que negou. */
export function ForbiddenState({
  recurso = 'esta área',
  className,
}: {
  recurso?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-panel bg-paper-sunken text-body-subtle">
        <Lock className="size-6" />
      </div>
      <p className="font-display text-base font-extrabold">Seu cargo não abre {recurso}</p>
      <p className="mt-1 max-w-sm text-sm text-body-muted">
        Peça a um gerente para liberar a permissão em Equipe › Cargos.
      </p>
    </div>
  )
}

/** Aviso de conexão — o PDV mostra isto na barra superior. */
export function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 bg-caution-soft px-4 py-2 text-xs font-semibold text-caution">
      <WifiOff className="size-3.5" />
      Sem conexão. Você continua navegando, mas novas vendas só são gravadas quando a internet voltar.
    </div>
  )
}
