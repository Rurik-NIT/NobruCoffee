'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { recalcularPedido } from '@/server/modules/pedidos/service'

const uuid = z.string().uuid()

const mesaSchema = z.object({
  id: uuid.optional(),
  numero: z.number().int().min(1, 'Informe o número da mesa.').max(999),
  nome: z.string().trim().max(40).optional().or(z.literal('')),
  capacidade: z.number().int().min(1).max(30).default(2),
  area: z.string().trim().max(40).optional().or(z.literal('')),
  ativo: z.boolean().default(true),
})

export const salvarMesa = acao(mesaSchema, async (entrada) => {
  const sessao = await exigirPermissao('mesas.gerenciar')
  const dados = {
    numero: entrada.numero,
    nome: entrada.nome || null,
    capacidade: entrada.capacidade,
    area: entrada.area || null,
    ativo: entrada.ativo,
  }
  const mesa = entrada.id
    ? await db.mesa.update({ where: { id: entrada.id }, data: dados })
    : await db.mesa.create({ data: { ...dados, lojaId: sessao.lojaId } })

  revalidatePath('/mesas')
  return { id: mesa.id, numero: mesa.numero }
})

export const reservarMesa = acao(
  z.object({
    id: uuid,
    nome: z.string().trim().min(2, 'Informe o nome da reserva.').max(60),
    hora: z.string().min(4, 'Informe o horário.'),
  }),
  async ({ id, nome, hora }) => {
    const sessao = await exigirPermissao('mesas.gerenciar')
    const mesa = await db.mesa.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { status: true, numero: true } })
    if (!mesa) throw new ErroDeNegocio('Mesa não encontrada.', 'NAO_ENCONTRADO')
    if (mesa.status === 'OCUPADA') throw new ErroDeNegocio('Esta mesa está ocupada agora. Reserve outra.')

    await db.mesa.update({
      where: { id },
      data: { status: 'RESERVADA', reservaNome: nome, reservaHora: new Date(hora) },
    })
    revalidatePath('/mesas')
    return { numero: mesa.numero }
  },
)

export const liberarMesa = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('mesas.gerenciar')
  const mesa = await db.mesa.findFirst({
    where: { id, lojaId: sessao.lojaId },
    include: { pedidos: { where: { status: { in: ['ABERTO', 'EM_PREPARO', 'PRONTO'] } }, select: { codigo: true } } },
  })
  if (!mesa) throw new ErroDeNegocio('Mesa não encontrada.', 'NAO_ENCONTRADO')
  if (mesa.pedidos.length > 0) {
    throw new ErroDeNegocio(
      `A mesa ${mesa.numero} tem o pedido ${mesa.pedidos[0].codigo} em aberto. Feche ou cancele o pedido primeiro.`,
      'CONFLITO',
    )
  }

  await db.mesa.update({ where: { id }, data: { status: 'LIVRE', reservaNome: null, reservaHora: null } })
  revalidatePath('/mesas')
  return { numero: mesa.numero }
})

/**
 * Transferir mesa. O pedido continua o mesmo — muda de lugar, não de identidade,
 * para que o histórico e a comanda impressa continuem válidos.
 */
export const transferirMesa = acao(
  z.object({ pedidoId: uuid, mesaDestinoId: uuid }),
  async ({ pedidoId, mesaDestinoId }) => {
    const sessao = await exigirPermissao('mesas.gerenciar')

    const resultado = await db.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: { id: pedidoId, lojaId: sessao.lojaId },
        select: { id: true, codigo: true, mesaId: true, status: true },
      })
      if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
      if (pedido.status === 'FINALIZADO' || pedido.status === 'CANCELADO') {
        throw new ErroDeNegocio('Este pedido já foi encerrado.')
      }

      const destino = await tx.mesa.findFirst({ where: { id: mesaDestinoId, lojaId: sessao.lojaId } })
      if (!destino) throw new ErroDeNegocio('Mesa de destino não encontrada.', 'NAO_ENCONTRADO')
      if (destino.status === 'OCUPADA') throw new ErroDeNegocio(`A mesa ${destino.numero} já está ocupada.`)

      if (pedido.mesaId) await tx.mesa.update({ where: { id: pedido.mesaId }, data: { status: 'LIVRE' } })
      await tx.mesa.update({ where: { id: mesaDestinoId }, data: { status: 'OCUPADA' } })
      await tx.pedido.update({ where: { id: pedidoId }, data: { mesaId: mesaDestinoId, tipo: 'MESA' } })

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'mesa.transferida',
          entidade: 'pedido',
          entidadeId: pedidoId,
          novo: { pedido: pedido.codigo, mesaDestino: destino.numero },
        },
        tx,
      )
      return { numero: destino.numero, codigo: pedido.codigo }
    })

    revalidatePath('/mesas')
    revalidatePath('/pdv')
    return resultado
  },
)

/**
 * Juntar mesas: move os itens do pedido de origem para o de destino e encerra o
 * de origem como cancelado com motivo. Uma comanda só na hora de pagar.
 */
export const unirMesas = acao(
  z.object({ pedidoOrigemId: uuid, pedidoDestinoId: uuid }),
  async ({ pedidoOrigemId, pedidoDestinoId }) => {
    const sessao = await exigirPermissao('mesas.gerenciar')
    if (pedidoOrigemId === pedidoDestinoId) throw new ErroDeNegocio('Escolha dois pedidos diferentes.')

    const resultado = await db.$transaction(async (tx) => {
      const [origem, destino] = await Promise.all([
        tx.pedido.findFirst({ where: { id: pedidoOrigemId, lojaId: sessao.lojaId }, select: { id: true, codigo: true, status: true, mesaId: true } }),
        tx.pedido.findFirst({ where: { id: pedidoDestinoId, lojaId: sessao.lojaId }, select: { id: true, codigo: true, status: true } }),
      ])
      if (!origem || !destino) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')
      if (origem.status === 'FINALIZADO' || destino.status === 'FINALIZADO') {
        throw new ErroDeNegocio('Não é possível juntar um pedido já finalizado.')
      }

      await tx.pedidoItem.updateMany({ where: { pedidoId: origem.id }, data: { pedidoId: destino.id } })
      if (origem.mesaId) await tx.mesa.update({ where: { id: origem.mesaId }, data: { status: 'LIVRE' } })
      await tx.pedido.update({
        where: { id: origem.id },
        data: {
          status: 'CANCELADO',
          canceladoEm: new Date(),
          canceladoMotivo: `Unido ao pedido ${destino.codigo}`,
          canceladoPorId: sessao.id,
          mesaId: null,
        },
      })

      const totais = await recalcularPedido(tx, destino.id)
      await recalcularPedido(tx, origem.id)

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'mesa.pedidos_unidos',
          entidade: 'pedido',
          entidadeId: destino.id,
          novo: { origem: origem.codigo, destino: destino.codigo },
        },
        tx,
      )
      return { codigo: destino.codigo, total: totais.total }
    })

    revalidatePath('/mesas')
    revalidatePath('/pdv')
    return resultado
  },
)

/**
 * Dividir a conta.
 *
 * Não altera o pedido: devolve o rateio para a tela mostrar quanto cada pessoa
 * paga. A cobrança continua saindo de uma comanda só, com pagamento dividido no
 * fechamento — que é como a loja de fato recebe.
 */
export const calcularDivisao = acao(
  z.object({ pedidoId: uuid, pessoas: z.number().int().min(2, 'Informe 2 ou mais pessoas.').max(30) }),
  async ({ pedidoId, pessoas }) => {
    const sessao = await exigirPermissao('mesas.ver')
    const pedido = await db.pedido.findFirst({
      where: { id: pedidoId, lojaId: sessao.lojaId },
      select: { total: true, codigo: true },
    })
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 'NAO_ENCONTRADO')

    const { ratear } = await import('@/lib/money')
    const partes = ratear(Number(pedido.total), Array.from({ length: pessoas }, () => 1))
    return { codigo: pedido.codigo, total: Number(pedido.total), partes }
  },
)
