import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Pasta de saída, sobrescrevível por variável de ambiente.
   *
   * `next build` e `next dev` escrevem no mesmo `.next`. Rodar um build de
   * conferência com o servidor de desenvolvimento no ar troca o manifesto sob
   * os pés dele, e a página passa a pedir um CSS que não existe mais — a tela
   * aparece sem estilo nenhum. `build:check` usa `.next-check` justamente para
   * que conferir nunca derrube quem está com o `dev` aberto.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    // Server Actions receive images/base64 for product photos and encomenda references.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    ]
  },
}

export default nextConfig
