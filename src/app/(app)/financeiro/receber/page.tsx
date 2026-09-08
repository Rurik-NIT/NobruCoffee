import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { CellStack, CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, moeda, numero, rotulo } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { listarCategoriasFinanceiras, listarContasReceber } from '@/server/modules/financeiro/service'
import { AcoesReceber, NovaContaReceber } from './acoes'

export const metadata: Metadata = { title: 'Contas a receber' }
export const dynamic = 'force-dynamic'

export default async function PaginaContasReceber({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('financeiro.ver')
  const sp = await searchParams

  const [dados, categorias, podeGerenciar] = await Promise.all([
    listarContasReceber({
      lojaId: sessao.lojaId,
      busca: sp.busca,
      status: sp.status,
      de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
      ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
      pagina: Number(sp.pagina ?? 1),
    }),
    listarCategoriasFinanceiras(sessao.lojaId),
    podeFazer('financeiro.gerenciar'),
  ])

  const atrasadas = dados.itens.filter((c) => c.status === 'ATRASADO')

  return (
    <>
      <PageHeader
        titulo="Contas a receber"
        descricao="Vendas no fiado, saldo de encomendas e outras receitas a entrar."
        voltar={{ href: '/financeiro', rotulo: 'Fluxo de caixa' }}
        acoes={podeGerenciar ? <NovaContaReceber categorias={categorias.filter((c) => c.tipo === 'RECEITA')} /> : null}
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Previsto no filtro" valor={moeda(dados.totalPrevisto)} icone={TrendingUp} />
        <StatTile rotulo="Já recebido" valor={moeda(dados.totalRecebido)} icone={TrendingUp} />
        <StatTile rotulo="Em aberto" valor={moeda(dados.saldoAberto)} icone={TrendingUp} />
        <StatTile
          rotulo="Atrasadas"
          valor={numero(atrasadas.length)}
          icone={TrendingUp}
          apoio={atrasadas.length > 0 ? moeda(atrasadas.reduce((a, c) => a + c.saldo, 0)) : 'nada vencido'}
        />
      </KpiGrid>

      <FiltrosLista
        buscaPlaceholder="Descrição…"
        datas
        selects={[
          {
            chave: 'status',
            rotulo: 'Todos os status',
            opcoes: [
              { valor: 'PENDENTE', rotulo: 'Pendente' },
              { valor: 'PARCIAL', rotulo: 'Parcial' },
              { valor: 'ATRASADO', rotulo: 'Atrasado' },
              { valor: 'LIQUIDADO', rotulo: 'Recebido' },
              { valor: 'CANCELADO', rotulo: 'Cancelado' },
            ],
          },
        ]}
      />

      <Panel>
        {dados.itens.length === 0 ? (
          <EmptyState
            icone={TrendingUp}
            titulo="Nenhuma conta a receber"
            descricao="São criadas automaticamente em vendas no fiado e na confirmação de encomendas."
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Descrição</TH>
                    <TH>Cliente</TH>
                    <TH>Origem</TH>
                    <TH>Vencimento</TH>
                    <TH numerico>Valor</TH>
                    <TH numerico>Saldo</TH>
                    <TH>Status</TH>
                    <TH className="w-10" />
                  </TR>
                </THead>
                <TBody>
                  {dados.itens.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <CellStack principal={c.descricao} apoio={c.categoria?.nome} />
                      </TD>
                      <TD>
                        {c.cliente ? (
                          <Link href={`/clientes/${c.cliente.id}`} className="text-sm hover:underline">
                            {c.cliente.nome}
                          </Link>
                        ) : (
                          <span className="text-sm text-body-subtle">—</span>
                        )}
                      </TD>
                      <TD>
                        {c.encomenda ? (
                          <Link href={`/encomendas/${c.encomenda.id}`} className="hover:underline">
                            <CodigoDoc>{c.encomenda.codigo}</CodigoDoc>
                          </Link>
                        ) : c.pedido ? (
                          <CodigoDoc>{c.pedido.codigo}</CodigoDoc>
                        ) : (
                          <span className="text-xs text-body-subtle">manual</span>
                        )}
                      </TD>
                      <TD>
                        <span className={c.status === 'ATRASADO' ? 'text-sm font-bold text-danger' : 'text-sm'}>
                          {fmtData(c.vencimento)}
                        </span>
                      </TD>
                      <TD numerico>{moeda(c.valor)}</TD>
                      <TD numerico>
                        <span className={c.saldo > 0 ? 'font-bold' : 'text-body-subtle'}>{moeda(c.saldo)}</span>
                      </TD>
                      <TD>
                        <Badge
                          tone={
                            c.status === 'LIQUIDADO'
                              ? 'leaf'
                              : c.status === 'ATRASADO'
                                ? 'danger'
                                : c.status === 'PARCIAL'
                                  ? 'caution'
                                  : c.status === 'CANCELADO'
                                    ? 'neutral'
                                    : 'brand'
                          }
                        >
                          {c.status === 'LIQUIDADO' ? 'Recebido' : rotulo('statusConta', c.status)}
                        </Badge>
                      </TD>
                      <TD>
                        {podeGerenciar && c.saldo > 0 && c.status !== 'CANCELADO' ? (
                          <AcoesReceber conta={{ id: c.id, descricao: c.descricao, saldo: c.saldo }} />
                        ) : null}
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
