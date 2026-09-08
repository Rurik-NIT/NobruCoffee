'use client'

import { SelectSimples } from '@/components/ui/select'
import { useFiltrosUrl } from '@/hooks/use-filtros-url'

const ATALHOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: '7dias', rotulo: 'Últimos 7 dias' },
  { valor: '30dias', rotulo: 'Últimos 30 dias' },
  { valor: 'mes', rotulo: 'Mês corrente' },
  { valor: 'mesAnterior', rotulo: 'Mês anterior' },
  { valor: 'ano', rotulo: 'Ano corrente' },
]

/**
 * Seletor de período dos relatórios e do financeiro.
 * Guarda a escolha na URL para o link ser compartilhável.
 */
export function SeletorPeriodo({ atual }: { atual: string }) {
  const { aplicar } = useFiltrosUrl()
  return (
    <div className="w-48">
      <SelectSimples value={atual} onValueChange={(v) => aplicar({ periodo: v })} opcoes={ATALHOS} />
    </div>
  )
}
