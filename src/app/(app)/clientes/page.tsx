import type { Metadata } from 'next'
import Link from 'next/link'
import { BadgePercent, Cake, Users, Wallet } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Button } from '@/components/ui/button'
import { moeda, numero } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarClientes } from '@/server/modules/clientes/service'
import { ListaClientes } from './lista'

export const metadata: Metadata = { title: 'Clientes' }
export const dynamic = 'force-dynamic'

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('clientes.ver')
  const sp = await searchParams

  const [dados, podeGerenciar, podeFidelidade] = await Promise.all([
    listarClientes({
      lojaId: sessao.lojaId,
      busca: sp.busca,
      situacao: (sp.situacao as never) ?? 'ativos',
      pagina: Number(sp.pagina ?? 1),
    }),
    podeFazer('clientes.gerenciar'),
    podeFazer('fidelidade.ajustar'),
  ])

  const sumidos = dados.itens.filter((c) => c.diasSemComprar !== null && c.diasSemComprar > 60).length

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Quem são, quanto gastam e quando vieram pela última vez."
        acoes={
          <Button variant="secondary" asChild>
            <Link href="/clientes/fidelidade">
              <BadgePercent />
              Fidelidade e cupons
            </Link>
          </Button>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Clientes no filtro" valor={numero(dados.total)} icone={Users} />
        <StatTile rotulo="Faturamento acumulado" valor={moeda(dados.faturamentoTotal)} icone={Wallet} />
        <StatTile rotulo="Gasto médio por cliente" valor={moeda(dados.gastoMedio)} icone={Wallet} />
        <StatTile
          rotulo="Sem voltar há 60+ dias"
          valor={numero(sumidos)}
          icone={Cake}
          apoio={sumidos > 0 ? 'candidatos a um WhatsApp' : 'base ativa'}
        />
      </KpiGrid>

      <FiltrosLista
        buscaPlaceholder="Nome, telefone ou e-mail…"
        selects={[
          {
            chave: 'situacao',
            rotulo: 'Ativos',
            opcoes: [
              { valor: 'todos', rotulo: 'Todos' },
              { valor: 'sumidos', rotulo: 'Sem voltar há 60 dias' },
              { valor: 'aniversariantes', rotulo: 'Aniversariantes do mês' },
              { valor: 'inativos', rotulo: 'Arquivados' },
            ],
          },
        ]}
      />

      <Panel>
        <ListaClientes
          dados={dados}
          permissoes={{ gerenciar: podeGerenciar, fidelidade: podeFidelidade }}
        />
      </Panel>
    </>
  )
}
