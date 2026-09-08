'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, Trash2 } from 'lucide-react'

import { decimal, numero } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, QuantityInput } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAcao } from '@/hooks/use-acao'
import { criarOrdemProducao } from '@/server/modules/producao/actions'

export type Sugestao = {
  produtoId: string
  nome: string
  sku: string
  mediaDiaria: number
  estoque: number
  sugestao: number
}

/**
 * Nova ordem de produção.
 *
 * Abre já preenchida com a sugestão do sistema: média vendida nos últimos 7
 * dias menos o que sobrou em estoque. O padeiro ajusta os números em vez de
 * começar de uma folha em branco às 6 da manhã.
 */
export function NovaOrdem({ sugestoes }: { sugestoes: Sugestao[] }) {
  const router = useRouter()
  const [aberto, setAberto] = React.useState(false)
  const [data, setData] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [turno, setTurno] = React.useState('Manhã')
  const [observacao, setObservacao] = React.useState('')
  const [quantidades, setQuantidades] = React.useState<Record<string, number>>({})

  const acao = useAcao(criarOrdemProducao, {
    sucesso: (d) => `Ordem ${d.codigo} criada`,
    aoConcluir: (d) => {
      setAberto(false)
      router.push(`/producao/ordens/${d.id}`)
    },
  })

  function abrir() {
    // Pré-carrega com a sugestão — quem discorda ajusta, quem concorda confirma.
    setQuantidades(Object.fromEntries(sugestoes.filter((s) => s.sugestao > 0).map((s) => [s.produtoId, s.sugestao])))
    setAberto(true)
  }

  const selecionados = Object.entries(quantidades).filter(([, q]) => q > 0)
  const totalUnidades = selecionados.reduce((a, [, q]) => a + q, 0)

  return (
    <>
      <Button onClick={abrir}>
        <Plus />
        Nova ordem
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent largura="md">
          <SheetHeader>
            <SheetTitle>Nova ordem de produção</SheetTitle>
            <SheetDescription>
              A sugestão vem da média diária dos últimos 7 dias, descontando o que sobrou em estoque.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-6">
            <FieldRow>
              <Field label="Data da produção" htmlFor="op-data" erro={acao.erroCampos.data} obrigatorio>
                <DateInput id="op-data" value={data} onChange={(e) => setData(e.target.value)} />
              </Field>
              <Field label="Turno" htmlFor="op-turno">
                <Input id="op-turno" value={turno} onChange={(e) => setTurno(e.target.value)} placeholder="Manhã" />
              </Field>
            </FieldRow>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="eyebrow">Produtos</p>
                {sugestoes.some((s) => s.sugestao > 0) ? (
                  <button
                    type="button"
                    onClick={() =>
                      setQuantidades(
                        Object.fromEntries(sugestoes.filter((s) => s.sugestao > 0).map((s) => [s.produtoId, s.sugestao])),
                      )
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-nobru-600 hover:underline"
                  >
                    <Sparkles className="size-3.5" />
                    Usar a sugestão
                  </button>
                ) : null}
              </div>

              {acao.erroCampos.itens ? <p className="mb-2 text-xs font-semibold text-danger">{acao.erroCampos.itens}</p> : null}

              {sugestoes.length === 0 ? (
                <p className="rounded-control border border-hairline bg-paper px-3 py-4 text-sm text-body-muted">
                  Nenhum produto de produção própria com ficha técnica ativa. Crie a ficha técnica antes de planejar a
                  produção.
                </p>
              ) : (
                <ul className="divide-y divide-hairline overflow-hidden rounded-control border border-hairline">
                  {sugestoes.map((s) => (
                    <li key={s.produtoId} className="flex items-center gap-3 bg-paper px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s.nome}</p>
                        <p className="text-xs text-body-muted">
                          média {decimal(s.mediaDiaria)}/dia · estoque {decimal(s.estoque)}
                          {s.sugestao > 0 ? (
                            <Badge tone="brand" size="sm" className="ml-1.5">
                              sugerido {numero(s.sugestao)}
                            </Badge>
                          ) : null}
                        </p>
                      </div>
                      <div className="w-28 shrink-0">
                        <QuantityInput
                          value={quantidades[s.produtoId] ?? 0}
                          onValueChange={(v) => setQuantidades((atual) => ({ ...atual, [s.produtoId]: v }))}
                          step={1}
                          min={0}
                        />
                      </div>
                      {quantidades[s.produtoId] ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          aria-label={`Remover ${s.nome}`}
                          onClick={() => setQuantidades((atual) => ({ ...atual, [s.produtoId]: 0 }))}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="Observação" htmlFor="op-obs">
              <Input id="op-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </Field>

            {selecionados.length > 0 ? (
              <p className="rounded-control bg-paper-sunken px-3 py-2.5 text-sm">
                <span className="font-bold" data-numeric>
                  {numero(selecionados.length)}
                </span>{' '}
                produto(s),{' '}
                <span className="font-bold" data-numeric>
                  {numero(totalUnidades)}
                </span>{' '}
                unidade(s). O consumo de insumos é calculado ao concluir a ordem.
              </p>
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
              disabled={selecionados.length === 0}
              onClick={() =>
                acao.executar({
                  data,
                  turno,
                  observacao,
                  itens: selecionados.map(([produtoId, quantidadePlanejada]) => ({ produtoId, quantidadePlanejada })),
                })
              }
            >
              Criar ordem
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
