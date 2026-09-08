'use client'

import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from './button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Input } from './input'
import { Label } from './field'

/**
 * Confirmação de ação irreversível.
 *
 * Para operações que mexem em dinheiro (cancelar venda, estornar, ajustar
 * estoque) o diálogo pede um motivo — o texto vai para o log de auditoria, que
 * é o que permite explicar a diferença no fechamento do caixa depois.
 */
export function ConfirmDialog({
  aberto,
  onAbertoChange,
  titulo,
  descricao,
  confirmarTexto = 'Confirmar',
  cancelarTexto = 'Voltar',
  destrutivo = false,
  pedirMotivo = false,
  motivoLabel = 'Motivo',
  motivoPlaceholder = 'Ex.: cliente desistiu do pedido',
  pendente = false,
  onConfirmar,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  titulo: string
  descricao?: React.ReactNode
  confirmarTexto?: string
  cancelarTexto?: string
  destrutivo?: boolean
  pedirMotivo?: boolean
  motivoLabel?: string
  motivoPlaceholder?: string
  pendente?: boolean
  onConfirmar: (motivo?: string) => unknown
}) {
  const [motivo, setMotivo] = React.useState('')

  React.useEffect(() => {
    if (aberto) setMotivo('')
  }, [aberto])

  const motivoInvalido = pedirMotivo && motivo.trim().length < 3

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent largura="sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {destrutivo ? (
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle className="size-4" />
              </span>
            ) : null}
            <div>
              <DialogTitle>{titulo}</DialogTitle>
              {descricao ? <DialogDescription className="mt-1">{descricao}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>
        {pedirMotivo ? (
          <DialogBody className="space-y-1.5">
            <Label htmlFor="confirm-motivo" obrigatorio>
              {motivoLabel}
            </Label>
            <Input
              id="confirm-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={motivoPlaceholder}
              autoFocus
            />
            <p className="text-xs text-body-subtle">Fica registrado no log de auditoria com o seu nome.</p>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onAbertoChange(false)} disabled={pendente}>
            {cancelarTexto}
          </Button>
          <Button
            variant={destrutivo ? 'danger' : 'primary'}
            loading={pendente}
            disabled={motivoInvalido}
            onClick={() => onConfirmar(pedirMotivo ? motivo.trim() : undefined)}
          >
            {confirmarTexto}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Hook para abrir a confirmação de forma imperativa dentro de uma lista. */
export function useConfirmacao() {
  const [aberto, setAberto] = React.useState(false)
  const alvo = React.useRef<string | null>(null)
  return {
    aberto,
    setAberto,
    alvo: alvo.current,
    abrir(id: string) {
      alvo.current = id
      setAberto(true)
    },
    fechar() {
      setAberto(false)
      alvo.current = null
    },
  }
}
