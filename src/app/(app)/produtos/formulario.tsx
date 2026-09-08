'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda, percentual } from '@/lib/format'
import { brl, margem } from '@/lib/money'
import { slugify } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldRow, FieldSection } from '@/components/ui/field'
import { Input, MoneyInput, QuantityInput, Textarea } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CheckboxCampo, SwitchLinha } from '@/components/ui/toggles'
import { Skeleton } from '@/components/ui/states'
import { useAcao } from '@/hooks/use-acao'
import { obterProdutoAction, salvarProduto } from '@/server/modules/catalogo/actions'

export type OpcaoCombo = { id: string; nome: string; sku: string; precoVenda: number; precoCusto: number }

type Variacao = { id?: string; nome: string; precoDelta: number; custoDelta: number; fatorFicha: number; ativo: boolean }
type ItemCombo = { produtoId: string; quantidade: number }

const TIPOS = [
  { valor: 'PRODUZIDO', rotulo: 'Produção própria (tem ficha técnica)' },
  { valor: 'PREPARADO', rotulo: 'Preparado na hora (café, milkshake)' },
  { valor: 'SIMPLES', rotulo: 'Revenda (água, refrigerante)' },
  { valor: 'COMBO', rotulo: 'Combo (junta outros produtos)' },
]

/**
 * Cadastro de produto.
 *
 * Abre em drawer e não em página própria: quem cadastra 20 donuts sazonais numa
 * tarde não quer perder a lista de trás a cada item.
 *
 * O custo é exibido, não editado, quando o produto tem ficha técnica — ali quem
 * manda no custo é a receita, e deixar o campo aberto criaria dois números
 * concorrentes para a mesma coisa.
 */
export function FormularioProduto({
  produtoId,
  categorias,
  adicionais,
  produtosCombo,
  onFechar,
}: {
  produtoId: string | null
  categorias: Array<{ id: string; nome: string; cor: string }>
  adicionais: Array<{ id: string; nome: string; preco: number }>
  produtosCombo: OpcaoCombo[]
  onFechar: () => void
}) {
  const [carregando, setCarregando] = React.useState(Boolean(produtoId))
  const [nome, setNome] = React.useState('')
  const [sku, setSku] = React.useState('')
  const [categoriaId, setCategoriaId] = React.useState(categorias[0]?.id ?? '')
  const [descricao, setDescricao] = React.useState('')
  const [imagemUrl, setImagemUrl] = React.useState('')
  const [tipo, setTipo] = React.useState('PRODUZIDO')
  const [unidade, setUnidade] = React.useState('UN')
  const [precoCusto, setPrecoCusto] = React.useState(0)
  const [precoVenda, setPrecoVenda] = React.useState(0)
  const [controlaEstoque, setControlaEstoque] = React.useState(true)
  const [estoqueMinimo, setEstoqueMinimo] = React.useState(0)
  const [tempoPreparo, setTempoPreparo] = React.useState<number | null>(null)
  const [ativo, setAtivo] = React.useState(true)
  const [disponivel, setDisponivel] = React.useState(true)
  const [destaque, setDestaque] = React.useState(false)
  const [variacoes, setVariacoes] = React.useState<Variacao[]>([])
  const [adicionaisIds, setAdicionaisIds] = React.useState<string[]>([])
  const [comboItens, setComboItens] = React.useState<ItemCombo[]>([])

  const acao = useAcao(salvarProduto, {
    sucesso: (d) => `${d.nome} salvo`,
    aoConcluir: onFechar,
  })

  // Carrega o produto ao editar.
  React.useEffect(() => {
    if (!produtoId) return
    let cancelado = false
    obterProdutoAction({ id: produtoId }).then((r) => {
      if (cancelado || !r.ok) {
        setCarregando(false)
        return
      }
      const p = r.dados
      setNome(p.nome)
      setSku(p.sku)
      setCategoriaId(p.categoriaId)
      setDescricao(p.descricao)
      setImagemUrl(p.imagemUrl)
      setTipo(p.tipo)
      setUnidade(p.unidade)
      setPrecoCusto(p.precoCusto)
      setPrecoVenda(p.precoVenda)
      setControlaEstoque(p.controlaEstoque)
      setEstoqueMinimo(p.estoqueMinimo)
      setTempoPreparo(p.tempoPreparoMin)
      setAtivo(p.ativo)
      setDisponivel(p.disponivel)
      setDestaque(p.destaque)
      setVariacoes(p.variacoes)
      setAdicionaisIds(p.adicionaisIds)
      setComboItens(p.comboItens)
      setCarregando(false)
    })
    return () => {
      cancelado = true
    }
  }, [produtoId])

  // SKU sugerido a partir do nome, só ao criar.
  React.useEffect(() => {
    if (produtoId || !nome) return
    setSku(slugify(nome).replace(/-/g, '').slice(0, 12).toUpperCase())
  }, [nome, produtoId])

  const custoCombo = React.useMemo(
    () =>
      brl(
        comboItens.reduce((acc, i) => {
          const p = produtosCombo.find((x) => x.id === i.produtoId)
          return acc + (p ? p.precoCusto * i.quantidade : 0)
        }, 0),
      ),
    [comboItens, produtosCombo],
  )
  const somaCombo = React.useMemo(
    () =>
      brl(
        comboItens.reduce((acc, i) => {
          const p = produtosCombo.find((x) => x.id === i.produtoId)
          return acc + (p ? p.precoVenda * i.quantidade : 0)
        }, 0),
      ),
    [comboItens, produtosCombo],
  )

  const custoEfetivo = tipo === 'COMBO' ? custoCombo : precoCusto
  const custoTravado = tipo === 'PRODUZIDO' || tipo === 'PREPARADO' || tipo === 'COMBO'

  async function salvar() {
    await acao.executar({
      id: produtoId ?? undefined,
      nome,
      sku,
      categoriaId,
      descricao,
      imagemUrl,
      tipo: tipo as never,
      unidade,
      precoCusto,
      precoVenda,
      controlaEstoque,
      estoqueMinimo,
      tempoPreparoMin: tempoPreparo,
      ativo,
      disponivel,
      destaque,
      ordem: 0,
      variacoes,
      adicionaisIds,
      comboItens,
    })
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onFechar()}>
      <SheetContent largura="md">
        <SheetHeader>
          <SheetTitle>{produtoId ? 'Editar produto' : 'Novo produto'}</SheetTitle>
          <SheetDescription>
            {custoTravado
              ? 'O custo vem da ficha técnica ou dos componentes do combo.'
              : 'Informe o custo de compra para o sistema calcular a margem.'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-7">
          {carregando ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <>
              <FieldSection titulo="Identificação">
                <Field label="Nome" htmlFor="p-nome" erro={acao.erroCampos.nome} obrigatorio>
                  <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
                </Field>
                <FieldRow>
                  <Field label="SKU" htmlFor="p-sku" erro={acao.erroCampos.sku} obrigatorio dica="Código curto para busca no PDV.">
                    <Input
                      id="p-sku"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      className="font-mono uppercase"
                    />
                  </Field>
                  <Field label="Categoria" htmlFor="p-cat" erro={acao.erroCampos.categoriaId} obrigatorio>
                    <SelectSimples
                      id="p-cat"
                      value={categoriaId}
                      onValueChange={setCategoriaId}
                      opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
                    />
                  </Field>
                </FieldRow>
                <Field label="Tipo" htmlFor="p-tipo" erro={acao.erroCampos.tipo} obrigatorio>
                  <SelectSimples id="p-tipo" value={tipo} onValueChange={setTipo} opcoes={TIPOS} />
                </Field>
                <Field label="Descrição" htmlFor="p-desc">
                  <Textarea id="p-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
                </Field>
                <Field label="URL da imagem" htmlFor="p-img" dica="Opcional. Sem imagem, o PDV mostra as iniciais na cor da categoria.">
                  <Input id="p-img" value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} placeholder="/uploads/donut-nutella.jpg" />
                </Field>
              </FieldSection>

              <FieldSection titulo="Preço e margem">
                <FieldRow>
                  <Field
                    label="Custo unitário"
                    htmlFor="p-custo"
                    erro={acao.erroCampos.precoCusto}
                    dica={custoTravado ? 'Calculado automaticamente.' : undefined}
                  >
                    <MoneyInput
                      id="p-custo"
                      value={custoEfetivo}
                      onValueChange={setPrecoCusto}
                      disabled={custoTravado}
                    />
                  </Field>
                  <Field label="Preço de venda" htmlFor="p-venda" erro={acao.erroCampos.precoVenda} obrigatorio>
                    <MoneyInput id="p-venda" value={precoVenda} onValueChange={setPrecoVenda} />
                  </Field>
                </FieldRow>

                <div className="grid grid-cols-3 gap-2 rounded-control bg-paper-sunken px-3 py-3 text-center">
                  {[
                    { r: 'Lucro por unidade', v: moeda(brl(Math.max(0, precoVenda - custoEfetivo))) },
                    { r: 'Margem', v: percentual(margem(precoVenda, custoEfetivo)) },
                    { r: 'Markup', v: custoEfetivo > 0 ? percentual(((precoVenda - custoEfetivo) / custoEfetivo) * 100) : '—' },
                  ].map((i) => (
                    <div key={i.r}>
                      <p className="text-[10px] font-bold tracking-wide text-body-subtle uppercase">{i.r}</p>
                      <p className="mt-0.5 text-sm font-bold" data-numeric>
                        {i.v}
                      </p>
                    </div>
                  ))}
                </div>
              </FieldSection>

              {tipo === 'COMBO' ? (
                <FieldSection titulo="Itens do combo" descricao="O custo do combo é a soma dos componentes.">
                  {acao.erroCampos.comboItens ? (
                    <p className="text-xs font-semibold text-danger">{acao.erroCampos.comboItens}</p>
                  ) : null}
                  <ul className="space-y-2">
                    {comboItens.map((item, idx) => (
                      <li key={idx} className="flex items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <Combobox
                            value={item.produtoId}
                            onValueChange={(v) =>
                              setComboItens((atual) => atual.map((c, i) => (i === idx ? { ...c, produtoId: v ?? '' } : c)))
                            }
                            opcoes={produtosCombo.map((p) => ({
                              valor: p.id,
                              rotulo: p.nome,
                              apoio: `${p.sku} · ${moeda(p.precoVenda)}`,
                              busca: p.sku,
                            }))}
                            placeholder="Escolha o produto"
                          />
                        </div>
                        <div className="w-24">
                          <QuantityInput
                            value={item.quantidade}
                            onValueChange={(v) =>
                              setComboItens((atual) => atual.map((c, i) => (i === idx ? { ...c, quantidade: v } : c)))
                            }
                            step={1}
                            min={1}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-danger"
                          aria-label="Remover item do combo"
                          onClick={() => setComboItens((atual) => atual.filter((_, i) => i !== idx))}
                        >
                          <Trash2 />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setComboItens((atual) => [...atual, { produtoId: '', quantidade: 1 }])}
                  >
                    <Plus className="size-3.5" />
                    Adicionar item
                  </Button>
                  {comboItens.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-control bg-paper-sunken px-3 py-2 text-xs">
                      <span className="text-body-muted">Soma avulsa:</span>
                      <span className="font-bold" data-numeric>
                        {moeda(somaCombo)}
                      </span>
                      {precoVenda > 0 && somaCombo > precoVenda ? (
                        <Badge tone="leaf">Desconto de {moeda(brl(somaCombo - precoVenda))}</Badge>
                      ) : null}
                    </div>
                  ) : null}
                </FieldSection>
              ) : null}

              <FieldSection titulo="Variações" descricao="Tamanhos com preço diferente. Ex.: café 200ml e 300ml.">
                <ul className="space-y-3">
                  {variacoes.map((v, idx) => (
                    <li key={v.id ?? idx} className="rounded-control border border-hairline bg-paper p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                        <Field label="Nome" htmlFor={`v-nome-${idx}`}>
                          <Input
                            id={`v-nome-${idx}`}
                            value={v.nome}
                            onChange={(e) =>
                              setVariacoes((atual) => atual.map((x, i) => (i === idx ? { ...x, nome: e.target.value } : x)))
                            }
                            placeholder="300 ml"
                          />
                        </Field>
                        <Field label="Δ preço" htmlFor={`v-preco-${idx}`} className="w-28">
                          <MoneyInput
                            id={`v-preco-${idx}`}
                            value={v.precoDelta}
                            onValueChange={(val) =>
                              setVariacoes((atual) => atual.map((x, i) => (i === idx ? { ...x, precoDelta: val } : x)))
                            }
                          />
                        </Field>
                        <Field label="Fator ficha" htmlFor={`v-fator-${idx}`} className="w-24">
                          <QuantityInput
                            id={`v-fator-${idx}`}
                            value={v.fatorFicha}
                            step={0.1}
                            min={0.1}
                            onValueChange={(val) =>
                              setVariacoes((atual) => atual.map((x, i) => (i === idx ? { ...x, fatorFicha: val } : x)))
                            }
                          />
                        </Field>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger"
                            aria-label="Remover variação"
                            onClick={() => setVariacoes((atual) => atual.filter((_, i) => i !== idx))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-body-subtle">
                        Vende por <strong data-numeric>{moeda(brl(precoVenda + v.precoDelta))}</strong> e consome{' '}
                        {v.fatorFicha}× a ficha técnica.
                      </p>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setVariacoes((atual) => [
                      ...atual,
                      { nome: '', precoDelta: 0, custoDelta: 0, fatorFicha: 1, ativo: true },
                    ])
                  }
                >
                  <Plus className="size-3.5" />
                  Adicionar variação
                </Button>
              </FieldSection>

              {adicionais.length > 0 ? (
                <FieldSection titulo="Adicionais permitidos" descricao="O que o PDV oferece junto deste produto.">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {adicionais.map((a) => (
                      <CheckboxCampo
                        key={a.id}
                        id={`ad-${a.id}`}
                        checked={adicionaisIds.includes(a.id)}
                        onCheckedChange={(v) =>
                          setAdicionaisIds((atual) => (v ? [...atual, a.id] : atual.filter((x) => x !== a.id)))
                        }
                        label={a.nome}
                        descricao={moeda(a.preco)}
                      />
                    ))}
                  </div>
                </FieldSection>
              ) : null}

              <FieldSection titulo="Estoque e vitrine">
                <div className="divide-y divide-hairline rounded-control border border-hairline bg-paper px-3">
                  <SwitchLinha
                    id="p-controla"
                    checked={controlaEstoque}
                    onCheckedChange={setControlaEstoque}
                    label="Controlar estoque deste produto"
                    descricao="Ligado: a venda baixa unidades do acabado. Desligado: a venda consome a ficha técnica."
                  />
                  <SwitchLinha
                    id="p-ativo"
                    checked={ativo}
                    onCheckedChange={setAtivo}
                    label="Ativo no catálogo"
                    descricao="Desligado, o produto sai do PDV mas o histórico continua."
                  />
                  <SwitchLinha
                    id="p-disp"
                    checked={disponivel}
                    onCheckedChange={setDisponivel}
                    label="Disponível hoje"
                    descricao="Desligue quando esgotar — é o SOLD OUT do dia."
                  />
                  <SwitchLinha
                    id="p-destaque"
                    checked={destaque}
                    onCheckedChange={setDestaque}
                    label="Destaque no PDV"
                    descricao="Aparece primeiro na grade de produtos."
                  />
                </div>
                <FieldRow>
                  {controlaEstoque ? (
                    <Field label="Estoque mínimo" htmlFor="p-min" dica="Abaixo disso, entra nos avisos.">
                      <QuantityInput id="p-min" value={estoqueMinimo} onValueChange={setEstoqueMinimo} unidade={unidade} />
                    </Field>
                  ) : null}
                  <Field label="Tempo de preparo (min)" htmlFor="p-tempo">
                    <QuantityInput
                      id="p-tempo"
                      value={tempoPreparo ?? 0}
                      onValueChange={(v) => setTempoPreparo(v || null)}
                      step={1}
                    />
                  </Field>
                </FieldRow>
                <Field label="Unidade" htmlFor="p-unidade" className="max-w-40">
                  <Input id="p-unidade" value={unidade} onChange={(e) => setUnidade(e.target.value.toUpperCase())} maxLength={6} />
                </Field>
              </FieldSection>

              {acao.erroGeral ? (
                <p className={cn('rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger')}>
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
          <Button loading={acao.pendente} disabled={carregando} onClick={salvar}>
            Salvar produto
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
