'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Filtros na URL, não no estado local.
 *
 * Assim o gerente pode compartilhar "vendas de setembro, forma PIX" por link,
 * o botão voltar funciona e a página continua sendo Server Component — quem
 * busca no banco é o servidor, com os parâmetros já filtrados.
 */
export function useFiltrosUrl() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pendente, setPendente] = React.useState(false)

  const aplicar = React.useCallback(
    (mudancas: Record<string, string | number | null | undefined>, opcoes?: { resetarPagina?: boolean }) => {
      const novos = new URLSearchParams(params.toString())
      for (const [chave, valor] of Object.entries(mudancas)) {
        if (valor === null || valor === undefined || valor === '' || valor === 'todos') novos.delete(chave)
        else novos.set(chave, String(valor))
      }
      if (opcoes?.resetarPagina !== false) novos.delete('pagina')
      setPendente(true)
      router.replace(`${pathname}?${novos.toString()}`, { scroll: false })
      // O Next resolve a navegação; soltamos a pendência no próximo tick de render.
      setTimeout(() => setPendente(false), 400)
    },
    [params, pathname, router],
  )

  const ler = React.useCallback((chave: string, padrao = '') => params.get(chave) ?? padrao, [params])

  const limpar = React.useCallback(() => {
    setPendente(true)
    router.replace(pathname, { scroll: false })
    setTimeout(() => setPendente(false), 400)
  }, [pathname, router])

  return { aplicar, ler, limpar, pendente, params }
}
