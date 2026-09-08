import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgePercent, Sparkles, Wallet } from 'lucide-react'

import { BarrasRanking, ChartFrame, StatTile } from '@/components/charts'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { EmptyState } from '@/components/ui/states'
import { dataHora, moeda, numero, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarCupons, resumoFidelidade } from '@/server/modules/clientes/service'
import { GerenciarCupons } from './cupons'

export const metadata: Metadata = { title: 'Fidelidade e cupons' }
export const dynamic = 'force-dynamic'

export default async function PaginaFidelidade() {
  const sessao = await exigirPermissao('clientes.ver')

  const [resumo, cupons, podeAjustar] = await Promise.all([
    resumoFidelidade(sessao.lojaId),
    listarCupons(sessao.lojaId),
    podeFazer('fidelidade.ajustar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Fidelidade e cupons"
        descricao={`Cada R$ 1,00 gasto gera ${resumo.pontosPorReal} ponto(s), e cada ponto vale ${moeda(resumo.valorPorPonto)} no resgate. Ajuste as regras em Configurações.`}
        voltar={{ href: '/clientes', rotulo: 'Clientes' }}
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Pontos em circulação" valor={numero(resumo.pontosEmCirculacao)} icone={Sparkles} />
        <StatTile
          rotulo="Passivo estimado"
          valor={moeda(resumo.passivoEstimado)}
          icone={Wallet}
          apoio="valor se todos resgatassem hoje"
        />
        <StatTile rotulo="Cupons ativos" valor={numero(cupons.filter((c) => c.ativo && !c.vencido && !c.esgotado).length)} icone={BadgePercent} />
        <StatTile rotulo="Cupons usados" valor={numero(cupons.reduce((a, c) => a + c.usosFeitos, 0))} icone={BadgePercent} />
      </KpiGrid>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartFrame
          titulo="Quem mais acumula"
          descricao="Top clientes por saldo de pontos"
          dados={{
            colunas: ['Cliente', 'Pontos'],
            linhas: resumo.top.map((c) => [c.nome, numero(c.pontos)]),
          }}
        >
          {resumo.top.length ? (
            <BarrasRanking
              itens={resumo.top.map((c) => ({ rotulo: c.nome, valor: c.pontos, apoio: `${moeda(c.totalGasto)} gastos` }))}
              formatador={(v) => `${numero(v)} pts`}
            />
          ) : (
            <EmptyState titulo="Nenhum cliente com pontos" descricao="Os pontos são creditados ao finalizar a venda com cliente identificado." />
          )}
        </ChartFrame>

        <Panel titulo="Últimos movimentos de pontos">
          {resumo.movimentos.length === 0 ? (
            <EmptyState titulo="Nenhum movimento ainda" />
          ) : (
            <ul className="max-h-80 divide-y divide-hairline overflow-y-auto">
              {resumo.movimentos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                  <span className="min-w-0">
                    <Link href={`/clientes/${m.cliente.id}`} className="block truncate text-sm font-semibold hover:underline">
                      {m.cliente.nome}
                    </Link>
                    <span className="block text-xs text-body-muted">
                      {rotulo('tipoFidelidade', m.tipo)} · {m.descricao ?? '—'} · {dataHora(m.criadoEm)}
                    </span>
                  </span>
                  <span className={m.pontos > 0 ? 'shrink-0 font-bold text-leaf' : 'shrink-0 font-bold text-danger'} data-numeric>
                    {m.pontos > 0 ? '+' : ''}
                    {numero(m.pontos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <GerenciarCupons cupons={cupons} podeGerenciar={podeAjustar} />
      </Panel>
    </>
  )
}
