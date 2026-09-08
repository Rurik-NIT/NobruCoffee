'use client'

import * as React from 'react'
import { Save } from 'lucide-react'

import { moeda } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Field, FieldRow } from '@/components/ui/field'
import { Input, MoneyInput, QuantityInput } from '@/components/ui/input'
import { CheckboxCampo, SwitchLinha } from '@/components/ui/toggles'
import { useAcao } from '@/hooks/use-acao'
import { trocarMinhaSenha } from '@/server/modules/auth/actions'
import { salvarConfiguracao, salvarLoja, salvarMeuPerfil } from '@/server/modules/configuracoes/actions'

const DIAS = [
  { chave: 'seg', rotulo: 'Segunda' },
  { chave: 'ter', rotulo: 'Terça' },
  { chave: 'qua', rotulo: 'Quarta' },
  { chave: 'qui', rotulo: 'Quinta' },
  { chave: 'sex', rotulo: 'Sexta' },
  { chave: 'sab', rotulo: 'Sábado' },
  { chave: 'dom', rotulo: 'Domingo' },
]

type ValoresConfig = {
  nomeNegocio: string
  logoUrl: string
  alertaValidadeDias: number
  pontosPorReal: number
  valorPorPonto: number
  taxaServicoPercentual: number
  taxaEntregaPadrao: number
  descontoMaximoOperador: number
  baixaEstoqueNaVenda: boolean
  horarioAbertura: string
  horarioFechamento: string
  diasFuncionamento: string[]
  whatsapp: string
  instagram: string
}

export function FormularioConfiguracoes({
  valores,
  podeGerenciar,
}: {
  valores: ValoresConfig
  podeGerenciar: boolean
}) {
  const [f, setF] = React.useState(valores)
  const acao = useAcao(salvarConfiguracao, { sucesso: 'Configurações salvas' })

  function campo<K extends keyof ValoresConfig>(chave: K, valor: ValoresConfig[K]) {
    setF((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <div className="space-y-5 px-5 py-4">
      <Field label="Nome do negócio" htmlFor="cf-nome" erro={acao.erroCampos.nomeNegocio} obrigatorio>
        <Input id="cf-nome" value={f.nomeNegocio} onChange={(e) => campo('nomeNegocio', e.target.value)} disabled={!podeGerenciar} />
      </Field>

      <div className="space-y-1 rounded-control border border-hairline bg-paper px-3">
        <SwitchLinha
          id="cf-baixa"
          checked={f.baixaEstoqueNaVenda}
          onCheckedChange={(v) => campo('baixaEstoqueNaVenda', v)}
          label="Baixar estoque na venda"
          descricao="Desligado, a venda não consome insumos nem produtos. Só desligue se o controle de estoque for feito fora do sistema."
          disabled={!podeGerenciar}
        />
      </div>

      <FieldRow>
        <Field
          label="Desconto máximo do operador (%)"
          htmlFor="cf-desc"
          dica="Acima disso, só quem tem a permissão de desconto livre."
        >
          <QuantityInput
            id="cf-desc"
            value={f.descontoMaximoOperador}
            onValueChange={(v) => campo('descontoMaximoOperador', v)}
            unidade="%"
            step={1}
            disabled={!podeGerenciar}
          />
        </Field>
        <Field label="Alerta de validade (dias)" htmlFor="cf-val" dica="Antecedência do aviso de vencimento.">
          <QuantityInput
            id="cf-val"
            value={f.alertaValidadeDias}
            onValueChange={(v) => campo('alertaValidadeDias', v)}
            step={1}
            disabled={!podeGerenciar}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Pontos por R$ 1,00" htmlFor="cf-pts" dica="Quanto o cliente acumula a cada real gasto.">
          <QuantityInput
            id="cf-pts"
            value={f.pontosPorReal}
            onValueChange={(v) => campo('pontosPorReal', v)}
            step={0.5}
            disabled={!podeGerenciar}
          />
        </Field>
        <Field
          label="Valor de 1 ponto"
          htmlFor="cf-vp"
          dica={`100 pontos valem ${moeda(f.valorPorPonto * 100)} no resgate.`}
        >
          <MoneyInput id="cf-vp" value={f.valorPorPonto} onValueChange={(v) => campo('valorPorPonto', v)} disabled={!podeGerenciar} />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Taxa de serviço (%)" htmlFor="cf-serv" dica="Aplicada em consumo no balcão. 0 = sem taxa.">
          <QuantityInput
            id="cf-serv"
            value={f.taxaServicoPercentual}
            onValueChange={(v) => campo('taxaServicoPercentual', v)}
            unidade="%"
            step={1}
            disabled={!podeGerenciar}
          />
        </Field>
        <Field label="Taxa de entrega padrão" htmlFor="cf-ent">
          <MoneyInput
            id="cf-ent"
            value={f.taxaEntregaPadrao}
            onValueChange={(v) => campo('taxaEntregaPadrao', v)}
            disabled={!podeGerenciar}
          />
        </Field>
      </FieldRow>

      <div>
        <p className="eyebrow mb-2">Dias de funcionamento</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {DIAS.map((d) => (
            <CheckboxCampo
              key={d.chave}
              id={`cf-dia-${d.chave}`}
              checked={f.diasFuncionamento.includes(d.chave)}
              onCheckedChange={(v) =>
                campo(
                  'diasFuncionamento',
                  v ? [...f.diasFuncionamento, d.chave] : f.diasFuncionamento.filter((x) => x !== d.chave),
                )
              }
              label={d.rotulo}
              disabled={!podeGerenciar}
            />
          ))}
        </div>
      </div>

      <FieldRow>
        <Field label="Abre às" htmlFor="cf-abre">
          <Input
            id="cf-abre"
            value={f.horarioAbertura}
            onChange={(e) => campo('horarioAbertura', e.target.value)}
            placeholder="10:00"
            maxLength={5}
            disabled={!podeGerenciar}
          />
        </Field>
        <Field label="Fecha às" htmlFor="cf-fecha">
          <Input
            id="cf-fecha"
            value={f.horarioFechamento}
            onChange={(e) => campo('horarioFechamento', e.target.value)}
            placeholder="19:30"
            maxLength={5}
            disabled={!podeGerenciar}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="WhatsApp da loja" htmlFor="cf-wa">
          <Input id="cf-wa" value={f.whatsapp} onChange={(e) => campo('whatsapp', e.target.value)} disabled={!podeGerenciar} />
        </Field>
        <Field label="Instagram" htmlFor="cf-ig">
          <Input id="cf-ig" value={f.instagram} onChange={(e) => campo('instagram', e.target.value)} disabled={!podeGerenciar} />
        </Field>
      </FieldRow>

      {podeGerenciar ? (
        <Button loading={acao.pendente} onClick={() => acao.executar(f)}>
          <Save />
          Salvar configurações
        </Button>
      ) : (
        <p className="text-xs text-body-subtle">Seu cargo pode ver, mas não alterar estas configurações.</p>
      )}
    </div>
  )
}

type ValoresLoja = {
  nome: string
  cnpj: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export function FormularioLoja({ valores, podeGerenciar }: { valores: ValoresLoja; podeGerenciar: boolean }) {
  const [f, setF] = React.useState(valores)
  const acao = useAcao(salvarLoja, { sucesso: 'Dados da loja salvos' })

  function campo<K extends keyof ValoresLoja>(chave: K, valor: ValoresLoja[K]) {
    setF((atual) => ({ ...atual, [chave]: valor }))
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <Field label="Nome da loja" htmlFor="lj-nome" erro={acao.erroCampos.nome} obrigatorio>
        <Input id="lj-nome" value={f.nome} onChange={(e) => campo('nome', e.target.value)} disabled={!podeGerenciar} />
      </Field>
      <FieldRow>
        <Field label="CNPJ" htmlFor="lj-cnpj" erro={acao.erroCampos.cnpj}>
          <Input id="lj-cnpj" value={f.cnpj} onChange={(e) => campo('cnpj', e.target.value)} inputMode="numeric" disabled={!podeGerenciar} />
        </Field>
        <Field label="Telefone" htmlFor="lj-tel">
          <Input id="lj-tel" value={f.telefone} onChange={(e) => campo('telefone', e.target.value)} inputMode="tel" disabled={!podeGerenciar} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="CEP" htmlFor="lj-cep">
          <Input id="lj-cep" value={f.cep} onChange={(e) => campo('cep', e.target.value)} inputMode="numeric" disabled={!podeGerenciar} />
        </Field>
        <Field label="Bairro" htmlFor="lj-bairro">
          <Input id="lj-bairro" value={f.bairro} onChange={(e) => campo('bairro', e.target.value)} disabled={!podeGerenciar} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Logradouro" htmlFor="lj-log">
          <Input id="lj-log" value={f.logradouro} onChange={(e) => campo('logradouro', e.target.value)} disabled={!podeGerenciar} />
        </Field>
        <Field label="Número" htmlFor="lj-num" className="max-w-32">
          <Input id="lj-num" value={f.numero} onChange={(e) => campo('numero', e.target.value)} disabled={!podeGerenciar} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Cidade" htmlFor="lj-cid">
          <Input id="lj-cid" value={f.cidade} onChange={(e) => campo('cidade', e.target.value)} disabled={!podeGerenciar} />
        </Field>
        <Field label="UF" htmlFor="lj-uf" className="max-w-24">
          <Input id="lj-uf" value={f.uf} onChange={(e) => campo('uf', e.target.value.toUpperCase())} maxLength={2} disabled={!podeGerenciar} />
        </Field>
      </FieldRow>

      {podeGerenciar ? (
        <Button loading={acao.pendente} onClick={() => acao.executar(f)}>
          <Save />
          Salvar dados da loja
        </Button>
      ) : null}
    </div>
  )
}

export function FormularioPerfil({ nome, telefone, email }: { nome: string; telefone: string; email: string }) {
  const [meuNome, setMeuNome] = React.useState(nome)
  const [meuTelefone, setMeuTelefone] = React.useState(telefone)
  const [senhaAtual, setSenhaAtual] = React.useState('')
  const [novaSenha, setNovaSenha] = React.useState('')
  const [confirmacao, setConfirmacao] = React.useState('')

  const acaoPerfil = useAcao(salvarMeuPerfil, { sucesso: 'Perfil atualizado' })
  const acaoSenha = useAcao(trocarMinhaSenha, {
    sucesso: 'Senha alterada — as outras sessões foram encerradas',
    aoConcluir: () => {
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
    },
  })

  return (
    <div className="space-y-5 px-5 py-4">
      <FieldRow>
        <Field label="Seu nome" htmlFor="me-nome" erro={acaoPerfil.erroCampos.nome}>
          <Input id="me-nome" value={meuNome} onChange={(e) => setMeuNome(e.target.value)} />
        </Field>
        <Field label="Seu telefone" htmlFor="me-tel">
          <Input id="me-tel" value={meuTelefone} onChange={(e) => setMeuTelefone(e.target.value)} inputMode="tel" />
        </Field>
      </FieldRow>
      <p className="text-xs text-body-subtle">
        E-mail de acesso: <span className="font-semibold">{email}</span> — só um gerente pode alterar.
      </p>
      <Button
        variant="secondary"
        size="sm"
        loading={acaoPerfil.pendente}
        onClick={() => acaoPerfil.executar({ nome: meuNome, telefone: meuTelefone })}
      >
        Salvar meus dados
      </Button>

      <div className="space-y-3 border-t border-hairline pt-4">
        <p className="eyebrow">Trocar senha</p>
        <Field label="Senha atual" htmlFor="me-atual" erro={acaoSenha.erroCampos.senhaAtual}>
          <Input id="me-atual" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" />
        </Field>
        <FieldRow>
          <Field label="Nova senha" htmlFor="me-nova" erro={acaoSenha.erroCampos.novaSenha} dica="Mínimo 8 caracteres, com letra e número.">
            <Input id="me-nova" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirmar" htmlFor="me-conf" erro={acaoSenha.erroCampos.confirmacao}>
            <Input id="me-conf" type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" />
          </Field>
        </FieldRow>
        <Button
          variant="secondary"
          size="sm"
          loading={acaoSenha.pendente}
          disabled={!senhaAtual || novaSenha.length < 8 || novaSenha !== confirmacao}
          onClick={() => acaoSenha.executar({ senhaAtual, novaSenha, confirmacao })}
        >
          Trocar senha
        </Button>
      </div>
    </div>
  )
}
