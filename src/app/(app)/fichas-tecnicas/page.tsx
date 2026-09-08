import type { Metadata } from 'next'
import { BookOpen, Calculator, TriangleAlert } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { moeda, numero, percentual } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { opcoesIngredientes } from '@/server/modules/estoque/queries'
import { listarFichas, produtosSemFicha } from '@/server/modules/fichas/service'
import { ListaFichas } from './lista'

export const metadata: Metadata = { title: 'Fichas técnicas' }
export const dynamic = 'force-dynamic'

export default async function PaginaFichas({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; produto?: string }>
}) {
  const sessao = await exigirPermissao('fichas.ver')
  const sp = await searchParams

  const [fichas, semFicha, ingredientes, podeGerenciar] = await Promise.all([
    listarFichas(sessao.lojaId, sp.busca),
    produtosSemFicha(sessao.lojaId),
    opcoesIngredientes(sessao.lojaId),
    podeFazer('fichas.gerenciar'),
  ])

  const margemMedia = fichas.length > 0 ? fichas.reduce((a, f) => a + f.margem, 0) / fichas.length : 0
  const custoTotal = fichas.reduce((a, f) => a + f.custoUnitario, 0)

  return (
    <>
      <PageHeader
        titulo="Fichas técnicas"
        descricao="A receita de cada produto. É daqui que sai o custo real, a margem e o consumo de insumos na produção."
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Fichas ativas" valor={numero(fichas.length)} icone={BookOpen} />
        <StatTile rotulo="Margem média" valor={percentual(margemMedia)} icone={Calculator} apoio="dos produtos com ficha" />
        <StatTile
          rotulo="Custo médio por unidade"
          valor={moeda(fichas.length > 0 ? custoTotal / fichas.length : 0)}
          icone={Calculator}
        />
        <StatTile
          rotulo="Produtos sem ficha"
          valor={numero(semFicha.length)}
          icone={TriangleAlert}
          apoio={semFicha.length > 0 ? 'não baixam insumo na venda' : 'tudo coberto'}
        />
      </KpiGrid>

      <FiltrosLista buscaPlaceholder="Produto ou SKU…" />

      <Panel>
        <ListaFichas
          fichas={fichas.map((f) => ({ ...f, atualizadoEm: f.atualizadoEm.toISOString() }))}
          semFicha={semFicha}
          ingredientes={ingredientes}
          podeGerenciar={podeGerenciar}
          produtoInicial={sp.produto ?? null}
        />
      </Panel>
    </>
  )
}
