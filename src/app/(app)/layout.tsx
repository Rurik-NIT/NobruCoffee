import { redirect } from 'next/navigation'

import { MobileNav } from '@/components/app-shell/mobile-nav'
import { NAVEGACAO, type GrupoNav } from '@/components/app-shell/navegacao'
import { Sidebar } from '@/components/app-shell/sidebar'
import { RegistroPwa } from '@/components/app-shell/pwa'
import { Topbar } from '@/components/app-shell/topbar'
import { temPermissao } from '@/server/auth/permissions'
import { sessaoAtual } from '@/server/auth/session'
import { db } from '@/server/db'
import { sairERedirecionar } from '@/server/modules/auth/actions'
import { caixaAbertoDaLoja, saldoEspecie } from '@/server/modules/caixa/service'
import { marcarTodasLidas } from '@/server/modules/notificacoes/actions'
import { listarNotificacoes } from '@/server/modules/notificacoes/service'

/**
 * Casca do sistema autenticado.
 *
 * Aqui a sessão é validada de verdade (o middleware só olhou o cookie) e a
 * navegação é montada **no servidor**, já filtrada pelas permissões do cargo.
 * O cliente nunca recebe a lista de telas que não pode abrir.
 */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual()
  if (!sessao) redirect('/system')

  const grupos: GrupoNav[] = NAVEGACAO.map((grupo) => ({
    titulo: grupo.titulo,
    itens: grupo.itens.filter((item) => temPermissao(sessao.permissoes, item.permissao)),
  })).filter((grupo) => grupo.itens.length > 0)

  const itensMobile = grupos.flatMap((g) => g.itens).filter((i) => i.mobile).slice(0, 4)

  const [{ itens: notificacoes, naoLidas }, caixa] = await Promise.all([
    listarNotificacoes(sessao.lojaId),
    caixaAbertoDaLoja(db, sessao.lojaId),
  ])

  const caixaAberto = caixa
    ? { id: caixa.id, codigo: caixa.codigo, saldo: await saldoEspecie(db, caixa.id) }
    : null

  return (
    <div className="flex min-h-dvh bg-paper">
      <Sidebar grupos={grupos} nomeLoja={sessao.lojaNome} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          usuario={{
            nome: sessao.nome,
            email: sessao.email,
            avatarUrl: sessao.avatarUrl,
            cargoNome: sessao.cargoNome,
          }}
          grupos={grupos}
          notificacoes={notificacoes}
          naoLidas={naoLidas}
          caixaAberto={caixaAberto}
          onSair={sairERedirecionar}
          onMarcarLidas={marcarTodasLidas}
        />
        <RegistroPwa />
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">{children}</main>
        <MobileNav itens={itensMobile} />
      </div>
    </div>
  )
}
