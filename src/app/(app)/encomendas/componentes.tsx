'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, Plus, Trash2, Truck, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { data as fmtData, duracao, hora, moeda, numero, rotulo, telefone as fmtTel } from '@/lib/format'
import { brl } from '@/lib/money'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field, FieldRow, FieldSection } from '@/components/ui/field'
import { DateTimeInput, Input, MoneyInput, QuantityInput, SearchInput, Textarea } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SegmentedControl } from '@/components/ui/toggles'
import { useAcao } from '@/hooks/use-acao'
import { useDebounce } from '@/hooks/use-debounce'
import { buscarClientesAction, cadastroRapidoCliente } from '@/server/modules/clientes/actions'
import { salvarEncomenda } from '@/server/modules/encomendas/actions'

type Resumo = {
  id: string
  codigo: string
  status: string
  tipoEntrega: string
  dataEntrega: Date | string
  tema: string | null
  cliente: { id: string; nome: string; telefone: string }
  itens: number
  valorTotal: number
  valorSinal: number
  valorPago: number
  saldo: number
  horasRestantes: number
  atrasada: boolean
  urgente: boolean
}

const TOM_STATUS: Record<string, 'neutral' | 'brand' | 'caution' | 'leaf' | 'danger'> = {
  ORCAMENTO: 'neutral',
  CONFIRMADA: 'brand',
  EM_PRODUCAO: 'caution',
  PRONTA: 'leaf',
  ENTREGUE: 'leaf',
  CANCELADA: 'danger',
}

export function CartaoEncomenda({ encomenda: e }: { encomenda: Resumo }) {
  return (
    <li>
      <Link
        href={`/encomendas/${e.id}`}
        className={cn(
          'flex h-full flex-col rounded-card border-l-4 border border-hairline bg-paper p-3.5 transition-shadow hover:shadow-card',
          e.atrasada ? 'border-l-danger' : e.urgente ? 'border-l-caution' : 'border-l-nobru-400',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-body-muted">{e.codigo}</p>
            <p className="truncate text-sm font-bold">{e.cliente.nome}</p>
            <p className="text-xs text-body-muted">{fmtTel(e.cliente.telefone)}</p>
          </div>
          <Badge tone={TOM_STATUS[e.status] ?? 'neutral'}>{rotulo('statusEncomenda', e.status)}</Badge>
        </div>

        <div className="mt-2.5 space-y-1 border-t border-dashed border-hairline pt-2.5 text-xs">
          <p className="flex items-center gap-1.5">
            {e.tipoEntrega === 'ENTREGA' ? <Truck className="size-3.5 text-body-subtle" /> : <UserRound className="size-3.5 text-body-subtle" />}
            {e.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'} em {fmtData(e.dataEntrega)} às {hora(e.dataEntrega)}
          </p>
          {e.tema ? <p className="text-body-muted">Tema: {e.tema}</p> : null}
          <p className="text-body-muted">{numero(e.itens)} item(ns)</p>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <span>
            <span className="block font-display text-base font-extrabold" data-numeric>
              {moeda(e.valorTotal)}
            </span>
            {e.saldo > 0 ? (
              <span className="block text-[11px] font-semibold text-caution" data-numeric>
                falta {moeda(e.saldo)}
              </span>
            ) : (
              <span className="block text-[11px] font-semibold text-leaf">pago</span>
            )}
          </span>
          {!['ENTREGUE', 'CANCELADA'].includes(e.status) ? (
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-bold',
                e.atrasada ? 'text-danger' : e.urgente ? 'text-caution' : 'text-body-subtle',
              )}
            >
              {e.atrasada ? <StatusDot tone="danger" pulse /> : <Clock className="size-3" />}
              {e.atrasada ? `${duracao(Math.abs(e.horasRestantes) * 60)} atrás` : duracao(e.horasRestantes * 60)}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  )
}

type Produto = { id: string; nome: string; sku: string; precoVenda: number }
type Linha = { chave: string; produtoId: string | null; descricao: string; sabor: string; quantidade: number; precoUnitario: number }

/**
 * Nova encomenda.
 *
 * Nasce como **orçamento** — só depois de confirmada é que gera conta a receber
 * e entra na agenda de produção. Esse degrau evita que uma consulta de preço
 * apareça como compromisso para a cozinha.
 */
export function NovaEncomenda({ produtos }: { produtos: Produto[] }) {
  const router = useRouter()
  const [aberto, setAberto] = React.useState(false)
  const [clienteId, setClienteId] = React.useState<string | null>(null)
  const [clienteNome, setClienteNome] = React.useState('')
  const [tipoEntrega, setTipoEntrega] = React.useState<'RETIRADA' | 'ENTREGA'>('RETIRADA')
  const [dataEntrega, setDataEntrega] = React.useState('')
  const [tema, setTema] = React.useState('')
  const [decoracao, setDecoracao] = React.useState('')
  const [observacoes, setObservacoes] = React.useState('')
  const [endereco, setEndereco] = React.useState('')
  const [sinal, setSinal] = React.useState(0)
  const [linhas, setLinhas] = React.useState<Linha[]>([
    { chave: 'l0', produtoId: null, descricao: '', sabor: '', quantidade: 1, precoUnitario: 0 },
  ])

  // Busca de cliente
  const [termo, setTermo] = React.useState('')
  const [resultados, setResultados] = React.useState<Array<{ id: string; nome: string; telefone: string }>>([])
  const [novoTelefone, setNovoTelefone] = React.useState('')
  const debounced = useDebounce(termo, 300)

  const acao = useAcao(salvarEncomenda, {
    sucesso: (d) => `Encomenda ${d.codigo} criada — ${moeda(d.valorTotal)}`,
    aoConcluir: (d) => {
      setAberto(false)
      router.push(`/encomendas/${d.id}`)
    },
  })
  const acaoCliente = useAcao(cadastroRapidoCliente, { sucesso: 'Cliente cadastrado', revalidar: false })

  React.useEffect(() => {
    if (debounced.trim().length < 2) {
      setResultados([])
      return
    }
    let cancelado = false
    buscarClientesAction({ termo: debounced }).then((r) => {
      if (!cancelado && r.ok) setResultados(r.dados)
    })
    return () => {
      cancelado = true
    }
  }, [debounced])

  const total = brl(linhas.reduce((a, l) => a + l.quantidade * l.precoUnitario, 0))

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus />
        Nova encomenda
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent largura="md">
          <SheetHeader>
            <SheetTitle>Nova encomenda</SheetTitle>
            <SheetDescription>
              Começa como orçamento. Ao confirmar, entra na agenda e gera a conta a receber do saldo.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-6">
            <FieldSection titulo="Cliente">
              {clienteId ? (
                <div className="flex items-center justify-between gap-2 rounded-control border border-hairline bg-paper px-3 py-2.5">
                  <span className="text-sm font-semibold">{clienteNome}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClienteId(null)
                      setClienteNome('')
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <SearchInput value={termo} onValueChange={setTermo} placeholder="Buscar cliente por nome ou telefone…" />
                  {acao.erroCampos.clienteId ? (
                    <p className="text-xs font-semibold text-danger">{acao.erroCampos.clienteId}</p>
                  ) : null}
                  {resultados.length > 0 ? (
                    <ul className="divide-y divide-hairline overflow-hidden rounded-control border border-hairline">
                      {resultados.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setClienteId(c.id)
                              setClienteNome(c.nome)
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-paper-sunken"
                          >
                            <span className="text-sm font-semibold">{c.nome}</span>
                            <span className="text-xs text-body-muted">{fmtTel(c.telefone)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {termo.trim().length >= 2 && resultados.length === 0 ? (
                    <div className="space-y-2 rounded-control border border-hairline bg-paper p-3">
                      <p className="text-xs text-body-muted">Nenhum cliente com esse nome. Cadastre agora:</p>
                      <FieldRow>
                        <Field label="Nome" htmlFor="e-novo-nome">
                          <Input id="e-novo-nome" value={termo} onChange={(e) => setTermo(e.target.value)} />
                        </Field>
                        <Field label="WhatsApp" htmlFor="e-novo-tel">
                          <Input id="e-novo-tel" value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} inputMode="tel" />
                        </Field>
                      </FieldRow>
                      <Button
                        size="sm"
                        loading={acaoCliente.pendente}
                        disabled={termo.trim().length < 2 || novoTelefone.replace(/\D/g, '').length < 10}
                        onClick={async () => {
                          const r = await acaoCliente.executar({ nome: termo.trim(), telefone: novoTelefone })
                          if (r.ok) {
                            setClienteId(r.dados.id)
                            setClienteNome(r.dados.nome)
                          }
                        }}
                      >
                        Cadastrar e usar
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </FieldSection>

            <FieldSection titulo="Entrega">
              <SegmentedControl
                value={tipoEntrega}
                onValueChange={setTipoEntrega}
                tamanho="touch"
                opcoes={[
                  { valor: 'RETIRADA', rotulo: 'Retirada na loja', icone: UserRound },
                  { valor: 'ENTREGA', rotulo: 'Entrega', icone: Truck },
                ]}
              />
              <Field label="Data e hora" htmlFor="e-data" erro={acao.erroCampos.dataEntrega} obrigatorio>
                <DateTimeInput id="e-data" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              </Field>
              {tipoEntrega === 'ENTREGA' ? (
                <Field label="Endereço de entrega" htmlFor="e-end" erro={acao.erroCampos.enderecoEntrega} obrigatorio>
                  <Textarea id="e-end" value={endereco} onChange={(e) => setEndereco(e.target.value)} rows={2} />
                </Field>
              ) : null}
            </FieldSection>

            <FieldSection titulo="Itens">
              {acao.erroCampos.itens ? <p className="text-xs font-semibold text-danger">{acao.erroCampos.itens}</p> : null}
              <ul className="space-y-2">
                {linhas.map((l, idx) => (
                  <li key={l.chave} className="rounded-control border border-hairline bg-paper p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Produto do catálogo" htmlFor={`e-p-${idx}`} dica="Opcional — permite gerar ordem de produção.">
                        <Combobox
                          id={`e-p-${idx}`}
                          value={l.produtoId}
                          onValueChange={(v) =>
                            setLinhas((atual) =>
                              atual.map((x, i) => {
                                if (i !== idx) return x
                                const p = produtos.find((g) => g.id === v)
                                return {
                                  ...x,
                                  produtoId: v,
                                  descricao: x.descricao || (p?.nome ?? ''),
                                  precoUnitario: x.precoUnitario || (p?.precoVenda ?? 0),
                                }
                              }),
                            )
                          }
                          permiteLimpar
                          opcoes={produtos.map((p) => ({ valor: p.id, rotulo: p.nome, apoio: p.sku, busca: p.sku }))}
                          placeholder="Item livre"
                        />
                      </Field>
                      <Field label="Descrição" htmlFor={`e-d-${idx}`} obrigatorio>
                        <Input
                          id={`e-d-${idx}`}
                          value={l.descricao}
                          onChange={(e) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, descricao: e.target.value } : x)))}
                          placeholder="50 donuts personalizados"
                        />
                      </Field>
                      <Field label="Sabor / detalhe" htmlFor={`e-s-${idx}`}>
                        <Input
                          id={`e-s-${idx}`}
                          value={l.sabor}
                          onChange={(e) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, sabor: e.target.value } : x)))}
                          placeholder="Nutella"
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Quantidade" htmlFor={`e-q-${idx}`}>
                          <QuantityInput
                            id={`e-q-${idx}`}
                            value={l.quantidade}
                            onValueChange={(v) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, quantidade: v } : x)))}
                            step={1}
                            min={1}
                          />
                        </Field>
                        <Field label="Preço unit." htmlFor={`e-v-${idx}`}>
                          <MoneyInput
                            id={`e-v-${idx}`}
                            value={l.precoUnitario}
                            onValueChange={(v) => setLinhas((atual) => atual.map((x, i) => (i === idx ? { ...x, precoUnitario: v } : x)))}
                          />
                        </Field>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold" data-numeric>
                        {moeda(brl(l.quantidade * l.precoUnitario))}
                      </span>
                      {linhas.length > 1 ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          aria-label="Remover item"
                          onClick={() => setLinhas((atual) => atual.filter((_, i) => i !== idx))}
                        >
                          <Trash2 />
                        </Button>
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
                    { chave: `n${Date.now()}`, produtoId: null, descricao: '', sabor: '', quantidade: 1, precoUnitario: 0 },
                  ])
                }
              >
                <Plus className="size-3.5" />
                Adicionar item
              </Button>
            </FieldSection>

            <FieldSection titulo="Detalhes e valores">
              <FieldRow>
                <Field label="Tema" htmlFor="e-tema">
                  <Input id="e-tema" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Aniversário infantil" />
                </Field>
                <Field label="Sinal combinado" htmlFor="e-sinal" erro={acao.erroCampos.valorSinal}>
                  <MoneyInput id="e-sinal" value={sinal} onValueChange={setSinal} />
                </Field>
              </FieldRow>
              <Field label="Decoração" htmlFor="e-dec">
                <Textarea id="e-dec" value={decoracao} onChange={(e) => setDecoracao(e.target.value)} rows={2} />
              </Field>
              <Field label="Observações" htmlFor="e-obs">
                <Textarea id="e-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
              </Field>

              <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
                <span className="text-sm font-semibold">Total da encomenda</span>
                <span className="font-display text-xl font-extrabold" data-numeric>
                  {moeda(total)}
                </span>
              </div>
            </FieldSection>

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
              disabled={!clienteId || !dataEntrega || linhas.some((l) => !l.descricao || l.quantidade <= 0)}
              onClick={() =>
                acao.executar({
                  clienteId: clienteId!,
                  tipoEntrega,
                  dataEntrega,
                  tema,
                  decoracao,
                  observacoes,
                  enderecoEntrega: endereco,
                  imagensRef: [],
                  valorSinal: sinal,
                  itens: linhas.map((l) => ({
                    produtoId: l.produtoId,
                    descricao: l.descricao,
                    sabor: l.sabor,
                    quantidade: l.quantidade,
                    precoUnitario: l.precoUnitario,
                  })),
                })
              }
            >
              Criar orçamento
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
