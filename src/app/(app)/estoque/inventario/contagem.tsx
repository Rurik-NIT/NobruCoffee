'use client'

import * as React from 'react'
import { Ban, CheckCircle2, PackageSearch } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dataHora, moeda, numero, quantidade as fmtQtd } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, QuantityInput, SearchInput } from '@/components/ui/input'
import { Panel } from '@/components/patterns/page'
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { abrirInventario, cancelarInventario, contarItemInventario, finalizarInventario } from '@/server/modules/estoque/actions'

type Item = {
  id: string
  ingredienteId: string
  nome: string
  sku: string
  unidade: string
  quantidadeSistema: number
  quantidadeCongelada: number
  quantidadeContada: number | null
  diferenca: number | null
  custoUnitario: number
  impacto: number | null
}

type Inventario = {
  id: string
  codigo: string
  iniciadoEm: Date | string
  responsavel: string
  observacao: string | null
  itens: Item[]
  contados: number
  divergentes: number
  impactoPrevisto: number
}

export function BotaoAbrirInventario({ tamanho = 'md' }: { tamanho?: 'md' | 'lg' }) {
  const [aberto, setAberto] = React.useState(false)
  const [observacao, setObservacao] = React.useState('')
  const acao = useAcao(abrirInventario, {
    sucesso: (d) => `Inventário ${d.codigo} aberto`,
    aoConcluir: () => setAberto(false),
  })

  return (
    <>
      <Button size={tamanho} onClick={() => setAberto(true)}>
        <PackageSearch />
        Abrir inventário
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent largura="sm">
          <DialogHeader>
            <DialogTitle>Abrir inventário</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-body-muted">
              O sistema gera uma folha com todos os insumos ativos e congela o saldo atual de cada um. A contagem pode ser
              feita ao longo do dia; nada muda no estoque até você finalizar.
            </p>
            <Field label="Observação" htmlFor="inv-obs">
              <Input
                id="inv-obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: contagem mensal da câmara fria"
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button loading={acao.pendente} onClick={() => acao.executar({ observacao })}>
              Abrir e gerar folha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Folha de contagem.
 *
 * O saldo do sistema fica **escondido por padrão**: ver o número esperado antes
 * de contar contamina a contagem, e uma contagem contaminada não serve para
 * apurar diferença. Depois de digitar, a diferença aparece na hora.
 */
export function FolhaContagem({ inventario, podeInventariar }: { inventario: Inventario; podeInventariar: boolean }) {
  const [busca, setBusca] = React.useState('')
  const [mostrarSistema, setMostrarSistema] = React.useState(false)
  const [soPendentes, setSoPendentes] = React.useState(false)
  const [finalizarAberto, setFinalizarAberto] = React.useState(false)
  const [cancelarAberto, setCancelarAberto] = React.useState(false)
  const [rascunho, setRascunho] = React.useState<Record<string, number | null>>({})

  const acaoContar = useAcao(contarItemInventario, { revalidar: true })
  const acaoFinalizar = useAcao(finalizarInventario, {
    sucesso: (d) => `Inventário ${d.codigo} finalizado — ${d.ajustados} ajuste(s), impacto ${moeda(d.ajusteValor)}`,
    aoConcluir: () => setFinalizarAberto(false),
  })
  const acaoCancelar = useAcao(cancelarInventario, { sucesso: 'Inventário cancelado', aoConcluir: () => setCancelarAberto(false) })

  const termo = busca.trim().toLowerCase()
  const visiveis = inventario.itens.filter((i) => {
    if (soPendentes && i.quantidadeContada !== null) return false
    if (!termo) return true
    return i.nome.toLowerCase().includes(termo) || i.sku.toLowerCase().includes(termo)
  })

  function valorDe(item: Item) {
    return rascunho[item.id] !== undefined ? rascunho[item.id] : item.quantidadeContada
  }

  return (
    <>
      <Panel
        className="mb-5"
        titulo={`Inventário ${inventario.codigo}`}
        descricao={`Aberto em ${dataHora(inventario.iniciadoEm)} por ${inventario.responsavel}${
          inventario.observacao ? ` · ${inventario.observacao}` : ''
        }`}
        acao={
          podeInventariar ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => setCancelarAberto(true)}>
                <Ban className="size-3.5" />
                Cancelar
              </Button>
              <Button size="sm" disabled={inventario.contados === 0} onClick={() => setFinalizarAberto(true)}>
                <CheckCircle2 className="size-3.5" />
                Finalizar e ajustar
              </Button>
            </div>
          ) : null
        }
      >
        <div className="grid grid-cols-2 divide-x divide-hairline border-b border-hairline sm:grid-cols-4">
          {[
            { r: 'Itens na folha', v: numero(inventario.itens.length) },
            { r: 'Contados', v: `${numero(inventario.contados)} / ${numero(inventario.itens.length)}` },
            { r: 'Divergentes', v: numero(inventario.divergentes) },
            { r: 'Impacto previsto', v: moeda(inventario.impactoPrevisto) },
          ].map((i) => (
            <div key={i.r} className="px-4 py-3">
              <p className="eyebrow">{i.r}</p>
              <p className="mt-1 font-display text-lg font-extrabold" data-numeric>
                {i.v}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
          <div className="min-w-48 flex-1">
            <SearchInput value={busca} onValueChange={setBusca} placeholder="Buscar insumo na folha…" />
          </div>
          <Button variant={soPendentes ? 'primary' : 'secondary'} size="sm" onClick={() => setSoPendentes((v) => !v)}>
            Só pendentes
          </Button>
          <Button variant={mostrarSistema ? 'primary' : 'secondary'} size="sm" onClick={() => setMostrarSistema((v) => !v)}>
            {mostrarSistema ? 'Esconder saldo do sistema' : 'Mostrar saldo do sistema'}
          </Button>
        </div>

        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Insumo</TH>
                {mostrarSistema ? <TH numerico>Sistema</TH> : null}
                <TH numerico>Contado</TH>
                <TH numerico>Diferença</TH>
                <TH numerico>Impacto</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {visiveis.map((item) => {
                const valor = valorDe(item)
                const diferenca = valor === null ? null : Math.round((valor - item.quantidadeSistema) * 1000) / 1000
                const impacto = diferenca === null ? null : diferenca * item.custoUnitario
                return (
                  <TR key={item.id}>
                    <TD>
                      <span className="text-sm font-semibold">{item.nome}</span>
                      <span className="block text-xs text-body-muted">
                        {item.sku} · controlado em {item.unidade.toLowerCase()}
                      </span>
                    </TD>
                    {mostrarSistema ? <TD numerico>{fmtQtd(item.quantidadeSistema, item.unidade)}</TD> : null}
                    <TD numerico>
                      <div className="ml-auto w-32">
                        <QuantityInput
                          value={valor ?? 0}
                          onValueChange={(v) => setRascunho((atual) => ({ ...atual, [item.id]: v }))}
                          unidade={item.unidade}
                          min={0}
                        />
                      </div>
                    </TD>
                    <TD numerico>
                      {diferenca === null ? (
                        <span className="text-body-subtle">—</span>
                      ) : diferenca === 0 ? (
                        <span className="font-bold text-leaf">bateu</span>
                      ) : (
                        <span className={cn('font-bold', diferenca > 0 ? 'text-caution' : 'text-danger')}>
                          {diferenca > 0 ? '+' : ''}
                          {fmtQtd(diferenca, item.unidade)}
                        </span>
                      )}
                    </TD>
                    <TD numerico>{impacto === null ? '—' : moeda(impacto)}</TD>
                    <TD>
                      {podeInventariar ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={valor === null}
                          loading={acaoContar.pendente}
                          onClick={() => acaoContar.executar({ itemId: item.id, quantidadeContada: valor })}
                        >
                          {item.quantidadeContada !== null ? 'Atualizar' : 'Salvar'}
                        </Button>
                      ) : null}
                      {item.quantidadeContada !== null ? (
                        <Badge tone="leaf" size="sm" className="ml-2">
                          contado
                        </Badge>
                      ) : null}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </TableWrap>
      </Panel>

      <ConfirmDialog
        aberto={finalizarAberto}
        onAbertoChange={setFinalizarAberto}
        titulo={`Finalizar o inventário ${inventario.codigo}?`}
        descricao={
          <>
            {inventario.divergentes} item(ns) divergente(s) serão ajustados para o valor contado, com impacto de{' '}
            {moeda(inventario.impactoPrevisto)} no valor do estoque. Cada ajuste gera um movimento no histórico. Itens não
            contados ficam como estão.
          </>
        }
        confirmarTexto="Finalizar e ajustar estoque"
        pendente={acaoFinalizar.pendente}
        onConfirmar={() => acaoFinalizar.executar({ id: inventario.id })}
      />

      <ConfirmDialog
        aberto={cancelarAberto}
        onAbertoChange={setCancelarAberto}
        titulo={`Cancelar o inventário ${inventario.codigo}?`}
        descricao="A folha e as contagens são descartadas. Nenhum saldo é alterado."
        confirmarTexto="Cancelar inventário"
        destrutivo
        pendente={acaoCancelar.pendente}
        onConfirmar={() => acaoCancelar.executar({ id: inventario.id })}
      />
    </>
  )
}
