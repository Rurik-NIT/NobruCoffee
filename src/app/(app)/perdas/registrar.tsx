'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'

import { moeda, quantidade as fmtQtd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, QuantityInput } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/toggles'
import { useAcao } from '@/hooks/use-acao'
import { registrarPerda } from '@/server/modules/perdas/actions'

const MOTIVOS = [
  { valor: 'NAO_VENDIDO', rotulo: 'Não vendido (fim do dia)' },
  { valor: 'QUEIMADO', rotulo: 'Queimado' },
  { valor: 'DANIFICADO', rotulo: 'Danificado / caiu' },
  { valor: 'VENCIDO', rotulo: 'Vencido' },
  { valor: 'ERRO_PRODUCAO', rotulo: 'Erro de produção' },
  { valor: 'EMBALAGEM', rotulo: 'Embalagem violada' },
  { valor: 'CORTESIA', rotulo: 'Cortesia ao cliente' },
  { valor: 'OUTRO', rotulo: 'Outro' },
]

/**
 * Registro de perda.
 *
 * A tela mostra o custo antes de confirmar — o número que o dono quer ver é
 * quanto acabou de sair do bolso, não quantas unidades foram para o lixo.
 */
export function RegistrarPerda({
  ingredientes,
  produtos,
}: {
  ingredientes: Array<{ id: string; nome: string; sku: string; unidade: string; custoMedio: number; estoqueAtual: number }>
  produtos: Array<{ id: string; nome: string; sku: string; unidade: string }>
}) {
  const [aberto, setAberto] = React.useState(false)
  const [tipo, setTipo] = React.useState<'produto' | 'insumo'>('produto')
  const [itemId, setItemId] = React.useState<string | null>(null)
  const [quantidade, setQuantidade] = React.useState(1)
  const [motivo, setMotivo] = React.useState('NAO_VENDIDO')
  const [observacao, setObservacao] = React.useState('')

  const acao = useAcao(registrarPerda, {
    sucesso: (d) => `Perda de ${d.nome} registrada — ${moeda(d.custoEstimado)}`,
    aoConcluir: () => {
      setAberto(false)
      setItemId(null)
      setQuantidade(1)
      setObservacao('')
    },
  })

  const insumo = tipo === 'insumo' && itemId ? ingredientes.find((i) => i.id === itemId) : null
  const custoPrevisto = insumo ? insumo.custoMedio * quantidade : null

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Trash2 />
        Registrar perda
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent largura="sm">
          <DialogHeader>
            <DialogTitle>Registrar perda</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <SegmentedControl
              value={tipo}
              onValueChange={(v) => {
                setTipo(v)
                setItemId(null)
              }}
              tamanho="touch"
              opcoes={[
                { valor: 'produto', rotulo: 'Produto acabado' },
                { valor: 'insumo', rotulo: 'Insumo' },
              ]}
            />

            <Field label={tipo === 'produto' ? 'Produto' : 'Insumo'} htmlFor="p-item" erro={acao.erroCampos.produtoId} obrigatorio>
              <Combobox
                id="p-item"
                value={itemId}
                onValueChange={setItemId}
                opcoes={
                  tipo === 'produto'
                    ? produtos.map((p) => ({ valor: p.id, rotulo: p.nome, apoio: p.sku, busca: p.sku }))
                    : ingredientes.map((i) => ({
                        valor: i.id,
                        rotulo: i.nome,
                        apoio: `${fmtQtd(i.estoqueAtual, i.unidade)} · ${moeda(i.custoMedio)}/${i.unidade.toLowerCase()}`,
                        busca: i.sku,
                      }))
                }
                placeholder="Escolha o item"
              />
            </Field>

            <Field label="Quantidade perdida" htmlFor="p-qtd" erro={acao.erroCampos.quantidade} obrigatorio>
              <QuantityInput
                id="p-qtd"
                value={quantidade}
                onValueChange={setQuantidade}
                unidade={insumo?.unidade ?? 'un'}
                step={insumo && insumo.unidade !== 'UN' ? 10 : 1}
                min={0}
              />
            </Field>

            <Field label="Motivo" htmlFor="p-motivo" obrigatorio>
              <SelectSimples id="p-motivo" value={motivo} onValueChange={setMotivo} opcoes={MOTIVOS} />
            </Field>

            <Field label="Observação" htmlFor="p-obs">
              <Input
                id="p-obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: caiu ao transferir para a vitrine"
              />
            </Field>

            {custoPrevisto !== null && custoPrevisto > 0 ? (
              <p className="rounded-control bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
                Custo estimado da perda: <span data-numeric>{moeda(custoPrevisto)}</span>
              </p>
            ) : null}

            <p className="text-xs text-body-subtle">
              Registrar a perda baixa o estoque na hora e entra no relatório de perdas do mês.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={acao.pendente}
              disabled={!itemId || quantidade <= 0}
              onClick={() =>
                acao.executar({
                  tipo,
                  produtoId: tipo === 'produto' ? itemId : null,
                  ingredienteId: tipo === 'insumo' ? itemId : null,
                  quantidade,
                  motivo: motivo as never,
                  observacao,
                })
              }
            >
              Registrar perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
