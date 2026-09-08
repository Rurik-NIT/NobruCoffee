'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { moeda } from '@/lib/format'
import { brl } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, QuantityStepper } from '@/components/ui/input'
import type { AdicionalPdv, ItemCarrinho, ProdutoPdv } from './tipos'

/**
 * Montagem do item: tamanho, adicionais, quantidade e observação.
 *
 * Abre só quando o produto tem opções — um donut simples entra no carrinho com
 * um toque, sem diálogo no caminho.
 */
export function DialogoItem({
  produto,
  adicionais,
  onFechar,
  onAdicionar,
}: {
  produto: ProdutoPdv
  adicionais: AdicionalPdv[]
  onFechar: () => void
  onAdicionar: (opcoes: Partial<ItemCarrinho>) => void
}) {
  const [variacaoId, setVariacaoId] = React.useState<string | null>(produto.variacoes[0]?.id ?? null)
  const [quantidade, setQuantidade] = React.useState(1)
  const [observacao, setObservacao] = React.useState('')
  const [escolhidos, setEscolhidos] = React.useState<Record<string, number>>({})

  const variacao = variacaoId ? produto.variacoes.find((v) => v.id === variacaoId) : null
  const precoBase = brl(produto.precoVenda + (variacao?.precoDelta ?? 0))
  const extras = brl(
    Object.entries(escolhidos).reduce((acc, [id, qtd]) => {
      const ad = adicionais.find((a) => a.id === id)
      return acc + (ad ? ad.preco * qtd : 0)
    }, 0),
  )
  const total = brl((precoBase + extras) * quantidade)

  function alternarAdicional(id: string) {
    setEscolhidos((atual) => {
      const proximo = { ...atual }
      if (proximo[id]) delete proximo[id]
      else proximo[id] = 1
      return proximo
    })
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="md">
        <DialogHeader>
          <DialogTitle>{produto.nome}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {produto.variacoes.length > 0 ? (
            <div>
              <p className="eyebrow mb-2">Tamanho</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {produto.variacoes.map((v) => {
                  const ativo = v.id === variacaoId
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariacaoId(v.id)}
                      className={cn(
                        'rounded-control border-2 px-3 py-3 text-left transition-colors',
                        ativo ? 'border-nobru-500 bg-nobru-50' : 'border-hairline-strong bg-paper-raised hover:border-body-subtle',
                      )}
                    >
                      <span className="block text-sm font-bold">{v.nome}</span>
                      <span className="block text-xs text-body-muted" data-numeric>
                        {moeda(brl(produto.precoVenda + v.precoDelta))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {adicionais.length > 0 ? (
            <div>
              <p className="eyebrow mb-2">Adicionais</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {adicionais.map((a) => {
                  const qtd = escolhidos[a.id] ?? 0
                  return (
                    <li key={a.id}>
                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-control border-2 px-3 py-2 transition-colors',
                          qtd > 0 ? 'border-nobru-500 bg-nobru-50' : 'border-hairline-strong bg-paper-raised',
                        )}
                      >
                        <button type="button" onClick={() => alternarAdicional(a.id)} className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-sm font-semibold">{a.nome}</span>
                          <span className="block text-xs text-body-muted" data-numeric>
                            + {moeda(a.preco)}
                          </span>
                        </button>
                        {qtd > 0 ? (
                          <QuantityStepper
                            value={qtd}
                            min={1}
                            max={9}
                            onValueChange={(v) => setEscolhidos((atual) => ({ ...atual, [a.id]: v }))}
                            className="scale-90"
                          />
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          <Field label="Observação para a cozinha" htmlFor="item-obs">
            <Input
              id="item-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: sem açúcar, embalar separado"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-control bg-paper-sunken px-3 py-2.5">
            <QuantityStepper value={quantidade} onValueChange={setQuantidade} max={99} />
            <span className="font-display text-xl font-extrabold" data-numeric>
              {moeda(total)}
            </span>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={() =>
              onAdicionar({
                variacaoId,
                quantidade,
                observacao,
                adicionais: Object.entries(escolhidos).map(([id, qtd]) => {
                  const ad = adicionais.find((a) => a.id === id)!
                  return { adicionalId: id, nome: ad.nome, preco: ad.preco, quantidade: qtd }
                }),
              })
            }
          >
            Adicionar {moeda(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
