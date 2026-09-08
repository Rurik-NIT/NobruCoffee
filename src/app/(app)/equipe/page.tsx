import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, UserRound } from 'lucide-react'

import { PageHeader, Panel } from '@/components/patterns/page'
import { Button } from '@/components/ui/button'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarCargos, listarUsuarios } from '@/server/modules/equipe/service'
import { ListaEquipe } from './lista'

export const metadata: Metadata = { title: 'Equipe' }
export const dynamic = 'force-dynamic'

export default async function PaginaEquipe() {
  const sessao = await exigirPermissao('equipe.ver')

  const [usuarios, cargos, podeGerenciar, podePermissoes] = await Promise.all([
    listarUsuarios(sessao.empresaId, sessao.lojaId),
    listarCargos(sessao.empresaId),
    podeFazer('equipe.gerenciar'),
    podeFazer('equipe.permissoes'),
  ])

  return (
    <>
      <PageHeader
        titulo="Equipe"
        descricao="Cada pessoa tem o seu acesso. O sistema registra quem fez o quê — por isso não existe login compartilhado."
        acoes={
          <Button variant="secondary" asChild>
            <Link href="/equipe/cargos">
              <ShieldCheck />
              Cargos e permissões
            </Link>
          </Button>
        }
      />
      <Panel>
        <ListaEquipe
          usuarios={usuarios.map((u) => ({
            ...u,
            ultimoLoginEm: u.ultimoLoginEm?.toISOString() ?? null,
            admitidoEm: u.admitidoEm?.toISOString() ?? null,
          }))}
          cargos={cargos.map((c) => ({ id: c.id, nome: c.nome, acessoTotal: c.acessoTotal }))}
          usuarioAtualId={sessao.id}
          permissoes={{ gerenciar: podeGerenciar, permissoes: podePermissoes }}
        />
      </Panel>
    </>
  )
}
