'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog, snapshot } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { slugify } from '@/lib/utils'
import { moeda } from '@/lib/format'
import {
  adicionalSchema,
  alterarPrecoSchema,
  categoriaSchema,
  disponibilidadeSchema,
  produtoSchema,
  uuid,
} from './schemas'

// ═══════════════════════════════════════════════════════════════════════════
//  CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════

export const salvarCategoria = acao(categoriaSchema, async (entrada) => {
  const sessao = await exigirPermissao('categorias.gerenciar')
  const slug = slugify(entrada.nome)

  const dados = {
    nome: entrada.nome,
    slug,
    descricao: entrada.descricao || null,
    cor: entrada.cor,
    ordem: entrada.ordem,
    ativo: entrada.ativo,
  }

  const categoria = entrada.id
    ? await db.categoria.update({ where: { id: entrada.id }, data: dados })
    : await db.categoria.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'categoria.editada' : 'categoria.criada',
    entidade: 'categoria',
    entidadeId: categoria.id,
    novo: dados,
  })

  revalidatePath('/produtos/categorias')
  revalidatePath('/produtos')
  return { id: categoria.id, nome: categoria.nome }
})

export const excluirCategoria = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('categorias.gerenciar')
  const categoria = await db.categoria.findFirst({
    where: { id, lojaId: sessao.lojaId },
    include: { _count: { select: { produtos: true } } },
  })
  if (!categoria) throw new ErroDeNegocio('Categoria não encontrada.', 'NAO_ENCONTRADO')

  // Categoria com produtos não é excluída: perderíamos o histórico de vendas.
  if (categoria._count.produtos > 0) {
    throw new ErroDeNegocio(
      `Esta categoria tem ${categoria._count.produtos} produto(s). Mova-os para outra categoria ou desative esta.`,
      'CONFLITO',
    )
  }

  await db.categoria.delete({ where: { id } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'categoria.excluida',
    entidade: 'categoria',
    entidadeId: id,
    anterior: { nome: categoria.nome },
  })
  revalidatePath('/produtos/categorias')
  return true
})

// ═══════════════════════════════════════════════════════════════════════════
//  PRODUTOS
// ═══════════════════════════════════════════════════════════════════════════

export const salvarProduto = acao(produtoSchema, async (entrada) => {
  const sessao = await exigirPermissao('produtos.gerenciar')

  const categoria = await db.categoria.findFirst({
    where: { id: entrada.categoriaId, lojaId: sessao.lojaId },
    select: { id: true },
  })
  if (!categoria) throw new ErroDeNegocio('Categoria inválida.', 'VALIDACAO', { categoriaId: 'Escolha uma categoria da loja.' })

  const anterior = entrada.id
    ? await db.produto.findFirst({ where: { id: entrada.id, lojaId: sessao.lojaId } })
    : null
  if (entrada.id && !anterior) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')

  // Alterar preço exige permissão própria — é a mudança mais sensível do catálogo.
  if (anterior && Number(anterior.precoVenda) !== entrada.precoVenda) {
    await exigirPermissao('produtos.preco')
  }

  const dadosBase = {
    nome: entrada.nome,
    sku: entrada.sku.toUpperCase(),
    categoriaId: entrada.categoriaId,
    descricao: entrada.descricao || null,
    imagemUrl: entrada.imagemUrl || null,
    tipo: entrada.tipo,
    unidade: entrada.unidade || 'UN',
    precoVenda: entrada.precoVenda,
    controlaEstoque: entrada.controlaEstoque,
    estoqueMinimo: entrada.estoqueMinimo,
    tempoPreparoMin: entrada.tempoPreparoMin ?? null,
    ativo: entrada.ativo,
    disponivel: entrada.disponivel,
    destaque: entrada.destaque,
    ordem: entrada.ordem,
  }

  const produto = await db.$transaction(async (tx) => {
    const salvo = entrada.id
      ? await tx.produto.update({
          where: { id: entrada.id },
          // Produto com ficha técnica tem o custo calculado pela ficha; sem
          // ficha, o custo é informado à mão.
          data: { ...dadosBase, ...(entrada.tipo === 'SIMPLES' ? { precoCusto: entrada.precoCusto } : {}) },
        })
      : await tx.produto.create({
          data: { ...dadosBase, precoCusto: entrada.precoCusto, lojaId: sessao.lojaId },
        })

    // Variações: mantém as enviadas, remove as que saíram do formulário.
    const idsEnviados = entrada.variacoes.filter((v) => v.id).map((v) => v.id!)
    await tx.produtoVariacao.deleteMany({
      where: { produtoId: salvo.id, ...(idsEnviados.length ? { id: { notIn: idsEnviados } } : {}) },
    })
    for (const [indice, v] of entrada.variacoes.entries()) {
      const dados = {
        nome: v.nome,
        precoDelta: v.precoDelta,
        custoDelta: v.custoDelta,
        fatorFicha: v.fatorFicha,
        ativo: v.ativo,
        ordem: indice,
      }
      if (v.id) await tx.produtoVariacao.update({ where: { id: v.id }, data: dados })
      else await tx.produtoVariacao.create({ data: { ...dados, produtoId: salvo.id } })
    }

    // Adicionais permitidos
    await tx.produtoAdicional.deleteMany({ where: { produtoId: salvo.id } })
    if (entrada.adicionaisIds.length) {
      await tx.produtoAdicional.createMany({
        data: entrada.adicionaisIds.map((adicionalId) => ({ produtoId: salvo.id, adicionalId })),
        skipDuplicates: true,
      })
    }

    // Combo: itens e custo somado dos componentes
    await tx.comboItem.deleteMany({ where: { comboId: salvo.id } })
    if (entrada.tipo === 'COMBO' && entrada.comboItens.length) {
      await tx.comboItem.createMany({
        data: entrada.comboItens.map((i) => ({ comboId: salvo.id, produtoId: i.produtoId, quantidade: i.quantidade })),
      })
      const componentes = await tx.produto.findMany({
        where: { id: { in: entrada.comboItens.map((i) => i.produtoId) } },
        select: { id: true, precoCusto: true },
      })
      const custo = entrada.comboItens.reduce((acc, item) => {
        const c = componentes.find((p) => p.id === item.produtoId)
        return acc + Number(c?.precoCusto ?? 0) * item.quantidade
      }, 0)
      await tx.produto.update({ where: { id: salvo.id }, data: { precoCusto: Math.round(custo * 100) / 100 } })
    }

    return salvo
  })

  const campos = ['nome', 'sku', 'precoVenda', 'precoCusto', 'ativo', 'disponivel', 'tipo'] as const
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'produto.editado' : 'produto.criado',
    entidade: 'produto',
    entidadeId: produto.id,
    anterior: anterior ? snapshot(anterior, [...campos]) : undefined,
    novo: snapshot(produto, [...campos]),
  })

  revalidatePath('/produtos')
  revalidatePath('/pdv')
  return { id: produto.id, nome: produto.nome }
})

/** Alteração rápida de preço direto da lista — a ação mais auditada do catálogo. */
export const alterarPreco = acao(alterarPrecoSchema, async ({ id, precoVenda, motivo }) => {
  const sessao = await exigirPermissao('produtos.preco')
  const anterior = await db.produto.findFirst({
    where: { id, lojaId: sessao.lojaId },
    select: { id: true, nome: true, precoVenda: true },
  })
  if (!anterior) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')

  await db.produto.update({ where: { id }, data: { precoVenda } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'produto.preco_alterado',
    entidade: 'produto',
    entidadeId: id,
    anterior: { precoVenda: moeda(anterior.precoVenda) },
    novo: { precoVenda: moeda(precoVenda), motivo: motivo || null },
  })

  revalidatePath('/produtos')
  revalidatePath('/pdv')
  return { nome: anterior.nome, precoVenda }
})

/** "SOLD OUT" — a operação mais usada do dia a dia da loja. */
export const alternarDisponibilidade = acao(disponibilidadeSchema, async ({ id, disponivel }) => {
  const sessao = await exigirPermissao('produtos.disponibilidade')
  const produto = await db.produto.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { nome: true } })
  if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')

  await db.produto.update({ where: { id }, data: { disponivel } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: disponivel ? 'produto.disponibilizado' : 'produto.esgotado',
    entidade: 'produto',
    entidadeId: id,
    novo: { disponivel },
  })

  revalidatePath('/produtos')
  revalidatePath('/pdv')
  return { nome: produto.nome, disponivel }
})

export const arquivarProduto = acao(z.object({ id: uuid, ativo: z.boolean() }), async ({ id, ativo }) => {
  const sessao = await exigirPermissao('produtos.gerenciar')
  const produto = await db.produto.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { nome: true } })
  if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')

  await db.produto.update({ where: { id }, data: { ativo, ...(ativo ? {} : { disponivel: false }) } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: ativo ? 'produto.reativado' : 'produto.arquivado',
    entidade: 'produto',
    entidadeId: id,
  })
  revalidatePath('/produtos')
  return { nome: produto.nome, ativo }
})

export const excluirProduto = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('produtos.excluir')
  const produto = await db.produto.findFirst({
    where: { id, lojaId: sessao.lojaId },
    include: { _count: { select: { itensPedido: true, itensProducao: true } } },
  })
  if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')

  // Produto já vendido nunca é excluído — o histórico de vendas depende dele.
  if (produto._count.itensPedido > 0 || produto._count.itensProducao > 0) {
    throw new ErroDeNegocio(
      'Este produto já tem vendas ou produção registradas. Arquive em vez de excluir, para não perder o histórico.',
      'CONFLITO',
    )
  }

  await db.produto.delete({ where: { id } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'produto.excluido',
    entidade: 'produto',
    entidadeId: id,
    anterior: { nome: produto.nome, sku: produto.sku },
  })
  revalidatePath('/produtos')
  return true
})

// ═══════════════════════════════════════════════════════════════════════════
//  ADICIONAIS
// ═══════════════════════════════════════════════════════════════════════════

export const salvarAdicional = acao(adicionalSchema, async (entrada) => {
  const sessao = await exigirPermissao('categorias.gerenciar')

  if (entrada.ingredienteId) {
    const ing = await db.ingrediente.findFirst({
      where: { id: entrada.ingredienteId, lojaId: sessao.lojaId },
      select: { id: true },
    })
    if (!ing) throw new ErroDeNegocio('Insumo inválido.', 'VALIDACAO', { ingredienteId: 'Escolha um insumo da loja.' })
    if (entrada.quantidadeIngrediente <= 0) {
      throw new ErroDeNegocio('Informe quanto do insumo cada adicional consome.', 'VALIDACAO', {
        quantidadeIngrediente: 'Precisa ser maior que zero para baixar estoque.',
      })
    }
  }

  const dados = {
    nome: entrada.nome,
    preco: entrada.preco,
    custo: entrada.custo,
    ingredienteId: entrada.ingredienteId ?? null,
    quantidadeIngrediente: entrada.ingredienteId ? entrada.quantidadeIngrediente : 0,
    ordem: entrada.ordem,
    ativo: entrada.ativo,
  }

  const adicional = entrada.id
    ? await db.adicional.update({ where: { id: entrada.id }, data: dados })
    : await db.adicional.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'adicional.editado' : 'adicional.criado',
    entidade: 'adicional',
    entidadeId: adicional.id,
    novo: dados,
  })

  revalidatePath('/produtos/adicionais')
  revalidatePath('/pdv')
  return { id: adicional.id, nome: adicional.nome }
})

export const excluirAdicional = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('categorias.gerenciar')
  const adicional = await db.adicional.findFirst({
    where: { id, lojaId: sessao.lojaId },
    include: { _count: { select: { itensPedido: true } } },
  })
  if (!adicional) throw new ErroDeNegocio('Adicional não encontrado.', 'NAO_ENCONTRADO')

  if (adicional._count.itensPedido > 0) {
    throw new ErroDeNegocio('Este adicional já foi vendido. Desative em vez de excluir.', 'CONFLITO')
  }

  await db.adicional.delete({ where: { id } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'adicional.excluido',
    entidade: 'adicional',
    entidadeId: id,
    anterior: { nome: adicional.nome },
  })
  revalidatePath('/produtos/adicionais')
  return true
})

/** Carrega o produto para o formulário do drawer (client component). */
export const obterProdutoAction = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('produtos.ver')
  const { obterProduto } = await import('./service')
  const produto = await obterProduto(sessao.lojaId, id)
  if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')
  return {
    id: produto.id,
    nome: produto.nome,
    sku: produto.sku,
    categoriaId: produto.categoriaId,
    descricao: produto.descricao ?? '',
    imagemUrl: produto.imagemUrl ?? '',
    tipo: produto.tipo,
    unidade: produto.unidade,
    precoCusto: produto.precoCusto,
    precoVenda: produto.precoVenda,
    controlaEstoque: produto.controlaEstoque,
    estoqueMinimo: produto.estoqueMinimo,
    tempoPreparoMin: produto.tempoPreparoMin,
    ativo: produto.ativo,
    disponivel: produto.disponivel,
    destaque: produto.destaque,
    ordem: produto.ordem,
    variacoes: produto.variacoes.map((v) => ({
      id: v.id,
      nome: v.nome,
      precoDelta: v.precoDelta,
      custoDelta: v.custoDelta,
      fatorFicha: v.fatorFicha,
      ativo: v.ativo,
    })),
    adicionaisIds: produto.adicionaisIds,
    comboItens: produto.comboItens.map((c) => ({ produtoId: c.produtoId, quantidade: c.quantidade })),
  }
})
