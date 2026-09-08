import type { Metadata } from 'next'

import { PageHeader, Panel } from '@/components/patterns/page'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarAdicionais } from '@/server/modules/catalogo/service'
import { opcoesIngredientes } from '@/server/modules/estoque/queries'
import { GerenciarAdicionais } from './gerenciar'

export const metadata: Metadata = { title: 'Adicionais' }
export const dynamic = 'force-dynamic'

export default async function PaginaAdicionais() {
  const sessao = await exigirPermissao('produtos.ver')
  const [adicionais, ingredientes, podeGerenciar] = await Promise.all([
    listarAdicionais(sessao.lojaId),
    opcoesIngredientes(sessao.lojaId),
    podeFazer('categorias.gerenciar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Adicionais"
        descricao="Extras que o PDV oferece junto do produto. Ao vincular um insumo, a venda do adicional já baixa estoque."
        voltar={{ href: '/produtos', rotulo: 'Catálogo' }}
      />
      <Panel>
        <GerenciarAdicionais adicionais={adicionais} ingredientes={ingredientes} podeGerenciar={podeGerenciar} />
      </Panel>
    </>
  )
}
