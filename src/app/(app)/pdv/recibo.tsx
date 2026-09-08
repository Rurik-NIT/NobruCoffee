'use client'

import { Check, Printer } from 'lucide-react'

import { dataHora, moeda, numero } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CirculoNobru } from '@/components/app-shell/marca'

export type DadosRecibo = {
  codigo: string
  total: number
  troco: number
  pontosGerados: number
  cliente: string | null
  itens: Array<{ nome: string; quantidade: number; total: number }>
  caixa: string
  emitidoEm: string
}

/**
 * Comanda de venda.
 *
 * Renderizada como papel de verdade: mono, 80mm de largura, borda serrilhada e
 * o ⭕️ da casa no topo. `window.print()` com o CSS de impressão do design
 * system manda direto para a impressora térmica.
 *
 * Sem integração fiscal: este é o comprovante da loja, não um documento fiscal.
 * Ver docs/ARQUITETURA.md § Fiscal.
 */
export function Recibo({ dados, onFechar }: { dados: DadosRecibo; onFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm" className="bg-paper">
        <div className="px-6 pt-8 pb-4 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-leaf-soft text-leaf">
            <Check className="size-6" strokeWidth={3} />
          </span>
          <p className="font-display text-xl font-extrabold">Venda registrada</p>
          {dados.troco > 0 ? (
            <p className="mt-2 inline-block rounded-control bg-caution-soft px-3 py-1.5 font-display text-lg font-extrabold text-caution" data-numeric>
              Troco {moeda(dados.troco)}
            </p>
          ) : null}
        </div>

        {/* Comanda */}
        <div className="mx-6 mb-2">
          <div className="ticket rounded-t-card px-4 py-4 font-mono text-[11px] leading-relaxed">
            <div className="text-center">
              <CirculoNobru className="mb-1" />
              <p className="font-display text-sm font-black tracking-tight">NOBRU COFFEE E DONUTS</p>
              <p className="text-body-muted">Av. São João, 390 — Jd. Esplanada</p>
              <p className="text-body-muted">São José dos Campos · SP</p>
            </div>

            <div className="my-3 border-t border-dashed border-hairline-strong" />

            <div className="flex justify-between">
              <span>Pedido</span>
              <span className="font-bold">{dados.codigo}</span>
            </div>
            <div className="flex justify-between">
              <span>Caixa</span>
              <span>{dados.caixa}</span>
            </div>
            <div className="flex justify-between">
              <span>Data</span>
              <span>{dataHora(dados.emitidoEm)}</span>
            </div>
            {dados.cliente ? (
              <div className="flex justify-between">
                <span>Cliente</span>
                <span className="max-w-[60%] truncate text-right">{dados.cliente}</span>
              </div>
            ) : null}

            <div className="my-3 border-t border-dashed border-hairline-strong" />

            <ul className="space-y-1">
              {dados.itens.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-2">
                  <span className="min-w-0">
                    <span className="mr-1" data-numeric>
                      {numero(i.quantidade)}×
                    </span>
                    {i.nome}
                  </span>
                  <span className="shrink-0" data-numeric>
                    {moeda(i.total)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="my-3 border-t border-dashed border-hairline-strong" />

            <div className="flex items-baseline justify-between">
              <span className="font-sans text-sm font-bold">TOTAL</span>
              <span className="font-display text-lg font-extrabold" data-numeric>
                {moeda(dados.total)}
              </span>
            </div>

            {dados.pontosGerados > 0 ? (
              <p className="mt-2 text-center text-body-muted" data-numeric>
                +{dados.pontosGerados} pontos de fidelidade
              </p>
            ) : null}

            <p className="mt-4 text-center text-[10px] text-body-subtle">
              Comprovante não fiscal · Obrigado pela visita ❤️
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-6 pt-4 pb-6 sm:flex-row">
          <Button variant="secondary" full className="no-print" onClick={() => window.print()}>
            <Printer />
            Imprimir
          </Button>
          <Button full onClick={onFechar} autoFocus>
            Nova venda
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
