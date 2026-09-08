import type { Metadata } from 'next'
import Link from 'next/link'
import { Archive, Store, Truck } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CellStack, CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, moeda, numero, percentual, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarFornecedores, listarPedidosCompra, sugerirCompra } from '@/server/modules/compras/service'
import { opcoesIngredientes } from '@/server/modules/estoque/queries'
import { NovoPedidoCompra, SugestaoReposicao } from './novo-pedido'

export const metadata: Metadata = { title: 'Pedidos de compra' }
export const dynamic = 'force-dynamic'

export default async function PaginaCompras({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; fornecedor?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('compras.ver')
  const sp = await searchParams

  const [dados, fornecedores, ingredientes, sugestoes, podeGerenciar] = await Promise.all([
    listarPedidosCompra({
      lojaId: sessao.lojaId,
      status: sp.status,
      fornecedorId: sp.fornecedor && sp.fornecedor !== 'todos' ? sp.fornecedor : undefined,
      pagina: Number(sp.pagina ?? 1),
    }),
    listarFornecedores(sessao.lojaId),
    opcoesIngredientes(sessao.lojaId),
    sugerirCompra(sessao.lojaId),
    podeFazer('compras.gerenciar'),
  ])

  const atrasados = dados.itens.filter((p) => p.atrasado).length
  const totalSugerido = sugestoes.reduce((a, g) => a + g.total, 0)

  return (
    <>
      <PageHeader
        titulo="Pedidos de compra"
        descricao="O pedido é a intenção. O estoque só muda quando a mercadoria é recebida."
        acoes={
          <>
            <Button variant="secondary" asChild>
              <Link href="/compras/fornecedores">
                <Store />
                Fornecedores
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/compras/recebimentos">
                <Archive />
                Recebimentos
              </Link>
            </Button>
            {podeGerenciar ? (
              <NovoPedidoCompra
                fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome }))}
                ingredientes={ingredientes}
              />
            ) : null}
          </>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Em aberto" valor={moeda(dados.valorEmAberto)} icone={Truck} apoio="enviados e parciais" />
        <StatTile rotulo="Pedidos no filtro" valor={numero(dados.total)} icone={Truck} />
        <StatTile
          rotulo="Atrasados"
          valor={numero(atrasados)}
          icone={Truck}
          apoio={atrasados > 0 ? 'passaram da data prevista' : 'nada atrasado'}
        />
        <StatTile
          rotulo="Reposição sugerida"
          valor={moeda(totalSugerido)}
          icone={Store}
          apoio={sugestoes.length > 0 ? `${sugestoes.length} fornecedor(es)` : 'estoque em ordem'}
        />
      </KpiGrid>

      {sugestoes.length > 0 && podeGerenciar ? (
        <SugestaoReposicao grupos={sugestoes} className="mb-5" />
      ) : null}

      <FiltrosLista
        buscaPlaceholder="Buscar…"
        selects={[
          {
            chave: 'status',
            rotulo: 'Todos os status',
            opcoes: [
              { valor: 'RASCUNHO', rotulo: 'Rascunho' },
              { valor: 'ENVIADO', rotulo: 'Enviado' },
              { valor: 'PARCIAL', rotulo: 'Recebido parcial' },
              { valor: 'RECEBIDO', rotulo: 'Recebido' },
              { valor: 'CANCELADO', rotulo: 'Cancelado' },
            ],
          },
          {
            chave: 'fornecedor',
            rotulo: 'Todos os fornecedores',
            larguraClasse: 'w-52',
            opcoes: fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome })),
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 ? (
          <EmptyState
            icone={Truck}
            titulo="Nenhum pedido de compra"
            descricao="Crie um pedido para registrar o que foi encomendado e conferir no recebimento."
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Pedido</TH>
                    <TH>Fornecedor</TH>
                    <TH>Pedido em</TH>
                    <TH>Previsto</TH>
                    <TH numerico>Linhas</TH>
                    <TH numerico>Recebido</TH>
                    <TH numerico>Total</TH>
                    <TH>Status</TH>
                    <TH className="w-20" />
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <CodigoDoc>{p.codigo}</CodigoDoc>
                      </TD>
                      <TD>
                        <CellStack principal={p.fornecedor.nome} apoio={p.usuario} />
                      </TD>
                      <TD>
                        <span className="text-sm">{fmtData(p.dataPedido)}</span>
                      </TD>
                      <TD>
                        {p.dataPrevista ? (
                          <span className={p.atrasado ? 'text-sm font-bold text-danger' : 'text-sm'}>
                            {fmtData(p.dataPrevista)}
                          </span>
                        ) : (
                          <span className="text-sm text-body-subtle">—</span>
                        )}
                      </TD>
                      <TD numerico>{numero(p.linhas)}</TD>
                      <TD numerico>{percentual(p.percentualRecebido)}</TD>
                      <TD numerico>{moeda(p.total)}</TD>
                      <TD>
                        <Badge
                          tone={
                            p.status === 'RECEBIDO'
                              ? 'leaf'
                              : p.status === 'PARCIAL'
                                ? 'caution'
                                : p.status === 'CANCELADO'
                                  ? 'danger'
                                  : p.status === 'ENVIADO'
                                    ? 'brand'
                                    : 'neutral'
                          }
                        >
                          {rotulo('statusCompra', p.status)}
                        </Badge>
                      </TD>
                      <TD>
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/compras/${p.id}`}>Abrir</Link>
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <PaginacaoUrl pagina={dados.pagina} porPagina={dados.porPagina} total={dados.total} />
          </>
        )}
      </Panel>
    </>
  )
}
