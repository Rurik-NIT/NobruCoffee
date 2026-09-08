'use client'

import * as React from 'react'

/**
 * Estado de conexão.
 *
 * O PDV usa isto para avisar honestamente: navegar continua funcionando (a
 * shell está em cache do service worker), mas gravar venda exige rede. Não
 * fingimos fila offline — ver docs/ARQUITETURA.md § PWA.
 */
export function useOnline() {
  const [online, setOnline] = React.useState(true)

  React.useEffect(() => {
    setOnline(navigator.onLine)
    const sobe = () => setOnline(true)
    const cai = () => setOnline(false)
    window.addEventListener('online', sobe)
    window.addEventListener('offline', cai)
    return () => {
      window.removeEventListener('online', sobe)
      window.removeEventListener('offline', cai)
    }
  }, [])

  return online
}
