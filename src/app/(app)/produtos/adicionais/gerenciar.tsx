'use client'

import * as React from 'react'
import { BadgePercent, Pencil, Plus, Trash2 } from 'lucide-react'

import { moeda, numero, quantidade as fmtQtd } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { excluirAdicional, salvarAdicional } from '@/server/modules/catalogo/actions'

type Adicional = {
  id: string
  nome: string
  preco: number
  custo: number
  ingredienteId: string | null
  quantidadeIngrediente: number
  ordem: number
  ativo: boolean
  ingrediente: { id: string; nome: string; unidade: string; estoqueAtual: number } | null
}

type Ingrediente = { id: string; nome: string; sku: string; unidade: string; custoMedio: number; estoqueAtual: number }

export function GerenciarAdicionais({
  adicionais,
  ingredientes,
  podeGerenciar,
}: {
  adicionais: Adicional[]
  ingredientes: Ingrediente[]
  podeGerenciar: boolean
}) {
  const [editando, setEditando] = React.useState<Adicional | null>(null)
  const [criando, setCriando] = React.useState(false)
  const [excluirAlvo, setExcluirAlvo] = React.useState<Adicional | null>(null)

  const acaoExcluir = useAcao(excluirAdicional, { sucesso: 'Adicional excluído', aoConcluir: () => setExcluirAlvo(null) })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(adicionais.length)}
          </span>{' '}
          adicional(is)
        </p>
        {podeGerenciar ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" />
            Novo adicional
          </Button>
        ) : null}
      </div>

      {adicionais.length === 0 ? (
        <EmptyState
          icone={BadgePercent}
          titulo="Nenhum adicional"
          descricao="Ex.: dose extra de café, calda de Nutella, chantilly, embalagem para presente."
          acao={podeGerenciar ? <Button onClick={() => setCriando(true)}>Criar adicional</Button> : undefined}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Adicional</TH>
                <TH numerico>Preço</TH>
                <TH numerico>Custo</TH>
                <TH>Baixa de estoque</TH>
                <TH>Situação</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {adicionais.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <CellStack principal={a.nome} />
                  </TD>
                  <TD numerico>{moeda(a.preco)}</TD>
                  <TD numerico>{a.custo > 0 ? moeda(a.custo) : <span className="text-body-subtle">—</span>}</TD>
                  <TD>
                    {a.ingrediente ? (
                      <span className="text-xs">
                        {fmtQtd(a.quantidadeIngrediente, a.ingrediente.unidade)} de{' '}
                        <span className="font-semibold">{a.ingrediente.nome}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-body-subtle">sem vínculo</span>
                    )}
                  </TD>
                  <TD>{a.ativo ? <Badge tone="leaf">Ativo</Badge> : <Badge tone="neutral">Inativo</Badge>}</TD>
                  <TD>
                    {podeGerenciar ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${a.nome}`} onClick={() => setEditando(a)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-danger"
                          aria-label={`Excluir ${a.nome}`}
                          onClick={() => setExcluirAlvo(a)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {criando || editando ? (
        <FormularioAdicional
          adicional={editando}
          ingredientes={ingredientes}
          onFechar={() => {
            setCriando(false)
            setEditando(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        aberto={Boolean(excluirAlvo)}
        onAbertoChange={(v) => !v && setExcluirAlvo(null)}
        titulo={`Excluir ${excluirAlvo?.nome}?`}
        descricao="Adicionais já vendidos não podem ser excluídos — desative em vez disso."
        confirmarTexto="Excluir"
        destrutivo
        pendente={acaoExcluir.pendente}
        onConfirmar={() => excluirAlvo && acaoExcluir.executar({ id: excluirAlvo.id })}
      />
    </>
  )
}

function FormularioAdicional({
  adicional,
  ingredientes,
  onFechar,
}: {
  adicional: Adicional | null
  ingredientes: Ingrediente[]
  onFechar: () => void
}) {
  const [nome, setNome] = React.useState(adicional?.nome ?? '')
  const [preco, setPreco] = React.useState(adicional?.preco ?? 0)
  const [custo, setCusto] = React.useState(adicional?.custo ?? 0)
  const [ingredienteId, setIngredienteId] = React.useState<string | null>(adicional?.ingredienteId ?? null)
  const [qtdIngrediente, setQtdIngrediente] = React.useState(adicional?.quantidadeIngrediente ?? 0)
  const [ativo, setAtivo] = React.useState(adicional?.ativo ?? true)

  const acao = useAcao(salvarAdicional, { sucesso: (d) => `${d.nome} salvo`, aoConcluir: onFechar })
  const insumo = ingredienteId ? ingredientes.find((i) => i.id === ingredienteId) : null

  // Vinculado a insumo, o custo vem do custo médio × quantidade.
  React.useEffect(() => {
    if (insumo && qtdIngrediente > 0) {
      setCusto(Math.round(insumo.custoMedio * qtdIngrediente * 100) / 100)
    }
  }, [insumo, qtdIngrediente])

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{adicional ? 'Editar adicional' : 'Novo adicional'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Nome" htmlFor="a-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="a-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus placeholder="Dose extra de café" />
          </Field>
          <FieldRow>
            <Field label="Preço de venda" htmlFor="a-preco" erro={acao.erroCampos.preco} obrigatorio>
              <MoneyInput id="a-preco" value={preco} onValueChange={setPreco} />
            </Field>
            <Field label="Custo" htmlFor="a-custo" dica={insumo ? 'Calculado pelo insumo.' : undefined}>
              <MoneyInput id="a-custo" value={custo} onValueChange={setCusto} disabled={Boolean(insumo)} />
            </Field>
          </FieldRow>

          <Field
            label="Insumo consumido"
            htmlFor="a-insumo"
            dica="Vincule para que a venda deste adicional baixe estoque automaticamente."
          >
            <Combobox
              id="a-insumo"
              value={ingredienteId}
              onValueChange={setIngredienteId}
              permiteLimpar
              opcoes={ingredientes.map((i) => ({
                valor: i.id,
                rotulo: i.nome,
                apoio: `${i.sku} · ${fmtQtd(i.estoqueAtual, i.unidade)} em estoque`,
                busca: i.sku,
              }))}
              placeholder="Sem vínculo de estoque"
            />
          </Field>

          {insumo ? (
            <Field
              label={`Quantidade por adicional (${insumo.unidade.toLowerCase()})`}
              htmlFor="a-qtd"
              erro={acao.erroCampos.quantidadeIngrediente}
              obrigatorio
            >
              <QuantityInput
                id="a-qtd"
                value={qtdIngrediente}
                onValueChange={setQtdIngrediente}
                unidade={insumo.unidade}
                step={insumo.unidade === 'UN' ? 1 : 0.5}
              />
            </Field>
          ) : null}

          <div className="rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha id="a-ativo" checked={ativo} onCheckedChange={setAtivo} label="Ativo" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            onClick={() =>
              acao.executar({
                id: adicional?.id,
                nome,
                preco,
                custo,
                ingredienteId,
                quantidadeIngrediente: qtdIngrediente,
                ordem: adicional?.ordem ?? 0,
                ativo,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
