'use client'

import * as React from 'react'
import { BadgePercent, Pencil, Plus, Power } from 'lucide-react'

import { cn } from '@/lib/utils'
import { data as fmtData, moeda, numero } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { SegmentedControl, SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { alternarCupom, salvarCupom } from '@/server/modules/clientes/actions'

type Cupom = {
  id: string
  codigo: string
  descricao: string | null
  tipo: string
  valor: number
  minimoCompra: number
  usoMaximo: number | null
  usosFeitos: number
  validoDe: Date | string | null
  validoAte: Date | string | null
  cliente: { id: string; nome: string } | null
  ativo: boolean
  vencido: boolean
  esgotado: boolean
  pedidos: number
}

export function GerenciarCupons({ cupons, podeGerenciar }: { cupons: Cupom[]; podeGerenciar: boolean }) {
  const [editando, setEditando] = React.useState<Cupom | null>(null)
  const [criando, setCriando] = React.useState(false)
  const acaoAlternar = useAcao(alternarCupom, {
    sucesso: (d) => (d.ativo ? `Cupom ${d.codigo} ativado` : `Cupom ${d.codigo} desativado`),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(cupons.length)}
          </span>{' '}
          cupom(ns)
        </p>
        {podeGerenciar ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" />
            Novo cupom
          </Button>
        ) : null}
      </div>

      {cupons.length === 0 ? (
        <EmptyState
          icone={BadgePercent}
          titulo="Nenhum cupom"
          descricao="Cupons são aplicados no PDV pelo código. Podem ser gerais ou nominais a um cliente."
          acao={podeGerenciar ? <Button onClick={() => setCriando(true)}>Criar cupom</Button> : undefined}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Código</TH>
                <TH>Desconto</TH>
                <TH numerico>Mínimo</TH>
                <TH numerico>Usos</TH>
                <TH>Validade</TH>
                <TH>Nominal a</TH>
                <TH>Situação</TH>
                <TH className="w-20" />
              </TR>
            </THead>
            <TBody>
              {cupons.map((c) => {
                const indisponivel = !c.ativo || c.vencido || c.esgotado
                return (
                  <TR key={c.id} className={cn(indisponivel && 'opacity-60')}>
                    <TD>
                      <span className="font-mono text-sm font-bold">{c.codigo}</span>
                      {c.descricao ? <span className="block text-xs text-body-muted">{c.descricao}</span> : null}
                    </TD>
                    <TD>
                      <span className="text-sm font-semibold">
                        {c.tipo === 'PERCENTUAL' ? `${c.valor}%` : moeda(c.valor)}
                      </span>
                    </TD>
                    <TD numerico>{c.minimoCompra > 0 ? moeda(c.minimoCompra) : '—'}</TD>
                    <TD numerico>
                      {numero(c.usosFeitos)}
                      {c.usoMaximo !== null ? <span className="text-body-muted"> / {numero(c.usoMaximo)}</span> : ''}
                    </TD>
                    <TD>
                      <span className="text-xs text-body-muted">
                        {c.validoDe ? fmtData(c.validoDe) : '—'} → {c.validoAte ? fmtData(c.validoAte) : 'sem fim'}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-xs">{c.cliente?.nome ?? <span className="text-body-subtle">geral</span>}</span>
                    </TD>
                    <TD>
                      {!c.ativo ? (
                        <Badge tone="neutral">Desativado</Badge>
                      ) : c.vencido ? (
                        <Badge tone="danger">Vencido</Badge>
                      ) : c.esgotado ? (
                        <Badge tone="caution">Esgotado</Badge>
                      ) : (
                        <Badge tone="leaf">Válido</Badge>
                      )}
                    </TD>
                    <TD>
                      {podeGerenciar ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.codigo}`} onClick={() => setEditando(c)}>
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${c.ativo ? 'Desativar' : 'Ativar'} ${c.codigo}`}
                            onClick={() => acaoAlternar.executar({ id: c.id, ativo: !c.ativo })}
                          >
                            <Power />
                          </Button>
                        </div>
                      ) : null}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {criando || editando ? (
        <FormularioCupom
          cupom={editando}
          onFechar={() => {
            setCriando(false)
            setEditando(null)
          }}
        />
      ) : null}
    </>
  )
}

function FormularioCupom({ cupom, onFechar }: { cupom: Cupom | null; onFechar: () => void }) {
  const [codigo, setCodigo] = React.useState(cupom?.codigo ?? '')
  const [descricao, setDescricao] = React.useState(cupom?.descricao ?? '')
  const [tipo, setTipo] = React.useState<'PERCENTUAL' | 'VALOR'>((cupom?.tipo as never) ?? 'PERCENTUAL')
  const [valor, setValor] = React.useState(cupom?.valor ?? 10)
  const [minimo, setMinimo] = React.useState(cupom?.minimoCompra ?? 0)
  const [usoMaximo, setUsoMaximo] = React.useState(cupom?.usoMaximo ?? 0)
  const [validoDe, setValidoDe] = React.useState(
    cupom?.validoDe ? new Date(cupom.validoDe).toISOString().slice(0, 10) : '',
  )
  const [validoAte, setValidoAte] = React.useState(
    cupom?.validoAte ? new Date(cupom.validoAte).toISOString().slice(0, 10) : '',
  )
  const [ativo, setAtivo] = React.useState(cupom?.ativo ?? true)

  const acao = useAcao(salvarCupom, { sucesso: (d) => `Cupom ${d.codigo} salvo`, aoConcluir: onFechar })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{cupom ? 'Editar cupom' : 'Novo cupom'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Código" htmlFor="cp-codigo" erro={acao.erroCampos.codigo} obrigatorio dica="É o que o cliente informa no balcão.">
            <Input
              id="cp-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              className="font-mono uppercase"
              placeholder="NOBRU10"
              autoFocus
            />
          </Field>
          <Field label="Descrição" htmlFor="cp-desc">
            <Input id="cp-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>

          <SegmentedControl
            value={tipo}
            onValueChange={setTipo}
            tamanho="touch"
            opcoes={[
              { valor: 'PERCENTUAL', rotulo: 'Percentual' },
              { valor: 'VALOR', rotulo: 'Valor fixo' },
            ]}
          />

          <FieldRow>
            <Field label={tipo === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor'} htmlFor="cp-valor" erro={acao.erroCampos.valor} obrigatorio>
              {tipo === 'PERCENTUAL' ? (
                <QuantityInput id="cp-valor" value={valor} onValueChange={setValor} step={1} min={1} unidade="%" />
              ) : (
                <MoneyInput id="cp-valor" value={valor} onValueChange={setValor} />
              )}
            </Field>
            <Field label="Compra mínima" htmlFor="cp-min">
              <MoneyInput id="cp-min" value={minimo} onValueChange={setMinimo} />
            </Field>
          </FieldRow>

          <Field label="Limite de usos" htmlFor="cp-uso" dica="0 = ilimitado." className="max-w-40">
            <QuantityInput id="cp-uso" value={usoMaximo} onValueChange={setUsoMaximo} step={1} />
          </Field>

          <FieldRow>
            <Field label="Válido de" htmlFor="cp-de">
              <DateInput id="cp-de" value={validoDe} onChange={(e) => setValidoDe(e.target.value)} />
            </Field>
            <Field label="Válido até" htmlFor="cp-ate">
              <DateInput id="cp-ate" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} />
            </Field>
          </FieldRow>

          <div className="rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha id="cp-ativo" checked={ativo} onCheckedChange={setAtivo} label="Ativo" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={codigo.length < 3 || valor <= 0}
            onClick={() =>
              acao.executar({
                id: cupom?.id,
                codigo,
                descricao,
                tipo,
                valor,
                minimoCompra: minimo,
                usoMaximo: usoMaximo > 0 ? usoMaximo : null,
                validoDe,
                validoAte,
                clienteId: cupom?.cliente?.id ?? null,
                ativo,
              })
            }
          >
            Salvar cupom
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
