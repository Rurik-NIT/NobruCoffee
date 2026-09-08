import { z } from 'zod'

import { textoOpcional, uuid } from '../_comum/schemas'

export const perdaSchema = z
  .object({
    tipo: z.enum(['produto', 'insumo']),
    produtoId: uuid.optional().nullable(),
    ingredienteId: uuid.optional().nullable(),
    quantidade: z.number().min(0.001, 'Informe a quantidade perdida.').max(99_999),
    motivo: z.enum([
      'QUEIMADO',
      'DANIFICADO',
      'VENCIDO',
      'ERRO_PRODUCAO',
      'NAO_VENDIDO',
      'EMBALAGEM',
      'CORTESIA',
      'OUTRO',
    ]),
    observacao: textoOpcional(240),
  })
  .refine((d) => (d.tipo === 'produto' ? Boolean(d.produtoId) : Boolean(d.ingredienteId)), {
    message: 'Escolha o item da perda.',
    path: ['produtoId'],
  })
