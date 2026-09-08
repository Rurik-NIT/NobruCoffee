'use client'

import * as React from 'react'
import { Banknote, Plus } from 'lucide-react'

import { moeda } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input, MoneyInput } from '@/components/ui/input'
import { useAcao } from '@/hooks/use-acao'
import { receberConta, salvarContaReceber } from '@/server/modules/financeiro/actions'

export function AcoesReceber({ conta }: { conta: { id: string; descricao: string; saldo: number } }) {
  const [aberto, setAberto] = React.useState(false)
  const [valor, setValor] = React.useState(conta.saldo)
  const [data, setData] = React.useState(new Date().toISOString().slice(0, 10))

  const acao = useAcao(receberConta, {
    sucesso: (d) => (d.liquidado ? `${d.descricao} recebida` : 'Recebimento parcial registrado'),
    aoConcluir: () => setAberto(false),
  })

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Receber ${conta.descricao}`} onClick={() => setAberto(true)}>
        <Banknote />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent largura="sm">
          <DialogHeader>
            <DialogTitle>Receber {conta.descricao}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
              <span className="text-sm font-semibold">Saldo em aberto</span>
              <span className="font-display text-xl font-extrabold" data-numeric>
                {moeda(conta.saldo)}
              </span>
            </div>
            <Field label="Valor recebido" htmlFor="rec-valor" erro={acao.erroCampos.valor} obrigatorio>
              <MoneyInput id="rec-valor" value={valor} onValueChange={setValor} autoFocus />
            </Field>
            <Field label="Data" htmlFor="rec-data">
              <DateInput id="rec-data" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button loading={acao.pendente} disabled={valor <= 0} onClick={() => acao.executar({ id: conta.id, valor, data })}>
              Registrar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function NovaContaReceber({ categorias }: { categorias: Array<{ id: string; nome: string }> }) {
  const [aberto, setAberto] = React.useState(false)
  const [descricao, setDescricao] = React.useState('')
  const [valor, setValor] = React.useState(0)
  const [vencimento, setVencimento] = React.useState(new Date().toISOString().slice(0, 10))
  const [categoriaId, setCategoriaId] = React.useState<string | null>(null)
  const [observacao, setObservacao] = React.useState('')

  const acao = useAcao(salvarContaReceber, {
    sucesso: (d) => `${d.descricao} lançada`,
    aoConcluir: () => setAberto(false),
  })

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus />
        Nova receita
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent largura="sm">
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Descrição" htmlFor="nr-desc" erro={acao.erroCampos.descricao} obrigatorio>
              <Input
                id="nr-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Aula de confeitaria — turma de outubro"
                autoFocus
              />
            </Field>
            <FieldRow>
              <Field label="Valor" htmlFor="nr-valor" erro={acao.erroCampos.valor} obrigatorio>
                <MoneyInput id="nr-valor" value={valor} onValueChange={setValor} />
              </Field>
              <Field label="Vencimento" htmlFor="nr-venc" obrigatorio>
                <DateInput id="nr-venc" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </Field>
            </FieldRow>
            <Field label="Categoria" htmlFor="nr-cat">
              <Combobox
                id="nr-cat"
                value={categoriaId}
                onValueChange={setCategoriaId}
                permiteLimpar
                opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
                placeholder="Sem categoria"
              />
            </Field>
            <Field label="Observação" htmlFor="nr-obs">
              <Input id="nr-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              loading={acao.pendente}
              disabled={descricao.trim().length < 3 || valor <= 0}
              onClick={() => acao.executar({ descricao, valor, vencimento, categoriaId, observacao })}
            >
              Lançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
