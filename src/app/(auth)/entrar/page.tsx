import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { MarcaNobru } from '@/components/app-shell/marca'
import { sessaoAtual } from '@/server/auth/session'
import { FormularioLogin } from './formulario'

export const metadata: Metadata = { title: 'Entrar' }

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>
}) {
  const sessao = await sessaoAtual()
  if (sessao) redirect('/dashboard')

  const { proximo } = await searchParams

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_460px]">
      {/* Painel de marca — a mesma lousa da fachada. */}
      <section className="chalkboard relative hidden flex-col justify-between p-12 lg:flex">
        <MarcaNobru tamanho={44} subtitulo="Cafeteria BLENDS NC" />

        <div className="max-w-md">
          <p className="font-display text-4xl leading-[1.1] font-extrabold text-cream">
            O balcão manda.
            <br />
            <span className="text-amber-nobru">O sistema acompanha.</span>
          </p>
          <p className="mt-5 text-sm leading-relaxed text-on-dark-muted">
            Venda, produção, estoque, encomendas e caixa no mesmo lugar. Feito para a Av. São João, 390 — e para
            qualquer cafeteria que produz o que vende.
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-6 border-t border-hairline-dark pt-6">
          {[
            { n: '5,0★', r: '228 avaliações no Google' },
            { n: '2016', r: 'servindo em SJC' },
            { n: '⭕️', r: 'a assinatura da casa' },
          ].map((i) => (
            <div key={i.r}>
              <dt className="font-display text-xl font-extrabold text-cream">{i.n}</dt>
              <dd className="mt-1 text-[11px] leading-snug text-on-dark-muted">{i.r}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Formulário */}
      <section className="flex flex-col justify-center bg-paper px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <MarcaNobru tom="claro" tamanho={40} subtitulo="Cafeteria BLENDS NC" />
          </div>

          <h1 className="mt-8 font-display text-2xl font-extrabold tracking-tight lg:mt-0">Entrar no sistema</h1>
          <p className="mt-1.5 text-sm text-body-muted">
            Use o e-mail cadastrado pelo gerente. Cada pessoa tem o seu acesso — o sistema registra quem fez o quê.
          </p>

          <FormularioLogin proximo={proximo} />

          <p className="mt-8 text-xs text-body-subtle">
            Esqueceu a senha? Um gerente redefine em <span className="font-semibold">Equipe › Funcionários</span>.
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 text-xs font-semibold text-body-muted hover:text-body"
          >
            <ArrowLeft className="size-3.5" />
            Voltar ao site
          </Link>
        </div>
      </section>
    </main>
  )
}
