/**
 * Verifica que todo item do menu tem uma página de verdade.
 *
 * A spec do projeto proíbe tela sem saída: um link do menu apontando para uma
 * rota inexistente vira 404 no meio do turno. Este script lê a navegação
 * declarada em `src/components/app-shell/navegacao.ts` e confere se existe um
 * `page.tsx` correspondente em `src/app/(app)/`.
 *
 * Roda sem banco e sem build — por isso está no CI antes de tudo.
 *
 * Uso: node scripts/verificar-rotas.mjs
 */
import { readFileSync, existsSync } from 'node:fs'

const NAV = 'src/components/app-shell/navegacao.ts'
const BASE = 'src/app/(app)'

const fonte = readFileSync(NAV, 'utf8')

// Extrai os href declarados na navegação.
const rotas = [...fonte.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1])
if (rotas.length === 0) {
  console.error('✖ Nenhuma rota encontrada em', NAV)
  process.exit(1)
}

const faltando = []
for (const rota of rotas) {
  const caminho = `${BASE}${rota}/page.tsx`
  if (!existsSync(caminho)) faltando.push({ rota, caminho })
}

// Confere também as permissões citadas na navegação contra o catálogo.
const permissoes = new Set(
  [...readFileSync('src/server/auth/permissions.ts', 'utf8').matchAll(/^\s{2}'([a-z_]+\.[a-z_]+)':/gm)].map(
    (m) => m[1],
  ),
)
const permissoesNav = [...fonte.matchAll(/permissao:\s*'([^']+)'/g)].map((m) => m[1])
const permissoesInvalidas = permissoesNav.filter((p) => !permissoes.has(p))

console.log(`Rotas do menu: ${rotas.length}`)
console.log(`Permissões no catálogo: ${permissoes.size}`)

if (faltando.length > 0) {
  console.error('\n✖ Item de menu sem página:')
  for (const f of faltando) console.error(`   ${f.rota}  →  esperado ${f.caminho}`)
}
if (permissoesInvalidas.length > 0) {
  console.error('\n✖ Permissão citada no menu e ausente do catálogo:')
  for (const p of permissoesInvalidas) console.error(`   ${p}`)
}

if (faltando.length > 0 || permissoesInvalidas.length > 0) process.exit(1)

console.log('\n✓ Toda rota do menu tem página e toda permissão existe no catálogo.')
