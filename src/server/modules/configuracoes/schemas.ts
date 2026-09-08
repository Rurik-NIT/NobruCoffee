import { z } from 'zod'

import { cnpjOpcional, corHex, textoOpcional, uuid } from '../_comum/schemas'

export const configuracaoSchema = z.object({
  nomeNegocio: z.string().trim().min(2, 'Informe o nome do negócio.').max(90),
  logoUrl: textoOpcional(500),
  alertaValidadeDias: z.number().int().min(1).max(90),
  pontosPorReal: z.number().min(0).max(100),
  valorPorPonto: z.number().min(0).max(10),
  taxaServicoPercentual: z.number().min(0).max(30),
  taxaEntregaPadrao: z.number().min(0).max(200),
  descontoMaximoOperador: z.number().min(0).max(100),
  baixaEstoqueNaVenda: z.boolean(),
  horarioAbertura: textoOpcional(5),
  horarioFechamento: textoOpcional(5),
  diasFuncionamento: z.array(z.string()).max(7).default([]),
  whatsapp: textoOpcional(20),
  instagram: textoOpcional(60),
})

export const lojaSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome da loja.').max(90),
  cnpj: cnpjOpcional,
  telefone: textoOpcional(20),
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  cep: textoOpcional(9),
  logradouro: textoOpcional(120),
  numero: textoOpcional(12),
  complemento: textoOpcional(60),
  bairro: textoOpcional(60),
  cidade: textoOpcional(60),
  uf: textoOpcional(2),
})

export const formaPagamentoSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Informe o nome.').max(40),
  tipo: z.enum(['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'VOUCHER', 'FIADO', 'OUTRO']),
  taxaPercentual: z.number().min(0).max(30).default(0),
  taxaFixa: z.number().min(0).max(100).default(0),
  prazoRecebimentoDias: z.number().int().min(0).max(120).default(0),
  contaNoCaixa: z.boolean().default(false),
  permiteTroco: z.boolean().default(false),
  ordem: z.number().int().min(0).max(99).default(0),
  ativo: z.boolean().default(true),
})

export const alternarFormaSchema = z.object({ id: uuid, ativo: z.boolean() })
export const idFormaSchema = z.object({ id: uuid })

export const meuPerfilSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(90),
  telefone: textoOpcional(20),
})

export const categoriaFinanceiraSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Informe o nome.').max(60),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  cor: corHex.default('#6B4A2F'),
  ativo: z.boolean().default(true),
})
