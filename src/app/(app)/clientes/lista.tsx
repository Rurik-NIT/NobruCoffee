'use client'

import * as React from 'react'
import Link from 'next/link'
import { Archive, Cake, Gift, MoreHorizontal, Pencil, Plus, Sparkles, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { data as fmtData, moeda, numero, telefone as fmtTel } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field, FieldRow, FieldSection } from '@/components/ui/field'
import { DateInput, Input, Textarea } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SwitchLinha } from '@/components/ui/toggles'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { PaginacaoUrl } from '@/components/patterns/filtros'
import { useAcao } from '@/hooks/use-acao'
import {
  ajustarPontos,
  arquivarCliente,
  emitirCupomAniversario,
  obterClienteAction,
  salvarCliente,
} from '@/server/modules/clientes/actions'

type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string | null
  dataNascimento: Date | string | null
  pontos: number
  totalGasto: number
  totalPedidos: number
  ticketMedio: number
  ultimaCompraEm: Date | string | null
  diasSemComprar: number | null
  ativo: boolean
  cidade: string | null
}

export function ListaClientes({
  dados,
  permissoes,
}: {
  dados: { itens: Cliente[]; total: number; pagina: number; porPagina: number }
  permissoes: { gerenciar: boolean; fidelidade: boolean }
}) {
  const [formAberto, setFormAberto] = React.useState(false)
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [pontosAlvo, setPontosAlvo] = React.useState<Cliente | null>(null)

  const acaoArquivar = useAcao(arquivarCliente, {
    sucesso: (d) => (d.ativo ? `${d.nome} reativado` : `${d.nome} arquivado`),
  })
  const acaoCupom = useAcao(emitirCupomAniversario, {
    sucesso: (d) => `Cupom ${d.codigo} emitido para ${d.cliente}`,
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(dados.total)}
          </span>{' '}
          cliente(s)
        </p>
        {permissoes.gerenciar ? (
          <Button
            size="sm"
            onClick={() => {
              setEditandoId(null)
              setFormAberto(true)
            }}
          >
            <Plus className="size-3.5" />
            Novo cliente
          </Button>
        ) : null}
      </div>

      {dados.itens.length === 0 ? (
        <EmptyState
          icone={UserRound}
          titulo="Nenhum cliente encontrado"
          descricao="O cadastro pode ser feito no PDV em dois campos: nome e WhatsApp."
          acao={
            permissoes.gerenciar ? (
              <Button
                onClick={() => {
                  setEditandoId(null)
                  setFormAberto(true)
                }}
              >
                <Plus />
                Cadastrar cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Cliente</TH>
                  <TH>WhatsApp</TH>
                  <TH numerico>Pedidos</TH>
                  <TH numerico>Total gasto</TH>
                  <TH numerico>Ticket médio</TH>
                  <TH numerico>Pontos</TH>
                  <TH>Última compra</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {dados.itens.map((c) => (
                  <TR key={c.id} className={cn(!c.ativo && 'opacity-55')}>
                    <TD>
                      <Link href={`/clientes/${c.id}`} className="hover:underline">
                        <CellStack
                          principal={c.nome}
                          apoio={
                            <>
                              {c.email ?? ''}
                              {c.cidade ? (c.email ? ` · ${c.cidade}` : c.cidade) : ''}
                            </>
                          }
                        />
                      </Link>
                    </TD>
                    <TD>
                      <a
                        href={`https://wa.me/55${c.telefone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-body-muted hover:text-nobru-600 hover:underline"
                      >
                        {fmtTel(c.telefone)}
                      </a>
                    </TD>
                    <TD numerico>{numero(c.totalPedidos)}</TD>
                    <TD numerico>{moeda(c.totalGasto)}</TD>
                    <TD numerico>{moeda(c.ticketMedio)}</TD>
                    <TD numerico>
                      {c.pontos > 0 ? <span className="font-bold text-nobru-600">{numero(c.pontos)}</span> : '—'}
                    </TD>
                    <TD>
                      {c.ultimaCompraEm ? (
                        <span className="text-xs">
                          {fmtData(c.ultimaCompraEm)}
                          {c.diasSemComprar !== null && c.diasSemComprar > 60 ? (
                            <Badge tone="caution" size="sm" className="ml-1.5">
                              {c.diasSemComprar}d
                            </Badge>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-body-subtle">nunca comprou</span>
                      )}
                    </TD>
                    <TD>
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${c.nome}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem asChild>
                            <Link href={`/clientes/${c.id}`}>
                              <UserRound />
                              Ver ficha
                            </Link>
                          </DropdownItem>
                          {permissoes.gerenciar ? (
                            <DropdownItem
                              onSelect={() => {
                                setEditandoId(c.id)
                                setFormAberto(true)
                              }}
                            >
                              <Pencil />
                              Editar
                            </DropdownItem>
                          ) : null}
                          {permissoes.fidelidade ? (
                            <>
                              <DropdownSeparator />
                              <DropdownItem onSelect={() => setPontosAlvo(c)}>
                                <Sparkles />
                                Ajustar pontos
                              </DropdownItem>
                              {c.dataNascimento ? (
                                <DropdownItem onSelect={() => acaoCupom.executar({ clienteId: c.id })}>
                                  <Gift />
                                  Emitir cupom de aniversário
                                </DropdownItem>
                              ) : null}
                            </>
                          ) : null}
                          {permissoes.gerenciar ? (
                            <>
                              <DropdownSeparator />
                              <DropdownItem onSelect={() => acaoArquivar.executar({ id: c.id, ativo: !c.ativo })}>
                                <Archive />
                                {c.ativo ? 'Arquivar' : 'Reativar'}
                              </DropdownItem>
                            </>
                          ) : null}
                        </DropdownContent>
                      </Dropdown>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <PaginacaoUrl pagina={dados.pagina} porPagina={dados.porPagina} total={dados.total} />
        </>
      )}

      {formAberto ? <FormularioCliente clienteId={editandoId} onFechar={() => setFormAberto(false)} /> : null}
      {pontosAlvo ? <DialogoPontos cliente={pontosAlvo} onFechar={() => setPontosAlvo(null)} /> : null}
    </>
  )
}

function FormularioCliente({ clienteId, onFechar }: { clienteId: string | null; onFechar: () => void }) {
  const [carregando, setCarregando] = React.useState(Boolean(clienteId))
  const [f, setF] = React.useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    dataNascimento: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    observacoes: '',
    ativo: true,
  })

  const acao = useAcao(salvarCliente, { sucesso: (d) => `${d.nome} salvo`, aoConcluir: onFechar })

  React.useEffect(() => {
    if (!clienteId) return
    let cancelado = false
    obterClienteAction({ id: clienteId }).then((r) => {
      if (!cancelado && r.ok) {
        const { id: _id, ...resto } = r.dados
        setF(resto)
      }
      if (!cancelado) setCarregando(false)
    })
    return () => {
      cancelado = true
    }
  }, [clienteId])

  function campo<K extends keyof typeof f>(chave: K, valor: (typeof f)[K]) {
    setF((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onFechar()}>
      <SheetContent largura="sm">
        <SheetHeader>
          <SheetTitle>{clienteId ? 'Editar cliente' : 'Novo cliente'}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-6">
          {carregando ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <>
              <FieldSection titulo="Identificação">
                <Field label="Nome" htmlFor="c-nome" erro={acao.erroCampos.nome} obrigatorio>
                  <Input id="c-nome" value={f.nome} onChange={(e) => campo('nome', e.target.value)} autoFocus />
                </Field>
                <FieldRow>
                  <Field label="WhatsApp" htmlFor="c-tel" erro={acao.erroCampos.telefone} obrigatorio dica="É a chave do cliente no balcão.">
                    <Input id="c-tel" value={f.telefone} onChange={(e) => campo('telefone', e.target.value)} inputMode="tel" />
                  </Field>
                  <Field label="Aniversário" htmlFor="c-nasc" dica="Habilita o cupom de aniversário.">
                    <DateInput id="c-nasc" value={f.dataNascimento} onChange={(e) => campo('dataNascimento', e.target.value)} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="E-mail" htmlFor="c-email" erro={acao.erroCampos.email}>
                    <Input id="c-email" value={f.email} onChange={(e) => campo('email', e.target.value)} inputMode="email" />
                  </Field>
                  <Field label="CPF" htmlFor="c-cpf" erro={acao.erroCampos.cpf}>
                    <Input id="c-cpf" value={f.cpf} onChange={(e) => campo('cpf', e.target.value)} inputMode="numeric" />
                  </Field>
                </FieldRow>
              </FieldSection>

              <FieldSection titulo="Endereço" descricao="Usado em entregas e encomendas.">
                <FieldRow>
                  <Field label="CEP" htmlFor="c-cep">
                    <Input id="c-cep" value={f.cep} onChange={(e) => campo('cep', e.target.value)} inputMode="numeric" />
                  </Field>
                  <Field label="Bairro" htmlFor="c-bairro">
                    <Input id="c-bairro" value={f.bairro} onChange={(e) => campo('bairro', e.target.value)} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Logradouro" htmlFor="c-log">
                    <Input id="c-log" value={f.logradouro} onChange={(e) => campo('logradouro', e.target.value)} />
                  </Field>
                  <Field label="Número" htmlFor="c-num" className="max-w-32">
                    <Input id="c-num" value={f.numero} onChange={(e) => campo('numero', e.target.value)} />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Complemento" htmlFor="c-comp">
                    <Input id="c-comp" value={f.complemento} onChange={(e) => campo('complemento', e.target.value)} />
                  </Field>
                  <Field label="Cidade" htmlFor="c-cid">
                    <Input id="c-cid" value={f.cidade} onChange={(e) => campo('cidade', e.target.value)} />
                  </Field>
                </FieldRow>
                <Field label="UF" htmlFor="c-uf" className="max-w-24">
                  <Input id="c-uf" value={f.uf} onChange={(e) => campo('uf', e.target.value.toUpperCase())} maxLength={2} />
                </Field>
              </FieldSection>

              <Field label="Observações" htmlFor="c-obs" dica="Preferências, restrições, o que ajuda no atendimento.">
                <Textarea id="c-obs" value={f.observacoes} onChange={(e) => campo('observacoes', e.target.value)} rows={3} />
              </Field>

              <div className="rounded-control border border-hairline bg-paper px-3">
                <SwitchLinha id="c-ativo" checked={f.ativo} onCheckedChange={(v) => campo('ativo', v)} label="Ativo" />
              </div>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button loading={acao.pendente} disabled={carregando} onClick={() => acao.executar({ id: clienteId ?? undefined, ...f })}>
            Salvar cliente
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DialogoPontos({ cliente, onFechar }: { cliente: Cliente; onFechar: () => void }) {
  const [pontos, setPontos] = React.useState(0)
  const [descricao, setDescricao] = React.useState('')
  const acao = useAcao(ajustarPontos, {
    sucesso: (d) => `${d.nome} agora tem ${d.saldo} pontos`,
    aoConcluir: onFechar,
  })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Ajustar pontos de {cliente.nome}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-body-muted">
            Saldo atual: <span className="font-bold" data-numeric>{numero(cliente.pontos)}</span> pontos. Use valores
            negativos para retirar.
          </p>
          <Field label="Pontos a ajustar" htmlFor="fp-pontos" erro={acao.erroCampos.pontos} obrigatorio>
            <Input
              id="fp-pontos"
              type="number"
              value={pontos || ''}
              onChange={(e) => setPontos(Number(e.target.value))}
              className="text-right font-semibold"
              autoFocus
            />
          </Field>
          <Field label="Motivo" htmlFor="fp-desc" erro={acao.erroCampos.descricao} obrigatorio>
            <Input
              id="fp-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: bonificação por indicação"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={pontos === 0 || descricao.trim().length < 3}
            onClick={() => acao.executar({ clienteId: cliente.id, pontos, descricao })}
          >
            Ajustar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
