'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda, percentual, quantidade as fmtQtd } from '@/lib/format'
import { brl, margem } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldRow, FieldSection } from '@/components/ui/field'
import { QuantityInput, Textarea } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CheckboxCampo } from '@/components/ui/toggles'
import { Skeleton } from '@/components/ui/states'
import { useAcao } from '@/hooks/use-acao'
import { carregarFichaDoProduto, salvarFicha } from '@/server/modules/fichas/actions'

export type IngredienteOpcao = {
  id: string
  nome: string
  sku: string
  unidade: string
  custoMedio: number
  estoqueAtual: number
}

type Linha = {
  chave: string
  ingredienteId: string
  quantidade: number
  unidade: string
  perdaPercentual: number
  observacao: string
}

const UNIDADES = [
  { valor: 'G', rotulo: 'g' },
  { valor: 'KG', rotulo: 'kg' },
  { valor: 'ML', rotulo: 'ml' },
  { valor: 'L', rotulo: 'L' },
  { valor: 'UN', rotulo: 'un' },
  { valor: 'PCT', rotulo: 'pct' },
  { valor: 'CX', rotulo: 'cx' },
]

/** Compatibilidade de unidade: massa com massa, volume com volume, discreto igual. */
const BASES: Record<string, string> = { G: 'MASSA', KG: 'MASSA', ML: 'VOLUME', L: 'VOLUME' }
function compativel(daFicha: string, doInsumo: string) {
  if (daFicha === doInsumo) return true
  const a = BASES[daFicha]
  const b = BASES[doInsumo]
  return Boolean(a && b && a === b)
}
const FATORES: Record<string, number> = { G: 1, KG: 1000, ML: 1, L: 1000 }
function converter(valor: number, de: string, para: string) {
  if (de === para) return valor
  if (!FATORES[de] || !FATORES[para]) return valor
  return (valor * FATORES[de]) / FATORES[para]
}

/**
 * Editor de ficha técnica.
 *
 * O custo aparece linha por linha enquanto se digita — é isso que transforma a
 * ficha de burocracia em ferramenta: dá para ver na hora que a Nutella responde
 * por metade do custo do donut.
 *
 * A unidade da linha pode diferir da unidade do insumo (pedir "0,08 kg" de uma
 * farinha controlada em gramas); o editor converte e avisa quando a conversão
 * não existe.
 */
export function EditorFicha({
  produtoId,
  produtoNome,
  precoVenda,
  ingredientes,
  onFechar,
}: {
  produtoId: string
  produtoNome: string
  precoVenda: number
  ingredientes: IngredienteOpcao[]
  onFechar: () => void
}) {
  const [carregando, setCarregando] = React.useState(true)
  const [fichaId, setFichaId] = React.useState<string | undefined>(undefined)
  const [versao, setVersao] = React.useState<number | null>(null)
  const [rendimento, setRendimento] = React.useState(1)
  const [unidadeRendimento, setUnidadeRendimento] = React.useState('UN')
  const [modoPreparo, setModoPreparo] = React.useState('')
  const [tempo, setTempo] = React.useState<number | null>(null)
  const [novaVersao, setNovaVersao] = React.useState(false)
  const [linhas, setLinhas] = React.useState<Linha[]>([])

  const acao = useAcao(salvarFicha, {
    sucesso: (d) =>
      d.versionada
        ? `Ficha salva como versão ${d.versao} — custo ${moeda(d.custoUnitario)} por unidade`
        : `Ficha salva — custo ${moeda(d.custoUnitario)} por unidade`,
    aoConcluir: onFechar,
  })

  React.useEffect(() => {
    let cancelado = false
    carregarFichaDoProduto({ produtoId }).then((r) => {
      if (cancelado) return
      if (r.ok && r.dados) {
        const f = r.dados
        setFichaId(f.id)
        setVersao(f.versao)
        setRendimento(f.rendimento)
        setUnidadeRendimento(f.unidadeRendimento)
        setModoPreparo(f.modoPreparo)
        setTempo(f.tempoPreparoMin)
        setLinhas(
          f.itens.map((i, idx) => ({
            chave: `l${idx}`,
            ingredienteId: i.ingredienteId,
            quantidade: i.quantidade,
            unidade: i.unidade,
            perdaPercentual: i.perdaPercentual,
            observacao: i.observacao,
          })),
        )
      }
      setCarregando(false)
    })
    return () => {
      cancelado = true
    }
  }, [produtoId])

  const calculadas = linhas.map((l) => {
    const insumo = ingredientes.find((i) => i.id === l.ingredienteId)
    if (!insumo) return { ...l, insumo: null, custo: 0, incompativel: false, naUnidade: 0 }
    const ok = compativel(l.unidade, insumo.unidade)
    const bruto = l.quantidade * (1 + l.perdaPercentual / 100)
    const naUnidade = ok ? converter(bruto, l.unidade, insumo.unidade) : 0
    return { ...l, insumo, custo: brl(naUnidade * insumo.custoMedio), incompativel: !ok, naUnidade }
  })

  const custoTotal = brl(calculadas.reduce((a, l) => a + l.custo, 0))
  const custoUnitario = brl(rendimento > 0 ? custoTotal / rendimento : 0)
  const temIncompativel = calculadas.some((l) => l.incompativel)
  const usados = new Set(linhas.map((l) => l.ingredienteId))

  return (
    <Sheet open onOpenChange={(v) => !v && onFechar()}>
      <SheetContent largura="lg">
        <SheetHeader>
          <SheetTitle>Ficha técnica · {produtoNome}</SheetTitle>
          <SheetDescription>
            {versao ? `Versão ativa: v${versao}. ` : 'Primeira versão. '}
            Os custos usam o custo médio atual de cada insumo.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {carregando ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : (
            <>
              <FieldSection titulo="Rendimento" descricao="Quanto uma execução da receita produz.">
                <FieldRow>
                  <Field label="Rende" htmlFor="f-rend" erro={acao.erroCampos.rendimento} obrigatorio>
                    <QuantityInput
                      id="f-rend"
                      value={rendimento}
                      onValueChange={setRendimento}
                      unidade={unidadeRendimento}
                      step={1}
                      min={0.001}
                    />
                  </Field>
                  <Field label="Unidade do rendimento" htmlFor="f-un">
                    <SelectSimples id="f-un" value={unidadeRendimento} onValueChange={setUnidadeRendimento} opcoes={UNIDADES} />
                  </Field>
                </FieldRow>
                <Field label="Tempo de preparo (min)" htmlFor="f-tempo" className="max-w-40">
                  <QuantityInput id="f-tempo" value={tempo ?? 0} onValueChange={(v) => setTempo(v || null)} step={5} />
                </Field>
              </FieldSection>

              <FieldSection titulo="Insumos">
                {acao.erroCampos.itens ? (
                  <p className="text-xs font-semibold text-danger">{acao.erroCampos.itens}</p>
                ) : null}

                <ul className="space-y-2">
                  {calculadas.map((l, idx) => (
                    <li
                      key={l.chave}
                      className={cn(
                        'rounded-control border bg-paper p-3',
                        l.incompativel ? 'border-danger/50 bg-danger-soft/40' : 'border-hairline',
                      )}
                    >
                      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_5.5rem_5rem_auto]">
                        <Field label="Insumo" htmlFor={`i-${idx}`}>
                          <Combobox
                            id={`i-${idx}`}
                            value={l.ingredienteId}
                            onValueChange={(v) =>
                              setLinhas((atual) =>
                                atual.map((x, i) => {
                                  if (i !== idx) return x
                                  const insumo = ingredientes.find((ing) => ing.id === v)
                                  return { ...x, ingredienteId: v ?? '', unidade: insumo?.unidade ?? x.unidade }
                                }),
                              )
                            }
                            opcoes={ingredientes.map((i) => ({
                              valor: i.id,
                              rotulo: i.nome,
                              apoio: `${i.sku} · ${moeda(i.custoMedio)}/${i.unidade.toLowerCase()}`,
                              busca: i.sku,
                              desabilitado: usados.has(i.id) && i.id !== l.ingredienteId,
                            }))}
                            placeholder="Escolha o insumo"
                          />
                        </Field>
                        <Field label="Quantidade" htmlFor={`q-${idx}`}>
                          <QuantityInput
                            id={`q-${idx}`}
                            value={l.quantidade}
                            onValueChange={(v) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, quantidade: v } : x)))}
                            step={l.unidade === 'UN' ? 1 : 5}
                            min={0}
                          />
                        </Field>
                        <Field label="Unidade" htmlFor={`u-${idx}`}>
                          <SelectSimples
                            id={`u-${idx}`}
                            value={l.unidade}
                            onValueChange={(v) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, unidade: v } : x)))}
                            opcoes={UNIDADES}
                          />
                        </Field>
                        <Field label="Perda %" htmlFor={`p-${idx}`}>
                          <QuantityInput
                            id={`p-${idx}`}
                            value={l.perdaPercentual}
                            onValueChange={(v) =>
                              setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, perdaPercentual: v } : x)))
                            }
                            step={1}
                            min={0}
                          />
                        </Field>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger"
                            aria-label="Remover insumo"
                            onClick={() => setLinhas((atual) => atual.filter((_, i) => i !== idx))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                        {l.incompativel ? (
                          <span className="font-bold text-danger">
                            {l.unidade} não converte para {l.insumo?.unidade} — ajuste a unidade da linha ou do insumo.
                          </span>
                        ) : l.insumo ? (
                          <>
                            <span className="text-body-muted">
                              consome {fmtQtd(l.naUnidade, l.insumo.unidade)} · estoque{' '}
                              {fmtQtd(l.insumo.estoqueAtual, l.insumo.unidade)}
                            </span>
                            <span className="font-bold" data-numeric>
                              {moeda(l.custo)}
                            </span>
                            {custoTotal > 0 ? (
                              <Badge tone="neutral" size="sm">
                                {((l.custo / custoTotal) * 100).toFixed(0)}% do custo
                              </Badge>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setLinhas((atual) => [
                      ...atual,
                      {
                        chave: `n${Date.now()}`,
                        ingredienteId: '',
                        quantidade: 0,
                        unidade: 'G',
                        perdaPercentual: 0,
                        observacao: '',
                      },
                    ])
                  }
                >
                  <Plus className="size-3.5" />
                  Adicionar insumo
                </Button>
              </FieldSection>

              {/* Resultado */}
              <div className="grid grid-cols-2 gap-3 rounded-card border border-hairline bg-paper-sunken p-4 sm:grid-cols-4">
                {[
                  { r: 'Custo da receita', v: moeda(custoTotal) },
                  { r: 'Custo por unidade', v: moeda(custoUnitario) },
                  { r: 'Preço de venda', v: moeda(precoVenda) },
                  {
                    r: 'Margem',
                    v: percentual(margem(precoVenda, custoUnitario)),
                    tom:
                      margem(precoVenda, custoUnitario) >= 60
                        ? 'text-leaf'
                        : margem(precoVenda, custoUnitario) >= 35
                          ? ''
                          : 'text-danger',
                  },
                ].map((i) => (
                  <div key={i.r}>
                    <p className="eyebrow">{i.r}</p>
                    <p className={cn('mt-1 font-display text-lg font-extrabold', i.tom)} data-numeric>
                      {i.v}
                    </p>
                  </div>
                ))}
              </div>

              <Field label="Modo de preparo" htmlFor="f-modo">
                <Textarea
                  id="f-modo"
                  value={modoPreparo}
                  onChange={(e) => setModoPreparo(e.target.value)}
                  rows={5}
                  placeholder="1. Misture os secos…"
                />
              </Field>

              {versao ? (
                <CheckboxCampo
                  id="f-nova-versao"
                  checked={novaVersao}
                  onCheckedChange={setNovaVersao}
                  label="Salvar como nova versão"
                  descricao={`Mantém a v${versao} no histórico. Obrigatório se a ficha já foi usada em produção — nesse caso o sistema versiona sozinho.`}
                />
              ) : null}

              {acao.erroGeral ? (
                <p className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                  {acao.erroGeral}
                </p>
              ) : null}
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={onFechar} disabled={acao.pendente}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={carregando || linhas.length === 0 || temIncompativel || linhas.some((l) => !l.ingredienteId || l.quantidade <= 0)}
            onClick={() =>
              acao.executar({
                id: fichaId,
                produtoId,
                rendimento,
                unidadeRendimento,
                modoPreparo,
                tempoPreparoMin: tempo,
                novaVersao,
                itens: linhas.map((l) => ({
                  ingredienteId: l.ingredienteId,
                  quantidade: l.quantidade,
                  unidade: l.unidade as never,
                  perdaPercentual: l.perdaPercentual,
                  observacao: l.observacao,
                })),
              })
            }
          >
            Salvar ficha
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
