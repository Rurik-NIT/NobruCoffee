import type { Metadata } from 'next'
import { TrendingDown } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { EmptyState } from '@/components/ui/states'
import { moeda, numero } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarFornecedores } from '@/server/modules/compras/service'
import { listarCategoriasFinanceiras, listarContasPagar } from '@/server/modules/financeiro/service'
import { db } from '@/server/db'
import { TabelaContasPagar } from './tabela'

export const metadata: Metadata = { title: 'Contas a pagar' }
export const dynamic = 'force-dynamic'

export default async function PaginaContasPagar({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; categoria?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('financeiro.ver')
  const sp = await searchParams

  const [dados, categorias, fornecedores, formas, podeGerenciar] = await Promise.all([
    listarContasPagar({
      lojaId: sessao.lojaId,
      busca: sp.busca,
      status: sp.status,
      categoriaId: sp.categoria && sp.categoria !== 'todos' ? sp.categoria : undefined,
      de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
      ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
      pagina: Number(sp.pagina ?? 1),
    }),
    listarCategoriasFinanceiras(sessao.lojaId),
    listarFornecedores(sessao.lojaId),
    db.formaPagamento.findMany({
      where: { lojaId: sessao.lojaId, ativo: true },
      orderBy: { ordem: 'asc' },
      select: { id: true, nome: true },
    }),
    podeFazer('financeiro.gerenciar'),
  ])

  const atrasadas = dados.itens.filter((c) => c.status === 'ATRASADO')

  return (
    <>
      <PageHeader
        titulo="Contas a pagar"
        descricao="Fornecedores, aluguel, energia, salários, impostos. Uma despesa liquidada é o que aparece no fluxo de caixa."
        voltar={{ href: '/financeiro', rotulo: 'Fluxo de caixa' }}
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Previsto no filtro" valor={moeda(dados.totalPrevisto)} icone={TrendingDown} />
        <StatTile rotulo="Já pago" valor={moeda(dados.totalPago)} icone={TrendingDown} />
        <StatTile rotulo="Em aberto" valor={moeda(dados.saldoAberto)} icone={TrendingDown} />
        <StatTile
          rotulo="Atrasadas"
          valor={numero(atrasadas.length)}
          icone={TrendingDown}
          apoio={atrasadas.length > 0 ? moeda(atrasadas.reduce((a, c) => a + c.saldo, 0)) : 'nada vencido'}
        />
      </KpiGrid>

      <FiltrosLista
        buscaPlaceholder="Descrição da conta…"
        datas
        selects={[
          {
            chave: 'status',
            rotulo: 'Todos os status',
            opcoes: [
              { valor: 'PENDENTE', rotulo: 'Pendente' },
              { valor: 'PARCIAL', rotulo: 'Parcial' },
              { valor: 'ATRASADO', rotulo: 'Atrasado' },
              { valor: 'LIQUIDADO', rotulo: 'Pago' },
              { valor: 'CANCELADO', rotulo: 'Cancelado' },
            ],
          },
          {
            chave: 'categoria',
            rotulo: 'Todas as categorias',
            larguraClasse: 'w-48',
            opcoes: categorias.filter((c) => c.tipo === 'DESPESA').map((c) => ({ valor: c.id, rotulo: c.nome })),
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 && !sp.busca && !sp.status ? (
          <EmptyState
            icone={TrendingDown}
            titulo="Nenhuma conta a pagar"
            descricao="Contas são criadas manualmente ou geradas ao registrar o recebimento de uma compra."
          />
        ) : (
          <>
            <TabelaContasPagar
              contas={dados.itens}
              categorias={categorias.filter((c) => c.tipo === 'DESPESA')}
              fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome }))}
              formas={formas}
              podeGerenciar={podeGerenciar}
            />
            <PaginacaoUrl pagina={dados.pagina} porPagina={dados.porPagina} total={dados.total} />
          </>
        )}
      </Panel>
    </>
  )
}
