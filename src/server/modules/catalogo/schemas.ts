import { z } from 'zod'

/** Validação compartilhada pelo formulário e pelo servidor. */
export const uuid = z.string().uuid('Selecione uma opção válida.')

export const dinheiro = z
  .number({ invalid_type_error: 'Informe um valor.' })
  .min(0, 'O valor não pode ser negativo.')
  .max(999_999.99, 'Valor acima do limite.')

export const quantidadeSchema = z
  .number({ invalid_type_error: 'Informe uma quantidade.' })
  .min(0, 'A quantidade não pode ser negativa.')

export const unidadeMedida = z.enum(['G', 'KG', 'ML', 'L', 'UN', 'PCT', 'CX'])

// ── Categorias ─────────────────────────────────────────────────────────────

export const categoriaSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Dê um nome à categoria.').max(60),
  descricao: z.string().trim().max(240).optional().or(z.literal('')),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
    .default('#D24237'),
  ordem: z.number().int().min(0).max(999).default(0),
  ativo: z.boolean().default(true),
})

// ── Produtos ───────────────────────────────────────────────────────────────

export const variacaoSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(1, 'Dê um nome à variação.').max(40),
  precoDelta: z.number().min(-9999).max(9999).default(0),
  custoDelta: z.number().min(-9999).max(9999).default(0),
  fatorFicha: z.number().min(0.01, 'O fator precisa ser maior que zero.').max(20).default(1),
  ativo: z.boolean().default(true),
})

export const produtoSchema = z
  .object({
    id: uuid.optional(),
    nome: z.string().trim().min(2, 'Dê um nome ao produto.').max(90),
    sku: z
      .string()
      .trim()
      .min(2, 'Informe um código (SKU).')
      .max(24)
      .regex(/^[A-Za-z0-9-]+$/, 'Use apenas letras, números e hífen.'),
    categoriaId: uuid,
    descricao: z.string().trim().max(400).optional().or(z.literal('')),
    imagemUrl: z.string().trim().max(500).optional().or(z.literal('')),
    tipo: z.enum(['SIMPLES', 'PRODUZIDO', 'PREPARADO', 'COMBO']),
    unidade: z.string().trim().max(6).default('UN'),
    precoCusto: dinheiro.default(0),
    precoVenda: dinheiro,
    controlaEstoque: z.boolean().default(true),
    estoqueMinimo: quantidadeSchema.default(0),
    tempoPreparoMin: z.number().int().min(0).max(600).optional().nullable(),
    ativo: z.boolean().default(true),
    disponivel: z.boolean().default(true),
    destaque: z.boolean().default(false),
    ordem: z.number().int().min(0).max(999).default(0),
    variacoes: z.array(variacaoSchema).max(12).default([]),
    adicionaisIds: z.array(uuid).max(40).default([]),
    /** Itens do combo — obrigatório quando tipo = COMBO. */
    comboItens: z.array(z.object({ produtoId: uuid, quantidade: z.number().min(0.001).max(99) })).max(20).default([]),
  })
  .refine((d) => d.tipo !== 'COMBO' || d.comboItens.length >= 2, {
    message: 'Um combo precisa de pelo menos 2 produtos.',
    path: ['comboItens'],
  })
  .refine((d) => d.precoVenda > 0, { message: 'Informe o preço de venda.', path: ['precoVenda'] })

export const alterarPrecoSchema = z.object({
  id: uuid,
  precoVenda: dinheiro.refine((v) => v > 0, 'Informe o preço de venda.'),
  motivo: z.string().trim().max(160).optional().or(z.literal('')),
})

export const disponibilidadeSchema = z.object({
  id: uuid,
  disponivel: z.boolean(),
})

// ── Adicionais ─────────────────────────────────────────────────────────────

export const adicionalSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Dê um nome ao adicional.').max(60),
  preco: dinheiro,
  custo: dinheiro.default(0),
  ingredienteId: uuid.nullable().optional(),
  quantidadeIngrediente: quantidadeSchema.default(0),
  ordem: z.number().int().min(0).max(999).default(0),
  ativo: z.boolean().default(true),
})

export type CategoriaInput = z.infer<typeof categoriaSchema>
export type ProdutoInput = z.infer<typeof produtoSchema>
export type AdicionalInput = z.infer<typeof adicionalSchema>
