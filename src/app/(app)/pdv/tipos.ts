/** Tipos compartilhados entre os componentes do PDV. */

export type ProdutoPdv = {
  id: string
  nome: string
  sku: string
  imagemUrl: string | null
  categoriaId: string
  tipo: string
  precoVenda: number
  precoCusto: number
  disponivel: boolean
  controlaEstoque: boolean
  estoqueAtual: number
  destaque: boolean
  variacoes: Array<{ id: string; nome: string; precoDelta: number; custoDelta: number }>
  adicionaisIds: string[]
}

export type AdicionalPdv = { id: string; nome: string; preco: number }

export type FormaPdv = {
  id: string
  nome: string
  tipo: string
  permiteTroco: boolean
  contaNoCaixa: boolean
  taxaPercentual: number
}

export type CatalogoPdv = {
  categorias: Array<{ id: string; nome: string; cor: string }>
  produtos: ProdutoPdv[]
  adicionais: AdicionalPdv[]
  formasPagamento: FormaPdv[]
}

/** Linha do carrinho local (antes de existir no banco). */
export type ItemCarrinho = {
  /** Chave local, só para o React. */
  chave: string
  produtoId: string
  nome: string
  variacaoId: string | null
  variacaoNome: string | null
  quantidade: number
  precoUnitario: number
  observacao: string
  adicionais: Array<{ adicionalId: string; nome: string; preco: number; quantidade: number }>
}

export type ClientePdv = { id: string; nome: string; telefone: string; pontos: number }

export type PagamentoLinha = {
  formaPagamentoId: string
  valor: number
  valorRecebido?: number
}

export function totalDoItem(item: ItemCarrinho): number {
  const extras = item.adicionais.reduce((acc, a) => acc + a.preco * a.quantidade, 0)
  return Math.round((item.quantidade * item.precoUnitario + extras) * 100) / 100
}
