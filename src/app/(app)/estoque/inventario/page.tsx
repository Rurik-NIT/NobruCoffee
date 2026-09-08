import type { Metadata } from 'next'
import { PackageSearch } from 'lucide-react'

import { PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, moeda, numero } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarInventariosAnteriores, obterInventarioAberto } from '@/server/modules/estoque/queries'
import { FolhaContagem, BotaoAbrirInventario } from './contagem'

export const metadata: Metadata = { title: 'Inventário' }
export const dynamic = 'force-dynamic'

export default async function PaginaInventario() {
  const sessao = await exigirPermissao('estoque.ver')

  const [aberto, anteriores, podeInventariar] = await Promise.all([
    obterInventarioAberto(sessao.lojaId),
    listarInventariosAnteriores(sessao.lojaId),
    podeFazer('estoque.inventariar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Inventário"
        descricao="Contagem física dos insumos. Ao finalizar, o sistema ajusta os saldos divergentes e registra o impacto financeiro."
        voltar={{ href: '/estoque', rotulo: 'Insumos' }}
        acoes={!aberto && podeInventariar ? <BotaoAbrirInventario /> : null}
      />

      {aberto ? (
        <FolhaContagem inventario={aberto} podeInventariar={podeInventariar} />
      ) : (
        <Panel className="mb-5">
          <EmptyState
            icone={PackageSearch}
            titulo="Nenhum inventário aberto"
            descricao="Abrir um inventário congela o saldo de cada insumo e gera a folha de contagem."
            acao={podeInventariar ? <BotaoAbrirInventario tamanho="lg" /> : undefined}
          />
        </Panel>
      )}

      <Panel titulo="Inventários anteriores">
        {anteriores.length === 0 ? (
          <EmptyState titulo="Nenhum inventário finalizado ainda" />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Código</TH>
                  <TH>Início</TH>
                  <TH>Finalização</TH>
                  <TH>Responsável</TH>
                  <TH numerico>Itens</TH>
                  <TH numerico>Ajuste no estoque</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {anteriores.map((i) => (
                  <TR key={i.id}>
                    <TD>
                      <CodigoDoc>{i.codigo}</CodigoDoc>
                    </TD>
                    <TD>
                      <span className="text-xs text-body-muted">{dataHora(i.iniciadoEm)}</span>
                    </TD>
                    <TD>
                      <span className="text-xs text-body-muted">{i.finalizadoEm ? dataHora(i.finalizadoEm) : '—'}</span>
                    </TD>
                    <TD>
                      <span className="text-sm">{i.responsavel}</span>
                    </TD>
                    <TD numerico>{numero(i.itens)}</TD>
                    <TD numerico>
                      <span className={i.ajusteValor < 0 ? 'font-bold text-danger' : i.ajusteValor > 0 ? 'font-bold text-leaf' : ''}>
                        {moeda(i.ajusteValor)}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={i.status === 'FINALIZADO' ? 'leaf' : 'neutral'}>
                        {i.status === 'FINALIZADO' ? 'Finalizado' : 'Cancelado'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  )
}
