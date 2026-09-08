import type { Metadata } from 'next'
import Link from 'next/link'
import { Banknote, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { AreaTendencia, BarrasRanking, ChartFrame, StatTile } from '@/components/charts'
import { KpiGrid, PageHeader, Panel, TotalRow } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { moeda, numero, percentual } from '@/lib/format'
import { exigirPermissao } from '@/server/auth/session'
import { fluxoDeCaixa, resumoFinanceiro } from '@/server/modules/financeiro/service'
import { periodoDe } from '@/server/modules/relatorios/service'
import { SeletorPeriodo } from '@/components/patterns/periodo'

export const metadata: Metadata = { title: 'Fluxo de caixa' }
export const dynamic = 'force-dynamic'

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const sessao = await exigirPermissao('financeiro.ver')
  const sp = await searchParams
  const atalho = sp.periodo ?? '30dias'
  const { de, ate } = periodoDe(atalho)

  const [fluxo, resumo] = await Promise.all([fluxoDeCaixa(sessao.lojaId, de, ate), resumoFinanceiro(sessao.lojaId)])

  return (
    <>
      <PageHeader
        titulo="Fluxo de caixa"
        descricao="Entradas menos saídas no período, com o resultado acumulado."
        acoes={
          <>
            <SeletorPeriodo atual={atalho} />
            <Button variant="secondary" asChild>
              <Link href="/financeiro/pagar">
                <TrendingDown />
                Contas a pagar
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/financeiro/receber">
                <TrendingUp />
                Contas a receber
              </Link>
            </Button>
          </>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Receita no período" valor={moeda(fluxo.receitaTotal)} icone={TrendingUp} apoio={`vendas ${moeda(fluxo.receitaVendas)}`} />
        <StatTile rotulo="Despesas no período" valor={moeda(fluxo.despesas)} icone={TrendingDown} tomVariacao="inverso" />
        <StatTile
          rotulo="Resultado"
          valor={moeda(fluxo.resultado)}
          icone={Banknote}
          apoio={`margem ${percentual(fluxo.margem)}`}
        />
        <StatTile
          rotulo="Taxas de cartão"
          valor={moeda(fluxo.taxasCartao)}
          icone={Wallet}
          apoio="retidas pela adquirente"
        />
      </KpiGrid>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <ChartFrame
          titulo="Entradas e saídas por dia"
          descricao="Linha cheia: entradas. Tracejada: saídas."
          legenda={[
            { rotulo: 'Entradas', cor: '#D24237' },
            { rotulo: 'Saídas', cor: '#7A4E9B' },
          ]}
          dados={{
            colunas: ['Dia', 'Entradas', 'Saídas', 'Acumulado'],
            linhas: fluxo.serie.map((d) => [d.rotulo, moeda(d.valor), moeda(d.valor2), moeda(d.acumulado)]),
          }}
        >
          {fluxo.serie.length > 1 ? (
            <AreaTendencia dados={fluxo.serie} nomeSerie1="Entradas" nomeSerie2="Saídas" altura={230} />
          ) : (
            <EmptyState titulo="Poucos dados no período" descricao="Escolha um período mais longo." />
          )}
        </ChartFrame>

        <div className="space-y-4">
          <Panel titulo="Resultado do período">
            <div className="space-y-2 px-5 py-4 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-body-muted">Vendas (PDV e encomendas)</span>
                <span data-numeric>{moeda(fluxo.receitaVendas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-muted">Outras receitas</span>
                <span data-numeric>{moeda(fluxo.outrasReceitas)}</span>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2">
                <span className="font-semibold">Total de entradas</span>
                <span className="font-semibold" data-numeric>
                  {moeda(fluxo.receitaTotal)}
                </span>
              </div>
              <div className="flex justify-between text-danger">
                <span>Despesas pagas</span>
                <span data-numeric>−{moeda(fluxo.despesas)}</span>
              </div>
              <TotalRow rotulo="Resultado" destaque>
                {moeda(fluxo.resultado)}
              </TotalRow>
            </div>
          </Panel>

          <ChartFrame titulo="Despesas por categoria" descricao="No período">
            {fluxo.despesasPorCategoria.length ? (
              <BarrasRanking itens={fluxo.despesasPorCategoria} mostrarPercentual limite={8} />
            ) : (
              <EmptyState titulo="Nenhuma despesa paga no período" />
            )}
          </ChartFrame>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          titulo="A pagar"
          descricao="Próximos 7 dias e atrasados"
          acao={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/financeiro/pagar">Abrir</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-2 divide-x divide-hairline">
            <div className="px-5 py-4">
              <p className="eyebrow">Vence em 7 dias</p>
              <p className="mt-1 font-display text-xl font-extrabold" data-numeric>
                {moeda(resumo.aPagar7Dias)}
              </p>
              <p className="text-xs text-body-muted">{numero(resumo.aPagar7DiasQtd)} conta(s)</p>
            </div>
            <div className="px-5 py-4">
              <p className="eyebrow">Atrasado</p>
              <p className="mt-1 font-display text-xl font-extrabold text-danger" data-numeric>
                {moeda(resumo.atrasadoPagar)}
              </p>
              <p className="text-xs text-body-muted">{numero(resumo.atrasadoPagarQtd)} conta(s)</p>
            </div>
          </div>
          {resumo.atrasadoPagarQtd > 0 ? (
            <p className="border-t border-hairline bg-danger-soft px-5 py-2.5 text-xs font-semibold text-danger">
              Há contas vencidas. Liquide ou renegocie para o fluxo não distorcer.
            </p>
          ) : null}
        </Panel>

        <Panel
          titulo="A receber"
          descricao="Fiado e encomendas"
          acao={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/financeiro/receber">Abrir</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-2 divide-x divide-hairline">
            <div className="px-5 py-4">
              <p className="eyebrow">Em aberto</p>
              <p className="mt-1 font-display text-xl font-extrabold" data-numeric>
                {moeda(resumo.aReceber)}
              </p>
              <p className="text-xs text-body-muted">{numero(resumo.aReceberQtd)} conta(s)</p>
            </div>
            <div className="px-5 py-4">
              <p className="eyebrow">Atrasado</p>
              <p className="mt-1 font-display text-xl font-extrabold text-danger" data-numeric>
                {moeda(resumo.atrasadoReceber)}
              </p>
              <p className="text-xs text-body-muted">{numero(resumo.atrasadoReceberQtd)} conta(s)</p>
            </div>
          </div>
          <div className="border-t border-hairline px-5 py-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-body-muted">Resultado do mês corrente</span>
              <Badge tone={resumo.resultadoMes >= 0 ? 'leaf' : 'danger'}>{moeda(resumo.resultadoMes)}</Badge>
            </div>
          </div>
        </Panel>
      </div>
    </>
  )
}
