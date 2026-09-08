'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowDownToLine, ArrowUpFromLine, Lock, Printer, Receipt, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dataHora, hora, moeda, numero } from '@/lib/format'
import { brl } from '@/lib/money'
import { Badge, StatusDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, MoneyInput } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/toggles'
import { Panel, TotalRow } from '@/components/patterns/page'
import { useAcao } from '@/hooks/use-acao'
import { abrirCaixa, conferirCaixa, fecharCaixa, lancarMovimentoCaixa } from '@/server/modules/caixa/actions'
import type { ResumoCaixa } from '@/server/modules/caixa/service'

/** Resumo serializável do caixa (datas viram string na fronteira server→client). */
type ResumoUI = Omit<ResumoCaixa, 'abertoEm' | 'fechadoEm'> & { abertoEm: string | Date; fechadoEm: string | Date | null }

export function BotaoAbrirCaixa({ tamanho = 'md' }: { tamanho?: 'md' | 'lg' }) {
  const [aberto, setAberto] = React.useState(false)
  const [saldo, setSaldo] = React.useState(0)
  const [observacao, setObservacao] = React.useState('')
  const acao = useAcao(abrirCaixa, {
    sucesso: (d) => `Caixa ${d.codigo} aberto`,
    aoConcluir: () => setAberto(false),
  })

  return (
    <>
      <Button size={tamanho} onClick={() => setAberto(true)}>
        <Wallet />
        Abrir caixa
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent largura="sm">
          <DialogHeader>
            <DialogTitle>Abrir caixa</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field
              label="Fundo de troco"
              htmlFor="saldo-inicial"
              erro={acao.erroCampos.saldoInicial}
              obrigatorio
              dica="Quanto de dinheiro está na gaveta agora."
            >
              <MoneyInput id="saldo-inicial" value={saldo} onValueChange={setSaldo} autoFocus />
            </Field>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 150, 200].map((v) => (
                <Button key={v} variant="secondary" size="sm" onClick={() => setSaldo(v)}>
                  {moeda(v)}
                </Button>
              ))}
            </div>
            <Field label="Observação" htmlFor="obs-abertura">
              <Input id="obs-abertura" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button loading={acao.pendente} onClick={() => acao.executar({ saldoInicial: saldo, observacao })}>
              Abrir caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Painel do caixa aberto.
 *
 * O número grande é o **saldo esperado em espécie** — o que deve estar na
 * gaveta. Cartão e PIX aparecem separados justamente para não se somarem ao
 * dinheiro na hora de conferir.
 */
export function PainelCaixaAberto({
  resumo,
  podeSangria,
  podeFechar,
}: {
  resumo: ResumoUI
  podeSangria: boolean
  podeFechar: boolean
}) {
  const [movimentoAberto, setMovimentoAberto] = React.useState(false)
  const [fechamentoAberto, setFechamentoAberto] = React.useState(false)

  return (
    <>
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="chalkboard flex flex-wrap items-end justify-between gap-4 px-5 py-5">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-on-dark-muted uppercase">
                <StatusDot tone="leaf" pulse />
                Caixa {resumo.codigo} aberto
              </p>
              <p className="mt-2 font-display text-4xl font-black text-cream" data-numeric>
                {moeda(resumo.saldoEsperado)}
              </p>
              <p className="mt-1 text-xs text-on-dark-muted">
                esperado em espécie · aberto às {hora(resumo.abertoEm)} por {resumo.usuarioAbertura}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {podeSangria ? (
                <Button variant="secondary" size="sm" onClick={() => setMovimentoAberto(true)}>
                  <ArrowUpFromLine className="size-3.5" />
                  Sangria / suprimento
                </Button>
              ) : null}
              {podeFechar ? (
                <Button size="sm" onClick={() => setFechamentoAberto(true)}>
                  <Lock className="size-3.5" />
                  Fechar caixa
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline sm:grid-cols-4">
            {[
              { r: 'Vendas', v: moeda(resumo.totalVendas), a: `${numero(resumo.pedidos)} pedidos` },
              { r: 'Ticket médio', v: moeda(resumo.ticketMedio) },
              { r: 'Em dinheiro', v: moeda(resumo.vendasEspecie) },
              { r: 'Sangrias', v: moeda(resumo.sangrias), a: resumo.despesas > 0 ? `+ ${moeda(resumo.despesas)} despesas` : undefined },
            ].map((i) => (
              <div key={i.r} className="px-4 py-3">
                <p className="eyebrow">{i.r}</p>
                <p className="mt-1 font-display text-lg font-extrabold" data-numeric>
                  {i.v}
                </p>
                {i.a ? <p className="text-[11px] text-body-muted">{i.a}</p> : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel titulo="Por forma de pagamento">
          {resumo.porForma.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-body-muted">Nenhuma venda neste caixa ainda.</p>
          ) : (
            <div className="space-y-2 px-5 py-4">
              {resumo.porForma.map((f) => (
                <div key={f.nome} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    {f.nome}
                    {f.contaNoCaixa ? <Badge tone="leaf" size="sm">gaveta</Badge> : null}
                  </span>
                  <span className="font-bold" data-numeric>
                    {moeda(f.total)}
                  </span>
                </div>
              ))}
              <TotalRow rotulo="Total recebido" destaque>
                {moeda(resumo.totalVendas)}
              </TotalRow>
            </div>
          )}
        </Panel>
      </div>

      {movimentoAberto ? <DialogoMovimento caixaId={resumo.id} saldo={resumo.saldoEsperado} onFechar={() => setMovimentoAberto(false)} /> : null}
      {fechamentoAberto ? <DialogoFechamento resumo={resumo} onFechar={() => setFechamentoAberto(false)} /> : null}
    </>
  )
}

function DialogoMovimento({
  caixaId,
  saldo,
  onFechar,
}: {
  caixaId: string
  saldo: number
  onFechar: () => void
}) {
  const [tipo, setTipo] = React.useState<'SANGRIA' | 'SUPRIMENTO' | 'DESPESA'>('SANGRIA')
  const [valor, setValor] = React.useState(0)
  const [descricao, setDescricao] = React.useState('')
  const acao = useAcao(lancarMovimentoCaixa, {
    sucesso: (d) => `${d.tipo === 'SUPRIMENTO' ? 'Suprimento' : d.tipo === 'DESPESA' ? 'Despesa' : 'Sangria'} de ${moeda(d.valor)} registrada`,
    aoConcluir: onFechar,
  })

  const explicacoes: Record<string, string> = {
    SANGRIA: 'Retirada de dinheiro da gaveta para o cofre ou banco.',
    SUPRIMENTO: 'Entrada de dinheiro na gaveta (reforço de troco).',
    DESPESA: 'Pagamento feito com o dinheiro do caixa. Também entra no financeiro como despesa liquidada.',
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Movimento de caixa</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <SegmentedControl
            value={tipo}
            onValueChange={setTipo}
            tamanho="touch"
            opcoes={[
              { valor: 'SANGRIA', rotulo: 'Sangria', icone: ArrowUpFromLine },
              { valor: 'SUPRIMENTO', rotulo: 'Suprimento', icone: ArrowDownToLine },
              { valor: 'DESPESA', rotulo: 'Despesa', icone: Receipt },
            ]}
          />
          <p className="text-xs text-body-muted">{explicacoes[tipo]}</p>
          <Field
            label="Valor"
            htmlFor="mov-valor"
            erro={acao.erroCampos.valor}
            obrigatorio
            dica={tipo !== 'SUPRIMENTO' ? `Disponível na gaveta: ${moeda(saldo)}` : undefined}
          >
            <MoneyInput id="mov-valor" value={valor} onValueChange={setValor} autoFocus />
          </Field>
          <Field label="Descrição" htmlFor="mov-desc" erro={acao.erroCampos.descricao} obrigatorio>
            <Input
              id="mov-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={tipo === 'DESPESA' ? 'Ex.: gelo para a vitrine' : 'Ex.: retirada para o cofre'}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={valor <= 0 || descricao.trim().length < 3}
            onClick={() => acao.executar({ caixaId, tipo, valor, descricao })}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoFechamento({ resumo, onFechar }: { resumo: ResumoUI; onFechar: () => void }) {
  const [contado, setContado] = React.useState(0)
  const [observacao, setObservacao] = React.useState('')
  const [resultado, setResultado] = React.useState<{ codigo: string; diferenca: number; esperado: number; vendas: number } | null>(null)

  const acao = useAcao(fecharCaixa, {
    aoConcluir: (d) => setResultado(d),
  })

  const diferenca = brl(contado - resumo.saldoEsperado)

  if (resultado) {
    return (
      <Dialog open onOpenChange={(v) => !v && onFechar()}>
        <DialogContent largura="sm" className="bg-paper">
          <DialogHeader>
            <DialogTitle>Caixa {resultado.codigo} fechado</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="ticket rounded-card px-4 py-4 font-mono text-xs">
              <p className="text-center font-display text-sm font-black">FECHAMENTO DE CAIXA</p>
              <p className="mt-0.5 text-center text-body-muted">{dataHora(new Date())}</p>
              <div className="my-3 border-t border-dashed border-hairline-strong" />
              {[
                ['Fundo de troco', moeda(resumo.saldoInicial)],
                ['Vendas em dinheiro', moeda(resumo.vendasEspecie)],
                ['Suprimentos', moeda(resumo.suprimentos)],
                ['Sangrias', `−${moeda(resumo.sangrias)}`],
                ['Despesas', `−${moeda(resumo.despesas)}`],
              ].map(([r, v]) => (
                <div key={r} className="flex justify-between">
                  <span className="text-body-muted">{r}</span>
                  <span data-numeric>{v}</span>
                </div>
              ))}
              <div className="my-2 border-t border-dashed border-hairline-strong" />
              <div className="flex justify-between font-bold">
                <span>Esperado</span>
                <span data-numeric>{moeda(resultado.esperado)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Contado</span>
                <span data-numeric>{moeda(contado)}</span>
              </div>
              <div
                className={cn(
                  'mt-1 flex justify-between border-t-2 border-dashed border-hairline-strong pt-2 font-display text-base font-extrabold',
                  resultado.diferenca === 0 ? 'text-leaf' : 'text-danger',
                )}
              >
                <span className="font-sans">Diferença</span>
                <span data-numeric>{moeda(resultado.diferenca)}</span>
              </div>
              <div className="my-3 border-t border-dashed border-hairline-strong" />
              <div className="flex justify-between">
                <span className="text-body-muted">Total de vendas</span>
                <span data-numeric>{moeda(resultado.vendas)}</span>
              </div>
              {resumo.porForma.map((f) => (
                <div key={f.nome} className="flex justify-between text-[11px]">
                  <span className="text-body-muted">· {f.nome}</span>
                  <span data-numeric>{moeda(f.total)}</span>
                </div>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" className="no-print" onClick={() => window.print()}>
              <Printer />
              Imprimir
            </Button>
            <Button onClick={onFechar}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Fechar caixa {resumo.codigo}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-body-muted">
            Conte o dinheiro em espécie da gaveta e informe o valor. Não olhe o esperado antes — a conferência só vale se o
            número vier da contagem.
          </p>
          <Field label="Valor contado na gaveta" htmlFor="contado" erro={acao.erroCampos.saldoFinalInformado} obrigatorio>
            <MoneyInput id="contado" value={contado} onValueChange={setContado} autoFocus />
          </Field>

          {contado > 0 ? (
            <div className="space-y-1 rounded-control bg-paper-sunken px-3 py-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-body-muted">Esperado</span>
                <span data-numeric>{moeda(resumo.saldoEsperado)}</span>
              </div>
              <div
                className={cn(
                  'flex justify-between font-bold',
                  diferenca === 0 ? 'text-leaf' : Math.abs(diferenca) < 5 ? 'text-caution' : 'text-danger',
                )}
              >
                <span>{diferenca === 0 ? 'Bateu' : diferenca > 0 ? 'Sobra' : 'Falta'}</span>
                <span data-numeric>{moeda(Math.abs(diferenca))}</span>
              </div>
            </div>
          ) : null}

          <Field
            label="Observação do fechamento"
            htmlFor="obs-fech"
            dica="Se houver diferença, explique aqui. O texto fica no log de auditoria."
          >
            <Input id="obs-fech" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar} disabled={acao.pendente}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={contado <= 0}
            onClick={() => acao.executar({ caixaId: resumo.id, saldoFinalInformado: contado, observacao })}
          >
            Fechar caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Conferência de divergência — só quem tem permissão vê este botão. */
export function BotaoConferir({ caixaId, codigo, diferenca }: { caixaId: string; codigo: string; diferenca: number }) {
  const [aberto, setAberto] = React.useState(false)
  const [observacao, setObservacao] = React.useState('')
  const acao = useAcao(conferirCaixa, {
    sucesso: (d) => `Caixa ${d.codigo} conferido`,
    aoConcluir: () => setAberto(false),
  })

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setAberto(true)}>
        Conferir divergência
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent largura="sm">
          <DialogHeader>
            <DialogTitle>Conferir caixa {codigo}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-body-muted">
              Diferença apurada: <span className="font-bold text-danger">{moeda(diferenca)}</span>. Registre a explicação
              para encerrar o assunto.
            </p>
            <Field label="O que aconteceu" htmlFor="conf-obs" erro={acao.erroCampos.observacao} obrigatorio>
              <Input
                id="conf-obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: troco dado errado no pedido PED-000142"
                autoFocus
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              loading={acao.pendente}
              disabled={observacao.trim().length < 3}
              onClick={() => acao.executar({ caixaId, observacao })}
            >
              Registrar conferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
