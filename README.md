# MG Borrachas — site e catálogo

Implementação local em português brasileiro. A marca exibida no site e no painel usa `public/assets/brand/marca-mg-oficial-transparente.png`, byte por byte idêntica ao PNG mais recente enviado pelo usuário, sem redesenho. A composição publicitária anterior permanece em `public/assets/brand/marca-referencia.png` e o pacote original foi mantido em `material-original/`. A página inicial mantém o banner industrial aprovado. O catálogo segue a referência visual com banner, filtros laterais, grade larga de até quatro colunas e cartões com fotografias em proporção 4:3. Os cards de categorias exibem fotos vinculadas a produtos da própria categoria; quando não há foto confirmada, mostram “Foto em breve”. As seis fotos do catálogo vêm do pacote original. Os nove produtos sem foto confirmada usam um marcador neutro “Fotografia ainda não disponível”, sem a marca como fotografia de produto. **Esta etapa permanece local, sem deploy.**

## Executar localmente

Testado com Node.js 24. Não há dependências externas para instalar. Os comandos `npm run dev` e `npm start` usam os certificados do Windows para a conexão HTTPS com o Supabase.

```powershell
Copy-Item .env.example .env
npm run dev
```

Abra `http://localhost:4317`. A porta 4317 evita conflito com outro projeto que usa a 3000. O site consulta o Supabase. Os 15 produtos iniciais estão publicados e são retornados pela chave pública. O login administrativo ficará utilizável após a criação de um usuário administrador.

## Configurar Supabase

1. No painel do projeto Supabase indicado em `.env`, execute `supabase/setup-completo.sql` no editor SQL. Ele reúne `001_init.sql` e `002_content.sql` em uma transação. As chaves da API não executam migrações SQL; é preciso ter acesso ao painel desse projeto ou à conexão do banco.
2. Crie o usuário administrador em Supabase Auth. Copie o UUID desse usuário.
3. No editor SQL, conceda acesso administrativo apenas a esse UUID:

```sql
insert into public.admin_profiles(user_id) values ('UUID_DO_USUARIO');
```

4. Preencha `SUPABASE_URL` com a origem do projeto (sem `/rest/v1/`) e `SUPABASE_ANON_KEY` com a chave `sb_publishable_...`. Defina `PUBLIC_SITE_URL` com o domínio real quando existir.
5. Para a importação local, preencha também `SUPABASE_SERVICE_ROLE_KEY` com a chave `sb_secret_...` e execute `npm run import:catalog`. **Não coloque essa chave em código público nem no ambiente de produção do site.** Remova-a do `.env` após a importação.

A importação usa SKU para evitar duplicatas, preserva produtos existentes e cadastra novos itens como **rascunho**. Também envia as seis imagens do pacote ao bucket privado. O administrador revisa e publica cada produto no painel. Com o Supabase configurado, o catálogo público mostra somente itens publicados; alterações salvas no banco aparecem sem novo deploy.

## Publicar os 15 produtos existentes

No projeto Supabase configurado em `.env`, abra **SQL Editor → New query** e execute [publicar-catalogo-inicial.sql](supabase/publicar-catalogo-inicial.sql) com uma conta de proprietário. O script confere que os SKUs `MG001` a `MG015` existem, que suas categorias estão ativas e que nenhum está arquivado. Em seguida altera **somente** `public.products.status` de `draft` para `published`. Ele não insere produtos, não muda nomes, descrições, categorias ou imagens e pode ser executado novamente sem duplicar registros. A consulta final deve mostrar `total = 15` e `published = 15`.

Alternativamente, após criar um usuário autorizado em `public.admin_profiles`, acesse `/admin/produtos`, marque os 15 itens, selecione **Publicar** e clique em **Aplicar**. A tabela de produtos é `public.products`; o campo de publicação é `status`, com valores `draft`, `published` e `archived`. As políticas RLS em `supabase/setup-completo.sql` permitem leitura anônima de produtos e imagens apenas quando o produto está `published`. Verifique o resultado pelo catálogo público, que usa a chave publicável.

Nove dos 15 itens não têm fotografia individual confirmada. Eles exibem “Fotografia ainda não disponível” em vez da marca; carregue fotos reais no painel quando disponíveis.

## Páginas e recursos

- Página inicial, catálogo, categorias, produto individual, soluções sob medida, sobre, contato, orçamento, privacidade e 404.
- Busca sem distinção de acentos, filtros, ordenação e carregamento progressivo.
- Lista de orçamento no navegador com quantidade e observações; abre mensagem preparada no WhatsApp comercial. Abrir o WhatsApp **não** registra envio concluído.
- Painel com produtos, seleção múltipla (publicar, despublicar, mover de categoria, destacar e excluir), categorias com imagem escolhida entre fotos de produtos publicados, fotografias, banners promocionais, PDFs técnicos e configurações, inclusive título, descrição e seleção de até quatro fotografias de produtos publicados para a capa. Login via Supabase Auth, sessão em cookie HttpOnly e autorização verificada no servidor e nas políticas RLS. O servidor impede publicar produtos em categorias inativas ou desativar uma categoria que ainda tenha produtos publicados.
- Arquivos de imagem em bucket privado; o servidor só entrega imagens publicadas ao público.
- Metadata por página, sitemap, robots.txt e dados estruturados básicos.

## Aplicativo instalável (PWA)

O site público inclui `manifest.webmanifest`, ícones 192/512/180 px derivados mecanicamente da logo oficial, ícone maskable, service worker versionado e página `/offline`. O cache inclui arquivos públicos e páginas públicas visitadas; rotas `/admin`, `/api`, `/media` e documentos PDF não entram no cache. A lista de orçamento continua no armazenamento local do navegador. O botão de instalação aparece quando o navegador oferece `beforeinstallprompt`; no Safari de iPhone são mostradas instruções de instalação manual. O aviso de atualização pede uma ação antes de trocar a versão. A instalação requer HTTPS em produção; `localhost` pode ser usado para desenvolvimento. A experiência em iPhone e em modo avião precisa ser validada em aparelhos reais.

Para regenerar os ícones após uma mudança autorizada da marca: `python scripts/build-pwa-icons.py` (requer Pillow). Os ícones gerados preservam as proporções e as cores do PNG enviado.

## Preparação para hospedagem

`api/index.mjs` exporta o mesmo handler HTTP usado pelo servidor local, e `vercel.json` direciona as rotas dinâmicas a essa função. Os arquivos de `public/` permanecem estáticos. `.vercelignore` impede o envio do `.env`, do material original e dos arquivos de auditoria. A entrada foi exercitada localmente com `VERCEL=1`, incluindo Home, catálogo e proteção da API administrativa; ainda não houve build ou deploy na Vercel.

Para um futuro deploy, configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `PUBLIC_SITE_URL` (URL HTTPS real) nas variáveis do projeto. **Nunca configure `SUPABASE_SERVICE_ROLE_KEY` no site.** O limite de cada upload pelo painel é de 4 MB para caber no limite atual de 4,5 MB do corpo das Vercel Functions. [Limite oficial de payload](https://vercel.com/docs/functions/limitations).

O plano Hobby gratuito da Vercel é restrito a projetos pessoais não comerciais, conforme a [documentação do plano](https://vercel.com/docs/plans/hobby). Por isso, esta configuração técnica não autoriza a publicação comercial da MG Borrachas nesse plano. Antes da publicação, escolha uma hospedagem gratuita que permita uso comercial ou reavalie a plataforma; nenhum serviço pago foi contratado.

## Limites de homologação

Em 16/10/2026, a consulta pública ao Supabase retornou os 15 SKUs publicados, em 10 categorias, com seis imagens HTTP 200. O proprietário já confirmou a publicação dos 15 SKUs. Falta criar um usuário em Supabase Auth e vinculá-lo a `admin_profiles`, além de revisar dados comerciais e fotos. Os seis recortes disponíveis vêm de publicações e devem ser substituídos por fotos individuais quando o cliente as fornecer. Nove itens não possuem foto confirmada. Mangueiras industriais e placas não existem como categorias próprias ou produtos nestes 15 registros; não foram criados itens fictícios. O painel permite escolher imagens de produtos publicados para categorias e banners; ainda não oferece upload de arte independente de banners. A tabela `product_attributes` foi preparada na migração; a edição de dados técnicos pelo painel continua no campo JSON existente.

Não realize deploy nesta etapa. O projeto Vercel e as variáveis provisórias configurados em uma etapa anterior não foram usados para publicar o site. O endereço válido para desenvolvimento é `http://localhost:4317`. Quando houver autorização futura para publicação em hospedagem adequada, ajuste `PUBLIC_SITE_URL` para o endereço real e execute `node --use-system-ca scripts/verify-public.mjs https://DOMINIO-PUBLICO` para verificar catálogo, fotos, categorias e links de orçamento.

Ainda falta criar um usuário em Supabase Auth e vinculá-lo a `admin_profiles` para homologar login e operações do painel. Os nove produtos sem foto real continuam com marcador neutro. Esta versão usa servidor Node.js sem dependências externas; não é uma aplicação Next.js.

## Verificação

```powershell
npm test
node --check server.mjs
```

Consulte `RELATORIO.md` para o resultado da validação local e as pendências.
