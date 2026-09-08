'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num, type DecimalLike } from '@/lib/money'
import { moeda } from '@/lib/format'

const uuid = z.string().uuid()

const contaPagarSchema = z.object({
  id: uuid.optional(),
  descricao: z.string().trim().min(3, 'Descreva a conta.').max(160),
  valor: z.number().min(0.01, 'Informe o valor.').max(9_999_999),
  vencimento: z.string().min(10, 'Informe o vencimento.'),
  fornecedorId: uuid.nullable().optional(),
  categoriaId: uuid.nullable().optional(),
  recorrencia: z.enum(['MENSAL', 'SEMANAL', 'ANUAL']).nullable().optional(),
  observacao: z.string().trim().max(400).optional().or(z.literal('')),
})

export const salvarContaPagar = acao(contaPagarSchema, async (entrada) => {
  const sessao = await exigirPermissao('financeiro.gerenciar')

  const dados = {
    descricao: entrada.descricao,
    valor: entrada.valor,
    vencimento: new Date(`${entrada.vencimento}T12:00:00`),
    fornecedorId: entrada.fornecedorId ?? null,
    categoriaId: entrada.categoriaId ?? null,
    recorrencia: entrada.recorrencia ?? null,
    observacao: entrada.observacao || null,
  }

  let salva: { id: string; descricao: string; valor: DecimalLike }
  if (entrada.id) {
    const atual = await db.contaPagar.findFirst({ where: { id: entrada.id, lojaId: sessao.lojaId } })
    if (!atual) throw new ErroDeNegocio('Conta não encontrada.', 'NAO_ENCONTRADO')
    if (atual.status === 'LIQUIDADO') throw new ErroDeNegocio('Esta conta já foi paga e não pode ser alterada.')
    if (num(atual.valorPago) > entrada.valor) {
      throw new ErroDeNegocio(`Já foram pagos ${moeda(atual.valorPago)} — o valor não pode ser menor.`)
    }
    salva = await db.contaPagar.update({ where: { id: entrada.id }, data: dados })
  } else {
    salva = await db.contaPagar.create({ data: { ...dados, lojaId: sessao.lojaId } })
  }
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'conta_pagar.editada' : 'conta_pagar.criada',
    entidade: 'conta_pagar',
    entidadeId: salva.id,
    novo: { descricao: salva.descricao, valor: moeda(salva.valor), vencimento: dados.vencimento.toISOString() },
  })

  revalidatePath('/financeiro/pagar')
  revalidatePath('/financeiro')
  return { id: salva.id, descricao: salva.descricao }
})

/**
 * Liquida (ou liquida parcialmente) uma conta a pagar.
 * Se for recorrente, já cria a parcela do próximo período — o aluguel do mês
 * que vem não deveria depender de alguém lembrar de cadastrar.
 */
export const pagarConta = acao(
  z.object({
    id: uuid,
    valor: z.number().min(0.01, 'Informe o valor pago.').max(9_999_999),
    formaPagamentoId: uuid.nullable().optional(),
    data: z.string().optional().or(z.literal('')),
  }),
  async ({ id, valor, formaPagamentoId, data }) => {
    const sessao = await exigirPermissao('financeiro.gerenciar')

    const resultado = await db.$transaction(async (tx) => {
      const conta = await tx.contaPagar.findFirst({ where: { id, lojaId: sessao.lojaId } })
      if (!conta) throw new ErroDeNegocio('Conta não encontrada.', 'NAO_ENCONTRADO')
      if (conta.status === 'LIQUIDADO') throw new ErroDeNegocio('Esta conta já está paga.')
      if (conta.status === 'CANCELADO') throw new ErroDeNegocio('Esta conta está cancelada.')

      const saldo = brl(num(conta.valor) - num(conta.valorPago))
      if (valor > saldo + 0.005) {
        throw new ErroDeNegocio(`O saldo desta conta é ${moeda(saldo)}.`, 'VALIDACAO', { valor: `Máximo ${moeda(saldo)}.` })
      }

      const pago = brl(num(conta.valorPago) + valor)
      const liquidado = pago >= num(conta.valor) - 0.005
      const dataPagamento = data ? new Date(`${data}T12:00:00`) : new Date()

      await tx.contaPagar.update({
        where: { id },
        data: {
          valorPago: pago,
          status: liquidado ? 'LIQUIDADO' : 'PARCIAL',
          pagoEm: liquidado ? dataPagamento : null,
          formaPagamentoId: formaPagamentoId ?? conta.formaPagamentoId,
        },
      })

      if (liquidado && conta.recorrencia) {
        const proximo = new Date(conta.vencimento)
        if (conta.recorrencia === 'MENSAL') proximo.setMonth(proximo.getMonth() + 1)
        if (conta.recorrencia === 'SEMANAL') proximo.setDate(proximo.getDate() + 7)
        if (conta.recorrencia === 'ANUAL') proximo.setFullYear(proximo.getFullYear() + 1)

        const jaExiste = await tx.contaPagar.findFirst({
          where: { lojaId: sessao.lojaId, descricao: conta.descricao, vencimento: proximo },
          select: { id: true },
        })
        if (!jaExiste) {
          await tx.contaPagar.create({
            data: {
              lojaId: sessao.lojaId,
              fornecedorId: conta.fornecedorId,
              categoriaId: conta.categoriaId,
              descricao: conta.descricao,
              valor: conta.valor,
              vencimento: proximo,
              recorrencia: conta.recorrencia,
              observacao: conta.observacao,
              status: 'PENDENTE',
            },
          })
        }
      }

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'conta_pagar.liquidada',
          entidade: 'conta_pagar',
          entidadeId: id,
          novo: { descricao: conta.descricao, valor: moeda(valor), total: moeda(pago), liquidado },
        },
        tx,
      )

      return { descricao: conta.descricao, pago, liquidado, saldo: brl(num(conta.valor) - pago) }
    })

    revalidatePath('/financeiro/pagar')
    revalidatePath('/financeiro')
    return resultado
  },
)

export const cancelarContaPagar = acao(
  z.object({ id: uuid, motivo: z.string().trim().min(3, 'Informe o motivo.').max(200) }),
  async ({ id, motivo }) => {
    const sessao = await exigirPermissao('financeiro.gerenciar')
    const conta = await db.contaPagar.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { status: true, descricao: true } })
    if (!conta) throw new ErroDeNegocio('Conta não encontrada.', 'NAO_ENCONTRADO')
    if (conta.status === 'LIQUIDADO') throw new ErroDeNegocio('Uma conta já paga não pode ser cancelada.')

    await db.contaPagar.update({ where: { id }, data: { status: 'CANCELADO', observacao: motivo } })
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'conta_pagar.cancelada',
      entidade: 'conta_pagar',
      entidadeId: id,
      novo: { descricao: conta.descricao, motivo },
    })
    revalidatePath('/financeiro/pagar')
    return true
  },
)

const contaReceberSchema = z.object({
  id: uuid.optional(),
  descricao: z.string().trim().min(3, 'Descreva o lançamento.').max(160),
  valor: z.number().min(0.01, 'Informe o valor.').max(9_999_999),
  vencimento: z.string().min(10, 'Informe o vencimento.'),
  clienteId: uuid.nullable().optional(),
  categoriaId: uuid.nullable().optional(),
  observacao: z.string().trim().max(400).optional().or(z.literal('')),
})

export const salvarContaReceber = acao(contaReceberSchema, async (entrada) => {
  const sessao = await exigirPermissao('financeiro.gerenciar')
  const dados = {
    descricao: entrada.descricao,
    valor: entrada.valor,
    vencimento: new Date(`${entrada.vencimento}T12:00:00`),
    clienteId: entrada.clienteId ?? null,
    categoriaId: entrada.categoriaId ?? null,
    observacao: entrada.observacao || null,
  }

  const conta = entrada.id
    ? await db.contaReceber.update({ where: { id: entrada.id }, data: dados })
    : await db.contaReceber.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'conta_receber.editada' : 'conta_receber.criada',
    entidade: 'conta_receber',
    entidadeId: conta.id,
    novo: { descricao: conta.descricao, valor: moeda(conta.valor) },
  })
  revalidatePath('/financeiro/receber')
  revalidatePath('/financeiro')
  return { id: conta.id, descricao: conta.descricao }
})

export const receberConta = acao(
  z.object({
    id: uuid,
    valor: z.number().min(0.01, 'Informe o valor recebido.').max(9_999_999),
    data: z.string().optional().or(z.literal('')),
  }),
  async ({ id, valor, data }) => {
    const sessao = await exigirPermissao('financeiro.gerenciar')

    const resultado = await db.$transaction(async (tx) => {
      const conta = await tx.contaReceber.findFirst({ where: { id, lojaId: sessao.lojaId } })
      if (!conta) throw new ErroDeNegocio('Conta não encontrada.', 'NAO_ENCONTRADO')
      if (conta.status === 'LIQUIDADO') throw new ErroDeNegocio('Esta conta já foi recebida.')
      if (conta.status === 'CANCELADO') throw new ErroDeNegocio('Esta conta está cancelada.')

      const saldo = brl(num(conta.valor) - num(conta.valorRecebido))
      if (valor > saldo + 0.005) {
        throw new ErroDeNegocio(`O saldo desta conta é ${moeda(saldo)}.`, 'VALIDACAO', { valor: `Máximo ${moeda(saldo)}.` })
      }

      const recebido = brl(num(conta.valorRecebido) + valor)
      const liquidado = recebido >= num(conta.valor) - 0.005

      await tx.contaReceber.update({
        where: { id },
        data: {
          valorRecebido: recebido,
          status: liquidado ? 'LIQUIDADO' : 'PARCIAL',
          recebidoEm: liquidado ? (data ? new Date(`${data}T12:00:00`) : new Date()) : null,
        },
      })

      // Encomenda vinculada acompanha o recebimento.
      if (conta.encomendaId) {
        await tx.encomenda.update({ where: { id: conta.encomendaId }, data: { valorPago: { increment: valor } } })
      }

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'conta_receber.liquidada',
          entidade: 'conta_receber',
          entidadeId: id,
          novo: { descricao: conta.descricao, valor: moeda(valor), liquidado },
        },
        tx,
      )

      return { descricao: conta.descricao, recebido, liquidado }
    })

    revalidatePath('/financeiro/receber')
    revalidatePath('/financeiro')
    revalidatePath('/encomendas')
    return resultado
  },
)

export const salvarCategoriaFinanceira = acao(
  z.object({
    id: uuid.optional(),
    nome: z.string().trim().min(2, 'Informe o nome.').max(60),
    tipo: z.enum(['RECEITA', 'DESPESA']),
    cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.').default('#6B4A2F'),
    ativo: z.boolean().default(true),
  }),
  async (entrada) => {
    const sessao = await exigirPermissao('financeiro.gerenciar')
    const dados = { nome: entrada.nome, tipo: entrada.tipo, cor: entrada.cor, ativo: entrada.ativo }
    const categoria = entrada.id
      ? await db.categoriaFinanceira.update({ where: { id: entrada.id }, data: dados })
      : await db.categoriaFinanceira.create({ data: { ...dados, lojaId: sessao.lojaId } })
    revalidatePath('/financeiro')
    return { id: categoria.id, nome: categoria.nome }
  },
)
