import 'server-only'

import { z } from 'zod'

import { ErroDeNegocio, traduzirErroPrisma, type CodigoErro } from './errors'

/**
 * Contrato único de retorno das Server Actions.
 *
 * Toda ação devolve o mesmo envelope, então a camada de UI tem um só caminho
 * para tratar sucesso, erro de validação por campo e erro de negócio — sem
 * try/catch espalhado em componentes e sem `throw` cruzando a fronteira.
 */
export type Resultado<T = void> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; codigo: CodigoErro; campos?: Record<string, string> }

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados }
}

export function falha(erro: string, codigo: CodigoErro = 'REGRA_DE_NEGOCIO', campos?: Record<string, string>): Resultado<never> {
  return { ok: false, erro, codigo, campos }
}

function camposDoZod(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of erro.issues) {
    const chave = issue.path.join('.') || '_'
    if (!campos[chave]) campos[chave] = issue.message
  }
  return campos
}

/**
 * Envolve o corpo de uma Server Action: valida a entrada com zod, executa e
 * normaliza qualquer exceção. Erros inesperados vão para o log do servidor e
 * chegam ao usuário como mensagem genérica — nunca com SQL ou stack.
 */
export function acao<TEntrada extends z.ZodTypeAny, TSaida>(
  schema: TEntrada,
  handler: (entrada: z.infer<TEntrada>) => Promise<TSaida>,
) {
  return async (entrada: unknown): Promise<Resultado<TSaida>> => {
    const parsed = schema.safeParse(entrada)
    if (!parsed.success) {
      return falha('Confira os campos destacados.', 'VALIDACAO', camposDoZod(parsed.error))
    }
    try {
      return sucesso(await handler(parsed.data))
    } catch (erro) {
      return normalizarErro(erro)
    }
  }
}

/** Versão sem entrada, para ações de um clique. */
export function acaoSimples<TSaida>(handler: () => Promise<TSaida>) {
  return async (): Promise<Resultado<TSaida>> => {
    try {
      return sucesso(await handler())
    } catch (erro) {
      return normalizarErro(erro)
    }
  }
}

export function normalizarErro(erro: unknown): Resultado<never> {
  if (erro instanceof ErroDeNegocio) {
    return falha(erro.message, erro.codigo, erro.campos)
  }
  if (erro instanceof z.ZodError) {
    return falha('Confira os campos destacados.', 'VALIDACAO', camposDoZod(erro))
  }
  const traduzido = traduzirErroPrisma(erro)
  if (traduzido) return falha(traduzido.message, traduzido.codigo)

  console.error('[acao] erro inesperado', erro)
  return falha('Algo deu errado ao salvar. Tente de novo — se persistir, avise o suporte.', 'INTERNO')
}
