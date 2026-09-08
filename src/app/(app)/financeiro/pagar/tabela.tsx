'use client'

import * as React from 'react'
import { Ban, Banknote, MoreHorizontal, Pencil, Plus, Repeat } from 'lucide-react'

import { cn } from '@/lib/utils'
import { data as fmtData, moeda, numero, rotulo } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, MoneyInput } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { cancelarContaPagar, pagarConta, salvarContaPagar } from '@/server/modules/financeiro/actions'

type Conta = {
  id: string
  descricao: string
  valor: number
  valorPago: number
  saldo: number
  vencimento: Date | string
  pagoEm: Date | string | null
  status: string
  recorrencia: string | null
  fornecedor: { id: string; nome: string } | null
  categoria: { id: string; nome: string; cor: string } | null
  compra: { id: string; codigo: string } | null
  diasParaVencer: number
}

export function TabelaContasPagar({
  contas,
  categorias,
  fornecedores,
  formas,
  podeGerenciar,
}: {
  contas: Conta[]
  categorias: Array<{ id: string; nome: string }>
  fornecedores: Array<{ id: string; nome: string }>
  formas: Array<{ id: string; nome: string }>
  podeGerenciar: boolean
}) {
  const [formAberto, setFormAberto] = React.useState(false)
  const [editando, setEditando] = React.useState<Conta | null>(null)
  const [pagarAlvo, setPagarAlvo] = React.useState<Conta | null>(null)
  const [cancelarAlvo, setCancelarAlvo] = React.useState<Conta | null>(null)

  const acaoCancelar = useAcao(cancelarContaPagar, {
    sucesso: 'Conta cancelada',
    aoConcluir: () => setCancelarAlvo(null),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(contas.length)}
          </span>{' '}
          conta(s) na página
        </p>
        {podeGerenciar ? (
          <Button
            size="sm"
            onClick={() => {
              setEditando(null)
              setFormAberto(true)
            }}
          >
            <Plus className="size-3.5" />
            Nova conta
          </Button>
        ) : null}
      </div>

      <TableWrap>
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Descrição</TH>
              <TH>Categoria</TH>
              <TH>Vencimento</TH>
              <TH numerico>Valor</TH>
              <TH numerico>Pago</TH>
              <TH numerico>Saldo</TH>
              <TH>Status</TH>
              <TH className="w-10" />
            </TR>
          </THead>
          <TBody>
            {contas.map((c) => (
              <TR key={c.id} className={cn(c.status === 'CANCELADO' && 'opacity-55')}>
                <TD>
                  <CellStack
                    principal={
                      <span className="flex items-center gap-1.5">
                        {c.descricao}
                        {c.recorrencia ? (
                          <span title={`Recorrência ${c.recorrencia.toLowerCase()}`}>
                            <Repeat className="size-3 text-body-subtle" />
                          </span>
                        ) : null}
                      </span>
                    }
                    apoio={c.fornecedor?.nome ?? (c.compra ? `compra ${c.compra.codigo}` : '')}
                  />
                </TD>
                <TD>
                  {c.categoria ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <span className="size-2 rounded-full" style={{ background: c.categoria.cor }} />
                      {c.categoria.nome}
                    </span>
                  ) : (
                    <span className="text-xs text-body-subtle">—</span>
                  )}
                </TD>
                <TD>
                  <span
                    className={cn(
                      'text-sm',
                      c.status === 'ATRASADO' ? 'font-bold text-danger' : c.diasParaVencer <= 3 && c.saldo > 0 ? 'font-semibold text-caution' : '',
                    )}
                  >
                    {fmtData(c.vencimento)}
                  </span>
                  {c.saldo > 0 ? (
                    <span className="block text-[11px] text-body-muted">
                      {c.diasParaVencer < 0 ? `${Math.abs(c.diasParaVencer)}d atrás` : `em ${c.diasParaVencer}d`}
                    </span>
                  ) : null}
                </TD>
                <TD numerico>{moeda(c.valor)}</TD>
                <TD numerico>{c.valorPago > 0 ? moeda(c.valorPago) : '—'}</TD>
                <TD numerico>
                  <span className={c.saldo > 0 ? 'font-bold' : 'text-body-subtle'}>{moeda(c.saldo)}</span>
                </TD>
                <TD>
                  <Badge
                    tone={
                      c.status === 'LIQUIDADO'
                        ? 'leaf'
                        : c.status === 'ATRASADO'
                          ? 'danger'
                          : c.status === 'PARCIAL'
                            ? 'caution'
                            : c.status === 'CANCELADO'
                              ? 'neutral'
                              : 'brand'
                    }
                  >
                    {c.status === 'LIQUIDADO' ? 'Pago' : rotulo('statusConta', c.status)}
                  </Badge>
                </TD>
                <TD>
                  {podeGerenciar ? (
                    <Dropdown>
                      <DropdownTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${c.descricao}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownTrigger>
                      <DropdownContent>
                        {c.saldo > 0 && c.status !== 'CANCELADO' ? (
                          <DropdownItem onSelect={() => setPagarAlvo(c)}>
                            <Banknote />
                            Registrar pagamento
                          </DropdownItem>
                        ) : null}
                        {c.status !== 'LIQUIDADO' && c.status !== 'CANCELADO' ? (
                          <DropdownItem
                            onSelect={() => {
                              setEditando(c)
                              setFormAberto(true)
                            }}
                          >
                            <Pencil />
                            Editar
                          </DropdownItem>
                        ) : null}
                        {c.status !== 'LIQUIDADO' && c.status !== 'CANCELADO' ? (
                          <>
                            <DropdownSeparator />
                            <DropdownItem destrutivo onSelect={() => setCancelarAlvo(c)}>
                              <Ban />
                              Cancelar conta
                            </DropdownItem>
                          </>
                        ) : null}
                      </DropdownContent>
                    </Dropdown>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      {formAberto ? (
        <FormularioConta
          conta={editando}
          categorias={categorias}
          fornecedores={fornecedores}
          onFechar={() => setFormAberto(false)}
        />
      ) : null}

      {pagarAlvo ? <DialogoPagar conta={pagarAlvo} formas={formas} onFechar={() => setPagarAlvo(null)} /> : null}

      <ConfirmDialog
        aberto={Boolean(cancelarAlvo)}
        onAbertoChange={(v) => !v && setCancelarAlvo(null)}
        titulo={`Cancelar "${cancelarAlvo?.descricao}"?`}
        descricao="A conta sai das pendências e não entra no fluxo de caixa."
        confirmarTexto="Cancelar conta"
        destrutivo
        pedirMotivo
        pendente={acaoCancelar.pendente}
        onConfirmar={(motivo) => cancelarAlvo && acaoCancelar.executar({ id: cancelarAlvo.id, motivo: motivo ?? '' })}
      />
    </>
  )
}

function FormularioConta({
  conta,
  categorias,
  fornecedores,
  onFechar,
}: {
  conta: Conta | null
  categorias: Array<{ id: string; nome: string }>
  fornecedores: Array<{ id: string; nome: string }>
  onFechar: () => void
}) {
  const [descricao, setDescricao] = React.useState(conta?.descricao ?? '')
  const [valor, setValor] = React.useState(conta?.valor ?? 0)
  const [vencimento, setVencimento] = React.useState(
    conta ? new Date(conta.vencimento).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  )
  const [fornecedorId, setFornecedorId] = React.useState<string | null>(conta?.fornecedor?.id ?? null)
  const [categoriaId, setCategoriaId] = React.useState<string | null>(conta?.categoria?.id ?? null)
  const [recorrencia, setRecorrencia] = React.useState(conta?.recorrencia ?? '')
  const [observacao, setObservacao] = React.useState('')

  const acao = useAcao(salvarContaPagar, { sucesso: (d) => `${d.descricao} salva`, aoConcluir: onFechar })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{conta ? 'Editar conta' : 'Nova conta a pagar'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Descrição" htmlFor="cp-desc" erro={acao.erroCampos.descricao} obrigatorio>
            <Input
              id="cp-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Aluguel de setembro"
              autoFocus
            />
          </Field>
          <FieldRow>
            <Field label="Valor" htmlFor="cp-valor" erro={acao.erroCampos.valor} obrigatorio>
              <MoneyInput id="cp-valor" value={valor} onValueChange={setValor} />
            </Field>
            <Field label="Vencimento" htmlFor="cp-venc" erro={acao.erroCampos.vencimento} obrigatorio>
              <DateInput id="cp-venc" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </Field>
          </FieldRow>
          <Field label="Categoria" htmlFor="cp-cat">
            <Combobox
              id="cp-cat"
              value={categoriaId}
              onValueChange={setCategoriaId}
              permiteLimpar
              opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
              placeholder="Sem categoria"
            />
          </Field>
          <Field label="Fornecedor" htmlFor="cp-forn">
            <Combobox
              id="cp-forn"
              value={fornecedorId}
              onValueChange={setFornecedorId}
              permiteLimpar
              opcoes={fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))}
              placeholder="Nenhum"
            />
          </Field>
          <Field
            label="Recorrência"
            htmlFor="cp-rec"
            dica="Ao liquidar, o sistema já cria a parcela do próximo período."
          >
            <SelectSimples
              id="cp-rec"
              value={recorrencia || 'nenhuma'}
              onValueChange={(v) => setRecorrencia(v === 'nenhuma' ? '' : v)}
              opcoes={[
                { valor: 'nenhuma', rotulo: 'Sem recorrência' },
                { valor: 'SEMANAL', rotulo: 'Semanal' },
                { valor: 'MENSAL', rotulo: 'Mensal' },
                { valor: 'ANUAL', rotulo: 'Anual' },
              ]}
            />
          </Field>
          <Field label="Observação" htmlFor="cp-obs">
            <Input id="cp-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={descricao.trim().length < 3 || valor <= 0}
            onClick={() =>
              acao.executar({
                id: conta?.id,
                descricao,
                valor,
                vencimento,
                fornecedorId,
                categoriaId,
                recorrencia: (recorrencia || null) as never,
                observacao,
              })
            }
          >
            Salvar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoPagar({
  conta,
  formas,
  onFechar,
}: {
  conta: Conta
  formas: Array<{ id: string; nome: string }>
  onFechar: () => void
}) {
  const [valor, setValor] = React.useState(conta.saldo)
  const [formaId, setFormaId] = React.useState<string | null>(null)
  const [data, setData] = React.useState(new Date().toISOString().slice(0, 10))

  const acao = useAcao(pagarConta, {
    sucesso: (d) => (d.liquidado ? `${d.descricao} paga` : `Pagamento parcial — falta ${moeda(d.saldo)}`),
    aoConcluir: onFechar,
  })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Pagar {conta.descricao}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
            <span className="text-sm font-semibold">Saldo em aberto</span>
            <span className="font-display text-xl font-extrabold" data-numeric>
              {moeda(conta.saldo)}
            </span>
          </div>
          <Field label="Valor pago" htmlFor="pg-valor" erro={acao.erroCampos.valor} obrigatorio>
            <MoneyInput id="pg-valor" value={valor} onValueChange={setValor} autoFocus />
          </Field>
          <FieldRow>
            <Field label="Data do pagamento" htmlFor="pg-data">
              <DateInput id="pg-data" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Field label="Forma" htmlFor="pg-forma">
              <Combobox
                id="pg-forma"
                value={formaId}
                onValueChange={setFormaId}
                permiteLimpar
                opcoes={formas.map((f) => ({ valor: f.id, rotulo: f.nome }))}
                placeholder="Não informada"
              />
            </Field>
          </FieldRow>
          {conta.recorrencia ? (
            <p className="rounded-control bg-info-soft px-3 py-2 text-xs font-medium text-info">
              Conta recorrente ({conta.recorrencia.toLowerCase()}): ao liquidar, a próxima parcela é criada automaticamente.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={valor <= 0}
            onClick={() => acao.executar({ id: conta.id, valor, formaPagamentoId: formaId, data })}
          >
            Registrar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
