import type { Metadata } from 'next'
import { CalendarClock, TriangleAlert } from 'lucide-react'

import { StatTile } from '@/components/charts'
import { KpiGrid, PageHeader, Panel } from '@/components/patterns/page'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { CellStack, CodigoDoc, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { data as fmtData, moeda, numero, quantidade as fmtQtd } from '@/lib/format'
import { brl } from '@/lib/money'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { listarValidadesProximas } from '@/server/modules/estoque/service'

export const metadata: Metadata = { title: 'Validades' }
export const dynamic = 'force-dynamic'

export default async function PaginaValidades() {
  const sessao = await exigirPermissao('estoque.ver')

  const config = await db.configuracao.findUnique({
    where: { lojaId: sessao.lojaId },
    select: { alertaValidadeDias: true },
  })
  const janela = config?.alertaValidadeDias ?? 7

  // Olhamos 30 dias à frente para dar visão de planejamento, e destacamos a
  // janela configurada como "atenção".
  const lotes = await listarValidadesProximas(db, sessao.lojaId, 30, 200)
  const vencidos = lotes.filter((l) => l.vencido)
  const naJanela = lotes.filter((l) => !l.vencido && l.diasRestantes <= janela)
  const emRisco = brl(vencidos.reduce((a, l) => a + l.valorEmRisco, 0) + naJanela.reduce((a, l) => a + l.valorEmRisco, 0))

  return (
    <>
      <PageHeader
        titulo="Validades"
        descricao={`Lotes com validade nos próximos 30 dias. O alerta da loja está configurado para ${janela} dias.`}
        voltar={{ href: '/estoque', rotulo: 'Insumos' }}
      />

      <KpiGrid className="mb-4">
        <StatTile rotulo="Lotes vencidos" valor={numero(vencidos.length)} icone={TriangleAlert} />
        <StatTile rotulo={`Vencem em ${janela} dias`} valor={numero(naJanela.length)} icone={CalendarClock} />
        <StatTile rotulo="Valor em risco" valor={moeda(emRisco)} icone={TriangleAlert} apoio="vencidos + na janela de alerta" />
        <StatTile rotulo="Lotes acompanhados" valor={numero(lotes.length)} icone={CalendarClock} />
      </KpiGrid>

      <Panel titulo="Lotes por validade" descricao="Mais urgentes primeiro. Use FIFO: gaste o lote mais antigo antes.">
        {lotes.length === 0 ? (
          <EmptyState
            icone={CalendarClock}
            titulo="Nenhum lote vencendo nos próximos 30 dias"
            descricao="Lotes com validade são criados no recebimento de compra ou em entradas manuais."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Insumo</TH>
                  <TH>Lote</TH>
                  <TH>Validade</TH>
                  <TH numerico>Dias</TH>
                  <TH numerico>Saldo do lote</TH>
                  <TH numerico>Valor em risco</TH>
                  <TH>Situação</TH>
                </TR>
              </THead>
              <TBody>
                {lotes.map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <CellStack principal={l.ingrediente.nome} />
                    </TD>
                    <TD>
                      <CodigoDoc>{l.codigo}</CodigoDoc>
                    </TD>
                    <TD>
                      <span className="text-sm">{fmtData(l.validade)}</span>
                    </TD>
                    <TD numerico>
                      <span className={l.vencido ? 'font-bold text-danger' : l.diasRestantes <= janela ? 'font-bold text-caution' : ''}>
                        {l.vencido ? `${Math.abs(l.diasRestantes)} atrás` : l.diasRestantes}
                      </span>
                    </TD>
                    <TD numerico>{fmtQtd(l.quantidade, l.ingrediente.unidade)}</TD>
                    <TD numerico>{moeda(l.valorEmRisco)}</TD>
                    <TD>
                      {l.vencido ? (
                        <Badge tone="danger">Vencido</Badge>
                      ) : l.diasRestantes <= janela ? (
                        <Badge tone="caution">Vence logo</Badge>
                      ) : (
                        <Badge tone="neutral">Em prazo</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      {vencidos.length > 0 ? (
        <p className="mt-4 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          Há {vencidos.length} lote(s) vencido(s) somando {moeda(brl(vencidos.reduce((a, l) => a + l.valorEmRisco, 0)))}.
          Registre a perda em Produção › Perdas para tirar do saldo e lançar o custo.
        </p>
      ) : null}
    </>
  )
}
