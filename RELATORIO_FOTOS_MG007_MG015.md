# Fotografias MG007 a MG015 — verificação local

Data: 16/10/2026.

## Resultado

O ZIP foi extraído em `MG_BORRACHAS_FOTOS_CODEX/` sem sobrescrever arquivos do projeto. O instalador foi inspecionado e executado com destino a `photo-reference-preview/`, fora de `public/`. As duas URLs oferecidas para cada SKU retornaram `fetch failed`; nenhum WebP foi produzido. Uma consulta direta a um dos hosts também falhou na resolução de nome. O relatório detalhado das tentativas está em `photo-reference-preview/RELATORIO_FONTES.json`.

`npm install` foi tentado, mas não concluiu neste ambiente. Para executar os scripts, foi usada uma cópia local da biblioteca Sharp já disponível no runtime do Codex, dentro da pasta ignorada do kit. O verificador do próprio ZIP confirmou que os nove arquivos continuam ausentes. Os 15 testes do site passaram.

| SKU | Produto | Arquivo 1200 × 900 WebP | Fonte | Uso comercial |
| --- | --- | --- | --- | --- |
| MG007 | Roldanas de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG008 | Tarugos de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG009 | Acoplamentos de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG010 | Diafragmas de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG011 | Ponteiras de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG012 | Juntas de vedação | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG013 | Trefilados e perfis de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG014 | Peças técnicas de borracha sob medida | Pendente | Duas URLs inacessíveis | Não autorizado |
| MG015 | Revestimentos de borracha | Pendente | Duas URLs inacessíveis | Não autorizado |

## Integração encontrada

- `lib/catalog.mjs` usa `/media/{id}` da tabela `product_images` quando uma foto foi enviada pelo painel. Na prévia sem Supabase, MG001 a MG006 usam os arquivos existentes em `public/assets/products/`.
- O painel em `/admin/midia` já permite enviar uma fotografia para cada produto e marcar a imagem principal; ela passa a ter prioridade no catálogo e na página do produto.
- `lib/views.mjs` usa a mesma imagem no card e no detalhe. `public/catalog.css` já aplica proporção 4:3 e `object-fit: cover`; a folha final `public/site.css` também aplica `cover` às imagens dos produtos.

## Pendências para concluir

1. Fornecer uma fotografia própria ou uma autorização de uso comercial para cada SKU e confirmar que o objeto fotografado corresponde ao produto da MG Borrachas.
2. Padronizar os nove arquivos em WebP 1200 × 900, conferir visualmente o corte e enviar pelo painel, marcando a foto principal.
3. Verificar os nove cards e detalhes em desktop, tablet e celular, além dos filtros e links de orçamento, com as imagens reais carregadas.

As fotos MG001 a MG006, logo, descrições, categorias, preços, status e dados do Supabase não foram modificados. Após esta verificação, o proprietário solicitou a publicação do site no projeto Vercel vinculado. O deploy de produção ficou disponível em `https://mg-borrachas.vercel.app`; a verificação pública retornou 15 produtos, 10 categorias, 6 fotos e 9 marcadores de foto pendente. Nenhuma fotografia de referência de terceiros foi publicada.
