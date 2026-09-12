-- CreateEnum
CREATE TYPE "tipo_produto" AS ENUM ('SIMPLES', 'PRODUZIDO', 'PREPARADO', 'COMBO');

-- CreateEnum
CREATE TYPE "unidade_medida" AS ENUM ('G', 'KG', 'ML', 'L', 'UN', 'PCT', 'CX');

-- CreateEnum
CREATE TYPE "tipo_movimento" AS ENUM ('ENTRADA_COMPRA', 'ENTRADA_MANUAL', 'ENTRADA_PRODUCAO', 'SAIDA_PRODUCAO', 'SAIDA_VENDA', 'SAIDA_MANUAL', 'AJUSTE_INVENTARIO', 'PERDA', 'ESTORNO_VENDA');

-- CreateEnum
CREATE TYPE "status_inventario" AS ENUM ('ABERTO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "status_producao" AS ENUM ('PLANEJADA', 'EM_PRODUCAO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "motivo_perda" AS ENUM ('QUEIMADO', 'DANIFICADO', 'VENCIDO', 'ERRO_PRODUCAO', 'NAO_VENDIDO', 'EMBALAGEM', 'CORTESIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "status_compra" AS ENUM ('RASCUNHO', 'ENVIADO', 'PARCIAL', 'RECEBIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_fidelidade" AS ENUM ('ACUMULO', 'RESGATE', 'AJUSTE', 'EXPIRACAO');

-- CreateEnum
CREATE TYPE "tipo_desconto" AS ENUM ('PERCENTUAL', 'VALOR');

-- CreateEnum
CREATE TYPE "status_encomenda" AS ENUM ('ORCAMENTO', 'CONFIRMADA', 'EM_PRODUCAO', 'PRONTA', 'ENTREGUE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_mesa" AS ENUM ('LIVRE', 'OCUPADA', 'AGUARDANDO_PAGAMENTO', 'RESERVADA', 'INATIVA');

-- CreateEnum
CREATE TYPE "tipo_pedido" AS ENUM ('BALCAO', 'MESA', 'VIAGEM', 'DELIVERY', 'ENCOMENDA', 'IFOOD');

-- CreateEnum
CREATE TYPE "status_pedido" AS ENUM ('ABERTO', 'EM_PREPARO', 'PRONTO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "status_item_pedido" AS ENUM ('PENDENTE', 'PREPARANDO', 'PRONTO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_forma_pagamento" AS ENUM ('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'VOUCHER', 'FIADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "status_caixa" AS ENUM ('ABERTO', 'FECHADO', 'CONFERIDO');

-- CreateEnum
CREATE TYPE "tipo_movimento_caixa" AS ENUM ('ABERTURA', 'VENDA', 'SANGRIA', 'SUPRIMENTO', 'ESTORNO', 'DESPESA', 'FECHAMENTO');

-- CreateEnum
CREATE TYPE "status_pagamento" AS ENUM ('PENDENTE', 'APROVADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "tipo_categoria_financeira" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "status_conta" AS ENUM ('PENDENTE', 'PARCIAL', 'LIQUIDADO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_notificacao" AS ENUM ('ESTOQUE_BAIXO', 'VALIDADE_PROXIMA', 'CAIXA_DIVERGENCIA', 'ENCOMENDA_PROXIMA', 'PRODUCAO_PENDENTE', 'CONTA_VENCENDO', 'ANIVERSARIO_CLIENTE', 'SISTEMA');

-- CreateEnum
CREATE TYPE "severidade_notificacao" AS ENUM ('INFO', 'ALERTA', 'CRITICO');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lojas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "fuso_horario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome_negocio" TEXT NOT NULL,
    "logo_url" TEXT,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "fuso_horario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "alerta_validade_dias" INTEGER NOT NULL DEFAULT 7,
    "pontos_por_real" DECIMAL(8,3) NOT NULL DEFAULT 1,
    "valor_por_ponto" DECIMAL(8,4) NOT NULL DEFAULT 0.05,
    "taxa_servico_percentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxa_entrega_padrao" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desconto_maximo_operador" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "baixa_estoque_na_venda" BOOLEAN NOT NULL DEFAULT true,
    "horario_abertura" TEXT,
    "horario_fechamento" TEXT,
    "dias_funcionamento" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsapp" TEXT,
    "instagram" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "permissoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "loja_id" UUID,
    "cargo_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "apelido" VARCHAR(32),
    "senha_hash" TEXT NOT NULL,
    "telefone" TEXT,
    "cpf" TEXT,
    "avatar_url" TEXT,
    "pin_hash" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login_em" TIMESTAMP(3),
    "admitido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogada_em" TIMESTAMP(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT NOT NULL DEFAULT '#D24237',
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "descricao" TEXT,
    "imagem_url" TEXT,
    "tipo" "tipo_produto" NOT NULL DEFAULT 'PRODUZIDO',
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "preco_custo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "preco_venda" DECIMAL(12,2) NOT NULL,
    "controla_estoque" BOOLEAN NOT NULL DEFAULT true,
    "estoque_atual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estoque_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "tempo_preparo_min" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto_variacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "produto_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT,
    "preco_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "custo_delta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fator_ficha" DECIMAL(8,3) NOT NULL DEFAULT 1,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produto_variacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adicionais" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "custo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ingrediente_id" UUID,
    "quantidade_ingrediente" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adicionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto_adicionais" (
    "produto_id" UUID NOT NULL,
    "adicional_id" UUID NOT NULL,

    CONSTRAINT "produto_adicionais_pkey" PRIMARY KEY ("produto_id","adicional_id")
);

-- CreateTable
CREATE TABLE "combo_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "combo_id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 1,

    CONSTRAINT "combo_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unidade" "unidade_medida" NOT NULL DEFAULT 'G',
    "custo_medio" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "estoque_atual" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estoque_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "estoque_maximo" DECIMAL(12,3),
    "local_armazenagem" TEXT,
    "perecivel" BOOLEAN NOT NULL DEFAULT false,
    "fornecedor_padrao_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ingrediente_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "quantidade_inicial" DECIMAL(12,3) NOT NULL,
    "custo_unitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "validade" DATE,
    "recebido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_estoque" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "ingrediente_id" UUID,
    "produto_id" UUID,
    "lote_id" UUID,
    "tipo" "tipo_movimento" NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "custo_unitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "saldo_apos" DECIMAL(12,3) NOT NULL,
    "origem_tipo" TEXT,
    "origem_id" UUID,
    "observacao" TEXT,
    "usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "status_inventario" NOT NULL DEFAULT 'ABERTO',
    "observacao" TEXT,
    "usuario_id" UUID NOT NULL,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMP(3),
    "ajuste_valor" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventario_id" UUID NOT NULL,
    "ingrediente_id" UUID NOT NULL,
    "quantidade_sistema" DECIMAL(12,3) NOT NULL,
    "quantidade_contada" DECIMAL(12,3),
    "custo_unitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "observacao" TEXT,

    CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_tecnicas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "produto_id" UUID NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "rendimento" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unidade_rendimento" TEXT NOT NULL DEFAULT 'UN',
    "modo_preparo" TEXT,
    "tempo_preparo_min" INTEGER,
    "custo_total" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "custo_unitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_por_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_tecnica_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ficha_id" UUID NOT NULL,
    "ingrediente_id" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidade" "unidade_medida" NOT NULL,
    "perda_percentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "custo" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "observacao" TEXT,

    CONSTRAINT "ficha_tecnica_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_producao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "turno" TEXT,
    "status" "status_producao" NOT NULL DEFAULT 'PLANEJADA',
    "responsavel_id" UUID NOT NULL,
    "observacao" TEXT,
    "custo_estimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "custo_real" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iniciada_em" TIMESTAMP(3),
    "concluida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordens_producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordem_producao_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ordem_id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "ficha_tecnica_id" UUID,
    "quantidade_planejada" DECIMAL(12,3) NOT NULL,
    "quantidade_produzida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantidade_perdida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "custo_unitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "observacao" TEXT,

    CONSTRAINT "ordem_producao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perdas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "ingrediente_id" UUID,
    "produto_id" UUID,
    "ordem_producao_id" UUID,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "motivo" "motivo_perda" NOT NULL,
    "custo_estimado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perdas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "razao_social" TEXT,
    "cnpj_cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "contato" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "prazo_entrega_dias" INTEGER,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_compra" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "fornecedor_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "status_compra" NOT NULL DEFAULT 'RASCUNHO',
    "data_pedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_prevista" DATE,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_compra_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedido_id" UUID NOT NULL,
    "ingrediente_id" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "quantidade_recebida" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "preco_unitario" DECIMAL(12,4) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pedido_compra_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedido_compra_id" UUID NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota_fiscal" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimento_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recebimento_id" UUID NOT NULL,
    "pedido_compra_item_id" UUID,
    "ingrediente_id" UUID NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "preco_unitario" DECIMAL(12,4) NOT NULL,
    "lote" TEXT,
    "validade" DATE,

    CONSTRAINT "recebimento_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "data_nascimento" DATE,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "observacoes" TEXT,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "total_gasto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_pedidos" INTEGER NOT NULL DEFAULT 0,
    "ultima_compra_em" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes_fidelidade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "tipo" "tipo_fidelidade" NOT NULL,
    "pontos" INTEGER NOT NULL,
    "saldo_apos" INTEGER NOT NULL,
    "pedido_id" UUID,
    "descricao" TEXT,
    "usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacoes_fidelidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "tipo_desconto" NOT NULL DEFAULT 'PERCENTUAL',
    "valor" DECIMAL(12,2) NOT NULL,
    "minimo_compra" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "uso_maximo" INTEGER,
    "usos_feitos" INTEGER NOT NULL DEFAULT 0,
    "valido_de" DATE,
    "valido_ate" DATE,
    "cliente_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encomendas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "status" "status_encomenda" NOT NULL DEFAULT 'ORCAMENTO',
    "tipo_entrega" TEXT NOT NULL DEFAULT 'RETIRADA',
    "data_entrega" TIMESTAMP(3) NOT NULL,
    "tema" TEXT,
    "decoracao" TEXT,
    "observacoes" TEXT,
    "imagens_ref" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "endereco_entrega" TEXT,
    "valor_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valor_sinal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valor_pago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "usuario_id" UUID NOT NULL,
    "confirmada_em" TIMESTAMP(3),
    "entregue_em" TIMESTAMP(3),
    "cancelada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encomendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encomenda_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "encomenda_id" UUID NOT NULL,
    "produto_id" UUID,
    "descricao" TEXT NOT NULL,
    "sabor" TEXT,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "preco_unitario" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "encomenda_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT,
    "capacidade" INTEGER NOT NULL DEFAULT 2,
    "area" TEXT,
    "status" "status_mesa" NOT NULL DEFAULT 'LIVRE',
    "reserva_nome" TEXT,
    "reserva_hora" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "tipo_pedido" NOT NULL DEFAULT 'BALCAO',
    "status" "status_pedido" NOT NULL DEFAULT 'ABERTO',
    "mesa_id" UUID,
    "cliente_id" UUID,
    "encomenda_id" UUID,
    "caixa_id" UUID,
    "cupom_id" UUID,
    "usuario_id" UUID NOT NULL,
    "nome_cliente" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desconto_valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "desconto_motivo" TEXT,
    "taxa_entrega" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxa_servico" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "custo_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pontos_gerados" INTEGER NOT NULL DEFAULT 0,
    "pontos_resgatados" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "em_espera" BOOLEAN NOT NULL DEFAULT false,
    "aberto_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMP(3),
    "cancelado_em" TIMESTAMP(3),
    "cancelado_motivo" TEXT,
    "cancelado_por_id" UUID,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedido_id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "variacao_id" UUID,
    "nome" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "preco_unitario" DECIMAL(12,2) NOT NULL,
    "custo_unitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "desconto_valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "observacao" TEXT,
    "status" "status_item_pedido" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedido_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item_adicionais" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedido_item_id" UUID NOT NULL,
    "adicional_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 1,

    CONSTRAINT "pedido_item_adicionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tipo" "tipo_forma_pagamento" NOT NULL,
    "taxa_percentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxa_fixa" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "prazo_recebimento_dias" INTEGER NOT NULL DEFAULT 0,
    "conta_no_caixa" BOOLEAN NOT NULL DEFAULT false,
    "permite_troco" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "status_caixa" NOT NULL DEFAULT 'ABERTO',
    "saldo_inicial" DECIMAL(12,2) NOT NULL,
    "saldo_final_informado" DECIMAL(12,2),
    "saldo_final_esperado" DECIMAL(12,2),
    "diferenca" DECIMAL(12,2),
    "observacao_abertura" TEXT,
    "observacao_fechamento" TEXT,
    "usuario_abertura_id" UUID NOT NULL,
    "usuario_fechamento_id" UUID,
    "aberto_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechado_em" TIMESTAMP(3),

    CONSTRAINT "caixas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_caixa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caixa_id" UUID NOT NULL,
    "tipo" "tipo_movimento_caixa" NOT NULL,
    "forma_pagamento_id" UUID,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT,
    "pedido_id" UUID,
    "usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pedido_id" UUID,
    "encomenda_id" UUID,
    "forma_pagamento_id" UUID NOT NULL,
    "caixa_id" UUID,
    "valor" DECIMAL(12,2) NOT NULL,
    "valor_recebido" DECIMAL(12,2),
    "troco" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxa_valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "status_pagamento" NOT NULL DEFAULT 'APROVADO',
    "nsu" TEXT,
    "usuario_id" UUID NOT NULL,
    "estornado_em" TIMESTAMP(3),
    "estorno_motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "tipo_categoria_financeira" NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6B4A2F',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "fornecedor_id" UUID,
    "categoria_id" UUID,
    "pedido_compra_id" UUID,
    "forma_pagamento_id" UUID,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "valor_pago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vencimento" DATE NOT NULL,
    "pago_em" TIMESTAMP(3),
    "status" "status_conta" NOT NULL DEFAULT 'PENDENTE',
    "recorrencia" TEXT,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "cliente_id" UUID,
    "categoria_id" UUID,
    "pedido_id" UUID,
    "encomenda_id" UUID,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "valor_recebido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vencimento" DATE NOT NULL,
    "recebido_em" TIMESTAMP(3),
    "status" "status_conta" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "tipo" "tipo_notificacao" NOT NULL,
    "severidade" "severidade_notificacao" NOT NULL DEFAULT 'INFO',
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "entidade_tipo" TEXT,
    "entidade_id" TEXT,
    "chave" TEXT NOT NULL,
    "usuario_id" UUID,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lida_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_sistema" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID,
    "usuario_id" UUID,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT,
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contadores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loja_id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_slug_key" ON "lojas"("slug");

-- CreateIndex
CREATE INDEX "lojas_empresa_id_idx" ON "lojas"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_loja_id_key" ON "configuracoes"("loja_id");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_empresa_id_slug_key" ON "cargos"("empresa_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_apelido_key" ON "usuarios"("apelido");

-- CreateIndex
CREATE INDEX "usuarios_empresa_id_idx" ON "usuarios"("empresa_id");

-- CreateIndex
CREATE INDEX "usuarios_loja_id_idx" ON "usuarios"("loja_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_token_hash_key" ON "sessoes"("token_hash");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE INDEX "sessoes_expira_em_idx" ON "sessoes"("expira_em");

-- CreateIndex
CREATE INDEX "categorias_loja_id_idx" ON "categorias"("loja_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_loja_id_slug_key" ON "categorias"("loja_id", "slug");

-- CreateIndex
CREATE INDEX "produtos_loja_id_categoria_id_idx" ON "produtos"("loja_id", "categoria_id");

-- CreateIndex
CREATE INDEX "produtos_loja_id_ativo_disponivel_idx" ON "produtos"("loja_id", "ativo", "disponivel");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_loja_id_sku_key" ON "produtos"("loja_id", "sku");

-- CreateIndex
CREATE INDEX "produto_variacoes_produto_id_idx" ON "produto_variacoes"("produto_id");

-- CreateIndex
CREATE INDEX "adicionais_loja_id_idx" ON "adicionais"("loja_id");

-- CreateIndex
CREATE UNIQUE INDEX "combo_itens_combo_id_produto_id_key" ON "combo_itens"("combo_id", "produto_id");

-- CreateIndex
CREATE INDEX "ingredientes_loja_id_ativo_idx" ON "ingredientes"("loja_id", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ingredientes_loja_id_sku_key" ON "ingredientes"("loja_id", "sku");

-- CreateIndex
CREATE INDEX "lotes_ingrediente_id_idx" ON "lotes"("ingrediente_id");

-- CreateIndex
CREATE INDEX "lotes_validade_idx" ON "lotes"("validade");

-- CreateIndex
CREATE INDEX "movimentos_estoque_loja_id_criado_em_idx" ON "movimentos_estoque"("loja_id", "criado_em");

-- CreateIndex
CREATE INDEX "movimentos_estoque_ingrediente_id_criado_em_idx" ON "movimentos_estoque"("ingrediente_id", "criado_em");

-- CreateIndex
CREATE INDEX "movimentos_estoque_produto_id_criado_em_idx" ON "movimentos_estoque"("produto_id", "criado_em");

-- CreateIndex
CREATE INDEX "movimentos_estoque_origem_tipo_origem_id_idx" ON "movimentos_estoque"("origem_tipo", "origem_id");

-- CreateIndex
CREATE INDEX "inventarios_loja_id_status_idx" ON "inventarios"("loja_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventarios_loja_id_codigo_key" ON "inventarios"("loja_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_itens_inventario_id_ingrediente_id_key" ON "inventario_itens"("inventario_id", "ingrediente_id");

-- CreateIndex
CREATE INDEX "fichas_tecnicas_produto_id_ativa_idx" ON "fichas_tecnicas"("produto_id", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "fichas_tecnicas_produto_id_versao_key" ON "fichas_tecnicas"("produto_id", "versao");

-- CreateIndex
CREATE UNIQUE INDEX "ficha_tecnica_itens_ficha_id_ingrediente_id_key" ON "ficha_tecnica_itens"("ficha_id", "ingrediente_id");

-- CreateIndex
CREATE INDEX "ordens_producao_loja_id_data_idx" ON "ordens_producao"("loja_id", "data");

-- CreateIndex
CREATE INDEX "ordens_producao_loja_id_status_idx" ON "ordens_producao"("loja_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_producao_loja_id_codigo_key" ON "ordens_producao"("loja_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_producao_itens_ordem_id_produto_id_key" ON "ordem_producao_itens"("ordem_id", "produto_id");

-- CreateIndex
CREATE INDEX "perdas_loja_id_criado_em_idx" ON "perdas"("loja_id", "criado_em");

-- CreateIndex
CREATE INDEX "fornecedores_loja_id_ativo_idx" ON "fornecedores"("loja_id", "ativo");

-- CreateIndex
CREATE INDEX "pedidos_compra_loja_id_status_idx" ON "pedidos_compra"("loja_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_compra_loja_id_codigo_key" ON "pedidos_compra"("loja_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_compra_itens_pedido_id_ingrediente_id_key" ON "pedido_compra_itens"("pedido_id", "ingrediente_id");

-- CreateIndex
CREATE INDEX "recebimentos_pedido_compra_id_idx" ON "recebimentos"("pedido_compra_id");

-- CreateIndex
CREATE INDEX "recebimento_itens_recebimento_id_idx" ON "recebimento_itens"("recebimento_id");

-- CreateIndex
CREATE INDEX "clientes_loja_id_nome_idx" ON "clientes"("loja_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_loja_id_telefone_key" ON "clientes"("loja_id", "telefone");

-- CreateIndex
CREATE INDEX "transacoes_fidelidade_cliente_id_criado_em_idx" ON "transacoes_fidelidade"("cliente_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "cupons_loja_id_codigo_key" ON "cupons"("loja_id", "codigo");

-- CreateIndex
CREATE INDEX "encomendas_loja_id_status_idx" ON "encomendas"("loja_id", "status");

-- CreateIndex
CREATE INDEX "encomendas_loja_id_data_entrega_idx" ON "encomendas"("loja_id", "data_entrega");

-- CreateIndex
CREATE UNIQUE INDEX "encomendas_loja_id_codigo_key" ON "encomendas"("loja_id", "codigo");

-- CreateIndex
CREATE INDEX "encomenda_itens_encomenda_id_idx" ON "encomenda_itens"("encomenda_id");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_loja_id_numero_key" ON "mesas"("loja_id", "numero");

-- CreateIndex
CREATE INDEX "pedidos_loja_id_status_idx" ON "pedidos"("loja_id", "status");

-- CreateIndex
CREATE INDEX "pedidos_loja_id_aberto_em_idx" ON "pedidos"("loja_id", "aberto_em");

-- CreateIndex
CREATE INDEX "pedidos_loja_id_finalizado_em_idx" ON "pedidos"("loja_id", "finalizado_em");

-- CreateIndex
CREATE INDEX "pedidos_caixa_id_idx" ON "pedidos"("caixa_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_loja_id_codigo_key" ON "pedidos"("loja_id", "codigo");

-- CreateIndex
CREATE INDEX "pedido_itens_pedido_id_idx" ON "pedido_itens"("pedido_id");

-- CreateIndex
CREATE INDEX "pedido_itens_produto_id_idx" ON "pedido_itens"("produto_id");

-- CreateIndex
CREATE INDEX "pedido_item_adicionais_pedido_item_id_idx" ON "pedido_item_adicionais"("pedido_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "formas_pagamento_loja_id_slug_key" ON "formas_pagamento"("loja_id", "slug");

-- CreateIndex
CREATE INDEX "caixas_loja_id_status_idx" ON "caixas"("loja_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "caixas_loja_id_codigo_key" ON "caixas"("loja_id", "codigo");

-- CreateIndex
CREATE INDEX "movimentos_caixa_caixa_id_criado_em_idx" ON "movimentos_caixa"("caixa_id", "criado_em");

-- CreateIndex
CREATE INDEX "pagamentos_pedido_id_idx" ON "pagamentos"("pedido_id");

-- CreateIndex
CREATE INDEX "pagamentos_encomenda_id_idx" ON "pagamentos"("encomenda_id");

-- CreateIndex
CREATE INDEX "pagamentos_criado_em_idx" ON "pagamentos"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_financeiras_loja_id_nome_tipo_key" ON "categorias_financeiras"("loja_id", "nome", "tipo");

-- CreateIndex
CREATE INDEX "contas_pagar_loja_id_status_idx" ON "contas_pagar"("loja_id", "status");

-- CreateIndex
CREATE INDEX "contas_pagar_loja_id_vencimento_idx" ON "contas_pagar"("loja_id", "vencimento");

-- CreateIndex
CREATE INDEX "contas_receber_loja_id_status_idx" ON "contas_receber"("loja_id", "status");

-- CreateIndex
CREATE INDEX "contas_receber_loja_id_vencimento_idx" ON "contas_receber"("loja_id", "vencimento");

-- CreateIndex
CREATE INDEX "notificacoes_loja_id_lida_criado_em_idx" ON "notificacoes"("loja_id", "lida", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_loja_id_chave_key" ON "notificacoes"("loja_id", "chave");

-- CreateIndex
CREATE INDEX "logs_sistema_loja_id_criado_em_idx" ON "logs_sistema"("loja_id", "criado_em");

-- CreateIndex
CREATE INDEX "logs_sistema_entidade_entidade_id_idx" ON "logs_sistema"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "logs_sistema_usuario_id_criado_em_idx" ON "logs_sistema"("usuario_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "contadores_loja_id_chave_key" ON "contadores"("loja_id", "chave");

-- AddForeignKey
ALTER TABLE "lojas" ADD CONSTRAINT "lojas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_variacoes" ADD CONSTRAINT "produto_variacoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adicionais" ADD CONSTRAINT "adicionais_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adicionais" ADD CONSTRAINT "adicionais_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_adicionais" ADD CONSTRAINT "produto_adicionais_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto_adicionais" ADD CONSTRAINT "produto_adicionais_adicional_id_fkey" FOREIGN KEY ("adicional_id") REFERENCES "adicionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_itens" ADD CONSTRAINT "combo_itens_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_itens" ADD CONSTRAINT "combo_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredientes" ADD CONSTRAINT "ingredientes_fornecedor_padrao_id_fkey" FOREIGN KEY ("fornecedor_padrao_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_inventario_id_fkey" FOREIGN KEY ("inventario_id") REFERENCES "inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_tecnicas" ADD CONSTRAINT "fichas_tecnicas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_tecnicas" ADD CONSTRAINT "fichas_tecnicas_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_itens" ADD CONSTRAINT "ficha_tecnica_itens_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "fichas_tecnicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_tecnica_itens" ADD CONSTRAINT "ficha_tecnica_itens_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_producao" ADD CONSTRAINT "ordens_producao_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_producao_itens" ADD CONSTRAINT "ordem_producao_itens_ordem_id_fkey" FOREIGN KEY ("ordem_id") REFERENCES "ordens_producao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_producao_itens" ADD CONSTRAINT "ordem_producao_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_producao_itens" ADD CONSTRAINT "ordem_producao_itens_ficha_tecnica_id_fkey" FOREIGN KEY ("ficha_tecnica_id") REFERENCES "fichas_tecnicas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perdas" ADD CONSTRAINT "perdas_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perdas" ADD CONSTRAINT "perdas_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perdas" ADD CONSTRAINT "perdas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perdas" ADD CONSTRAINT "perdas_ordem_producao_id_fkey" FOREIGN KEY ("ordem_producao_id") REFERENCES "ordens_producao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perdas" ADD CONSTRAINT "perdas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra_itens" ADD CONSTRAINT "pedido_compra_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_compra_itens" ADD CONSTRAINT "pedido_compra_itens_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "pedidos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimento_itens" ADD CONSTRAINT "recebimento_itens_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimento_itens" ADD CONSTRAINT "recebimento_itens_pedido_compra_item_id_fkey" FOREIGN KEY ("pedido_compra_item_id") REFERENCES "pedido_compra_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimento_itens" ADD CONSTRAINT "recebimento_itens_ingrediente_id_fkey" FOREIGN KEY ("ingrediente_id") REFERENCES "ingredientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_fidelidade" ADD CONSTRAINT "transacoes_fidelidade_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_fidelidade" ADD CONSTRAINT "transacoes_fidelidade_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes_fidelidade" ADD CONSTRAINT "transacoes_fidelidade_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomenda_itens" ADD CONSTRAINT "encomenda_itens_encomenda_id_fkey" FOREIGN KEY ("encomenda_id") REFERENCES "encomendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encomenda_itens" ADD CONSTRAINT "encomenda_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_encomenda_id_fkey" FOREIGN KEY ("encomenda_id") REFERENCES "encomendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "cupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cancelado_por_id_fkey" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_variacao_id_fkey" FOREIGN KEY ("variacao_id") REFERENCES "produto_variacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_adicionais" ADD CONSTRAINT "pedido_item_adicionais_pedido_item_id_fkey" FOREIGN KEY ("pedido_item_id") REFERENCES "pedido_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_adicionais" ADD CONSTRAINT "pedido_item_adicionais_adicional_id_fkey" FOREIGN KEY ("adicional_id") REFERENCES "adicionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formas_pagamento" ADD CONSTRAINT "formas_pagamento_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_usuario_abertura_id_fkey" FOREIGN KEY ("usuario_abertura_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_usuario_fechamento_id_fkey" FOREIGN KEY ("usuario_fechamento_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_encomenda_id_fkey" FOREIGN KEY ("encomenda_id") REFERENCES "encomendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "categorias_financeiras_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_pedido_compra_id_fkey" FOREIGN KEY ("pedido_compra_id") REFERENCES "pedidos_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_encomenda_id_fkey" FOREIGN KEY ("encomenda_id") REFERENCES "encomendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_sistema" ADD CONSTRAINT "logs_sistema_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_sistema" ADD CONSTRAINT "logs_sistema_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contadores" ADD CONSTRAINT "contadores_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

