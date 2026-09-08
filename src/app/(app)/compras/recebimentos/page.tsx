import type { Metadata } from 'next'
import Link from 'next/link'
import { Archive } from 'lucide-react'

import { PageHeader, Panel } from '@/components/patterns/page'
import { EmptyState } from '@/components/ui/states'
import { CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { dataHora, moeda, numero } from '@/lib/format'
import { exigirPermissao } from '@/server/auth/session'
import { listarRecebimentos } from '@/server/modules/compras/service'

export const metadata: Metadata = { title: 'Recebimentos' }
export const dynamic = 'force-dynamic'

export default async function PaginaRecebimentos() {
  const sessao = await exigirPermissao('compras.ver')
  const recebimentos = await listarRecebimentos(sessao.lojaId)

  return (
    <>
      <PageHeader
        titulo="Recebimentos"
        descricao="Cada recebimento é o momento em que a mercadoria virou estoque e o preço da nota virou custo."
        voltar={{ href: '/compras', rotulo: 'Pedidos de compra' }}
      />
      <Panel>
        {recebimentos.length === 0 ? (
          <EmptyState
            icone={Archive}
            titulo="Nenhum recebimento registrado"
            descricao="Abra um pedido de compra enviado e registre a entrada da mercadoria."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Quando</TH>
                  <TH>Pedido</TH>
                  <TH>Fornecedor</TH>
                  <TH>Nota fiscal</TH>
                  <TH numerico>Linhas</TH>
                  <TH numerico>Valor</TH>
                  <TH>Recebido por</TH>
                </TR>
              </THead>
              <TBody>
                {recebimentos.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <span className="text-sm">{dataHora(r.data)}</span>
                    </TD>
                    <TD>
                      <Link href={`/compras/${r.pedido.id}`} className="hover:underline">
                        <CodigoDoc>{r.pedido.codigo}</CodigoDoc>
                      </Link>
                    </TD>
                    <TD>
                      <span className="text-sm">{r.pedido.fornecedor.nome}</span>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs text-body-muted">{r.notaFiscal ?? '—'}</span>
                    </TD>
                    <TD numerico>{numero(r.linhas)}</TD>
                    <TD numerico>{moeda(r.total)}</TD>
                    <TD>
                      <span className="text-xs text-body-muted">{r.usuario}</span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  )
}
