import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Wallet } from 'lucide-react'

import { PageHeader, Panel } from '@/components/patterns/page'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CellStack, CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, hora, moeda, numero } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { calcularResumo, caixaAbertoDaLoja, listarCaixas } from '@/server/modules/caixa/service'
import { PainelCaixaAberto, BotaoAbrirCaixa } from './painel'

export const metadata: Metadata = { title: 'Caixas' }
export const dynamic = 'force-dynamic'

export default async function PaginaCaixas() {
  const sessao = await exigirPermissao('caixa.ver')

  const [aberto, historico, podeAbrir, podeSangria, podeFechar] = await Promise.all([
    caixaAbertoDaLoja(db, sessao.lojaId),
    listarCaixas(sessao.lojaId),
    podeFazer('caixa.abrir'),
    podeFazer('caixa.sangria'),
    podeFazer('caixa.fechar'),
  ])

  const resumo = aberto ? await calcularResumo(db, aberto.id) : null
  const divergentes = historico.filter((c) => c.status === 'FECHADO' && c.diferenca !== null && c.diferenca !== 0)

  return (
    <>
      <PageHeader
        titulo="Caixas"
        descricao="Abertura, sangria, suprimento e conferência do turno."
        acoes={!aberto && podeAbrir ? <BotaoAbrirCaixa /> : null}
      />

      {resumo ? (
        <PainelCaixaAberto resumo={resumo} podeSangria={podeSangria} podeFechar={podeFechar} />
      ) : (
        <Panel className="mb-5">
          <EmptyState
            icone={Wallet}
            titulo="Nenhum caixa aberto"
            descricao="Abra o caixa com o fundo de troco para o PDV registrar vendas."
            acao={podeAbrir ? <BotaoAbrirCaixa tamanho="lg" /> : undefined}
          />
        </Panel>
      )}

      {divergentes.length > 0 ? (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-caution/30 bg-caution-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" />
          <p className="text-sm font-medium text-caution">
            {divergentes.length} caixa(s) fechado(s) com diferença aguardando conferência de um gerente.
          </p>
        </div>
      ) : null}

      <Panel titulo="Histórico de caixas" descricao="Últimos 40 turnos.">
        {historico.length === 0 ? (
          <EmptyState titulo="Nenhum caixa registrado ainda" />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Caixa</TH>
                  <TH>Abertura</TH>
                  <TH>Fechamento</TH>
                  <TH numerico>Fundo</TH>
                  <TH numerico>Vendas</TH>
                  <TH numerico>Pedidos</TH>
                  <TH numerico>Diferença</TH>
                  <TH>Status</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {historico.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <CodigoDoc>{c.codigo}</CodigoDoc>
                    </TD>
                    <TD>
                      <CellStack principal={dataHora(c.abertoEm)} apoio={c.abertoPor} />
                    </TD>
                    <TD>
                      {c.fechadoEm ? (
                        <CellStack principal={hora(c.fechadoEm)} apoio={c.fechadoPor ?? '—'} />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-leaf">
                          <StatusDot tone="leaf" pulse />
                          em andamento
                        </span>
                      )}
                    </TD>
                    <TD numerico>{moeda(c.saldoInicial)}</TD>
                    <TD numerico>{moeda(c.vendas)}</TD>
                    <TD numerico>{numero(c.pedidos)}</TD>
                    <TD numerico>
                      {c.diferenca === null ? (
                        <span className="text-body-subtle">—</span>
                      ) : c.diferenca === 0 ? (
                        <span className="font-bold text-leaf">exato</span>
                      ) : (
                        <span className={c.diferenca > 0 ? 'font-bold text-caution' : 'font-bold text-danger'}>
                          {c.diferenca > 0 ? '+' : '−'}
                          {moeda(Math.abs(c.diferenca))}
                        </span>
                      )}
                    </TD>
                    <TD>
                      {c.status === 'ABERTO' ? (
                        <Badge tone="leaf">Aberto</Badge>
                      ) : c.status === 'CONFERIDO' ? (
                        <Badge tone="info">Conferido</Badge>
                      ) : (
                        <Badge tone="neutral">Fechado</Badge>
                      )}
                    </TD>
                    <TD>
                      <Button variant="ghost" size="icon-sm" asChild aria-label={`Abrir caixa ${c.codigo}`}>
                        <Link href={`/caixas/${c.id}`}>
                          <ArrowRight />
                        </Link>
                      </Button>
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
