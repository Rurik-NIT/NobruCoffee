'use client'

import * as React from 'react'
import { Ban, CheckCircle2, ChefHat, Save } from 'lucide-react'

import { cn } from '@/lib/utils'
import { decimal, moeda, percentual } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { QuantityInput } from '@/components/ui/input'
import { Panel } from '@/components/patterns/page'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { apontarProducao, cancelarOrdem, concluirOrdem, iniciarOrdem } from '@/server/modules/producao/actions'

type Item = {
  id: string
  produto: string
  sku: string
  quantidadePlanejada: number
  quantidadeProduzida: number
  quantidadePerdida: number
  custoUnitario: number
}

/**
 * Apontamento da produção.
 *
 * O padeiro digita o que saiu do forno e o que perdeu; nada muda no estoque até
 * "Concluir". É esse botão que consome os insumos (pelo total que foi ao forno,
 * inclusive o que queimou) e dá entrada nos acabados — em uma transação só.
 */
export function PainelApontamento({
  ordem,
  podeGerenciar,
}: {
  ordem: {
    id: string
    codigo: string
    status: string
    custoEstimado: number
    custoReal: number
    itens: Item[]
  }
  podeGerenciar: boolean
}) {
  const [valores, setValores] = React.useState<Record<string, { produzida: number; perdida: number }>>(() =>
    Object.fromEntries(
      ordem.itens.map((i) => [i.id, { produzida: i.quantidadeProduzida, perdida: i.quantidadePerdida }]),
    ),
  )
  const [concluirAberto, setConcluirAberto] = React.useState(false)
  const [cancelarAberto, setCancelarAberto] = React.useState(false)

  const acaoIniciar = useAcao(iniciarOrdem, { sucesso: (d) => `Ordem ${d.codigo} iniciada` })
  const acaoApontar = useAcao(apontarProducao, { sucesso: 'Apontamento salvo' })
  const acaoConcluir = useAcao(concluirOrdem, {
    sucesso: (d) => `Ordem ${d.codigo} concluída — ${decimal(d.produzido)} un, custo ${moeda(d.custoReal)}`,
    aoConcluir: () => setConcluirAberto(false),
  })
  const acaoCancelar = useAcao(cancelarOrdem, { sucesso: 'Ordem cancelada', aoConcluir: () => setCancelarAberto(false) })

  const encerrada = ordem.status === 'CONCLUIDA' || ordem.status === 'CANCELADA'
  const editavel = podeGerenciar && !encerrada

  const totalProduzido = Object.values(valores).reduce((a, v) => a + v.produzida, 0)
  const totalPerdido = Object.values(valores).reduce((a, v) => a + v.perdida, 0)
  const totalPlanejado = ordem.itens.reduce((a, i) => a + i.quantidadePlanejada, 0)

  return (
    <>
      <Panel
        titulo="Apontamento"
        descricao={
          encerrada
            ? 'Ordem encerrada — os números abaixo são o registro final.'
            : 'Digite o que saiu do forno e o que se perdeu. O estoque só muda ao concluir.'
        }
        acao={
          editavel ? (
            <div className="flex flex-wrap gap-2">
              {ordem.status === 'PLANEJADA' ? (
                <Button variant="secondary" size="sm" loading={acaoIniciar.pendente} onClick={() => acaoIniciar.executar({ id: ordem.id })}>
                  <ChefHat className="size-3.5" />
                  Iniciar
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                loading={acaoApontar.pendente}
                onClick={() =>
                  acaoApontar.executar({
                    ordemId: ordem.id,
                    itens: ordem.itens.map((i) => ({
                      itemId: i.id,
                      quantidadeProduzida: valores[i.id]?.produzida ?? 0,
                      quantidadePerdida: valores[i.id]?.perdida ?? 0,
                    })),
                  })
                }
              >
                <Save className="size-3.5" />
                Salvar
              </Button>
              <Button size="sm" disabled={totalProduzido + totalPerdido <= 0} onClick={() => setConcluirAberto(true)}>
                <CheckCircle2 className="size-3.5" />
                Concluir
              </Button>
            </div>
          ) : null
        }
      >
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Produto</TH>
                <TH numerico>Planejado</TH>
                <TH numerico>Produzido</TH>
                <TH numerico>Perdido</TH>
                <TH numerico>Aproveitamento</TH>
                <TH numerico>Custo/un</TH>
              </TR>
            </THead>
            <TBody>
              {ordem.itens.map((i) => {
                const v = valores[i.id] ?? { produzida: 0, perdida: 0 }
                const total = v.produzida + v.perdida
                const aproveitamento = total > 0 ? (v.produzida / total) * 100 : null
                return (
                  <TR key={i.id}>
                    <TD>
                      <span className="text-sm font-semibold">{i.produto}</span>
                      <span className="block text-xs text-body-muted">{i.sku}</span>
                    </TD>
                    <TD numerico>{decimal(i.quantidadePlanejada)}</TD>
                    <TD numerico>
                      {editavel ? (
                        <div className="ml-auto w-24">
                          <QuantityInput
                            value={v.produzida}
                            onValueChange={(val) =>
                              setValores((atual) => ({ ...atual, [i.id]: { ...atual[i.id], produzida: val } }))
                            }
                            step={1}
                            min={0}
                          />
                        </div>
                      ) : (
                        decimal(i.quantidadeProduzida)
                      )}
                    </TD>
                    <TD numerico>
                      {editavel ? (
                        <div className="ml-auto w-24">
                          <QuantityInput
                            value={v.perdida}
                            onValueChange={(val) =>
                              setValores((atual) => ({ ...atual, [i.id]: { ...atual[i.id], perdida: val } }))
                            }
                            step={1}
                            min={0}
                          />
                        </div>
                      ) : i.quantidadePerdida > 0 ? (
                        <span className="font-bold text-danger">{decimal(i.quantidadePerdida)}</span>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD numerico>
                      {aproveitamento === null ? (
                        '—'
                      ) : (
                        <span className={cn('font-bold', aproveitamento >= 95 ? 'text-leaf' : aproveitamento >= 85 ? '' : 'text-danger')}>
                          {percentual(aproveitamento)}
                        </span>
                      )}
                    </TD>
                    <TD numerico>{i.custoUnitario > 0 ? moeda(i.custoUnitario) : '—'}</TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </TableWrap>

        <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline sm:grid-cols-4">
          {[
            { r: 'Planejado', v: decimal(totalPlanejado) },
            { r: 'Produzido', v: decimal(totalProduzido) },
            { r: 'Custo previsto', v: moeda(ordem.custoEstimado) },
            { r: 'Custo real', v: ordem.custoReal > 0 ? moeda(ordem.custoReal) : '—' },
          ].map((i) => (
            <div key={i.r} className="px-4 py-3">
              <p className="eyebrow">{i.r}</p>
              <p className="mt-1 font-display text-lg font-extrabold" data-numeric>
                {i.v}
              </p>
            </div>
          ))}
        </div>

        {editavel ? (
          <div className="border-t border-hairline px-4 py-3">
            <Button variant="ghost" size="sm" className="text-danger" onClick={() => setCancelarAberto(true)}>
              <Ban className="size-3.5" />
              Cancelar ordem
            </Button>
          </div>
        ) : null}
      </Panel>

      <ConfirmDialog
        aberto={concluirAberto}
        onAbertoChange={setConcluirAberto}
        titulo={`Concluir a ordem ${ordem.codigo}?`}
        descricao={
          <>
            Isto consome os insumos das fichas técnicas pelo total que foi ao forno ({decimal(totalProduzido + totalPerdido)}{' '}
            un, incluindo {decimal(totalPerdido)} de perda) e dá entrada de {decimal(totalProduzido)} un no estoque de
            acabados. Não há como desfazer automaticamente.
          </>
        }
        confirmarTexto="Concluir e movimentar estoque"
        pendente={acaoConcluir.pendente}
        onConfirmar={() => acaoConcluir.executar({ id: ordem.id })}
      />

      <ConfirmDialog
        aberto={cancelarAberto}
        onAbertoChange={setCancelarAberto}
        titulo={`Cancelar a ordem ${ordem.codigo}?`}
        descricao="A ordem sai do planejamento. Nenhum estoque é movimentado."
        confirmarTexto="Cancelar ordem"
        destrutivo
        pedirMotivo
        pendente={acaoCancelar.pendente}
        onConfirmar={(motivo) => acaoCancelar.executar({ id: ordem.id, motivo: motivo ?? '' })}
      />
    </>
  )
}
