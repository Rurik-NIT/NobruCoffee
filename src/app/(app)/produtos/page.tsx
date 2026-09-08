import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Coffee, Package, TriangleAlert } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Button } from '@/components/ui/button'
import { numero, percentual } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarAdicionais, listarCategorias, listarProdutos, listarProdutosParaCombo } from '@/server/modules/catalogo/service'
import { ListaProdutos } from './lista'

export const metadata: Metadata = { title: 'Catálogo' }
export const dynamic = 'force-dynamic'

export default async function PaginaProdutos({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; categoria?: string; tipo?: string; situacao?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('produtos.ver')
  const sp = await searchParams

  const [dados, categorias, adicionais, produtosCombo, podeGerenciar, podePreco, podeExcluir, podeDisponibilidade] =
    await Promise.all([
      listarProdutos({
        lojaId: sessao.lojaId,
        busca: sp.busca,
        categoriaId: sp.categoria && sp.categoria !== 'todos' ? sp.categoria : undefined,
        tipo: sp.tipo && sp.tipo !== 'todos' ? sp.tipo : undefined,
        situacao: (sp.situacao as never) ?? 'todos',
        pagina: Number(sp.pagina ?? 1),
      }),
      listarCategorias(sessao.lojaId),
      listarAdicionais(sessao.lojaId, true),
      listarProdutosParaCombo(sessao.lojaId),
      podeFazer('produtos.gerenciar'),
      podeFazer('produtos.preco'),
      podeFazer('produtos.excluir'),
      podeFazer('produtos.disponibilidade'),
    ])

  const semFicha = dados.itens.filter((p) => !p.temFicha && (p.tipo === 'PRODUZIDO' || p.tipo === 'PREPARADO')).length
  const esgotados = dados.itens.filter((p) => !p.disponivel).length
  const margemMedia =
    dados.itens.length > 0 ? dados.itens.reduce((a, p) => a + p.margem, 0) / dados.itens.length : 0

  return (
    <>
      <PageHeader
        titulo="Catálogo"
        descricao="Tudo que a loja vende, com custo e margem à vista."
        acoes={
          <>
            <Button variant="secondary" asChild>
              <Link href="/produtos/categorias">Categorias</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/fichas-tecnicas">
                <BookOpen />
                Fichas técnicas
              </Link>
            </Button>
          </>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Produtos" valor={numero(dados.total)} icone={Coffee} apoio={`${categorias.length} categorias`} />
        <StatTile rotulo="Margem média" valor={percentual(margemMedia)} icone={Package} apoio="sobre o preço de venda" />
        <StatTile
          rotulo="Esgotados hoje"
          valor={numero(esgotados)}
          icone={TriangleAlert}
          tomVariacao="inverso"
          apoio={esgotados > 0 ? 'não aparecem no PDV' : 'tudo disponível'}
        />
        <StatTile
          rotulo="Sem ficha técnica"
          valor={numero(semFicha)}
          icone={BookOpen}
          apoio={semFicha > 0 ? 'custo e baixa de estoque incompletos' : 'todos com ficha'}
        />
      </KpiGrid>

      <FiltrosLista
        buscaPlaceholder="Nome ou SKU…"
        selects={[
          {
            chave: 'categoria',
            rotulo: 'Todas as categorias',
            opcoes: categorias.map((c) => ({ valor: c.id, rotulo: c.nome })),
            larguraClasse: 'w-52',
          },
          {
            chave: 'tipo',
            rotulo: 'Todos os tipos',
            opcoes: [
              { valor: 'PRODUZIDO', rotulo: 'Produção própria' },
              { valor: 'PREPARADO', rotulo: 'Preparado na hora' },
              { valor: 'SIMPLES', rotulo: 'Revenda' },
              { valor: 'COMBO', rotulo: 'Combo' },
            ],
          },
          {
            chave: 'situacao',
            rotulo: 'Todas as situações',
            opcoes: [
              { valor: 'ativos', rotulo: 'Ativos' },
              { valor: 'inativos', rotulo: 'Arquivados' },
              { valor: 'esgotados', rotulo: 'Esgotados' },
              { valor: 'sem-ficha', rotulo: 'Sem ficha técnica' },
            ],
          },
        ]}
      />

      <Panel>
        <ListaProdutos
          dados={dados}
          categorias={categorias.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor }))}
          adicionais={adicionais.map((a) => ({ id: a.id, nome: a.nome, preco: a.preco }))}
          produtosCombo={produtosCombo}
          permissoes={{
            gerenciar: podeGerenciar,
            preco: podePreco,
            excluir: podeExcluir,
            disponibilidade: podeDisponibilidade,
          }}
        />
      </Panel>
    </>
  )
}
