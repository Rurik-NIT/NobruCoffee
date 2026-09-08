import type { Metadata } from 'next'
import Link from 'next/link'
import { Wallet } from 'lucide-react'

import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { PageHeader, Panel } from '@/components/patterns/page'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { caixaAbertoDaLoja } from '@/server/modules/caixa/service'
import { catalogoParaPdv, listarEmEspera, obterPedido } from '@/server/modules/pedidos/service'
import { Pdv } from './pdv'

export const metadata: Metadata = { title: 'PDV' }
export const dynamic = 'force-dynamic'

export default async function PaginaPdv({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; mesa?: string }>
}) {
  const sessao = await exigirPermissao('pdv.operar')
  const { pedido: pedidoId } = await searchParams

  const [caixa, catalogo, emEspera, config, mesas] = await Promise.all([
    caixaAbertoDaLoja(db, sessao.lojaId),
    catalogoParaPdv(sessao.lojaId),
    listarEmEspera(sessao.lojaId),
    db.configuracao.findUnique({
      where: { lojaId: sessao.lojaId },
      select: { descontoMaximoOperador: true, taxaServicoPercentual: true, taxaEntregaPadrao: true, valorPorPonto: true },
    }),
    db.mesa.findMany({
      where: { lojaId: sessao.lojaId, ativo: true },
      orderBy: { numero: 'asc' },
      select: { id: true, numero: true, nome: true, status: true },
    }),
  ])

  // Sem caixa aberto a venda não pode ser registrada — dizemos isso na cara,
  // com o caminho da solução, em vez de deixar o operador descobrir no fim.
  if (!caixa) {
    return (
      <>
        <PageHeader titulo="PDV" descricao="Ponto de venda do balcão" />
        <Panel>
          <EmptyState
            icone={Wallet}
            titulo="Abra o caixa para vender"
            descricao="O PDV registra cada venda dentro de um caixa. Sem caixa aberto não há como conferir o dinheiro no fim do turno."
            acao={
              <Button size="lg" asChild>
                <Link href="/caixas">Abrir caixa agora</Link>
              </Button>
            }
          />
        </Panel>
      </>
    )
  }

  const pedidoAtual = pedidoId ? await obterPedido(sessao.lojaId, pedidoId) : null

  return (
    <Pdv
      caixa={{ id: caixa.id, codigo: caixa.codigo }}
      catalogo={catalogo}
      emEspera={emEspera.map((p) => ({ ...p, abertoEm: p.abertoEm.toISOString() }))}
      mesas={mesas}
      config={{
        descontoMaximoOperador: Number(config?.descontoMaximoOperador ?? 10),
        taxaServicoPercentual: Number(config?.taxaServicoPercentual ?? 0),
        taxaEntregaPadrao: Number(config?.taxaEntregaPadrao ?? 0),
        valorPorPonto: Number(config?.valorPorPonto ?? 0.05),
      }}
      pedidoAberto={
        pedidoAtual
          ? {
              id: pedidoAtual.id,
              codigo: pedidoAtual.codigo,
              tipo: pedidoAtual.tipo,
              total: pedidoAtual.total,
              subtotal: pedidoAtual.subtotal,
              descontoValor: pedidoAtual.descontoValor,
              mesaNumero: pedidoAtual.mesa?.numero ?? null,
              cliente: pedidoAtual.cliente,
              itens: pedidoAtual.itens.map((i) => ({
                id: i.id,
                nome: i.nome,
                quantidade: i.quantidade,
                precoUnitario: i.precoUnitario,
                total: i.total,
                observacao: i.observacao,
                adicionais: i.adicionais.map((a) => ({ nome: a.nome, preco: a.preco, quantidade: a.quantidade })),
              })),
            }
          : null
      }
      permissoes={{
        descontoLivre: sessao.permissoes.includes('*') || sessao.permissoes.includes('pdv.desconto_livre'),
        cancelarItem: sessao.permissoes.includes('*') || sessao.permissoes.includes('pdv.cancelar_item'),
        cadastrarCliente: sessao.permissoes.includes('*') || sessao.permissoes.includes('clientes.gerenciar'),
      }}
    />
  )
}
