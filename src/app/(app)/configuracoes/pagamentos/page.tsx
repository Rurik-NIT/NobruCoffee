import type { Metadata } from 'next'

import { PageHeader, Panel } from '@/components/patterns/page'
import { num } from '@/lib/money'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { GerenciarFormas } from './gerenciar'

export const metadata: Metadata = { title: 'Formas de pagamento' }
export const dynamic = 'force-dynamic'

export default async function PaginaFormasPagamento() {
  const sessao = await exigirPermissao('configuracoes.ver')

  const [formas, podeGerenciar] = await Promise.all([
    db.formaPagamento.findMany({
      where: { lojaId: sessao.lojaId },
      orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }],
      include: { _count: { select: { pagamentos: true } } },
    }),
    podeFazer('configuracoes.gerenciar'),
  ])

  return (
    <>
      <PageHeader
        titulo="Formas de pagamento"
        descricao="A marcação “conta na gaveta” é o que separa dinheiro em espécie de cartão no fechamento do caixa."
        voltar={{ href: '/configuracoes', rotulo: 'Configurações' }}
      />
      <Panel>
        <GerenciarFormas
          formas={formas.map((f) => ({
            id: f.id,
            nome: f.nome,
            tipo: f.tipo,
            taxaPercentual: num(f.taxaPercentual),
            taxaFixa: num(f.taxaFixa),
            prazoRecebimentoDias: f.prazoRecebimentoDias,
            contaNoCaixa: f.contaNoCaixa,
            permiteTroco: f.permiteTroco,
            ordem: f.ordem,
            ativo: f.ativo,
            usos: f._count.pagamentos,
          }))}
          podeGerenciar={podeGerenciar}
        />
      </Panel>
    </>
  )
}
