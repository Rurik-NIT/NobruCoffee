import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, Panel, TotalRow } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, dataHora, documento, moeda, percentual, quantidade as fmtQtd, rotulo, telefone } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { obterPedidoCompra } from '@/server/modules/compras/service'
import { AcoesPedidoCompra, PainelRecebimento } from './recebimento'

export const metadata: Metadata = { title: 'Pedido de compra' }
export const dynamic = 'force-dynamic'

export default async function PaginaPedidoCompra({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPermissao('compras.ver')
  const { id } = await params

  const [pedido, podeGerenciar, podeReceber] = await Promise.all([
    obterPedidoCompra(sessao.lojaId, id),
    podeFazer('compras.gerenciar'),
    podeFazer('compras.receber'),
  ])
  if (!pedido) notFound()

  const aberto = pedido.status === 'RASCUNHO' || pedido.status === 'ENVIADO' || pedido.status === 'PARCIAL'

  return (
    <>
      <PageHeader
        titulo={`Compra ${pedido.codigo}`}
        descricao={
          <>
            {pedido.fornecedor.nome}
            {pedido.fornecedor.cnpjCpf ? ` · ${documento(pedido.fornecedor.cnpjCpf)}` : ''}
            {pedido.fornecedor.telefone ? ` · ${telefone(pedido.fornecedor.telefone)}` : ''} · pedido em{' '}
            {fmtData(pedido.dataPedido)} por {pedido.usuario}
          </>
        }
        voltar={{ href: '/compras', rotulo: 'Pedidos de compra' }}
        acoes={
          <>
            <Badge
              tone={
                pedido.status === 'RECEBIDO'
                  ? 'leaf'
                  : pedido.status === 'PARCIAL'
                    ? 'caution'
                    : pedido.status === 'CANCELADO'
                      ? 'danger'
                      : pedido.status === 'ENVIADO'
                        ? 'brand'
                        : 'neutral'
              }
            >
              {rotulo('statusCompra', pedido.status)}
            </Badge>
            {podeGerenciar ? (
              <AcoesPedidoCompra pedido={{ id: pedido.id, codigo: pedido.codigo, status: pedido.status }} />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel titulo="Itens do pedido" descricao="Comparação do preço da compra com o custo médio atual.">
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Insumo</TH>
                  <TH numerico>Pedido</TH>
                  <TH numerico>Recebido</TH>
                  <TH numerico>Preço unit.</TH>
                  <TH numerico>vs custo médio</TH>
                  <TH numerico>Total</TH>
                </TR>
              </THead>
              <TBody>
                {pedido.itens.map((i) => (
                  <TR key={i.id}>
                    <TD>
                      <span className="text-sm font-semibold">{i.nome}</span>
                      <span className="block text-xs text-body-muted">{i.sku}</span>
                    </TD>
                    <TD numerico>{fmtQtd(i.quantidade, i.unidade)}</TD>
                    <TD numerico>
                      <span className={i.pendente > 0 ? 'text-caution' : 'text-leaf'}>
                        {fmtQtd(i.quantidadeRecebida, i.unidade)}
                      </span>
                    </TD>
                    <TD numerico>{moeda(i.precoUnitario)}</TD>
                    <TD numerico>
                      {i.variacaoCusto === null ? (
                        <span className="text-body-subtle">—</span>
                      ) : (
                        <span
                          className={
                            i.variacaoCusto > 10 ? 'font-bold text-danger' : i.variacaoCusto < -5 ? 'font-bold text-leaf' : ''
                          }
                        >
                          {i.variacaoCusto > 0 ? '+' : ''}
                          {percentual(i.variacaoCusto)}
                        </span>
                      )}
                    </TD>
                    <TD numerico>{moeda(i.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-hairline px-5 py-3">
            <TotalRow rotulo="Total do pedido" destaque>
              {moeda(pedido.total)}
            </TotalRow>
          </div>
          {pedido.observacao ? (
            <p className="border-t border-hairline px-5 py-3 text-sm text-body-muted">{pedido.observacao}</p>
          ) : null}
        </Panel>

        <div className="space-y-4">
          {aberto && podeReceber && pedido.pendentes.length > 0 ? (
            <PainelRecebimento pedidoId={pedido.id} codigo={pedido.codigo} itens={pedido.pendentes} />
          ) : null}

          <Panel titulo="Recebimentos" descricao={`${pedido.recebimentos.length} registro(s)`}>
            {pedido.recebimentos.length === 0 ? (
              <p className="px-5 py-6 text-sm text-body-muted">
                Nada recebido ainda. O estoque muda apenas quando você registra o recebimento.
              </p>
            ) : (
              <ul className="divide-y divide-hairline">
                {pedido.recebimentos.map((r) => (
                  <li key={r.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {dataHora(r.data)}
                        {r.notaFiscal ? ` · NF ${r.notaFiscal}` : ''}
                      </span>
                      <span className="font-bold" data-numeric>
                        {moeda(r.total)}
                      </span>
                    </div>
                    <p className="text-xs text-body-muted">recebido por {r.usuario}</p>
                    <ul className="mt-1.5 space-y-0.5">
                      {r.itens.map((i, idx) => (
                        <li key={idx} className="text-xs text-body-muted">
                          {i.nome}: {fmtQtd(i.quantidade, i.unidade)} a {moeda(i.precoUnitario)}
                          {i.validade ? ` · val. ${fmtData(i.validade)}` : ''}
                          {i.lote ? ` · lote ${i.lote}` : ''}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {pedido.contasPagar.length > 0 ? (
            <Panel titulo="Contas geradas">
              <ul className="divide-y divide-hairline">
                {pedido.contasPagar.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-5 py-3 text-sm">
                    <span>
                      <span className="block font-semibold" data-numeric>
                        {moeda(c.valor)}
                      </span>
                      <span className="block text-xs text-body-muted">vence {fmtData(c.vencimento)}</span>
                    </span>
                    <Badge tone={c.status === 'LIQUIDADO' ? 'leaf' : c.status === 'ATRASADO' ? 'danger' : 'caution'}>
                      {rotulo('statusConta', c.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="border-t border-hairline px-5 py-2.5">
                <Link href="/financeiro/pagar" className="text-xs font-semibold text-nobru-600 hover:underline">
                  Ver em Contas a pagar
                </Link>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  )
}
