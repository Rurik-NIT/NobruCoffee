'use client'

import { Toaster as Sonner, toast } from 'sonner'

/**
 * Avisos do sistema.
 * O texto do toast usa o mesmo verbo do botão que o disparou: "Salvar" produz
 * "Produto salvo", "Finalizar" produz "Venda finalizada".
 */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-card border border-hairline bg-paper-raised text-body shadow-pop font-sans text-sm px-4 py-3',
          title: 'font-semibold',
          description: 'text-body-muted text-xs',
          actionButton: 'bg-nobru-500 text-white rounded-[8px] px-2.5 py-1 text-xs font-semibold',
          cancelButton: 'text-body-muted text-xs',
          success: 'border-leaf/30',
          error: 'border-danger/40',
          warning: 'border-caution/40',
        },
      }}
    />
  )
}

export { toast }
