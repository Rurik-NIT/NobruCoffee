'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, CalendarClock, Merge, Plus, Split, Unlock, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { duracao, hora, moeda, numero, rotulo } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldRow } from '@/components/ui/field'
import { Input, DateTimeInput, QuantityInput } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { Panel } from '@/components/patterns/page'
import { toast } from '@/components/ui/toast'
import { useAcao } from '@/hooks/use-acao'
import { abrirPedido } from '@/server/modules/pedidos/actions'
import {
  calcularDivisao,
  liberarMesa,
  reservarMesa,
  salvarMesa,
  transferirMesa,
  unirMesas,
} from '@/server/modules/mesas/actions'

type Mesa = {
  id: string
  numero: number
  nome: string | null
  capacidade: number
  area: string | null
  status: string
  ativo: boolean
  reservaNome: string | null
  reservaHora: string | null
  pedido: {
    id: string
    codigo: string
    total: number
    itens: number
    abertoEm: string
    cliente: string | null
    operador: string
  } | null
}

const TONS: Record<string, { borda: string; fundo: string; badge: 'leaf' | 'caution' | 'danger' | 'neutral' | 'brand' }> = {
  LIVRE: { borda: 'border-hairline-strong', fundo: 'bg-paper-raised', badge: 'neutral' },
  OCUPADA: { borda: 'border-nobru-400', fundo: 'bg-nobru-50', badge: 'brand' },
  AGUARDANDO_PAGAMENTO: { borda: 'border-caution', fundo: 'bg-caution-soft', badge: 'caution' },
  RESERVADA: { borda: 'border-info', fundo: 'bg-info-soft', badge: 'info' as never },
  INATIVA: { borda: 'border-hairline', fundo: 'bg-paper-sunken', badge: 'neutral' },
}

/**
 * Mapa de mesas.
 *
 * Um grid de cartões grandes, não uma tabela: no salão o garçom procura "a mesa
 * 7", e o número precisa ser a primeira coisa legível. A cor diz o estado e o
 * tempo aberto aparece em toda mesa ocupada — é o dado que decide se alguém vai
 * até lá oferecer a sobremesa ou fechar a conta.
 */
export function MapaMesas({
  mesas,
  areas,
  podeGerenciar,
}: {
  mesas: Mesa[]
  areas: string[]
  podeGerenciar: boolean
}) {
  const router = useRouter()
  const [areaAtiva, setAreaAtiva] = React.useState<string | null>(null)
  const [formAberto, setFormAberto] = React.useState(false)
  const [mesaEditando, setMesaEditando] = React.useState<Mesa | null>(null)
  const [reservaAlvo, setReservaAlvo] = React.useState<Mesa | null>(null)
  const [transferirAlvo, setTransferirAlvo] = React.useState<Mesa | null>(null)
  const [unirAlvo, setUnirAlvo] = React.useState<Mesa | null>(null)
  const [dividirAlvo, setDividirAlvo] = React.useState<Mesa | null>(null)

  const acaoAbrir = useAcao(abrirPedido, { revalidar: false })
  const acaoLiberar = useAcao(liberarMesa, { sucesso: (d) => `Mesa ${d.numero} liberada` })

  const visiveis = areaAtiva ? mesas.filter((m) => m.area === areaAtiva) : mesas
  const ocupadas = mesas.filter((m) => m.status === 'OCUPADA')
  const consumoAberto = ocupadas.reduce((a, m) => a + (m.pedido?.total ?? 0), 0)

  async function abrirMesa(mesa: Mesa) {
    if (mesa.pedido) {
      router.push(`/pdv?pedido=${mesa.pedido.id}`)
      return
    }
    const r = await acaoAbrir.executar({ tipo: 'MESA', mesaId: mesa.id })
    if (r.ok) router.push(`/pdv?pedido=${r.dados.id}`)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAreaAtiva(null)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
              areaAtiva === null ? 'border-ink bg-ink text-cream' : 'border-hairline-strong bg-paper-raised text-body-muted',
            )}
          >
            Todo o salão
          </button>
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAreaAtiva(a)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors',
                areaAtiva === a ? 'border-ink bg-ink text-cream' : 'border-hairline-strong bg-paper-raised text-body-muted',
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            {numero(ocupadas.length)}/{numero(mesas.length)} ocupadas
          </Badge>
          <Badge tone="neutral">{moeda(consumoAberto)} em aberto</Badge>
          {podeGerenciar ? (
            <Button
              size="sm"
              onClick={() => {
                setMesaEditando(null)
                setFormAberto(true)
              }}
            >
              <Plus className="size-3.5" />
              Nova mesa
            </Button>
          ) : null}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visiveis.map((mesa) => {
          const tom = TONS[mesa.status] ?? TONS.LIVRE
          const minutos = mesa.pedido ? Math.round((Date.now() - new Date(mesa.pedido.abertoEm).getTime()) / 60_000) : 0
          return (
            <li key={mesa.id}>
              <div className={cn('flex h-full flex-col rounded-card border-2 p-3.5 shadow-raise', tom.borda, tom.fundo)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-2xl leading-none font-black" data-numeric>
                      {mesa.numero}
                    </p>
                    {mesa.nome ? <p className="mt-0.5 text-xs font-semibold text-body-muted">{mesa.nome}</p> : null}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-body-subtle">
                    <Users className="size-3" />
                    {mesa.capacidade}
                  </span>
                </div>

                <div className="mt-2 flex-1">
                  {mesa.pedido ? (
                    <div className="space-y-0.5 text-xs">
                      <p className="font-mono font-bold text-nobru-700">{mesa.pedido.codigo}</p>
                      <p className="text-body-muted">
                        {numero(mesa.pedido.itens)} item(ns) · {duracao(minutos)}
                      </p>
                      {mesa.pedido.cliente ? <p className="truncate text-body-muted">{mesa.pedido.cliente}</p> : null}
                      <p className="font-display text-base font-extrabold" data-numeric>
                        {moeda(mesa.pedido.total)}
                      </p>
                    </div>
                  ) : mesa.status === 'RESERVADA' ? (
                    <div className="text-xs">
                      <p className="font-semibold">{mesa.reservaNome}</p>
                      <p className="text-body-muted">{mesa.reservaHora ? hora(mesa.reservaHora) : '—'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-body-subtle">{rotulo('statusMesa', mesa.status)}</p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1"
                    variant={mesa.pedido ? 'primary' : 'secondary'}
                    disabled={!mesa.ativo || acaoAbrir.pendente}
                    onClick={() => abrirMesa(mesa)}
                  >
                    {mesa.pedido ? 'Abrir conta' : 'Abrir mesa'}
                  </Button>
                  {podeGerenciar ? (
                    <>
                      {mesa.pedido ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Transferir mesa ${mesa.numero}`}
                            onClick={() => setTransferirAlvo(mesa)}
                          >
                            <ArrowRightLeft />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Juntar mesa ${mesa.numero}`}
                            onClick={() => setUnirAlvo(mesa)}
                          >
                            <Merge />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Dividir conta da mesa ${mesa.numero}`}
                            onClick={() => setDividirAlvo(mesa)}
                          >
                            <Split />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Reservar mesa ${mesa.numero}`}
                            onClick={() => setReservaAlvo(mesa)}
                          >
                            <CalendarClock />
                          </Button>
                          {mesa.status === 'RESERVADA' ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Liberar mesa ${mesa.numero}`}
                              onClick={() => acaoLiberar.executar({ id: mesa.id })}
                            >
                              <Unlock />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {formAberto ? <FormularioMesa mesa={mesaEditando} onFechar={() => setFormAberto(false)} /> : null}
      {reservaAlvo ? <DialogoReserva mesa={reservaAlvo} onFechar={() => setReservaAlvo(null)} /> : null}
      {transferirAlvo ? (
        <DialogoTransferir
          mesa={transferirAlvo}
          destinos={mesas.filter((m) => m.id !== transferirAlvo.id && m.status !== 'OCUPADA' && m.ativo)}
          onFechar={() => setTransferirAlvo(null)}
        />
      ) : null}
      {unirAlvo ? (
        <DialogoUnir
          mesa={unirAlvo}
          outras={mesas.filter((m) => m.id !== unirAlvo.id && m.pedido)}
          onFechar={() => setUnirAlvo(null)}
        />
      ) : null}
      {dividirAlvo?.pedido ? <DialogoDividir mesa={dividirAlvo} onFechar={() => setDividirAlvo(null)} /> : null}
    </>
  )
}

function FormularioMesa({ mesa, onFechar }: { mesa: Mesa | null; onFechar: () => void }) {
  const [numero, setNumero] = React.useState(mesa?.numero ?? 1)
  const [nome, setNome] = React.useState(mesa?.nome ?? '')
  const [capacidade, setCapacidade] = React.useState(mesa?.capacidade ?? 2)
  const [area, setArea] = React.useState(mesa?.area ?? '')
  const acao = useAcao(salvarMesa, { sucesso: (d) => `Mesa ${d.numero} salva`, aoConcluir: onFechar })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{mesa ? `Editar mesa ${mesa.numero}` : 'Nova mesa'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <FieldRow>
            <Field label="Número" htmlFor="m-num" erro={acao.erroCampos.numero} obrigatorio>
              <QuantityInput id="m-num" value={numero} onValueChange={setNumero} step={1} min={1} />
            </Field>
            <Field label="Lugares" htmlFor="m-cap">
              <QuantityInput id="m-cap" value={capacidade} onValueChange={setCapacidade} step={1} min={1} />
            </Field>
          </FieldRow>
          <Field label="Nome (opcional)" htmlFor="m-nome" dica="Ex.: Balcão da janela">
            <Input id="m-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Área" htmlFor="m-area" dica="Ex.: Salão, Calçada, Mezanino">
            <Input id="m-area" value={area} onChange={(e) => setArea(e.target.value)} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            onClick={() => acao.executar({ id: mesa?.id, numero, nome, capacidade, area, ativo: true })}
          >
            Salvar mesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoReserva({ mesa, onFechar }: { mesa: Mesa; onFechar: () => void }) {
  const [nome, setNome] = React.useState('')
  const [quando, setQuando] = React.useState('')
  const acao = useAcao(reservarMesa, { sucesso: (d) => `Mesa ${d.numero} reservada`, aoConcluir: onFechar })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Reservar mesa {mesa.numero}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Nome da reserva" htmlFor="r-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="r-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </Field>
          <Field label="Data e hora" htmlFor="r-hora" erro={acao.erroCampos.hora} obrigatorio>
            <DateTimeInput id="r-hora" value={quando} onChange={(e) => setQuando(e.target.value)} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button loading={acao.pendente} disabled={!nome || !quando} onClick={() => acao.executar({ id: mesa.id, nome, hora: quando })}>
            Reservar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoTransferir({ mesa, destinos, onFechar }: { mesa: Mesa; destinos: Mesa[]; onFechar: () => void }) {
  const [destino, setDestino] = React.useState(destinos[0]?.id ?? '')
  const acao = useAcao(transferirMesa, {
    sucesso: (d) => `${d.codigo} foi para a mesa ${d.numero}`,
    aoConcluir: onFechar,
  })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Transferir mesa {mesa.numero}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-body-muted">
            O pedido <span className="font-mono font-bold">{mesa.pedido?.codigo}</span> continua o mesmo — muda apenas de
            lugar.
          </p>
          {destinos.length === 0 ? (
            <p className="rounded-control bg-caution-soft px-3 py-2 text-sm font-semibold text-caution">
              Nenhuma mesa livre para receber a transferência.
            </p>
          ) : (
            <Field label="Mesa de destino" htmlFor="t-destino">
              <SelectSimples
                id="t-destino"
                value={destino}
                onValueChange={setDestino}
                opcoes={destinos.map((d) => ({ valor: d.id, rotulo: `Mesa ${d.numero}${d.nome ? ` · ${d.nome}` : ''}` }))}
              />
            </Field>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={!destino || !mesa.pedido}
            onClick={() => mesa.pedido && acao.executar({ pedidoId: mesa.pedido.id, mesaDestinoId: destino })}
          >
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoUnir({ mesa, outras, onFechar }: { mesa: Mesa; outras: Mesa[]; onFechar: () => void }) {
  const [destino, setDestino] = React.useState(outras[0]?.pedido?.id ?? '')
  const acao = useAcao(unirMesas, {
    sucesso: (d) => `Contas unidas em ${d.codigo} — total ${moeda(d.total)}`,
    aoConcluir: onFechar,
  })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Juntar mesa {mesa.numero}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-body-muted">
            Os itens da mesa {mesa.numero} passam para a conta escolhida, e a mesa {mesa.numero} é liberada.
          </p>
          {outras.length === 0 ? (
            <p className="rounded-control bg-caution-soft px-3 py-2 text-sm font-semibold text-caution">
              Não há outra mesa com conta aberta para juntar.
            </p>
          ) : (
            <Field label="Juntar na conta da" htmlFor="u-destino">
              <SelectSimples
                id="u-destino"
                value={destino}
                onValueChange={setDestino}
                opcoes={outras.map((m) => ({
                  valor: m.pedido!.id,
                  rotulo: `Mesa ${m.numero} · ${m.pedido!.codigo} · ${moeda(m.pedido!.total)}`,
                }))}
              />
            </Field>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={!destino || !mesa.pedido}
            onClick={() => mesa.pedido && acao.executar({ pedidoOrigemId: mesa.pedido.id, pedidoDestinoId: destino })}
          >
            Juntar contas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DialogoDividir({ mesa, onFechar }: { mesa: Mesa; onFechar: () => void }) {
  const [pessoas, setPessoas] = React.useState(2)
  const [partes, setPartes] = React.useState<number[] | null>(null)
  const acao = useAcao(calcularDivisao, {
    revalidar: false,
    aoConcluir: (d) => setPartes(d.partes),
  })

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Dividir a conta da mesa {mesa.numero}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-body-muted">
            Total de <span className="font-bold">{moeda(mesa.pedido!.total)}</span>. A divisão é para você informar cada
            pessoa — a cobrança continua em uma comanda só, com pagamento dividido no fechamento.
          </p>
          <Field label="Quantas pessoas" htmlFor="d-pessoas">
            <QuantityInput id="d-pessoas" value={pessoas} onValueChange={setPessoas} step={1} min={2} />
          </Field>
          <Button
            variant="secondary"
            full
            loading={acao.pendente}
            onClick={() => mesa.pedido && acao.executar({ pedidoId: mesa.pedido.id, pessoas })}
          >
            Calcular
          </Button>
          {partes ? (
            <ul className="divide-y divide-hairline rounded-control border border-hairline">
              {partes.map((valor, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-semibold">Pessoa {i + 1}</span>
                  <span className="font-bold" data-numeric>
                    {moeda(valor)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Fechar
          </Button>
          {partes ? (
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(partes.map((v, i) => `Pessoa ${i + 1}: ${moeda(v)}`).join('\n'))
                  .then(() => toast.success('Divisão copiada'))
                  .catch(() => toast.error('Não foi possível copiar'))
              }}
            >
              Copiar divisão
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
