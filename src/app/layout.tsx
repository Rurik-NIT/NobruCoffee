import type { Metadata, Viewport } from 'next'
import { Figtree, IBM_Plex_Mono, Nunito } from 'next/font/google'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toast'
import '@/styles/globals.css'

/**
 * Três famílias, três papéis (docs/DESIGN-SYSTEM.md § Tipografia):
 *  • Nunito — display. Geométrica, ultra-bold, terminais arredondados: é a
 *    tipografia mais próxima do lettering "No bru" do selo da marca.
 *  • Figtree — interface. Humanista quente, legível a 11px nas tabelas densas.
 *  • IBM Plex Mono — só códigos e documentos impressos (comanda, fechamento).
 */
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Nobru Coffee — sistema da loja',
    template: '%s · Nobru Coffee',
  },
  description:
    'O sistema operacional da Nobru Coffee e Donuts: PDV, produção, estoque, encomendas, clientes e financeiro em um só lugar.',
  applicationName: 'Nobru Coffee',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Nobru' },
  icons: {
    icon: [
      { url: '/icons/icone-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icone-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icone-192.png', sizes: '192x192' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  /** O PDV é usado em iPad no balcão: sem zoom acidental durante a venda. */
  userScalable: false,
  themeColor: '#D24237',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${figtree.variable} ${plexMono.variable}`}>
      <body>
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  )
}
