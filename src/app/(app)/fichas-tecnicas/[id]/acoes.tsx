'use client'

import { RotateCcw } from 'lucide-react'

import { moeda } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { useAcao } from '@/hooks/use-acao'
import { ativarVersao } from '@/server/modules/fichas/actions'

/** Reativa uma versão anterior da ficha, recalculando o custo com o preço atual dos insumos. */
export function AcoesVersao({ fichaId, versao }: { fichaId: string; versao: number }) {
  const acao = useAcao(ativarVersao, {
    sucesso: (d) => `Versão ${d.versao} ativada — custo ${moeda(d.custoUnitario)} por unidade`,
  })

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={acao.pendente}
      onClick={() => acao.executar({ fichaId })}
      aria-label={`Ativar a versão ${versao}`}
    >
      <RotateCcw className="size-3.5" />
      Ativar
    </Button>
  )
}
