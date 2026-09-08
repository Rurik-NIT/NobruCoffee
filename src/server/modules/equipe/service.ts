import 'server-only'

import { db } from '@/server/db'
import { brl, num } from '@/lib/money'
import { PERMISSOES, TODAS_PERMISSOES, type Permissao } from '@/server/auth/permissions'

export async function listarUsuarios(empresaId: string, lojaId: string) {
  const usuarios = await db.usuario.findMany({
    where: { empresaId },
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    include: {
      cargo: { select: { id: true, nome: true, slug: true } },
      loja: { select: { id: true, nome: true } },
      _count: { select: { sessoes: { where: { revogadaEm: null, expiraEm: { gt: new Date() } } } } },
    },
  })

  // Vendas do mês por operador — a métrica que o gerente realmente consulta.
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const vendas = await db.pedido.groupBy({
    by: ['usuarioId'],
    where: { lojaId, status: 'FINALIZADO', finalizadoEm: { gte: inicioMes } },
    _sum: { total: true },
    _count: true,
  })
  const porUsuario = new Map(vendas.map((v) => [v.usuarioId, { total: num(v._sum.total), pedidos: v._count }]))

  return usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    avatarUrl: u.avatarUrl,
    cargo: u.cargo,
    loja: u.loja,
    ativo: u.ativo,
    ultimoLoginEm: u.ultimoLoginEm,
    admitidoEm: u.admitidoEm,
    sessoesAtivas: u._count.sessoes,
    vendasMes: brl(porUsuario.get(u.id)?.total ?? 0),
    pedidosMes: porUsuario.get(u.id)?.pedidos ?? 0,
  }))
}

export async function listarCargos(empresaId: string) {
  const cargos = await db.cargo.findMany({
    where: { empresaId },
    orderBy: [{ sistema: 'desc' }, { nome: 'asc' }],
    include: { _count: { select: { usuarios: true } } },
  })

  return cargos.map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    descricao: c.descricao,
    sistema: c.sistema,
    permissoes: c.permissoes,
    /** `*` = acesso total; nesse caso o número mostrado é o catálogo inteiro. */
    total: c.permissoes.includes('*') ? TODAS_PERMISSOES.length : c.permissoes.length,
    acessoTotal: c.permissoes.includes('*'),
    usuarios: c._count.usuarios,
  }))
}

/** Catálogo agrupado, com o rótulo legível de cada permissão. */
export function catalogoPermissoes() {
  const mapa = new Map<string, Array<{ chave: Permissao; rotulo: string }>>()
  for (const chave of TODAS_PERMISSOES) {
    const def = PERMISSOES[chave]
    const lista = mapa.get(def.modulo) ?? []
    lista.push({ chave, rotulo: def.rotulo })
    mapa.set(def.modulo, lista)
  }
  return [...mapa.entries()].map(([modulo, itens]) => ({ modulo, itens }))
}

export type FiltroAuditoria = {
  lojaId: string
  usuarioId?: string
  entidade?: string
  busca?: string
  de?: Date
  ate?: Date
  pagina?: number
  porPagina?: number
}

export async function listarAuditoria(filtro: FiltroAuditoria) {
  const pagina = Math.max(1, filtro.pagina ?? 1)
  const porPagina = filtro.porPagina ?? 40

  const where: Record<string, unknown> = { lojaId: filtro.lojaId }
  if (filtro.usuarioId) where.usuarioId = filtro.usuarioId
  if (filtro.entidade && filtro.entidade !== 'todos') where.entidade = filtro.entidade
  if (filtro.busca) where.acao = { contains: filtro.busca, mode: 'insensitive' }
  if (filtro.de || filtro.ate) {
    where.criadoEm = { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lte: filtro.ate } : {}) }
  }

  const [total, logs, entidades] = await Promise.all([
    db.logSistema.count({ where }),
    db.logSistema.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: { usuario: { select: { id: true, nome: true } } },
    }),
    db.logSistema.findMany({
      where: { lojaId: filtro.lojaId },
      select: { entidade: true },
      distinct: ['entidade'],
      orderBy: { entidade: 'asc' },
    }),
  ])

  return {
    itens: logs.map((l) => ({
      id: l.id,
      acao: l.acao,
      entidade: l.entidade,
      entidadeId: l.entidadeId,
      usuario: l.usuario?.nome ?? 'Sistema',
      usuarioId: l.usuarioId,
      anterior: l.dadosAnteriores,
      novo: l.dadosNovos,
      ip: l.ip,
      criadoEm: l.criadoEm,
    })),
    total,
    pagina,
    porPagina,
    entidades: entidades.map((e) => e.entidade),
  }
}
