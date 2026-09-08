'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChefHat, CheckCircle2, Clock, MoreHorizontal, Pencil, Ban, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { duracao, moeda, numero, rotulo } from '@/lib/format'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { useAcao } from '@/hooks/use-acao'
import { avancarStatusPedido, cancelarPedido } from '@/server/modules/pedidos/actions'

type PedidoFila = {
  id: string
  codigo: string
  tipo: string
  status: string
  minutosAberto: number
  mesa: number | null
  cliente: string | null
  total: number
  itens: Array<{ id: string; nome: string; quantidade: number; observacao: string | null; status: string }>
}

/**
 * Fila de preparo.
 *
 * Cartões em vez de tabela: quem olha esta tela está de pé, na cozinha, e
 * precisa reconhecer o pedido pela forma antes de ler. A cor da borda é o tempo
 * aberto — verde novo, âmbar esperando, vermelho atrasado.
 */
export function FilaPreparo({ pedidos, podeEditar }: { pedidos: PedidoFila[]; podeEditar: boolean }) {
  const acao = useAcao(avancarStatusPedido)

  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {pedidos.map((p) => {
        const atrasado = p.minutosAberto > 20
        const atencao = p.minutosAberto > 10
        return (
          <li
            key={p.id}
            className={cn(
              'rounded-card border-l-4 border border-hairline bg-paper p-3.5',
              p.status === 'PRONTO' ? 'border-l-leaf' : atrasado ? 'border-l-danger' : atencao ? 'border-l-caution' : 'border-l-nobru-400',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-body-muted">{p.codigo}</p>
                <p className="truncate text-sm font-semibold">
                  {rotulo('tipoPedido', p.tipo)}
                  {p.mesa ? ` · mesa ${p.mesa}` : ''}
                </p>
                {p.cliente ? <p className="truncate text-xs text-body-muted">{p.cliente}</p> : null}
              </div>
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                  atrasado ? 'bg-danger-soft text-danger' : atencao ? 'bg-caution-soft text-caution' : 'bg-paper-sunken text-body-muted',
                )}
              >
                <Clock className="size-3" />
                {duracao(p.minutosAberto)}
              </span>
            </div>

            <ul className="mt-2.5 space-y-1 border-t border-dashed border-hairline pt-2.5">
              {p.itens.map((i) => (
                <li key={i.id} className="flex gap-2 text-xs">
                  <span className="font-bold" data-numeric>
                    {numero(i.quantidade)}×
                  </span>
                  <span className="min-w-0 flex-1">
                    {i.nome}
                    {i.observacao ? <span className="block text-body-subtle italic">“{i.observacao}”</span> : null}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center gap-2">
              <span className="mr-auto text-sm font-bold" data-numeric>
                {moeda(p.total)}
              </span>
              {podeEditar && p.status === 'ABERTO' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={acao.pendente}
                  onClick={() => acao.executar({ pedidoId: p.id, status: 'EM_PREPARO' })}
                >
                  <ChefHat className="size-3.5" />
                  Preparar
                </Button>
              ) : null}
              {podeEditar && p.status === 'EM_PREPARO' ? (
                <Button
                  variant="leaf"
                  size="sm"
                  loading={acao.pendente}
                  onClick={() => acao.executar({ pedidoId: p.id, status: 'PRONTO' })}
                >
                  <CheckCircle2 className="size-3.5" />
                  Pronto
                </Button>
              ) : null}
              {p.status === 'PRONTO' ? <Badge tone="leaf">Pronto</Badge> : null}
              <Button size="sm" asChild>
                <Link href={`/pdv?pedido=${p.id}`}>
                  <Wallet className="size-3.5" />
                  Cobrar
                </Link>
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function AcoesPedido({
  pedido,
  podeEditar,
  podeCancelar,
}: {
  pedido: { id: string; codigo: string; status: string; total: number }
  podeEditar: boolean
  podeCancelar: boolean
}) {
  const [cancelarAberto, setCancelarAberto] = React.useState(false)
  const acao = useAcao(cancelarPedido, {
    sucesso: `Pedido ${pedido.codigo} cancelado`,
    aoConcluir: () => setCancelarAberto(false),
  })

  const encerrado = pedido.status === 'CANCELADO'
  const finalizado = pedido.status === 'FINALIZADO'

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações do pedido ${pedido.codigo}`}>
            <MoreHorizontal />
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          {!finalizado && !encerrado ? (
            <DropdownItem asChild>
              <Link href={`/pdv?pedido=${pedido.id}`}>
                <Pencil />
                Abrir no PDV
              </Link>
            </DropdownItem>
          ) : null}
          {podeCancelar && !encerrado ? (
            <>
              {!finalizado ? <DropdownSeparator /> : null}
              <DropdownItem destrutivo onSelect={() => setCancelarAberto(true)}>
                <Ban />
                {finalizado ? 'Cancelar e estornar' : 'Cancelar pedido'}
              </DropdownItem>
            </>
          ) : null}
          {encerrado ? <DropdownItem disabled>Pedido encerrado</DropdownItem> : null}
        </DropdownContent>
      </Dropdown>

      <ConfirmDialog
        aberto={cancelarAberto}
        onAbertoChange={setCancelarAberto}
        titulo={finalizado ? `Estornar o pedido ${pedido.codigo}?` : `Cancelar o pedido ${pedido.codigo}?`}
        descricao={
          finalizado
            ? `Isto devolve ${moeda(pedido.total)} ao estoque, estorna os pagamentos no caixa e desfaz os pontos do cliente.`
            : 'O pedido sai da fila e nada é cobrado.'
        }
        confirmarTexto={finalizado ? 'Estornar venda' : 'Cancelar pedido'}
        destrutivo
        pedirMotivo
        motivoLabel="Motivo do cancelamento"
        pendente={acao.pendente}
        onConfirmar={(motivo) => acao.executar({ pedidoId: pedido.id, motivo: motivo ?? '' })}
      />
    </>
  )
}
