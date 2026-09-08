import { WifiOff } from 'lucide-react'

import { MarcaNobru } from '@/components/app-shell/marca'

export const metadata = { title: 'Sem conexão' }

/**
 * Página servida pelo service worker quando a navegação falha sem rede.
 * Diz a verdade: navegar funciona, gravar venda não.
 */
export default function PaginaOffline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <MarcaNobru tom="claro" tamanho={48} />
      <div className="flex size-14 items-center justify-center rounded-panel bg-caution-soft text-caution">
        <WifiOff className="size-6" />
      </div>
      <div className="max-w-sm">
        <h1 className="font-display text-2xl font-extrabold">Sem conexão</h1>
        <p className="mt-2 text-sm text-body-muted">
          O aplicativo está instalado e a estrutura das telas continua no aparelho, mas os dados vêm do servidor. Reconecte
          para ver o painel e registrar vendas.
        </p>
        <p className="mt-4 text-xs text-body-subtle">
          Nada que você digitou foi enviado. Vendas só são gravadas com internet — não existe fila offline.
        </p>
      </div>
    </main>
  )
}
