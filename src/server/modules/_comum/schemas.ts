import { z } from 'zod'

/**
 * Validadores compartilhados.
 *
 * Vivem fora dos arquivos `'use server'` de propósito: o compilador do Next
 * exige que todo export de um módulo de Server Actions seja função async, e as
 * arrow functions de `.refine()`/`.transform()` dentro do inicializador de um
 * export quebram essa regra. Schemas em módulo próprio também deixam a mesma
 * validação disponível para o formulário no cliente.
 */
export const uuid = z.string().uuid('Selecione uma opção válida.')

export const soDigitos = (valor: string) => valor.replace(/\D/g, '')

export const telefoneBR = z
  .string()
  .trim()
  .transform(soDigitos)
  .refine((v) => v.length === 10 || v.length === 11, 'Informe um telefone com DDD.')

export const telefoneBROpcional = z
  .string()
  .trim()
  .transform(soDigitos)
  .refine((v) => v === '' || v.length === 10 || v.length === 11, 'Telefone inválido.')
  .optional()

export const cpfOpcional = z
  .string()
  .trim()
  .transform(soDigitos)
  .refine((v) => v === '' || v.length === 11, 'CPF deve ter 11 dígitos.')
  .optional()

export const cnpjOpcional = z
  .string()
  .trim()
  .transform(soDigitos)
  .refine((v) => v === '' || v.length === 14, 'CNPJ deve ter 14 dígitos.')
  .optional()

export const documentoOpcional = z
  .string()
  .trim()
  .transform(soDigitos)
  .refine((v) => v === '' || v.length === 11 || v.length === 14, 'Informe CNPJ (14) ou CPF (11).')
  .optional()

export const textoOpcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))

export const dinheiro = z.number().min(0, 'O valor não pode ser negativo.').max(9_999_999, 'Valor acima do limite.')

export const dinheiroPositivo = z.number().min(0.01, 'Informe o valor.').max(9_999_999, 'Valor acima do limite.')

export const quantidadePositiva = z.number().min(0.001, 'Informe a quantidade.').max(9_999_999)

export const corHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
