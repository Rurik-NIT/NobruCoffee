'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Bell,
  CheckCheck,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Wallet,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { hora, tempoRelativo } from '@/lib/format'
import { moeda } from '@/lib/format'
import { Avatar } from '@/components/ui/avatar'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/combobox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useOnline } from '@/hooks/use-online'
import { MarcaNobru } from './marca'
import { tituloDaRota, type GrupoNav } from './navegacao'

export type NotificacaoUI = {
  id: string
  titulo: string
  mensagem: string
  severidade: 'INFO' | 'ALERTA' | 'CRITICO'
  link: string | null
  lida: boolean
  criadoEm: string
}

export type ResumoCaixa = { id: string; codigo: string; saldo: number } | null

export function Topbar({
  usuario,
  grupos,
  notificacoes,
  naoLidas,
  caixaAberto,
  onSair,
  onMarcarLidas,
}: {
  usuario: { nome: string; email: string; avatarUrl: string | null; cargoNome: string }
  grupos: GrupoNav[]
  notificacoes: NotificacaoUI[]
  naoLidas: number
  caixaAberto: ResumoCaixa
  onSair: () => void
  onMarcarLidas: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const online = useOnline()
  const [menuAberto, setMenuAberto] = React.useState(false)
  const [paletaAberta, setPaletaAberta] = React.useState(false)

  // Ctrl/Cmd+K abre a busca de telas — atalho de quem usa o sistema o dia todo.
  React.useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletaAberta((v) => !v)
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  React.useEffect(() => setMenuAberto(false), [pathname])

  const itens = grupos.flatMap((g) => g.itens.map((i) => ({ ...i, grupo: g.titulo })))

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-hairline bg-paper/90 px-3 backdrop-blur-md sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setMenuAberto(true)}
        >
          <Menu />
        </Button>

        <h1 className="min-w-0 flex-1 truncate font-display text-base font-extrabold tracking-tight sm:text-lg">
          {tituloDaRota(pathname)}
        </h1>

        {!online ? (
          <Badge tone="caution" className="hidden sm:inline-flex">
            Sem conexão
          </Badge>
        ) : null}

        {/* Caixa aberto fica sempre visível: é a informação que muda a decisão
            de quem está no balcão. */}
        {caixaAberto ? (
          <Link
            href={`/caixas/${caixaAberto.id}`}
            className="hidden items-center gap-2 rounded-full border border-leaf/25 bg-leaf-soft px-3 py-1.5 text-xs font-bold text-leaf transition-colors hover:bg-leaf/10 md:inline-flex"
          >
            <StatusDot tone="leaf" pulse />
            Caixa {caixaAberto.codigo}
            <span className="font-mono" data-numeric>
              {moeda(caixaAberto.saldo)}
            </span>
          </Link>
        ) : (
          <Link
            href="/caixas"
            className="hidden items-center gap-1.5 rounded-full border border-hairline-strong bg-paper-raised px-3 py-1.5 text-xs font-semibold text-body-muted transition-colors hover:border-body-subtle md:inline-flex"
          >
            <Wallet className="size-3.5" />
            Caixa fechado
          </Link>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="hidden gap-2 text-body-muted lg:inline-flex"
          onClick={() => setPaletaAberta(true)}
        >
          <Search className="size-3.5" />
          Buscar tela
          <kbd className="rounded border border-hairline-strong bg-paper px-1 font-mono text-[10px]">Ctrl K</kbd>
        </Button>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buscar tela" onClick={() => setPaletaAberta(true)}>
          <Search />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ''}`} className="relative">
              <Bell />
              {naoLidas > 0 ? (
                <span
                  className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-nobru-500 px-1 text-[10px] font-bold text-white"
                  data-numeric
                >
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <p className="text-sm font-extrabold">Avisos da loja</p>
              {naoLidas > 0 ? (
                <button
                  type="button"
                  onClick={onMarcarLidas}
                  className="flex items-center gap-1 text-xs font-semibold text-nobru-600 hover:underline"
                >
                  <CheckCheck className="size-3.5" />
                  Marcar como lidas
                </button>
              ) : null}
            </div>
            {notificacoes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-body-muted">
                Nada pendente. O painel do dia mostra os números.
              </p>
            ) : (
              <ul className="max-h-[26rem] divide-y divide-hairline overflow-y-auto">
                {notificacoes.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.link ?? '#'}
                      className={cn(
                        'flex gap-3 px-4 py-3 transition-colors hover:bg-paper-sunken',
                        !n.lida && 'bg-nobru-50/60',
                      )}
                    >
                      <StatusDot
                        tone={n.severidade === 'CRITICO' ? 'danger' : n.severidade === 'ALERTA' ? 'caution' : 'brand'}
                        className="mt-1.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{n.titulo}</span>
                        <span className="mt-0.5 block text-xs text-body-muted">{n.mensagem}</span>
                        <span className="mt-1 block text-[10px] text-body-subtle">{tempoRelativo(n.criadoEm)}</span>
                      </span>
                      {n.link ? <ChevronRight className="mt-1 size-4 shrink-0 text-body-subtle" /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-paper-sunken"
              aria-label="Conta"
            >
              <Avatar nome={usuario.nome} src={usuario.avatarUrl} />
            </button>
          </DropdownTrigger>
          <DropdownContent className="w-60">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-bold">{usuario.nome}</p>
              <p className="truncate text-xs text-body-muted">{usuario.email}</p>
              <Badge tone="brand" size="sm" className="mt-2">
                {usuario.cargoNome}
              </Badge>
            </div>
            <DropdownSeparator />
            <DropdownLabel>Turno</DropdownLabel>
            <DropdownItem onSelect={() => router.push('/caixas')}>
              <Wallet />
              {caixaAberto ? `Caixa ${caixaAberto.codigo} aberto` : 'Abrir caixa'}
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem destrutivo onSelect={onSair}>
              <LogOut />
              Sair
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </header>

      {/* Menu completo no mobile */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent largura="sm" className="left-0 right-auto border-r border-l-0">
          <SheetHeader className="chalkboard border-hairline-dark">
            <SheetTitle className="text-cream">
              <MarcaNobru />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação">
            {grupos.map((grupo, gi) => (
              <div key={grupo.titulo ?? `g${gi}`} className={gi > 0 ? 'mt-5' : ''}>
                {grupo.titulo ? <p className="eyebrow px-2 pb-2">{grupo.titulo}</p> : null}
                <ul className="space-y-0.5">
                  {grupo.itens.map((item) => {
                    const ativo = item.prefixo ? pathname.startsWith(item.href) : pathname === item.href
                    const Icone = item.icone
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium',
                            ativo ? 'bg-nobru-500 text-white' : 'text-body-muted hover:bg-paper-sunken hover:text-body',
                          )}
                        >
                          <Icone className="size-[18px] shrink-0" />
                          {item.rotulo}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Paleta de comandos */}
      {paletaAberta ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal>
          <button
            type="button"
            aria-label="Fechar busca"
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            onClick={() => setPaletaAberta(false)}
          />
          <Command
            loop
            className="animate-in-soft relative w-full max-w-lg overflow-hidden rounded-panel border border-hairline bg-paper-raised shadow-pop"
          >
            <div className="flex items-center gap-2 border-b border-hairline px-4">
              <Search className="size-4 text-body-subtle" />
              <Command.Input
                autoFocus
                placeholder="Ir para… (produto, caixa, encomenda, relatório)"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-body-subtle"
              />
              <kbd className="rounded border border-hairline-strong bg-paper px-1.5 py-0.5 font-mono text-[10px] text-body-subtle">
                esc
              </kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-body-muted">
                Nenhuma tela com esse nome.
              </Command.Empty>
              {itens.map((item) => {
                const Icone = item.icone
                return (
                  <Command.Item
                    key={item.href}
                    value={`${item.rotulo} ${item.grupo ?? ''}`}
                    onSelect={() => {
                      setPaletaAberta(false)
                      router.push(item.href)
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm data-[selected=true]:bg-paper-sunken"
                  >
                    <Icone className="size-4 shrink-0 text-body-subtle" />
                    <span className="flex-1 font-medium">{item.rotulo}</span>
                    {item.grupo ? <span className="text-xs text-body-subtle">{item.grupo}</span> : null}
                  </Command.Item>
                )
              })}
            </Command.List>
            <div className="border-t border-hairline px-4 py-2 text-[11px] text-body-subtle">
              Aberto às {hora(new Date())} · Ctrl K para abrir e fechar
            </div>
          </Command>
        </div>
      ) : null}
    </>
  )
}
