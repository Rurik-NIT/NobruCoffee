import type { Metadata } from 'next'
import { Receipt } from 'lucide-react'

import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora } from '@/lib/format'
import { exigirPermissao } from '@/server/auth/session'
import { listarAuditoria } from '@/server/modules/equipe/service'

export const metadata: Metadata = { title: 'Auditoria' }
export const dynamic = 'force-dynamic'

/** Ações que merecem destaque visual — as que envolvem dinheiro ou permissão. */
const SENSIVEIS = [
  'produto.preco_alterado',
  'pedido.cancelado',
  'estoque.ajustado',
  'caixa.fechado',
  'caixa.sangria',
  'cargo.permissoes_alteradas',
  'usuario.desativado',
  'inventario.finalizado',
]

function resumo(dados: unknown): string {
  if (!dados || typeof dados !== 'object') return '—'
  return Object.entries(dados as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
    .slice(0, 220)
}

export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; entidade?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('auditoria.ver')
  const sp = await searchParams

  const dados = await listarAuditoria({
    lojaId: sessao.lojaId,
    busca: sp.busca,
    entidade: sp.entidade,
    de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
    ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
    pagina: Number(sp.pagina ?? 1),
  })

  return (
    <>
      <PageHeader
        titulo="Auditoria"
        descricao="Quem fez o quê e quando. É esta trilha que explica uma diferença de caixa ou um preço que mudou sem aviso."
        voltar={{ href: '/configuracoes', rotulo: 'Configurações' }}
      />

      <FiltrosLista
        buscaPlaceholder="Ação (ex.: preco_alterado, cancelado)…"
        datas
        selects={[
          {
            chave: 'entidade',
            rotulo: 'Todas as entidades',
            larguraClasse: 'w-48',
            opcoes: dados.entidades.map((e) => ({ valor: e, rotulo: e })),
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 ? (
          <EmptyState icone={Receipt} titulo="Nenhum registro no filtro" />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Quando</TH>
                    <TH>Quem</TH>
                    <TH>Ação</TH>
                    <TH>Entidade</TH>
                    <TH>Antes</TH>
                    <TH>Depois</TH>
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((l) => (
                    <TR key={l.id}>
                      <TD>
                        <span className="text-xs whitespace-nowrap text-body-muted">{dataHora(l.criadoEm)}</span>
                      </TD>
                      <TD>
                        <span className="text-sm">{l.usuario}</span>
                        {l.ip ? <span className="block text-[11px] text-body-subtle">{l.ip}</span> : null}
                      </TD>
                      <TD>
                        <Badge tone={SENSIVEIS.includes(l.acao) ? 'caution' : 'neutral'} size="sm">
                          {l.acao}
                        </Badge>
                      </TD>
                      <TD>
                        <span className="text-xs text-body-muted">{l.entidade}</span>
                      </TD>
                      <TD>
                        <span className="text-xs text-body-muted">{resumo(l.anterior)}</span>
                      </TD>
                      <TD>
                        <span className="text-xs">{resumo(l.novo)}</span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <PaginacaoUrl pagina={dados.pagina} porPagina={dados.porPagina} total={dados.total} />
          </>
        )}
      </Panel>
    </>
  )
}
