'use client'

import * as React from 'react'
import { LogOut, MoreHorizontal, Pencil, Plus, Power, ShieldAlert, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { dataHora, moeda, numero, telefone as fmtTel } from '@/lib/format'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from '@/components/ui/dropdown'
import { Field, FieldRow } from '@/components/ui/field'
import { DateInput, Input } from '@/components/ui/input'
import { SelectSimples } from '@/components/ui/select'
import { SwitchLinha } from '@/components/ui/toggles'
import { EmptyState } from '@/components/ui/states'
import { CellStack, Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table'
import { useAcao } from '@/hooks/use-acao'
import { alternarUsuario, encerrarSessoesDoUsuario, salvarUsuario } from '@/server/modules/equipe/actions'

type Usuario = {
  id: string
  nome: string
  email: string
  apelido: string | null
  telefone: string | null
  avatarUrl: string | null
  cargo: { id: string; nome: string; slug: string }
  loja: { id: string; nome: string } | null
  ativo: boolean
  ultimoLoginEm: string | null
  admitidoEm: string | null
  sessoesAtivas: number
  vendasMes: number
  pedidosMes: number
}

export function ListaEquipe({
  usuarios,
  cargos,
  usuarioAtualId,
  permissoes,
}: {
  usuarios: Usuario[]
  cargos: Array<{ id: string; nome: string; acessoTotal: boolean }>
  usuarioAtualId: string
  permissoes: { gerenciar: boolean; permissoes: boolean }
}) {
  const [formAberto, setFormAberto] = React.useState(false)
  const [editando, setEditando] = React.useState<Usuario | null>(null)
  const [desativarAlvo, setDesativarAlvo] = React.useState<Usuario | null>(null)

  const acaoAlternar = useAcao(alternarUsuario, {
    sucesso: (d) => (d.ativo ? `${d.nome} reativado` : `${d.nome} desativado`),
    aoConcluir: () => setDesativarAlvo(null),
  })
  const acaoSessoes = useAcao(encerrarSessoesDoUsuario, { sucesso: (d) => `Sessões de ${d.nome} encerradas` })

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <p className="text-xs text-body-muted">
          <span className="font-semibold text-body" data-numeric>
            {numero(usuarios.filter((u) => u.ativo).length)}
          </span>{' '}
          pessoa(s) ativa(s) de {numero(usuarios.length)}
        </p>
        {permissoes.gerenciar ? (
          <Button
            size="sm"
            onClick={() => {
              setEditando(null)
              setFormAberto(true)
            }}
          >
            <Plus className="size-3.5" />
            Novo acesso
          </Button>
        ) : null}
      </div>

      {usuarios.length === 0 ? (
        <EmptyState icone={UserRound} titulo="Nenhum funcionário cadastrado" />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Pessoa</TH>
                <TH>Cargo</TH>
                <TH>Último acesso</TH>
                <TH numerico>Vendas no mês</TH>
                <TH numerico>Pedidos</TH>
                <TH>Situação</TH>
                <TH className="w-10" />
              </TR>
            </THead>
            <TBody>
              {usuarios.map((u) => (
                <TR key={u.id} className={cn(!u.ativo && 'opacity-55')}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar nome={u.nome} src={u.avatarUrl} />
                      <CellStack
                        principal={
                          <span className="flex items-center gap-1.5">
                            {u.nome}
                            {u.id === usuarioAtualId ? (
                              <Badge tone="brand" size="sm">
                                você
                              </Badge>
                            ) : null}
                          </span>
                        }
                        apoio={
                          <>
                            {u.email}
                            {u.telefone ? ` · ${fmtTel(u.telefone)}` : ''}
                          </>
                        }
                      />
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={u.cargo.slug === 'administrador' ? 'dark' : 'neutral'}>{u.cargo.nome}</Badge>
                  </TD>
                  <TD>
                    {u.ultimoLoginEm ? (
                      <span className="text-xs">
                        {dataHora(u.ultimoLoginEm)}
                        {u.sessoesAtivas > 0 ? (
                          <span className="block text-[11px] font-semibold text-leaf">
                            {numero(u.sessoesAtivas)} sessão(ões) ativa(s)
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-body-subtle">nunca entrou</span>
                    )}
                  </TD>
                  <TD numerico>{moeda(u.vendasMes)}</TD>
                  <TD numerico>{numero(u.pedidosMes)}</TD>
                  <TD>{u.ativo ? <Badge tone="leaf">Ativo</Badge> : <Badge tone="neutral">Desativado</Badge>}</TD>
                  <TD>
                    {permissoes.gerenciar ? (
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${u.nome}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownTrigger>
                        <DropdownContent>
                          <DropdownItem
                            onSelect={() => {
                              setEditando(u)
                              setFormAberto(true)
                            }}
                          >
                            <Pencil />
                            Editar / trocar senha
                          </DropdownItem>
                          {u.sessoesAtivas > 0 ? (
                            <DropdownItem onSelect={() => acaoSessoes.executar({ id: u.id })}>
                              <LogOut />
                              Encerrar sessões
                            </DropdownItem>
                          ) : null}
                          {u.id !== usuarioAtualId ? (
                            <>
                              <DropdownSeparator />
                              <DropdownItem
                                destrutivo={u.ativo}
                                onSelect={() =>
                                  u.ativo ? setDesativarAlvo(u) : acaoAlternar.executar({ id: u.id, ativo: true })
                                }
                              >
                                <Power />
                                {u.ativo ? 'Desativar acesso' : 'Reativar acesso'}
                              </DropdownItem>
                            </>
                          ) : null}
                        </DropdownContent>
                      </Dropdown>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {formAberto ? (
        <FormularioUsuario
          usuario={editando}
          cargos={cargos}
          podePermissoes={permissoes.permissoes}
          onFechar={() => setFormAberto(false)}
        />
      ) : null}

      <ConfirmDialog
        aberto={Boolean(desativarAlvo)}
        onAbertoChange={(v) => !v && setDesativarAlvo(null)}
        titulo={`Desativar o acesso de ${desativarAlvo?.nome}?`}
        descricao="A pessoa é desconectada na hora e não consegue mais entrar. O histórico de vendas dela é preservado."
        confirmarTexto="Desativar acesso"
        destrutivo
        pendente={acaoAlternar.pendente}
        onConfirmar={() => desativarAlvo && acaoAlternar.executar({ id: desativarAlvo.id, ativo: false })}
      />
    </>
  )
}

function FormularioUsuario({
  usuario,
  cargos,
  podePermissoes,
  onFechar,
}: {
  usuario: Usuario | null
  cargos: Array<{ id: string; nome: string; acessoTotal: boolean }>
  podePermissoes: boolean
  onFechar: () => void
}) {
  const [nome, setNome] = React.useState(usuario?.nome ?? '')
  const [email, setEmail] = React.useState(usuario?.email ?? '')
  const [apelido, setApelido] = React.useState(usuario?.apelido ?? '')
  const [cargoId, setCargoId] = React.useState(usuario?.cargo.id ?? cargos.find((c) => !c.acessoTotal)?.id ?? cargos[0]?.id ?? '')
  const [telefone, setTelefone] = React.useState(usuario?.telefone ?? '')
  const [admitidoEm, setAdmitidoEm] = React.useState(usuario?.admitidoEm ? usuario.admitidoEm.slice(0, 10) : '')
  const [senha, setSenha] = React.useState('')
  const [ativo, setAtivo] = React.useState(usuario?.ativo ?? true)

  const acao = useAcao(salvarUsuario, { sucesso: (d) => `${d.nome} salvo`, aoConcluir: onFechar })
  const cargoEscolhido = cargos.find((c) => c.id === cargoId)

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>{usuario ? `Editar ${usuario.nome}` : 'Novo acesso'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field label="Nome" htmlFor="u-nome" erro={acao.erroCampos.nome} obrigatorio>
            <Input id="u-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </Field>
          <FieldRow>
            <Field label="E-mail de acesso" htmlFor="u-email" erro={acao.erroCampos.email} obrigatorio>
              <Input id="u-email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
            </Field>
            <Field label="Telefone" htmlFor="u-tel">
              <Input id="u-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" />
            </Field>
          </FieldRow>
          <Field
            label="Apelido de acesso"
            htmlFor="u-apelido"
            erro={acao.erroCampos.apelido}
            dica="Atalho para entrar sem digitar o e-mail. Em branco, a pessoa entra pelo e-mail."
          >
            <Input
              id="u-apelido"
              value={apelido}
              onChange={(e) => setApelido(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="camila"
            />
          </Field>
          <Field label="Cargo" htmlFor="u-cargo" erro={acao.erroCampos.cargoId} obrigatorio>
            <SelectSimples
              id="u-cargo"
              value={cargoId}
              onValueChange={setCargoId}
              opcoes={cargos.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            />
          </Field>
          {cargoEscolhido?.acessoTotal ? (
            <p className="flex items-start gap-2 rounded-control border border-caution/30 bg-caution-soft px-3 py-2 text-xs font-semibold text-caution">
              <ShieldAlert className="mt-px size-3.5 shrink-0" />
              {podePermissoes
                ? 'Este cargo tem acesso total, incluindo financeiro e permissões.'
                : 'Você não tem permissão para conceder acesso total. Escolha outro cargo.'}
            </p>
          ) : null}
          <Field label="Data de admissão" htmlFor="u-adm">
            <DateInput id="u-adm" value={admitidoEm} onChange={(e) => setAdmitidoEm(e.target.value)} />
          </Field>
          <Field
            label={usuario ? 'Nova senha' : 'Senha inicial'}
            htmlFor="u-senha"
            erro={acao.erroCampos.senha}
            obrigatorio={!usuario}
            dica={
              usuario
                ? 'Deixe em branco para manter a senha atual. Ao trocar, as outras sessões são encerradas.'
                : 'Mínimo 8 caracteres, com letra e número.'
            }
          >
            <Input id="u-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
          </Field>
          <div className="rounded-control border border-hairline bg-paper px-3">
            <SwitchLinha
              id="u-ativo"
              checked={ativo}
              onCheckedChange={setAtivo}
              label="Acesso ativo"
              descricao="Desativar desconecta a pessoa na hora."
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button
            loading={acao.pendente}
            disabled={nome.trim().length < 2 || !email || (!usuario && senha.length < 8) || (cargoEscolhido?.acessoTotal && !podePermissoes)}
            onClick={() =>
              acao.executar({
                id: usuario?.id,
                nome,
                email,
                apelido,
                cargoId,
                telefone,
                admitidoEm,
                ativo,
                senha,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
