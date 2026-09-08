import type { Metadata } from 'next'
import Link from 'next/link'
import { ChefHat, ClipboardList, CookingPot, TriangleAlert } from 'lucide-react'

import { BarraProgresso, StatTile } from '@/components/charts'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge, Stamp } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CellStack, CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataLonga, decimal, hora, moeda, numero, percentual, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { producaoDoDia, sugerirProducao } from '@/server/modules/producao/service'
import { NovaOrdem } from './nova-ordem'

export const metadata: Metadata = { title: 'Produção do dia' }
export const dynamic = 'force-dynamic'

export default async function PaginaProducao({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sessao = await exigirPermissao('producao.ver')
  const sp = await searchParams
  const data = sp.data ? new Date(`${sp.data}T12:00:00`) : new Date()

  const [dia, sugestoes, podeGerenciar] = await Promise.all([
    producaoDoDia(sessao.lojaId, data),
    sugerirProducao(sessao.lojaId),
    podeFazer('producao.gerenciar'),
  ])

  const aproveitamento =
    dia.totais.produzido + dia.totais.perdido > 0
      ? (dia.totais.produzido / (dia.totais.produzido + dia.totais.perdido)) * 100
      : null

  return (
    <>
      <PageHeader
        titulo="Produção do dia"
        descricao={`${dataLonga(dia.data)} · o que foi planejado, o que saiu do forno e o que já vendeu.`}
        acoes={
          <>
            <Button variant="secondary" asChild>
              <Link href="/producao/ordens">
                <ClipboardList />
                Todas as ordens
              </Link>
            </Button>
            {podeGerenciar ? <NovaOrdem sugestoes={sugestoes} /> : null}
          </>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Planejado hoje" valor={decimal(dia.totais.planejado)} icone={ClipboardList} />
        <StatTile
          rotulo="Produzido"
          valor={decimal(dia.totais.produzido)}
          icone={ChefHat}
          apoio={dia.totais.planejado > 0 ? `${((dia.totais.produzido / dia.totais.planejado) * 100).toFixed(0)}% do plano` : undefined}
        />
        <StatTile rotulo="Vendido" valor={decimal(dia.totais.vendido)} icone={CookingPot} />
        <StatTile
          rotulo="Aproveitamento"
          valor={aproveitamento === null ? '—' : percentual(aproveitamento)}
          icone={TriangleAlert}
          apoio={dia.totais.perdido > 0 ? `${decimal(dia.totais.perdido)} perdidos` : 'nenhuma perda'}
        />
      </KpiGrid>

      {dia.ordens.length > 0 ? (
        <Panel titulo="Ordens de hoje" className="mb-5">
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Ordem</TH>
                  <TH>Turno</TH>
                  <TH>Responsável</TH>
                  <TH numerico>Itens</TH>
                  <TH numerico>Custo previsto</TH>
                  <TH numerico>Custo real</TH>
                  <TH>Status</TH>
                  <TH className="w-24" />
                </TR>
              </THead>
              <TBody>
                {dia.ordens.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <CodigoDoc>{o.codigo}</CodigoDoc>
                    </TD>
                    <TD>
                      <span className="text-xs text-body-muted">{o.turno ?? '—'}</span>
                    </TD>
                    <TD>
                      <span className="text-sm">{o.responsavel}</span>
                    </TD>
                    <TD numerico>{numero(o.itens)}</TD>
                    <TD numerico>{moeda(o.custoEstimado)}</TD>
                    <TD numerico>{o.custoReal > 0 ? moeda(o.custoReal) : <span className="text-body-subtle">—</span>}</TD>
                    <TD>
                      <Badge
                        tone={
                          o.status === 'CONCLUIDA'
                            ? 'leaf'
                            : o.status === 'EM_PRODUCAO'
                              ? 'caution'
                              : o.status === 'CANCELADA'
                                ? 'danger'
                                : 'neutral'
                        }
                      >
                        {rotulo('statusProducao', o.status)}
                      </Badge>
                    </TD>
                    <TD>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/producao/ordens/${o.id}`}>Abrir</Link>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      ) : null}

      <Panel
        titulo="Quadro do dia"
        descricao="Uma linha por produto. Estoque zerado com venda no dia é sinal de que vai faltar."
      >
        {dia.itens.length === 0 ? (
          <EmptyState
            icone={CookingPot}
            titulo="Nada produzido nem vendido hoje"
            descricao="Crie a ordem de produção do dia — a sugestão usa a média dos últimos 7 dias."
            acao={podeGerenciar ? <NovaOrdem sugestoes={sugestoes} /> : undefined}
          />
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
                  <TH numerico>Em estoque</TH>
                  <TH>Andamento</TH>
                </TR>
              </THead>
              <TBody>
                {dia.itens.map((i) => (
                  <TR key={i.produtoId}>
                    <TD>
                      <CellStack principal={i.nome} apoio={i.sku} />
                    </TD>
                    <TD numerico>{decimal(i.planejado)}</TD>
                    <TD numerico>{decimal(i.produzido)}</TD>
                    <TD numerico>
                      {i.perdido > 0 ? <span className="font-bold text-danger">{decimal(i.perdido)}</span> : '—'}
                    </TD>
                    <TD numerico>{decimal(i.vendido)}</TD>
                    <TD numerico>
                      {i.estoque <= 0 ? (
                        !i.disponivel ? (
                          <Stamp>Sold out</Stamp>
                        ) : (
                          <span className="font-bold text-danger">0</span>
                        )
                      ) : (
                        decimal(i.estoque)
                      )}
                    </TD>
                    <TD>
                      <div className="w-28">
                        <BarraProgresso
                          atual={i.produzido}
                          meta={i.planejado || i.produzido || 1}
                          tom={i.planejado > 0 && i.produzido >= i.planejado ? 'leaf' : 'brand'}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  )
}
