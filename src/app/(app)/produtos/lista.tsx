'use client'

import * as React from 'react'
import Link from 'next/link'
import { Archive, BookOpen, Copy, MoreHorizontal, Package, Pencil, Plus, Tag, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda, numero, percentual, quantidade as fmtQtd, rotulo } from '@/lib/format'
import { Badge, Stamp } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field } from '@/components/ui/field'
import { Input, MoneyInput } from '@/components/ui/input'
import { Switch } from '@/components/ui/toggles'
import { CellStack, Table, TBody, TD, TH, THead, TR, TREmpty, TableWrap } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { PaginacaoUrl } from '@/components/patterns/filtros'
import { useAcao } from '@/hooks/use-acao'
import {
  alterarPreco,
  alternarDisponibilidade,
  arquivarProduto,
  excluirProduto,
} from '@/server/modules/catalogo/actions'
import { FormularioProduto, type OpcaoCombo } from './formulario'
import type { ProdutoLista } from '@/server/modules/catalogo/service'

export function ListaProdutos({
  dados,
  categorias,
  adicionais,
  produtosCombo,
  permissoes,
}: {
  dados: { itens: ProdutoLista[]; total: number; pagina: number; porPagina: number }
  categorias: Array<{ id: string; nome: string; cor: string }>
  adicionais: Array<{ id: string; nome: string; preco: number }>
  produtosCombo: OpcaoCombo[]
  permissoes: { gerenciar: boolean; preco: boolean; excluir: boolean; disponibilidade: boolean }
}) {
  const [formAberto, setFormAberto] = React.useState(false)
  const [editandoId, setEditandoId] = React.useState<string | null>(null)
  const [precoAlvo, setPrecoAlvo] = React.useState<ProdutoLista | null>(null)
  const [excluirAlvo, setExcluirAlvo] = React.useState<ProdutoLista | null>(null)

  const acaoDisponibilidade = useAcao(alternarDisponibilidade, {
    sucesso: (d) => (d.disponivel ? `${d.nome} disponível de novo` : `${d.nome} marcado como esgotado`),
  })
  const acaoArquivar = useAcao(arquivarProduto, {
    sucesso: (d) => (d.ativo ? `${d.nome} reativado` : `${d.nome} arquivado`),
  })
  const acaoExcluir = useAcao(excluirProduto, { sucesso: 'Produto excluído', aoConcluir: () => setExcluirAlvo(null) })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(dados.total)}
          </span>{' '}
          produto(s)
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
            Novo produto
          </Button>
        ) : null}
      </div>

      {dados.itens.length === 0 ? (
        <EmptyState
          icone={Package}
          titulo="Nenhum produto encontrado"
          descricao="Ajuste os filtros ou cadastre o primeiro item do catálogo."
          acao={
            permissoes.gerenciar ? (
              <Button
                onClick={() => {
                  setEditandoId(null)
                  setFormAberto(true)
                }}
              >
                <Plus />
                Cadastrar produto
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
                  <TH>Produto</TH>
                  <TH>Categoria</TH>
                  <TH>Tipo</TH>
                  <TH numerico>Custo</TH>
                  <TH numerico>Venda</TH>
                  <TH numerico>Margem</TH>
                  <TH numerico>Estoque</TH>
                  <TH numerico>30 dias</TH>
                  <TH>Situação</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {dados.itens.map((p) => {
                  const categoria = categorias.find((c) => c.id === p.categoria.id)
                  const semEstoque = p.controlaEstoque && p.estoqueAtual <= 0
                  return (
                    <TR key={p.id} className={cn(!p.ativo && 'opacity-55')}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] font-display text-xs font-black"
                            style={{ background: `${categoria?.cor ?? '#D24237'}1f`, color: categoria?.cor ?? '#D24237' }}
                          >
                            {p.nome.slice(0, 2).toUpperCase()}
                          </span>
                          <CellStack principal={p.nome} apoio={p.sku} />
                        </div>
                      </TD>
                      <TD>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span className="size-2 rounded-full" style={{ background: p.categoria.cor }} />
                          {p.categoria.nome}
                        </span>
                      </TD>
                      <TD>
                        <span className="text-xs text-body-muted">{rotulo('tipoProduto', p.tipo)}</span>
                        {!p.temFicha && (p.tipo === 'PRODUZIDO' || p.tipo === 'PREPARADO') ? (
                          <Link
                            href={`/fichas-tecnicas?produto=${p.id}`}
                            className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-caution hover:underline"
                          >
                            <BookOpen className="size-3" />
                            sem ficha
                          </Link>
                        ) : null}
                      </TD>
                      <TD numerico>{moeda(p.precoCusto)}</TD>
                      <TD numerico>
                        {permissoes.preco ? (
                          <button
                            type="button"
                            onClick={() => setPrecoAlvo(p)}
                            className="rounded px-1 font-semibold underline decoration-dotted decoration-body-subtle underline-offset-2 hover:bg-nobru-50 hover:decoration-nobru-500"
                          >
                            {moeda(p.precoVenda)}
                          </button>
                        ) : (
                          moeda(p.precoVenda)
                        )}
                      </TD>
                      <TD numerico>
                        <span
                          className={cn(
                            'font-bold',
                            p.margem >= 60 ? 'text-leaf' : p.margem >= 35 ? 'text-body' : 'text-danger',
                          )}
                        >
                          {percentual(p.margem)}
                        </span>
                      </TD>
                      <TD numerico>
                        {p.controlaEstoque ? (
                          <span className={cn(semEstoque && 'font-bold text-danger')}>{fmtQtd(p.estoqueAtual)}</span>
                        ) : (
                          <span className="text-body-subtle">—</span>
                        )}
                      </TD>
                      <TD numerico>
                        <span className="text-body-muted">{numero(p.vendidos30d)}</span>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          {!p.ativo ? (
                            <Badge tone="neutral">Arquivado</Badge>
                          ) : !p.disponivel ? (
                            <Stamp>Sold out</Stamp>
                          ) : (
                            <Badge tone="leaf">No ar</Badge>
                          )}
                          {permissoes.disponibilidade && p.ativo ? (
                            <Switch
                              checked={p.disponivel}
                              aria-label={`Disponibilidade de ${p.nome}`}
                              onCheckedChange={(v) => acaoDisponibilidade.executar({ id: p.id, disponivel: v })}
                              className="scale-75"
                            />
                          ) : null}
                        </div>
                      </TD>
                      <TD>
                        <Dropdown>
                          <DropdownTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${p.nome}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownTrigger>
                          <DropdownContent>
                            {permissoes.gerenciar ? (
                              <DropdownItem
                                onSelect={() => {
                                  setEditandoId(p.id)
                                  setFormAberto(true)
                                }}
                              >
                                <Pencil />
                                Editar
                              </DropdownItem>
                            ) : null}
                            {permissoes.preco ? (
                              <DropdownItem onSelect={() => setPrecoAlvo(p)}>
                                <Tag />
                                Alterar preço
                              </DropdownItem>
                            ) : null}
                            <DropdownItem asChild>
                              <Link href={`/fichas-tecnicas?produto=${p.id}`}>
                                <BookOpen />
                                Ficha técnica
                              </Link>
                            </DropdownItem>
                            <DropdownItem asChild>
                              <Link href={`/estoque/movimentacoes?produto=${p.id}`}>
                                <Copy />
                                Movimentações
                              </Link>
                            </DropdownItem>
                            {permissoes.gerenciar ? (
                              <>
                                <DropdownSeparator />
                                <DropdownItem onSelect={() => acaoArquivar.executar({ id: p.id, ativo: !p.ativo })}>
                                  <Archive />
                                  {p.ativo ? 'Arquivar' : 'Reativar'}
                                </DropdownItem>
                              </>
                            ) : null}
                            {permissoes.excluir ? (
                              <DropdownItem destrutivo onSelect={() => setExcluirAlvo(p)}>
                                <Trash2 />
                                Excluir
                              </DropdownItem>
                            ) : null}
                          </DropdownContent>
                        </Dropdown>
                      </TD>
                    </TR>
                  )
                })}
                {dados.itens.length === 0 ? (
                  <TREmpty colSpan={10}>
                    <EmptyState titulo="Nada aqui" />
                  </TREmpty>
                ) : null}
              </TBody>
            </Table>
          </TableWrap>
          <PaginacaoUrl pagina={dados.pagina} porPagina={dados.porPagina} total={dados.total} />
        </>
      )}

      {/* Formulário completo */}
      {formAberto ? (
        <FormularioProduto
          produtoId={editandoId}
          categorias={categorias}
          adicionais={adicionais}
          produtosCombo={produtosCombo}
          onFechar={() => setFormAberto(false)}
        />
      ) : null}

      {/* Alteração rápida de preço */}
      {precoAlvo ? (
        <DialogoPreco produto={precoAlvo} onFechar={() => setPrecoAlvo(null)} />
      ) : null}

      <ConfirmDialog
        aberto={Boolean(excluirAlvo)}
        onAbertoChange={(v) => !v && setExcluirAlvo(null)}
        titulo={`Excluir ${excluirAlvo?.nome}?`}
        descricao="Produtos com vendas registradas não podem ser excluídos — use Arquivar para tirar do catálogo sem perder o histórico."
        confirmarTexto="Excluir"
        destrutivo
        pendente={acaoExcluir.pendente}
        onConfirmar={() => excluirAlvo && acaoExcluir.executar({ id: excluirAlvo.id })}
      />
    </>
  )
}

function DialogoPreco({ produto, onFechar }: { produto: ProdutoLista; onFechar: () => void }) {
  const [preco, setPreco] = React.useState(produto.precoVenda)
  const [motivo, setMotivo] = React.useState('')
  const acao = useAcao(alterarPreco, {
    sucesso: (d) => `${d.nome}: preço agora é ${moeda(d.precoVenda)}`,
    aoConcluir: onFechar,
  })

  const novaMargem = preco > 0 ? ((preco - produto.precoCusto) / preco) * 100 : 0

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Preço de {produto.nome}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Preço de venda" htmlFor="novo-preco" erro={acao.erroCampos.precoVenda} obrigatorio>
            <MoneyInput id="novo-preco" value={preco} onValueChange={setPreco} autoFocus />
          </Field>

          <div className="grid grid-cols-3 gap-2 rounded-control bg-paper-sunken px-3 py-2.5 text-center">
            <div>
              <p className="text-[10px] font-bold tracking-wide text-body-subtle uppercase">Custo</p>
              <p className="text-sm font-bold" data-numeric>
                {moeda(produto.precoCusto)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-body-subtle uppercase">Lucro</p>
              <p className="text-sm font-bold" data-numeric>
                {moeda(Math.max(0, preco - produto.precoCusto))}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wide text-body-subtle uppercase">Margem</p>
              <p
                className={cn('text-sm font-bold', novaMargem >= 60 ? 'text-leaf' : novaMargem >= 35 ? 'text-body' : 'text-danger')}
                data-numeric
              >
                {percentual(novaMargem)}
              </p>
            </div>
          </div>

          <Field label="Motivo" htmlFor="preco-motivo" dica="Vai para o log de auditoria com o seu nome.">
            <Input
              id="preco-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: aumento do custo da farinha"
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={preco <= 0 || preco === produto.precoVenda}
            onClick={() => acao.executar({ id: produto.id, precoVenda: preco, motivo })}
          >
            Salvar preço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
