# Deploy

## Requisitos

- Node 20.11+
- PostgreSQL 14+ com conexão TLS
- Um lugar para rodar Node com processo persistente (Vercel, Railway, Fly, VPS)

---

## 1. Banco

Qualquer PostgreSQL gerenciado serve: **Neon**, **Supabase**, **Railway**,
**RDS**. Requisitos: PG 14+, `sslmode=require`, backup automático diário.

Com pooling (Neon/Supabase), use a URL do pooler no `DATABASE_URL` e a direta no
`DIRECT_URL` — o Prisma precisa de conexão direta para aplicar DDL.

---

## 2. Variáveis

Configure no painel do provedor, nunca no repositório:

```
DATABASE_URL=postgresql://user:senha@host/db?sslmode=require
AUTH_SECRET=<48 bytes aleatórios, único por ambiente>
NEXT_PUBLIC_APP_URL=https://sistema.nobrucoffee.com.br
STORE_TIMEZONE=America/Sao_Paulo
SESSION_TTL_DAYS=7
NODE_ENV=production
```

Gerar o segredo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**Nunca reaproveite o `AUTH_SECRET` entre ambientes.**

---

## 3. Migrations

Antes do primeiro deploy, saia do `db:push` e crie a migration inicial:

```bash
pnpm db:migrate --name inicial
```

Comite `prisma/migrations/`. No deploy, rode antes de subir a aplicação:

```bash
pnpm db:deploy
```

---

## 4. Build e execução

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`pnpm build` roda `prisma generate` antes do `next build`.

### Vercel

Funciona sem ajuste: o framework é detectado e o build já gera o cliente Prisma.
Configure as variáveis e, se quiser migration automática, use
`pnpm db:deploy && pnpm build` como comando de build.

### Docker

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
```

---

## 5. Primeiro acesso em produção

O seed é de **demonstração** — não rode em produção.

Crie a empresa, a loja e o primeiro administrador com um script pontual ou pelo
Prisma Studio (`pnpm db:studio`), gerando o hash da senha no mesmo formato de
`src/server/auth/password.ts`. Depois disso tudo é feito pela interface:
`Gestão › Equipe` cadastra o resto do time.

A ordem de configuração do dia 1 está em
[`MANUAL-DE-USO.md` § 2](MANUAL-DE-USO.md#2-dia-0--montar-a-loja-no-sistema).

---

## 6. Depois de subir

| Item | Como |
|---|---|
| **HTTPS** | Obrigatório — o cookie de sessão é `secure` em produção |
| **Backup** | Diário no provedor, retenção de 30 dias. Teste a restauração uma vez |
| **Fuso** | Servidor em UTC; a aplicação formata em `America/Sao_Paulo` |
| **Service worker** | Só registra em produção. Ao publicar versão nova, incremente `VERSAO` em `public/sw.js` para invalidar o cache |
| **Rate limit** | Em memória, por processo. Com mais de uma instância, migre para Redis — está isolado em uma função em `modules/auth/actions.ts` |
| **Logs** | O envelope de ação escreve erros inesperados no stdout do provedor |

---

## 7. Checklist antes de abrir para a equipe

- [ ] `AUTH_SECRET` único e fora do repositório
- [ ] `DATABASE_URL` com `sslmode=require`
- [ ] Migration aplicada (`pnpm db:deploy`)
- [ ] Backup automático ligado e restauração testada
- [ ] HTTPS com certificado válido
- [ ] Administrador criado e senha trocada no primeiro acesso
- [ ] Formas de pagamento com as **taxas reais** da maquininha
- [ ] Desconto máximo do operador definido
- [ ] Uma pessoa, um acesso — nenhum login compartilhado
- [ ] Manual entregue à equipe
