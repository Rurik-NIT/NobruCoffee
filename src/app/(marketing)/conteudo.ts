/**
 * Conteúdo da landing page.
 *
 * Todo texto vive aqui, indexado por idioma. Hoje só existe `pt-BR`; adicionar
 * `en` ou `es` é acrescentar uma chave neste objeto e trocar `IDIOMA_PADRAO` —
 * nenhum componente precisa mudar. Foi por isso que o texto saiu do JSX.
 *
 * Preços também moram aqui: a seção de planos é dado, não código
 * (spec § 33 — não embutir lógica de preço no app).
 */

export type Idioma = 'pt-BR'
export const IDIOMA_PADRAO: Idioma = 'pt-BR'

export const conteudo = {
  'pt-BR': {
    nav: {
      recursos: 'Recursos',
      pdv: 'PDV',
      producao: 'Produção',
      planos: 'Planos',
      entrar: 'Entrar',
      comecar: 'Começar agora',
    },

    hero: {
      selo: 'O sistema operacional de cafeterias, padarias e donuterias',
      titulo: ['Cuide do seu café.', 'Não da planilha.'],
      subtitulo:
        'Venda, produção, estoque, clientes e financeiro num sistema só. Feito para quem produz o que vende — e precisa saber, no fim do dia, se deu lucro.',
      ctaPrimario: 'Começar agora',
      ctaSecundario: 'Ver demonstração',
      rodape: 'Sem instalação. Funciona no computador do caixa, no iPad do balcão e no celular do dono.',
    },

    prova: {
      titulo: 'Nascido dentro de uma loja de verdade',
      descricao:
        'A Nobru Coffee e Donuts abriu em 2016 na Av. São João, em São José dos Campos. Produz tudo no local, vende até dar SOLD OUT e responde cada avaliação pessoalmente. O sistema foi desenhado sobre essa operação.',
      indicadores: [
        { numero: '5,0★', rotulo: '228 avaliações no Google' },
        { numero: '10 anos', rotulo: 'de operação contínua' },
        { numero: '13 mil', rotulo: 'seguidores no Instagram' },
        { numero: '1 tela', rotulo: 'para o turno inteiro' },
      ],
    },

    problema: {
      eyebrow: 'O problema',
      titulo: 'Quem produz o que vende tem duas empresas dentro de uma',
      texto:
        'Um PDV comum resolve a venda e ignora a cozinha. A planilha do estoque não conversa com a ficha técnica. O caixa fecha com diferença e ninguém sabe por quê. No fim do mês o dono sabe quanto entrou, mas não quanto sobrou.',
      itens: [
        'Vendeu 40 donuts — quanto de farinha saiu do estoque?',
        'O preço da Nutella subiu 12% — qual donut ficou sem margem?',
        'Faltaram R$ 7 no caixa — de qual pedido?',
        'Produziu 50, vendeu 37 — quanto foi para o lixo?',
      ],
    },

    recursos: {
      eyebrow: 'O que o sistema faz',
      titulo: 'Tudo ligado, do grão ao lucro',
      descricao:
        'Cada módulo alimenta o próximo. A venda baixa o estoque pela ficha técnica, o estoque puxa a compra, a compra atualiza o custo, e o custo aparece na margem do produto.',
      itens: [
        {
          titulo: 'PDV que aguenta o pico',
          texto:
            'Carrinho instantâneo, pagamento dividido, troco calculado e comanda impressa. O operador fecha uma venda de balcão em segundos.',
        },
        {
          titulo: 'Ficha técnica com custo real',
          texto:
            'A receita de cada produto, com perda técnica e custo médio atualizado a cada compra. A margem deixa de ser chute.',
        },
        {
          titulo: 'Produção do dia',
          texto:
            'Sugestão de quanto produzir pela média dos últimos 7 dias. Ao concluir, consome insumo e dá entrada nos acabados.',
        },
        {
          titulo: 'Estoque que fecha',
          texto:
            'Livro de movimentos com saldo após cada lançamento, controle de lote e validade, inventário com folha de contagem.',
        },
        {
          titulo: 'Caixa conferido',
          texto:
            'Abertura com fundo de troco, sangria, suprimento e fechamento que separa dinheiro de cartão. A diferença fica registrada com o motivo.',
        },
        {
          titulo: 'Encomendas na agenda',
          texto:
            'Orçamento, sinal, produção e entrega. O que sai amanhã aparece antes de virar problema.',
        },
        {
          titulo: 'Clientes com histórico',
          texto:
            'Quem é, quanto gasta, o que costuma levar e há quantos dias não aparece. Pontos e cupons inclusos.',
        },
        {
          titulo: 'Financeiro de verdade',
          texto:
            'Contas a pagar e a receber, fluxo de caixa dia a dia, taxa da maquininha descontada e resultado do mês.',
        },
      ],
    },

    showcases: [
      {
        eyebrow: 'PDV',
        titulo: 'Feito para uma fila de oito pessoas',
        texto:
          'A grade de produtos é toque único. Variação e adicional só aparecem quando o produto tem. O carrinho fica no aparelho até o pagamento — nada de esperar o servidor a cada donut.',
        pontos: [
          'Balcão, viagem, mesa, delivery e iFood na mesma tela',
          'Pagamento dividido em até 4 formas, com troco calculado',
          'Desconto com limite por cargo e motivo obrigatório',
          'Comanda de 80 mm pronta para a impressora térmica',
        ],
      },
      {
        eyebrow: 'Produção e fichas técnicas',
        titulo: 'A receita vira custo, e o custo vira decisão',
        texto:
          'Cada produto tem sua ficha, com quantidade, perda técnica e custo por insumo. Quando o preço da farinha muda, a margem de todos os donuts se atualiza junto.',
        pontos: [
          'Fichas versionadas — o custo de julho continua sendo o de julho',
          'Sugestão diária de produção pela média dos últimos 7 dias',
          'Concluir a ordem consome insumo e dá entrada no acabado',
          'A perda do forno já entra no relatório de perdas',
        ],
      },
      {
        eyebrow: 'Estoque e compras',
        titulo: 'O saldo que bate com a prateleira',
        texto:
          'Toda entrada e saída deixa rastro, com o saldo resultante gravado na linha. Lote e validade avisam antes de virar prejuízo, e a reposição já vem agrupada por fornecedor.',
        pontos: [
          'Custo médio ponderado recalculado a cada recebimento',
          'Recebimento parcial sem quebrar o pedido de compra',
          'Alerta de mínimo e de validade no sino do sistema',
          'Inventário com folha de contagem e ajuste auditado',
        ],
      },
      {
        eyebrow: 'Financeiro e relatórios',
        titulo: 'No fim do dia, quanto sobrou',
        texto:
          'Faturamento é fácil de ver. Lucro exige juntar CMV, taxa de cartão, perda e despesa fixa — e é exatamente isso que o painel mostra.',
        pontos: [
          'Fluxo de caixa dia a dia com resultado acumulado',
          'Margem por produto com o custo congelado na venda',
          'Comparação com o mesmo dia da semana anterior',
          'Contas a pagar recorrentes que se recriam sozinhas',
        ],
      },
    ],

    planos: {
      eyebrow: 'Planos',
      titulo: 'Preço que cabe numa loja de bairro',
      descricao: 'Todos os planos incluem PDV, estoque, produção e financeiro. Sem taxa por venda.',
      periodo: '/mês',
      itens: [
        {
          nome: 'STARTER',
          alvo: 'Para lojas pequenas começando a organizar a operação.',
          preco: 'R$ 149',
          destaque: false,
          cta: 'Começar agora',
          recursos: [
            '1 loja e até 3 usuários',
            'PDV, pedidos e caixa',
            'Produtos, estoque e fichas técnicas',
            'Clientes e fidelidade',
            'Relatórios de vendas',
          ],
        },
        {
          nome: 'PROFESSIONAL',
          alvo: 'Para quem já produz todo dia e precisa controlar custo.',
          preco: 'R$ 289',
          destaque: true,
          cta: 'Começar agora',
          recursos: [
            'Tudo do Starter',
            'Usuários ilimitados com cargos e permissões',
            'Produção, perdas e inventário',
            'Compras, fornecedores e recebimento',
            'Financeiro completo e fluxo de caixa',
            'Encomendas e agenda de entregas',
          ],
        },
        {
          nome: 'BUSINESS',
          alvo: 'Para operações com mais de um ponto de venda.',
          preco: 'R$ 549',
          destaque: false,
          cta: 'Falar com a gente',
          recursos: [
            'Tudo do Professional',
            'Múltiplas lojas na mesma empresa',
            'Relatórios consolidados',
            'Log de auditoria completo',
            'Suporte prioritário no WhatsApp',
          ],
        },
      ],
      rodape: 'Preços de referência para a demonstração. A cobrança ainda não está integrada a um provedor de pagamento.',
    },

    faq: {
      eyebrow: 'Dúvidas',
      titulo: 'O que costumam perguntar',
      itens: [
        {
          pergunta: 'Funciona sem internet?',
          resposta:
            'Parcialmente, e a gente prefere ser claro: o aplicativo é instalável e a estrutura das telas fica no aparelho, então ele abre sem rede e mostra um aviso. Mas venda não é gravada offline. Um sistema com estoque, caixa e fidelidade precisaria resolver conflito de saldo na volta da conexão, e entregar isso pela metade seria pior do que não ter.',
        },
        {
          pergunta: 'Emite nota fiscal?',
          resposta:
            'Ainda não. O sistema imprime o comprovante da loja, não um documento fiscal. A modelagem já guarda CNPJ, CPF e os dados que uma integração de NFC-e exige, mas a integração em si é um passo seguinte — dizer que emite sem emitir seria um problema para você, não para nós.',
        },
        {
          pergunta: 'Preciso cadastrar tudo antes de começar a vender?',
          resposta:
            'Não. Dá para começar com categorias, produtos e formas de pagamento e já usar o PDV no mesmo dia. Ficha técnica, fornecedor e inventário podem entrar depois — o sistema avisa quais produtos ainda estão sem ficha.',
        },
        {
          pergunta: 'Meus funcionários vão conseguir usar?',
          resposta:
            'O PDV foi desenhado para ser aprendido em um turno. Cada pessoa tem o seu acesso, com um cargo que libera só o que ela precisa — o atendente não vê o financeiro, e o sistema registra quem cancelou cada venda.',
        },
        {
          pergunta: 'Serve para mais de uma loja?',
          resposta:
            'O banco já nasceu multi-loja: empresa, lojas, e tudo que é operacional carrega a loja. A interface hoje opera uma loja por vez; a visão consolidada é o próximo passo do plano Business.',
        },
        {
          pergunta: 'Como faço a migração dos meus dados?',
          resposta:
            'Produtos, insumos, clientes e fornecedores podem ser cadastrados direto no sistema ou carregados por planilha na implantação. Histórico de vendas antigo não é importado — ele ficaria sem ficha técnica e distorceria a margem.',
        },
      ],
    },

    ctaFinal: {
      titulo: 'Amanhã de manhã você já sabe quanto produzir',
      texto:
        'Instale, cadastre o cardápio e abra o caixa. No fim do primeiro dia o painel mostra faturamento, ticket médio, o que mais saiu e o que faltou no estoque.',
      ctaPrimario: 'Começar agora',
      ctaSecundario: 'Ver a documentação',
    },

    rodape: {
      descricao: 'O sistema operacional de cafeterias, padarias e donuterias que produzem o que vendem.',
      colunas: [
        {
          titulo: 'Produto',
          links: [
            { rotulo: 'Recursos', href: '#recursos' },
            { rotulo: 'PDV', href: '#pdv' },
            { rotulo: 'Produção', href: '#producao' },
            { rotulo: 'Planos', href: '#planos' },
          ],
        },
        {
          titulo: 'Sistema',
          links: [
            { rotulo: 'Entrar', href: '/entrar' },
            { rotulo: 'Manual de uso', href: '/docs/MANUAL-DE-USO.md' },
            { rotulo: 'Arquitetura', href: '/docs/ARQUITETURA.md' },
          ],
        },
        {
          titulo: 'A loja',
          links: [
            { rotulo: 'Instagram', href: 'https://www.instagram.com/nobrucoffee/' },
            { rotulo: 'Google Maps', href: 'https://www.google.com/maps/place/Nobru+Coffee+e+Donuts' },
            { rotulo: 'WhatsApp', href: 'https://wa.me/5512996085508' },
          ],
        },
      ],
      endereco: 'Av. São João, 390 — Jardim Esplanada, São José dos Campos/SP',
      direitos: 'Nobru Coffee e Donuts · CNPJ 25.350.633/0001-50',
      aviso: 'Sistema interno de gestão. Não emite documento fiscal.',
    },
  },
} as const

export function textos(idioma: Idioma = IDIOMA_PADRAO) {
  return conteudo[idioma]
}
