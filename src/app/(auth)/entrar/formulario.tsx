'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAcao } from '@/hooks/use-acao'
import { entrar } from '@/server/modules/auth/actions'

export function FormularioLogin({ proximo }: { proximo?: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [mostrarSenha, setMostrarSenha] = React.useState(false)

  const { executar, pendente, erroCampos, erroGeral } = useAcao(entrar, {
    revalidar: false,
    aoConcluir: () => router.replace(proximo && proximo.startsWith('/') ? proximo : '/dashboard'),
  })

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault()
    await executar({ email, senha })
  }

  return (
    <form onSubmit={aoEnviar} className="mt-8 space-y-4" noValidate>
      <Field label="E-mail" htmlFor="email" erro={erroCampos.email} obrigatorio>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@nobrucoffee.com.br"
        />
      </Field>

      <Field label="Senha" htmlFor="senha" erro={erroCampos.senha} obrigatorio>
        <div className="relative">
          <Input
            id="senha"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full p-2 text-body-subtle hover:bg-paper-sunken hover:text-body"
          >
            {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      {erroGeral && !erroCampos.senha && !erroCampos.email ? (
        <p role="alert" className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {erroGeral}
        </p>
      ) : null}

      <Button type="submit" size="lg" full loading={pendente}>
        Entrar
      </Button>
    </form>
  )
}
