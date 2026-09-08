import type { Metadata } from 'next'

import { FiltrosLista } from '@/components/patterns/filtros'
import { PageHeader, Panel } from '@/components/patterns/page'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarFornecedores } from '@/server/modules/compras/service'
import { ListaFornecedores } from './lista'

export const metadata: Metadata = { title: 'Fornecedores' }
export const dynamic = 'force-dynamic'

export default async function PaginaFornecedores({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const sessao = await exigirPermissao('fornecedores.ver')
  const sp = await searchParams

  const [fornecedores, podeGerenciar] = await Promise.all([
    listarFornecedores(sessao.lojaId, sp.busca, true),
    podeFazer('fornecedores.gerenciar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Fornecedores"
        descricao="Quem abastece a loja. O fornecedor padrão de cada insumo alimenta a sugestão de reposição."
        voltar={{ href: '/compras', rotulo: 'Pedidos de compra' }}
      />
      <FiltrosLista buscaPlaceholder="Nome, razão social ou CNPJ…" />
      <Panel>
        <ListaFornecedores fornecedores={fornecedores} podeGerenciar={podeGerenciar} />
      </Panel>
    </>
  )
}
