import type { Metadata } from 'next'
import Link from 'next/link'
import { Boxes, CalendarClock, History, PackageSearch, TriangleAlert } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Button } from '@/components/ui/button'
import { moeda, numero } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarFornecedores } from '@/server/modules/compras/service'
import { listarIngredientes, locaisDeArmazenagem } from '@/server/modules/estoque/queries'
import { ListaInsumos } from './lista'

export const metadata: Metadata = { title: 'Insumos' }
export const dynamic = 'force-dynamic'

export default async function PaginaEstoque({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string; local?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('estoque.ver')
  const sp = await searchParams

  const [dados, locais, fornecedores, podeGerenciar, podeMovimentar, podeAjustar] = await Promise.all([
    listarIngredientes({
      lojaId: sessao.lojaId,
      busca: sp.busca,
      situacao: (sp.situacao as never) ?? 'todos',
      local: sp.local && sp.local !== 'todos' ? sp.local : undefined,
      pagina: Number(sp.pagina ?? 1),
    }),
    locaisDeArmazenagem(sessao.lojaId),
    listarFornecedores(sessao.lojaId),
    podeFazer('estoque.gerenciar'),
    podeFazer('estoque.movimentar'),
    podeFazer('estoque.ajustar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Insumos"
        descricao="Matéria-prima e material de consumo. O saldo aqui é o que a ficha técnica consome na produção e na venda."
        acoes={
          <>
            <Button variant="secondary" asChild>
              <Link href="/estoque/movimentacoes">
                <History />
                Movimentações
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/estoque/inventario">
                <PackageSearch />
                Inventário
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/estoque/validades">
                <CalendarClock />
                Validades
              </Link>
            </Button>
          </>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Valor em estoque" valor={moeda(dados.valorTotal)} icone={Boxes} apoio="a custo médio" />
        <StatTile rotulo="Insumos ativos" valor={numero(dados.total)} icone={Boxes} />
        <StatTile
          rotulo="No mínimo"
          valor={numero(dados.emAlerta)}
          icone={TriangleAlert}
          apoio={dados.emAlerta > 0 ? 'precisam de reposição' : 'estoque saudável'}
        />
        <StatTile
          rotulo="Zerados"
          valor={numero(dados.zerados)}
          icone={TriangleAlert}
          apoio={dados.zerados > 0 ? 'bloqueiam produção' : 'nenhum zerado'}
        />
      </KpiGrid>

      <FiltrosLista
        buscaPlaceholder="Nome ou SKU do insumo…"
        selects={[
          {
            chave: 'situacao',
            rotulo: 'Todas as situações',
            opcoes: [
              { valor: 'baixo', rotulo: 'No mínimo' },
              { valor: 'zerado', rotulo: 'Zerados' },
              { valor: 'inativos', rotulo: 'Arquivados' },
            ],
          },
          ...(locais.length
            ? [
                {
                  chave: 'local',
                  rotulo: 'Todos os locais',
                  opcoes: locais.map((l) => ({ valor: l, rotulo: l })),
                },
              ]
            : []),
        ]}
      />

      <Panel>
        <ListaInsumos
          dados={dados}
          fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome }))}
          permissoes={{ gerenciar: podeGerenciar, movimentar: podeMovimentar, ajustar: podeAjustar }}
        />
      </Panel>
    </>
  )
}
