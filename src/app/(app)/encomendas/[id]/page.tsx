import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageCircle, Truck, UserRound } from 'lucide-react'

import { DefRow, PageHeader, Panel, TotalRow } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, dataHora, hora, moeda, numero, rotulo, telefone as fmtTel } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { obterEncomenda } from '@/server/modules/encomendas/service'
import { AcoesEncomenda, PainelRecebimentoEncomenda } from './acoes'

export const metadata: Metadata = { title: 'Encomenda' }
export const dynamic = 'force-dynamic'

export default async function PaginaEncomenda({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPermissao('encomendas.ver')
  const { id } = await params

  const [encomenda, formas, podeGerenciar, podeProduzir] = await Promise.all([
    obterEncomenda(sessao.lojaId, id),
    db.formaPagamento.findMany({
      where: { lojaId: sessao.lojaId, ativo: true },
      orderBy: { ordem: 'asc' },
      select: { id: true, nome: true },
    }),
    podeFazer('encomendas.gerenciar'),
    podeFazer('producao.gerenciar'),
  ])
  if (!encomenda) notFound()

  const encerrada = encomenda.status === 'ENTREGUE' || encomenda.status === 'CANCELADA'

  return (
    <>
      <PageHeader
        titulo={`Encomenda ${encomenda.codigo}`}
        descricao={
          <>
            {encomenda.cliente.nome} · {fmtTel(encomenda.cliente.telefone)} ·{' '}
            {encomenda.tipoEntrega === 'ENTREGA' ? 'entrega' : 'retirada'} em {fmtData(encomenda.dataEntrega)} às{' '}
            {hora(encomenda.dataEntrega)}
          </>
        }
        voltar={{ href: '/encomendas', rotulo: 'Encomendas' }}
        acoes={
          <>
            <Badge
              tone={
                encomenda.status === 'ENTREGUE' || encomenda.status === 'PRONTA'
                  ? 'leaf'
                  : encomenda.status === 'CANCELADA'
                    ? 'danger'
                    : encomenda.status === 'EM_PRODUCAO'
                      ? 'caution'
                      : encomenda.status === 'CONFIRMADA'
                        ? 'brand'
                        : 'neutral'
              }
            >
              {rotulo('statusEncomenda', encomenda.status)}
            </Badge>
            <Button variant="secondary" asChild>
              <a href={`https://wa.me/55${encomenda.cliente.telefone}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                WhatsApp
              </a>
            </Button>
            {podeGerenciar ? (
              <AcoesEncomenda
                encomenda={{
                  id: encomenda.id,
                  codigo: encomenda.codigo,
                  status: encomenda.status,
                  saldo: encomenda.saldo,
                }}
                podeProduzir={podeProduzir}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel titulo="Itens da encomenda">
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Item</TH>
                    <TH>Sabor / detalhe</TH>
                    <TH numerico>Quantidade</TH>
                    <TH numerico>Preço unit.</TH>
                    <TH numerico>Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {encomenda.itens.map((i) => (
                    <TR key={i.id}>
                      <TD>
                        <span className="text-sm font-semibold">{i.descricao}</span>
                        {i.produto ? (
                          <Link href={`/produtos?busca=${i.produto.nome}`} className="block text-xs text-nobru-600 hover:underline">
                            {i.produto.nome}
                          </Link>
                        ) : (
                          <span className="block text-xs text-body-subtle">item livre</span>
                        )}
                      </TD>
                      <TD>
                        <span className="text-sm">{i.sabor ?? '—'}</span>
                      </TD>
                      <TD numerico>{numero(i.quantidade)}</TD>
                      <TD numerico>{moeda(i.precoUnitario)}</TD>
                      <TD numerico>{moeda(i.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <div className="space-y-2 border-t border-hairline px-5 py-3">
              <TotalRow rotulo="Total da encomenda" destaque>
                {moeda(encomenda.valorTotal)}
              </TotalRow>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-body-muted">Já recebido</span>
                <span className="font-semibold text-leaf" data-numeric>
                  {moeda(encomenda.valorPago)}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-body-muted">Saldo</span>
                <span className={encomenda.saldo > 0 ? 'font-semibold text-caution' : 'font-semibold text-leaf'} data-numeric>
                  {moeda(encomenda.saldo)}
                </span>
              </div>
            </div>
          </Panel>

          {(encomenda.tema || encomenda.decoracao || encomenda.observacoes || encomenda.enderecoEntrega) ? (
            <Panel titulo="Briefing">
              <dl className="divide-y divide-hairline px-5 py-2">
                {encomenda.tema ? <DefRow rotulo="Tema">{encomenda.tema}</DefRow> : null}
                {encomenda.enderecoEntrega ? <DefRow rotulo="Endereço">{encomenda.enderecoEntrega}</DefRow> : null}
              </dl>
              {encomenda.decoracao ? (
                <div className="border-t border-hairline px-5 py-3">
                  <p className="eyebrow mb-1">Decoração</p>
                  <p className="text-sm whitespace-pre-line text-body-muted">{encomenda.decoracao}</p>
                </div>
              ) : null}
              {encomenda.observacoes ? (
                <div className="border-t border-hairline px-5 py-3">
                  <p className="eyebrow mb-1">Observações</p>
                  <p className="text-sm whitespace-pre-line text-body-muted">{encomenda.observacoes}</p>
                </div>
              ) : null}
            </Panel>
          ) : null}
        </div>

        <div className="space-y-4">
          {!encerrada && podeGerenciar && encomenda.saldo > 0 ? (
            <PainelRecebimentoEncomenda
              encomendaId={encomenda.id}
              saldo={encomenda.saldo}
              sinalCombinado={encomenda.valorSinal}
              formas={formas}
            />
          ) : null}

          <Panel titulo="Pagamentos">
            {encomenda.pagamentos.length === 0 ? (
              <p className="px-5 py-6 text-sm text-body-muted">Nada recebido ainda.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {encomenda.pagamentos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                    <span>
                      <span className="block font-semibold">{p.forma}</span>
                      <span className="block text-xs text-body-muted">{dataHora(p.criadoEm)}</span>
                    </span>
                    <span className={p.status === 'ESTORNADO' ? 'font-bold text-danger line-through' : 'font-bold'} data-numeric>
                      {moeda(p.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel titulo="Ficha">
            <dl className="divide-y divide-hairline px-5 py-2">
              <DefRow rotulo="Cliente">
                <Link href={`/clientes/${encomenda.cliente.id}`} className="hover:underline">
                  {encomenda.cliente.nome}
                </Link>
              </DefRow>
              <DefRow rotulo="Tipo">
                <span className="inline-flex items-center gap-1.5">
                  {encomenda.tipoEntrega === 'ENTREGA' ? <Truck className="size-3.5" /> : <UserRound className="size-3.5" />}
                  {encomenda.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'}
                </span>
              </DefRow>
              <DefRow rotulo="Sinal combinado">{moeda(encomenda.valorSinal)}</DefRow>
              <DefRow rotulo="Criada por">{encomenda.usuario.nome}</DefRow>
              <DefRow rotulo="Criada em">{dataHora(encomenda.criadoEm)}</DefRow>
              {encomenda.confirmadaEm ? <DefRow rotulo="Confirmada em">{dataHora(encomenda.confirmadaEm)}</DefRow> : null}
              {encomenda.entregueEm ? <DefRow rotulo="Entregue em">{dataHora(encomenda.entregueEm)}</DefRow> : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  )
}
