import { z } from 'zod'

import { documentoOpcional, textoOpcional, uuid } from '../_comum/schemas'

export const fornecedorSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Informe o nome.').max(90),
  razaoSocial: textoOpcional(120),
  cnpjCpf: documentoOpcional,
  telefone: textoOpcional(20),
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  contato: textoOpcional(60),
  cidade: textoOpcional(60),
  uf: textoOpcional(2),
  prazoEntregaDias: z.number().int().min(0).max(365).nullable().optional(),
  observacao: textoOpcional(400),
  ativo: z.boolean().default(true),
})

export const arquivarFornecedorSchema = z.object({ id: uuid, ativo: z.boolean() })

export const pedidoCompraSchema = z.object({
  id: uuid.optional(),
  fornecedorId: uuid,
  dataPrevista: textoOpcional(10),
  observacao: textoOpcional(400),
  itens: z
    .array(
      z.object({
        ingredienteId: uuid,
        quantidade: z.number().min(0.001, 'Informe a quantidade.').max(999_999),
        precoUnitario: z.number().min(0, 'Informe o preço.').max(999_999),
      }),
    )
    .min(1, 'Adicione ao menos um insumo ao pedido.')
    .max(80),
})

export const idSchema = z.object({ id: uuid })

export const cancelarCompraSchema = z.object({
  id: uuid,
  motivo: z.string().trim().min(3, 'Informe o motivo.').max(200),
})

export const recebimentoSchema = z.object({
  pedidoCompraId: uuid,
  notaFiscal: textoOpcional(40),
  observacao: textoOpcional(300),
  gerarContaPagar: z.boolean().default(true),
  diasVencimento: z.number().int().min(0).max(180).default(28),
  itens: z
    .array(
      z.object({
        pedidoCompraItemId: uuid,
        quantidade: z.number().min(0).max(999_999),
        precoUnitario: z.number().min(0).max(999_999),
        lote: textoOpcional(40),
        validade: textoOpcional(10),
      }),
    )
    .min(1, 'Informe o que foi recebido.'),
})

export const sugestaoCompraSchema = z.object({
  fornecedorId: uuid,
  itens: z
    .array(z.object({ ingredienteId: uuid, quantidade: z.number().min(0.001), precoUnitario: z.number().min(0) }))
    .min(1),
})
