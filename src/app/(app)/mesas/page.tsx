import type { Metadata } from 'next'
import { Grid2x2 } from 'lucide-react'

import { PageHeader, Panel } from '@/components/patterns/page'
import { EmptyState } from '@/components/ui/states'
import { num } from '@/lib/money'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { MapaMesas } from './mapa'

export const metadata: Metadata = { title: 'Mesas' }
export const dynamic = 'force-dynamic'

export default async function PaginaMesas() {
  const sessao = await exigirPermissao('mesas.ver')

  const [mesas, podeGerenciar] = await Promise.all([
    db.mesa.findMany({
      where: { lojaId: sessao.lojaId },
      orderBy: { numero: 'asc' },
      include: {
        pedidos: {
          where: { status: { in: ['ABERTO', 'EM_PREPARO', 'PRONTO'] } },
          select: {
            id: true,
            codigo: true,
            total: true,
            abertoEm: true,
            _count: { select: { itens: true } },
            cliente: { select: { nome: true } },
            usuario: { select: { nome: true } },
          },
          take: 1,
        },
      },
    }),
    podeFazer('mesas.gerenciar'),
  ])

  const dados = mesas.map((m) => {
    const pedido = m.pedidos[0]
    return {
      id: m.id,
      numero: m.numero,
      nome: m.nome,
      capacidade: m.capacidade,
      area: m.area,
      status: m.status,
      ativo: m.ativo,
      reservaNome: m.reservaNome,
      reservaHora: m.reservaHora?.toISOString() ?? null,
      pedido: pedido
        ? {
            id: pedido.id,
            codigo: pedido.codigo,
            total: num(pedido.total),
            itens: pedido._count.itens,
            abertoEm: pedido.abertoEm.toISOString(),
            cliente: pedido.cliente?.nome ?? null,
            operador: pedido.usuario.nome,
          }
        : null,
    }
  })

  const areas = [...new Set(mesas.map((m) => m.area).filter(Boolean))] as string[]

  return (
    <>
      <PageHeader
        titulo="Mesas"
        descricao="Quem está sentado, há quanto tempo e quanto já consumiu."
      />

      {dados.length === 0 ? (
        <Panel>
          <EmptyState
            icone={Grid2x2}
            titulo="Nenhuma mesa cadastrada"
            descricao="Cadastre as mesas do salão para controlar consumo no local."
          />
        </Panel>
      ) : (
        <MapaMesas mesas={dados} areas={areas} podeGerenciar={podeGerenciar} />
      )}
    </>
  )
}
