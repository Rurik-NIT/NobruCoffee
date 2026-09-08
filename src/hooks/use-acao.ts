'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { toast } from '@/components/ui/toast'
import type { Resultado } from '@/server/action'

type Opcoes<T> = {
  /** Mensagem de sucesso. Use o mesmo verbo do botão: "Produto salvo". */
  sucesso?: string | ((dados: T) => string)
  /** Executado após sucesso, antes do refresh. */
  aoConcluir?: (dados: T) => void
  /** Revalida os Server Components da rota atual. Padrão: true. */
  revalidar?: boolean
}

/**
 * Liga uma Server Action à interface.
 *
 * Centraliza o que toda tela precisa: pendência para o botão, toast de erro com
 * a mensagem que o serviço escreveu, erros por campo para o formulário e
 * `router.refresh()` para que a lista atrás reflita a mudança.
 */
export function useAcao<TEntrada, TSaida>(
  action: (entrada: TEntrada) => Promise<Resultado<TSaida>>,
  opcoes: Opcoes<TSaida> = {},
) {
  const router = useRouter()
  const [pendente, setPendente] = React.useState(false)
  const [erroCampos, setErroCampos] = React.useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = React.useState<string | null>(null)

  const executar = React.useCallback(
    async (entrada: TEntrada): Promise<Resultado<TSaida>> => {
      setPendente(true)
      setErroCampos({})
      setErroGeral(null)
      try {
        const resultado = await action(entrada)
        if (resultado.ok) {
          const msg =
            typeof opcoes.sucesso === 'function' ? opcoes.sucesso(resultado.dados) : opcoes.sucesso
          if (msg) toast.success(msg)
          opcoes.aoConcluir?.(resultado.dados)
          if (opcoes.revalidar !== false) router.refresh()
        } else {
          setErroCampos(resultado.campos ?? {})
          setErroGeral(resultado.erro)
          if (resultado.codigo === 'VALIDACAO' && resultado.campos) {
            toast.error('Confira os campos destacados.')
          } else {
            toast.error(resultado.erro)
          }
        }
        return resultado
      } catch {
        const msg = 'Não conseguimos falar com o servidor. Verifique a conexão e tente de novo.'
        setErroGeral(msg)
        toast.error(msg)
        return { ok: false, erro: msg, codigo: 'INTERNO' }
      } finally {
        setPendente(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, router, opcoes.sucesso, opcoes.revalidar],
  )

  return { executar, pendente, erroCampos, erroGeral, limparErros: () => { setErroCampos({}); setErroGeral(null) } }
}
