import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

import { BarrasRanking, ChartFrame } from '@/components/charts'
import { DefRow, PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import {
  cep as fmtCep,
  data as fmtData,
  dataHora,
  documento,
  moeda,
  numero,
  rotulo,
  telefone as fmtTel,
} from '@/lib/format'
import { exigirPermissao } from '@/server/auth/session'
import { obterCliente } from '@/server/modules/clientes/service'

export const metadata: Metadata = { title: 'Cliente' }
export const dynamic = 'force-dynamic'

export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPermissao('clientes.ver')
  const { id } = await params
  const cliente = await obterCliente(sessao.lojaId, id)
  if (!cliente) notFound()

  const endereco = [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro, cliente.cidade, cliente.uf]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <PageHeader
        titulo={cliente.nome}
        descricao={
          <>
            {fmtTel(cliente.telefone)}
            {cliente.email ? ` · ${cliente.email}` : ''}
            {cliente.dataNascimento ? ` · aniversário em ${fmtData(cliente.dataNascimento)}` : ''}
          </>
        }
        voltar={{ href: '/clientes', rotulo: 'Clientes' }}
        acoes={
          <Button variant="secondary" asChild>
            <a href={`https://wa.me/55${cliente.telefone}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              WhatsApp
            </a>
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { r: 'Total gasto', v: moeda(cliente.totalGasto) },
          { r: 'Pedidos', v: numero(cliente.totalPedidos) },
          { r: 'Ticket médio', v: moeda(cliente.ticketMedio) },
          { r: 'Pontos', v: numero(cliente.pontos) },
        ].map((i) => (
          <div key={i.r} className="rounded-card border border-hairline bg-paper-raised p-5 shadow-card">
            <p className="eyebrow">{i.r}</p>
            <p className="mt-1.5 font-display text-2xl font-extrabold" data-numeric>
              {i.v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel titulo="Últimas compras">
            {cliente.pedidos.length === 0 ? (
              <EmptyState titulo="Nenhuma compra registrada" />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Pedido</TH>
                      <TH>Quando</TH>
                      <TH>Tipo</TH>
                      <TH>Itens</TH>
                      <TH numerico>Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {cliente.pedidos.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <CodigoDoc>{p.codigo}</CodigoDoc>
                        </TD>
                        <TD>
                          <span className="text-xs text-body-muted">{dataHora(p.finalizadoEm)}</span>
                        </TD>
                        <TD>
                          <span className="text-xs">{rotulo('tipoPedido', p.tipo)}</span>
                        </TD>
                        <TD>
                          <span className="text-xs text-body-muted">
                            {p.itens.map((i) => `${numero(i.quantidade)}× ${i.nome}`).join(', ')}
                          </span>
                        </TD>
                        <TD numerico>{moeda(p.total)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </Panel>

          {cliente.encomendas.length > 0 ? (
            <Panel titulo="Encomendas">
              <ul className="divide-y divide-hairline">
                {cliente.encomendas.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 px-5 py-3">
                    <Link href={`/encomendas/${e.id}`} className="min-w-0 hover:underline">
                      <span className="block font-mono text-xs font-semibold text-body-muted">{e.codigo}</span>
                      <span className="block text-sm">{fmtData(e.dataEntrega)}</span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge tone={e.status === 'ENTREGUE' ? 'leaf' : e.status === 'CANCELADA' ? 'danger' : 'caution'}>
                        {rotulo('statusEncomenda', e.status)}
                      </Badge>
                      <span className="font-bold" data-numeric>
                        {moeda(e.valorTotal)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel titulo="Extrato de fidelidade">
            {cliente.fidelidade.length === 0 ? (
              <EmptyState titulo="Nenhum movimento de pontos" />
            ) : (
              <ul className="divide-y divide-hairline">
                {cliente.fidelidade.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{rotulo('tipoFidelidade', t.tipo)}</span>
                      <span className="block text-xs text-body-muted">
                        {t.descricao ?? '—'} · {dataHora(t.criadoEm)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={t.pontos > 0 ? 'font-bold text-leaf' : 'font-bold text-danger'} data-numeric>
                        {t.pontos > 0 ? '+' : ''}
                        {numero(t.pontos)}
                      </span>
                      <span className="block text-xs text-body-muted" data-numeric>
                        saldo {numero(t.saldoApos)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <ChartFrame titulo="Produtos favoritos" descricao="Por quantidade comprada">
            {cliente.favoritos.length ? (
              <BarrasRanking itens={cliente.favoritos} formatador={(v) => `${numero(v)} un`} />
            ) : (
              <EmptyState titulo="Sem histórico suficiente" />
            )}
          </ChartFrame>

          <Panel titulo="Cadastro">
            <dl className="divide-y divide-hairline px-5 py-2">
              <DefRow rotulo="Telefone">{fmtTel(cliente.telefone)}</DefRow>
              <DefRow rotulo="E-mail">{cliente.email ?? '—'}</DefRow>
              <DefRow rotulo="CPF">{cliente.cpf ? documento(cliente.cpf) : '—'}</DefRow>
              <DefRow rotulo="Aniversário">{cliente.dataNascimento ? fmtData(cliente.dataNascimento) : '—'}</DefRow>
              <DefRow rotulo="CEP">{cliente.cep ? fmtCep(cliente.cep) : '—'}</DefRow>
              <DefRow rotulo="Cliente desde">{fmtData(cliente.criadoEm)}</DefRow>
            </dl>
            {endereco ? <p className="border-t border-hairline px-5 py-3 text-sm text-body-muted">{endereco}</p> : null}
            {cliente.observacoes ? (
              <p className="border-t border-hairline px-5 py-3 text-sm">
                <span className="font-semibold">Observações: </span>
                {cliente.observacoes}
              </p>
            ) : null}
          </Panel>

          {cliente.cupons.length > 0 ? (
            <Panel titulo="Cupons ativos">
              <ul className="divide-y divide-hairline">
                {cliente.cupons.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span className="font-mono font-bold">{c.codigo}</span>
                    <span className="text-body-muted">
                      {c.tipo === 'PERCENTUAL' ? `${c.valor}%` : moeda(c.valor)}
                      {c.validoAte ? ` · até ${fmtData(c.validoAte)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  )
}
