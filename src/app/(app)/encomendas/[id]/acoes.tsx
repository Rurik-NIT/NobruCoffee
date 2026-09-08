'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, CheckCircle2, ChefHat, PackageCheck, Wallet } from 'lucide-react'

import { moeda } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Field } from '@/components/ui/field'
import { MoneyInput } from '@/components/ui/input'
import { Panel } from '@/components/patterns/page'
import { SelectSimples } from '@/components/ui/select'
import { useAcao } from '@/hooks/use-acao'
import { avancarEncomenda, gerarProducaoDaEncomenda, receberEncomenda } from '@/server/modules/encomendas/actions'

/**
 * Avanço do fluxo da encomenda.
 *
 * As transições são fixas — Orçamento → Confirmada → Em produção → Pronta →
 * Entregue — e o botão mostra apenas o próximo passo válido. Entregar exige o
 * saldo recebido, para nenhuma encomenda sair da loja sem estar paga.
 */
export function AcoesEncomenda({
  encomenda,
  podeProduzir,
}: {
  encomenda: { id: string; codigo: string; status: string; saldo: number }
  podeProduzir: boolean
}) {
  const router = useRouter()
  const [cancelarAberto, setCancelarAberto] = React.useState(false)

  const acaoAvancar = useAcao(avancarEncomenda, {
    sucesso: (d) => `Encomenda ${d.codigo}: ${d.status.toLowerCase().replace('_', ' ')}`,
  })
  const acaoCancelar = useAcao(avancarEncomenda, {
    sucesso: 'Encomenda cancelada',
    aoConcluir: () => setCancelarAberto(false),
  })
  const acaoProducao = useAcao(gerarProducaoDaEncomenda, {
    sucesso: (d) => `Ordem ${d.ordemCodigo} criada com ${d.itens} item(ns)`,
    aoConcluir: (d) => router.push(`/producao/ordens/${d.ordemId}`),
  })

  const proximo: Record<string, { status: 'CONFIRMADA' | 'EM_PRODUCAO' | 'PRONTA' | 'ENTREGUE'; rotulo: string; icone: React.ComponentType<{ className?: string }> } | undefined> = {
    ORCAMENTO: { status: 'CONFIRMADA', rotulo: 'Confirmar encomenda', icone: CheckCircle2 },
    CONFIRMADA: { status: 'EM_PRODUCAO', rotulo: 'Iniciar produção', icone: ChefHat },
    EM_PRODUCAO: { status: 'PRONTA', rotulo: 'Marcar como pronta', icone: PackageCheck },
    PRONTA: { status: 'ENTREGUE', rotulo: 'Marcar como entregue', icone: CheckCircle2 },
  }

  const passo = proximo[encomenda.status]
  const encerrada = encomenda.status === 'ENTREGUE' || encomenda.status === 'CANCELADA'
  const Icone = passo?.icone

  return (
    <>
      {podeProduzir && (encomenda.status === 'CONFIRMADA' || encomenda.status === 'EM_PRODUCAO') ? (
        <Button variant="secondary" loading={acaoProducao.pendente} onClick={() => acaoProducao.executar({ id: encomenda.id })}>
          <ChefHat />
          Gerar ordem de produção
        </Button>
      ) : null}

      {passo ? (
        <Button
          loading={acaoAvancar.pendente}
          onClick={() => acaoAvancar.executar({ id: encomenda.id, status: passo.status })}
        >
          {Icone ? <Icone /> : null}
          {passo.rotulo}
        </Button>
      ) : null}

      {!encerrada ? (
        <Button variant="ghost" className="text-danger" onClick={() => setCancelarAberto(true)}>
          <Ban />
          Cancelar
        </Button>
      ) : null}

      <ConfirmDialog
        aberto={cancelarAberto}
        onAbertoChange={setCancelarAberto}
        titulo={`Cancelar a encomenda ${encomenda.codigo}?`}
        descricao="A conta a receber vinculada também é cancelada. Pagamentos já recebidos precisam ser devolvidos por fora do sistema."
        confirmarTexto="Cancelar encomenda"
        destrutivo
        pedirMotivo
        pendente={acaoCancelar.pendente}
        onConfirmar={(motivo) => acaoCancelar.executar({ id: encomenda.id, status: 'CANCELADA', motivo: motivo ?? '' })}
      />
    </>
  )
}

export function PainelRecebimentoEncomenda({
  encomendaId,
  saldo,
  sinalCombinado,
  formas,
}: {
  encomendaId: string
  saldo: number
  sinalCombinado: number
  formas: Array<{ id: string; nome: string }>
}) {
  const [valor, setValor] = React.useState(sinalCombinado > 0 && sinalCombinado <= saldo ? sinalCombinado : saldo)
  const [formaId, setFormaId] = React.useState(formas[0]?.id ?? '')

  const acao = useAcao(receberEncomenda, {
    sucesso: (d) => (d.saldo > 0 ? `Recebido — falta ${moeda(d.saldo)}` : `Encomenda ${d.codigo} totalmente paga`),
  })

  return (
    <Panel titulo="Receber pagamento" descricao="Entra no caixa aberto e abate a conta a receber da encomenda.">
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-baseline justify-between rounded-control bg-paper-sunken px-3 py-2.5">
          <span className="text-sm font-semibold">Saldo em aberto</span>
          <span className="font-display text-xl font-extrabold" data-numeric>
            {moeda(saldo)}
          </span>
        </div>

        <Field label="Valor recebido" htmlFor="enc-valor" erro={acao.erroCampos.valor} obrigatorio>
          <MoneyInput id="enc-valor" value={valor} onValueChange={setValor} />
        </Field>

        <div className="flex flex-wrap gap-2">
          {sinalCombinado > 0 && sinalCombinado <= saldo ? (
            <Button variant="secondary" size="sm" onClick={() => setValor(sinalCombinado)}>
              Sinal {moeda(sinalCombinado)}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => setValor(saldo)}>
            Saldo total
          </Button>
        </div>

        <Field label="Forma de pagamento" htmlFor="enc-forma" obrigatorio>
          <SelectSimples
            id="enc-forma"
            value={formaId}
            onValueChange={setFormaId}
            opcoes={formas.map((f) => ({ valor: f.id, rotulo: f.nome }))}
          />
        </Field>

        {acao.erroGeral ? (
          <p className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
            {acao.erroGeral}
          </p>
        ) : null}

        <Button
          full
          loading={acao.pendente}
          disabled={valor <= 0 || !formaId}
          onClick={() => acao.executar({ id: encomendaId, formaPagamentoId: formaId, valor })}
        >
          <Wallet />
          Registrar recebimento
        </Button>
      </div>
    </Panel>
  )
}
