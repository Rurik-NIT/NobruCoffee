import type { Metadata } from 'next'
import Link from 'next/link'
import { CreditCard, Receipt } from 'lucide-react'

import { PageHeader, Panel } from '@/components/patterns/page'
import { Button } from '@/components/ui/button'
import { num } from '@/lib/money'
import { exigirPermissao, podeFazer } from '@/server/auth/session'
import { db } from '@/server/db'
import { FormularioConfiguracoes, FormularioLoja, FormularioPerfil } from './formularios'

export const metadata: Metadata = { title: 'Configurações' }
export const dynamic = 'force-dynamic'

export default async function PaginaConfiguracoes() {
  const sessao = await exigirPermissao('configuracoes.ver')

  const [loja, config, usuario, podeGerenciar, verAuditoria] = await Promise.all([
    db.loja.findUniqueOrThrow({ where: { id: sessao.lojaId } }),
    db.configuracao.findUnique({ where: { lojaId: sessao.lojaId } }),
    db.usuario.findUniqueOrThrow({ where: { id: sessao.id }, select: { nome: true, telefone: true, email: true } }),
    podeFazer('configuracoes.gerenciar'),
    podeFazer('auditoria.ver'),
  ])

  return (
    <>
      <PageHeader
        titulo="Configurações"
        descricao="Regras que o sistema aplica em toda operação: desconto máximo, fidelidade, alertas e baixa de estoque."
        acoes={
          <>
            <Button variant="secondary" asChild>
              <Link href="/configuracoes/pagamentos">
                <CreditCard />
                Formas de pagamento
              </Link>
            </Button>
            {verAuditoria ? (
              <Button variant="secondary" asChild>
                <Link href="/configuracoes/auditoria">
                  <Receipt />
                  Auditoria
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel titulo="Regras da operação" descricao="Valem para todos os operadores.">
          <FormularioConfiguracoes
            podeGerenciar={podeGerenciar}
            valores={{
              nomeNegocio: config?.nomeNegocio ?? loja.nome,
              logoUrl: config?.logoUrl ?? '',
              alertaValidadeDias: config?.alertaValidadeDias ?? 7,
              pontosPorReal: num(config?.pontosPorReal ?? 1),
              valorPorPonto: num(config?.valorPorPonto ?? 0.05),
              taxaServicoPercentual: num(config?.taxaServicoPercentual ?? 0),
              taxaEntregaPadrao: num(config?.taxaEntregaPadrao ?? 0),
              descontoMaximoOperador: num(config?.descontoMaximoOperador ?? 10),
              baixaEstoqueNaVenda: config?.baixaEstoqueNaVenda ?? true,
              horarioAbertura: config?.horarioAbertura ?? '',
              horarioFechamento: config?.horarioFechamento ?? '',
              diasFuncionamento: config?.diasFuncionamento ?? [],
              whatsapp: config?.whatsapp ?? '',
              instagram: config?.instagram ?? '',
            }}
          />
        </Panel>

        <div className="space-y-4">
          <Panel titulo="Dados da loja" descricao="Aparecem no recibo e nos documentos.">
            <FormularioLoja
              podeGerenciar={podeGerenciar}
              valores={{
                nome: loja.nome,
                cnpj: loja.cnpj ?? '',
                telefone: loja.telefone ?? '',
                email: loja.email ?? '',
                cep: loja.cep ?? '',
                logradouro: loja.logradouro ?? '',
                numero: loja.numero ?? '',
                complemento: loja.complemento ?? '',
                bairro: loja.bairro ?? '',
                cidade: loja.cidade ?? '',
                uf: loja.uf ?? '',
              }}
            />
          </Panel>

          <Panel titulo="Minha conta" descricao="Seus dados e sua senha.">
            <FormularioPerfil nome={usuario.nome} telefone={usuario.telefone ?? ''} email={usuario.email} />
          </Panel>
        </div>
      </div>
    </>
  )
}
