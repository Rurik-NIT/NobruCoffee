import type { Metadata } from 'next'
import { Boxes, ChartNoAxesColumn, ChefHat, Receipt, TrendingUp } from 'lucide-react'

import { AreaTendencia, BarrasRanking, ChartFrame, StatTile } from '@/components/charts'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { SeletorPeriodo } from '@/components/patterns/periodo'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, decimal, moeda, numero, percentual, quantidade as fmtQtd, rotulo, variacaoTexto } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { periodoDe, relatorioEstoque, relatorioProducao, relatorioVendas } from '@/server/modules/relatorios/service'

export const metadata: Metadata = { title: 'Relatórios' }
export const dynamic = 'force-dynamic'

export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const sessao = await exigirPermissao('relatorios.ver')
  const sp = await searchParams
  const atalho = sp.periodo ?? '30dias'
  const periodo = periodoDe(atalho)

  const [vendas, estoque, producao, verFinanceiro] = await Promise.all([
    relatorioVendas(sessao.lojaId, periodo),
    relatorioEstoque(sessao.lojaId),
    relatorioProducao(sessao.lojaId, periodo),
    podeFazer('relatorios.financeiro'),
  ])

  return (
    <>
      <PageHeader
        titulo="Relatórios"
        descricao={`${fmtData(periodo.de)} a ${fmtData(new Date(periodo.ate.getTime() - 1))}`}
        acoes={<SeletorPeriodo atual={atalho} />}
      />

      <KpiGrid className="mb-5">
        <StatTile
          rotulo="Faturamento"
          valor={moeda(vendas.faturamento)}
          variacao={variacaoTexto(vendas.variacaoFaturamento)}
          apoio={`período anterior: ${moeda(vendas.faturamentoAnterior)}`}
          icone={TrendingUp}
        />
        <StatTile
          rotulo="Pedidos"
          valor={numero(vendas.pedidos)}
          variacao={variacaoTexto(vendas.variacaoPedidos)}
          icone={Receipt}
        />
        <StatTile rotulo="Ticket médio" valor={moeda(vendas.ticketMedio)} icone={Receipt} />
        {verFinanceiro ? (
          <StatTile
            rotulo="Lucro bruto"
            valor={moeda(vendas.lucroBruto)}
            apoio={`margem ${percentual(vendas.margemBruta)} · CMV ${moeda(vendas.cmv)}`}
            icone={ChartNoAxesColumn}
          />
        ) : (
          <StatTile rotulo="Descontos concedidos" valor={moeda(vendas.descontos)} icone={ChartNoAxesColumn} />
        )}
      </KpiGrid>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
        </TabsList>

        {/* ── VENDAS ─────────────────────────────────────────────────────── */}
        <TabsContent value="vendas">
          <div className="grid gap-4">
            <ChartFrame
              titulo="Faturamento por dia"
              descricao="No período selecionado"
              destaque={moeda(vendas.faturamento)}
              dados={{
                colunas: ['Dia', 'Faturamento'],
                linhas: vendas.porDia.map((d) => [d.rotulo, moeda(d.valor)]),
              }}
            >
              {vendas.porDia.length > 1 ? (
                <AreaTendencia dados={vendas.porDia} nomeSerie1="Faturamento" altura={240} />
              ) : (
                <EmptyState titulo="Poucos dias no período" descricao="Escolha um período mais longo." />
              )}
            </ChartFrame>

            <div className="grid gap-4 lg:grid-cols-3">
              <ChartFrame titulo="Por tipo de venda" descricao="Balcão, mesa, delivery…">
                {vendas.porTipo.length ? (
                  <BarrasRanking
                    itens={vendas.porTipo.map((t) => ({ ...t, rotulo: rotulo('tipoPedido', t.rotulo) }))}
                    mostrarPercentual
                  />
                ) : (
                  <EmptyState titulo="Sem vendas no período" />
                )}
              </ChartFrame>

              <ChartFrame titulo="Por forma de pagamento" descricao="Inclui taxas retidas">
                {vendas.porFormaPagamento.length ? (
                  <BarrasRanking itens={vendas.porFormaPagamento} mostrarPercentual />
                ) : (
                  <EmptyState titulo="Sem pagamentos no período" />
                )}
              </ChartFrame>

              <ChartFrame titulo="Por operador" descricao="Quem vendeu quanto">
                {vendas.porOperador.length ? (
                  <BarrasRanking itens={vendas.porOperador} mostrarPercentual />
                ) : (
                  <EmptyState titulo="Sem vendas no período" />
                )}
              </ChartFrame>
            </div>
          </div>
        </TabsContent>

        {/* ── PRODUTOS ───────────────────────────────────────────────────── */}
        <TabsContent value="produtos">
          <Panel
            titulo="Desempenho por produto"
            descricao="Ordenado por faturamento. A margem aqui usa o custo congelado na venda."
          >
            {vendas.produtos.length === 0 ? (
              <EmptyState titulo="Nenhuma venda no período" />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Produto</TH>
                      <TH>Categoria</TH>
                      <TH numerico>Vendidos</TH>
                      <TH numerico>Faturamento</TH>
                      {verFinanceiro ? <TH numerico>Custo</TH> : null}
                      {verFinanceiro ? <TH numerico>Lucro</TH> : null}
                      {verFinanceiro ? <TH numerico>Margem</TH> : null}
                    </TR>
                  </THead>
                  <TBody>
                    {vendas.produtos.map((p) => (
                      <TR key={p.nome}>
                        <TD>
                          <CellStack principal={p.nome} />
                        </TD>
                        <TD>
                          <span className="text-xs text-body-muted">{p.categoria}</span>
                        </TD>
                        <TD numerico>{decimal(p.quantidade)}</TD>
                        <TD numerico>{moeda(p.faturamento)}</TD>
                        {verFinanceiro ? <TD numerico>{moeda(p.custo)}</TD> : null}
                        {verFinanceiro ? <TD numerico>{moeda(p.lucro)}</TD> : null}
                        {verFinanceiro ? (
                          <TD numerico>
                            <span className={p.margem >= 60 ? 'font-bold text-leaf' : p.margem >= 35 ? '' : 'font-bold text-danger'}>
                              {percentual(p.margem)}
                            </span>
                          </TD>
                        ) : null}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </Panel>
        </TabsContent>

        {/* ── PRODUÇÃO ───────────────────────────────────────────────────── */}
        <TabsContent value="producao">
          <div className="grid gap-4">
            <KpiGrid>
              <StatTile rotulo="Planejado" valor={decimal(producao.totais.planejado)} icone={ChefHat} />
              <StatTile rotulo="Produzido" valor={decimal(producao.totais.produzido)} icone={ChefHat} />
              <StatTile rotulo="Perdido" valor={decimal(producao.totais.perdido)} icone={ChefHat} tomVariacao="inverso" />
              <StatTile rotulo="Custo de produção" valor={moeda(producao.totais.custo)} icone={ChefHat} />
            </KpiGrid>

            <Panel titulo="Planejado × produzido × vendido" descricao="Só ordens concluídas no período.">
              {producao.itens.length === 0 ? (
                <EmptyState titulo="Nenhuma produção concluída no período" />
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <TR className="hover:bg-transparent">
                        <TH>Produto</TH>
                        <TH numerico>Planejado</TH>
                        <TH numerico>Produzido</TH>
                        <TH numerico>Perdido</TH>
                        <TH numerico>Vendido</TH>
                        <TH numerico>Aderência</TH>
                        <TH numerico>Aproveitamento</TH>
                        <TH numerico>Custo</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {producao.itens.map((i) => (
                        <TR key={i.nome}>
                          <TD>
                            <CellStack principal={i.nome} />
                          </TD>
                          <TD numerico>{decimal(i.planejado)}</TD>
                          <TD numerico>{decimal(i.produzido)}</TD>
                          <TD numerico>
                            {i.perdido > 0 ? <span className="font-bold text-danger">{decimal(i.perdido)}</span> : '—'}
                          </TD>
                          <TD numerico>{decimal(i.vendido)}</TD>
                          <TD numerico>{i.aderencia === null ? '—' : percentual(i.aderencia)}</TD>
                          <TD numerico>
                            {i.aproveitamento === null ? (
                              '—'
                            ) : (
                              <span className={i.aproveitamento >= 95 ? 'font-bold text-leaf' : 'font-bold text-caution'}>
                                {percentual(i.aproveitamento)}
                              </span>
                            )}
                          </TD>
                          <TD numerico>{moeda(i.custo)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </Panel>
          </div>
        </TabsContent>

        {/* ── ESTOQUE ────────────────────────────────────────────────────── */}
        <TabsContent value="estoque">
          <div className="grid gap-4">
            <KpiGrid>
              <StatTile rotulo="Valor em estoque" valor={moeda(estoque.valorTotal)} icone={Boxes} apoio="a custo médio" />
              <StatTile rotulo="Insumos em alerta" valor={numero(estoque.emAlerta)} icone={Boxes} />
              <StatTile rotulo="Perdas (30 dias)" valor={moeda(estoque.perdas30d)} icone={Boxes} tomVariacao="inverso" />
              <StatTile rotulo="Ocorrências de perda" valor={numero(estoque.perdasQtd30d)} icone={Boxes} />
            </KpiGrid>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartFrame titulo="Onde está o dinheiro do estoque" descricao="Maiores valores parados">
                {estoque.maioresValores.length ? (
                  <BarrasRanking itens={estoque.maioresValores} mostrarPercentual />
                ) : (
                  <EmptyState titulo="Nenhum insumo com saldo" />
                )}
              </ChartFrame>
              <ChartFrame titulo="Movimentações por tipo" descricao="Últimos 30 dias">
                {estoque.movimentosPorTipo.length ? (
                  <BarrasRanking
                    itens={estoque.movimentosPorTipo.map((m) => ({ ...m, rotulo: rotulo('tipoMovimento', m.rotulo) }))}
                    formatador={(v) => `${numero(v)} mov.`}
                  />
                ) : (
                  <EmptyState titulo="Nenhuma movimentação" />
                )}
              </ChartFrame>
            </div>

            <Panel titulo="Posição de estoque" descricao="Todos os insumos ativos.">
              <TableWrap>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Insumo</TH>
                      <TH numerico>Saldo</TH>
                      <TH numerico>Mínimo</TH>
                      <TH numerico>Custo médio</TH>
                      <TH numerico>Valor</TH>
                      <TH>Situação</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {estoque.itens.map((i) => (
                      <TR key={i.id}>
                        <TD>
                          <CellStack principal={i.nome} apoio={i.sku} />
                        </TD>
                        <TD numerico>{fmtQtd(i.estoqueAtual, i.unidade)}</TD>
                        <TD numerico>{i.estoqueMinimo > 0 ? fmtQtd(i.estoqueMinimo, i.unidade) : '—'}</TD>
                        <TD numerico>{moeda(i.custoMedio)}</TD>
                        <TD numerico>{moeda(i.valor)}</TD>
                        <TD>
                          {i.estoqueAtual <= 0 ? (
                            <Badge tone="danger">Zerado</Badge>
                          ) : i.abaixoDoMinimo ? (
                            <Badge tone="caution">No mínimo</Badge>
                          ) : (
                            <Badge tone="leaf">Ok</Badge>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
