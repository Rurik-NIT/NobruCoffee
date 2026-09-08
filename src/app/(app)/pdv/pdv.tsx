'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Coffee,
  Pause,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { moeda, numero, quantidade as fmtQtd } from '@/lib/format'
import { brl } from '@/lib/money'
import { Badge, Stamp } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, MoneyInput, SearchInput } from '@/components/ui/input'
import { QuantityStepper } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/toggles'
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/states'
import { toast } from '@/components/ui/toast'
import { useAcao } from '@/hooks/use-acao'
import { useDebounce } from '@/hooks/use-debounce'
import { buscarClientesAction, cadastroRapidoCliente } from '@/server/modules/clientes/actions'
import { venderDireto, finalizarPedido, alternarEspera } from '@/server/modules/pedidos/actions'
import { DialogoItem } from './dialogo-item'
import { DialogoPagamento } from './dialogo-pagamento'
import { Recibo, type DadosRecibo } from './recibo'
import { totalDoItem, type CatalogoPdv, type ClientePdv, type ItemCarrinho, type ProdutoPdv } from './tipos'

type PedidoAberto = {
  id: string
  codigo: string
  tipo: string
  total: number
  subtotal: number
  descontoValor: number
  mesaNumero: number | null
  cliente: { id: string; nome: string; telefone: string; pontos: number } | null
  itens: Array<{
    id: string
    nome: string
    quantidade: number
    precoUnitario: number
    total: number
    observacao: string | null
    adicionais: Array<{ nome: string; preco: number; quantidade: number }>
  }>
}

type TipoVenda = 'BALCAO' | 'VIAGEM' | 'DELIVERY' | 'IFOOD'

/**
 * PDV.
 *
 * Duas decisões que moldam esta tela:
 *
 * 1. **O carrinho do balcão vive aqui, não no banco.** Tocar num donut precisa
 *    ser instantâneo; ir ao servidor a cada item deixaria o operador esperando
 *    com a fila na frente. A gravação acontece uma vez, no "Confirmar".
 *
 * 2. **Mesa e delivery são diferentes.** Ali o pedido existe no banco desde o
 *    primeiro item, porque a cozinha precisa ver. Nesse modo a tela opera sobre
 *    o pedido real (`pedidoAberto`).
 */
export function Pdv({
  caixa,
  catalogo,
  emEspera,
  mesas,
  config,
  pedidoAberto,
  permissoes,
}: {
  caixa: { id: string; codigo: string }
  catalogo: CatalogoPdv
  emEspera: Array<{ id: string; codigo: string; tipo: string; abertoEm: string; total: number; itens: number; cliente: string | null }>
  mesas: Array<{ id: string; numero: number; nome: string | null; status: string }>
  config: { descontoMaximoOperador: number; taxaServicoPercentual: number; taxaEntregaPadrao: number; valorPorPonto: number }
  pedidoAberto: PedidoAberto | null
  permissoes: { descontoLivre: boolean; cancelarItem: boolean; cadastrarCliente: boolean }
}) {
  const router = useRouter()
  const modoPedidoAberto = Boolean(pedidoAberto)

  // ── Estado do carrinho local ────────────────────────────────────────────
  const [tipo, setTipo] = React.useState<TipoVenda>('BALCAO')
  const [itens, setItens] = React.useState<ItemCarrinho[]>([])
  const [cliente, setCliente] = React.useState<ClientePdv | null>(null)
  const [nomeCliente, setNomeCliente] = React.useState('')
  const [desconto, setDesconto] = React.useState(0)
  const [descontoMotivo, setDescontoMotivo] = React.useState('')
  const [cupom, setCupom] = React.useState('')
  const [taxaEntrega, setTaxaEntrega] = React.useState(0)
  const [observacao, setObservacao] = React.useState('')

  // ── UI ──────────────────────────────────────────────────────────────────
  const [categoriaAtiva, setCategoriaAtiva] = React.useState<string | null>(null)
  const [busca, setBusca] = React.useState('')
  const [produtoNoDialogo, setProdutoNoDialogo] = React.useState<ProdutoPdv | null>(null)
  const [carrinhoAberto, setCarrinhoAberto] = React.useState(false)
  const [pagamentoAberto, setPagamentoAberto] = React.useState(false)
  const [descontoAberto, setDescontoAberto] = React.useState(false)
  const [clienteAberto, setClienteAberto] = React.useState(false)
  const [recibo, setRecibo] = React.useState<DadosRecibo | null>(null)

  const buscaDebounced = useDebounce(busca, 200)

  const acaoVender = useAcao(venderDireto, { revalidar: false })
  const acaoFinalizar = useAcao(finalizarPedido, { revalidar: false })
  const acaoEspera = useAcao(alternarEspera, { sucesso: 'Pedido em espera' })

  // ── Totais ──────────────────────────────────────────────────────────────
  const subtotal = React.useMemo(
    () => (modoPedidoAberto ? pedidoAberto!.subtotal : brl(itens.reduce((acc, i) => acc + totalDoItem(i), 0))),
    [itens, modoPedidoAberto, pedidoAberto],
  )
  const descontoEfetivo = modoPedidoAberto ? pedidoAberto!.descontoValor : Math.min(desconto, subtotal)
  const taxaServico = React.useMemo(
    () => (tipo === 'BALCAO' && config.taxaServicoPercentual > 0 ? brl((subtotal * config.taxaServicoPercentual) / 100) : 0),
    [subtotal, tipo, config.taxaServicoPercentual],
  )
  const total = modoPedidoAberto
    ? pedidoAberto!.total
    : brl(Math.max(0, subtotal - descontoEfetivo) + (tipo === 'DELIVERY' ? taxaEntrega : 0))

  const quantidadeItens = modoPedidoAberto
    ? pedidoAberto!.itens.reduce((a, i) => a + i.quantidade, 0)
    : itens.reduce((a, i) => a + i.quantidade, 0)

  // ── Catálogo filtrado ───────────────────────────────────────────────────
  const produtosVisiveis = React.useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase()
    return catalogo.produtos.filter((p) => {
      if (categoriaAtiva && p.categoriaId !== categoriaAtiva) return false
      if (!termo) return true
      return p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)
    })
  }, [catalogo.produtos, categoriaAtiva, buscaDebounced])

  // ── Ações do carrinho ───────────────────────────────────────────────────
  function adicionar(produto: ProdutoPdv, opcoes?: Partial<ItemCarrinho>) {
    if (!produto.disponivel) {
      toast.error(`${produto.nome} está marcado como esgotado.`)
      return
    }
    const variacaoId = opcoes?.variacaoId ?? null
    const adicionais = opcoes?.adicionais ?? []
    const observacaoItem = opcoes?.observacao ?? ''
    const variacao = variacaoId ? produto.variacoes.find((v) => v.id === variacaoId) : null
    const preco = brl(produto.precoVenda + (variacao?.precoDelta ?? 0))

    setItens((atual) => {
      // Item idêntico (mesma variação, sem adicionais nem observação) só soma.
      const igual = atual.find(
        (i) =>
          i.produtoId === produto.id &&
          i.variacaoId === variacaoId &&
          i.adicionais.length === 0 &&
          adicionais.length === 0 &&
          !i.observacao &&
          !observacaoItem,
      )
      if (igual) {
        return atual.map((i) => (i.chave === igual.chave ? { ...i, quantidade: i.quantidade + (opcoes?.quantidade ?? 1) } : i))
      }
      return [
        ...atual,
        {
          chave: `${produto.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          produtoId: produto.id,
          nome: produto.nome,
          variacaoId,
          variacaoNome: variacao?.nome ?? null,
          quantidade: opcoes?.quantidade ?? 1,
          precoUnitario: preco,
          observacao: observacaoItem,
          adicionais,
        },
      ]
    })
  }

  function aoClicarProduto(produto: ProdutoPdv) {
    const temOpcoes = produto.variacoes.length > 0 || produto.adicionaisIds.length > 0
    if (temOpcoes) setProdutoNoDialogo(produto)
    else adicionar(produto)
  }

  function limparVenda() {
    setItens([])
    setCliente(null)
    setNomeCliente('')
    setDesconto(0)
    setDescontoMotivo('')
    setCupom('')
    setTaxaEntrega(0)
    setObservacao('')
    setCarrinhoAberto(false)
  }

  async function confirmarPagamento(pagamentos: Array<{ formaPagamentoId: string; valor: number; valorRecebido?: number }>, pontosResgatar: number) {
    if (modoPedidoAberto) {
      const r = await acaoFinalizar.executar({ pedidoId: pedidoAberto!.id, pagamentos, pontosResgatar })
      if (r.ok) {
        setPagamentoAberto(false)
        setRecibo(montarRecibo(r.dados))
        router.replace('/pdv')
      }
      return
    }

    const r = await acaoVender.executar({
      tipo,
      clienteId: cliente?.id ?? null,
      nomeCliente: nomeCliente || undefined,
      itens: itens.map((i) => ({
        produtoId: i.produtoId,
        variacaoId: i.variacaoId,
        quantidade: i.quantidade,
        observacao: i.observacao || undefined,
        adicionais: i.adicionais.map((a) => ({ adicionalId: a.adicionalId, quantidade: a.quantidade })),
      })),
      descontoValor: descontoEfetivo,
      descontoMotivo: descontoMotivo || undefined,
      cupomCodigo: cupom || undefined,
      taxaEntrega: tipo === 'DELIVERY' ? taxaEntrega : 0,
      taxaServico,
      observacao: observacao || undefined,
      pagamentos,
      pontosResgatar,
    })
    if (r.ok) {
      setPagamentoAberto(false)
      setRecibo(montarRecibo(r.dados))
      limparVenda()
      router.refresh()
    }
  }

  function montarRecibo(dados: { codigo: string; total: number; troco: number; pontosGerados: number }): DadosRecibo {
    return {
      codigo: dados.codigo,
      total: dados.total,
      troco: dados.troco,
      pontosGerados: dados.pontosGerados,
      cliente: cliente?.nome ?? pedidoAberto?.cliente?.nome ?? nomeCliente ?? null,
      itens: modoPedidoAberto
        ? pedidoAberto!.itens.map((i) => ({ nome: i.nome, quantidade: i.quantidade, total: i.total }))
        : itens.map((i) => ({ nome: i.variacaoNome ? `${i.nome} · ${i.variacaoNome}` : i.nome, quantidade: i.quantidade, total: totalDoItem(i) })),
      caixa: caixa.codigo,
      emitidoEm: new Date().toISOString(),
    }
  }

  const pendente = acaoVender.pendente || acaoFinalizar.pendente
  const podeFinalizar = (modoPedidoAberto ? pedidoAberto!.itens.length : itens.length) > 0 && !pendente

  return (
    <div className="-mx-3 -my-5 sm:-mx-5 sm:-my-6 lg:-mx-7">
      <div className="grid lg:grid-cols-[1fr_384px]">
        {/* ═══ Catálogo ═══════════════════════════════════════════════════ */}
        <section className="min-w-0 border-hairline px-3 pt-4 pb-28 sm:px-5 lg:border-r lg:pb-6 lg:pl-7">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchInput value={busca} onValueChange={setBusca} placeholder="Buscar produto ou código…" autoFocus />
            </div>
            <Badge tone="leaf" className="shrink-0">
              Caixa {caixa.codigo}
            </Badge>
            {emEspera.length > 0 ? (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/pedidos?status=ABERTO">
                  <Pause className="size-3.5" />
                  {emEspera.length} em espera
                </Link>
              </Button>
            ) : null}
          </div>

          {/* Categorias */}
          <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCategoriaAtiva(null)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                categoriaAtiva === null
                  ? 'border-ink bg-ink text-cream'
                  : 'border-hairline-strong bg-paper-raised text-body-muted hover:border-body-subtle',
              )}
            >
              Tudo
            </button>
            {catalogo.categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoriaAtiva(c.id)}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  categoriaAtiva === c.id
                    ? 'border-transparent text-white'
                    : 'border-hairline-strong bg-paper-raised text-body-muted hover:border-body-subtle',
                )}
                style={categoriaAtiva === c.id ? { background: c.cor } : undefined}
              >
                {c.nome}
              </button>
            ))}
          </div>

          {/* Grade de produtos */}
          {produtosVisiveis.length === 0 ? (
            <EmptyState
              icone={Search}
              titulo="Nenhum produto encontrado"
              descricao={busca ? `Nada com "${busca}" nesta categoria.` : 'Cadastre produtos para vender aqui.'}
              className="rounded-card border border-hairline bg-paper-raised"
            />
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {produtosVisiveis.map((p) => {
                const cor = catalogo.categorias.find((c) => c.id === p.categoriaId)?.cor ?? '#D24237'
                const semEstoque = p.controlaEstoque && p.estoqueAtual <= 0
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => aoClicarProduto(p)}
                      disabled={!p.disponivel}
                      className={cn(
                        'group relative flex h-full w-full flex-col overflow-hidden rounded-card border border-hairline bg-paper-raised text-left shadow-raise transition-all',
                        'hover:-translate-y-0.5 hover:border-nobru-300 hover:shadow-card active:translate-y-0',
                        !p.disponivel && 'opacity-60',
                      )}
                    >
                      <span
                        className="flex h-20 items-center justify-center overflow-hidden sm:h-24"
                        style={{ background: `${cor}1a` }}
                      >
                        {p.imagemUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagemUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="font-display text-2xl font-black" style={{ color: cor }}>
                            {p.nome.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="flex flex-1 flex-col justify-between gap-1 p-2.5">
                        <span className="line-clamp-2 text-[13px] leading-snug font-semibold">{p.nome}</span>
                        <span className="flex items-baseline justify-between gap-1">
                          <span className="font-display text-sm font-extrabold" data-numeric>
                            {moeda(p.precoVenda)}
                          </span>
                          {p.controlaEstoque ? (
                            <span
                              className={cn(
                                'text-[10px] font-bold',
                                semEstoque ? 'text-danger' : p.estoqueAtual <= 5 ? 'text-caution' : 'text-body-subtle',
                              )}
                              data-numeric
                            >
                              {numero(p.estoqueAtual)} un
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {!p.disponivel ? (
                        <span className="absolute top-2 left-1/2 -translate-x-1/2">
                          <Stamp>Sold out</Stamp>
                        </span>
                      ) : null}
                      {p.variacoes.length > 0 ? (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-cream">
                          {p.variacoes.length} tam.
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ═══ Comanda (desktop) ══════════════════════════════════════════ */}
        <aside className="hidden lg:block">
          <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto px-5 py-4">
            <Comanda
              modoPedidoAberto={modoPedidoAberto}
              pedidoAberto={pedidoAberto}
              tipo={tipo}
              setTipo={setTipo}
              itens={itens}
              setItens={setItens}
              cliente={cliente}
              nomeCliente={nomeCliente}
              setNomeCliente={setNomeCliente}
              subtotal={subtotal}
              desconto={descontoEfetivo}
              taxaServico={taxaServico}
              taxaEntrega={tipo === 'DELIVERY' ? taxaEntrega : 0}
              total={total}
              cupom={cupom}
              permissoes={permissoes}
              onAbrirDesconto={() => setDescontoAberto(true)}
              onAbrirCliente={() => setClienteAberto(true)}
              onLimpar={limparVenda}
              onFinalizar={() => setPagamentoAberto(true)}
              onEspera={async () => {
                if (pedidoAberto) await acaoEspera.executar({ pedidoId: pedidoAberto.id, emEspera: true })
              }}
              podeFinalizar={podeFinalizar}
              pendente={pendente}
            />
          </div>
        </aside>
      </div>

      {/* ═══ Barra inferior (mobile/tablet) ═══════════════════════════════ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper-raised/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <Button size="touch" full onClick={() => setCarrinhoAberto(true)} disabled={quantidadeItens === 0}>
          <ShoppingBag />
          {quantidadeItens === 0 ? 'Carrinho vazio' : `${numero(quantidadeItens)} item(ns)`}
          <span className="ml-auto font-display text-lg" data-numeric>
            {moeda(total)}
          </span>
        </Button>
      </div>

      <Sheet open={carrinhoAberto} onOpenChange={setCarrinhoAberto}>
        <SheetContent largura="sm">
          <SheetHeader>
            <SheetTitle>Comanda</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <Comanda
              modoPedidoAberto={modoPedidoAberto}
              pedidoAberto={pedidoAberto}
              tipo={tipo}
              setTipo={setTipo}
              itens={itens}
              setItens={setItens}
              cliente={cliente}
              nomeCliente={nomeCliente}
              setNomeCliente={setNomeCliente}
              subtotal={subtotal}
              desconto={descontoEfetivo}
              taxaServico={taxaServico}
              taxaEntrega={tipo === 'DELIVERY' ? taxaEntrega : 0}
              total={total}
              cupom={cupom}
              permissoes={permissoes}
              onAbrirDesconto={() => setDescontoAberto(true)}
              onAbrirCliente={() => setClienteAberto(true)}
              onLimpar={limparVenda}
              onFinalizar={() => {
                setCarrinhoAberto(false)
                setPagamentoAberto(true)
              }}
              onEspera={async () => {
                if (pedidoAberto) await acaoEspera.executar({ pedidoId: pedidoAberto.id, emEspera: true })
              }}
              podeFinalizar={podeFinalizar}
              pendente={pendente}
              semMoldura
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ═══ Diálogos ════════════════════════════════════════════════════ */}
      {produtoNoDialogo ? (
        <DialogoItem
          produto={produtoNoDialogo}
          adicionais={catalogo.adicionais.filter((a) => produtoNoDialogo.adicionaisIds.includes(a.id))}
          onFechar={() => setProdutoNoDialogo(null)}
          onAdicionar={(opcoes) => {
            adicionar(produtoNoDialogo, opcoes)
            setProdutoNoDialogo(null)
          }}
        />
      ) : null}

      <DialogoPagamento
        aberto={pagamentoAberto}
        onAbertoChange={setPagamentoAberto}
        total={total}
        formas={catalogo.formasPagamento}
        cliente={cliente ?? pedidoAberto?.cliente ?? null}
        valorPorPonto={config.valorPorPonto}
        pendente={pendente}
        onConfirmar={confirmarPagamento}
      />

      <DialogoDesconto
        aberto={descontoAberto}
        onAbertoChange={setDescontoAberto}
        subtotal={subtotal}
        limite={permissoes.descontoLivre ? 100 : config.descontoMaximoOperador}
        valorAtual={desconto}
        motivoAtual={descontoMotivo}
        cupomAtual={cupom}
        onAplicar={(valor, motivo, codigoCupom) => {
          setDesconto(valor)
          setDescontoMotivo(motivo)
          setCupom(codigoCupom)
          setDescontoAberto(false)
        }}
      />

      <DialogoCliente
        aberto={clienteAberto}
        onAbertoChange={setClienteAberto}
        podeCadastrar={permissoes.cadastrarCliente}
        onSelecionar={(c) => {
          setCliente(c)
          setClienteAberto(false)
        }}
        onLimpar={() => {
          setCliente(null)
          setClienteAberto(false)
        }}
      />

      {recibo ? <Recibo dados={recibo} onFechar={() => setRecibo(null)} /> : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMANDA
// ═══════════════════════════════════════════════════════════════════════════

function Comanda({
  modoPedidoAberto,
  pedidoAberto,
  tipo,
  setTipo,
  itens,
  setItens,
  cliente,
  nomeCliente,
  setNomeCliente,
  subtotal,
  desconto,
  taxaServico,
  taxaEntrega,
  total,
  cupom,
  permissoes,
  onAbrirDesconto,
  onAbrirCliente,
  onLimpar,
  onFinalizar,
  onEspera,
  podeFinalizar,
  pendente,
  semMoldura = false,
}: {
  modoPedidoAberto: boolean
  pedidoAberto: PedidoAberto | null
  tipo: TipoVenda
  setTipo: (t: TipoVenda) => void
  itens: ItemCarrinho[]
  setItens: React.Dispatch<React.SetStateAction<ItemCarrinho[]>>
  cliente: ClientePdv | null
  nomeCliente: string
  setNomeCliente: (v: string) => void
  subtotal: number
  desconto: number
  taxaServico: number
  taxaEntrega: number
  total: number
  cupom: string
  permissoes: { cancelarItem: boolean }
  onAbrirDesconto: () => void
  onAbrirCliente: () => void
  onLimpar: () => void
  onFinalizar: () => void
  onEspera: () => void
  podeFinalizar: boolean
  pendente: boolean
  semMoldura?: boolean
}) {
  const linhas = modoPedidoAberto
    ? pedidoAberto!.itens.map((i) => ({
        chave: i.id,
        nome: i.nome,
        quantidade: i.quantidade,
        total: i.total,
        observacao: i.observacao,
        adicionais: i.adicionais,
        editavel: false as const,
      }))
    : itens.map((i) => ({
        chave: i.chave,
        nome: i.variacaoNome ? `${i.nome} · ${i.variacaoNome}` : i.nome,
        quantidade: i.quantidade,
        total: totalDoItem(i),
        observacao: i.observacao || null,
        adicionais: i.adicionais,
        editavel: true as const,
      }))

  return (
    <div className={cn(!semMoldura && 'ticket rounded-card border border-hairline')}>
      <div className="px-4 pt-4">
        {modoPedidoAberto ? (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-control bg-nobru-50 px-3 py-2">
            <span>
              <span className="block font-mono text-xs font-bold text-nobru-700">{pedidoAberto!.codigo}</span>
              <span className="block text-xs text-body-muted">
                {pedidoAberto!.mesaNumero ? `Mesa ${pedidoAberto!.mesaNumero}` : 'Pedido aberto'}
              </span>
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pdv">
                <X className="size-3.5" />
                Sair
              </Link>
            </Button>
          </div>
        ) : (
          <SegmentedControl
            value={tipo}
            onValueChange={setTipo}
            tamanho="touch"
            opcoes={[
              { valor: 'BALCAO', rotulo: 'Balcão', icone: Coffee },
              { valor: 'VIAGEM', rotulo: 'Viagem', icone: ShoppingBag },
              { valor: 'DELIVERY', rotulo: 'Entrega', icone: Truck },
            ]}
          />
        )}

        {/* Cliente */}
        <div className="mt-3">
          {cliente ?? pedidoAberto?.cliente ? (
            <button
              type="button"
              onClick={onAbrirCliente}
              disabled={modoPedidoAberto}
              className="flex w-full items-center gap-2 rounded-control border border-hairline-strong bg-paper px-3 py-2 text-left"
            >
              <UserRound className="size-4 shrink-0 text-body-subtle" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{(cliente ?? pedidoAberto!.cliente)!.nome}</span>
                <span className="block text-xs text-body-muted" data-numeric>
                  {(cliente ?? pedidoAberto!.cliente)!.pontos} pontos
                </span>
              </span>
            </button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Nome no balcão (opcional)"
                className="flex-1"
              />
              <Button variant="secondary" size="icon" aria-label="Buscar cliente cadastrado" onClick={onAbrirCliente}>
                <UserRound />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="mt-3 max-h-[42vh] min-h-24 overflow-y-auto border-y border-hairline lg:max-h-[38vh]">
        {linhas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-body-muted">
            Toque num produto para começar.
            <br />
            <span className="text-xs text-body-subtle">O carrinho só vai para o banco no pagamento.</span>
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {linhas.map((linha) => (
              <li key={linha.chave} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{linha.nome}</p>
                    {linha.adicionais.length > 0 ? (
                      <p className="text-xs text-body-muted">
                        + {linha.adicionais.map((a) => `${a.nome}${a.quantidade > 1 ? ` ×${a.quantidade}` : ''}`).join(', ')}
                      </p>
                    ) : null}
                    {linha.observacao ? <p className="text-xs italic text-body-subtle">“{linha.observacao}”</p> : null}
                  </div>
                  <span className="shrink-0 text-sm font-bold" data-numeric>
                    {moeda(linha.total)}
                  </span>
                </div>
                {linha.editavel ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <QuantityStepper
                      value={linha.quantidade}
                      onValueChange={(q) =>
                        setItens((atual) => atual.map((i) => (i.chave === linha.chave ? { ...i, quantidade: q } : i)))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${linha.nome}`}
                      className="text-danger"
                      onClick={() => setItens((atual) => atual.filter((i) => i.chave !== linha.chave))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-body-muted" data-numeric>
                    {fmtQtd(linha.quantidade)} un
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totais */}
      <div className="space-y-1.5 px-4 py-3 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-body-muted">Subtotal</span>
          <span data-numeric>{moeda(subtotal)}</span>
        </div>
        {desconto > 0 ? (
          <div className="flex justify-between text-nobru-600">
            <span>Desconto{cupom ? ` (${cupom})` : ''}</span>
            <span data-numeric>−{moeda(desconto)}</span>
          </div>
        ) : null}
        {taxaServico > 0 ? (
          <div className="flex justify-between">
            <span className="text-body-muted">Taxa de serviço</span>
            <span data-numeric>{moeda(taxaServico)}</span>
          </div>
        ) : null}
        {taxaEntrega > 0 ? (
          <div className="flex justify-between">
            <span className="text-body-muted">Entrega</span>
            <span data-numeric>{moeda(taxaEntrega)}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t-2 border-dashed border-hairline-strong pt-2">
          <span className="font-sans text-sm font-bold">Total</span>
          <span className="font-display text-2xl font-extrabold" data-numeric>
            {moeda(total)}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="space-y-2 px-4 pb-4">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onAbrirDesconto} disabled={modoPedidoAberto || linhas.length === 0}>
            <Percent className="size-3.5" />
            Desconto
          </Button>
          {modoPedidoAberto ? (
            <Button variant="secondary" size="sm" className="flex-1" onClick={onEspera}>
              <Pause className="size-3.5" />
              Em espera
            </Button>
          ) : (
            <Button variant="secondary" size="sm" className="flex-1" onClick={onLimpar} disabled={linhas.length === 0}>
              <Trash2 className="size-3.5" />
              Limpar
            </Button>
          )}
        </div>
        <Button size="touch" full onClick={onFinalizar} disabled={!podeFinalizar} loading={pendente}>
          <Tag />
          Cobrar {moeda(total)}
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DESCONTO
// ═══════════════════════════════════════════════════════════════════════════

function DialogoDesconto({
  aberto,
  onAbertoChange,
  subtotal,
  limite,
  valorAtual,
  motivoAtual,
  cupomAtual,
  onAplicar,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  subtotal: number
  limite: number
  valorAtual: number
  motivoAtual: string
  cupomAtual: string
  onAplicar: (valor: number, motivo: string, cupom: string) => void
}) {
  const [modo, setModo] = React.useState<'PERCENTUAL' | 'VALOR' | 'CUPOM'>('PERCENTUAL')
  const [percentual, setPercentual] = React.useState(0)
  const [valor, setValor] = React.useState(valorAtual)
  const [motivo, setMotivo] = React.useState(motivoAtual)
  const [codigo, setCodigo] = React.useState(cupomAtual)

  const valorCalculado = modo === 'PERCENTUAL' ? brl((subtotal * percentual) / 100) : valor
  const percentualEfetivo = subtotal > 0 ? (valorCalculado / subtotal) * 100 : 0
  const acimaDoLimite = modo !== 'CUPOM' && percentualEfetivo > limite

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Desconto</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <SegmentedControl
            value={modo}
            onValueChange={setModo}
            tamanho="touch"
            opcoes={[
              { valor: 'PERCENTUAL', rotulo: '%' },
              { valor: 'VALOR', rotulo: 'R$' },
              { valor: 'CUPOM', rotulo: 'Cupom' },
            ]}
          />

          {modo === 'PERCENTUAL' ? (
            <>
              <Field label="Percentual" htmlFor="desc-pct" dica={`Seu limite: ${limite}%`}>
                <Input
                  id="desc-pct"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  value={percentual || ''}
                  onChange={(e) => setPercentual(Number(e.target.value))}
                  className="text-right font-semibold"
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20].map((p) => (
                  <Button key={p} variant="secondary" size="sm" onClick={() => setPercentual(p)}>
                    {p}%
                  </Button>
                ))}
              </div>
            </>
          ) : null}

          {modo === 'VALOR' ? (
            <Field label="Valor do desconto" htmlFor="desc-valor">
              <MoneyInput id="desc-valor" value={valor} onValueChange={setValor} />
            </Field>
          ) : null}

          {modo === 'CUPOM' ? (
            <Field label="Código do cupom" htmlFor="desc-cupom" dica="O sistema valida validade, mínimo e limite de uso.">
              <Input
                id="desc-cupom"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="NOBRU10"
                className="font-mono uppercase"
              />
            </Field>
          ) : null}

          {modo !== 'CUPOM' ? (
            <>
              <Field label="Motivo" htmlFor="desc-motivo" obrigatorio dica="Fica no log de auditoria com o seu nome.">
                <Input
                  id="desc-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: cortesia de aniversário"
                />
              </Field>
              <div className="rounded-control bg-paper-sunken px-3 py-2.5 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Desconto</span>
                  <span data-numeric>−{moeda(valorCalculado)}</span>
                </div>
                <div className="mt-0.5 flex justify-between text-xs text-body-muted">
                  <span>Novo total</span>
                  <span data-numeric>{moeda(brl(Math.max(0, subtotal - valorCalculado)))}</span>
                </div>
              </div>
              {acimaDoLimite ? (
                <p className="rounded-control border border-caution/30 bg-caution-soft px-3 py-2 text-xs font-semibold text-caution">
                  {percentualEfetivo.toFixed(1)}% passa do seu limite de {limite}%. Um gerente precisa autorizar.
                </p>
              ) : null}
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onAplicar(0, '', '')}>
            Remover desconto
          </Button>
          <Button
            disabled={(modo !== 'CUPOM' && (valorCalculado <= 0 || !motivo.trim() || acimaDoLimite)) || (modo === 'CUPOM' && !codigo.trim())}
            onClick={() => (modo === 'CUPOM' ? onAplicar(0, '', codigo.trim()) : onAplicar(valorCalculado, motivo.trim(), ''))}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

function DialogoCliente({
  aberto,
  onAbertoChange,
  podeCadastrar,
  onSelecionar,
  onLimpar,
}: {
  aberto: boolean
  onAbertoChange: (v: boolean) => void
  podeCadastrar: boolean
  onSelecionar: (c: ClientePdv) => void
  onLimpar: () => void
}) {
  const [termo, setTermo] = React.useState('')
  const [resultados, setResultados] = React.useState<ClientePdv[]>([])
  const [buscando, setBuscando] = React.useState(false)
  const [novoNome, setNovoNome] = React.useState('')
  const [novoTelefone, setNovoTelefone] = React.useState('')
  const debounced = useDebounce(termo, 300)

  const acaoCadastro = useAcao(cadastroRapidoCliente, { sucesso: 'Cliente cadastrado', revalidar: false })

  React.useEffect(() => {
    if (!aberto) return
    if (debounced.trim().length < 2) {
      setResultados([])
      return
    }
    let cancelado = false
    setBuscando(true)
    buscarClientesAction({ termo: debounced })
      .then((r) => {
        if (!cancelado && r.ok) setResultados(r.dados as ClientePdv[])
      })
      .finally(() => !cancelado && setBuscando(false))
    return () => {
      cancelado = true
    }
  }, [debounced, aberto])

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent largura="sm">
        <DialogHeader>
          <DialogTitle>Cliente</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <SearchInput value={termo} onValueChange={setTermo} placeholder="Nome ou telefone…" autoFocus />

          {buscando ? <p className="text-sm text-body-muted">Buscando…</p> : null}

          {resultados.length > 0 ? (
            <ul className="divide-y divide-hairline overflow-hidden rounded-control border border-hairline">
              {resultados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(c)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-paper-sunken"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.nome}</span>
                      <span className="block text-xs text-body-muted">{c.telefone}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-nobru-600" data-numeric>
                      {c.pontos} pts
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {termo.trim().length >= 2 && resultados.length === 0 && !buscando ? (
            <p className="text-sm text-body-muted">Nenhum cliente com esse nome ou telefone.</p>
          ) : null}

          {podeCadastrar ? (
            <div className="space-y-3 rounded-control border border-hairline bg-paper p-3">
              <p className="text-xs font-bold tracking-wide text-body-muted uppercase">Cadastro rápido</p>
              <Field label="Nome" htmlFor="novo-nome">
                <Input id="novo-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              </Field>
              <Field label="WhatsApp" htmlFor="novo-tel">
                <Input
                  id="novo-tel"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  inputMode="tel"
                  placeholder="(12) 99999-0000"
                />
              </Field>
              <Button
                size="sm"
                full
                loading={acaoCadastro.pendente}
                disabled={novoNome.trim().length < 2 || novoTelefone.replace(/\D/g, '').length < 10}
                onClick={async () => {
                  const r = await acaoCadastro.executar({ nome: novoNome.trim(), telefone: novoTelefone })
                  if (r.ok) {
                    onSelecionar(r.dados as ClientePdv)
                    setNovoNome('')
                    setNovoTelefone('')
                  }
                }}
              >
                <Plus className="size-3.5" />
                Cadastrar e usar
              </Button>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onLimpar}>
            Vender sem cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
