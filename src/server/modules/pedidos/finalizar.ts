import 'server-only'

import type { Tx } from '@/server/db'
import { registrarLog } from '@/server/audit'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num } from '@/lib/money'
import { moeda } from '@/lib/format'
import { consumirFicha, movimentar } from '@/server/modules/estoque/service'
import { recalcularPedido } from './service'

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  O NÚCLEO DA VENDA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Dois caminhos chegam aqui e precisam produzir exatamente o mesmo resultado:
 *
 *  • **Venda de balcão** (`venderDireto`): o carrinho é montado na tela e o
 *    pedido nasce já pago, em uma transação. É o caminho rápido — o operador
 *    não espera o servidor a cada toque no produto.
 *
 *  • **Pedido aberto** (`finalizarPedido`): mesa, delivery e encomenda gravam
 *    os itens conforme entram, porque a cozinha precisa vê-los antes do
 *    pagamento.
 *
 * Duplicar essa lógica nos dois caminhos seria a receita para o balcão e a mesa
 * divergirem em estoque ou fidelidade. Por isso ela vive aqui, uma vez.
 */

export type PagamentoEntrada = {
  formaPagamentoId: string
  valor: number
  valorRecebido?: number
  nsu?: string
}

export type ResultadoVenda = {
  pedidoId: string
  codigo: string
  total: number
  troco: number
  pontosGerados: number
}

export async function finalizarNaTransacao(
  tx: Tx,
  params: {
    lojaId: string
    usuarioId: string
    pedidoId: string
    caixaId: string
    caixaCodigo: string
    pagamentos: PagamentoEntrada[]
    pontosResgatar: number
  },
): Promise<ResultadoVenda> {
  const pedido = await tx.pedido.findUniqueOrThrow({ where: { id: params.pedidoId } })

  const itens = await tx.pedidoItem.findMany({
    where: { pedidoId: pedido.id, status: { not: 'CANCELADO' } },
    include: {
      adicionais: { include: { adicional: { select: { ingredienteId: true, quantidadeIngrediente: true } } } },
      produto: {
        select: {
          id: true,
          nome: true,
          tipo: true,
          controlaEstoque: true,
          comboItens: {
            include: { produto: { select: { id: true, nome: true, tipo: true, controlaEstoque: true } } },
          },
        },
      },
      variacao: { select: { fatorFicha: true } },
    },
  })
  if (itens.length === 0) throw new ErroDeNegocio('Não é possível finalizar um pedido sem itens.')

  const config = await tx.configuracao.findUnique({
    where: { lojaId: params.lojaId },
    select: { pontosPorReal: true, valorPorPonto: true, baixaEstoqueNaVenda: true },
  })

  // ── Resgate de pontos vira desconto ─────────────────────────────────────
  let descontoPontos = 0
  if (params.pontosResgatar > 0) {
    if (!pedido.clienteId) throw new ErroDeNegocio('Só é possível resgatar pontos com cliente identificado.')
    const cliente = await tx.cliente.findUniqueOrThrow({
      where: { id: pedido.clienteId },
      select: { pontos: true, nome: true },
    })
    if (cliente.pontos < params.pontosResgatar) {
      throw new ErroDeNegocio(`${cliente.nome} tem ${cliente.pontos} pontos — menos do que o resgate pedido.`)
    }
    descontoPontos = brl(params.pontosResgatar * num(config?.valorPorPonto ?? 0.05))
    await tx.pedido.update({
      where: { id: pedido.id },
      data: {
        descontoValor: brl(num(pedido.descontoValor) + descontoPontos),
        descontoMotivo: `Resgate de ${params.pontosResgatar} pontos`,
        pontosResgatados: params.pontosResgatar,
      },
    })
  }

  const totais = await recalcularPedido(tx, pedido.id)
  const total = totais.total

  // ── Conferência do pagamento ────────────────────────────────────────────
  const formas = await tx.formaPagamento.findMany({
    where: { id: { in: params.pagamentos.map((p) => p.formaPagamentoId) }, lojaId: params.lojaId, ativo: true },
  })
  if (formas.length !== new Set(params.pagamentos.map((p) => p.formaPagamentoId)).size) {
    throw new ErroDeNegocio('Forma de pagamento inválida ou desativada.')
  }

  const soma = brl(params.pagamentos.reduce((acc, p) => acc + p.valor, 0))
  if (soma < total - 0.005) {
    throw new ErroDeNegocio(`Faltam ${moeda(brl(total - soma))} para fechar o pedido de ${moeda(total)}.`, 'VALIDACAO')
  }
  if (soma > total + 0.005) {
    throw new ErroDeNegocio(
      `Os pagamentos somam ${moeda(soma)}, acima do total de ${moeda(total)}. O troco vai no campo "recebido", não no valor.`,
      'VALIDACAO',
    )
  }

  // ── Pagamentos e caixa ──────────────────────────────────────────────────
  let trocoTotal = 0
  for (const p of params.pagamentos) {
    const forma = formas.find((f) => f.id === p.formaPagamentoId)!
    let troco = 0
    if (forma.permiteTroco && p.valorRecebido !== undefined) {
      if (p.valorRecebido < p.valor) {
        throw new ErroDeNegocio(`O valor recebido em ${forma.nome} é menor que o valor do pagamento.`, 'VALIDACAO')
      }
      troco = brl(p.valorRecebido - p.valor)
      trocoTotal += troco
    }

    await tx.pagamento.create({
      data: {
        pedidoId: pedido.id,
        formaPagamentoId: forma.id,
        caixaId: params.caixaId,
        valor: p.valor,
        valorRecebido: p.valorRecebido ?? null,
        troco,
        taxaValor: brl((p.valor * num(forma.taxaPercentual)) / 100 + num(forma.taxaFixa)),
        status: 'APROVADO',
        nsu: p.nsu || null,
        usuarioId: params.usuarioId,
      },
    })

    await tx.movimentoCaixa.create({
      data: {
        caixaId: params.caixaId,
        tipo: 'VENDA',
        formaPagamentoId: forma.id,
        valor: p.valor,
        descricao: `Pedido ${pedido.codigo}`,
        pedidoId: pedido.id,
        usuarioId: params.usuarioId,
      },
    })

    if (forma.tipo === 'FIADO') {
      await tx.contaReceber.create({
        data: {
          lojaId: params.lojaId,
          clienteId: pedido.clienteId,
          pedidoId: pedido.id,
          descricao: `Fiado — pedido ${pedido.codigo}`,
          valor: p.valor,
          vencimento: new Date(Date.now() + 30 * 86_400_000),
          status: 'PENDENTE',
        },
      })
    }
  }

  // ── Baixa de estoque ────────────────────────────────────────────────────
  if (config?.baixaEstoqueNaVenda !== false) {
    for (const item of itens) {
      await baixarEstoqueDoItem(tx, {
        lojaId: params.lojaId,
        usuarioId: params.usuarioId,
        pedidoId: pedido.id,
        produto: item.produto,
        quantidade: num(item.quantidade),
        fatorFicha: item.variacao ? num(item.variacao.fatorFicha) : 1,
      })

      for (const ad of item.adicionais) {
        if (ad.adicional.ingredienteId && num(ad.adicional.quantidadeIngrediente) > 0) {
          await movimentar(tx, {
            lojaId: params.lojaId,
            ingredienteId: ad.adicional.ingredienteId,
            tipo: 'SAIDA_VENDA',
            quantidade: num(ad.adicional.quantidadeIngrediente) * num(ad.quantidade) * num(item.quantidade),
            origemTipo: 'pedido',
            origemId: pedido.id,
            usuarioId: params.usuarioId,
            observacao: `Adicional ${ad.nome}`,
          })
        }
      }
    }
  }

  // ── Cliente, fidelidade e cupom ─────────────────────────────────────────
  let pontosGerados = 0
  if (pedido.clienteId) {
    pontosGerados = Math.floor(total * num(config?.pontosPorReal ?? 1))
    const cliente = await tx.cliente.update({
      where: { id: pedido.clienteId },
      data: {
        totalGasto: { increment: total },
        totalPedidos: { increment: 1 },
        ultimaCompraEm: new Date(),
        pontos: { increment: pontosGerados - params.pontosResgatar },
      },
      select: { pontos: true },
    })

    if (params.pontosResgatar > 0) {
      await tx.transacaoFidelidade.create({
        data: {
          clienteId: pedido.clienteId,
          tipo: 'RESGATE',
          pontos: -params.pontosResgatar,
          saldoApos: cliente.pontos,
          pedidoId: pedido.id,
          descricao: `Resgate no pedido ${pedido.codigo} (${moeda(descontoPontos)})`,
          usuarioId: params.usuarioId,
        },
      })
    }
    if (pontosGerados > 0) {
      await tx.transacaoFidelidade.create({
        data: {
          clienteId: pedido.clienteId,
          tipo: 'ACUMULO',
          pontos: pontosGerados,
          saldoApos: cliente.pontos,
          pedidoId: pedido.id,
          descricao: `Compra ${pedido.codigo}`,
          usuarioId: params.usuarioId,
        },
      })
    }
  }

  if (pedido.cupomId) {
    await tx.cupom.update({ where: { id: pedido.cupomId }, data: { usosFeitos: { increment: 1 } } })
  }
  if (pedido.mesaId) {
    await tx.mesa.update({ where: { id: pedido.mesaId }, data: { status: 'LIVRE' } })
  }

  const finalizado = await tx.pedido.update({
    where: { id: pedido.id },
    data: {
      status: 'FINALIZADO',
      caixaId: params.caixaId,
      finalizadoEm: new Date(),
      emEspera: false,
      pontosGerados,
      itens: { updateMany: { where: { status: { not: 'CANCELADO' } }, data: { status: 'ENTREGUE' } } },
    },
    select: { id: true, codigo: true },
  })

  await registrarLog(
    {
      lojaId: params.lojaId,
      usuarioId: params.usuarioId,
      acao: 'pedido.finalizado',
      entidade: 'pedido',
      entidadeId: pedido.id,
      novo: {
        codigo: finalizado.codigo,
        total: moeda(total),
        formas: params.pagamentos.length,
        caixa: params.caixaCodigo,
      },
    },
    tx,
  )

  return {
    pedidoId: finalizado.id,
    codigo: finalizado.codigo,
    total,
    troco: brl(trocoTotal),
    pontosGerados,
  }
}

/**
 * Baixa de estoque por tipo de produto:
 *  • SIMPLES / PRODUZIDO com controle → tira do estoque de acabados.
 *  • PREPARADO ou sem controle        → consome a ficha técnica agora.
 *  • COMBO                            → explode e aplica a regra de cada item.
 */
export async function baixarEstoqueDoItem(
  tx: Tx,
  params: {
    lojaId: string
    usuarioId: string
    pedidoId: string
    quantidade: number
    fatorFicha: number
    produto: {
      id: string
      nome: string
      tipo: string
      controlaEstoque: boolean
      comboItens?: Array<{
        quantidade: unknown
        produto: { id: string; nome: string; tipo: string; controlaEstoque: boolean }
      }>
    }
  },
) {
  const { produto, quantidade } = params

  if (produto.tipo === 'COMBO') {
    for (const componente of produto.comboItens ?? []) {
      await baixarEstoqueDoItem(tx, {
        ...params,
        quantidade: quantidade * num(componente.quantidade as never),
        produto: { ...componente.produto, comboItens: [] },
      })
    }
    return
  }

  if (produto.tipo === 'PREPARADO' || !produto.controlaEstoque) {
    await consumirFicha(tx, {
      lojaId: params.lojaId,
      produtoId: produto.id,
      quantidade,
      tipo: 'SAIDA_VENDA',
      origemTipo: 'pedido',
      origemId: params.pedidoId,
      usuarioId: params.usuarioId,
      fator: params.fatorFicha,
    })
    return
  }

  await movimentar(tx, {
    lojaId: params.lojaId,
    produtoId: produto.id,
    tipo: 'SAIDA_VENDA',
    quantidade,
    origemTipo: 'pedido',
    origemId: params.pedidoId,
    usuarioId: params.usuarioId,
  })
}
