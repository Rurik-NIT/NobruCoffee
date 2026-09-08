import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChefHat,
  Clock,
  CookingPot,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Trash2,
  Wallet,
} from 'lucide-react'

import { AreaTendencia, BarrasRanking, BarrasVerticais, ChartFrame, StatTile } from '@/components/charts'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { data as fmtData, dataLonga, decimal, hora, moeda, numero, percentual, quantidade, rotulo, variacaoTexto } from '@/lib/format'
import { podeFazer, exigirSessao } from '@/server/auth/session'
import { painelDoDia } from '@/server/modules/dashboard/service'
import { gerarNotificacoes } from '@/server/modules/notificacoes/service'

export const metadata: Metadata = { title: 'Painel do dia' }
export const dynamic = 'force-dynamic'

export default async function PaginaDashboard() {
  const sessao = await exigirSessao()

  // O painel é a porta de entrada do dia: é aqui que os avisos são recalculados.
  await gerarNotificacoes(sessao.lojaId).catch(() => undefined)

  const [painel, verFinanceiro, verProducao, verEstoque] = await Promise.all([
    painelDoDia(sessao.lojaId),
    podeFazer('relatorios.financeiro'),
    podeFazer('producao.ver'),
    podeFazer('estoque.ver'),
  ])

  const agora = new Date()
  const primeiroNome = sessao.nome.split(' ')[0]
  const saudacao = agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <>
      <PageHeader
        titulo={`${saudacao}, ${primeiroNome}`}
        descricao={
          <>
            {dataLonga(agora)} · {sessao.lojaNome}
            {painel.caixas.length === 0 ? (
              <span className="ml-2 font-semibold text-caution">· nenhum caixa aberto</span>
            ) : null}
          </>
        }
        acoes={
          <>
            <Button variant="secondary" asChild>
              <Link href="/relatorios">Relatórios</Link>
            </Button>
            <Button asChild>
              <Link href="/pdv">
                <ShoppingBag />
                Abrir PDV
              </Link>
            </Button>
          </>
        }
      />

      {/* ── KPIs do dia ─────────────────────────────────────────────────── */}
      <KpiGrid>
        <StatTile
          rotulo="Faturamento hoje"
          valor={moeda(painel.faturamento)}
          variacao={variacaoTexto(painel.variacaoFaturamento)}
          apoio={`mesmo dia semana passada: ${moeda(painel.faturamentoAnterior)}`}
          icone={TrendingUp}
        />
        <StatTile
          rotulo="Pedidos"
          valor={numero(painel.pedidos)}
          variacao={variacaoTexto(painel.variacaoPedidos)}
          apoio={`${numero(painel.itensVendidos)} itens vendidos`}
          icone={Receipt}
        />
        <StatTile rotulo="Ticket médio" valor={moeda(painel.ticketMedio)} icone={ShoppingBag} />
        {verFinanceiro ? (
          <StatTile
            rotulo="Lucro bruto"
            valor={moeda(painel.lucroBruto)}
            apoio={`margem ${percentual(painel.margemBruta)} · CMV ${moeda(painel.cmv)}`}
            icone={Wallet}
          />
        ) : (
          <StatTile rotulo="Itens vendidos" valor={numero(painel.itensVendidos)} icone={ShoppingBag} />
        )}
      </KpiGrid>

      {/* ── Gráficos ────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartFrame
          titulo="Vendas por hora"
          descricao="Onde o movimento se concentra hoje"
          destaque={moeda(painel.faturamento)}
          dados={{
            colunas: ['Hora', 'Faturamento'],
            linhas: painel.vendasPorHora.map((h) => [h.rotulo, moeda(h.valor)]),
          }}
        >
          <BarrasVerticais dados={painel.vendasPorHora} />
        </ChartFrame>

        <ChartFrame
          titulo="Mais vendidos hoje"
          descricao="Por faturamento"
          dados={{
            colunas: ['Produto', 'Faturamento'],
            linhas: painel.topProdutos.map((p) => [p.rotulo, moeda(p.valor)]),
          }}
        >
          {painel.topProdutos.length ? (
            <BarrasRanking itens={painel.topProdutos} />
          ) : (
            <EmptyState titulo="Nenhuma venda ainda hoje" descricao="Os campeões aparecem aqui na primeira venda." />
          )}
        </ChartFrame>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ChartFrame
          titulo="Últimos 14 dias"
          descricao="Faturamento diário"
          dados={{
            colunas: ['Dia', 'Faturamento'],
            linhas: painel.tendencia14dias.map((d) => [d.rotulo, moeda(d.valor)]),
          }}
        >
          <AreaTendencia dados={painel.tendencia14dias} nomeSerie1="Faturamento" />
        </ChartFrame>

        <div className="grid gap-4">
          <ChartFrame
            titulo="Formas de pagamento"
            descricao="Como o dinheiro entrou hoje"
            dados={{
              colunas: ['Forma', 'Valor'],
              linhas: painel.porFormaPagamento.map((f) => [f.rotulo, moeda(f.valor)]),
            }}
          >
            {painel.porFormaPagamento.length ? (
              <BarrasRanking itens={painel.porFormaPagamento} mostrarPercentual />
            ) : (
              <EmptyState titulo="Sem pagamentos hoje" />
            )}
          </ChartFrame>

          <ChartFrame titulo="Por categoria" descricao="Faturamento de hoje">
            {painel.porCategoria.length ? (
              <BarrasRanking itens={painel.porCategoria} mostrarPercentual limite={5} />
            ) : (
              <EmptyState titulo="Sem vendas por categoria ainda" />
            )}
          </ChartFrame>
        </div>
      </div>

      {/* ── Operação agora ──────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          titulo="Pedidos em aberto"
          descricao={painel.pedidosAbertos.length ? `${painel.pedidosAbertos.length} na fila` : 'Nada na fila'}
          acao={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pedidos">
                Ver todos <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {painel.pedidosAbertos.length === 0 ? (
            <EmptyState icone={Receipt} titulo="Balcão limpo" descricao="Nenhum pedido esperando." />
          ) : (
            <ul className="divide-y divide-hairline">
              {painel.pedidosAbertos.map((p) => (
                <li key={p.id}>
                  <Link href={`/pdv?pedido=${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper-sunken">
                    <StatusDot tone={p.minutos > 20 ? 'danger' : p.minutos > 10 ? 'caution' : 'leaf'} pulse={p.minutos > 20} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs font-semibold text-body-muted">{p.codigo}</span>
                      <span className="block text-sm font-semibold">
                        {rotulo('tipoPedido', p.tipo)}
                        {p.mesa ? ` · mesa ${p.mesa.numero}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold" data-numeric>
                        {moeda(p.total)}
                      </span>
                      <span className="flex items-center justify-end gap-1 text-xs text-body-muted">
                        <Clock className="size-3" />
                        {p.minutos} min
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {verProducao ? (
          <Panel
            titulo="Produção de hoje"
            descricao={`${painel.producao.ordens} ordem(ns)`}
            acao={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/producao">
                  Abrir <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="px-5 py-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { r: 'Planejado', v: painel.producao.planejado },
                  { r: 'Produzido', v: painel.producao.produzido },
                  { r: 'Pendentes', v: painel.producao.pendentes },
                ].map((i) => (
                  <div key={i.r} className="rounded-control bg-paper-sunken px-2 py-3">
                    <p className="font-display text-xl font-extrabold" data-numeric>
                      {decimal(i.v)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-body-muted">{i.r}</p>
                  </div>
                ))}
              </div>
              {painel.producao.ordens === 0 ? (
                <p className="mt-4 text-sm text-body-muted">
                  Nenhuma ordem para hoje. A tela de produção sugere quantidades com base na média dos últimos 7 dias.
                </p>
              ) : painel.producao.pendentes > 0 ? (
                <p className="mt-4 flex items-start gap-2 rounded-control bg-caution-soft px-3 py-2 text-xs font-semibold text-caution">
                  <CookingPot className="mt-px size-3.5 shrink-0" />
                  {painel.producao.pendentes} ordem(ns) planejada(s) ainda não iniciada(s).
                </p>
              ) : (
                <p className="mt-4 flex items-start gap-2 rounded-control bg-leaf-soft px-3 py-2 text-xs font-semibold text-leaf">
                  <ChefHat className="mt-px size-3.5 shrink-0" />
                  Produção do dia em andamento.
                </p>
              )}
            </div>
          </Panel>
        ) : null}

        <Panel
          titulo="Caixa"
          descricao={painel.caixas.length ? 'Aberto agora' : 'Nenhum caixa aberto'}
          acao={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/caixas">
                Abrir <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {painel.caixas.length === 0 ? (
            <EmptyState
              icone={Wallet}
              titulo="Caixa fechado"
              descricao="Sem caixa aberto o PDV não registra vendas."
              acao={
                <Button size="sm" asChild>
                  <Link href="/caixas">Abrir caixa</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {painel.caixas.map((c) => (
                <li key={c.id} className="px-5 py-4">
                  <Link href={`/caixas/${c.id}`} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block font-mono text-xs font-semibold text-body-muted">{c.codigo}</span>
                      <span className="block text-sm font-semibold">{c.usuarioAbertura.nome}</span>
                      <span className="block text-xs text-body-muted">desde {hora(c.abertoEm)}</span>
                    </span>
                    <Badge tone="leaf">Aberto</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          titulo="Encomendas próximas"
          descricao="Próximas 48 horas"
          acao={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/encomendas">
                Ver agenda <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {painel.encomendasProximas.length === 0 ? (
            <EmptyState icone={CalendarClock} titulo="Nada para os próximos 2 dias" />
          ) : (
            <ul className="divide-y divide-hairline">
              {painel.encomendasProximas.map((e) => (
                <li key={e.id}>
                  <Link href={`/encomendas/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper-sunken">
                    <StatusDot tone={e.horas <= 12 ? 'danger' : 'caution'} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{e.cliente.nome}</span>
                      <span className="block text-xs text-body-muted">
                        {fmtData(e.dataEntrega)} às {hora(e.dataEntrega)} · {rotulo('statusEncomenda', e.status)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-bold" data-numeric>
                      {moeda(e.valorTotal)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {verEstoque ? (
          <>
            <Panel
              titulo="Insumos no mínimo"
              descricao={painel.estoqueBaixo.length ? 'Reposição necessária' : 'Estoque saudável'}
              acao={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/estoque?situacao=baixo">
                    Ver <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
            >
              {painel.estoqueBaixo.length === 0 ? (
                <EmptyState titulo="Nada abaixo do mínimo" descricao="Todos os insumos com saldo acima do mínimo." />
              ) : (
                <ul className="divide-y divide-hairline">
                  {painel.estoqueBaixo.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                      <StatusDot tone={i.estoqueAtual <= 0 ? 'danger' : 'caution'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{i.nome}</span>
                        <span className="block text-xs text-body-muted">
                          {quantidade(i.estoqueAtual, i.unidade)} · mínimo {quantidade(i.estoqueMinimo, i.unidade)}
                        </span>
                      </span>
                      {i.estoqueAtual <= 0 ? <Badge tone="danger">Zerado</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              titulo="Validades e perdas"
              descricao="Risco de jogar dinheiro fora"
              acao={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/estoque/validades">
                    Ver <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
            >
              <div className="px-5 py-4">
                <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-body-muted">
                    <Trash2 className="size-3.5" />
                    Perdas no mês
                  </span>
                  <span className="font-display text-lg font-extrabold" data-numeric>
                    {moeda(painel.perdasMes)}
                  </span>
                </div>
                {painel.validades.length === 0 ? (
                  <p className="mt-3 text-sm text-body-muted">Nenhum lote vencendo nos próximos 7 dias.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {painel.validades.map((l) => (
                      <li key={l.id} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className={l.vencido ? 'size-3.5 text-danger' : 'size-3.5 text-caution'} />
                        <span className="min-w-0 flex-1 truncate">{l.ingrediente.nome}</span>
                        <span className="shrink-0 text-xs font-semibold text-body-muted">
                          {l.vencido ? 'vencido' : `${l.diasRestantes}d`}
                        </span>
                        <span className="shrink-0 text-xs font-bold" data-numeric>
                          {moeda(l.valorEmRisco)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </>
  )
}
