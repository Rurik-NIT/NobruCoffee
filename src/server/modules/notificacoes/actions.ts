'use server'

import { z } from 'zod'

import { acao, acaoSimples } from '@/server/action'
import { exigirSessao } from '@/server/auth/session'
import { db } from '@/server/db'

export const marcarTodasLidas = acaoSimples(async () => {
  const sessao = await exigirSessao()
  const { count } = await db.notificacao.updateMany({
    where: { lojaId: sessao.lojaId, lida: false },
    data: { lida: true, lidaEm: new Date() },
  })
  return { marcadas: count }
})

export const marcarLida = acao(z.object({ id: z.string().uuid() }), async ({ id }) => {
  const sessao = await exigirSessao()
  await db.notificacao.updateMany({
    where: { id, lojaId: sessao.lojaId },
    data: { lida: true, lidaEm: new Date() },
  })
  return true
})
