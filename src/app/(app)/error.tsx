'use client'

import { ErrorState } from '@/components/ui/states'

/**
 * Fronteira de erro do sistema.
 * Mostra mensagem útil e um botão que refaz a renderização — nunca a stack.
 */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-card border border-hairline bg-paper-raised">
      <ErrorState
        titulo="Não conseguimos carregar esta tela"
        descricao="Pode ter sido uma queda momentânea de conexão com o banco. Tente de novo — se continuar, avise o suporte."
        onRetry={reset}
      />
    </div>
  )
}
