'use client'

import * as React from 'react'
import { Banknote, CreditCard, Landmark, Plus, Trash2, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda } from '@/lib/format'
import { brl } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, MoneyInput } from '@/components/ui/input'
import type { FormaPdv } from './tipos'

type Linha = { id: string; formaPagamentoId: string; valor: number; valorRecebido: number }

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  DINHEIRO: Banknote,
  PIX: Landmark,
  DEBITO: CreditCard,
  CREDITO: CreditCard,
  VOUCHER: Wallet,
  FIADO: Wallet,
  OUTRO: Wallet,
}

/**
 * Fechamento do pagamento.
 *
 * O caminho comum — uma forma, valor exato — resolve em dois toques: escolher a
 * forma e confirmar. Dividir em várias formas é possível, mas fica atrás de um
 * botão, porque é a exceção.
 *
 * Em dinheiro, o campo "recebido" calcula o troco na hora: é o número que o
 * operador precisa ler em voz alta enquanto abre a gaveta.
 */
export function DialogoPagamento({
  aberto,
  onAbertoChange,
  total,
  formas,
  cliente,
  valorPorPonto,
  pendente,
  onConfirmar,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  total: number
  formas: FormaPdv[]
  cliente: { id: string; nome: string; pontos: number } | null
  valorPorPonto: number
  pendente: boolean
  onConfirmar: (
    pagamentos: Array<{ formaPagamentoId: string; valor: number; valorRecebido?: number }>,
    pontosResgatar: number,
  ) => void | Promise<void>
}) {
  const [linhas, setLinhas] = React.useState<Linha[]>([])
  const [dividir, setDividir] = React.useState(false)
  const [pontos, setPontos] = React.useState(0)

  const descontoPontos = brl(pontos * valorPorPonto)
  const totalCobrar = brl(Math.max(0, total - descontoPontos))

  // Ao abrir, começa limpo com a primeira forma preenchida com o total.
  React.useEffect(() => {
    if (!aberto) return
    setDividir(false)
    setPontos(0)
    setLinhas([])
  }, [aberto])

  const somaPago = brl(linhas.reduce((acc, l) => acc + l.valor, 0))
  const restante = brl(totalCobrar - somaPago)
  const troco = brl(
    linhas.reduce((acc, l) => {
      const forma = formas.find((f) => f.id === l.formaPagamentoId)
      if (!forma?.permiteTroco || l.valorRecebido <= 0) return acc
      return acc + Math.max(0, l.valorRecebido - l.valor)
    }, 0),
  )

  function escolherForma(forma: FormaPdv) {
    if (!dividir) {
      setLinhas([{ id: crypto.randomUUID(), formaPagamentoId: forma.id, valor: totalCobrar, valorRecebido: 0 }])
      return
    }
    setLinhas((atual) => [
      ...atual,
      { id: crypto.randomUUID(), formaPagamentoId: forma.id, valor: Math.max(0, restante), valorRecebido: 0 },
    ])
  }

  const pronto = linhas.length > 0 && Math.abs(restante) < 0.005 && !pendente
  const maxPontos = cliente ? Math.min(cliente.pontos, Math.floor(total / Math.max(valorPorPonto, 0.0001))) : 0

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent largura="md">
        <DialogHeader>
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Total */}
          <div className="chalkboard rounded-card px-5 py-4 text-center">
            <p className="text-[11px] font-bold tracking-[0.16em] text-on-dark-muted uppercase">Total a cobrar</p>
            <p className="mt-1 font-display text-4xl font-black text-cream" data-numeric>
              {moeda(totalCobrar)}
            </p>
            {descontoPontos > 0 ? (
              <p className="mt-1 text-xs text-amber-nobru" data-numeric>
                {pontos} pontos resgatados · −{moeda(descontoPontos)}
              </p>
            ) : null}
          </div>

          {/* Fidelidade */}
          {cliente && maxPontos > 0 ? (
            <div className="rounded-control border border-hairline bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{cliente.nome}</p>
                  <p className="text-xs text-body-muted" data-numeric>
                    {cliente.pontos} pontos · 1 ponto = {moeda(valorPorPonto)}
                  </p>
                </div>
                <Badge tone="brand">Fidelidade</Badge>
              </div>
              <div className="mt-2.5 flex items-end gap-2">
                <Field label="Resgatar pontos" htmlFor="pontos" className="flex-1">
                  <Input
                    id="pontos"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={maxPontos}
                    value={pontos || ''}
                    onChange={(e) => setPontos(Math.min(maxPontos, Math.max(0, Number(e.target.value))))}
                    className="text-right font-semibold"
                  />
                </Field>
                <Button variant="secondary" onClick={() => setPontos(maxPontos)}>
                  Usar {maxPontos}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Formas */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">Forma de pagamento</p>
              <button
                type="button"
                onClick={() => {
                  setDividir((v) => !v)
                  setLinhas([])
                }}
                className="text-xs font-semibold text-nobru-600 hover:underline"
              >
                {dividir ? 'Pagamento único' : 'Dividir pagamento'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {formas.map((f) => {
                const Icone = ICONES[f.tipo] ?? Wallet
                const usada = linhas.some((l) => l.formaPagamentoId === f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => escolherForma(f)}
                    disabled={!dividir && usada}
                    className={cn(
                      'flex h-16 flex-col items-center justify-center gap-1 rounded-control border-2 text-sm font-bold transition-colors',
                      usada
                        ? 'border-nobru-500 bg-nobru-50 text-nobru-700'
                        : 'border-hairline-strong bg-paper-raised text-body hover:border-body-subtle',
                    )}
                  >
                    <Icone className="size-4" />
                    {f.nome}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Linhas de pagamento */}
          {linhas.length > 0 ? (
            <ul className="space-y-3">
              {linhas.map((linha) => {
                const forma = formas.find((f) => f.id === linha.formaPagamentoId)!
                const trocoLinha = forma.permiteTroco ? brl(Math.max(0, linha.valorRecebido - linha.valor)) : 0
                return (
                  <li key={linha.id} className="rounded-control border border-hairline bg-paper p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{forma.nome}</span>
                      {dividir ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          aria-label={`Remover ${forma.nome}`}
                          onClick={() => setLinhas((atual) => atual.filter((l) => l.id !== linha.id))}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Field label="Valor" htmlFor={`valor-${linha.id}`}>
                        <MoneyInput
                          id={`valor-${linha.id}`}
                          value={linha.valor}
                          onValueChange={(v) =>
                            setLinhas((atual) => atual.map((l) => (l.id === linha.id ? { ...l, valor: v } : l)))
                          }
                        />
                      </Field>
                      {forma.permiteTroco ? (
                        <Field label="Recebido em dinheiro" htmlFor={`receb-${linha.id}`}>
                          <MoneyInput
                            id={`receb-${linha.id}`}
                            value={linha.valorRecebido}
                            onValueChange={(v) =>
                              setLinhas((atual) => atual.map((l) => (l.id === linha.id ? { ...l, valorRecebido: v } : l)))
                            }
                          />
                        </Field>
                      ) : null}
                    </div>
                    {forma.permiteTroco ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {[20, 50, 100, 200].map((cedula) => (
                          <Button
                            key={cedula}
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setLinhas((atual) => atual.map((l) => (l.id === linha.id ? { ...l, valorRecebido: cedula } : l)))
                            }
                          >
                            {moeda(cedula)}
                          </Button>
                        ))}
                        {trocoLinha > 0 ? (
                          <span className="ml-auto text-sm font-bold text-leaf" data-numeric>
                            Troco {moeda(trocoLinha)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {forma.taxaPercentual > 0 ? (
                      <p className="mt-1.5 text-[11px] text-body-subtle">
                        Taxa da adquirente: {forma.taxaPercentual}% ({moeda(brl((linha.valor * forma.taxaPercentual) / 100))})
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-body-muted">Escolha a forma de pagamento para continuar.</p>
          )}

          {/* Conferência */}
          {linhas.length > 0 ? (
            <div className="space-y-1 rounded-control bg-paper-sunken px-3 py-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-body-muted">Informado</span>
                <span data-numeric>{moeda(somaPago)}</span>
              </div>
              <div className={cn('flex justify-between font-bold', Math.abs(restante) < 0.005 ? 'text-leaf' : 'text-danger')}>
                <span>{restante > 0 ? 'Falta' : restante < 0 ? 'Excedente' : 'Fechado'}</span>
                <span data-numeric>{moeda(Math.abs(restante))}</span>
              </div>
              {troco > 0 ? (
                <div className="flex justify-between border-t border-dashed border-hairline-strong pt-1.5 text-sm font-bold">
                  <span className="font-sans">Troco</span>
                  <span data-numeric>{moeda(troco)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onAbertoChange(false)} disabled={pendente}>
            Voltar
          </Button>
          {dividir && restante > 0.005 ? (
            <Badge tone="caution" className="self-center">
              <Plus className="size-3" />
              Falta {moeda(restante)}
            </Badge>
          ) : null}
          <Button
            size="lg"
            loading={pendente}
            disabled={!pronto}
            onClick={() =>
              onConfirmar(
                linhas.map((l) => {
                  const forma = formas.find((f) => f.id === l.formaPagamentoId)!
                  return {
                    formaPagamentoId: l.formaPagamentoId,
                    valor: l.valor,
                    valorRecebido: forma.permiteTroco && l.valorRecebido > 0 ? l.valorRecebido : undefined,
                  }
                }),
                pontos,
              )
            }
          >
            Confirmar venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
