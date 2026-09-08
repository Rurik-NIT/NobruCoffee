import { z } from 'zod'

import { cpfOpcional, telefoneBR, textoOpcional, uuid } from '../_comum/schemas'

export const clienteSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Informe o nome.').max(90),
  telefone: telefoneBR,
  email: z.string().trim().email('E-mail inválido.').optional().or(z.literal('')),
  cpf: cpfOpcional,
  dataNascimento: textoOpcional(10),
  cep: textoOpcional(9),
  logradouro: textoOpcional(120),
  numero: textoOpcional(12),
  complemento: textoOpcional(60),
  bairro: textoOpcional(60),
  cidade: textoOpcional(60),
  uf: textoOpcional(2),
  observacoes: textoOpcional(500),
  ativo: z.boolean().default(true),
})

export const cadastroRapidoSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(90),
  telefone: telefoneBR,
})

export const buscaClienteSchema = z.object({ termo: z.string().trim().max(60) })

export const arquivarClienteSchema = z.object({ id: uuid, ativo: z.boolean() })

export const ajustarPontosSchema = z.object({
  clienteId: uuid,
  pontos: z.number().int().refine((v) => v !== 0, 'Informe um valor diferente de zero.'),
  descricao: z.string().trim().min(3, 'Explique o ajuste.').max(200),
})

export const cupomSchema = z
  .object({
    id: uuid.optional(),
    codigo: z
      .string()
      .trim()
      .min(3, 'Informe o código.')
      .max(24)
      .regex(/^[A-Za-z0-9]+$/, 'Use apenas letras e números.'),
    descricao: textoOpcional(120),
    tipo: z.enum(['PERCENTUAL', 'VALOR']),
    valor: z.number().min(0.01, 'Informe o valor do desconto.').max(99_999),
    minimoCompra: z.number().min(0).max(99_999).default(0),
    usoMaximo: z.number().int().min(1).max(99_999).nullable().optional(),
    validoDe: textoOpcional(10),
    validoAte: textoOpcional(10),
    clienteId: uuid.nullable().optional(),
    ativo: z.boolean().default(true),
  })
  .refine((d) => d.tipo !== 'PERCENTUAL' || d.valor <= 100, {
    message: 'Desconto percentual não pode passar de 100%.',
    path: ['valor'],
  })

export const alternarCupomSchema = z.object({ id: uuid, ativo: z.boolean() })
export const cupomAniversarioSchema = z.object({ clienteId: uuid })
