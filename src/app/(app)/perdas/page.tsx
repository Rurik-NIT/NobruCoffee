import type { Metadata } from 'next'
import { Trash2, TrendingDown } from 'lucide-react'

import { BarrasRanking, ChartFrame, StatTile } from '@/components/charts'
import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, moeda, numero, quantidade as fmtQtd, rotulo, variacaoTexto } from '@/lib/format'
import { variacao } from '@/lib/money'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { opcoesIngredientes } from '@/server/modules/estoque/queries'
import { listarPerdas, resumoPerdas } from '@/server/modules/perdas/service'
import { db } from '@/server/db'
import { RegistrarPerda } from './registrar'

export const metadata: Metadata = { title: 'Perdas' }
export const dynamic = 'force-dynamic'

export default async function PaginaPerdas({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string; tipo?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('perdas.ver')
  const sp = await searchParams

  const [dados, resumo, ingredientes, produtos, podeRegistrar] = await Promise.all([
    listarPerdas({
      lojaId: sessao.lojaId,
      motivo: sp.motivo,
      tipo: (sp.tipo as never) ?? 'todos',
      de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
      ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
      pagina: Number(sp.pagina ?? 1),
    }),
    resumoPerdas(sessao.lojaId),
    opcoesIngredientes(sessao.lojaId),
    db.produto.findMany({
      where: { lojaId: sessao.lojaId, ativo: true },
      select: { id: true, nome: true, sku: true, unidade: true },
      orderBy: { nome: 'asc' },
    }),
    podeFazer('perdas.registrar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Perdas"
        descricao="Tudo que virou custo sem virar venda. É a métrica que muda a decisão de produção de amanhã."
        acoes={podeRegistrar ? <RegistrarPerda ingredientes={ingredientes} produtos={produtos} /> : null}
      />

      <KpiGrid className="mb-4">
        <StatTile
          rotulo="Perdas no mês"
          valor={moeda(resumo.totalMes)}
          variacao={variacaoTexto(variacao(resumo.totalMes, resumo.totalMesAnterior))}
          tomVariacao="inverso"
          apoio={`mês anterior: ${moeda(resumo.totalMesAnterior)}`}
          icone={TrendingDown}
        />
        <StatTile rotulo="Ocorrências no mês" valor={numero(resumo.ocorrencias)} icone={Trash2} />
        <StatTile
          rotulo="Maior fonte"
          valor={resumo.ranking[0] ? moeda(resumo.ranking[0].valor) : '—'}
          apoio={resumo.ranking[0]?.rotulo ?? 'sem perdas no mês'}
          icone={TrendingDown}
        />
        <StatTile
          rotulo="Principal motivo"
          valor={resumo.porMotivo[0] ? rotulo('motivoPerda', resumo.porMotivo[0].rotulo) : '—'}
          apoio={resumo.porMotivo[0] ? moeda(resumo.porMotivo[0].valor) : undefined}
          icone={Trash2}
        />
      </KpiGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartFrame
          titulo="Perdas por item"
          descricao="No mês corrente"
          dados={{ colunas: ['Item', 'Custo'], linhas: resumo.ranking.map((r) => [r.rotulo, moeda(r.valor)]) }}
        >
          {resumo.ranking.length ? (
            <BarrasRanking itens={resumo.ranking} mostrarPercentual />
          ) : (
            <EmptyState titulo="Nenhuma perda no mês" descricao="Isso é uma boa notícia." />
          )}
        </ChartFrame>
        <ChartFrame titulo="Perdas por motivo" descricao="No mês corrente">
          {resumo.porMotivo.length ? (
            <BarrasRanking
              itens={resumo.porMotivo.map((m) => ({ ...m, rotulo: rotulo('motivoPerda', m.rotulo) }))}
              mostrarPercentual
            />
          ) : (
            <EmptyState titulo="Sem registros" />
          )}
        </ChartFrame>
      </div>

      <FiltrosLista
        buscaPlaceholder="Buscar…"
        datas
        selects={[
          {
            chave: 'tipo',
            rotulo: 'Produtos e insumos',
            opcoes: [
              { valor: 'produto', rotulo: 'Só produtos' },
              { valor: 'insumo', rotulo: 'Só insumos' },
            ],
          },
          {
            chave: 'motivo',
            rotulo: 'Todos os motivos',
            opcoes: [
              { valor: 'QUEIMADO', rotulo: 'Queimado' },
              { valor: 'DANIFICADO', rotulo: 'Danificado' },
              { valor: 'VENCIDO', rotulo: 'Vencido' },
              { valor: 'ERRO_PRODUCAO', rotulo: 'Erro de produção' },
              { valor: 'NAO_VENDIDO', rotulo: 'Não vendido' },
              { valor: 'EMBALAGEM', rotulo: 'Embalagem' },
              { valor: 'CORTESIA', rotulo: 'Cortesia' },
              { valor: 'OUTRO', rotulo: 'Outro' },
            ],
          },
        ]}
      />

      <Panel titulo="Registros" descricao={`${moeda(dados.custoTotal)} no filtro atual`}>
        {dados.itens.length === 0 ? (
          <EmptyState icone={Trash2} titulo="Nenhuma perda no filtro" />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Quando</TH>
                    <TH>Item</TH>
                    <TH numerico>Quantidade</TH>
                    <TH>Motivo</TH>
                    <TH>Quem registrou</TH>
                    <TH>Observação</TH>
                    <TH numerico>Custo</TH>
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <span className="text-xs text-body-muted">{dataHora(p.criadoEm)}</span>
                      </TD>
                      <TD>
                        <CellStack
                          principal={p.item}
                          apoio={
                            <>
                              {p.ehProduto ? 'produto' : 'insumo'}
                              {p.ordem ? ` · ordem ${p.ordem.codigo}` : ''}
                            </>
                          }
                        />
                      </TD>
                      <TD numerico>{fmtQtd(p.quantidade, p.unidade)}</TD>
                      <TD>
                        <Badge tone={p.motivo === 'CORTESIA' ? 'info' : 'caution'} size="sm">
                          {rotulo('motivoPerda', p.motivo)}
                        </Badge>
                      </TD>
                      <TD>
                        <span className="text-xs text-body-muted">{p.usuario}</span>
                      </TD>
                      <TD>
                        <span className="text-xs text-body-muted">{p.observacao ?? '—'}</span>
                      </TD>
                      <TD numerico>
                        <span className="font-bold text-danger">{moeda(p.custoEstimado)}</span>
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
