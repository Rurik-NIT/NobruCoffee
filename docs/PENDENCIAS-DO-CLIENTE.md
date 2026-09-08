# Pendências com o cliente

Itens que só a Nobru pode fornecer, e o que o sistema faz enquanto isso.
Levantados a partir de [`referencias/NOBRU_COFFEE_BRIEF.md`](referencias/NOBRU_COFFEE_BRIEF.md) § 8.

| # | Pendência | Situação atual no sistema | Impacto |
|---|---|---|---|
| 1 | **Logo em vetor** (SVG/AI/EPS) e versões alternativas | O selo é reconstruído em tipografia (`src/components/app-shell/marca.tsx`), fiel à estrutura do original: quadrado vermelho, "No/bru" em creme rotacionado, "COFFEE" em âmbar. A única fonte pública é o avatar do Instagram em 150×150. | Trocar por `<Image src="/brand/logo.svg">` quando chegar. Nada mais muda. |
| 2 | **Cardápio completo com preços** | Os produtos do seed usam preços plausíveis de mercado, não os reais — o iFood tem proteção anti-bot e não pôde ser lido. | Substituir no cadastro. Não afeta código. |
| 3 | **Tom exato do âmbar** do "COFFEE" | `#F7A96C`, amostrado do avatar em 150px. O brief marca como aproximado. | Ajustar `--color-amber-nobru` em `src/styles/globals.css`. Uso é decorativo (contraste 2,37:1 sobre o vermelho), então não afeta acessibilidade de texto. |
| 4 | **Endereço fiscal vigente** | O sistema usa o endereço de operação (Av. São João, 390). O CNPJ ainda aponta o ponto antigo (R. Benedito da Silva Ramos, 20). | Confirmar antes de qualquer integração fiscal. Editável em `Configurações › Dados da loja`. |
| 5 | **Fotos em alta resolução** | O PDV mostra as iniciais do produto na cor da categoria quando não há imagem — legível e rápido. O campo de imagem aceita URL. | Ver "upload de imagem" nos próximos passos do README. Há também questão de direito de uso nas fotos de terceiros do Google/Instagram. |
| 6 | **Canal oficial de atendimento** | O sistema usa `(12) 99608-5508` (Google Maps) nos links de WhatsApp. | Confirmar. Editável em `Configurações`. |
| 7 | **O que é a "Obra"** do destaque do Instagram | Não modelado. | Se for segunda unidade, o schema já é multi-loja — ver `docs/ARQUITETURA.md` § 9. |

## Decisões tomadas na ausência de resposta

Para não travar a construção, estas escolhas foram feitas e são reversíveis:

- **Marca em tipografia** em vez de raster ampliado. Um upscale de 150px ficaria
  borrado em tela de alta densidade; a reconstrução é nítida em qualquer tamanho.
- **Ícone do PWA usa o ⭕️**, não o lettering. A assinatura verbal da marca é
  legível a 48px na tela inicial; um lettering de duas linhas não seria.
- **Verde das plantas da fachada (`#2E7D5B`) como cor de sucesso** da interface —
  derivado da identidade real em vez do verde genérico de sistema.
- **Preços do seed são de referência**, marcados como tal no manual.
