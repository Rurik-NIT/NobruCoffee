/**
 * ════════════════════════════════════════════════════════════════════════════
 *  BOOTSTRAP DE PRODUÇÃO — empresa, loja, cargos e o primeiro administrador
 * ════════════════════════════════════════════════════════════════════════════
 *
 * O seed (`pnpm db:seed`) é de demonstração: 45 dias de vendas fictícias, e não
 * deve tocar em produção. Este script faz o mínimo para a primeira pessoa
 * conseguir entrar — depois disso tudo é cadastrado pela interface, na ordem
 * de docs/MANUAL-DE-USO.md § 2.
 *
 * Roda uma vez, e se recusa a rodar de novo: havendo qualquer usuário no banco,
 * aborta sem escrever nada. Não há `--forçar` de propósito — apagar a empresa
 * derruba em cascata tudo que depende dela.
 *
 * Rodar:
 *   ADMIN_EMAIL=... ADMIN_SENHA=... pnpm criar:admin
 *
 * Variáveis (as sem padrão são obrigatórias):
 *   ADMIN_EMAIL       e-mail de login do administrador
 *   ADMIN_SENHA       senha inicial — mínimo 8 caracteres, com letra e número
 *   ADMIN_NOME        nome exibido            (padrão: "Administrador")
 *   ADMIN_APELIDO     apelido curto de acesso (padrão: "admin")
 *   EMPRESA_RAZAO     razão social            (padrão: nome fantasia)
 *   EMPRESA_FANTASIA  nome fantasia           (padrão: "Nobru Coffee e Donuts")
 *   LOJA_NOME         nome da loja            (padrão: nome fantasia)
 *   LOJA_SLUG         slug da loja            (padrão: derivado do nome)
 *   LOJA_FUSO         fuso horário            (padrão: STORE_TIMEZONE ou São Paulo)
 */
import { PrismaClient } from '@prisma/client'

import { CARGOS_PADRAO } from '../src/server/auth/permissions'
import { hashSenha, validarForcaSenha } from '../src/server/auth/password'

const db = new PrismaClient()

function obrigatorio(chave: string): string {
  const valor = process.env[chave]?.trim()
  if (!valor) {
    throw new Error(`Falta a variável ${chave}. Veja o cabeçalho de scripts/criar-admin.ts.`)
  }
  return valor
}

/** Slug de URL: sem acento, sem símbolo, separado por hífen. */
function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const email = obrigatorio('ADMIN_EMAIL').toLowerCase()
  const senha = obrigatorio('ADMIN_SENHA')

  const problema = validarForcaSenha(senha)
  if (problema) throw new Error(`ADMIN_SENHA: ${problema}`)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`ADMIN_EMAIL inválido: ${email}`)

  const jaTem = await db.usuario.count()
  if (jaTem > 0) {
    throw new Error(
      `O banco já tem ${jaTem} usuário(s) — este script só roda numa base nova. ` +
        'Novos acessos são criados em Gestão › Equipe.',
    )
  }

  const fantasia = process.env.EMPRESA_FANTASIA?.trim() || 'Nobru Coffee e Donuts'
  const razao = process.env.EMPRESA_RAZAO?.trim() || fantasia
  const lojaNome = process.env.LOJA_NOME?.trim() || fantasia
  const lojaSlug = process.env.LOJA_SLUG?.trim() || slugificar(lojaNome)
  const fuso = process.env.LOJA_FUSO?.trim() || process.env.STORE_TIMEZONE?.trim() || 'America/Sao_Paulo'

  const { loja, admin } = await db.$transaction(async (tx) => {
    const empresa = await tx.empresa.create({
      data: { razaoSocial: razao, nomeFantasia: fantasia },
    })

    const loja = await tx.loja.create({
      data: { empresaId: empresa.id, nome: lojaNome, slug: lojaSlug, fusoHorario: fuso },
    })

    // Só o obrigatório. O resto — taxas, horários, fidelidade — tem padrão no
    // schema e é ajustado em Gestão › Configurações.
    await tx.configuracao.create({
      data: { lojaId: loja.id, nomeNegocio: fantasia, fusoHorario: fuso },
    })

    // Os quatro cargos de sistema, com as permissões de
    // src/server/auth/permissions.ts. `sistema: true` impede a exclusão.
    const cargos: Record<string, string> = {}
    for (const c of CARGOS_PADRAO) {
      const criado = await tx.cargo.create({
        data: {
          empresaId: empresa.id,
          nome: c.nome,
          slug: c.slug,
          descricao: c.descricao,
          permissoes: [...c.permissoes],
          sistema: true,
        },
      })
      cargos[c.slug] = criado.id
    }

    const admin = await tx.usuario.create({
      data: {
        empresaId: empresa.id,
        lojaId: loja.id,
        cargoId: cargos.administrador,
        nome: process.env.ADMIN_NOME?.trim() || 'Administrador',
        email,
        apelido: process.env.ADMIN_APELIDO?.trim() || 'admin',
        senhaHash: await hashSenha(senha),
      },
    })

    return { loja, admin }
  })

  console.log('\n✅ Base de produção criada.\n')
  console.log(`   Empresa:  ${razao}`)
  console.log(`   Loja:     ${loja.nome}  (slug: ${loja.slug}, fuso: ${loja.fusoHorario})`)
  console.log(`   Cargos:   ${CARGOS_PADRAO.map((c) => c.nome).join(', ')}`)
  console.log(`   Acesso:   ${admin.apelido ?? admin.email}  —  ${admin.email}`)
  console.log('\n   A senha é a que você passou em ADMIN_SENHA. Troque no primeiro acesso.')
  console.log('   Próximo passo: docs/MANUAL-DE-USO.md § 2 (montar a loja).\n')
}

main()
  .catch((erro) => {
    console.error(`\n❌ ${erro instanceof Error ? erro.message : erro}\n`)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
