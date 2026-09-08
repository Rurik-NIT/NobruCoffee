import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BarrasRanking, ChartFrame } from '@/components/charts'
import { PageHeader, Panel, TotalRow } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, moeda, percentual, quantidade as fmtQtd } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { historicoFichas, obterFicha } from '@/server/modules/fichas/service'
import { AcoesVersao } from './acoes'

export const metadata: Metadata = { title: 'Ficha técnica' }
export const dynamic = 'force-dynamic'

export default async function PaginaFicha({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPermissao('fichas.ver')
  const { id } = await params

  const ficha = await obterFicha(sessao.lojaId, id)
  if (!ficha) notFound()

  const [historico, podeGerenciar] = await Promise.all([
    historicoFichas(sessao.lojaId, ficha.produto.id),
    podeFazer('fichas.gerenciar'),
  ])

  return (
    <>
      <PageHeader
        titulo={ficha.produto.nome}
        descricao={
          <>
            Ficha v{ficha.versao} {ficha.ativa ? '(ativa)' : '(histórico)'} · rende{' '}
            {fmtQtd(ficha.rendimento, ficha.unidadeRendimento)} · criada por {ficha.criadoPor ?? 'sistema'} em{' '}
            {dataHora(ficha.criadoEm)}
          </>
        }
        voltar={{ href: '/fichas-tecnicas', rotulo: 'Fichas técnicas' }}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { r: 'Custo da receita', v: moeda(ficha.custoTotal) },
          { r: 'Custo por unidade', v: moeda(ficha.custoUnitario) },
          { r: 'Preço de venda', v: moeda(ficha.precoVenda) },
          { r: 'Margem', v: percentual(ficha.margem) },
        ].map((i) => (
          <div key={i.r} className="rounded-card border border-hairline bg-paper-raised p-5 shadow-card">
            <p className="eyebrow">{i.r}</p>
            <p className="mt-1.5 font-display text-2xl font-extrabold" data-numeric>
              {i.v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel titulo="Composição" descricao="Quantidade, perda técnica e custo de cada insumo.">
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Insumo</TH>
                  <TH numerico>Quantidade</TH>
                  <TH numerico>Perda</TH>
                  <TH numerico>Custo médio</TH>
                  <TH numerico>Custo</TH>
                </TR>
              </THead>
              <TBody>
                {ficha.itens.map((i) => (
                  <TR key={i.id}>
                    <TD>
                      <span className="text-sm font-semibold">{i.nome}</span>
                      <span className="block text-xs text-body-muted">{i.sku}</span>
                    </TD>
                    <TD numerico>{fmtQtd(i.quantidade, i.unidade)}</TD>
                    <TD numerico>{i.perdaPercentual > 0 ? percentual(i.perdaPercentual) : '—'}</TD>
                    <TD numerico>{moeda(i.custoMedio)}</TD>
                    <TD numerico>{moeda(i.custo)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-hairline px-5 py-3">
            <TotalRow rotulo="Custo total da receita" destaque>
              {moeda(ficha.custoTotal)}
            </TotalRow>
          </div>
          {ficha.modoPreparo ? (
            <div className="border-t border-hairline px-5 py-4">
              <p className="eyebrow mb-2">Modo de preparo</p>
              <p className="text-sm whitespace-pre-line text-body-muted">{ficha.modoPreparo}</p>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-4">
          <ChartFrame
            titulo="Onde está o custo"
            descricao="Participação de cada insumo"
            dados={{
              colunas: ['Insumo', 'Custo'],
              linhas: ficha.composicao.map((c) => [c.rotulo, moeda(c.valor)]),
            }}
          >
            <BarrasRanking itens={ficha.composicao} mostrarPercentual />
          </ChartFrame>

          <Panel titulo="Histórico de versões" descricao="O custo de cada versão fica congelado.">
            <ul className="divide-y divide-hairline">
              {historico.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge tone={v.ativa ? 'leaf' : 'neutral'}>v{v.versao}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" data-numeric>
                      {moeda(v.custoUnitario)} / un
                    </p>
                    <p className="text-xs text-body-muted">
                      {v.itens} insumo(s) · {dataHora(v.criadoEm)}
                      {v.criadoPor ? ` · ${v.criadoPor}` : ''}
                    </p>
                  </div>
                  {podeGerenciar && !v.ativa ? <AcoesVersao fichaId={v.id} versao={v.versao} /> : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
