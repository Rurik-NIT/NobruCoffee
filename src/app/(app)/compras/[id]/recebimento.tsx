'use client'

import * as React from 'react'
import { Ban, PackageCheck, Send } from 'lucide-react'

import { moeda, quantidade as fmtQtd } from '@/lib/format'
import { brl } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { Panel } from '@/components/patterns/page'
import { CheckboxCampo } from '@/components/ui/toggles'
import { useAcao } from '@/hooks/use-acao'
import { cancelarPedidoCompra, enviarPedidoCompra, registrarRecebimento } from '@/server/modules/compras/actions'

type ItemPendente = {
  id: string
  nome: string
  unidade: string
  pendente: number
  precoUnitario: number
}

/**
 * Recebimento de mercadoria.
 *
 * Vem pré-preenchido com o que falta receber e o preço do pedido — o caso comum
 * é "chegou tudo pelo preço combinado", e esse caso deve ser um clique. Quando
 * chega menos, ou por outro preço, é só corrigir a linha: o preço informado aqui
 * é o que recalcula o custo médio do insumo.
 */
export function PainelRecebimento({
  pedidoId,
  codigo,
  itens,
}: {
  pedidoId: string
  codigo: string
  itens: ItemPendente[]
}) {
  const [linhas, setLinhas] = React.useState(() =>
    Object.fromEntries(
      itens.map((i) => [
        i.id,
        { quantidade: i.pendente, precoUnitario: i.precoUnitario, lote: '', validade: '' },
      ]),
    ),
  )
  const [notaFiscal, setNotaFiscal] = React.useState('')
  const [observacao, setObservacao] = React.useState('')
  const [gerarConta, setGerarConta] = React.useState(true)
  const [dias, setDias] = React.useState(28)

  const acao = useAcao(registrarRecebimento, {
    sucesso: (d) =>
      d.completo
        ? `Compra ${d.codigo} recebida por completo — ${moeda(d.total)} deu entrada no estoque`
        : `Recebimento parcial de ${d.codigo} — ${moeda(d.total)} deu entrada no estoque`,
  })

  const total = brl(Object.values(linhas).reduce((a, l) => a + l.quantidade * l.precoUnitario, 0))
  const aReceber = Object.values(linhas).filter((l) => l.quantidade > 0).length

  return (
    <Panel titulo="Registrar recebimento" descricao="Confira quantidade e preço da nota antes de confirmar.">
      <div className="space-y-3 px-5 py-4">
        {itens.map((i) => {
          const l = linhas[i.id]
          return (
            <div key={i.id} className="rounded-control border border-hairline bg-paper p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{i.nome}</p>
                <p className="text-xs text-body-muted">falta {fmtQtd(i.pendente, i.unidade)}</p>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="Recebido" htmlFor={`r-q-${i.id}`}>
                  <QuantityInput
                    id={`r-q-${i.id}`}
                    value={l.quantidade}
                    onValueChange={(v) => setLinhas((atual) => ({ ...atual, [i.id]: { ...atual[i.id], quantidade: v } }))}
                    unidade={i.unidade}
                    min={0}
                  />
                </Field>
                <Field label="Preço da nota" htmlFor={`r-p-${i.id}`}>
                  <MoneyInput
                    id={`r-p-${i.id}`}
                    value={l.precoUnitario}
                    onValueChange={(v) => setLinhas((atual) => ({ ...atual, [i.id]: { ...atual[i.id], precoUnitario: v } }))}
                  />
                </Field>
                <Field label="Lote" htmlFor={`r-l-${i.id}`}>
                  <Input
                    id={`r-l-${i.id}`}
                    value={l.lote}
                    onChange={(e) => setLinhas((atual) => ({ ...atual, [i.id]: { ...atual[i.id], lote: e.target.value } }))}
                  />
                </Field>
                <Field label="Validade" htmlFor={`r-v-${i.id}`} dica="Obrigatória para insumos perecíveis.">
                  <DateInput
                    id={`r-v-${i.id}`}
                    value={l.validade}
                    onChange={(e) => setLinhas((atual) => ({ ...atual, [i.id]: { ...atual[i.id], validade: e.target.value } }))}
                  />
                </Field>
              </div>
            </div>
          )
        })}

        <FieldRow>
          <Field label="Nota fiscal" htmlFor="r-nf">
            <Input id="r-nf" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
          </Field>
          <Field label="Observação" htmlFor="r-obs">
            <Input id="r-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Field>
        </FieldRow>

        <div className="space-y-2 rounded-control border border-hairline bg-paper p-3">
          <CheckboxCampo
            id="r-conta"
            checked={gerarConta}
            onCheckedChange={setGerarConta}
            label="Gerar conta a pagar"
            descricao="Lança o valor recebido no financeiro, com vencimento em dias."
          />
          {gerarConta ? (
            <Field label="Vencimento em (dias)" htmlFor="r-dias" className="max-w-32">
              <QuantityInput id="r-dias" value={dias} onValueChange={setDias} step={1} />
            </Field>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
          <span className="text-sm font-semibold">Total deste recebimento</span>
          <span className="font-display text-xl font-extrabold" data-numeric>
            {moeda(total)}
          </span>
        </div>

        {acao.erroGeral ? (
          <p className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {acao.erroGeral}
          </p>
        ) : null}

        <Button
          full
          size="lg"
          loading={acao.pendente}
          disabled={aReceber === 0}
          onClick={() =>
            acao.executar({
              pedidoCompraId: pedidoId,
              notaFiscal,
              observacao,
              gerarContaPagar: gerarConta,
              diasVencimento: dias,
              itens: Object.entries(linhas).map(([pedidoCompraItemId, l]) => ({
                pedidoCompraItemId,
                quantidade: l.quantidade,
                precoUnitario: l.precoUnitario,
                lote: l.lote,
                validade: l.validade,
              })),
            })
          }
        >
          <PackageCheck />
          Dar entrada no estoque
        </Button>
        <p className="text-xs text-body-subtle">
          Isto lança as entradas em {codigo}, recalcula o custo médio dos insumos e cria os lotes informados.
        </p>
      </div>
    </Panel>
  )
}

export function AcoesPedidoCompra({
  pedido,
}: {
  pedido: { id: string; codigo: string; status: string }
}) {
  const [cancelarAberto, setCancelarAberto] = React.useState(false)
  const acaoEnviar = useAcao(enviarPedidoCompra, { sucesso: (d) => `Pedido ${d.codigo} marcado como enviado` })
  const acaoCancelar = useAcao(cancelarPedidoCompra, {
    sucesso: 'Pedido cancelado',
    aoConcluir: () => setCancelarAberto(false),
  })

  return (
    <>
      {pedido.status === 'RASCUNHO' ? (
        <Button size="sm" loading={acaoEnviar.pendente} onClick={() => acaoEnviar.executar({ id: pedido.id })}>
          <Send className="size-3.5" />
          Marcar como enviado
        </Button>
      ) : null}
      {pedido.status === 'RASCUNHO' || pedido.status === 'ENVIADO' ? (
        <Button variant="ghost" size="sm" className="text-danger" onClick={() => setCancelarAberto(true)}>
          <Ban className="size-3.5" />
          Cancelar
        </Button>
      ) : null}

      <ConfirmDialog
        aberto={cancelarAberto}
        onAbertoChange={setCancelarAberto}
        titulo={`Cancelar a compra ${pedido.codigo}?`}
        descricao="O pedido sai da lista de pendências. Nenhum estoque é alterado."
        confirmarTexto="Cancelar compra"
        destrutivo
        pedirMotivo
        pendente={acaoCancelar.pendente}
        onConfirmar={(motivo) => acaoCancelar.executar({ id: pedido.id, motivo: motivo ?? '' })}
      />
    </>
  )
}
