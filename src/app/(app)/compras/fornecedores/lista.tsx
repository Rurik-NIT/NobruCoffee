'use client'

import * as React from 'react'
import { Archive, Pencil, Plus, Store } from 'lucide-react'

import { cn } from '@/lib/utils'
import { data as fmtData, documento, moeda, numero, telefone as fmtTel } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { Input, QuantityInput, Textarea } from '@/components/ui/input'
import { SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { arquivarFornecedor, salvarFornecedor } from '@/server/modules/compras/actions'

type Fornecedor = {
  id: string
  nome: string
  razaoSocial: string | null
  cnpjCpf: string | null
  telefone: string | null
  email: string | null
  contato: string | null
  cidade: string | null
  uf: string | null
  prazoEntregaDias: number | null
  observacao: string | null
  ativo: boolean
  insumos: number
  pedidos: number
  ultimaCompra: Date | string | null
  ultimoValor: number | null
}

export function ListaFornecedores({
  fornecedores,
  podeGerenciar,
}: {
  fornecedores: Fornecedor[]
  podeGerenciar: boolean
}) {
  const [editando, setEditando] = React.useState<Fornecedor | null>(null)
  const [criando, setCriando] = React.useState(false)
  const acaoArquivar = useAcao(arquivarFornecedor, {
    sucesso: (d) => (d.ativo ? `${d.nome} reativado` : `${d.nome} arquivado`),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(fornecedores.length)}
          </span>{' '}
          fornecedor(es)
        </p>
        {podeGerenciar ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" />
            Novo fornecedor
          </Button>
        ) : null}
      </div>

      {fornecedores.length === 0 ? (
        <EmptyState
          icone={Store}
          titulo="Nenhum fornecedor"
          descricao="Cadastre quem fornece farinha, café, embalagem — e vincule nos insumos para a sugestão de compra funcionar."
          acao={podeGerenciar ? <Button onClick={() => setCriando(true)}>Cadastrar fornecedor</Button> : undefined}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Fornecedor</TH>
                <TH>Contato</TH>
                <TH>Cidade</TH>
                <TH numerico>Prazo</TH>
                <TH numerico>Insumos</TH>
                <TH>Última compra</TH>
                <TH>Situação</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {fornecedores.map((f) => (
                <TR key={f.id} className={cn(!f.ativo && 'opacity-55')}>
                  <TD>
                    <CellStack
                      principal={f.nome}
                      apoio={
                        <>
                          {f.razaoSocial ?? ''}
                          {f.cnpjCpf ? ` · ${documento(f.cnpjCpf)}` : ''}
                        </>
                      }
                    />
                  </TD>
                  <TD>
                    <span className="text-xs">
                      {f.contato ? <span className="block font-semibold">{f.contato}</span> : null}
                      {f.telefone ? <span className="block text-body-muted">{fmtTel(f.telefone)}</span> : null}
                      {f.email ? <span className="block text-body-muted">{f.email}</span> : null}
                      {!f.contato && !f.telefone && !f.email ? <span className="text-body-subtle">—</span> : null}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-xs text-body-muted">
                      {f.cidade ? `${f.cidade}${f.uf ? `/${f.uf}` : ''}` : '—'}
                    </span>
                  </TD>
                  <TD numerico>
                    {f.prazoEntregaDias !== null ? `${f.prazoEntregaDias}d` : <span className="text-body-subtle">—</span>}
                  </TD>
                  <TD numerico>{numero(f.insumos)}</TD>
                  <TD>
                    {f.ultimaCompra ? (
                      <span className="text-xs">
                        {fmtData(f.ultimaCompra)}
                        {f.ultimoValor !== null ? (
                          <span className="block text-body-muted" data-numeric>
                            {moeda(f.ultimoValor)}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-body-subtle">nunca</span>
                    )}
                  </TD>
                  <TD>{f.ativo ? <Badge tone="leaf">Ativo</Badge> : <Badge tone="neutral">Arquivado</Badge>}</TD>
                  <TD>
                    {podeGerenciar ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${f.nome}`} onClick={() => setEditando(f)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${f.ativo ? 'Arquivar' : 'Reativar'} ${f.nome}`}
                          onClick={() => acaoArquivar.executar({ id: f.id, ativo: !f.ativo })}
                        >
                          <Archive />
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
        <FormularioFornecedor
          fornecedor={editando}
          onFechar={() => {
            setCriando(false)
            setEditando(null)
          }}
        />
      ) : null}
    </>
  )
}

function FormularioFornecedor({ fornecedor, onFechar }: { fornecedor: Fornecedor | null; onFechar: () => void }) {
  const [f, setF] = React.useState({
    nome: fornecedor?.nome ?? '',
    razaoSocial: fornecedor?.razaoSocial ?? '',
    cnpjCpf: fornecedor?.cnpjCpf ?? '',
    telefone: fornecedor?.telefone ?? '',
    email: fornecedor?.email ?? '',
    contato: fornecedor?.contato ?? '',
    cidade: fornecedor?.cidade ?? '',
    uf: fornecedor?.uf ?? '',
    prazoEntregaDias: fornecedor?.prazoEntregaDias ?? 0,
    observacao: fornecedor?.observacao ?? '',
    ativo: fornecedor?.ativo ?? true,
  })
  const acao = useAcao(salvarFornecedor, { sucesso: (d) => `${d.nome} salvo`, aoConcluir: onFechar })

  function campo<K extends keyof typeof f>(chave: K, valor: (typeof f)[K]) {
    setF((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="md">
        <DialogHeader>
          <DialogTitle>{fornecedor ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FieldRow>
            <Field label="Nome" htmlFor="f-nome" erro={acao.erroCampos.nome} obrigatorio>
              <Input id="f-nome" value={f.nome} onChange={(e) => campo('nome', e.target.value)} autoFocus />
            </Field>
            <Field label="Razão social" htmlFor="f-razao">
              <Input id="f-razao" value={f.razaoSocial} onChange={(e) => campo('razaoSocial', e.target.value)} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="CNPJ ou CPF" htmlFor="f-doc" erro={acao.erroCampos.cnpjCpf}>
              <Input id="f-doc" value={f.cnpjCpf} onChange={(e) => campo('cnpjCpf', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Pessoa de contato" htmlFor="f-contato">
              <Input id="f-contato" value={f.contato} onChange={(e) => campo('contato', e.target.value)} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Telefone" htmlFor="f-tel">
              <Input id="f-tel" value={f.telefone} onChange={(e) => campo('telefone', e.target.value)} inputMode="tel" />
            </Field>
            <Field label="E-mail" htmlFor="f-email" erro={acao.erroCampos.email}>
              <Input id="f-email" value={f.email} onChange={(e) => campo('email', e.target.value)} inputMode="email" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Cidade" htmlFor="f-cidade">
              <Input id="f-cidade" value={f.cidade} onChange={(e) => campo('cidade', e.target.value)} />
            </Field>
            <Field label="UF" htmlFor="f-uf" className="max-w-24">
              <Input id="f-uf" value={f.uf} onChange={(e) => campo('uf', e.target.value.toUpperCase())} maxLength={2} />
            </Field>
          </FieldRow>
          <Field label="Prazo de entrega (dias)" htmlFor="f-prazo" className="max-w-40">
            <QuantityInput id="f-prazo" value={f.prazoEntregaDias} onValueChange={(v) => campo('prazoEntregaDias', v)} step={1} />
          </Field>
          <Field label="Observação" htmlFor="f-obs">
            <Textarea id="f-obs" value={f.observacao} onChange={(e) => campo('observacao', e.target.value)} rows={2} />
          </Field>
          <div className="rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha id="f-ativo" checked={f.ativo} onCheckedChange={(v) => campo('ativo', v)} label="Ativo" />
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
                id: fornecedor?.id,
                ...f,
                prazoEntregaDias: f.prazoEntregaDias > 0 ? f.prazoEntregaDias : null,
              })
            }
          >
            Salvar fornecedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
