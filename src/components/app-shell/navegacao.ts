import type { NomeIcone } from './icones'

import type { Permissao } from '@/server/auth/permissions'

export type ItemNav = {
  rotulo: string
  href: string
  icone: NomeIcone
  /** Permissão mínima para o item aparecer. */
  permissao: Permissao | Permissao[]
  /** Marca o item ativo também nas sub-rotas. */
  prefixo?: boolean
  /** Aparece no menu inferior do mobile. */
  mobile?: boolean
}

export type GrupoNav = {
  titulo: string | null
  itens: ItemNav[]
}

/**
 * Navegação do sistema.
 *
 * A ordem segue o dia da loja, não o organograma: abre o caixa, vende, produz,
 * repõe, compra, cuida do cliente, fecha o dinheiro, olha o resultado.
 *
 * Cada item declara a permissão que o libera. O menu esconde o que o cargo não
 * abre — mas quem protege de verdade é `exigirPermissao` no servidor.
 */
export const NAVEGACAO: GrupoNav[] = [
  {
    titulo: null,
    itens: [
      {
        rotulo: 'Painel do dia',
        href: '/dashboard',
        icone: 'LayoutDashboard',
        permissao: 'dashboard.ver',
        mobile: true,
      },
    ],
  },
  {
    titulo: 'Vendas',
    itens: [
      { rotulo: 'PDV', href: '/pdv', icone: 'ShoppingCart', permissao: 'pdv.operar', mobile: true },
      { rotulo: 'Pedidos', href: '/pedidos', icone: 'ListOrdered', permissao: 'pedidos.ver', mobile: true },
      { rotulo: 'Mesas', href: '/mesas', icone: 'Grid2x2', permissao: 'mesas.ver' },
      { rotulo: 'Caixas', href: '/caixas', icone: 'Wallet', permissao: 'caixa.ver', prefixo: true },
    ],
  },
  {
    titulo: 'Produtos',
    itens: [
      { rotulo: 'Catálogo', href: '/produtos', icone: 'Coffee', permissao: 'produtos.ver' },
      { rotulo: 'Categorias', href: '/produtos/categorias', icone: 'Tags', permissao: 'produtos.ver' },
      { rotulo: 'Adicionais', href: '/produtos/adicionais', icone: 'BadgePercent', permissao: 'produtos.ver' },
      { rotulo: 'Fichas técnicas', href: '/fichas-tecnicas', icone: 'BookOpen', permissao: 'fichas.ver', prefixo: true },
    ],
  },
  {
    titulo: 'Produção',
    itens: [
      { rotulo: 'Produção do dia', href: '/producao', icone: 'CookingPot', permissao: 'producao.ver' },
      { rotulo: 'Ordens de produção', href: '/producao/ordens', icone: 'ClipboardList', permissao: 'producao.ver', prefixo: true },
      { rotulo: 'Perdas', href: '/perdas', icone: 'Trash2', permissao: 'perdas.ver' },
    ],
  },
  {
    titulo: 'Estoque',
    itens: [
      { rotulo: 'Insumos', href: '/estoque', icone: 'Boxes', permissao: 'estoque.ver' },
      { rotulo: 'Movimentações', href: '/estoque/movimentacoes', icone: 'History', permissao: 'estoque.ver' },
      { rotulo: 'Inventário', href: '/estoque/inventario', icone: 'PackageSearch', permissao: 'estoque.ver', prefixo: true },
      { rotulo: 'Validades', href: '/estoque/validades', icone: 'CalendarClock', permissao: 'estoque.ver' },
    ],
  },
  {
    titulo: 'Compras',
    itens: [
      { rotulo: 'Pedidos de compra', href: '/compras', icone: 'Truck', permissao: 'compras.ver' },
      { rotulo: 'Recebimentos', href: '/compras/recebimentos', icone: 'Archive', permissao: 'compras.ver' },
      { rotulo: 'Fornecedores', href: '/compras/fornecedores', icone: 'Store', permissao: 'fornecedores.ver' },
    ],
  },
  {
    titulo: 'Clientes',
    itens: [
      { rotulo: 'Clientes', href: '/clientes', icone: 'Users', permissao: 'clientes.ver', mobile: true },
      { rotulo: 'Fidelidade e cupons', href: '/clientes/fidelidade', icone: 'BadgePercent', permissao: 'clientes.ver' },
      { rotulo: 'Encomendas', href: '/encomendas', icone: 'CalendarClock', permissao: 'encomendas.ver', prefixo: true },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { rotulo: 'Fluxo de caixa', href: '/financeiro', icone: 'Banknote', permissao: 'financeiro.ver' },
      { rotulo: 'Contas a pagar', href: '/financeiro/pagar', icone: 'TrendingDown', permissao: 'financeiro.ver' },
      { rotulo: 'Contas a receber', href: '/financeiro/receber', icone: 'TrendingUp', permissao: 'financeiro.ver' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { rotulo: 'Relatórios', href: '/relatorios', icone: 'ChartNoAxesColumn', permissao: 'relatorios.ver', prefixo: true },
      { rotulo: 'Equipe', href: '/equipe', icone: 'UserRound', permissao: 'equipe.ver' },
      { rotulo: 'Cargos e permissões', href: '/equipe/cargos', icone: 'ShieldCheck', permissao: 'equipe.ver' },
      { rotulo: 'Formas de pagamento', href: '/configuracoes/pagamentos', icone: 'CreditCard', permissao: 'configuracoes.ver' },
      { rotulo: 'Configurações', href: '/configuracoes', icone: 'Settings', permissao: 'configuracoes.ver' },
      { rotulo: 'Auditoria', href: '/configuracoes/auditoria', icone: 'Receipt', permissao: 'auditoria.ver' },
    ],
  },
]

/** Todos os itens em lista plana — usado na paleta de comandos. */
export const ITENS_PLANOS: ItemNav[] = NAVEGACAO.flatMap((g) => g.itens)

/** Título da página a partir da rota, para o cabeçalho do mobile. */
export function tituloDaRota(pathname: string): string {
  const exato = ITENS_PLANOS.find((i) => i.href === pathname)
  if (exato) return exato.rotulo
  const prefixo = ITENS_PLANOS.filter((i) => pathname.startsWith(i.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]
  return prefixo?.rotulo ?? 'Nobru Coffee'
}
