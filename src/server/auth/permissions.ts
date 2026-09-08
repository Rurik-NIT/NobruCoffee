/**
 * Catálogo de permissões.
 *
 * Por que em código e não em tabela: a lista de permissões é parte do
 * comportamento do sistema, versionada junto com as telas que ela protege.
 * O banco guarda apenas *quais* chaves cada cargo recebeu (`cargos.permissoes`),
 * o que evita um JOIN por requisição e mantém o RBAC auditável no diff do git.
 *
 * Chave = `modulo.acao`. `*` só existe no cargo Administrador.
 */

export const PERMISSOES = {
  'dashboard.ver': { modulo: 'Dashboard', rotulo: 'Ver o painel do dia' },

  'pdv.operar': { modulo: 'PDV', rotulo: 'Operar o PDV e registrar vendas' },
  'pdv.desconto': { modulo: 'PDV', rotulo: 'Aplicar desconto até o limite da loja' },
  'pdv.desconto_livre': { modulo: 'PDV', rotulo: 'Aplicar desconto acima do limite' },
  'pdv.cancelar_item': { modulo: 'PDV', rotulo: 'Cancelar item de um pedido aberto' },
  'pdv.cancelar_pedido': { modulo: 'PDV', rotulo: 'Cancelar pedido inteiro' },
  'pdv.estornar': { modulo: 'PDV', rotulo: 'Estornar pagamento de venda finalizada' },

  'pedidos.ver': { modulo: 'Pedidos', rotulo: 'Ver pedidos' },
  'pedidos.editar': { modulo: 'Pedidos', rotulo: 'Alterar status e itens de pedidos' },

  'mesas.ver': { modulo: 'Mesas', rotulo: 'Ver o mapa de mesas' },
  'mesas.gerenciar': { modulo: 'Mesas', rotulo: 'Abrir, transferir, unir e reservar mesas' },

  'caixa.ver': { modulo: 'Caixa', rotulo: 'Ver caixas e movimentos' },
  'caixa.abrir': { modulo: 'Caixa', rotulo: 'Abrir caixa' },
  'caixa.fechar': { modulo: 'Caixa', rotulo: 'Fechar caixa' },
  'caixa.sangria': { modulo: 'Caixa', rotulo: 'Registrar sangria e suprimento' },
  'caixa.conferir': { modulo: 'Caixa', rotulo: 'Conferir e aprovar divergência de caixa' },

  'produtos.ver': { modulo: 'Produtos', rotulo: 'Ver catálogo' },
  'produtos.gerenciar': { modulo: 'Produtos', rotulo: 'Criar e editar produtos' },
  'produtos.preco': { modulo: 'Produtos', rotulo: 'Alterar preço de venda' },
  'produtos.excluir': { modulo: 'Produtos', rotulo: 'Excluir produtos' },
  'produtos.disponibilidade': { modulo: 'Produtos', rotulo: 'Marcar produto como esgotado' },

  'categorias.gerenciar': { modulo: 'Produtos', rotulo: 'Gerenciar categorias e adicionais' },

  'fichas.ver': { modulo: 'Fichas técnicas', rotulo: 'Ver fichas técnicas e custos' },
  'fichas.gerenciar': { modulo: 'Fichas técnicas', rotulo: 'Criar e versionar fichas técnicas' },

  'producao.ver': { modulo: 'Produção', rotulo: 'Ver produção do dia e ordens' },
  'producao.gerenciar': { modulo: 'Produção', rotulo: 'Criar, iniciar e concluir ordens de produção' },

  'perdas.ver': { modulo: 'Perdas', rotulo: 'Ver perdas registradas' },
  'perdas.registrar': { modulo: 'Perdas', rotulo: 'Registrar perda' },

  'estoque.ver': { modulo: 'Estoque', rotulo: 'Ver estoque, insumos e validades' },
  'estoque.gerenciar': { modulo: 'Estoque', rotulo: 'Cadastrar e editar insumos' },
  'estoque.movimentar': { modulo: 'Estoque', rotulo: 'Lançar entrada e saída manual' },
  'estoque.ajustar': { modulo: 'Estoque', rotulo: 'Ajustar saldo de estoque' },
  'estoque.inventariar': { modulo: 'Estoque', rotulo: 'Abrir e finalizar inventário' },

  'compras.ver': { modulo: 'Compras', rotulo: 'Ver pedidos de compra' },
  'compras.gerenciar': { modulo: 'Compras', rotulo: 'Criar e enviar pedidos de compra' },
  'compras.receber': { modulo: 'Compras', rotulo: 'Registrar recebimento de mercadoria' },

  'fornecedores.ver': { modulo: 'Compras', rotulo: 'Ver fornecedores' },
  'fornecedores.gerenciar': { modulo: 'Compras', rotulo: 'Cadastrar e editar fornecedores' },

  'clientes.ver': { modulo: 'Clientes', rotulo: 'Ver clientes' },
  'clientes.gerenciar': { modulo: 'Clientes', rotulo: 'Cadastrar e editar clientes' },
  'fidelidade.ajustar': { modulo: 'Clientes', rotulo: 'Ajustar pontos e emitir cupons' },

  'encomendas.ver': { modulo: 'Encomendas', rotulo: 'Ver encomendas' },
  'encomendas.gerenciar': { modulo: 'Encomendas', rotulo: 'Criar, orçar e avançar encomendas' },

  'financeiro.ver': { modulo: 'Financeiro', rotulo: 'Ver contas, fluxo de caixa e despesas' },
  'financeiro.gerenciar': { modulo: 'Financeiro', rotulo: 'Lançar e liquidar contas' },

  'relatorios.ver': { modulo: 'Relatórios', rotulo: 'Ver relatórios operacionais' },
  'relatorios.financeiro': { modulo: 'Relatórios', rotulo: 'Ver faturamento, margem e lucro' },

  'equipe.ver': { modulo: 'Equipe', rotulo: 'Ver funcionários' },
  'equipe.gerenciar': { modulo: 'Equipe', rotulo: 'Cadastrar e editar funcionários' },
  'equipe.permissoes': { modulo: 'Equipe', rotulo: 'Criar cargos e alterar permissões' },

  'configuracoes.ver': { modulo: 'Configurações', rotulo: 'Ver configurações da loja' },
  'configuracoes.gerenciar': { modulo: 'Configurações', rotulo: 'Alterar configurações e formas de pagamento' },

  'auditoria.ver': { modulo: 'Configurações', rotulo: 'Ver o log de auditoria' },
} as const

export type Permissao = keyof typeof PERMISSOES

export const TODAS_PERMISSOES = Object.keys(PERMISSOES) as Permissao[]

/** Permissões agrupadas por módulo — usado na tela de cargos. */
export function permissoesPorModulo(): Array<{ modulo: string; itens: Array<{ chave: Permissao; rotulo: string }> }> {
  const mapa = new Map<string, Array<{ chave: Permissao; rotulo: string }>>()
  for (const chave of TODAS_PERMISSOES) {
    const def = PERMISSOES[chave]
    const lista = mapa.get(def.modulo) ?? []
    lista.push({ chave, rotulo: def.rotulo })
    mapa.set(def.modulo, lista)
  }
  return [...mapa.entries()].map(([modulo, itens]) => ({ modulo, itens }))
}

/** O Administrador carrega `*`; os demais carregam a lista explícita. */
export function temPermissao(permissoes: readonly string[], requerida: Permissao | Permissao[]): boolean {
  if (permissoes.includes('*')) return true
  const lista = Array.isArray(requerida) ? requerida : [requerida]
  return lista.some((p) => permissoes.includes(p))
}

// ───────────────────────────────────────────────────────────────────────────
//  CARGOS PADRÃO — criados no seed, marcados como `sistema` (não excluíveis)
// ───────────────────────────────────────────────────────────────────────────

const PERM_ATENDENTE: Permissao[] = [
  'dashboard.ver',
  'pdv.operar',
  'pdv.desconto',
  'pdv.cancelar_item',
  'pedidos.ver',
  'pedidos.editar',
  'mesas.ver',
  'mesas.gerenciar',
  'caixa.ver',
  'caixa.abrir',
  'caixa.fechar',
  'produtos.ver',
  'produtos.disponibilidade',
  'estoque.ver',
  'perdas.ver',
  'perdas.registrar',
  'clientes.ver',
  'clientes.gerenciar',
  'encomendas.ver',
  'encomendas.gerenciar',
  'producao.ver',
]

const PERM_PRODUCAO: Permissao[] = [
  'dashboard.ver',
  'produtos.ver',
  'produtos.disponibilidade',
  'fichas.ver',
  'fichas.gerenciar',
  'producao.ver',
  'producao.gerenciar',
  'perdas.ver',
  'perdas.registrar',
  'estoque.ver',
  'estoque.gerenciar',
  'estoque.movimentar',
  'estoque.inventariar',
  'compras.ver',
  'compras.receber',
  'fornecedores.ver',
  'encomendas.ver',
  'relatorios.ver',
]

/** Gerente: tudo, menos mexer em permissões e nas configurações da loja. */
const PERM_GERENTE: Permissao[] = TODAS_PERMISSOES.filter(
  (p) => p !== 'equipe.permissoes' && p !== 'configuracoes.gerenciar',
)

export const CARGOS_PADRAO = [
  {
    nome: 'Administrador',
    slug: 'administrador',
    descricao: 'Acesso total, incluindo permissões, configurações e financeiro.',
    permissoes: ['*'],
  },
  {
    nome: 'Gerente',
    slug: 'gerente',
    descricao: 'Operação completa, financeiro e relatórios. Não altera permissões.',
    permissoes: PERM_GERENTE,
  },
  {
    nome: 'Atendente',
    slug: 'atendente',
    descricao: 'PDV, mesas, pedidos, clientes e encomendas. Sem financeiro.',
    permissoes: PERM_ATENDENTE,
  },
  {
    nome: 'Produção',
    slug: 'producao',
    descricao: 'Produção, fichas técnicas, estoque e recebimento de compras.',
    permissoes: PERM_PRODUCAO,
  },
] as const
