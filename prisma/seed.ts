/**
 * ════════════════════════════════════════════════════════════════════════════
 *  SEED — Nobru Coffee e Donuts
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Gera uma loja com 45 dias de operação real: compras recebidas, produção
 * concluída, vendas hora a hora com o perfil de movimento de uma cafeteria
 * (pico das 15h às 18h), caixas abertos e fechados, encomendas, perdas e
 * contas. O objetivo é que a primeira tela depois da instalação já mostre
 * números que fazem sentido — um sistema vazio não deixa avaliar nada.
 *
 * Os dados de identificação vêm do dossiê público da marca
 * (docs/referencias/NOBRU_COFFEE_BRIEF.md). Clientes e funcionários são
 * fictícios.
 *
 * Rodar:  pnpm db:seed
 * Refazer do zero:  pnpm db:reset
 */
import { PrismaClient, type Prisma, type TipoMovimento, type UnidadeMedida } from '@prisma/client'
import { randomBytes, scrypt as scryptCb } from 'node:crypto'
import { promisify } from 'node:util'

const db = new PrismaClient()
const scrypt = promisify(scryptCb) as (p: string, s: Buffer, k: number, o: object) => Promise<Buffer>

// ── Utilidades ─────────────────────────────────────────────────────────────

/** RNG determinístico: o mesmo seed sempre gera a mesma loja. */
let semente = 20160802 // data de abertura do CNPJ
function rnd() {
  semente = (semente * 1664525 + 1013904223) % 4294967296
  return semente / 4294967296
}
const entre = (min: number, max: number) => min + rnd() * (max - min)
const inteiro = (min: number, max: number) => Math.floor(entre(min, max + 1))
const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(rnd() * lista.length)]
const talvez = (p: number) => rnd() < p
const dinheiro = (v: number) => Math.round(v * 100) / 100

async function hashSenha(senha: string) {
  const salt = randomBytes(16)
  const N = 2 ** 15
  const derivado = await scrypt(senha, salt, 64, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$${N}$8$1$${salt.toString('base64')}$${derivado.toString('base64')}`
}

function diasAtras(dias: number, hora = 12, minuto = 0) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(hora, minuto, 0, 0)
  return d
}

const DIAS_HISTORICO = 45

// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🍩 Semeando a Nobru Coffee…\n')

  // ── Limpeza (ordem inversa das dependências) ────────────────────────────
  console.log('  limpando dados anteriores…')
  await db.$transaction([
    db.logSistema.deleteMany(),
    db.notificacao.deleteMany(),
    db.transacaoFidelidade.deleteMany(),
    db.pedidoItemAdicional.deleteMany(),
    db.pedidoItem.deleteMany(),
    db.pagamento.deleteMany(),
    db.movimentoCaixa.deleteMany(),
    db.contaReceber.deleteMany(),
    db.contaPagar.deleteMany(),
    db.pedido.deleteMany(),
    db.caixa.deleteMany(),
    db.encomendaItem.deleteMany(),
    db.encomenda.deleteMany(),
    db.perda.deleteMany(),
    db.ordemProducaoItem.deleteMany(),
    db.ordemProducao.deleteMany(),
    db.inventarioItem.deleteMany(),
    db.inventario.deleteMany(),
    db.recebimentoItem.deleteMany(),
    db.recebimento.deleteMany(),
    db.pedidoCompraItem.deleteMany(),
    db.pedidoCompra.deleteMany(),
    db.movimentoEstoque.deleteMany(),
    db.lote.deleteMany(),
    db.fichaTecnicaItem.deleteMany(),
    db.fichaTecnica.deleteMany(),
    db.comboItem.deleteMany(),
    db.produtoAdicional.deleteMany(),
    db.produtoVariacao.deleteMany(),
    db.adicional.deleteMany(),
    db.produto.deleteMany(),
    db.categoria.deleteMany(),
    db.ingrediente.deleteMany(),
    db.fornecedor.deleteMany(),
    db.cupom.deleteMany(),
    db.cliente.deleteMany(),
    db.mesa.deleteMany(),
    db.formaPagamento.deleteMany(),
    db.categoriaFinanceira.deleteMany(),
    db.contador.deleteMany(),
    db.configuracao.deleteMany(),
    db.sessao.deleteMany(),
    db.usuario.deleteMany(),
    db.cargo.deleteMany(),
    db.loja.deleteMany(),
    db.empresa.deleteMany(),
  ])

  // ── Empresa e loja ──────────────────────────────────────────────────────
  const empresa = await db.empresa.create({
    data: {
      razaoSocial: 'NOBRU COFFEE E DONUTS LTDA - ME',
      nomeFantasia: 'Nobru Coffee e Donuts',
      cnpj: '25350633000150',
      email: 'nobruarte@gmail.com',
      telefone: '12996085508',
    },
  })

  const loja = await db.loja.create({
    data: {
      empresaId: empresa.id,
      nome: 'Nobru Coffee — Jardim Esplanada',
      slug: 'nobru-esplanada',
      cnpj: '25350633000150',
      telefone: '12996085508',
      email: 'nobruarte@gmail.com',
      cep: '12242840',
      logradouro: 'Av. São João',
      numero: '390',
      bairro: 'Jardim Esplanada',
      cidade: 'São José dos Campos',
      uf: 'SP',
    },
  })

  await db.configuracao.create({
    data: {
      lojaId: loja.id,
      nomeNegocio: 'Nobru Coffee e Donuts',
      alertaValidadeDias: 7,
      pontosPorReal: 1,
      valorPorPonto: 0.05,
      taxaServicoPercentual: 0,
      taxaEntregaPadrao: 8,
      descontoMaximoOperador: 10,
      baixaEstoqueNaVenda: true,
      horarioAbertura: '10:00',
      horarioFechamento: '19:30',
      diasFuncionamento: ['ter', 'qua', 'qui', 'sex', 'sab', 'dom'],
      whatsapp: '12996085508',
      instagram: '@nobrucoffee',
    },
  })

  // ── Cargos e equipe ─────────────────────────────────────────────────────
  const { CARGOS_PADRAO } = await import('../src/server/auth/permissions')
  const cargos: Record<string, string> = {}
  for (const c of CARGOS_PADRAO) {
    const criado = await db.cargo.create({
      data: {
        empresaId: empresa.id,
        nome: c.nome,
        slug: c.slug,
        descricao: c.descricao,
        permissoes: [...c.permissoes],
        sistema: true,
      },
    })
    cargos[c.slug] = criado.id
  }

  const senhaPadrao = await hashSenha('nobru2026')
  const equipe = await Promise.all(
    [
      { nome: 'Jessica Carneiro', email: 'jessica@nobrucoffee.com.br', cargo: 'administrador', admissao: 1200 },
      { nome: 'Bruno Nobre', email: 'bruno@nobrucoffee.com.br', cargo: 'gerente', admissao: 900 },
      { nome: 'Camila Ferraz', email: 'camila@nobrucoffee.com.br', cargo: 'atendente', admissao: 400 },
      { nome: 'Diego Matos', email: 'diego@nobrucoffee.com.br', cargo: 'atendente', admissao: 180 },
      { nome: 'Aline Prado', email: 'aline@nobrucoffee.com.br', cargo: 'producao', admissao: 620 },
    ].map((u) =>
      db.usuario.create({
        data: {
          empresaId: empresa.id,
          lojaId: loja.id,
          cargoId: cargos[u.cargo],
          nome: u.nome,
          email: u.email,
          senhaHash: senhaPadrao,
          telefone: `1299${inteiro(1000000, 9999999)}`,
          admitidoEm: diasAtras(u.admissao),
          ultimoLoginEm: diasAtras(inteiro(0, 2), inteiro(9, 18)),
        },
      }),
    ),
  )
  const [admin, gerente, camila, diego, producaoUser] = equipe
  const atendentes = [camila, diego, gerente]

  // ── Formas de pagamento ─────────────────────────────────────────────────
  const formas = await Promise.all(
    [
      { nome: 'Dinheiro', slug: 'dinheiro', tipo: 'DINHEIRO', caixa: true, troco: true, taxa: 0, ordem: 1 },
      { nome: 'PIX', slug: 'pix', tipo: 'PIX', caixa: false, troco: false, taxa: 0, ordem: 2 },
      { nome: 'Débito', slug: 'debito', tipo: 'DEBITO', caixa: false, troco: false, taxa: 1.49, ordem: 3 },
      { nome: 'Crédito', slug: 'credito', tipo: 'CREDITO', caixa: false, troco: false, taxa: 3.19, ordem: 4, prazo: 30 },
      { nome: 'iFood', slug: 'ifood', tipo: 'VOUCHER', caixa: false, troco: false, taxa: 12, ordem: 5, prazo: 30 },
      { nome: 'Fiado', slug: 'fiado', tipo: 'FIADO', caixa: false, troco: false, taxa: 0, ordem: 6 },
    ].map((f) =>
      db.formaPagamento.create({
        data: {
          lojaId: loja.id,
          nome: f.nome,
          slug: f.slug,
          tipo: f.tipo as never,
          contaNoCaixa: f.caixa,
          permiteTroco: f.troco,
          taxaPercentual: f.taxa,
          prazoRecebimentoDias: f.prazo ?? 0,
          ordem: f.ordem,
        },
      }),
    ),
  )
  const [fDinheiro, fPix, fDebito, fCredito, fIfood] = formas
  /** Distribuição realista de uma cafeteria de bairro em SJC. */
  const pesoFormas: Array<[(typeof formas)[number], number]> = [
    [fPix, 38],
    [fDebito, 24],
    [fCredito, 18],
    [fDinheiro, 12],
    [fIfood, 8],
  ]

  // ── Categorias financeiras ──────────────────────────────────────────────
  const catFin = await Promise.all(
    [
      { nome: 'Insumos', tipo: 'DESPESA', cor: '#6B4A2F' },
      { nome: 'Aluguel', tipo: 'DESPESA', cor: '#B3352C' },
      { nome: 'Energia e água', tipo: 'DESPESA', cor: '#B8730F' },
      { nome: 'Folha de pagamento', tipo: 'DESPESA', cor: '#7A4E9B' },
      { nome: 'Marketing', tipo: 'DESPESA', cor: '#D24237' },
      { nome: 'Manutenção', tipo: 'DESPESA', cor: '#948A82' },
      { nome: 'Vendas', tipo: 'RECEITA', cor: '#2E7D5B' },
      { nome: 'Encomendas', tipo: 'RECEITA', cor: '#2E7D5B' },
      { nome: 'Outras receitas', tipo: 'RECEITA', cor: '#1F5FA8' },
    ].map((c) => db.categoriaFinanceira.create({ data: { lojaId: loja.id, nome: c.nome, tipo: c.tipo as never, cor: c.cor } })),
  )
  const catInsumos = catFin[0]
  const catAluguel = catFin[1]
  const catEnergia = catFin[2]
  const catFolha = catFin[3]
  const catMarketing = catFin[4]

  // ── Mesas ───────────────────────────────────────────────────────────────
  await db.mesa.createMany({
    data: [
      ...Array.from({ length: 6 }, (_, i) => ({ lojaId: loja.id, numero: i + 1, capacidade: 2, area: 'Salão' })),
      ...Array.from({ length: 3 }, (_, i) => ({ lojaId: loja.id, numero: i + 7, capacidade: 4, area: 'Salão' })),
      { lojaId: loja.id, numero: 10, nome: 'Balcão da janela', capacidade: 3, area: 'Vitrine' },
      { lojaId: loja.id, numero: 11, capacidade: 2, area: 'Calçada' },
      { lojaId: loja.id, numero: 12, capacidade: 2, area: 'Calçada' },
    ],
  })

  // ── Fornecedores ────────────────────────────────────────────────────────
  const fornecedores = await Promise.all(
    [
      { nome: 'Moinho Vale do Paraíba', razao: 'Moinho Vale do Paraíba Ltda', cnpj: '12345678000190', contato: 'Sr. Aparecido', prazo: 3 },
      { nome: 'Laticínios Santa Clara', razao: 'Laticínios Santa Clara S/A', cnpj: '23456789000181', contato: 'Marta', prazo: 2 },
      { nome: 'Torrefação Serra Azul', razao: 'Torrefação Serra Azul ME', cnpj: '34567890000172', contato: 'Rafael', prazo: 5 },
      { nome: 'Distribuidora Doce Vale', razao: 'Doce Vale Distribuidora Ltda', cnpj: '45678901000163', contato: 'Priscila', prazo: 4 },
      { nome: 'Embalagens SJC', razao: 'Embalagens São José Ltda', cnpj: '56789012000154', contato: 'Wagner', prazo: 7 },
      { nome: 'Hortifruti do Vale', razao: 'Hortifruti do Vale ME', cnpj: '67890123000145', contato: 'Dona Neide', prazo: 1 },
    ].map((f) =>
      db.fornecedor.create({
        data: {
          lojaId: loja.id,
          nome: f.nome,
          razaoSocial: f.razao,
          cnpjCpf: f.cnpj,
          contato: f.contato,
          telefone: `1233${inteiro(100000, 999999)}`,
          email: `contato@${f.nome.toLowerCase().replace(/[^a-z]/g, '')}.com.br`,
          cidade: 'São José dos Campos',
          uf: 'SP',
          prazoEntregaDias: f.prazo,
        },
      }),
    ),
  )
  const [fMoinho, fLaticinios, fTorrefacao, fDoceVale, fEmbalagens, fHorti] = fornecedores

  // ── Insumos ─────────────────────────────────────────────────────────────
  type DefIngrediente = {
    nome: string
    sku: string
    unidade: UnidadeMedida
    custo: number
    minimo: number
    maximo: number
    local: string
    perecivel?: boolean
    fornecedor: string
  }

  const defsIngredientes: DefIngrediente[] = [
    { nome: 'Farinha de trigo especial', sku: 'FAR-TRI', unidade: 'G', custo: 0.0062, minimo: 20000, maximo: 60000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Açúcar refinado', sku: 'ACU-REF', unidade: 'G', custo: 0.0051, minimo: 12000, maximo: 40000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Açúcar de confeiteiro', sku: 'ACU-CON', unidade: 'G', custo: 0.0098, minimo: 4000, maximo: 12000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Fermento biológico seco', sku: 'FER-BIO', unidade: 'G', custo: 0.062, minimo: 800, maximo: 3000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Sal refinado', sku: 'SAL-REF', unidade: 'G', custo: 0.0035, minimo: 2000, maximo: 8000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Leite integral', sku: 'LEI-INT', unidade: 'ML', custo: 0.0058, minimo: 20000, maximo: 60000, local: 'Câmara fria', perecivel: true, fornecedor: fLaticinios.id },
    { nome: 'Creme de leite fresco', sku: 'CRE-LEI', unidade: 'ML', custo: 0.0235, minimo: 4000, maximo: 15000, local: 'Câmara fria', perecivel: true, fornecedor: fLaticinios.id },
    { nome: 'Manteiga sem sal', sku: 'MAN-SSA', unidade: 'G', custo: 0.049, minimo: 5000, maximo: 18000, local: 'Câmara fria', perecivel: true, fornecedor: fLaticinios.id },
    { nome: 'Ovos', sku: 'OVO-UNI', unidade: 'UN', custo: 0.78, minimo: 180, maximo: 600, local: 'Câmara fria', perecivel: true, fornecedor: fHorti.id },
    { nome: 'Cream cheese', sku: 'CRE-CHE', unidade: 'G', custo: 0.048, minimo: 3000, maximo: 10000, local: 'Câmara fria', perecivel: true, fornecedor: fLaticinios.id },
    { nome: 'Café em grãos BLENDS NC', sku: 'CAF-BLE', unidade: 'G', custo: 0.079, minimo: 6000, maximo: 20000, local: 'Estoque seco', fornecedor: fTorrefacao.id },
    { nome: 'Café em grãos coado', sku: 'CAF-COA', unidade: 'G', custo: 0.052, minimo: 4000, maximo: 12000, local: 'Estoque seco', fornecedor: fTorrefacao.id },
    { nome: 'Chocolate meio amargo 55%', sku: 'CHO-MEI', unidade: 'G', custo: 0.058, minimo: 5000, maximo: 16000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Chocolate branco', sku: 'CHO-BRA', unidade: 'G', custo: 0.061, minimo: 3000, maximo: 10000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Creme de avelã (Nutella)', sku: 'NUT-AVE', unidade: 'G', custo: 0.072, minimo: 5000, maximo: 15000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Biscoito tipo Oreo', sku: 'BIS-ORE', unidade: 'G', custo: 0.045, minimo: 2500, maximo: 8000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Morango fresco', sku: 'MOR-FRE', unidade: 'G', custo: 0.028, minimo: 3000, maximo: 9000, local: 'Câmara fria', perecivel: true, fornecedor: fHorti.id },
    { nome: 'Geleia de morango', sku: 'GEL-MOR', unidade: 'G', custo: 0.031, minimo: 2000, maximo: 7000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Doce de leite', sku: 'DOC-LEI', unidade: 'G', custo: 0.029, minimo: 2500, maximo: 8000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Granulado colorido', sku: 'GRA-COL', unidade: 'G', custo: 0.038, minimo: 800, maximo: 3000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Crocante de caramelo', sku: 'CRO-CAR', unidade: 'G', custo: 0.089, minimo: 800, maximo: 3000, local: 'Estoque seco', fornecedor: fDoceVale.id },
    { nome: 'Óleo de fritura', sku: 'OLE-FRI', unidade: 'ML', custo: 0.0095, minimo: 10000, maximo: 30000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Frango desfiado temperado', sku: 'FRA-DES', unidade: 'G', custo: 0.042, minimo: 4000, maximo: 12000, local: 'Câmara fria', perecivel: true, fornecedor: fHorti.id },
    { nome: 'Farinha de rosca', sku: 'FAR-ROS', unidade: 'G', custo: 0.014, minimo: 2000, maximo: 8000, local: 'Estoque seco', fornecedor: fMoinho.id },
    { nome: 'Queijo mussarela', sku: 'QUE-MUS', unidade: 'G', custo: 0.052, minimo: 3000, maximo: 10000, local: 'Câmara fria', perecivel: true, fornecedor: fLaticinios.id },
    { nome: 'Presunto', sku: 'PRE-FAT', unidade: 'G', custo: 0.041, minimo: 2000, maximo: 7000, local: 'Câmara fria', perecivel: true, fornecedor: fLaticinios.id },
    { nome: 'Copo de papel 300ml', sku: 'COP-300', unidade: 'UN', custo: 0.42, minimo: 400, maximo: 1500, local: 'Almoxarifado', fornecedor: fEmbalagens.id },
    { nome: 'Copo de papel 200ml', sku: 'COP-200', unidade: 'UN', custo: 0.34, minimo: 400, maximo: 1500, local: 'Almoxarifado', fornecedor: fEmbalagens.id },
    { nome: 'Tampa para copo', sku: 'TAM-COP', unidade: 'UN', custo: 0.18, minimo: 600, maximo: 2000, local: 'Almoxarifado', fornecedor: fEmbalagens.id },
    { nome: 'Caixa de donut (6 un)', sku: 'CAI-DON', unidade: 'UN', custo: 1.35, minimo: 120, maximo: 500, local: 'Almoxarifado', fornecedor: fEmbalagens.id },
    { nome: 'Guardanapo', sku: 'GUA-NAP', unidade: 'UN', custo: 0.02, minimo: 2000, maximo: 8000, local: 'Almoxarifado', fornecedor: fEmbalagens.id },
    { nome: 'Sacola kraft', sku: 'SAC-KRA', unidade: 'UN', custo: 0.29, minimo: 300, maximo: 1200, local: 'Almoxarifado', fornecedor: fEmbalagens.id },
  ]

  const ingredientes: Record<string, { id: string; unidade: UnidadeMedida; custo: number }> = {}
  for (const d of defsIngredientes) {
    const criado = await db.ingrediente.create({
      data: {
        lojaId: loja.id,
        nome: d.nome,
        sku: d.sku,
        unidade: d.unidade,
        custoMedio: d.custo,
        estoqueMinimo: d.minimo,
        estoqueMaximo: d.maximo,
        localArmazenagem: d.local,
        perecivel: d.perecivel ?? false,
        fornecedorPadraoId: d.fornecedor,
      },
    })
    ingredientes[d.sku] = { id: criado.id, unidade: d.unidade, custo: d.custo }
  }

  // ── Movimentação de estoque (helper local do seed) ──────────────────────
  const saldos: Record<string, number> = {}
  async function movimentar(params: {
    sku?: string
    produtoId?: string
    tipo: TipoMovimento
    quantidade: number
    custoUnitario?: number
    origemTipo?: string
    origemId?: string
    quando: Date
    usuarioId: string
    observacao?: string
  }) {
    const entrada = ['ENTRADA_COMPRA', 'ENTRADA_MANUAL', 'ENTRADA_PRODUCAO', 'ESTORNO_VENDA'].includes(params.tipo)
    const delta = entrada ? params.quantidade : -params.quantidade
    const chave = params.sku ?? params.produtoId!
    const saldoAnterior = saldos[chave] ?? 0
    const saldoApos = Math.round((saldoAnterior + delta) * 1000) / 1000
    saldos[chave] = saldoApos

    await db.movimentoEstoque.create({
      data: {
        lojaId: loja.id,
        ingredienteId: params.sku ? ingredientes[params.sku].id : null,
        produtoId: params.produtoId ?? null,
        tipo: params.tipo,
        quantidade: delta,
        custoUnitario: params.custoUnitario ?? (params.sku ? ingredientes[params.sku].custo : 0),
        saldoApos,
        origemTipo: params.origemTipo ?? null,
        origemId: params.origemId ?? null,
        observacao: params.observacao ?? null,
        usuarioId: params.usuarioId,
        criadoEm: params.quando,
      },
    })
  }

  // ── Categorias de produto ───────────────────────────────────────────────
  const categorias: Record<string, string> = {}
  for (const [i, c] of [
    { nome: 'Donuts', slug: 'donuts', cor: '#D24237' },
    { nome: 'BLENDS NC', slug: 'blends-nc', cor: '#6B4A2F' },
    { nome: 'Cookies', slug: 'cookies', cor: '#B8730F' },
    { nome: 'Confeitaria', slug: 'confeitaria', cor: '#7A4E9B' },
    { nome: 'Salgados', slug: 'salgados', cor: '#2E7D5B' },
    { nome: 'Bebidas', slug: 'bebidas', cor: '#1F5FA8' },
    { nome: 'Combos', slug: 'combos', cor: '#B3352C' },
  ].entries()) {
    const criada = await db.categoria.create({
      data: { lojaId: loja.id, nome: c.nome, slug: c.slug, cor: c.cor, ordem: i },
    })
    categorias[c.slug] = criada.id
  }

  // ── Produtos ────────────────────────────────────────────────────────────
  type DefProduto = {
    nome: string
    sku: string
    categoria: string
    tipo: 'SIMPLES' | 'PRODUZIDO' | 'PREPARADO' | 'COMBO'
    preco: number
    custo?: number
    controla?: boolean
    minimo?: number
    destaque?: boolean
    /** Peso relativo nas vendas — o donut de Nutella é o carro-chefe. */
    peso: number
    ficha?: Array<[string, number, UnidadeMedida, number?]>
  }

  const defsProdutos: DefProduto[] = [
    // ── Donuts ──
    {
      nome: 'Donut Nutella', sku: 'DON-NUT', categoria: 'donuts', tipo: 'PRODUZIDO', preco: 14.9, minimo: 6, destaque: true, peso: 22,
      ficha: [['FAR-TRI', 80, 'G'], ['ACU-REF', 20, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.35, 'UN'], ['FER-BIO', 5, 'G'], ['MAN-SSA', 12, 'G'], ['OLE-FRI', 25, 'ML', 8], ['NUT-AVE', 25, 'G'], ['GRA-COL', 3, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Donut Oreo', sku: 'DON-ORE', categoria: 'donuts', tipo: 'PRODUZIDO', preco: 14.9, minimo: 6, destaque: true, peso: 16,
      ficha: [['FAR-TRI', 80, 'G'], ['ACU-REF', 20, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.35, 'UN'], ['FER-BIO', 5, 'G'], ['MAN-SSA', 12, 'G'], ['OLE-FRI', 25, 'ML', 8], ['CHO-BRA', 20, 'G'], ['BIS-ORE', 18, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Donut Morango com creme', sku: 'DON-MOR', categoria: 'donuts', tipo: 'PRODUZIDO', preco: 15.9, minimo: 6, destaque: true, peso: 14,
      ficha: [['FAR-TRI', 80, 'G'], ['ACU-REF', 20, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.35, 'UN'], ['FER-BIO', 5, 'G'], ['MAN-SSA', 12, 'G'], ['OLE-FRI', 25, 'ML', 8], ['CRE-LEI', 25, 'ML'], ['MOR-FRE', 30, 'G', 12], ['GEL-MOR', 12, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Donut Doce de leite', sku: 'DON-DOC', categoria: 'donuts', tipo: 'PRODUZIDO', preco: 13.9, minimo: 6, peso: 9,
      ficha: [['FAR-TRI', 80, 'G'], ['ACU-REF', 20, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.35, 'UN'], ['FER-BIO', 5, 'G'], ['MAN-SSA', 12, 'G'], ['OLE-FRI', 25, 'ML', 8], ['DOC-LEI', 28, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Donut Chocolate crocante', sku: 'DON-CHO', categoria: 'donuts', tipo: 'PRODUZIDO', preco: 15.9, minimo: 6, peso: 10,
      ficha: [['FAR-TRI', 80, 'G'], ['ACU-REF', 20, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.35, 'UN'], ['FER-BIO', 5, 'G'], ['MAN-SSA', 12, 'G'], ['OLE-FRI', 25, 'ML', 8], ['CHO-MEI', 25, 'G'], ['CRO-CAR', 8, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Donut açúcar e canela', sku: 'DON-ACU', categoria: 'donuts', tipo: 'PRODUZIDO', preco: 10.9, minimo: 6, peso: 7,
      ficha: [['FAR-TRI', 80, 'G'], ['ACU-REF', 32, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.35, 'UN'], ['FER-BIO', 5, 'G'], ['MAN-SSA', 12, 'G'], ['OLE-FRI', 25, 'ML', 8], ['GUA-NAP', 1, 'UN']],
    },

    // ── Cookies ──
    {
      nome: 'Cookie chocolate 55%', sku: 'COO-CHO', categoria: 'cookies', tipo: 'PRODUZIDO', preco: 12.9, minimo: 8, destaque: true, peso: 12,
      ficha: [['FAR-TRI', 65, 'G'], ['ACU-REF', 35, 'G'], ['MAN-SSA', 30, 'G'], ['OVO-UNI', 0.3, 'UN'], ['CHO-MEI', 40, 'G'], ['SAL-REF', 1, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Cookie chocolate branco e morango', sku: 'COO-BRA', categoria: 'cookies', tipo: 'PRODUZIDO', preco: 13.9, minimo: 8, peso: 8,
      ficha: [['FAR-TRI', 65, 'G'], ['ACU-REF', 35, 'G'], ['MAN-SSA', 30, 'G'], ['OVO-UNI', 0.3, 'UN'], ['CHO-BRA', 35, 'G'], ['GEL-MOR', 15, 'G'], ['GUA-NAP', 1, 'UN']],
    },

    // ── BLENDS NC (cafés) ──
    {
      nome: 'Espresso', sku: 'CAF-ESP', categoria: 'blends-nc', tipo: 'PREPARADO', preco: 7.5, controla: false, peso: 13,
      ficha: [['CAF-BLE', 18, 'G'], ['COP-200', 1, 'UN'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Cappuccino', sku: 'CAF-CAP', categoria: 'blends-nc', tipo: 'PREPARADO', preco: 13.9, controla: false, destaque: true, peso: 15,
      ficha: [['CAF-BLE', 18, 'G'], ['LEI-INT', 150, 'ML'], ['CHO-MEI', 5, 'G'], ['COP-300', 1, 'UN'], ['TAM-COP', 1, 'UN'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Latte', sku: 'CAF-LAT', categoria: 'blends-nc', tipo: 'PREPARADO', preco: 13.5, controla: false, peso: 12,
      ficha: [['CAF-BLE', 18, 'G'], ['LEI-INT', 180, 'ML'], ['COP-300', 1, 'UN'], ['TAM-COP', 1, 'UN'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Café coado da casa', sku: 'CAF-COD', categoria: 'blends-nc', tipo: 'PREPARADO', preco: 6.5, controla: false, peso: 9,
      ficha: [['CAF-COA', 12, 'G'], ['COP-200', 1, 'UN'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Mocha BLENDS', sku: 'CAF-MOC', categoria: 'blends-nc', tipo: 'PREPARADO', preco: 16.9, controla: false, peso: 7,
      ficha: [['CAF-BLE', 18, 'G'], ['LEI-INT', 150, 'ML'], ['CHO-MEI', 25, 'G'], ['CRE-LEI', 20, 'ML'], ['COP-300', 1, 'UN'], ['TAM-COP', 1, 'UN']],
    },
    {
      nome: 'Milkshake de Nutella', sku: 'MIL-NUT', categoria: 'bebidas', tipo: 'PREPARADO', preco: 21.9, controla: false, peso: 5,
      ficha: [['LEI-INT', 200, 'ML'], ['CRE-LEI', 60, 'ML'], ['NUT-AVE', 45, 'G'], ['COP-300', 1, 'UN'], ['TAM-COP', 1, 'UN']],
    },
    {
      nome: 'Chocolate quente', sku: 'CHO-QUE', categoria: 'bebidas', tipo: 'PREPARADO', preco: 15.9, controla: false, peso: 4,
      ficha: [['LEI-INT', 200, 'ML'], ['CHO-MEI', 35, 'G'], ['CRE-LEI', 20, 'ML'], ['COP-300', 1, 'UN'], ['TAM-COP', 1, 'UN']],
    },

    // ── Confeitaria ──
    {
      nome: 'Copo de morango com creme', sku: 'CON-COP', categoria: 'confeitaria', tipo: 'PRODUZIDO', preco: 18.9, minimo: 4, peso: 8,
      ficha: [['CRE-LEI', 90, 'ML'], ['MOR-FRE', 70, 'G', 10], ['ACU-CON', 18, 'G'], ['BIS-ORE', 12, 'G']],
    },
    {
      nome: 'Cheesecake de frutas vermelhas', sku: 'CON-CHE', categoria: 'confeitaria', tipo: 'PRODUZIDO', preco: 19.9, minimo: 4, peso: 6,
      ficha: [['CRE-CHE', 80, 'G'], ['ACU-REF', 25, 'G'], ['BIS-ORE', 30, 'G'], ['MAN-SSA', 15, 'G'], ['GEL-MOR', 25, 'G'], ['OVO-UNI', 0.4, 'UN']],
    },

    // ── Salgados ──
    {
      nome: 'Coxinha cremosa', sku: 'SAL-COX', categoria: 'salgados', tipo: 'PRODUZIDO', preco: 11.9, minimo: 10, destaque: true, peso: 14,
      ficha: [['FAR-TRI', 70, 'G'], ['FRA-DES', 55, 'G'], ['CRE-CHE', 20, 'G'], ['LEI-INT', 40, 'ML'], ['MAN-SSA', 10, 'G'], ['FAR-ROS', 25, 'G'], ['OVO-UNI', 0.2, 'UN'], ['OLE-FRI', 30, 'ML', 8], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Pão de queijo recheado', sku: 'SAL-PAO', categoria: 'salgados', tipo: 'PRODUZIDO', preco: 9.9, minimo: 10, peso: 8,
      ficha: [['QUE-MUS', 45, 'G'], ['LEI-INT', 30, 'ML'], ['OVO-UNI', 0.25, 'UN'], ['MAN-SSA', 12, 'G'], ['FAR-TRI', 40, 'G'], ['GUA-NAP', 1, 'UN']],
    },
    {
      nome: 'Misto quente na chapa', sku: 'SAL-MIS', categoria: 'salgados', tipo: 'PREPARADO', preco: 16.9, controla: false, peso: 6,
      ficha: [['QUE-MUS', 50, 'G'], ['PRE-FAT', 45, 'G'], ['FAR-TRI', 60, 'G'], ['MAN-SSA', 10, 'G'], ['GUA-NAP', 2, 'UN']],
    },

    // ── Revenda ──
    { nome: 'Água mineral 500ml', sku: 'BEB-AGU', categoria: 'bebidas', tipo: 'SIMPLES', preco: 5, custo: 1.6, minimo: 24, peso: 5 },
    { nome: 'Refrigerante lata', sku: 'BEB-REF', categoria: 'bebidas', tipo: 'SIMPLES', preco: 7.5, custo: 3.1, minimo: 24, peso: 5 },
    { nome: 'Suco natural laranja 300ml', sku: 'BEB-SUC', categoria: 'bebidas', tipo: 'SIMPLES', preco: 12.9, custo: 4.2, minimo: 12, peso: 4 },
    { nome: 'Chá gelado de pêssego', sku: 'BEB-CHA', categoria: 'bebidas', tipo: 'SIMPLES', preco: 9.9, custo: 3.4, minimo: 12, peso: 3 },
  ]

  const produtos: Record<string, { id: string; preco: number; tipo: string; controla: boolean; peso: number }> = {}
  for (const [i, d] of defsProdutos.entries()) {
    const criado = await db.produto.create({
      data: {
        lojaId: loja.id,
        categoriaId: categorias[d.categoria],
        nome: d.nome,
        sku: d.sku,
        tipo: d.tipo,
        precoVenda: d.preco,
        precoCusto: d.custo ?? 0,
        controlaEstoque: d.controla ?? true,
        estoqueMinimo: d.minimo ?? 0,
        destaque: d.destaque ?? false,
        ordem: i,
        tempoPreparoMin: d.tipo === 'PREPARADO' ? inteiro(2, 6) : null,
      },
    })
    produtos[d.sku] = { id: criado.id, preco: d.preco, tipo: d.tipo, controla: d.controla ?? true, peso: d.peso }

    // Ficha técnica
    if (d.ficha) {
      const ficha = await db.fichaTecnica.create({
        data: {
          produtoId: criado.id,
          versao: 1,
          rendimento: 1,
          unidadeRendimento: 'UN',
          criadoPorId: producaoUser.id,
          modoPreparo:
            d.tipo === 'PRODUZIDO'
              ? '1. Misture os secos.\n2. Acrescente os líquidos e sove até o ponto de véu.\n3. Descanse 40 min.\n4. Modele, frite/asse e finalize com a cobertura.'
              : null,
          itens: {
            createMany: {
              data: d.ficha.map(([sku, qtd, un, perda]) => ({
                ingredienteId: ingredientes[sku].id,
                quantidade: qtd,
                unidade: un,
                perdaPercentual: perda ?? 0,
              })),
            },
          },
        },
      })

      // Custo congelado da ficha
      let custoTotal = 0
      for (const [sku, qtd, un, perda] of d.ficha) {
        const ing = ingredientes[sku]
        const fatores: Record<string, number> = { G: 1, KG: 1000, ML: 1, L: 1000, UN: 1, PCT: 1, CX: 1 }
        const convertido = (qtd * (fatores[un] ?? 1)) / (fatores[ing.unidade] ?? 1)
        const custo = convertido * (1 + (perda ?? 0) / 100) * ing.custo
        custoTotal += custo
        await db.fichaTecnicaItem.updateMany({
          where: { fichaId: ficha.id, ingredienteId: ing.id },
          data: { custo: Math.round(custo * 10000) / 10000 },
        })
      }
      await db.fichaTecnica.update({
        where: { id: ficha.id },
        data: {
          custoTotal: Math.round(custoTotal * 10000) / 10000,
          custoUnitario: Math.round(custoTotal * 10000) / 10000,
        },
      })
      await db.produto.update({ where: { id: criado.id }, data: { precoCusto: dinheiro(custoTotal) } })
      produtos[d.sku] = { ...produtos[d.sku], preco: d.preco }
    }
  }

  // Variações de café
  for (const sku of ['CAF-CAP', 'CAF-LAT', 'CAF-MOC']) {
    await db.produtoVariacao.createMany({
      data: [
        { produtoId: produtos[sku].id, nome: '200 ml', precoDelta: 0, fatorFicha: 1, ordem: 0 },
        { produtoId: produtos[sku].id, nome: '300 ml', precoDelta: 4, fatorFicha: 1.45, ordem: 1 },
      ],
    })
  }

  // Adicionais
  const adicionais = await Promise.all(
    [
      { nome: 'Dose extra de café', preco: 4, sku: 'CAF-BLE', qtd: 18 },
      { nome: 'Calda de Nutella', preco: 5, sku: 'NUT-AVE', qtd: 25 },
      { nome: 'Chantilly', preco: 4, sku: 'CRE-LEI', qtd: 30 },
      { nome: 'Morango extra', preco: 6, sku: 'MOR-FRE', qtd: 40 },
      { nome: 'Leite vegetal', preco: 5, sku: 'LEI-INT', qtd: 0 },
      { nome: 'Caixa para presente', preco: 6, sku: 'CAI-DON', qtd: 1 },
    ].map((a, i) =>
      db.adicional.create({
        data: {
          lojaId: loja.id,
          nome: a.nome,
          preco: a.preco,
          custo: dinheiro(ingredientes[a.sku].custo * a.qtd),
          ingredienteId: a.qtd > 0 ? ingredientes[a.sku].id : null,
          quantidadeIngrediente: a.qtd,
          ordem: i,
        },
      }),
    ),
  )

  // Adicionais liberados por produto
  const skusComAdicional = ['CAF-CAP', 'CAF-LAT', 'CAF-MOC', 'MIL-NUT', 'CHO-QUE', 'DON-NUT', 'DON-MOR']
  await db.produtoAdicional.createMany({
    data: skusComAdicional.flatMap((sku) => adicionais.map((a) => ({ produtoId: produtos[sku].id, adicionalId: a.id }))),
    skipDuplicates: true,
  })

  // Combo
  const combo = await db.produto.create({
    data: {
      lojaId: loja.id,
      categoriaId: categorias.combos,
      nome: 'Combo Café da tarde',
      sku: 'COM-TAR',
      tipo: 'COMBO',
      precoVenda: 24.9,
      controlaEstoque: false,
      destaque: true,
      ordem: 99,
      comboItens: {
        createMany: {
          data: [
            { produtoId: produtos['DON-NUT'].id, quantidade: 1 },
            { produtoId: produtos['CAF-CAP'].id, quantidade: 1 },
          ],
        },
      },
    },
  })
  produtos['COM-TAR'] = { id: combo.id, preco: 24.9, tipo: 'COMBO', controla: false, peso: 6 }
  {
    const componentes = await db.produto.findMany({
      where: { id: { in: [produtos['DON-NUT'].id, produtos['CAF-CAP'].id] } },
      select: { precoCusto: true },
    })
    await db.produto.update({
      where: { id: combo.id },
      data: { precoCusto: dinheiro(componentes.reduce((a, c) => a + Number(c.precoCusto), 0)) },
    })
  }

  console.log(`  ✓ ${defsProdutos.length + 1} produtos, ${defsIngredientes.length} insumos, fichas técnicas`)

  // ── Clientes ────────────────────────────────────────────────────────────
  const nomes = [
    'Ana Beatriz Salles', 'Rafael Toledo', 'Juliana Moraes', 'Pedro Henrique Lima', 'Carolina Duarte',
    'Marcelo Assis', 'Fernanda Rocha', 'Thiago Barbosa', 'Larissa Camargo', 'Gustavo Pinheiro',
    'Patrícia Nogueira', 'Rodrigo Vasques', 'Bianca Andrade', 'Eduardo Peixoto', 'Mariana Cordeiro',
    'Felipe Tavares', 'Renata Bueno', 'Lucas Siqueira', 'Isabela Freitas', 'André Monteiro',
    'Vanessa Lopes', 'Caio Bittencourt', 'Priscila Ramos', 'João Vitor Nunes', 'Tatiane Cardoso',
    'Leonardo Prado', 'Sabrina Teles', 'Vinícius Aguiar', 'Camila Bastos', 'Otávio Reis',
  ]
  const clientes = await Promise.all(
    nomes.map((nome, i) =>
      db.cliente.create({
        data: {
          lojaId: loja.id,
          nome,
          telefone: `12${talvez(0.7) ? '9' : '3'}${String(80000000 + i * 137 + inteiro(0, 99)).slice(0, 8)}`,
          email: talvez(0.55) ? `${nome.split(' ')[0].toLowerCase()}${i}@email.com` : null,
          dataNascimento: talvez(0.65) ? new Date(1985 + inteiro(0, 18), inteiro(0, 11), inteiro(1, 28)) : null,
          cidade: 'São José dos Campos',
          uf: 'SP',
          bairro: escolher(['Jardim Esplanada', 'Vila Adyana', 'Jardim Aquarius', 'Centro', 'Bosque dos Eucaliptos']),
          criadoEm: diasAtras(inteiro(20, 400)),
        },
      }),
    ),
  )

  await db.cupom.createMany({
    data: [
      { lojaId: loja.id, codigo: 'NOBRU10', descricao: '10% para novos clientes', tipo: 'PERCENTUAL', valor: 10, minimoCompra: 30, usoMaximo: 200, usosFeitos: 37 },
      { lojaId: loja.id, codigo: 'BLENDS15', descricao: '15% no BLENDS NC', tipo: 'PERCENTUAL', valor: 15, minimoCompra: 25, usoMaximo: 100, usosFeitos: 12, validoAte: new Date(Date.now() + 20 * 86400000) },
      { lojaId: loja.id, codigo: 'DOZE5', descricao: 'R$ 5 na compra da caixa', tipo: 'VALOR', valor: 5, minimoCompra: 60, usosFeitos: 4 },
    ],
  })

  console.log(`  ✓ ${clientes.length} clientes e 3 cupons`)

  // ── Compras recebidas (formam o estoque e o custo médio) ────────────────
  let contadorCompra = 0
  async function comprar(fornecedorId: string, skus: string[], quando: Date, fator = 1) {
    contadorCompra += 1
    const codigo = `PC-${String(contadorCompra).padStart(6, '0')}`
    const itens = skus.map((sku) => {
      const def = defsIngredientes.find((d) => d.sku === sku)!
      const quantidade = Math.round(def.maximo * fator * entre(0.75, 1))
      const preco = ingredientes[sku].custo * entre(0.94, 1.08)
      return { sku, quantidade, precoUnitario: Math.round(preco * 10000) / 10000 }
    })
    const total = dinheiro(itens.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0))

    const pedido = await db.pedidoCompra.create({
      data: {
        lojaId: loja.id,
        fornecedorId,
        codigo,
        status: 'RECEBIDO',
        dataPedido: quando,
        dataPrevista: new Date(quando.getTime() + 2 * 86400000),
        total,
        usuarioId: gerente.id,
        criadoEm: quando,
        itens: {
          createMany: {
            data: itens.map((i) => ({
              ingredienteId: ingredientes[i.sku].id,
              quantidade: i.quantidade,
              quantidadeRecebida: i.quantidade,
              precoUnitario: i.precoUnitario,
              total: dinheiro(i.quantidade * i.precoUnitario),
            })),
          },
        },
      },
    })

    const recebidoEm = new Date(quando.getTime() + 2 * 86400000)
    const recebimento = await db.recebimento.create({
      data: {
        pedidoCompraId: pedido.id,
        data: recebidoEm,
        notaFiscal: String(inteiro(100000, 999999)),
        total,
        usuarioId: producaoUser.id,
        criadoEm: recebidoEm,
      },
    })

    for (const i of itens) {
      const def = defsIngredientes.find((d) => d.sku === i.sku)!
      let loteId: string | null = null
      if (def.perecivel) {
        const lote = await db.lote.create({
          data: {
            ingredienteId: ingredientes[i.sku].id,
            codigo: `${codigo}-${i.sku.slice(0, 3)}`,
            quantidade: i.quantidade,
            quantidadeInicial: i.quantidade,
            custoUnitario: i.precoUnitario,
            validade: new Date(recebidoEm.getTime() + inteiro(6, 25) * 86400000),
            recebidoEm,
          },
        })
        loteId = lote.id
      }
      await db.recebimentoItem.create({
        data: {
          recebimentoId: recebimento.id,
          ingredienteId: ingredientes[i.sku].id,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
          lote: loteId ? `${codigo}-${i.sku.slice(0, 3)}` : null,
          validade: def.perecivel ? new Date(recebidoEm.getTime() + inteiro(6, 25) * 86400000) : null,
        },
      })
      await movimentar({
        sku: i.sku,
        tipo: 'ENTRADA_COMPRA',
        quantidade: i.quantidade,
        custoUnitario: i.precoUnitario,
        origemTipo: 'recebimento',
        origemId: pedido.id,
        quando: recebidoEm,
        usuarioId: producaoUser.id,
        observacao: `Compra ${codigo}`,
      })
    }

    // Conta a pagar do recebimento
    await db.contaPagar.create({
      data: {
        lojaId: loja.id,
        fornecedorId,
        categoriaId: catInsumos.id,
        pedidoCompraId: pedido.id,
        descricao: `${fornecedores.find((f) => f.id === fornecedorId)!.nome} — compra ${codigo}`,
        valor: total,
        valorPago: quando < diasAtras(10) ? total : 0,
        vencimento: new Date(recebidoEm.getTime() + 28 * 86400000),
        pagoEm: quando < diasAtras(10) ? new Date(recebidoEm.getTime() + 28 * 86400000) : null,
        status: quando < diasAtras(10) ? 'LIQUIDADO' : 'PENDENTE',
        criadoEm: recebidoEm,
      },
    })
  }

  const skusPorFornecedor = new Map<string, string[]>()
  for (const d of defsIngredientes) {
    const lista = skusPorFornecedor.get(d.fornecedor) ?? []
    lista.push(d.sku)
    skusPorFornecedor.set(d.fornecedor, lista)
  }

  // Compra inicial grande + reposições ao longo do histórico
  for (const [fornecedorId, skus] of skusPorFornecedor) {
    await comprar(fornecedorId, skus, diasAtras(DIAS_HISTORICO + 3), 1.4)
  }
  for (const dia of [32, 24, 17, 10, 4]) {
    for (const [fornecedorId, skus] of skusPorFornecedor) {
      if (talvez(0.72)) await comprar(fornecedorId, skus.filter(() => talvez(0.8)), diasAtras(dia), 0.55)
    }
  }
  console.log(`  ✓ ${contadorCompra} pedidos de compra recebidos`)

  // ── Produção, vendas e caixas, dia a dia ────────────────────────────────
  const skusProduzidos = defsProdutos.filter((d) => d.tipo === 'PRODUZIDO').map((d) => d.sku)
  const skusRevenda = defsProdutos.filter((d) => d.tipo === 'SIMPLES').map((d) => d.sku)
  const skusVendaveis = [...defsProdutos.map((d) => d.sku), 'COM-TAR']
  const pesoTotal = skusVendaveis.reduce((a, sku) => a + produtos[sku].peso, 0)

  function sortearProduto() {
    let r = rnd() * pesoTotal
    for (const sku of skusVendaveis) {
      r -= produtos[sku].peso
      if (r <= 0) return sku
    }
    return skusVendaveis[0]
  }

  /** Perfil de movimento: abre 10h, pico 15h–18h, fecha 19h30. */
  const PESO_HORA: Record<number, number> = { 10: 4, 11: 6, 12: 7, 13: 6, 14: 9, 15: 14, 16: 16, 17: 15, 18: 13, 19: 6 }

  // Entrada inicial de estoque dos produtos de revenda
  for (const sku of skusRevenda) {
    await movimentar({
      produtoId: produtos[sku].id,
      sku: undefined,
      tipo: 'ENTRADA_MANUAL',
      quantidade: 200,
      custoUnitario: defsProdutos.find((d) => d.sku === sku)!.custo ?? 0,
      quando: diasAtras(DIAS_HISTORICO),
      usuarioId: gerente.id,
      observacao: 'Carga inicial de revenda',
    })
    await db.produto.update({ where: { id: produtos[sku].id }, data: { estoqueAtual: 200 } })
    saldos[produtos[sku].id] = 200
  }

  let contadorPedido = 0
  let contadorCaixa = 0
  let contadorOp = 0
  const totaisPorProduto: Record<string, number> = {}

  const fichasPorProduto = new Map<string, Array<{ ingredienteId: string; sku: string; quantidade: number }>>()
  for (const d of defsProdutos) {
    if (!d.ficha) continue
    const fatores: Record<string, number> = { G: 1, KG: 1000, ML: 1, L: 1000, UN: 1, PCT: 1, CX: 1 }
    fichasPorProduto.set(
      d.sku,
      d.ficha.map(([sku, qtd, un, perda]) => ({
        ingredienteId: ingredientes[sku].id,
        sku,
        quantidade:
          ((qtd * (fatores[un] ?? 1)) / (fatores[ingredientes[sku].unidade] ?? 1)) * (1 + (perda ?? 0) / 100),
      })),
    )
  }

  for (let dia = DIAS_HISTORICO; dia >= 0; dia--) {
    const data = diasAtras(dia)
    const diaSemana = data.getDay()
    if (diaSemana === 1) continue // segunda: fechado

    // ── Produção da manhã ──
    contadorOp += 1
    const alvo = skusProduzidos.filter(() => talvez(0.85))
    const itensOp = alvo.map((sku) => {
      const base = Math.round(produtos[sku].peso * entre(2.4, 3.6))
      return { sku, planejado: base }
    })

    const ordem = await db.ordemProducao.create({
      data: {
        lojaId: loja.id,
        codigo: `OP-${String(contadorOp).padStart(6, '0')}`,
        data,
        turno: 'Manhã',
        status: 'CONCLUIDA',
        responsavelId: producaoUser.id,
        iniciadaEm: new Date(data.getTime() - 4 * 3600000),
        concluidaEm: new Date(data.getTime() - 2 * 3600000),
        criadoEm: new Date(data.getTime() - 5 * 3600000),
        itens: {
          createMany: {
            data: itensOp.map((i) => ({
              produtoId: produtos[i.sku].id,
              quantidadePlanejada: i.planejado,
            })),
          },
        },
      },
      include: { itens: true },
    })

    let custoRealOp = 0
    for (const item of ordem.itens) {
      const sku = Object.keys(produtos).find((s) => produtos[s].id === item.produtoId)!
      const planejado = Number(item.quantidadePlanejada)
      const perdido = talvez(0.28) ? inteiro(1, Math.max(1, Math.round(planejado * 0.06))) : 0
      const produzido = planejado - perdido
      const total = planejado

      // Consumo de insumos pelo que foi ao forno
      const ficha = fichasPorProduto.get(sku) ?? []
      let custoItem = 0
      for (const linha of ficha) {
        const quantidade = Math.round(linha.quantidade * total * 1000) / 1000
        custoItem += quantidade * ingredientes[linha.sku].custo
        await movimentar({
          sku: linha.sku,
          tipo: 'SAIDA_PRODUCAO',
          quantidade,
          origemTipo: 'ordem_producao',
          origemId: ordem.id,
          quando: new Date(data.getTime() - 3 * 3600000),
          usuarioId: producaoUser.id,
          observacao: `Ordem ${ordem.codigo}`,
        })
      }
      custoRealOp += custoItem

      await movimentar({
        produtoId: item.produtoId,
        tipo: 'ENTRADA_PRODUCAO',
        quantidade: produzido,
        custoUnitario: total > 0 ? custoItem / total : 0,
        origemTipo: 'ordem_producao',
        origemId: ordem.id,
        quando: new Date(data.getTime() - 2 * 3600000),
        usuarioId: producaoUser.id,
      })

      await db.ordemProducaoItem.update({
        where: { id: item.id },
        data: {
          quantidadeProduzida: produzido,
          quantidadePerdida: perdido,
          custoUnitario: total > 0 ? Math.round((custoItem / total) * 10000) / 10000 : 0,
        },
      })

      if (perdido > 0) {
        await db.perda.create({
          data: {
            lojaId: loja.id,
            produtoId: item.produtoId,
            ordemProducaoId: ordem.id,
            quantidade: perdido,
            motivo: 'ERRO_PRODUCAO',
            custoEstimado: dinheiro((perdido * custoItem) / Math.max(total, 1)),
            observacao: `Perda apontada na ordem ${ordem.codigo}`,
            usuarioId: producaoUser.id,
            criadoEm: new Date(data.getTime() - 2 * 3600000),
          },
        })
      }
    }

    await db.ordemProducao.update({
      where: { id: ordem.id },
      data: { custoEstimado: dinheiro(custoRealOp * entre(0.96, 1.04)), custoReal: dinheiro(custoRealOp) },
    })

    // ── Caixa do dia ──
    contadorCaixa += 1
    const operador = escolher(atendentes)
    const saldoInicial = escolher([100, 150, 200])
    const abertoEm = new Date(data.getTime())
    abertoEm.setHours(9, inteiro(30, 55), 0, 0)

    const caixa = await db.caixa.create({
      data: {
        lojaId: loja.id,
        codigo: `CX-${String(contadorCaixa).padStart(6, '0')}`,
        status: dia === 0 ? 'ABERTO' : 'FECHADO',
        saldoInicial,
        usuarioAberturaId: operador.id,
        abertoEm,
      },
    })
    await db.movimentoCaixa.create({
      data: { caixaId: caixa.id, tipo: 'ABERTURA', valor: saldoInicial, descricao: 'Fundo de troco', usuarioId: operador.id, criadoEm: abertoEm },
    })

    // ── Vendas do dia ──
    const fatorSemana = diaSemana === 0 || diaSemana === 6 ? entre(1.35, 1.7) : entre(0.85, 1.12)
    const fatorCrescimento = 1 + (DIAS_HISTORICO - dia) * 0.004 // a loja cresce devagar
    const pedidosDoDia = Math.round(entre(38, 58) * fatorSemana * fatorCrescimento)

    let vendasEspecie = 0

    for (let n = 0; n < pedidosDoDia; n++) {
      // Sorteia a hora pelo perfil de movimento
      const horas = Object.keys(PESO_HORA).map(Number)
      const somaPesos = horas.reduce((a, h) => a + PESO_HORA[h], 0)
      let r = rnd() * somaPesos
      let hora = 15
      for (const h of horas) {
        r -= PESO_HORA[h]
        if (r <= 0) {
          hora = h
          break
        }
      }
      const quando = new Date(data)
      quando.setHours(hora, inteiro(0, 59), inteiro(0, 59), 0)
      if (dia === 0 && quando > new Date()) continue

      contadorPedido += 1
      const tipo = talvez(0.62) ? 'BALCAO' : talvez(0.5) ? 'VIAGEM' : talvez(0.6) ? 'MESA' : talvez(0.5) ? 'IFOOD' : 'DELIVERY'
      const cliente = talvez(0.42) ? escolher(clientes) : null

      // Itens
      const quantidadeItens = inteiro(1, 4)
      const escolhidos: Array<{ sku: string; qtd: number }> = []
      for (let k = 0; k < quantidadeItens; k++) {
        const sku = sortearProduto()
        const existente = escolhidos.find((e) => e.sku === sku)
        if (existente) existente.qtd += 1
        else escolhidos.push({ sku, qtd: talvez(0.78) ? 1 : inteiro(2, 4) })
      }

      let subtotal = 0
      let custoTotal = 0
      const linhas = escolhidos.map((e) => {
        const p = produtos[e.sku]
        const def = defsProdutos.find((d) => d.sku === e.sku)
        const total = dinheiro(p.preco * e.qtd)
        subtotal += total
        return { sku: e.sku, produtoId: p.id, nome: def?.nome ?? 'Combo Café da tarde', qtd: e.qtd, preco: p.preco, total }
      })
      subtotal = dinheiro(subtotal)

      const desconto = talvez(0.08) ? dinheiro(subtotal * escolher([0.05, 0.1])) : 0
      const taxaEntrega = tipo === 'DELIVERY' ? 8 : 0
      const total = dinheiro(subtotal - desconto + taxaEntrega)

      const pedido = await db.pedido.create({
        data: {
          lojaId: loja.id,
          codigo: `PED-${String(contadorPedido).padStart(6, '0')}`,
          tipo: tipo as never,
          status: 'FINALIZADO',
          clienteId: cliente?.id ?? null,
          nomeCliente: cliente ? null : talvez(0.25) ? escolher(['Maria', 'João', 'Bia', 'Léo', 'Duda']) : null,
          caixaId: caixa.id,
          usuarioId: operador.id,
          subtotal,
          descontoValor: desconto,
          descontoMotivo: desconto > 0 ? escolher(['Cliente frequente', 'Cortesia do dia', 'Ajuste de vitrine']) : null,
          taxaEntrega,
          total,
          abertoEm: quando,
          finalizadoEm: new Date(quando.getTime() + inteiro(90, 600) * 1000),
        },
      })

      for (const l of linhas) {
        const def = defsProdutos.find((d) => d.sku === l.sku)
        const custoUnitario =
          l.sku === 'COM-TAR'
            ? 0
            : def?.custo ?? (fichasPorProduto.get(l.sku)?.reduce((a, f) => a + f.quantidade * ingredientes[f.sku].custo, 0) ?? 0)
        custoTotal += custoUnitario * l.qtd

        await db.pedidoItem.create({
          data: {
            pedidoId: pedido.id,
            produtoId: l.produtoId,
            nome: l.nome,
            quantidade: l.qtd,
            precoUnitario: l.preco,
            custoUnitario: Math.round(custoUnitario * 10000) / 10000,
            total: l.total,
            status: 'ENTREGUE',
            criadoEm: quando,
          },
        })

        // Baixa de estoque conforme o tipo do produto
        const p = produtos[l.sku]
        if (p.tipo === 'PREPARADO' || !p.controla) {
          for (const f of fichasPorProduto.get(l.sku) ?? []) {
            await movimentar({
              sku: f.sku,
              tipo: 'SAIDA_VENDA',
              quantidade: Math.round(f.quantidade * l.qtd * 1000) / 1000,
              origemTipo: 'pedido',
              origemId: pedido.id,
              quando,
              usuarioId: operador.id,
            })
          }
        } else if (p.tipo !== 'COMBO') {
          await movimentar({
            produtoId: p.id,
            tipo: 'SAIDA_VENDA',
            quantidade: l.qtd,
            custoUnitario,
            origemTipo: 'pedido',
            origemId: pedido.id,
            quando,
            usuarioId: operador.id,
          })
        }
        totaisPorProduto[l.sku] = (totaisPorProduto[l.sku] ?? 0) + l.qtd
      }

      await db.pedido.update({ where: { id: pedido.id }, data: { custoTotal: dinheiro(custoTotal) } })

      // Pagamento
      const somaPesosForma = pesoFormas.reduce((a, [, p]) => a + p, 0)
      let rf = rnd() * somaPesosForma
      let forma = fPix
      for (const [f, peso] of pesoFormas) {
        rf -= peso
        if (rf <= 0) {
          forma = f
          break
        }
      }
      if (tipo === 'IFOOD') forma = fIfood

      const taxaValor = dinheiro((total * Number(forma.taxaPercentual)) / 100)
      const recebido = forma.permiteTroco ? Math.ceil(total / 10) * 10 : null

      await db.pagamento.create({
        data: {
          pedidoId: pedido.id,
          formaPagamentoId: forma.id,
          caixaId: caixa.id,
          valor: total,
          valorRecebido: recebido,
          troco: recebido ? dinheiro(recebido - total) : 0,
          taxaValor,
          status: 'APROVADO',
          usuarioId: operador.id,
          criadoEm: quando,
        },
      })
      await db.movimentoCaixa.create({
        data: {
          caixaId: caixa.id,
          tipo: 'VENDA',
          formaPagamentoId: forma.id,
          valor: total,
          descricao: `Pedido ${pedido.codigo}`,
          pedidoId: pedido.id,
          usuarioId: operador.id,
          criadoEm: quando,
        },
      })
      if (forma.contaNoCaixa) vendasEspecie += total

      // Fidelidade e métricas do cliente
      if (cliente) {
        const pontos = Math.floor(total)
        const atualizado = await db.cliente.update({
          where: { id: cliente.id },
          data: {
            totalGasto: { increment: total },
            totalPedidos: { increment: 1 },
            ultimaCompraEm: quando,
            pontos: { increment: pontos },
          },
          select: { pontos: true },
        })
        await db.pedido.update({ where: { id: pedido.id }, data: { pontosGerados: pontos } })
        await db.transacaoFidelidade.create({
          data: {
            clienteId: cliente.id,
            tipo: 'ACUMULO',
            pontos,
            saldoApos: atualizado.pontos,
            pedidoId: pedido.id,
            descricao: `Compra ${pedido.codigo}`,
            usuarioId: operador.id,
            criadoEm: quando,
          },
        })
      }
    }

    // Sangria e fechamento
    let sangria = 0
    if (vendasEspecie > 250 && talvez(0.6)) {
      sangria = Math.floor(vendasEspecie / 100) * 50
      const quandoSangria = new Date(data)
      quandoSangria.setHours(17, 30, 0, 0)
      await db.movimentoCaixa.create({
        data: {
          caixaId: caixa.id,
          tipo: 'SANGRIA',
          valor: -sangria,
          descricao: 'Retirada para o cofre',
          usuarioId: operador.id,
          criadoEm: quandoSangria,
        },
      })
    }

    if (dia > 0) {
      const esperado = dinheiro(saldoInicial + vendasEspecie - sangria)
      // A maioria bate; de vez em quando falta um troco.
      const diferenca = talvez(0.82) ? 0 : dinheiro(entre(-8, 4))
      const fechadoEm = new Date(data)
      fechadoEm.setHours(19, inteiro(40, 59), 0, 0)

      await db.movimentoCaixa.create({
        data: {
          caixaId: caixa.id,
          tipo: 'FECHAMENTO',
          valor: 0,
          descricao: `Conferência: contado ${dinheiro(esperado + diferenca)}, esperado ${esperado}`,
          usuarioId: operador.id,
          criadoEm: fechadoEm,
        },
      })
      await db.caixa.update({
        where: { id: caixa.id },
        data: {
          status: diferenca === 0 ? 'FECHADO' : dia > 3 ? 'CONFERIDO' : 'FECHADO',
          fechadoEm,
          saldoFinalInformado: dinheiro(esperado + diferenca),
          saldoFinalEsperado: esperado,
          diferenca,
          usuarioFechamentoId: operador.id,
          observacaoFechamento: diferenca !== 0 ? 'Diferença de troco no fim do dia' : null,
        },
      })
    }

    // Perdas de vitrine no fim do dia
    if (talvez(0.45)) {
      const sku = escolher(skusProduzidos)
      const def = defsProdutos.find((d) => d.sku === sku)!
      const qtd = inteiro(1, 5)
      const custoUnit = fichasPorProduto.get(sku)?.reduce((a, f) => a + f.quantidade * ingredientes[f.sku].custo, 0) ?? 0
      const quandoPerda = new Date(data)
      quandoPerda.setHours(19, 25, 0, 0)
      await movimentar({
        produtoId: produtos[sku].id,
        tipo: 'PERDA',
        quantidade: qtd,
        custoUnitario: custoUnit,
        origemTipo: 'perda',
        quando: quandoPerda,
        usuarioId: operador.id,
        observacao: 'NAO_VENDIDO',
      })
      await db.perda.create({
        data: {
          lojaId: loja.id,
          produtoId: produtos[sku].id,
          quantidade: qtd,
          motivo: 'NAO_VENDIDO',
          custoEstimado: dinheiro(qtd * custoUnit),
          observacao: `Sobra da vitrine — ${def.nome}`,
          usuarioId: operador.id,
          criadoEm: quandoPerda,
        },
      })
    }
  }

  // Sincroniza os saldos desnormalizados com o livro de movimentos
  for (const [sku, dados] of Object.entries(ingredientes)) {
    await db.ingrediente.update({ where: { id: dados.id }, data: { estoqueAtual: Math.round((saldos[sku] ?? 0) * 1000) / 1000 } })
  }
  for (const [sku, p] of Object.entries(produtos)) {
    if (!p.controla || p.tipo === 'COMBO') continue
    const saldo = Math.round((saldos[p.id] ?? 0) * 1000) / 1000
    await db.produto.update({
      where: { id: p.id },
      data: { estoqueAtual: saldo, disponivel: saldo > 0 || !defsProdutos.find((d) => d.sku === sku)?.minimo },
    })
  }

  console.log(`  ✓ ${contadorPedido} vendas em ${contadorCaixa} caixas, ${contadorOp} ordens de produção`)

  // ── Encomendas ──────────────────────────────────────────────────────────
  const encomendasDef = [
    { dias: -2, status: 'CONFIRMADA', tema: 'Aniversário infantil', itens: [['50 donuts personalizados', 'Nutella', 25, 13.5], ['Donuts Oreo', 'Oreo', 15, 13.5], ['Donuts Morango', 'Morango', 10, 14]] },
    { dias: -1, status: 'EM_PRODUCAO', tema: 'Café corporativo', itens: [['Kit brunch para 20 pessoas', null, 20, 32]] },
    { dias: -4, status: 'CONFIRMADA', tema: 'Chá de bebê', itens: [['Caixa de 12 donuts sortidos', 'Sortido', 6, 78], ['Cookies decorados', null, 30, 11]] },
    { dias: 3, status: 'ENTREGUE', tema: 'Casamento — mesa de doces', itens: [['Donuts em torre', 'Sortido', 80, 12.9], ['Copinhos de morango', 'Morango', 40, 16]] },
    { dias: 9, status: 'ENTREGUE', tema: 'Formatura', itens: [['Cookies personalizados', null, 60, 10.5]] },
    { dias: 0, status: 'ORCAMENTO', tema: 'Reunião de escritório', itens: [['Kit café da tarde para 15', null, 15, 28]] },
  ]

  let contadorEnc = 0
  for (const e of encomendasDef) {
    contadorEnc += 1
    const cliente = escolher(clientes)
    const dataEntrega = new Date()
    dataEntrega.setDate(dataEntrega.getDate() - e.dias)
    dataEntrega.setHours(inteiro(11, 17), escolher([0, 30]), 0, 0)

    const itens = e.itens.map(([descricao, sabor, qtd, preco]) => ({
      descricao: descricao as string,
      sabor: sabor as string | null,
      quantidade: qtd as number,
      precoUnitario: preco as number,
      total: dinheiro((qtd as number) * (preco as number)),
    }))
    const valorTotal = dinheiro(itens.reduce((a, i) => a + i.total, 0))
    const sinal = dinheiro(valorTotal * 0.5)
    const entregue = e.status === 'ENTREGUE'
    const pago = entregue ? valorTotal : e.status === 'ORCAMENTO' ? 0 : sinal

    const encomenda = await db.encomenda.create({
      data: {
        lojaId: loja.id,
        codigo: `ENC-${String(contadorEnc).padStart(6, '0')}`,
        clienteId: cliente.id,
        status: e.status as never,
        tipoEntrega: talvez(0.6) ? 'RETIRADA' : 'ENTREGA',
        dataEntrega,
        tema: e.tema,
        decoracao: talvez(0.5) ? 'Cores da festa: rosa e dourado. Topo com o nome do aniversariante.' : null,
        observacoes: 'Cliente confirmou por WhatsApp.',
        enderecoEntrega: null,
        valorTotal,
        valorSinal: sinal,
        valorPago: pago,
        usuarioId: gerente.id,
        confirmadaEm: e.status !== 'ORCAMENTO' ? new Date(dataEntrega.getTime() - 7 * 86400000) : null,
        entregueEm: entregue ? dataEntrega : null,
        criadoEm: new Date(dataEntrega.getTime() - 10 * 86400000),
        itens: { createMany: { data: itens } },
      },
    })

    if (pago > 0) {
      await db.pagamento.create({
        data: {
          encomendaId: encomenda.id,
          formaPagamentoId: fPix.id,
          valor: pago,
          status: 'APROVADO',
          usuarioId: gerente.id,
          criadoEm: new Date(dataEntrega.getTime() - 7 * 86400000),
        },
      })
    }
    if (!entregue && e.status !== 'ORCAMENTO') {
      await db.contaReceber.create({
        data: {
          lojaId: loja.id,
          clienteId: cliente.id,
          encomendaId: encomenda.id,
          categoriaId: catFin[7].id,
          descricao: `Encomenda ${encomenda.codigo} — ${cliente.nome}`,
          valor: dinheiro(valorTotal - pago),
          vencimento: dataEntrega,
          status: 'PENDENTE',
        },
      })
    }
  }
  console.log(`  ✓ ${contadorEnc} encomendas`)

  // ── Contas fixas ────────────────────────────────────────────────────────
  const fixas = [
    { descricao: 'Aluguel — Av. São João, 390', valor: 6800, categoria: catAluguel.id, dia: 5, recorrencia: 'MENSAL' },
    { descricao: 'Energia elétrica', valor: 1450, categoria: catEnergia.id, dia: 12, recorrencia: 'MENSAL' },
    { descricao: 'Água e esgoto', valor: 380, categoria: catEnergia.id, dia: 15, recorrencia: 'MENSAL' },
    { descricao: 'Folha de pagamento', valor: 12400, categoria: catFolha.id, dia: 5, recorrencia: 'MENSAL' },
    { descricao: 'Internet e telefonia', valor: 260, categoria: catEnergia.id, dia: 20, recorrencia: 'MENSAL' },
    { descricao: 'Impulsionamento Instagram', valor: 600, categoria: catMarketing.id, dia: 10, recorrencia: 'MENSAL' },
    { descricao: 'Manutenção da máquina de espresso', valor: 890, categoria: catFin[5].id, dia: 22, recorrencia: null },
  ]
  const hoje = new Date()
  for (const f of fixas) {
    for (const mesAtras of [2, 1, 0]) {
      const venc = new Date(hoje.getFullYear(), hoje.getMonth() - mesAtras, f.dia)
      if (venc > hoje && mesAtras > 0) continue
      const pago = venc < hoje && talvez(mesAtras === 0 ? 0.45 : 0.95)
      await db.contaPagar.create({
        data: {
          lojaId: loja.id,
          categoriaId: f.categoria,
          descricao: f.descricao,
          valor: f.valor,
          valorPago: pago ? f.valor : 0,
          vencimento: venc,
          pagoEm: pago ? venc : null,
          status: pago ? 'LIQUIDADO' : venc < hoje ? 'ATRASADO' : 'PENDENTE',
          recorrencia: f.recorrencia,
          criadoEm: new Date(venc.getTime() - 20 * 86400000),
        },
      })
      if (!f.recorrencia) break
    }
  }

  // Uma receita avulsa, para o fluxo de caixa não ser só venda
  await db.contaReceber.create({
    data: {
      lojaId: loja.id,
      categoriaId: catFin[8].id,
      descricao: 'Workshop de confeitaria — turma de setembro',
      valor: 2400,
      valorRecebido: 2400,
      vencimento: diasAtras(12),
      recebidoEm: diasAtras(12),
      status: 'LIQUIDADO',
    },
  })

  // ── Contadores (para os códigos continuarem a sequência) ────────────────
  await db.contador.createMany({
    data: [
      { lojaId: loja.id, chave: 'pedido', valor: contadorPedido },
      { lojaId: loja.id, chave: 'caixa', valor: contadorCaixa },
      { lojaId: loja.id, chave: 'producao', valor: contadorOp },
      { lojaId: loja.id, chave: 'compra', valor: contadorCompra },
      { lojaId: loja.id, chave: 'encomenda', valor: contadorEnc },
      { lojaId: loja.id, chave: 'inventario', valor: 0 },
    ],
  })

  // ── Resumo ──────────────────────────────────────────────────────────────
  const faturamento = await db.pedido.aggregate({ where: { lojaId: loja.id, status: 'FINALIZADO' }, _sum: { total: true } })
  const maisVendido = Object.entries(totaisPorProduto).sort((a, b) => b[1] - a[1])[0]

  console.log('\n✅ Seed concluído.\n')
  console.log(`   Loja:         ${loja.nome}`)
  console.log(`   Histórico:    ${DIAS_HISTORICO} dias · ${contadorPedido} vendas`)
  console.log(`   Faturamento:  R$ ${Number(faturamento._sum.total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`   Mais vendido: ${defsProdutos.find((d) => d.sku === maisVendido?.[0])?.nome ?? '—'} (${maisVendido?.[1]} un)`)
  console.log('\n   Acessos (senha para todos: nobru2026):')
  for (const u of equipe) {
    const cargo = Object.entries(cargos).find(([, id]) => id === u.cargoId)?.[0]
    console.log(`     ${u.email.padEnd(32)} ${cargo}`)
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error('\n❌ Falha no seed:\n', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
