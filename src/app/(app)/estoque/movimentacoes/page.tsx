import type { Metadata } from 'next'
import { History } from 'lucide-react'

import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, moeda, quantidade as fmtQtd, rotulo } from '@/lib/format'
import { exigirPermissao } from '@/server/auth/session'
import { listarMovimentos } from '@/server/modules/estoque/queries'

export const metadata: Metadata = { title: 'Movimentações de estoque' }
export const dynamic = 'force-dynamic'

const ENTRADAS = ['ENTRADA_COMPRA', 'ENTRADA_MANUAL', 'ENTRADA_PRODUCAO', 'ESTORNO_VENDA']

export default async function PaginaMovimentacoes({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; ingrediente?: string; produto?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('estoque.ver')
  const sp = await searchParams

  const dados = await listarMovimentos({
    lojaId: sessao.lojaId,
    tipo: sp.tipo,
    ingredienteId: sp.ingrediente,
    produtoId: sp.produto,
    de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
    ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
    pagina: Number(sp.pagina ?? 1),
  })

  return (
    <>
      <PageHeader
        titulo="Movimentações de estoque"
        descricao="O livro do estoque: cada entrada e saída, com o saldo resultante e o documento de origem."
        voltar={{ href: '/estoque', rotulo: 'Insumos' }}
      />

      <FiltrosLista
        buscaPlaceholder="Buscar…"
        datas
        selects={[
          {
            chave: 'tipo',
            rotulo: 'Todos os tipos',
            larguraClasse: 'w-56',
            opcoes: [
              { valor: 'ENTRADA_COMPRA', rotulo: 'Entrada por compra' },
              { valor: 'ENTRADA_MANUAL', rotulo: 'Entrada manual' },
              { valor: 'ENTRADA_PRODUCAO', rotulo: 'Entrada de produção' },
              { valor: 'SAIDA_PRODUCAO', rotulo: 'Consumo na produção' },
              { valor: 'SAIDA_VENDA', rotulo: 'Baixa por venda' },
              { valor: 'SAIDA_MANUAL', rotulo: 'Saída manual' },
              { valor: 'AJUSTE_INVENTARIO', rotulo: 'Ajuste de inventário' },
              { valor: 'PERDA', rotulo: 'Perda' },
              { valor: 'ESTORNO_VENDA', rotulo: 'Estorno de venda' },
            ],
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 ? (
          <EmptyState icone={History} titulo="Nenhuma movimentação no filtro" />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Quando</TH>
                    <TH>Item</TH>
                    <TH>Tipo</TH>
                    <TH numerico>Quantidade</TH>
                    <TH numerico>Saldo após</TH>
                    <TH numerico>Valor</TH>
                    <TH>Origem</TH>
                    <TH>Quem</TH>
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((m) => {
                    const entrada = ENTRADAS.includes(m.tipo)
                    return (
                      <TR key={m.id}>
                        <TD>
                          <span className="text-xs text-body-muted">{dataHora(m.criadoEm)}</span>
                        </TD>
                        <TD>
                          <CellStack
                            principal={m.item}
                            apoio={
                              <>
                                {m.ehProduto ? 'produto' : 'insumo'}
                                {m.lote ? ` · lote ${m.lote.codigo}` : ''}
                              </>
                            }
                          />
                        </TD>
                        <TD>
                          <Badge
                            tone={
                              m.tipo === 'PERDA'
                                ? 'danger'
                                : m.tipo === 'AJUSTE_INVENTARIO'
                                  ? 'caution'
                                  : entrada
                                    ? 'leaf'
                                    : 'neutral'
                            }
                            size="sm"
                          >
                            {rotulo('tipoMovimento', m.tipo)}
                          </Badge>
                        </TD>
                        <TD numerico>
                          <span className={entrada ? 'font-bold text-leaf' : 'font-bold text-danger'}>
                            {m.quantidade > 0 ? '+' : ''}
                            {fmtQtd(m.quantidade, m.unidade)}
                          </span>
                        </TD>
                        <TD numerico>{fmtQtd(m.saldoApos, m.unidade)}</TD>
                        <TD numerico>{m.valor > 0 ? moeda(m.valor) : <span className="text-body-subtle">—</span>}</TD>
                        <TD>
                          <span className="text-xs text-body-muted">{m.observacao ?? m.origemTipo ?? '—'}</span>
                        </TD>
                        <TD>
                          <span className="text-xs text-body-muted">{m.usuario}</span>
                        </TD>
                      </TR>
                    )
                  })}
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
