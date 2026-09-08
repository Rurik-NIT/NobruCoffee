/**
 * Conteúdo do site da Nobru Coffee.
 *
 * Tudo aqui é dado público verificado, retirado de `docs/referencias/
 * NOBRU_COFFEE_BRIEF.md` — CNPJ, Google Maps, Instagram. Nada é inventado:
 * este é o site de uma loja que existe, e um horário errado ou um endereço
 * aproximado faz alguém bater na porta fechada.
 *
 * Separado da renderização porque é o arquivo que o cliente vai querer revisar
 * — e mexer em texto não deveria exigir mexer em layout.
 */

export const LOJA = {
  nome: 'Nobru Coffee',
  nomeCompleto: 'Nobru Coffee e Donuts',
  /** A marca abre todo post com este símbolo. É a assinatura verbal dela. */
  assinatura: '⭕️',
  linha: 'Cafeteria BLENDS NC',
  /** Descrição escrita pela própria marca no Facebook. */
  frase: 'Somos um jeito diferente de servir café e donuts.',
  desde: 2016,
  fundadaEm: '02/08/2016',
} as const

export const ENDERECO = {
  rua: 'Av. São João, 390',
  bairro: 'Jardim Esplanada',
  cidade: 'São José dos Campos',
  uf: 'SP',
  cep: '12242-840',
  completo: 'Av. São João, 390 — Jardim Esplanada, São José dos Campos, SP',
  mapa: 'https://www.google.com/maps/place/Nobru+Coffee+e+Donuts/@-23.1953857,-45.8967093,17z',
} as const

export const CONTATO = {
  whatsapp: '(12) 99608-5508',
  whatsappLink: 'https://wa.me/5512996085508',
  instagram: 'https://www.instagram.com/nobrucoffee/',
  instagramArroba: '@nobrucoffee',
  instagramFundador: 'https://www.instagram.com/nobruarte/',
  instagramFundadorArroba: '@nobruarte',
  email: 'nobruarte@gmail.com',
} as const

/**
 * Horários da bio do Instagram. Segunda fechado.
 * `dia` segue `Date.getDay()`: 0 = domingo.
 */
export const HORARIOS = [
  { dia: 0, nome: 'Domingo', abre: '10:00', fecha: '19:00' },
  { dia: 1, nome: 'Segunda', abre: null, fecha: null },
  { dia: 2, nome: 'Terça', abre: '10:00', fecha: '19:30' },
  { dia: 3, nome: 'Quarta', abre: '10:00', fecha: '19:30' },
  { dia: 4, nome: 'Quinta', abre: '10:00', fecha: '19:30' },
  { dia: 5, nome: 'Sexta', abre: '10:00', fecha: '19:30' },
  { dia: 6, nome: 'Sábado', abre: '10:00', fecha: '19:00' },
] as const

/** Agrupamento para leitura humana, do jeito que a bio apresenta. */
export const HORARIO_RESUMO = [
  { quando: 'Terça a sexta', horas: '10h00 às 19h30' },
  { quando: 'Sábado e domingo', horas: '10h00 às 19h00' },
  { quando: 'Segunda', horas: 'Fechado' },
] as const

export const NUMEROS = [
  { valor: '5,0', unidade: '★', rotulo: 'no Google', apoio: 'com 228 avaliações' },
  { valor: '228', unidade: '', rotulo: 'avaliações', apoio: 'nota cheia, sem uma queda' },
  { valor: '9', unidade: 'anos', rotulo: 'de esquina', apoio: `desde ${LOJA.fundadaEm}` },
  { valor: '272', unidade: '+', rotulo: 'fotos', apoio: 'postadas por quem veio' },
] as const

/**
 * Linha do tempo. Datas do CNPJ e do que a própria marca publicou.
 */
export const HISTORIA = [
  {
    marco: '2016',
    titulo: 'Abre a donuteria',
    texto:
      'Nobru é apelido — o do fundador, que é confeiteiro e virou o rosto da marca. A loja nasce em agosto, no Jardim Esplanada, fazendo donut de produção própria num bairro que não tinha.',
  },
  {
    marco: 'O bairro',
    titulo: 'Vira ponto de encontro',
    texto:
      'A esquina da Av. São João é corredor gastronômico de São José. A loja pega o fluxo da tarde e vira lugar de sentar, não de passar: casais, famílias, gente que fica.',
  },
  {
    marco: '5,0 ★',
    titulo: 'Nota cheia, 228 vezes',
    texto:
      'Nota 5,0 com esse volume de avaliação é raro em qualquer categoria. O dono responde uma a uma, com nome e texto longo. Atendimento aqui não é script.',
  },
  {
    marco: 'Hoje',
    titulo: 'Cafeteria BLENDS NC',
    texto:
      'A casa criou um cardápio autoral só de café e assumiu a cafeteria junto da confeitaria. Café para beber, café para comer, café em tudo.',
  },
] as const

/** O que sai da vitrine. Itens observados publicamente. */
export const CARDAPIO = [
  {
    nome: 'Donuts',
    marca: 'a casa',
    texto: 'Carro-chefe. Recheio e cobertura mudam toda semana, e edição especial em data comemorativa.',
    detalhe: 'creme branco · geleia cítrica de morango · chocolate branco · crocante de caramelo',
    destaque: true,
  },
  {
    nome: 'BLENDS NC',
    marca: 'cardápio autoral',
    texto: 'A linha de café especial da casa, com trilogia para quem quer comparar na xícara.',
    detalhe: 'café para beber · café para comer · café em tudo',
    destaque: true,
  },
  {
    nome: 'Cookies',
    marca: 'especialidade',
    texto: 'Citados pela imprensa local como especialidade da casa, ao lado dos donuts.',
    detalhe: null,
    destaque: false,
  },
  {
    nome: 'Coxinha cremosa',
    marca: 'o mais citado',
    texto: 'O salgado que mais aparece nas avaliações do Google — 19 menções, mais que qualquer doce.',
    detalhe: null,
    destaque: false,
  },
  {
    nome: 'Confeitaria de vitrine',
    marca: 'doce individual',
    texto: 'Copinhos de creme com morango, cheesecake e o que a bancada resolveu naquele dia.',
    detalhe: null,
    destaque: false,
  },
  {
    nome: 'Café da tarde',
    marca: 'na tábua',
    texto: 'Combinação de doce, salgado e café servida em tábua, para dividir ou não.',
    detalhe: null,
    destaque: false,
  },
] as const

/** As palavras que mais se repetem nas 228 avaliações do Google. */
export const MAIS_CITADOS = [
  { palavra: 'coxinha', vezes: 19 },
  { palavra: 'doces', vezes: 17 },
  { palavra: 'cafeteria', vezes: 17 },
  { palavra: 'simpático', vezes: 11 },
] as const

/** Trecho de avaliação pública do Google, usado com atribuição. */
export const DEPOIMENTO = {
  texto: 'O ambiente é acolhedor, bem cuidado e perfeito para tomar um bom café',
  fonte: 'avaliação no Google',
} as const

export const ENCOMENDA = {
  titulo: 'Bolo, torta e kit de festa',
  chamada: 'Já reservou o seu?',
  texto:
    'Encomenda é feita com antecedência, conversando: sabor, tamanho, decoração e o dia da retirada. Chame no WhatsApp que a gente monta junto.',
} as const

/** Frases do próprio perfil, para o letreiro que corre na tela. */
export const LETREIRO = [
  'só vem',
  'café para beber',
  'café para comer',
  'café em tudo',
  'produção própria todo dia',
  'donut sai quentinho',
  'já reservou o seu?',
] as const
