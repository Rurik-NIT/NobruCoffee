'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { proximoCodigo } from '@/server/counters'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl } from '@/lib/money'
import { moeda } from '@/lib/format'
import { calcularResumo } from './service'

const uuid = z.string().uuid()

export const abrirCaixa = acao(
  z.object({
    saldoInicial: z.number().min(0, 'Informe o valor do fundo de troco.').max(99_999),
    observacao: z.string().trim().max(200).optional().or(z.literal('')),
  }),
  async ({ saldoInicial, observacao }) => {
    const sessao = await exigirPermissao('caixa.abrir')

    const caixa = await db.$transaction(async (tx) => {
      // Um caixa aberto por loja: dois caixas simultâneos tornariam impossível
      // saber a que turno pertence cada venda.
      const aberto = await tx.caixa.findFirst({
        where: { lojaId: sessao.lojaId, status: 'ABERTO' },
        select: { codigo: true, usuarioAbertura: { select: { nome: true } } },
      })
      if (aberto) {
        throw new ErroDeNegocio(
          `O caixa ${aberto.codigo} está aberto por ${aberto.usuarioAbertura.nome}. Feche antes de abrir outro.`,
          'CONFLITO',
        )
      }

      const codigo = await proximoCodigo(tx, sessao.lojaId, 'caixa')
      const criado = await tx.caixa.create({
        data: {
          lojaId: sessao.lojaId,
          codigo,
          saldoInicial,
          observacaoAbertura: observacao || null,
          usuarioAberturaId: sessao.id,
        },
        select: { id: true, codigo: true },
      })

      await tx.movimentoCaixa.create({
        data: {
          caixaId: criado.id,
          tipo: 'ABERTURA',
          valor: saldoInicial,
          descricao: 'Fundo de troco',
          usuarioId: sessao.id,
        },
      })

      return criado
    })

    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'caixa.aberto',
      entidade: 'caixa',
      entidadeId: caixa.id,
      novo: { codigo: caixa.codigo, saldoInicial: moeda(saldoInicial) },
    })

    revalidatePath('/caixas')
    revalidatePath('/pdv')
    return caixa
  },
)

const movimentoSchema = z.object({
  caixaId: uuid,
  tipo: z.enum(['SANGRIA', 'SUPRIMENTO', 'DESPESA']),
  valor: z.number().min(0.01, 'Informe o valor.').max(99_999),
  descricao: z.string().trim().min(3, 'Descreva o motivo.').max(200),
})

/**
 * Sangria, suprimento e despesa da gaveta.
 * Sangria e despesa saem (valor negativo), suprimento entra. A validação
 * impede tirar mais dinheiro do que existe em espécie.
 */
export const lancarMovimentoCaixa = acao(movimentoSchema, async (entrada) => {
  const sessao = await exigirPermissao('caixa.sangria')

  const resultado = await db.$transaction(async (tx) => {
    const caixa = await tx.caixa.findFirst({
      where: { id: entrada.caixaId, lojaId: sessao.lojaId },
      select: { id: true, codigo: true, status: true },
    })
    if (!caixa) throw new ErroDeNegocio('Caixa não encontrado.', 'NAO_ENCONTRADO')
    if (caixa.status !== 'ABERTO') throw new ErroDeNegocio('Este caixa já foi fechado.')

    const resumo = await calcularResumo(tx, caixa.id)
    const saida = entrada.tipo !== 'SUPRIMENTO'

    if (saida && entrada.valor > resumo.saldoEsperado) {
      throw new ErroDeNegocio(
        `Há ${moeda(resumo.saldoEsperado)} em espécie na gaveta — não é possível retirar ${moeda(entrada.valor)}.`,
        'VALIDACAO',
        { valor: 'Valor acima do disponível em dinheiro.' },
      )
    }

    await tx.movimentoCaixa.create({
      data: {
        caixaId: caixa.id,
        tipo: entrada.tipo,
        valor: saida ? -entrada.valor : entrada.valor,
        descricao: entrada.descricao,
        usuarioId: sessao.id,
      },
    })

    // Despesa paga pela gaveta também é despesa da loja: entra no financeiro.
    if (entrada.tipo === 'DESPESA') {
      await tx.contaPagar.create({
        data: {
          lojaId: sessao.lojaId,
          descricao: `${entrada.descricao} (caixa ${caixa.codigo})`,
          valor: entrada.valor,
          valorPago: entrada.valor,
          vencimento: new Date(),
          pagoEm: new Date(),
          status: 'LIQUIDADO',
        },
      })
    }

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: `caixa.${entrada.tipo.toLowerCase()}`,
        entidade: 'caixa',
        entidadeId: caixa.id,
        novo: { valor: moeda(entrada.valor), descricao: entrada.descricao },
      },
      tx,
    )

    return { codigo: caixa.codigo, tipo: entrada.tipo, valor: entrada.valor }
  })

  revalidatePath('/caixas')
  revalidatePath(`/caixas/${entrada.caixaId}`)
  revalidatePath('/financeiro')
  return resultado
})

/**
 * Fechamento.
 *
 * O operador conta a gaveta e informa o valor; o sistema calcula o esperado e
 * grava a diferença. Não bloqueamos por divergência — bloquear faz o operador
 * "ajustar" o número contado. Registramos, avisamos e deixamos a conferência
 * para quem tem permissão.
 */
export const fecharCaixa = acao(
  z.object({
    caixaId: uuid,
    saldoFinalInformado: z.number().min(0, 'Informe o valor contado.').max(999_999),
    observacao: z.string().trim().max(300).optional().or(z.literal('')),
  }),
  async ({ caixaId, saldoFinalInformado, observacao }) => {
    const sessao = await exigirPermissao('caixa.fechar')

    const resultado = await db.$transaction(async (tx) => {
      const caixa = await tx.caixa.findFirst({
        where: { id: caixaId, lojaId: sessao.lojaId },
        select: { id: true, codigo: true, status: true },
      })
      if (!caixa) throw new ErroDeNegocio('Caixa não encontrado.', 'NAO_ENCONTRADO')
      if (caixa.status !== 'ABERTO') throw new ErroDeNegocio('Este caixa já foi fechado.')

      const abertos = await tx.pedido.count({
        where: { caixaId: null, lojaId: sessao.lojaId, status: { in: ['ABERTO', 'EM_PREPARO', 'PRONTO'] }, emEspera: false },
      })
      if (abertos > 0) {
        throw new ErroDeNegocio(
          `Há ${abertos} pedido(s) em aberto. Finalize ou cancele antes de fechar o caixa.`,
          'REGRA_DE_NEGOCIO',
        )
      }

      const resumo = await calcularResumo(tx, caixa.id)
      const diferenca = brl(saldoFinalInformado - resumo.saldoEsperado)

      await tx.movimentoCaixa.create({
        data: {
          caixaId: caixa.id,
          tipo: 'FECHAMENTO',
          valor: 0,
          descricao: `Conferência: contado ${moeda(saldoFinalInformado)}, esperado ${moeda(resumo.saldoEsperado)}`,
          usuarioId: sessao.id,
        },
      })

      await tx.caixa.update({
        where: { id: caixa.id },
        data: {
          status: 'FECHADO',
          fechadoEm: new Date(),
          saldoFinalInformado,
          saldoFinalEsperado: resumo.saldoEsperado,
          diferenca,
          observacaoFechamento: observacao || null,
          usuarioFechamentoId: sessao.id,
        },
      })

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'caixa.fechado',
          entidade: 'caixa',
          entidadeId: caixa.id,
          novo: {
            codigo: caixa.codigo,
            contado: moeda(saldoFinalInformado),
            esperado: moeda(resumo.saldoEsperado),
            diferenca: moeda(diferenca),
            vendas: moeda(resumo.totalVendas),
          },
        },
        tx,
      )

      return { codigo: caixa.codigo, diferenca, esperado: resumo.saldoEsperado, vendas: resumo.totalVendas }
    })

    revalidatePath('/caixas')
    revalidatePath(`/caixas/${caixaId}`)
    revalidatePath('/dashboard')
    return resultado
  },
)

/** Conferência da divergência por um gerente — encerra o assunto com registro. */
export const conferirCaixa = acao(
  z.object({ caixaId: uuid, observacao: z.string().trim().min(3, 'Explique a conferência.').max(300) }),
  async ({ caixaId, observacao }) => {
    const sessao = await exigirPermissao('caixa.conferir')
    const caixa = await db.caixa.findFirst({
      where: { id: caixaId, lojaId: sessao.lojaId },
      select: { status: true, codigo: true, diferenca: true },
    })
    if (!caixa) throw new ErroDeNegocio('Caixa não encontrado.', 'NAO_ENCONTRADO')
    if (caixa.status !== 'FECHADO') throw new ErroDeNegocio('Só um caixa fechado pode ser conferido.')

    await db.caixa.update({
      where: { id: caixaId },
      data: {
        status: 'CONFERIDO',
        observacaoFechamento: observacao,
      },
    })
    await db.notificacao.updateMany({
      where: { chave: `caixa_div:${caixaId}` },
      data: { lida: true, lidaEm: new Date() },
    })
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'caixa.conferido',
      entidade: 'caixa',
      entidadeId: caixaId,
      novo: { codigo: caixa.codigo, diferenca: moeda(caixa.diferenca ?? 0), observacao },
    })

    revalidatePath('/caixas')
    revalidatePath(`/caixas/${caixaId}`)
    return { codigo: caixa.codigo }
  },
)
