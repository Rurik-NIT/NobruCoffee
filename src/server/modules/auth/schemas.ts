import { z } from 'zod'

/**
 * O campo de identificação aceita e-mail **ou** apelido de acesso.
 *
 * Exigir o e-mail completo no login era atrito puro no balcão: o operador
 * digita o endereço inteiro numa tela sensível a toque, várias vezes por turno.
 * A regra do que é apelido válido fica aqui e não no banco: `a-z`, `0-9`,
 * ponto, hífen e sublinhado, para não colidir com a forma de um e-mail.
 */
export const entrarSchema = z.object({
  identificador: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe o e-mail ou o apelido de acesso.')
    .max(120, 'Identificador longo demais.')
    .refine((v) => (v.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^[a-z0-9._-]{2,32}$/.test(v)), {
      message: 'Informe um e-mail válido ou um apelido de acesso.',
    }),
  senha: z.string().min(1, 'Informe a senha.'),
})

export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: z.string().min(8, 'A nova senha precisa de pelo menos 8 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmacao, {
    message: 'As senhas não conferem.',
    path: ['confirmacao'],
  })
