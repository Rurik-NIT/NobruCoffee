/**
 * Build de conferência, isolado da pasta do servidor de desenvolvimento.
 *
 * `next build` e `next dev` escrevem no mesmo `.next`. Rodar um build para
 * conferir enquanto alguém está com o `dev` aberto troca o manifesto sob os pés
 * dele: a página passa a pedir um CSS que não existe mais e aparece sem estilo
 * nenhum — HTML cru, como se o projeto tivesse quebrado.
 *
 * Aqui o build sai em `.next-check` (via `distDir` no next.config.ts), então
 * conferir nunca derruba quem está desenvolvendo.
 *
 * Uso: pnpm build:check · bun run build:check
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const next = require.resolve('next/dist/bin/next')

const r = spawnSync(process.execPath, [next, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: '.next-check' },
})

process.exit(r.status ?? 1)
