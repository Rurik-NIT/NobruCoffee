'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookOpen, Pencil, Plus, RefreshCw, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dataHora, moeda, numero, percentual, quantidade as fmtQtd } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { recalcularCustos } from '@/server/modules/estoque/actions'
import { EditorFicha, type IngredienteOpcao } from './editor'

type Ficha = {
  id: string
  versao: number
  produtoId: string
  produto: string
  sku: string
  categoria: { nome: string; cor: string }
  rendimento: number
  unidadeRendimento: string
  itens: number
  custoTotal: number
  custoUnitario: number
  precoVenda: number
  margem: number
  lucroUnitario: number
  atualizadoEm: string
}

export function ListaFichas({
  fichas,
  semFicha,
  ingredientes,
  podeGerenciar,
  produtoInicial,
}: {
  fichas: Ficha[]
  semFicha: Array<{ id: string; nome: string; sku: string; precoVenda: number; tipo: string }>
  ingredientes: IngredienteOpcao[]
  podeGerenciar: boolean
  produtoInicial: string | null
}) {
  const [editor, setEditor] = React.useState<{ produtoId: string; produtoNome: string; precoVenda: number } | null>(
    () => {
      if (!produtoInicial) return null
      const daLista = fichas.find((f) => f.produtoId === produtoInicial)
      if (daLista) return { produtoId: daLista.produtoId, produtoNome: daLista.produto, precoVenda: daLista.precoVenda }
      const pendente = semFicha.find((p) => p.id === produtoInicial)
      if (pendente) return { produtoId: pendente.id, produtoNome: pendente.nome, precoVenda: pendente.precoVenda }
      return null
    },
  )

  const acaoRecalcular = useAcao(recalcularCustos, {
    sucesso: (d) => `${d.fichas} ficha(s) recalculada(s) com o custo médio atual`,
  })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(fichas.length)}
          </span>{' '}
          ficha(s) ativa(s)
        </p>
        {podeGerenciar ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={acaoRecalcular.pendente} onClick={() => acaoRecalcular.executar({})}>
              <RefreshCw className="size-3.5" />
              Recalcular custos
            </Button>
          </div>
        ) : null}
      </div>

      {semFicha.length > 0 ? (
        <div className="border-b border-hairline bg-caution-soft/50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-caution">
            <TriangleAlert className="size-3.5" />
            {semFicha.length} produto(s) de produção própria sem ficha técnica
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {semFicha.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!podeGerenciar}
                  onClick={() => setEditor({ produtoId: p.id, produtoNome: p.nome, precoVenda: p.precoVenda })}
                  className="rounded-full border border-caution/40 bg-paper-raised px-2.5 py-1 text-xs font-semibold text-caution transition-colors hover:bg-caution/10 disabled:opacity-60"
                >
                  {p.nome}
                  {podeGerenciar ? <Plus className="ml-1 inline size-3" /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {fichas.length === 0 ? (
        <EmptyState
          icone={BookOpen}
          titulo="Nenhuma ficha técnica"
          descricao="A ficha diz quanto de cada insumo entra num produto. Sem ela o sistema não sabe o custo nem o que baixar do estoque."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Produto</TH>
                <TH>Versão</TH>
                <TH numerico>Rende</TH>
                <TH numerico>Insumos</TH>
                <TH numerico>Custo/un</TH>
                <TH numerico>Venda</TH>
                <TH numerico>Lucro/un</TH>
                <TH numerico>Margem</TH>
                <TH>Atualizada</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {fichas.map((f) => (
                <TR key={f.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] font-display text-xs font-black"
                        style={{ background: `${f.categoria.cor}1f`, color: f.categoria.cor }}
                      >
                        {f.produto.slice(0, 2).toUpperCase()}
                      </span>
                      <CellStack principal={f.produto} apoio={`${f.sku} · ${f.categoria.nome}`} />
                    </div>
                  </TD>
                  <TD>
                    <Badge tone="neutral">v{f.versao}</Badge>
                  </TD>
                  <TD numerico>{fmtQtd(f.rendimento, f.unidadeRendimento)}</TD>
                  <TD numerico>{numero(f.itens)}</TD>
                  <TD numerico>{moeda(f.custoUnitario)}</TD>
                  <TD numerico>{moeda(f.precoVenda)}</TD>
                  <TD numerico>{moeda(f.lucroUnitario)}</TD>
                  <TD numerico>
                    <span
                      className={cn('font-bold', f.margem >= 60 ? 'text-leaf' : f.margem >= 35 ? 'text-body' : 'text-danger')}
                    >
                      {percentual(f.margem)}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-xs text-body-muted">{dataHora(f.atualizadoEm)}</span>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" asChild aria-label={`Detalhe da ficha de ${f.produto}`}>
                        <Link href={`/fichas-tecnicas/${f.id}`}>
                          <BookOpen />
                        </Link>
                      </Button>
                      {podeGerenciar ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ficha de ${f.produto}`}
                          onClick={() =>
                            setEditor({ produtoId: f.produtoId, produtoNome: f.produto, precoVenda: f.precoVenda })
                          }
                        >
                          <Pencil />
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {editor ? (
        <EditorFicha
          produtoId={editor.produtoId}
          produtoNome={editor.produtoNome}
          precoVenda={editor.precoVenda}
          ingredientes={ingredientes}
          onFechar={() => setEditor(null)}
        />
      ) : null}
    </>
  )
}
