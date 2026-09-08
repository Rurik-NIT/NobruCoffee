import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, Panel, TotalRow } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/states'
import { dataHora, hora, moeda, numero, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { calcularResumo, extratoCaixa } from '@/server/modules/caixa/service'
import { BotaoConferir, PainelCaixaAberto } from '../painel'

export const metadata: Metadata = { title: 'Caixa' }
export const dynamic = 'force-dynamic'

export default async function PaginaCaixa({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPermissao('caixa.ver')
  const { id } = await params

  const existe = await db.caixa.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { id: true } })
  if (!existe) notFound()

  const [resumo, extrato, podeSangria, podeFechar, podeConferir] = await Promise.all([
    calcularResumo(db, id),
    extratoCaixa(id),
    podeFazer('caixa.sangria'),
    podeFazer('caixa.fechar'),
    podeFazer('caixa.conferir'),
  ])

  const precisaConferir = resumo.status === 'FECHADO' && resumo.diferenca !== null && resumo.diferenca !== 0

  return (
    <>
      <PageHeader
        titulo={`Caixa ${resumo.codigo}`}
        descricao={`Aberto em ${dataHora(resumo.abertoEm)} por ${resumo.usuarioAbertura}${
          resumo.fechadoEm ? ` · fechado em ${dataHora(resumo.fechadoEm)} por ${resumo.usuarioFechamento}` : ''
        }`}
        voltar={{ href: '/caixas', rotulo: 'Todos os caixas' }}
        acoes={
          precisaConferir && podeConferir ? (
            <BotaoConferir caixaId={resumo.id} codigo={resumo.codigo} diferenca={resumo.diferenca!} />
          ) : null
        }
      />

      {resumo.status === 'ABERTO' ? (
        <PainelCaixaAberto resumo={resumo} podeSangria={podeSangria} podeFechar={podeFechar} />
      ) : (
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel titulo="Conferência do fechamento">
            <dl className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
              {[
                { r: 'Fundo de troco', v: moeda(resumo.saldoInicial) },
                { r: 'Esperado em espécie', v: moeda(resumo.saldoEsperado) },
                { r: 'Contado', v: resumo.saldoInformado === null ? '—' : moeda(resumo.saldoInformado) },
                {
                  r: 'Diferença',
                  v: resumo.diferenca === null ? '—' : moeda(resumo.diferenca),
                  tom: resumo.diferenca === 0 ? 'text-leaf' : 'text-danger',
                },
              ].map((i) => (
                <div key={i.r}>
                  <dt className="eyebrow">{i.r}</dt>
                  <dd className={`mt-1 font-display text-lg font-extrabold ${i.tom ?? ''}`} data-numeric>
                    {i.v}
                  </dd>
                </div>
              ))}
            </dl>
            {resumo.observacaoFechamento ? (
              <p className="border-t border-hairline px-5 py-3 text-sm text-body-muted">
                <span className="font-semibold text-body">Observação: </span>
                {resumo.observacaoFechamento}
              </p>
            ) : null}
          </Panel>

          <Panel titulo="Por forma de pagamento">
            <div className="space-y-2 px-5 py-4">
              {resumo.porForma.length === 0 ? (
                <p className="text-sm text-body-muted">Nenhuma venda neste caixa.</p>
              ) : (
                <>
                  {resumo.porForma.map((f) => (
                    <div key={f.nome} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        {f.nome}
                        {f.contaNoCaixa ? (
                          <Badge tone="leaf" size="sm">
                            gaveta
                          </Badge>
                        ) : null}
                      </span>
                      <span className="font-bold" data-numeric>
                        {moeda(f.total)}
                      </span>
                    </div>
                  ))}
                  <TotalRow rotulo="Total recebido" destaque>
                    {moeda(resumo.totalVendas)}
                  </TotalRow>
                </>
              )}
            </div>
          </Panel>
        </div>
      )}

      <Panel titulo="Extrato do caixa" descricao={`${numero(extrato.length)} movimento(s)`}>
        {extrato.length === 0 ? (
          <EmptyState titulo="Nenhum movimento" />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Hora</TH>
                  <TH>Tipo</TH>
                  <TH>Descrição</TH>
                  <TH>Forma</TH>
                  <TH>Operador</TH>
                  <TH numerico>Valor</TH>
                </TR>
              </THead>
              <TBody>
                {extrato.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <span className="text-xs text-body-muted">{hora(m.criadoEm)}</span>
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          m.tipo === 'VENDA'
                            ? 'leaf'
                            : m.tipo === 'SANGRIA' || m.tipo === 'DESPESA'
                              ? 'danger'
                              : m.tipo === 'ESTORNO'
                                ? 'caution'
                                : 'neutral'
                        }
                        size="sm"
                      >
                        {rotulo('tipoMovimentoCaixa', m.tipo)}
                      </Badge>
                    </TD>
                    <TD>
                      {m.pedido ? (
                        <Link href={`/pedidos?busca=${m.pedido.codigo}`} className="hover:underline">
                          <CodigoDoc>{m.pedido.codigo}</CodigoDoc>
                        </Link>
                      ) : (
                        <span className="text-sm">{m.descricao ?? '—'}</span>
                      )}
                    </TD>
                    <TD>
                      <span className="text-xs text-body-muted">{m.forma ?? '—'}</span>
                    </TD>
                    <TD>
                      <span className="text-xs text-body-muted">{m.usuario}</span>
                    </TD>
                    <TD numerico>
                      <span className={m.valor < 0 ? 'font-bold text-danger' : ''}>{moeda(m.valor)}</span>
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
