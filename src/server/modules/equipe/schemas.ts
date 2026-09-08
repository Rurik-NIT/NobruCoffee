import { z } from 'zod'

import { cpfOpcional, textoOpcional, uuid } from '../_comum/schemas'

export const usuarioSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Informe o nome.').max(90),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  /** Apelido curto de acesso. Em branco, a pessoa entra pelo e-mail. */
  apelido: z
    .string()
    .trim()
    .toLowerCase()
    .max(32)
    .regex(/^[a-z0-9._-]*$/, 'Use apenas letras, números, ponto, hífen e sublinhado.')
    .refine((v) => v === '' || v.length >= 2, 'O apelido precisa de pelo menos 2 caracteres.')
    .optional()
    .or(z.literal('')),
  cargoId: uuid,
  telefone: textoOpcional(20),
  cpf: cpfOpcional,
  admitidoEm: textoOpcional(10),
  ativo: z.boolean().default(true),
  /** Obrigatória na criação; em branco na edição mantém a senha atual. */
  senha: z.string().optional().or(z.literal('')),
})

export const alternarUsuarioSchema = z.object({ id: uuid, ativo: z.boolean() })
export const idUsuarioSchema = z.object({ id: uuid })

export const cargoSchema = z.object({
  id: uuid.optional(),
  nome: z.string().trim().min(2, 'Informe o nome do cargo.').max(50),
  descricao: textoOpcional(200),
  permissoes: z.array(z.string()).max(200),
})
