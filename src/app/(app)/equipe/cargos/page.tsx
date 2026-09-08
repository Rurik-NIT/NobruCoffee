import type { Metadata } from 'next'

import { PageHeader, Panel } from '@/components/patterns/page'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { catalogoPermissoes, listarCargos } from '@/server/modules/equipe/service'
import { GerenciarCargos } from './gerenciar'

export const metadata: Metadata = { title: 'Cargos e permissões' }
export const dynamic = 'force-dynamic'

export default async function PaginaCargos() {
  const sessao = await exigirPermissao('equipe.ver')
  const [cargos, podeEditar] = await Promise.all([listarCargos(sessao.empresaId), podeFazer('equipe.permissoes')])

  return (
    <>
      <PageHeader
        titulo="Cargos e permissões"
        descricao="O menu esconde o que o cargo não abre, mas quem barra de verdade é o servidor: cada operação verifica a permissão antes de gravar."
        voltar={{ href: '/equipe', rotulo: 'Equipe' }}
      />
      <Panel>
        <GerenciarCargos cargos={cargos} catalogo={catalogoPermissoes()} podeEditar={podeEditar} />
      </Panel>
    </>
  )
}
