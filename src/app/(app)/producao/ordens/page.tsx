import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, decimal, moeda, numero, percentual, rotulo } from '@/lib/format'
import { exigirPermissao } from '@/server/auth/session'
import { listarOrdens } from '@/server/modules/producao/service'

export const metadata: Metadata = { title: 'Ordens de produção' }
export const dynamic = 'force-dynamic'

export default async function PaginaOrdens({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('producao.ver')
  const sp = await searchParams

  const dados = await listarOrdens({
    lojaId: sessao.lojaId,
    status: sp.status,
    de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
    ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
    pagina: Number(sp.pagina ?? 1),
  })

  return (
    <>
      <PageHeader
        titulo="Ordens de produção"
        descricao="Histórico do que foi planejado e produzido, com custo previsto e real."
        voltar={{ href: '/producao', rotulo: 'Produção do dia' }}
      />

      <FiltrosLista
        buscaPlaceholder="Buscar…"
        datas
        selects={[
          {
            chave: 'status',
            rotulo: 'Todos os status',
            opcoes: [
              { valor: 'PLANEJADA', rotulo: 'Planejada' },
              { valor: 'EM_PRODUCAO', rotulo: 'Em produção' },
              { valor: 'CONCLUIDA', rotulo: 'Concluída' },
              { valor: 'CANCELADA', rotulo: 'Cancelada' },
            ],
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 ? (
          <EmptyState icone={ClipboardList} titulo="Nenhuma ordem no filtro" />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Ordem</TH>
                    <TH>Data</TH>
                    <TH>Responsável</TH>
                    <TH numerico>Planejado</TH>
                    <TH numerico>Produzido</TH>
                    <TH numerico>Perdido</TH>
                    <TH numerico>Custo real</TH>
                    <TH numerico>Desvio</TH>
                    <TH>Status</TH>
                    <TH className="w-20" />
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((o) => {
                    const desvio = o.custoEstimado > 0 ? ((o.custoReal - o.custoEstimado) / o.custoEstimado) * 100 : null
                    return (
                      <TR key={o.id}>
                        <TD>
                          <CodigoDoc>{o.codigo}</CodigoDoc>
                        </TD>
                        <TD>
                          <span className="text-sm">{fmtData(o.data)}</span>
                          {o.turno ? <span className="block text-xs text-body-muted">{o.turno}</span> : null}
                        </TD>
                        <TD>
                          <span className="text-sm">{o.responsavel}</span>
                        </TD>
                        <TD numerico>{decimal(o.planejado)}</TD>
                        <TD numerico>{decimal(o.produzido)}</TD>
                        <TD numerico>{o.perdido > 0 ? <span className="text-danger">{decimal(o.perdido)}</span> : '—'}</TD>
                        <TD numerico>{o.custoReal > 0 ? moeda(o.custoReal) : moeda(o.custoEstimado)}</TD>
                        <TD numerico>
                          {o.custoReal > 0 && desvio !== null ? (
                            <span className={desvio > 5 ? 'font-bold text-danger' : desvio < -5 ? 'font-bold text-leaf' : ''}>
                              {desvio > 0 ? '+' : ''}
                              {percentual(desvio)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TD>
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
                    )
                  })}
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
