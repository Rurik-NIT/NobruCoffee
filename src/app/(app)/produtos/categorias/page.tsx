import type { Metadata } from 'next'

import { PageHeader, Panel } from '@/components/patterns/page'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarCategorias } from '@/server/modules/catalogo/service'
import { GerenciarCategorias } from './gerenciar'

export const metadata: Metadata = { title: 'Categorias' }
export const dynamic = 'force-dynamic'

export default async function PaginaCategorias() {
  const sessao = await exigirPermissao('produtos.ver')
  const [categorias, podeGerenciar] = await Promise.all([
    listarCategorias(sessao.lojaId),
    podeFazer('categorias.gerenciar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Categorias"
        descricao="A cor da categoria é o que separa os grupos na grade do PDV. Escolha cores distintas entre si."
        voltar={{ href: '/produtos', rotulo: 'Catálogo' }}
      />
      <Panel>
        <GerenciarCategorias categorias={categorias} podeGerenciar={podeGerenciar} />
      </Panel>
    </>
  )
}
