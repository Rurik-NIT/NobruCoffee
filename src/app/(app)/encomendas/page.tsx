import type { Metadata } from 'next'
import { CalendarClock, Clock, TriangleAlert, Wallet } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { FiltrosLista, PaginacaoUrl } from '@/components/patterns/filtros'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { EmptyState } from '@/components/ui/states'
import { moeda, numero } from '@/lib/format'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { agendaEncomendas, listarEncomendas } from '@/server/modules/encomendas/service'
import { CartaoEncomenda, NovaEncomenda } from './componentes'

export const metadata: Metadata = { title: 'Encomendas' }
export const dynamic = 'force-dynamic'

export default async function PaginaEncomendas({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string; de?: string; ate?: string; pagina?: string }>
}) {
  const sessao = await exigirPermissao('encomendas.ver')
  const sp = await searchParams
  const temFiltro = Boolean(sp.busca || sp.status || sp.de || sp.ate || sp.pagina)

  const [agenda, lista, produtos, podeGerenciar] = await Promise.all([
    agendaEncomendas(sessao.lojaId),
    listarEncomendas({
      lojaId: sessao.lojaId,
      busca: sp.busca,
      status: sp.status,
      de: sp.de ? new Date(`${sp.de}T00:00:00`) : undefined,
      ate: sp.ate ? new Date(`${sp.ate}T23:59:59`) : undefined,
      pagina: Number(sp.pagina ?? 1),
    }),
    db.produto.findMany({
      where: { lojaId: sessao.lojaId, ativo: true },
      select: { id: true, nome: true, sku: true, precoVenda: true },
      orderBy: { nome: 'asc' },
    }),
    podeFazer('encomendas.gerenciar'),
  ])

  const emAberto = agenda.porStatus.reduce((a, s) => a + s.quantidade, 0)

  return (
    <>
      <PageHeader
        titulo="Encomendas"
        descricao="Bolos, kits e festas. É o fluxo com mais dinheiro por pedido — e o mais fácil de esquecer, porque acontece no futuro."
        acoes={
          podeGerenciar ? (
            <NovaEncomenda produtos={produtos.map((p) => ({ ...p, precoVenda: Number(p.precoVenda) }))} />
          ) : null
        }
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Saem hoje" valor={numero(agenda.hoje.length)} icone={Clock} />
        <StatTile rotulo="Próximos 7 dias" valor={numero(agenda.proximas.length)} icone={CalendarClock} />
        <StatTile
          rotulo="Atrasadas"
          valor={numero(agenda.atrasadas.length)}
          icone={TriangleAlert}
          apoio={agenda.atrasadas.length > 0 ? 'passaram da entrega' : 'nada atrasado'}
        />
        <StatTile rotulo="A receber" valor={moeda(agenda.aReceber)} icone={Wallet} apoio={`${numero(emAberto)} em aberto`} />
      </KpiGrid>

      {agenda.atrasadas.length > 0 ? (
        <Panel titulo="Atrasadas" descricao="Entrega venceu e a encomenda não foi marcada como entregue." className="mb-5">
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {agenda.atrasadas.map((e) => (
              <CartaoEncomenda key={e.id} encomenda={e} />
            ))}
          </ul>
        </Panel>
      ) : null}

      {agenda.hoje.length > 0 ? (
        <Panel titulo="Saem hoje" className="mb-5">
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {agenda.hoje.map((e) => (
              <CartaoEncomenda key={e.id} encomenda={e} />
            ))}
          </ul>
        </Panel>
      ) : null}

      {agenda.proximas.length > 0 ? (
        <Panel titulo="Próximos dias" className="mb-5">
          <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {agenda.proximas.map((e) => (
              <CartaoEncomenda key={e.id} encomenda={e} />
            ))}
          </ul>
        </Panel>
      ) : null}

      {agenda.hoje.length === 0 && agenda.proximas.length === 0 && agenda.atrasadas.length === 0 && !temFiltro ? (
        <Panel className="mb-5">
          <EmptyState
            icone={CalendarClock}
            titulo="Nenhuma encomenda na agenda"
            descricao="Orçamentos e encomendas confirmadas aparecem aqui, organizados pela data de entrega."
            acao={
              podeGerenciar ? (
                <NovaEncomenda produtos={produtos.map((p) => ({ ...p, precoVenda: Number(p.precoVenda) }))} />
              ) : undefined
            }
          />
        </Panel>
      ) : null}

      <FiltrosLista
        buscaPlaceholder="Código, cliente, telefone ou tema…"
        datas
        selects={[
          {
            chave: 'status',
            rotulo: 'Todos os status',
            opcoes: [
              { valor: 'ORCAMENTO', rotulo: 'Orçamento' },
              { valor: 'CONFIRMADA', rotulo: 'Confirmada' },
              { valor: 'EM_PRODUCAO', rotulo: 'Em produção' },
              { valor: 'PRONTA', rotulo: 'Pronta' },
              { valor: 'ENTREGUE', rotulo: 'Entregue' },
              { valor: 'CANCELADA', rotulo: 'Cancelada' },
            ],
          },
        ]}
      />

      <Panel titulo="Todas as encomendas">
        {lista.itens.length === 0 ? (
          <EmptyState icone={CalendarClock} titulo="Nenhuma encomenda no filtro" />
        ) : (
          <>
            <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {lista.itens.map((e) => (
                <CartaoEncomenda key={e.id} encomenda={e} />
              ))}
            </ul>
            <PaginacaoUrl pagina={lista.pagina} porPagina={lista.porPagina} total={lista.total} />
          </>
        )}
      </Panel>
    </>
  )
}
