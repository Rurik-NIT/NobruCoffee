'use client'

import * as React from 'react'
import { Lock, Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'

import { numero } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CheckboxCampo } from '@/components/ui/toggles'
import { useAcao } from '@/hooks/use-acao'
import { excluirCargo, salvarCargo } from '@/server/modules/equipe/actions'

type Cargo = {
  id: string
  nome: string
  slug: string
  descricao: string | null
  sistema: boolean
  permissoes: string[]
  total: number
  acessoTotal: boolean
  usuarios: number
}

type Catalogo = Array<{ modulo: string; itens: Array<{ chave: string; rotulo: string }> }>

export function GerenciarCargos({
  cargos,
  catalogo,
  podeEditar,
}: {
  cargos: Cargo[]
  catalogo: Catalogo
  podeEditar: boolean
}) {
  const [editando, setEditando] = React.useState<Cargo | null>(null)
  const [criando, setCriando] = React.useState(false)
  const [excluirAlvo, setExcluirAlvo] = React.useState<Cargo | null>(null)

  const acaoExcluir = useAcao(excluirCargo, { sucesso: 'Cargo excluído', aoConcluir: () => setExcluirAlvo(null) })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(cargos.length)}
          </span>{' '}
          cargo(s)
        </p>
        {podeEditar ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" />
            Novo cargo
          </Button>
        ) : null}
      </div>

      <ul className="divide-y divide-hairline">
        {cargos.map((c) => (
          <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-extrabold">{c.nome}</h3>
                {c.acessoTotal ? (
                  <Badge tone="dark">
                    <Lock className="size-3" />
                    Acesso total
                  </Badge>
                ) : (
                  <Badge tone="neutral">{numero(c.total)} permissões</Badge>
                )}
                {c.sistema ? <Badge tone="info">Cargo do sistema</Badge> : null}
                <span className="flex items-center gap-1 text-xs text-body-muted">
                  <Users className="size-3.5" />
                  {numero(c.usuarios)}
                </span>
              </div>
              {c.descricao ? <p className="mt-1 text-sm text-body-muted">{c.descricao}</p> : null}
              {!c.acessoTotal ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {catalogo
                    .filter((g) => g.itens.some((i) => c.permissoes.includes(i.chave)))
                    .map((g) => (
                      <li
                        key={g.modulo}
                        className="rounded-full border border-hairline-strong bg-paper px-2 py-0.5 text-[11px] font-semibold text-body-muted"
                      >
                        {g.modulo}
                        <span className="ml-1 text-body-subtle">
                          {g.itens.filter((i) => c.permissoes.includes(i.chave)).length}/{g.itens.length}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
            {podeEditar ? (
              <div className="flex shrink-0 gap-1">
                {!c.acessoTotal ? (
                  <Button variant="secondary" size="sm" onClick={() => setEditando(c)}>
                    <Pencil className="size-3.5" />
                    Permissões
                  </Button>
                ) : null}
                {!c.sistema ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger"
                    aria-label={`Excluir ${c.nome}`}
                    onClick={() => setExcluirAlvo(c)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {criando || editando ? (
        <EditorCargo
          cargo={editando}
          catalogo={catalogo}
          onFechar={() => {
            setCriando(false)
            setEditando(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        aberto={Boolean(excluirAlvo)}
        onAbertoChange={(v) => !v && setExcluirAlvo(null)}
        titulo={`Excluir o cargo ${excluirAlvo?.nome}?`}
        descricao={
          excluirAlvo && excluirAlvo.usuarios > 0
            ? `${excluirAlvo.usuarios} pessoa(s) usam este cargo — mova-as antes.`
            : 'O cargo será removido.'
        }
        confirmarTexto="Excluir cargo"
        destrutivo
        pendente={acaoExcluir.pendente}
        onConfirmar={() => excluirAlvo && acaoExcluir.executar({ id: excluirAlvo.id })}
      />
    </>
  )
}

function EditorCargo({
  cargo,
  catalogo,
  onFechar,
}: {
  cargo: Cargo | null
  catalogo: Catalogo
  onFechar: () => void
}) {
  const [nome, setNome] = React.useState(cargo?.nome ?? '')
  const [descricao, setDescricao] = React.useState(cargo?.descricao ?? '')
  const [selecionadas, setSelecionadas] = React.useState<string[]>(cargo?.permissoes ?? [])

  const acao = useAcao(salvarCargo, { sucesso: (d) => `Cargo ${d.nome} salvo`, aoConcluir: onFechar })

  function alternar(chave: string) {
    setSelecionadas((atual) => (atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]))
  }

  function alternarModulo(itens: Array<{ chave: string }>) {
    const chaves = itens.map((i) => i.chave)
    const todas = chaves.every((c) => selecionadas.includes(c))
    setSelecionadas((atual) => (todas ? atual.filter((c) => !chaves.includes(c)) : [...new Set([...atual, ...chaves])]))
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onFechar()}>
      <SheetContent largura="md">
        <SheetHeader>
          <SheetTitle>{cargo ? `Permissões de ${cargo.nome}` : 'Novo cargo'}</SheetTitle>
          <SheetDescription>
            Marque só o que o cargo precisa. Cada permissão é verificada no servidor antes de qualquer gravação.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6">
          <Field label="Nome do cargo" htmlFor="cg-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="cg-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Barista sênior" autoFocus />
          </Field>
          <Field label="Descrição" htmlFor="cg-desc">
            <Input id="cg-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>

          {acao.erroCampos.permissoes ? (
            <p className="text-xs font-semibold text-danger">{acao.erroCampos.permissoes}</p>
          ) : null}

          <div className="space-y-4">
            {catalogo.map((grupo) => {
              const marcadas = grupo.itens.filter((i) => selecionadas.includes(i.chave)).length
              return (
                <div key={grupo.modulo} className="rounded-card border border-hairline bg-paper">
                  <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <ShieldCheck className="size-4 text-body-subtle" />
                      {grupo.modulo}
                      <Badge tone={marcadas > 0 ? 'brand' : 'neutral'} size="sm">
                        {marcadas}/{grupo.itens.length}
                      </Badge>
                    </span>
                    <button
                      type="button"
                      onClick={() => alternarModulo(grupo.itens)}
                      className="text-xs font-semibold text-nobru-600 hover:underline"
                    >
                      {marcadas === grupo.itens.length ? 'Desmarcar tudo' : 'Marcar tudo'}
                    </button>
                  </div>
                  <div className="grid gap-2 px-4 py-3 sm:grid-cols-2">
                    {grupo.itens.map((item) => (
                      <CheckboxCampo
                        key={item.chave}
                        id={`perm-${item.chave}`}
                        checked={selecionadas.includes(item.chave)}
                        onCheckedChange={() => alternar(item.chave)}
                        label={item.rotulo}
                        descricao={item.chave}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {acao.erroGeral ? (
            <p className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
              {acao.erroGeral}
            </p>
          ) : null}
        </SheetBody>

        <SheetFooter>
          <span className="mr-auto self-center text-xs text-body-muted">
            {numero(selecionadas.length)} permissão(ões) marcada(s)
          </span>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={nome.trim().length < 2 || selecionadas.length === 0}
            onClick={() => acao.executar({ id: cargo?.id, nome, descricao, permissoes: selecionadas })}
          >
            Salvar cargo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
