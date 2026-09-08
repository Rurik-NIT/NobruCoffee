'use client'

import * as React from 'react'
import { GripVertical, Pencil, Plus, Tags, Trash2 } from 'lucide-react'

import { numero } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { Input, QuantityInput } from '@/components/ui/input'
import { SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { useAcao } from '@/hooks/use-acao'
import { excluirCategoria, salvarCategoria } from '@/server/modules/catalogo/actions'

type Categoria = {
  id: string
  nome: string
  descricao: string | null
  cor: string
  ordem: number
  ativo: boolean
  produtos: number
}

/** Paleta sugerida: derivada da marca, com matizes distintos entre si. */
const CORES = ['#D24237', '#B3352C', '#6B4A2F', '#2E7D5B', '#B8730F', '#7A4E9B', '#1C1A19', '#948A82']

export function GerenciarCategorias({
  categorias,
  podeGerenciar,
}: {
  categorias: Categoria[]
  podeGerenciar: boolean
}) {
  const [editando, setEditando] = React.useState<Categoria | null>(null)
  const [criando, setCriando] = React.useState(false)
  const [excluirAlvo, setExcluirAlvo] = React.useState<Categoria | null>(null)

  const acaoExcluir = useAcao(excluirCategoria, {
    sucesso: 'Categoria excluída',
    aoConcluir: () => setExcluirAlvo(null),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(categorias.length)}
          </span>{' '}
          categoria(s)
        </p>
        {podeGerenciar ? (
          <Button size="sm" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" />
            Nova categoria
          </Button>
        ) : null}
      </div>

      {categorias.length === 0 ? (
        <EmptyState
          icone={Tags}
          titulo="Nenhuma categoria"
          descricao="Categorias organizam a grade do PDV: Donuts, Cafés, Salgados, Bebidas."
          acao={podeGerenciar ? <Button onClick={() => setCriando(true)}>Criar categoria</Button> : undefined}
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <GripVertical className="size-4 shrink-0 text-body-subtle" aria-hidden />
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] font-display text-xs font-black text-white"
                style={{ background: c.cor }}
              >
                {c.nome.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{c.nome}</p>
                <p className="text-xs text-body-muted">
                  {numero(c.produtos)} produto(s)
                  {c.descricao ? ` · ${c.descricao}` : ''}
                </p>
              </div>
              {!c.ativo ? <Badge tone="neutral">Inativa</Badge> : null}
              {podeGerenciar ? (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.nome}`} onClick={() => setEditando(c)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger"
                    aria-label={`Excluir ${c.nome}`}
                    onClick={() => setExcluirAlvo(c)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {criando || editando ? (
        <FormularioCategoria
          categoria={editando}
          onFechar={() => {
            setCriando(false)
            setEditando(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        aberto={Boolean(excluirAlvo)}
        onAbertoChange={(v) => !v && setExcluirAlvo(null)}
        titulo={`Excluir ${excluirAlvo?.nome}?`}
        descricao={
          excluirAlvo && excluirAlvo.produtos > 0
            ? `Esta categoria tem ${excluirAlvo.produtos} produto(s) — mova-os antes, ou desative a categoria.`
            : 'A categoria será removida.'
        }
        confirmarTexto="Excluir"
        destrutivo
        pendente={acaoExcluir.pendente}
        onConfirmar={() => excluirAlvo && acaoExcluir.executar({ id: excluirAlvo.id })}
      />
    </>
  )
}

function FormularioCategoria({ categoria, onFechar }: { categoria: Categoria | null; onFechar: () => void }) {
  const [nome, setNome] = React.useState(categoria?.nome ?? '')
  const [descricao, setDescricao] = React.useState(categoria?.descricao ?? '')
  const [cor, setCor] = React.useState(categoria?.cor ?? CORES[0])
  const [ordem, setOrdem] = React.useState(categoria?.ordem ?? 0)
  const [ativo, setAtivo] = React.useState(categoria?.ativo ?? true)

  const acao = useAcao(salvarCategoria, { sucesso: (d) => `${d.nome} salva`, aoConcluir: onFechar })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{categoria ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Nome" htmlFor="c-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus placeholder="Donuts" />
          </Field>
          <Field label="Descrição" htmlFor="c-desc">
            <Input id="c-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Field>
          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-body-muted uppercase">Cor</p>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setCor(c)}
                  className={
                    cor === c
                      ? 'size-9 rounded-[10px] ring-2 ring-nobru-500 ring-offset-2'
                      : 'size-9 rounded-[10px] transition-transform hover:scale-105'
                  }
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <FieldRow>
            <Field label="Ordem no PDV" htmlFor="c-ordem" dica="Menor primeiro.">
              <QuantityInput id="c-ordem" value={ordem} onValueChange={setOrdem} step={1} />
            </Field>
          </FieldRow>
          <div className="rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha
              id="c-ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
              label="Ativa"
              descricao="Categorias inativas não aparecem no PDV."
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            onClick={() => acao.executar({ id: categoria?.id, nome, descricao, cor, ordem, ativo })}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
