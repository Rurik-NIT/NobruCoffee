import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, ListOrdered, Receipt, ShoppingBag } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CellStack, CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, moeda, numero, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarFilaPreparo, listarPedidos } from '@/server/modules/pedidos/service'
import { AcoesPedido, FilaPreparo } from './lista'

export const metadata: Metadata = { title: 'Pedidos' }
export const dynamic = 'force-dynamic'

function limitesDoDia(de?: string, ate?: string) {
  return {
    de: de ? new Date(`${de}T00:00:00`) : undefined,
    ate: ate ? new Date(`${ate}T23:59:59`) : undefined,
  }
}

export default async function PaginaPedidos({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; tipo?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('pedidos.ver')
  const sp = await searchParams
  const janela = limitesDoDia(sp.de, sp.ate)

  const [dados, fila, podeEditar, podeCancelar] = await Promise.all([
    listarPedidos({
      lojaId: sessao.lojaId,
      busca: sp.busca,
      status: sp.status,
      tipo: sp.tipo,
      de: janela.de,
      ate: janela.ate,
      pagina: Number(sp.pagina ?? 1),
    }),
    listarFilaPreparo(sessao.lojaId),
    podeFazer('pedidos.editar'),
    podeFazer('pdv.cancelar_pedido'),
  ])

  const emPreparo = fila.filter((p) => p.status !== 'PRONTO')
  const atrasados = fila.filter((p) => p.minutosAberto > 20)

  return (
    <>
      <PageHeader
        titulo="Pedidos"
        descricao="A fila do balcão e o histórico de vendas."
        acoes={
          <Button asChild>
            <Link href="/pdv">
              <ShoppingBag />
              Abrir PDV
            </Link>
          </Button>
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Na fila agora" valor={numero(fila.length)} icone={Clock} apoio={`${emPreparo.length} em preparo`} />
        <StatTile
          rotulo="Atrasados"
          valor={numero(atrasados.length)}
          icone={Clock}
          tomVariacao="inverso"
          apoio={atrasados.length > 0 ? 'mais de 20 min abertos' : 'nada atrasado'}
        />
        <StatTile rotulo="Finalizados no filtro" valor={numero(dados.finalizados)} icone={Receipt} />
        <StatTile rotulo="Faturado no filtro" valor={moeda(dados.totalFaturado)} icone={ListOrdered} />
      </KpiGrid>

      {fila.length > 0 ? (
        <Panel titulo="Fila de preparo" descricao="Mais antigos primeiro. Avance o status conforme os itens saem." className="mb-5">
          <FilaPreparo pedidos={fila} podeEditar={podeEditar} />
        </Panel>
      ) : null}

      <FiltrosLista
        buscaPlaceholder="Código, cliente ou telefone…"
        datas
        selects={[
          {
            chave: 'status',
            rotulo: 'Todos os status',
            opcoes: [
              { valor: 'ABERTO', rotulo: 'Aberto' },
              { valor: 'EM_PREPARO', rotulo: 'Em preparo' },
              { valor: 'PRONTO', rotulo: 'Pronto' },
              { valor: 'FINALIZADO', rotulo: 'Finalizado' },
              { valor: 'CANCELADO', rotulo: 'Cancelado' },
            ],
          },
          {
            chave: 'tipo',
            rotulo: 'Todos os tipos',
            opcoes: [
              { valor: 'BALCAO', rotulo: 'Balcão' },
              { valor: 'MESA', rotulo: 'Mesa' },
              { valor: 'VIAGEM', rotulo: 'Viagem' },
              { valor: 'DELIVERY', rotulo: 'Delivery' },
              { valor: 'ENCOMENDA', rotulo: 'Encomenda' },
              { valor: 'IFOOD', rotulo: 'iFood' },
            ],
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 ? (
          <EmptyState
            icone={ListOrdered}
            titulo="Nenhum pedido no filtro"
            descricao="Ajuste o período ou os filtros acima."
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Pedido</TH>
                    <TH>Tipo</TH>
                    <TH>Cliente</TH>
                    <TH>Operador</TH>
                    <TH>Pagamento</TH>
                    <TH numerico>Itens</TH>
                    <TH numerico>Total</TH>
                    <TH>Status</TH>
                    <TH className="w-10" />
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <CellStack
                          principal={<CodigoDoc>{p.codigo}</CodigoDoc>}
                          apoio={dataHora(p.finalizadoEm ?? p.abertoEm)}
                        />
                      </TD>
                      <TD>
                        <span className="text-xs font-semibold">{rotulo('tipoPedido', p.tipo)}</span>
                        {p.mesa ? <span className="block text-xs text-body-muted">Mesa {p.mesa}</span> : null}
                      </TD>
                      <TD>
                        <span className="text-sm">{p.cliente ?? <span className="text-body-subtle">—</span>}</span>
                      </TD>
                      <TD>
                        <span className="text-xs text-body-muted">{p.operador}</span>
                      </TD>
                      <TD>
                        {p.formas.length > 0 ? (
                          <span className="text-xs">{p.formas.join(' + ')}</span>
                        ) : (
                          <span className="text-xs text-body-subtle">—</span>
                        )}
                      </TD>
                      <TD numerico>{numero(p.itens)}</TD>
                      <TD numerico>{moeda(p.total)}</TD>
                      <TD>
                        {p.status === 'FINALIZADO' ? (
                          <Badge tone="leaf">Finalizado</Badge>
                        ) : p.status === 'CANCELADO' ? (
                          <Badge tone="danger">Cancelado</Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <StatusDot tone="caution" pulse />
                            <span className="text-xs font-semibold">{rotulo('statusPedido', p.status)}</span>
                          </span>
                        )}
                      </TD>
                      <TD>
                        <AcoesPedido
                          pedido={{ id: p.id, codigo: p.codigo, status: p.status, total: p.total }}
                          podeCancelar={podeCancelar}
                        />
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
