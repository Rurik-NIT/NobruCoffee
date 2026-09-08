/**
 * Arranque do banco de desenvolvimento.
 *
 * Roda antes do `dev`, e por isso é idempotente: com tudo de pé, sai em menos
 * de meio segundo sem escrever nada. A intenção é que `bun run dev` (ou
 * `pnpm dev`) seja o único comando que alguém precisa saber.
 *
 * A ordem das perguntas é a ordem em que as coisas costumam faltar:
 *
 *   1. o servidor responde?      não → explica e para
 *   2. as credenciais valem?     não → mostra o comando que resolve e para
 *   3. o banco existe?           não → cria
 *   4. as tabelas existem?       não → prisma db push
 *   5. existe algum dado?        não → prisma/seed.ts
 *
 * Nada aqui roda em produção: o deploy usa `db:deploy` e nunca este script.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const CINZA = '\x1b[90m'
const VERDE = '\x1b[32m'
const VERMELHO = '\x1b[31m'
const AMARELO = '\x1b[33m'
const FORTE = '\x1b[1m'
const FIM = '\x1b[0m'

/**
 * Caminho do psql no Windows. Serve só para a mensagem de erro ficar copiável;
 * o script em si nunca chama o psql. Pega a instalação de maior versão.
 */
const CAMINHO_PSQL = (() => {
  const base = 'C:\\Program Files\\PostgreSQL'
  try {
    const versoes = readdirSync(base)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a)
    if (versoes.length > 0) return `${base}\\${versoes[0]}\\bin\\psql.exe`
  } catch {
    // Sem a pasta: cai no palpite abaixo, que a pessoa ajusta.
  }
  return `${base}\\18\\bin\\psql.exe`
})()

const passo = (t) => console.log(`${CINZA}banco${FIM} ${t}`)
const ok = (t) => console.log(`${CINZA}banco${FIM} ${VERDE}✓${FIM} ${t}`)

function parar(titulo, linhas) {
  console.error(`\n${VERMELHO}${FORTE}✖ ${titulo}${FIM}\n`)
  for (const l of linhas) console.error(`  ${l}`)
  console.error('')
  process.exit(1)
}

// ── DATABASE_URL ────────────────────────────────────────────────────────────
// Lido do .env sem dependência: o Prisma carrega o dele, mas este script
// precisa da URL antes de instanciar o cliente.
function lerEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (!existsSync('.env')) {
    parar('Falta o arquivo .env', [
      'Copie o exemplo e preencha a DATABASE_URL:',
      '',
      `  ${FORTE}cp .env.example .env${FIM}`,
    ])
  }
  const linha = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((l) => /^\s*DATABASE_URL\s*=/.test(l))
  if (!linha) parar('O .env existe mas não tem DATABASE_URL.', ['Veja .env.example para o formato esperado.'])
  return linha.replace(/^\s*DATABASE_URL\s*=\s*/, '').replace(/^["']|["']$/g, '')
}

const urlBruta = lerEnv()
let url
try {
  url = new URL(urlBruta)
} catch {
  parar('DATABASE_URL inválida.', [`Valor lido: ${urlBruta}`, 'Formato: postgresql://usuario:senha@host:porta/banco'])
}

const nomeBanco = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres'
const usuario = decodeURIComponent(url.username)
const hostPorta = `${url.hostname}:${url.port || 5432}`

/** A mesma URL apontando para o banco de manutenção — usada para criar o nosso. */
function urlDeManutencao() {
  const u = new URL(urlBruta)
  u.pathname = '/postgres'
  u.search = ''
  return u.toString()
}

// ── Cliente ─────────────────────────────────────────────────────────────────
let PrismaClient
try {
  ;({ PrismaClient } = await import('@prisma/client'))
} catch {
  parar('O cliente do Prisma não foi gerado.', [`Rode ${FORTE}npx prisma generate${FIM} e tente de novo.`])
}

/**
 * Classifica a falha de conexão.
 *
 * O Prisma 6.2 não preenche `errorCode` em `PrismaClientInitializationError` —
 * o código existe só no texto da mensagem. Então a classificação é por texto,
 * com o `errorCode` aproveitado quando ele aparece (versões futuras podem
 * voltar a preenchê-lo).
 */
function codigo(erro) {
  const declarado = erro?.errorCode ?? erro?.code
  if (declarado) return declarado
  const m = String(erro?.message ?? '')
  if (/Authentication failed/i.test(m)) return 'P1000'
  if (/Can't reach database server|Connection refused|ECONNREFUSED|timed out/i.test(m)) return 'P1001'
  if (/does not exist on the database server|database .*does not exist/i.test(m)) return 'P1003'
  return ''
}

/** Primeira linha com conteúdo — a mensagem do Prisma começa com linhas vazias. */
function resumo(erro) {
  return (
    String(erro?.message ?? erro)
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('Invalid `prisma')) ?? 'Erro sem mensagem.'
  )
}

async function conectar(alvo) {
  const cliente = new PrismaClient({ datasourceUrl: alvo, log: [] })
  try {
    await cliente.$queryRawUnsafe('select 1')
    return { cliente }
  } catch (erro) {
    await cliente.$disconnect().catch(() => {})
    return { erro }
  }
}

function rodar(titulo, comando, argumentos) {
  passo(titulo)
  const r = spawnSync(comando, argumentos, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) {
    console.error('')
    parar(`Falhou: ${titulo}`, ['A saída do comando está acima.'])
  }
}

// ── 1 e 2: servidor no ar e credenciais válidas ─────────────────────────────
passo(`procurando ${nomeBanco} em ${hostPorta}…`)
let { cliente, erro } = await conectar(urlBruta)

if (erro && codigo(erro) === 'P1001') {
  parar(`Nenhum PostgreSQL respondendo em ${hostPorta}.`, [
    'Se ele está instalado, inicie o serviço:',
    '',
    `  ${FORTE}Start-Service postgresql-x64-18${FIM}   (PowerShell como administrador)`,
    '',
    'Se aponta para outro lugar, ajuste a DATABASE_URL no .env.',
  ])
}

if (erro && codigo(erro) === 'P1000') {
  parar(`O PostgreSQL recusou o usuário "${usuario}".`, [
    'O usuário não existe ou a senha está diferente da que está no .env.',
    '',
    'É o único passo que precisa de superusuário, e por isso o único que este',
    'script não faz. Depois dele, tudo o resto é automático.',
    '',
    `${FORTE}Cole no PowerShell${FIM} — o psql vai pedir a senha do postgres:`,
    '',
    `  ${FORTE}& '${CAMINHO_PSQL}' -U postgres -c "CREATE ROLE ${usuario} LOGIN PASSWORD '${url.password || 'senha'}' CREATEDB;"${FIM}`,
    '',
    `${CINZA}No VS Code: Run Task › "Criar o usuário do banco no PostgreSQL".${FIM}`,
    '',
    `${FORTE}Se você não sabe a senha do postgres${FIM}, use um banco que já existe:`,
    'troque a DATABASE_URL no .env por um Neon, Supabase ou outro Postgres seu',
    '— aí não precisa de nada local e este script segue daqui sozinho.',
  ])
}

// ── 3: o banco existe? ──────────────────────────────────────────────────────
if (erro && codigo(erro) === 'P1003') {
  passo(`o banco "${nomeBanco}" não existe — criando…`)
  const manutencao = await conectar(urlDeManutencao())
  if (manutencao.erro) {
    parar(`O banco "${nomeBanco}" não existe e não consegui criá-lo.`, [
      `O usuário "${usuario}" não alcança o banco de manutenção "postgres".`,
      '',
      'Crie o banco à mão:',
      '',
      `  ${FORTE}& '${CAMINHO_PSQL}' -U postgres -c "CREATE DATABASE ${nomeBanco} OWNER ${usuario};"${FIM}`,
    ])
  }
  // Aspas duplas preservam o nome exatamente como está na URL.
  await manutencao.cliente.$executeRawUnsafe(`CREATE DATABASE "${nomeBanco.replace(/"/g, '""')}"`)
  await manutencao.cliente.$disconnect()
  ok(`banco "${nomeBanco}" criado`)
  ;({ cliente, erro } = await conectar(urlBruta))
}

if (erro) {
  parar('Não consegui falar com o banco.', [resumo(erro), '', `Código: ${codigo(erro) || 'não classificado'}`])
}

// ── 4: as tabelas existem? ──────────────────────────────────────────────────
const [{ existe }] = await cliente.$queryRawUnsafe(
  `select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'usuarios') as existe`,
)
await cliente.$disconnect()

if (!existe) {
  rodar('aplicando o schema (40 tabelas)…', 'npx', ['prisma', 'db', 'push', '--skip-generate'])
  ok('schema aplicado')
}

// ── 5: existe algum dado? ───────────────────────────────────────────────────
const depois = new PrismaClient({ datasourceUrl: urlBruta })
const quantos = await depois.usuario.count()
await depois.$disconnect()

if (quantos === 0) {
  rodar('populando a base de demonstração (45 dias de histórico)…', 'npx', ['tsx', 'prisma/seed.ts'])
} else {
  ok(`${quantos} acessos cadastrados — base já populada`)
}

console.log(`${CINZA}banco${FIM} ${VERDE}pronto${FIM}  ${CINZA}entre com${FIM} ${FORTE}admin${FIM} ${CINZA}/${FIM} ${FORTE}admin${FIM}`)
if (quantos === 0) console.log(`${CINZA}banco${FIM} ${AMARELO}troque a senha do admin antes de qualquer uso real${FIM}`)
