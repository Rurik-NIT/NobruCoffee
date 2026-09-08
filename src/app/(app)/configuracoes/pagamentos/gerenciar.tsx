'use client'

import * as React from 'react'
import { CreditCard, Pencil, Plus, Power, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda, numero, percentual, rotulo } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { alternarFormaPagamento, excluirFormaPagamento, salvarFormaPagamento } from '@/server/modules/configuracoes/actions'

type Forma = {
  id: string
  nome: string
  tipo: string
  taxaPercentual: number
  taxaFixa: number
  prazoRecebimentoDias: number
  contaNoCaixa: boolean
  permiteTroco: boolean
  ordem: number
  ativo: boolean
  usos: number
}

const TIPOS = [
  { valor: 'DINHEIRO', rotulo: 'Dinheiro' },
  { valor: 'PIX', rotulo: 'PIX' },
  { valor: 'DEBITO', rotulo: 'Débito' },
  { valor: 'CREDITO', rotulo: 'Crédito' },
  { valor: 'VOUCHER', rotulo: 'Voucher / benefício' },
  { valor: 'FIADO', rotulo: 'Fiado (a receber)' },
  { valor: 'OUTRO', rotulo: 'Outro' },
]

export function GerenciarFormas({ formas, podeGerenciar }: { formas: Forma[]; podeGerenciar: boolean }) {
  const [editando, setEditando] = React.useState<Forma | null>(null)
  const [criando, setCriando] = React.useState(false)
  const [excluirAlvo, setExcluirAlvo] = React.useState<Forma | null>(null)

  const acaoAlternar = useAcao(alternarFormaPagamento, {
    sucesso: (d) => (d.ativo ? `${d.nome} ativada` : `${d.nome} desativada`),
  })
  const acaoExcluir = useAcao(excluirFormaPagamento, { sucesso: 'Forma excluída', aoConcluir: () => setExcluirAlvo(null) })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(formas.filter((f) => f.ativo).length)}
          </span>{' '}
          ativa(s) de {numero(formas.length)}
        </p>
        {podeGerenciar ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" />
            Nova forma
          </Button>
        ) : null}
      </div>

      {formas.length === 0 ? (
        <EmptyState icone={CreditCard} titulo="Nenhuma forma de pagamento" descricao="O PDV precisa de ao menos uma forma ativa." />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Forma</TH>
                <TH>Tipo</TH>
                <TH numerico>Taxa</TH>
                <TH numerico>Prazo</TH>
                <TH>Comportamento</TH>
                <TH numerico>Usos</TH>
                <TH>Situação</TH>
                <TH className="w-24" />
              </TR>
            </THead>
            <TBody>
              {formas.map((f) => (
                <TR key={f.id} className={cn(!f.ativo && 'opacity-55')}>
                  <TD>
                    <span className="text-sm font-semibold">{f.nome}</span>
                  </TD>
                  <TD>
                    <span className="text-xs text-body-muted">{rotulo('tipoFormaPagamento', f.tipo)}</span>
                  </TD>
                  <TD numerico>
                    {f.taxaPercentual > 0 || f.taxaFixa > 0 ? (
                      <span className="text-xs">
                        {f.taxaPercentual > 0 ? percentual(f.taxaPercentual) : ''}
                        {f.taxaFixa > 0 ? ` + ${moeda(f.taxaFixa)}` : ''}
                      </span>
                    ) : (
                      <span className="text-body-subtle">—</span>
                    )}
                  </TD>
                  <TD numerico>{f.prazoRecebimentoDias > 0 ? `${f.prazoRecebimentoDias}d` : 'à vista'}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {f.contaNoCaixa ? (
                        <Badge tone="leaf" size="sm">
                          conta na gaveta
                        </Badge>
                      ) : null}
                      {f.permiteTroco ? (
                        <Badge tone="neutral" size="sm">
                          dá troco
                        </Badge>
                      ) : null}
                      {f.tipo === 'FIADO' ? (
                        <Badge tone="caution" size="sm">
                          gera a receber
                        </Badge>
                      ) : null}
                    </div>
                  </TD>
                  <TD numerico>{numero(f.usos)}</TD>
                  <TD>{f.ativo ? <Badge tone="leaf">Ativa</Badge> : <Badge tone="neutral">Inativa</Badge>}</TD>
                  <TD>
                    {podeGerenciar ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${f.nome}`} onClick={() => setEditando(f)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.ativo ? 'Desativar' : 'Ativar'} ${f.nome}`}
                          onClick={() => acaoAlternar.executar({ id: f.id, ativo: !f.ativo })}
                        >
                          <Power />
                        </Button>
                        {f.usos === 0 ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-danger"
                            aria-label={`Excluir ${f.nome}`}
                            onClick={() => setExcluirAlvo(f)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
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
        <FormularioForma
          forma={editando}
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
        descricao="Formas já usadas em vendas não podem ser excluídas — desative em vez disso."
        confirmarTexto="Excluir"
        destrutivo
        pendente={acaoExcluir.pendente}
        onConfirmar={() => excluirAlvo && acaoExcluir.executar({ id: excluirAlvo.id })}
      />
    </>
  )
}

function FormularioForma({ forma, onFechar }: { forma: Forma | null; onFechar: () => void }) {
  const [nome, setNome] = React.useState(forma?.nome ?? '')
  const [tipo, setTipo] = React.useState(forma?.tipo ?? 'DEBITO')
  const [taxaPercentual, setTaxaPercentual] = React.useState(forma?.taxaPercentual ?? 0)
  const [taxaFixa, setTaxaFixa] = React.useState(forma?.taxaFixa ?? 0)
  const [prazo, setPrazo] = React.useState(forma?.prazoRecebimentoDias ?? 0)
  const [contaNoCaixa, setContaNoCaixa] = React.useState(forma?.contaNoCaixa ?? false)
  const [permiteTroco, setPermiteTroco] = React.useState(forma?.permiteTroco ?? false)
  const [ordem, setOrdem] = React.useState(forma?.ordem ?? 0)
  const [ativo, setAtivo] = React.useState(forma?.ativo ?? true)

  const acao = useAcao(salvarFormaPagamento, { sucesso: (d) => `${d.nome} salva`, aoConcluir: onFechar })
  const ehDinheiro = tipo === 'DINHEIRO'

  React.useEffect(() => {
    if (ehDinheiro) {
      setContaNoCaixa(true)
      setPermiteTroco(true)
    }
  }, [ehDinheiro])

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{forma ? `Editar ${forma.nome}` : 'Nova forma de pagamento'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Nome" htmlFor="fp-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="fp-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Crédito parcelado" autoFocus />
          </Field>
          <Field label="Tipo" htmlFor="fp-tipo" obrigatorio>
            <SelectSimples id="fp-tipo" value={tipo} onValueChange={setTipo} opcoes={TIPOS} />
          </Field>
          <FieldRow>
            <Field label="Taxa da adquirente (%)" htmlFor="fp-txp">
              <QuantityInput id="fp-txp" value={taxaPercentual} onValueChange={setTaxaPercentual} unidade="%" step={0.1} />
            </Field>
            <Field label="Taxa fixa por transação" htmlFor="fp-txf">
              <MoneyInput id="fp-txf" value={taxaFixa} onValueChange={setTaxaFixa} />
            </Field>
          </FieldRow>
          <Field label="Prazo de recebimento (dias)" htmlFor="fp-prazo" className="max-w-40" dica="0 = à vista.">
            <QuantityInput id="fp-prazo" value={prazo} onValueChange={setPrazo} step={1} />
          </Field>
          <div className="divide-y divide-hairline rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha
              id="fp-gaveta"
              checked={contaNoCaixa}
              onCheckedChange={setContaNoCaixa}
              label="Conta na gaveta"
              descricao="Ligado: entra na conferência de dinheiro em espécie do fechamento de caixa."
              disabled={ehDinheiro}
            />
            <SwitchLinha
              id="fp-troco"
              checked={permiteTroco}
              onCheckedChange={setPermiteTroco}
              label="Dá troco"
              descricao="Ligado: o PDV pede o valor recebido e calcula o troco."
              disabled={ehDinheiro}
            />
            <SwitchLinha id="fp-ativo" checked={ativo} onCheckedChange={setAtivo} label="Ativa no PDV" />
          </div>
          <Field label="Ordem no PDV" htmlFor="fp-ordem" className="max-w-32" dica="Menor primeiro.">
            <QuantityInput id="fp-ordem" value={ordem} onValueChange={setOrdem} step={1} />
          </Field>
          {ehDinheiro ? (
            <p className="rounded-control bg-info-soft px-3 py-2 text-xs font-medium text-info">
              Dinheiro sempre conta na gaveta e sempre dá troco — o sistema fixa essas duas regras.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={nome.trim().length < 2}
            onClick={() =>
              acao.executar({
                id: forma?.id,
                nome,
                tipo: tipo as never,
                taxaPercentual,
                taxaFixa,
                prazoRecebimentoDias: prazo,
                contaNoCaixa,
                permiteTroco,
                ordem,
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
