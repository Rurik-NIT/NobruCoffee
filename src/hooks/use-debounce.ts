'use client'

import * as React from 'react'

/** Atrasa a propagação de um valor — usado nas buscas das listas. */
export function useDebounce<T>(valor: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(valor)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(valor), delay)
    return () => clearTimeout(t)
  }, [valor, delay])
  return debounced
}
