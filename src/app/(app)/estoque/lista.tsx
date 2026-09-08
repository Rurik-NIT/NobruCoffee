'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Scale,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { data as fmtData, moeda, numero, quantidade as fmtQtd } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SegmentedControl, SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { PaginacaoUrl } from '@/components/patterns/filtros'
import { useAcao } from '@/hooks/use-acao'
import { ajustarSaldo, arquivarIngrediente, lancarMovimento, salvarIngrediente } from '@/server/modules/estoque/actions'

type Insumo = {
  id: string
  nome: string
  sku: string
  unidade: string
  custoMedio: number
  estoqueAtual: number
  estoqueMinimo: number
  estoqueMaximo: number | null
  localArmazenagem: string | null
  perecivel: boolean
  ativo: boolean
  fornecedor: { id: string; nome: string } | null
  usadoEmFichas: number
  valorEmEstoque: number
  abaixoDoMinimo: boolean
  zerado: boolean
  proximaValidade: Date | string | null
}

const UNIDADES = [
  { valor: 'G', rotulo: 'Gramas (g)' },
  { valor: 'KG', rotulo: 'Quilos (kg)' },
  { valor: 'ML', rotulo: 'Mililitros (ml)' },
  { valor: 'L', rotulo: 'Litros (L)' },
  { valor: 'UN', rotulo: 'Unidades (un)' },
  { valor: 'PCT', rotulo: 'Pacotes (pct)' },
  { valor: 'CX', rotulo: 'Caixas (cx)' },
]

export function ListaInsumos({
  dados,
  fornecedores,
  permissoes,
}: {
  dados: { itens: Insumo[]; total: number; pagina: number; porPagina: number }
  fornecedores: Array<{ id: string; nome: string }>
  permissoes: { gerenciar: boolean; movimentar: boolean; ajustar: boolean }
}) {
  const [formAberto, setFormAberto] = React.useState(false)
  const [editando, setEditando] = React.useState<Insumo | null>(null)
  const [movimentoAlvo, setMovimentoAlvo] = React.useState<Insumo | null>(null)
  const [ajusteAlvo, setAjusteAlvo] = React.useState<Insumo | null>(null)

  const acaoArquivar = useAcao(arquivarIngrediente, {
    sucesso: (d) => (d.ativo ? `${d.nome} reativado` : `${d.nome} arquivado`),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(dados.total)}
          </span>{' '}
          insumo(s)
        </p>
        {permissoes.gerenciar ? (
          <Button
            size="sm"
            onClick={() => {
              setEditando(null)
              setFormAberto(true)
            }}
          >
            <Plus className="size-3.5" />
            Novo insumo
          </Button>
        ) : null}
      </div>

      {dados.itens.length === 0 ? (
        <EmptyState
          icone={Boxes}
          titulo="Nenhum insumo encontrado"
          descricao="Cadastre farinha, açúcar, leite, café, embalagens — tudo que a produção consome."
          acao={
            permissoes.gerenciar ? (
              <Button
                onClick={() => {
                  setEditando(null)
                  setFormAberto(true)
                }}
              >
                <Plus />
                Cadastrar insumo
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
                  <TH>Insumo</TH>
                  <TH numerico>Saldo</TH>
                  <TH numerico>Mínimo</TH>
                  <TH numerico>Custo médio</TH>
                  <TH numerico>Valor</TH>
                  <TH>Local</TH>
                  <TH>Validade</TH>
                  <TH numerico>Fichas</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {dados.itens.map((i) => (
                  <TR key={i.id} className={cn(!i.ativo && 'opacity-55')}>
                    <TD>
                      <CellStack
                        principal={
                          <span className="flex items-center gap-2">
                            {i.nome}
                            {i.zerado ? (
                              <Badge tone="danger" size="sm">
                                zerado
                              </Badge>
                            ) : i.abaixoDoMinimo ? (
                              <Badge tone="caution" size="sm">
                                no mínimo
                              </Badge>
                            ) : null}
                          </span>
                        }
                        apoio={
                          <>
                            {i.sku}
                            {i.fornecedor ? ` · ${i.fornecedor.nome}` : ''}
                          </>
                        }
                      />
                    </TD>
                    <TD numerico>
                      <span className={cn(i.zerado ? 'font-bold text-danger' : i.abaixoDoMinimo ? 'font-bold text-caution' : '')}>
                        {fmtQtd(i.estoqueAtual, i.unidade)}
                      </span>
                    </TD>
                    <TD numerico>
                      {i.estoqueMinimo > 0 ? fmtQtd(i.estoqueMinimo, i.unidade) : <span className="text-body-subtle">—</span>}
                    </TD>
                    <TD numerico>{moeda(i.custoMedio)}</TD>
                    <TD numerico>{moeda(i.valorEmEstoque)}</TD>
                    <TD>
                      <span className="text-xs text-body-muted">{i.localArmazenagem ?? '—'}</span>
                    </TD>
                    <TD>
                      {i.proximaValidade ? (
                        <span className="text-xs">{fmtData(i.proximaValidade)}</span>
                      ) : (
                        <span className="text-xs text-body-subtle">{i.perecivel ? 'sem lote' : '—'}</span>
                      )}
                    </TD>
                    <TD numerico>
                      <span className="text-body-muted">{numero(i.usadoEmFichas)}</span>
                    </TD>
                    <TD>
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${i.nome}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent>
                          {permissoes.movimentar ? (
                            <DropdownItem onSelect={() => setMovimentoAlvo(i)}>
                              <ArrowDownToLine />
                              Lançar entrada/saída
                            </DropdownItem>
                          ) : null}
                          {permissoes.ajustar ? (
                            <DropdownItem onSelect={() => setAjusteAlvo(i)}>
                              <Scale />
                              Ajustar saldo
                            </DropdownItem>
                          ) : null}
                          <DropdownItem asChild>
                            <Link href={`/estoque/movimentacoes?ingrediente=${i.id}`}>
                              <History />
                              Histórico
                            </Link>
                          </DropdownItem>
                          {permissoes.gerenciar ? (
                            <>
                              <DropdownSeparator />
                              <DropdownItem
                                onSelect={() => {
                                  setEditando(i)
                                  setFormAberto(true)
                                }}
                              >
                                <Pencil />
                                Editar
                              </DropdownItem>
                              <DropdownItem onSelect={() => acaoArquivar.executar({ id: i.id, ativo: !i.ativo })}>
                                <Archive />
                                {i.ativo ? 'Arquivar' : 'Reativar'}
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

      {formAberto ? (
        <FormularioInsumo insumo={editando} fornecedores={fornecedores} onFechar={() => setFormAberto(false)} />
      ) : null}
      {movimentoAlvo ? <DialogoMovimento insumo={movimentoAlvo} onFechar={() => setMovimentoAlvo(null)} /> : null}
      {ajusteAlvo ? <DialogoAjuste insumo={ajusteAlvo} onFechar={() => setAjusteAlvo(null)} /> : null}
    </>
  )
}

function FormularioInsumo({
  insumo,
  fornecedores,
  onFechar,
}: {
  insumo: Insumo | null
  fornecedores: Array<{ id: string; nome: string }>
  onFechar: () => void
}) {
  const [nome, setNome] = React.useState(insumo?.nome ?? '')
  const [sku, setSku] = React.useState(insumo?.sku ?? '')
  const [unidade, setUnidade] = React.useState(insumo?.unidade ?? 'G')
  const [custoMedio, setCustoMedio] = React.useState(insumo?.custoMedio ?? 0)
  const [minimo, setMinimo] = React.useState(insumo?.estoqueMinimo ?? 0)
  const [maximo, setMaximo] = React.useState(insumo?.estoqueMaximo ?? 0)
  const [local, setLocal] = React.useState(insumo?.localArmazenagem ?? '')
  const [perecivel, setPerecivel] = React.useState(insumo?.perecivel ?? false)
  const [fornecedorId, setFornecedorId] = React.useState<string | null>(insumo?.fornecedor?.id ?? null)
  const [saldoInicial, setSaldoInicial] = React.useState(0)
  const [ativo, setAtivo] = React.useState(insumo?.ativo ?? true)

  const acao = useAcao(salvarIngrediente, { sucesso: (d) => `${d.nome} salvo`, aoConcluir: onFechar })

  return (
    <Sheet open onOpenChange={(v) => !v && onFechar()}>
      <SheetContent largura="sm">
        <SheetHeader>
          <SheetTitle>{insumo ? 'Editar insumo' : 'Novo insumo'}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <Field label="Nome" htmlFor="i-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="i-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus placeholder="Farinha de trigo" />
          </Field>
          <FieldRow>
            <Field label="SKU" htmlFor="i-sku" erro={acao.erroCampos.sku} obrigatorio>
              <Input id="i-sku" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} className="font-mono uppercase" />
            </Field>
            <Field
              label="Unidade de controle"
              htmlFor="i-un"
              erro={acao.erroCampos.unidade}
              obrigatorio
              dica={insumo ? 'Não muda com saldo em estoque.' : 'Controle na menor unidade prática (g, ml).'}
            >
              <SelectSimples id="i-un" value={unidade} onValueChange={setUnidade} opcoes={UNIDADES} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={`Custo por ${unidade.toLowerCase()}`} htmlFor="i-custo" erro={acao.erroCampos.custoMedio} obrigatorio>
              <MoneyInput id="i-custo" value={custoMedio} onValueChange={setCustoMedio} />
            </Field>
            {!insumo ? (
              <Field label="Saldo inicial" htmlFor="i-saldo" dica="Gera uma entrada manual no histórico.">
                <QuantityInput id="i-saldo" value={saldoInicial} onValueChange={setSaldoInicial} unidade={unidade} />
              </Field>
            ) : null}
          </FieldRow>
          <FieldRow>
            <Field label="Estoque mínimo" htmlFor="i-min" dica="Dispara o aviso de reposição.">
              <QuantityInput id="i-min" value={minimo} onValueChange={setMinimo} unidade={unidade} />
            </Field>
            <Field label="Estoque máximo" htmlFor="i-max" erro={acao.erroCampos.estoqueMaximo} dica="Usado na sugestão de compra.">
              <QuantityInput id="i-max" value={maximo} onValueChange={setMaximo} unidade={unidade} />
            </Field>
          </FieldRow>
          <Field label="Local de armazenagem" htmlFor="i-local">
            <Input id="i-local" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Câmara fria" />
          </Field>
          <Field label="Fornecedor padrão" htmlFor="i-forn">
            <Combobox
              id="i-forn"
              value={fornecedorId}
              onValueChange={setFornecedorId}
              permiteLimpar
              opcoes={fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))}
              placeholder="Nenhum"
            />
          </Field>
          <div className="divide-y divide-hairline rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha
              id="i-perecivel"
              checked={perecivel}
              onCheckedChange={setPerecivel}
              label="Perecível"
              descricao="Exige informar a validade no recebimento e entra no controle de validades."
            />
            <SwitchLinha id="i-ativo" checked={ativo} onCheckedChange={setAtivo} label="Ativo" />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            onClick={() =>
              acao.executar({
                id: insumo?.id,
                nome,
                sku,
                unidade: unidade as never,
                custoMedio,
                estoqueMinimo: minimo,
                estoqueMaximo: maximo > 0 ? maximo : null,
                localArmazenagem: local,
                perecivel,
                fornecedorPadraoId: fornecedorId,
                ativo,
                saldoInicial,
              })
            }
          >
            Salvar insumo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function DialogoMovimento({ insumo, onFechar }: { insumo: Insumo; onFechar: () => void }) {
  const [tipo, setTipo] = React.useState<'ENTRADA_MANUAL' | 'SAIDA_MANUAL'>('ENTRADA_MANUAL')
  const [quantidade, setQuantidade] = React.useState(0)
  const [custo, setCusto] = React.useState(insumo.custoMedio)
  const [lote, setLote] = React.useState('')
  const [validade, setValidade] = React.useState('')
  const [observacao, setObservacao] = React.useState('')

  const acao = useAcao(lancarMovimento, {
    sucesso: (d) => `${d.nome}: saldo agora é ${fmtQtd(d.saldoApos, d.unidade)}`,
    aoConcluir: onFechar,
  })

  const entrada = tipo === 'ENTRADA_MANUAL'

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Movimentar {insumo.nome}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <SegmentedControl
            value={tipo}
            onValueChange={setTipo}
            tamanho="touch"
            opcoes={[
              { valor: 'ENTRADA_MANUAL', rotulo: 'Entrada', icone: ArrowDownToLine },
              { valor: 'SAIDA_MANUAL', rotulo: 'Saída', icone: ArrowUpFromLine },
            ]}
          />
          <p className="text-xs text-body-muted">
            Saldo atual: <span className="font-bold">{fmtQtd(insumo.estoqueAtual, insumo.unidade)}</span>
          </p>
          <Field label="Quantidade" htmlFor="m-qtd" erro={acao.erroCampos.quantidade} obrigatorio>
            <QuantityInput id="m-qtd" value={quantidade} onValueChange={setQuantidade} unidade={insumo.unidade} autoFocus />
          </Field>
          {entrada ? (
            <>
              <Field label="Custo unitário desta entrada" htmlFor="m-custo" dica="Recalcula o custo médio ponderado.">
                <MoneyInput id="m-custo" value={custo} onValueChange={setCusto} />
              </Field>
              <FieldRow>
                <Field label="Lote" htmlFor="m-lote">
                  <Input id="m-lote" value={lote} onChange={(e) => setLote(e.target.value)} />
                </Field>
                <Field label="Validade" htmlFor="m-val">
                  <DateInput id="m-val" value={validade} onChange={(e) => setValidade(e.target.value)} />
                </Field>
              </FieldRow>
            </>
          ) : null}
          <Field label="Motivo" htmlFor="m-obs" erro={acao.erroCampos.observacao} obrigatorio>
            <Input
              id="m-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={entrada ? 'Ex.: doação de fornecedor' : 'Ex.: usado em teste de receita'}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={quantidade <= 0 || observacao.trim().length < 3}
            onClick={() =>
              acao.executar({
                ingredienteId: insumo.id,
                tipo,
                quantidade,
                custoUnitario: entrada ? custo : undefined,
                lote,
                validade,
                observacao,
              })
            }
          >
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoAjuste({ insumo, onFechar }: { insumo: Insumo; onFechar: () => void }) {
  const [saldoNovo, setSaldoNovo] = React.useState(insumo.estoqueAtual)
  const [motivo, setMotivo] = React.useState('')
  const acao = useAcao(ajustarSaldo, {
    sucesso: (d) => `${d.nome} ajustado para ${fmtQtd(d.saldoNovo, insumo.unidade)}`,
    aoConcluir: onFechar,
  })

  const diferenca = saldoNovo - insumo.estoqueAtual
  const impacto = diferenca * insumo.custoMedio

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Ajustar saldo de {insumo.nome}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-body-muted">
            O ajuste sobrescreve o saldo do sistema. Use quando a prateleira e o sistema divergem e você já sabe o número
            certo — o motivo fica no log de auditoria.
          </p>
          <Field label="Saldo correto" htmlFor="a-saldo" obrigatorio>
            <QuantityInput id="a-saldo" value={saldoNovo} onValueChange={setSaldoNovo} unidade={insumo.unidade} autoFocus />
          </Field>
          {diferenca !== 0 ? (
            <div className="space-y-1 rounded-control bg-paper-sunken px-3 py-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-body-muted">Saldo atual</span>
                <span data-numeric>{fmtQtd(insumo.estoqueAtual, insumo.unidade)}</span>
              </div>
              <div className={cn('flex justify-between font-bold', diferenca > 0 ? 'text-leaf' : 'text-danger')}>
                <span>{diferenca > 0 ? 'Entrada' : 'Baixa'}</span>
                <span data-numeric>{fmtQtd(Math.abs(diferenca), insumo.unidade)}</span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-1 text-xs">
                <span className="text-body-muted">Impacto no valor de estoque</span>
                <span data-numeric>{moeda(impacto)}</span>
              </div>
            </div>
          ) : null}
          <Field label="Motivo do ajuste" htmlFor="a-motivo" erro={acao.erroCampos.motivo} obrigatorio>
            <Input
              id="a-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: contagem física da câmara fria"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={diferenca === 0 || motivo.trim().length < 3}
            onClick={() => acao.executar({ ingredienteId: insumo.id, saldoNovo, motivo })}
          >
            Ajustar saldo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
