import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'

import { BarrasRanking, ChartFrame } from '@/components/charts'
import { PageHeader, Panel, TotalRow } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, dataLonga, decimal, moeda, quantidade as fmtQtd, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { obterOrdem } from '@/server/modules/producao/service'
import { PainelApontamento } from './apontamento'

export const metadata: Metadata = { title: 'Ordem de produção' }
export const dynamic = 'force-dynamic'

export default async function PaginaOrdem({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPermissao('producao.ver')
  const { id } = await params

  const [ordem, podeGerenciar] = await Promise.all([obterOrdem(sessao.lojaId, id), podeFazer('producao.gerenciar')])
  if (!ordem) notFound()

  return (
    <>
      <PageHeader
        titulo={`Ordem ${ordem.codigo}`}
        descricao={`${dataLonga(ordem.data)}${ordem.turno ? ` · ${ordem.turno}` : ''} · responsável ${ordem.responsavel.nome}`}
        voltar={{ href: '/producao/ordens', rotulo: 'Ordens de produção' }}
        acoes={
          <Badge
            tone={
              ordem.status === 'CONCLUIDA'
                ? 'leaf'
                : ordem.status === 'EM_PRODUCAO'
                  ? 'caution'
                  : ordem.status === 'CANCELADA'
                    ? 'danger'
                    : 'neutral'
            }
          >
            {rotulo('statusProducao', ordem.status)}
          </Badge>
        }
      />

      {ordem.faltando.length > 0 && ordem.status !== 'CONCLUIDA' ? (
        <div className="mb-5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-danger">
            <TriangleAlert className="size-4" />
            Vai faltar insumo para esta ordem
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-danger">
            {ordem.faltando.map((f) => (
              <li key={f.ingredienteId}>
                {f.nome}: falta {fmtQtd(f.falta, f.unidade)} (precisa {fmtQtd(f.quantidade, f.unidade)}, tem{' '}
                {fmtQtd(f.estoqueAtual, f.unidade)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <PainelApontamento
          ordem={{
            id: ordem.id,
            codigo: ordem.codigo,
            status: ordem.status,
            custoEstimado: ordem.custoEstimado,
            custoReal: ordem.custoReal,
            itens: ordem.itens,
          }}
          podeGerenciar={podeGerenciar}
        />

        <div className="space-y-4">
          <Panel titulo="Insumos necessários" descricao="Consolidado de toda a ordem, com a perda técnica das fichas.">
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Insumo</TH>
                    <TH numerico>Precisa</TH>
                    <TH numerico>Tem</TH>
                    <TH numerico>Custo</TH>
                  </TR>
                </THead>
                <TBody>
                  {ordem.insumos.map((i) => (
                    <TR key={i.ingredienteId}>
                      <TD>
                        <span className="text-sm font-semibold">{i.nome}</span>
                      </TD>
                      <TD numerico>{fmtQtd(i.quantidade, i.unidade)}</TD>
                      <TD numerico>
                        <span className={i.falta > 0 ? 'font-bold text-danger' : ''}>
                          {fmtQtd(i.estoqueAtual, i.unidade)}
                        </span>
                      </TD>
                      <TD numerico>{moeda(i.custoTotal)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <div className="border-t border-hairline px-5 py-3">
              <TotalRow rotulo="Custo dos insumos" destaque>
                {moeda(ordem.custoInsumos)}
              </TotalRow>
            </div>
          </Panel>

          {ordem.insumos.length > 0 ? (
            <ChartFrame titulo="Custo por insumo" descricao="O que pesa nesta ordem">
              <BarrasRanking
                itens={ordem.insumos.map((i) => ({ rotulo: i.nome, valor: i.custoTotal }))}
                mostrarPercentual
                limite={8}
              />
            </ChartFrame>
          ) : null}

          {ordem.perdas.length > 0 ? (
            <Panel titulo="Perdas apontadas">
              <ul className="divide-y divide-hairline">
                {ordem.perdas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span>
                      <span className="block font-semibold">{p.item}</span>
                      <span className="block text-xs text-body-muted">
                        {decimal(p.quantidade)} un · {rotulo('motivoPerda', p.motivo)} · {p.usuario} ·{' '}
                        {dataHora(p.criadoEm)}
                      </span>
                    </span>
                    <span className="font-bold text-danger" data-numeric>
                      {moeda(p.custoEstimado)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  )
}
