'use client'

import * as React from 'react'
import { Download, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useOnline } from '@/hooks/use-online'

type EventoInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

/**
 * Registro do service worker e convite de instalação.
 *
 * O convite só aparece quando o navegador de fato oferece a instalação
 * (`beforeinstallprompt`) e some para sempre depois de dispensado — um banner
 * insistente numa tela de operação é ruído no meio do turno.
 */
export function RegistroPwa() {
  const [instalador, setInstalador] = React.useState<EventoInstalacao | null>(null)
  const [dispensado, setDispensado] = React.useState(true)
  const online = useOnline()

  React.useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
    setDispensado(localStorage.getItem('nobru:pwa-dispensado') === '1')

    function aoOferecer(e: Event) {
      e.preventDefault()
      setInstalador(e as EventoInstalacao)
    }
    window.addEventListener('beforeinstallprompt', aoOferecer)
    return () => window.removeEventListener('beforeinstallprompt', aoOferecer)
  }, [])

  return (
    <>
      {!online ? (
        <div className="sticky top-16 z-20 flex items-center justify-center gap-2 bg-caution-soft px-4 py-2 text-xs font-semibold text-caution">
          Sem conexão — novas vendas só são gravadas quando a internet voltar.
        </div>
      ) : null}

      {instalador && !dispensado ? (
        <div className="fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-card border border-hairline bg-paper-raised p-3 shadow-pop sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-sm lg:bottom-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-nobru-50 text-nobru-600">
            <Download className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-xs">
            <span className="block font-bold">Instalar no aparelho</span>
            <span className="block text-body-muted">Abre em tela cheia, como um aplicativo.</span>
          </p>
          <Button
            size="sm"
            onClick={async () => {
              await instalador.prompt()
              setInstalador(null)
            }}
          >
            Instalar
          </Button>
          <button
            type="button"
            aria-label="Dispensar"
            onClick={() => {
              localStorage.setItem('nobru:pwa-dispensado', '1')
              setDispensado(true)
            }}
            className="rounded-full p-1 text-body-subtle hover:bg-paper-sunken"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </>
  )
}
