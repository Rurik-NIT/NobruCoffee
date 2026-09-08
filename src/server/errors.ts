/**
 * Erros de domínio.
 *
 * Regra do projeto: nenhum erro de banco chega à tela. Os serviços lançam
 * `ErroDeNegocio` com uma mensagem que o operador entende; o wrapper de ações
 * (src/server/action.ts) converte qualquer outra exceção em uma mensagem
 * genérica e registra o detalhe no log do servidor.
 */

export type CodigoErro =
  | 'VALIDACAO'
  | 'NAO_AUTENTICADO'
  | 'SEM_PERMISSAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'REGRA_DE_NEGOCIO'
  | 'ESTOQUE_INSUFICIENTE'
  | 'CAIXA_FECHADO'
  | 'INTERNO'

export class ErroDeNegocio extends Error {
  readonly codigo: CodigoErro
  /** Erros de campo, no formato { campo: 'mensagem' }. */
  readonly campos?: Record<string, string>

  constructor(mensagem: string, codigo: CodigoErro = 'REGRA_DE_NEGOCIO', campos?: Record<string, string>) {
    super(mensagem)
    this.name = 'ErroDeNegocio'
    this.codigo = codigo
    this.campos = campos
  }
}

export class NaoAutenticado extends ErroDeNegocio {
  constructor(mensagem = 'Sua sessão expirou. Entre novamente para continuar.') {
    super(mensagem, 'NAO_AUTENTICADO')
  }
}

export class SemPermissao extends ErroDeNegocio {
  constructor(mensagem = 'Você não tem permissão para esta ação. Fale com um gerente.') {
    super(mensagem, 'SEM_PERMISSAO')
  }
}

export class NaoEncontrado extends ErroDeNegocio {
  constructor(oque = 'registro') {
    super(`Não encontramos este ${oque}. Ele pode ter sido removido.`, 'NAO_ENCONTRADO')
  }
}

export class EstoqueInsuficiente extends ErroDeNegocio {
  constructor(item: string, disponivel: string, necessario: string) {
    super(
      `Estoque insuficiente de ${item}: disponível ${disponivel}, necessário ${necessario}.`,
      'ESTOQUE_INSUFICIENTE',
    )
  }
}

/** Traduz códigos do Prisma em mensagens úteis, sem vazar SQL. */
export function traduzirErroPrisma(erro: unknown): ErroDeNegocio | null {
  if (typeof erro !== 'object' || erro === null) return null
  const e = erro as { code?: string; meta?: { target?: string[] | string; field_name?: string } }
  switch (e.code) {
    case 'P2002': {
      const alvo = Array.isArray(e.meta?.target) ? e.meta.target.join(', ') : e.meta?.target
      return new ErroDeNegocio(
        alvo
          ? `Já existe um registro com este valor em: ${alvo}.`
          : 'Já existe um registro com estes dados.',
        'CONFLITO',
      )
    }
    case 'P2003':
      return new ErroDeNegocio('Este registro está vinculado a outros e não pode ser alterado assim.', 'CONFLITO')
    case 'P2025':
      return new NaoEncontrado()
    case 'P2014':
      return new ErroDeNegocio('A alteração quebraria um vínculo existente.', 'CONFLITO')
    default:
      return null
  }
}
