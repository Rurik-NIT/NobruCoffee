'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ShoppingCart, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda, numero, quantidade as fmtQtd } from '@/lib/format'
import { brl } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { Panel } from '@/components/patterns/page'
import { SelectSimples } from '@/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAcao } from '@/hooks/use-acao'
import { criarPedidoDaSugestao, salvarPedidoCompra } from '@/server/modules/compras/actions'

type Ingrediente = { id: string; nome: string; sku: string; unidade: string; custoMedio: number; estoqueAtual: number }
type Linha = { chave: string; ingredienteId: string; quantidade: number; precoUnitario: number }

export function NovoPedidoCompra({
  fornecedores,
  ingredientes,
}: {
  fornecedores: Array<{ id: string; nome: string }>
  ingredientes: Ingrediente[]
}) {
  const router = useRouter()
  const [aberto, setAberto] = React.useState(false)
  const [fornecedorId, setFornecedorId] = React.useState(fornecedores[0]?.id ?? '')
  const [dataPrevista, setDataPrevista] = React.useState('')
  const [observacao, setObservacao] = React.useState('')
  const [linhas, setLinhas] = React.useState<Linha[]>([])

  const acao = useAcao(salvarPedidoCompra, {
    sucesso: (d) => `Pedido ${d.codigo} criado — ${moeda(d.total)}`,
    aoConcluir: (d) => {
      setAberto(false)
      setLinhas([])
      router.push(`/compras/${d.id}`)
    },
  })

  const total = brl(linhas.reduce((a, l) => a + l.quantidade * l.precoUnitario, 0))
  const usados = new Set(linhas.map((l) => l.ingredienteId))

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus />
        Novo pedido
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent largura="md">
          <SheetHeader>
            <SheetTitle>Novo pedido de compra</SheetTitle>
            <SheetDescription>
              O preço sugerido é o custo médio atual. Ajuste para o preço combinado com o fornecedor.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-5">
            <FieldRow>
              <Field label="Fornecedor" htmlFor="pc-forn" erro={acao.erroCampos.fornecedorId} obrigatorio>
                <SelectSimples
                  id="pc-forn"
                  value={fornecedorId}
                  onValueChange={setFornecedorId}
                  opcoes={fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))}
                  placeholder="Escolha o fornecedor"
                />
              </Field>
              <Field label="Previsão de entrega" htmlFor="pc-data">
                <DateInput id="pc-data" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} />
              </Field>
            </FieldRow>

            <div>
              <p className="eyebrow mb-2">Itens</p>
              {acao.erroCampos.itens ? <p className="mb-2 text-xs font-semibold text-danger">{acao.erroCampos.itens}</p> : null}
              <ul className="space-y-2">
                {linhas.map((l, idx) => {
                  const insumo = ingredientes.find((i) => i.id === l.ingredienteId)
                  return (
                    <li key={l.chave} className="rounded-control border border-hairline bg-paper p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_7rem_auto]">
                        <Field label="Insumo" htmlFor={`pc-i-${idx}`}>
                          <Combobox
                            id={`pc-i-${idx}`}
                            value={l.ingredienteId}
                            onValueChange={(v) =>
                              setLinhas((atual) =>
                                atual.map((x, i) => {
                                  if (i !== idx) return x
                                  const ing = ingredientes.find((g) => g.id === v)
                                  return { ...x, ingredienteId: v ?? '', precoUnitario: ing?.custoMedio ?? x.precoUnitario }
                                }),
                              )
                            }
                            opcoes={ingredientes.map((i) => ({
                              valor: i.id,
                              rotulo: i.nome,
                              apoio: `${fmtQtd(i.estoqueAtual, i.unidade)} · ${moeda(i.custoMedio)}/${i.unidade.toLowerCase()}`,
                              busca: i.sku,
                              desabilitado: usados.has(i.id) && i.id !== l.ingredienteId,
                            }))}
                            placeholder="Escolha o insumo"
                          />
                        </Field>
                        <Field label="Quantidade" htmlFor={`pc-q-${idx}`}>
                          <QuantityInput
                            id={`pc-q-${idx}`}
                            value={l.quantidade}
                            onValueChange={(v) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, quantidade: v } : x)))}
                            unidade={insumo?.unidade}
                          />
                        </Field>
                        <Field label="Preço unit." htmlFor={`pc-p-${idx}`}>
                          <MoneyInput
                            id={`pc-p-${idx}`}
                            value={l.precoUnitario}
                            onValueChange={(v) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, precoUnitario: v } : x)))}
                          />
                        </Field>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger"
                            aria-label="Remover item"
                            onClick={() => setLinhas((atual) => atual.filter((_, i) => i !== idx))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        {insumo && insumo.custoMedio > 0 && l.precoUnitario > 0 ? (
                          <span
                            className={cn(
                              'font-semibold',
                              l.precoUnitario > insumo.custoMedio * 1.1 ? 'text-danger' : 'text-body-muted',
                            )}
                          >
                            {l.precoUnitario > insumo.custoMedio
                              ? `${(((l.precoUnitario - insumo.custoMedio) / insumo.custoMedio) * 100).toFixed(0)}% acima do custo médio`
                              : 'dentro do custo médio'}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="font-bold" data-numeric>
                          {moeda(brl(l.quantidade * l.precoUnitario))}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() =>
                  setLinhas((atual) => [
                    ...atual,
                    { chave: `n${Date.now()}`, ingredienteId: '', quantidade: 0, precoUnitario: 0 },
                  ])
                }
              >
                <Plus className="size-3.5" />
                Adicionar item
              </Button>
            </div>

            <Field label="Observação" htmlFor="pc-obs">
              <Input id="pc-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </Field>

            {linhas.length > 0 ? (
              <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
                <span className="text-sm font-semibold">Total do pedido</span>
                <span className="font-display text-xl font-extrabold" data-numeric>
                  {moeda(total)}
                </span>
              </div>
            ) : null}

            {acao.erroGeral ? (
              <p className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                {acao.erroGeral}
              </p>
            ) : null}
          </SheetBody>

          <SheetFooter>
            <Button variant="ghost" onClick={() => setAberto(false)} disabled={acao.pendente}>
              Cancelar
            </Button>
            <Button
              loading={acao.pendente}
              disabled={!fornecedorId || linhas.length === 0 || linhas.some((l) => !l.ingredienteId || l.quantidade <= 0)}
              onClick={() =>
                acao.executar({
                  fornecedorId,
                  dataPrevista,
                  observacao,
                  itens: linhas.map((l) => ({
                    ingredienteId: l.ingredienteId,
                    quantidade: l.quantidade,
                    precoUnitario: l.precoUnitario,
                  })),
                })
              }
            >
              Criar pedido
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

/**
 * Sugestão de reposição, agrupada por fornecedor padrão do insumo.
 * Um clique transforma o grupo em pedido de compra — é o caminho mais curto
 * entre "faltou farinha" e "pedido enviado".
 */
export function SugestaoReposicao({
  grupos,
  className,
}: {
  grupos: Array<{
    fornecedorId: string | null
    fornecedor: string
    total: number
    itens: Array<{ ingredienteId: string; nome: string; unidade: string; sugestao: number; custoMedio: number; total: number }>
  }>
  className?: string
}) {
  const router = useRouter()
  const acao = useAcao(criarPedidoDaSugestao, {
    sucesso: (d) => `Pedido ${d.codigo} criado como rascunho`,
    aoConcluir: (d) => router.push(`/compras/${d.id}`),
  })

  return (
    <Panel titulo="Reposição sugerida" descricao="Insumos no mínimo, agrupados pelo fornecedor padrão." className={className}>
      <ul className="divide-y divide-hairline">
        {grupos.map((g) => (
          <li key={g.fornecedorId ?? 'sem'} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">{g.fornecedor}</p>
                <p className="text-xs text-body-muted">
                  {numero(g.itens.length)} insumo(s) · {moeda(g.total)}
                </p>
              </div>
              {g.fornecedorId ? (
                <Button
                  size="sm"
                  loading={acao.pendente}
                  onClick={() =>
                    acao.executar({
                      fornecedorId: g.fornecedorId!,
                      itens: g.itens.map((i) => ({
                        ingredienteId: i.ingredienteId,
                        quantidade: i.sugestao,
                        precoUnitario: i.custoMedio,
                      })),
                    })
                  }
                >
                  <ShoppingCart className="size-3.5" />
                  Gerar pedido
                </Button>
              ) : (
                <span className="text-xs text-body-subtle">Defina o fornecedor padrão destes insumos.</span>
              )}
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {g.itens.map((i) => (
                <li
                  key={i.ingredienteId}
                  className="rounded-full border border-hairline-strong bg-paper px-2.5 py-1 text-xs text-body-muted"
                >
                  {i.nome} · {fmtQtd(i.sugestao, i.unidade)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
