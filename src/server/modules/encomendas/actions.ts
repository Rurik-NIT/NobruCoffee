'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { proximoCodigo } from '@/server/counters'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num } from '@/lib/money'
import { moeda } from '@/lib/format'
import { caixaAbertoDaLoja } from '@/server/modules/caixa/service'

const uuid = z.string().uuid()

const encomendaSchema = z.object({
  id: uuid.optional(),
  clienteId: uuid,
  tipoEntrega: z.enum(['RETIRADA', 'ENTREGA']),
  dataEntrega: z.string().min(10, 'Informe data e hora da entrega.'),
  tema: z.string().trim().max(80).optional().or(z.literal('')),
  decoracao: z.string().trim().max(400).optional().or(z.literal('')),
  observacoes: z.string().trim().max(1000).optional().or(z.literal('')),
  enderecoEntrega: z.string().trim().max(240).optional().or(z.literal('')),
  imagensRef: z.array(z.string().trim().max(500)).max(8).default([]),
  valorSinal: z.number().min(0).max(999_999).default(0),
  itens: z
    .array(
      z.object({
        produtoId: uuid.nullable().optional(),
        descricao: z.string().trim().min(2, 'Descreva o item.').max(120),
        sabor: z.string().trim().max(80).optional().or(z.literal('')),
        quantidade: z.number().min(0.001, 'Informe a quantidade.').max(9_999),
        precoUnitario: z.number().min(0, 'Informe o preço.').max(999_999),
      }),
    )
    .min(1, 'Adicione ao menos um item à encomenda.')
    .max(40),
})

export const salvarEncomenda = acao(encomendaSchema, async (entrada) => {
  const sessao = await exigirPermissao('encomendas.gerenciar')

  const cliente = await db.cliente.findFirst({
    where: { id: entrada.clienteId, lojaId: sessao.lojaId },
    select: { id: true, nome: true },
  })
  if (!cliente) throw new ErroDeNegocio('Cliente não encontrado.', 'VALIDACAO', { clienteId: 'Escolha um cliente.' })

  const dataEntrega = new Date(entrada.dataEntrega)
  if (Number.isNaN(dataEntrega.getTime())) {
    throw new ErroDeNegocio('Data de entrega inválida.', 'VALIDACAO', { dataEntrega: 'Data inválida.' })
  }
  if (!entrada.id && dataEntrega < new Date()) {
    throw new ErroDeNegocio('A entrega não pode ser no passado.', 'VALIDACAO', { dataEntrega: 'Escolha uma data futura.' })
  }
  if (entrada.tipoEntrega === 'ENTREGA' && !entrada.enderecoEntrega) {
    throw new ErroDeNegocio('Informe o endereço de entrega.', 'VALIDACAO', { enderecoEntrega: 'Obrigatório para entrega.' })
  }

  const itens = entrada.itens.map((i) => ({
    produtoId: i.produtoId ?? null,
    descricao: i.descricao,
    sabor: i.sabor || null,
    quantidade: i.quantidade,
    precoUnitario: i.precoUnitario,
    total: brl(i.quantidade * i.precoUnitario),
  }))
  const valorTotal = brl(itens.reduce((acc, i) => acc + i.total, 0))

  if (entrada.valorSinal > valorTotal) {
    throw new ErroDeNegocio('O sinal não pode ser maior que o total.', 'VALIDACAO', { valorSinal: 'Acima do total.' })
  }

  const encomenda = await db.$transaction(async (tx) => {
    const dados = {
      clienteId: entrada.clienteId,
      tipoEntrega: entrada.tipoEntrega,
      dataEntrega,
      tema: entrada.tema || null,
      decoracao: entrada.decoracao || null,
      observacoes: entrada.observacoes || null,
      enderecoEntrega: entrada.enderecoEntrega || null,
      imagensRef: entrada.imagensRef,
      valorTotal,
      valorSinal: entrada.valorSinal,
    }

    if (entrada.id) {
      const atual = await tx.encomenda.findFirst({ where: { id: entrada.id, lojaId: sessao.lojaId } })
      if (!atual) throw new ErroDeNegocio('Encomenda não encontrada.', 'NAO_ENCONTRADO')
      if (atual.status === 'ENTREGUE' || atual.status === 'CANCELADA') {
        throw new ErroDeNegocio('Esta encomenda já foi encerrada e não pode ser alterada.')
      }
      if (num(atual.valorPago) > valorTotal) {
        throw new ErroDeNegocio(
          `O cliente já pagou ${moeda(atual.valorPago)}. O novo total (${moeda(valorTotal)}) não pode ser menor.`,
        )
      }
      await tx.encomendaItem.deleteMany({ where: { encomendaId: entrada.id } })
      const atualizada = await tx.encomenda.update({
        where: { id: entrada.id },
        data: { ...dados, itens: { createMany: { data: itens } } },
        select: { id: true, codigo: true },
      })
      return atualizada
    }

    const codigo = await proximoCodigo(tx, sessao.lojaId, 'encomenda')
    return tx.encomenda.create({
      data: {
        ...dados,
        lojaId: sessao.lojaId,
        codigo,
        usuarioId: sessao.id,
        itens: { createMany: { data: itens } },
      },
      select: { id: true, codigo: true },
    })
  })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'encomenda.editada' : 'encomenda.criada',
    entidade: 'encomenda',
    entidadeId: encomenda.id,
    novo: { codigo: encomenda.codigo, cliente: cliente.nome, total: moeda(valorTotal) },
  })

  revalidatePath('/encomendas')
  return { id: encomenda.id, codigo: encomenda.codigo, valorTotal }
})

/**
 * Avança o status. As transições são fixas para o quadro não virar bagunça:
 * ORCAMENTO → CONFIRMADA → EM_PRODUCAO → PRONTA → ENTREGUE.
 */
const PROXIMOS: Record<string, string[]> = {
  ORCAMENTO: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['EM_PRODUCAO', 'CANCELADA'],
  EM_PRODUCAO: ['PRONTA', 'CANCELADA'],
  PRONTA: ['ENTREGUE', 'CANCELADA'],
  ENTREGUE: [],
  CANCELADA: [],
}

export const avancarEncomenda = acao(
  z.object({
    id: uuid,
    status: z.enum(['CONFIRMADA', 'EM_PRODUCAO', 'PRONTA', 'ENTREGUE', 'CANCELADA']),
    motivo: z.string().trim().max(200).optional().or(z.literal('')),
  }),
  async ({ id, status, motivo }) => {
    const sessao = await exigirPermissao('encomendas.gerenciar')

    const resultado = await db.$transaction(async (tx) => {
      const encomenda = await tx.encomenda.findFirst({
        where: { id, lojaId: sessao.lojaId },
        include: { cliente: { select: { nome: true } } },
      })
      if (!encomenda) throw new ErroDeNegocio('Encomenda não encontrada.', 'NAO_ENCONTRADO')

      if (!PROXIMOS[encomenda.status]?.includes(status)) {
        throw new ErroDeNegocio(
          `Não é possível ir de ${encomenda.status.toLowerCase()} para ${status.toLowerCase()}.`,
          'REGRA_DE_NEGOCIO',
        )
      }
      if (status === 'CANCELADA' && !motivo) {
        throw new ErroDeNegocio('Informe o motivo do cancelamento.', 'VALIDACAO', { motivo: 'Obrigatório.' })
      }
      // Entregar sem receber o saldo deixaria a conta aberta sem controle.
      if (status === 'ENTREGUE' && num(encomenda.valorPago) < num(encomenda.valorTotal)) {
        throw new ErroDeNegocio(
          `Falta receber ${moeda(brl(num(encomenda.valorTotal) - num(encomenda.valorPago)))}. Registre o pagamento antes de entregar.`,
        )
      }

      await tx.encomenda.update({
        where: { id },
        data: {
          status,
          ...(status === 'CONFIRMADA' ? { confirmadaEm: new Date() } : {}),
          ...(status === 'ENTREGUE' ? { entregueEm: new Date() } : {}),
          ...(status === 'CANCELADA' ? { canceladaEm: new Date(), observacoes: motivo || encomenda.observacoes } : {}),
        },
      })

      // Confirmar a encomenda cria a conta a receber do saldo.
      if (status === 'CONFIRMADA') {
        const saldo = brl(num(encomenda.valorTotal) - num(encomenda.valorPago))
        if (saldo > 0) {
          await tx.contaReceber.create({
            data: {
              lojaId: sessao.lojaId,
              clienteId: encomenda.clienteId,
              encomendaId: encomenda.id,
              descricao: `Encomenda ${encomenda.codigo} — ${encomenda.cliente.nome}`,
              valor: saldo,
              vencimento: encomenda.dataEntrega,
              status: 'PENDENTE',
            },
          })
        }
      }

      if (status === 'CANCELADA') {
        await tx.contaReceber.updateMany({
          where: { encomendaId: encomenda.id, status: { in: ['PENDENTE', 'PARCIAL'] } },
          data: { status: 'CANCELADO' },
        })
      }

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: `encomenda.${status.toLowerCase()}`,
          entidade: 'encomenda',
          entidadeId: id,
          anterior: { status: encomenda.status },
          novo: { status, motivo: motivo || null },
        },
        tx,
      )

      return { codigo: encomenda.codigo, status }
    })

    revalidatePath('/encomendas')
    revalidatePath(`/encomendas/${id}`)
    revalidatePath('/financeiro/receber')
    return resultado
  },
)

/**
 * Recebe sinal ou saldo da encomenda.
 * Entra no caixa aberto como venda, porque é dinheiro que passou pelo balcão.
 */
export const receberEncomenda = acao(
  z.object({
    id: uuid,
    formaPagamentoId: uuid,
    valor: z.number().min(0.01, 'Informe o valor recebido.').max(999_999),
  }),
  async ({ id, formaPagamentoId, valor }) => {
    const sessao = await exigirPermissao('encomendas.gerenciar')

    const resultado = await db.$transaction(async (tx) => {
      const encomenda = await tx.encomenda.findFirst({
        where: { id, lojaId: sessao.lojaId },
        select: { id: true, codigo: true, valorTotal: true, valorPago: true, status: true, clienteId: true },
      })
      if (!encomenda) throw new ErroDeNegocio('Encomenda não encontrada.', 'NAO_ENCONTRADO')
      if (encomenda.status === 'CANCELADA') throw new ErroDeNegocio('Esta encomenda está cancelada.')

      const saldo = brl(num(encomenda.valorTotal) - num(encomenda.valorPago))
      if (valor > saldo + 0.005) {
        throw new ErroDeNegocio(`O saldo desta encomenda é ${moeda(saldo)}.`, 'VALIDACAO', {
          valor: `Máximo ${moeda(saldo)}.`,
        })
      }

      const forma = await tx.formaPagamento.findFirst({
        where: { id: formaPagamentoId, lojaId: sessao.lojaId, ativo: true },
        select: { id: true, nome: true, taxaPercentual: true, taxaFixa: true },
      })
      if (!forma) throw new ErroDeNegocio('Forma de pagamento inválida.')

      const caixa = await caixaAbertoDaLoja(tx, sessao.lojaId)

      await tx.pagamento.create({
        data: {
          encomendaId: encomenda.id,
          formaPagamentoId: forma.id,
          caixaId: caixa?.id ?? null,
          valor,
          taxaValor: brl((valor * num(forma.taxaPercentual)) / 100 + num(forma.taxaFixa)),
          status: 'APROVADO',
          usuarioId: sessao.id,
        },
      })

      if (caixa) {
        await tx.movimentoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: 'VENDA',
            formaPagamentoId: forma.id,
            valor,
            descricao: `Encomenda ${encomenda.codigo}`,
            usuarioId: sessao.id,
          },
        })
      }

      const atualizada = await tx.encomenda.update({
        where: { id },
        data: { valorPago: { increment: valor } },
        select: { valorPago: true, valorTotal: true },
      })

      // Abate na conta a receber vinculada.
      const conta = await tx.contaReceber.findFirst({
        where: { encomendaId: encomenda.id, status: { in: ['PENDENTE', 'PARCIAL'] } },
      })
      if (conta) {
        const recebido = brl(num(conta.valorRecebido) + valor)
        await tx.contaReceber.update({
          where: { id: conta.id },
          data: {
            valorRecebido: recebido,
            status: recebido >= num(conta.valor) - 0.005 ? 'LIQUIDADO' : 'PARCIAL',
            recebidoEm: recebido >= num(conta.valor) - 0.005 ? new Date() : null,
          },
        })
      }

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'encomenda.pagamento_recebido',
          entidade: 'encomenda',
          entidadeId: id,
          novo: { codigo: encomenda.codigo, valor: moeda(valor), forma: forma.nome },
        },
        tx,
      )

      return {
        codigo: encomenda.codigo,
        pago: num(atualizada.valorPago),
        saldo: brl(num(atualizada.valorTotal) - num(atualizada.valorPago)),
      }
    })

    revalidatePath('/encomendas')
    revalidatePath(`/encomendas/${id}`)
    revalidatePath('/caixas')
    revalidatePath('/financeiro/receber')
    return resultado
  },
)

/** Gera a ordem de produção da encomenda, para os itens ligados a produtos. */
export const gerarProducaoDaEncomenda = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('producao.gerenciar')

  const resultado = await db.$transaction(async (tx) => {
    const encomenda = await tx.encomenda.findFirst({
      where: { id, lojaId: sessao.lojaId },
      include: {
        itens: { include: { produto: { select: { id: true, nome: true, fichasTecnicas: { where: { ativa: true }, select: { id: true } } } } } },
      },
    })
    if (!encomenda) throw new ErroDeNegocio('Encomenda não encontrada.', 'NAO_ENCONTRADO')
    if (encomenda.status === 'ORCAMENTO') {
      throw new ErroDeNegocio('Confirme a encomenda antes de gerar a produção.')
    }

    const produzir = encomenda.itens.filter((i) => i.produto && i.produto.fichasTecnicas.length > 0)
    if (produzir.length === 0) {
      throw new ErroDeNegocio(
        'Nenhum item desta encomenda está ligado a um produto com ficha técnica. Vincule os produtos para gerar a ordem.',
      )
    }

    const codigo = await proximoCodigo(tx, sessao.lojaId, 'producao')
    const ordem = await tx.ordemProducao.create({
      data: {
        lojaId: sessao.lojaId,
        codigo,
        data: encomenda.dataEntrega,
        turno: 'Encomenda',
        observacao: `Encomenda ${encomenda.codigo}`,
        responsavelId: sessao.id,
        itens: {
          createMany: {
            data: produzir.map((i) => ({
              produtoId: i.produto!.id,
              fichaTecnicaId: i.produto!.fichasTecnicas[0].id,
              quantidadePlanejada: num(i.quantidade),
              observacao: i.sabor ?? null,
            })),
          },
        },
      },
      select: { id: true, codigo: true },
    })

    if (encomenda.status === 'CONFIRMADA') {
      await tx.encomenda.update({ where: { id }, data: { status: 'EM_PRODUCAO' } })
    }

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: 'encomenda.producao_gerada',
        entidade: 'encomenda',
        entidadeId: id,
        novo: { encomenda: encomenda.codigo, ordem: ordem.codigo, itens: produzir.length },
      },
      tx,
    )

    return { ordemId: ordem.id, ordemCodigo: ordem.codigo, itens: produzir.length }
  })

  revalidatePath('/encomendas')
  revalidatePath('/producao/ordens')
  return resultado
})
