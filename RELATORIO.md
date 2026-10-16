# Auditoria final local — MG Borrachas (16/10/2026)

## Problemas encontrados e correções

- A Home escondia as fotografias reais das categorias sob uma montagem fixa. Agora usa somente a foto de um produto publicado da respectiva categoria; na falta dela, mostra “Foto em breve” com a marca oficial.
- O texto da seção de destaque afirmava haver sempre seis produtos, mesmo que o catálogo mudasse. O texto agora acompanha um catálogo dinâmico.
- Era possível publicar um produto em categoria inativa ou desativar uma categoria com produto publicado, deixando a navegação pública inconsistente. As rotas administrativas agora recusam essas operações.
- A exclusão de PDF podia informar falha após o registro já ter sido excluído, caso só a limpeza do arquivo falhasse. A resposta agora informa o arquivo órfão separadamente.
- O nome e a descrição do manifesto PWA ainda limitavam a empresa ao setor industrial. Foram atualizados para artefatos de borracha para empresas e diferentes aplicações, e a versão do service worker foi incrementada para atualizar o cache.
- O título e a descrição SEO antigos da Home também limitavam a comunicação ao setor industrial. A apresentação pública agora usa uma redação mais ampla quando encontra exatamente os textos legados salvos no Supabase, sem alterar essas configurações de produção.
- O link do WhatsApp preparado por formulários agora normaliza o número para dígitos.
- O servidor Node local não tinha uma entrada de função para futura hospedagem na Vercel. Foram adicionados `api/index.mjs`, `vercel.json` e `.vercelignore`, sem alterar o fluxo local nem publicar o site. Os uploads do painel foram limitados a 4 MB para permanecer abaixo do teto de 4,5 MB das Vercel Functions.

## A. Funcionalidades implementadas

**Concluído localmente:** home alinhada à imagem de referência indicada pelo proprietário, com banner industrial amplo, marca oficial, faixa de benefícios e categorias; navegação pública, busca sem acentos, filtros, ordenação, catálogo paginado por “ver mais”, lista de orçamento com quantidade/observações, páginas institucionais e estrutura PWA instalável. Os cards e páginas individuais têm orçamento direto pelo WhatsApp com nome e SKU; na página de produto, quantidade e observações entram na mensagem. A imagem principal pode ser ampliada.

## B. Produtos importados

**Concluído no Supabase:** 15 SKUs MG001–MG015 do JSON enviado, agora publicados após a execução do SQL pelo proprietário. A consulta com a chave pública retornou os 15 produtos em 10 categorias. Seis recortes reais foram enviados ao bucket privado, vinculados aos produtos e responderam HTTP 200 como JPEG. Nove itens permanecem sem foto individual e mostram “Imagem em breve”. **Pendente de revisão comercial:** fotografias originais, medidas, disponibilidade e especificações.

| SKU | Produto | Categoria | Foto vinculada |
| --- | --- | --- | --- |
| MG001 | Coxim de borracha | Amortecimento e vibração | Sim |
| MG002 | Pinhão de borracha para betoneira | Peças para betoneiras | Sim |
| MG003 | Lençol de borracha Viton | Lençóis e chapas | Sim |
| MG004 | Pés de bengala e muletas de borracha | Ponteiras e proteção | Sim |
| MG005 | Anéis de vedação de borracha | Vedação | Sim |
| MG006 | Roda de borracha maciça | Rodas e roldanas | Sim |
| MG007 | Roldanas de borracha | Rodas e roldanas | Pendente |
| MG008 | Tarugos de borracha | Tarugos e perfis | Pendente |
| MG009 | Acoplamentos de borracha | Acoplamentos | Pendente |
| MG010 | Diafragmas de borracha | Vedação | Pendente |
| MG011 | Ponteiras de borracha | Ponteiras e proteção | Pendente |
| MG012 | Juntas de vedação | Vedação | Pendente |
| MG013 | Trefilados e perfis de borracha | Tarugos e perfis | Pendente |
| MG014 | Peças técnicas de borracha sob medida | Peças sob medida | Pendente |
| MG015 | Revestimentos de borracha | Revestimentos | Pendente |

## C. Páginas concluídas

**Concluído localmente:** `/`, `/produtos`, `/produtos/[slug]`, `/categorias`, `/categorias/[slug]`, `/sob-medida`, `/sobre`, `/contato`, `/orcamento`, `/privacidade`, `/offline`, 404, `/admin/login` e rotas do painel.

## D. Painel administrativo

**Implementado, ainda sem teste autenticado:** autenticação, gestão de produtos e estados, ações em massa, categorias, seleção de imagem de categoria, upload/ordem/imagem principal de produtos, banners com fotos de produtos publicados, upload e vínculo de PDFs técnicos, configurações do site e seleção de até quatro fotos para a capa. A exclusão de categoria com produtos vinculados é recusada; produtos publicados devem permanecer em categorias ativas. A remoção de produto só limpa os arquivos após confirmar a exclusão do registro. Sem usuário administrador disponível, o CRUD e upload não puderam ser homologados com persistência real. O endpoint de dados do painel respondeu HTTP 401 sem sessão, como esperado. **Pendente:** criar um administrador em Supabase Auth e `admin_profiles` para testar operações reais. O painel ainda não permite enviar uma arte independente para banner, e solicitações abertas no WhatsApp não são registradas no backend.

## E. Banco e segurança

**Aplicado no projeto Supabase:** migrações PostgreSQL `001_init.sql` e `002_content.sql`, índices, constraints, RLS e buckets privados de imagens e PDFs. A tabela `product_attributes` está preparada; a edição de dados técnicos ainda usa o JSON existente. As políticas RLS limitam a leitura pública a produtos `published` e às imagens vinculadas a eles. A consulta anônima retornou os 15 produtos publicados e seis imagens acessíveis. **Pendente:** criar usuário em Supabase Auth, vinculá-lo a `admin_profiles` e homologar login/CRUD/upload.

## F. Testes executados

**Aprovados nesta auditoria:** `npm test` (10 testes), sintaxe de servidor e scripts, consulta pública ao Supabase (15 publicados), `scripts/check-local.mjs` e `scripts/verify-public.mjs http://localhost:4317` (`15` produtos, `10` categorias, `15` páginas individuais, `6` fotos HTTP 200, `9` marcadores de imagem pendente e links de orçamento). A entrada da função de hospedagem respondeu HTTP 200 para Home e catálogo e 401 para API administrativa sem sessão no teste local. Manifesto, ícones, service worker, robots e sitemap responderam HTTP 200. No navegador, busca por `MG015` retornou um produto, “Ver mais” exibiu todos os 15, e adicionar/remover um produto da lista atualizou a quantidade corretamente. Menu móvel, imagem e link de orçamento da página individual foram conferidos. Home, catálogo, categorias, produto, sob medida e lista de orçamento foram medidos em 320, 390, 768 e 1440 px sem rolagem horizontal, títulos cortados ou imagens quebradas. O teste automatizado do service worker cobre cache público e recuperação offline. **Não testado:** instalação real em Android/iPhone, CRUD/upload autenticado, recebimento da mensagem no WhatsApp, build da Vercel e hospedagem pública.

## G. Pendências reais

Criar administrador; revisar informações comerciais; obter fotos individuais dos nove sem imagem e substituir os seis recortes quando possível; homologar login/CRUD/upload no Supabase; testar a instalação PWA em aparelhos reais; upload independente de banners; editor para `product_attributes`; medir desempenho em produção. O catálogo atual não contém mangueiras industriais nem placas como linha própria; não foram inventados produtos ou categorias. O plano Hobby gratuito da Vercel [restringe o uso a projetos pessoais não comerciais](https://vercel.com/docs/plans/hobby), portanto não é uma opção autorizada para publicar o site comercial sem custo. A marca oficial transparente está aplicada no projeto e é idêntica, byte por byte, ao PNG mais recente enviado. A composição da hero é ilustrativa e segue a referência aprovada; os cards de categorias usam imagens reais vinculadas quando disponíveis.

## H. Configurações necessárias

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `PUBLIC_SITE_URL` estão no `.env` local. A chave secreta foi retirada do `.env` após a importação. A configuração do usuário autorizado em `admin_profiles` foi adiada a pedido do usuário.

## I. Execução local

Node.js 24+, executar `npm run dev`, abrir `http://localhost:4317`. Detalhes em `README.md`.

## J. Status de homologação

**Atualização em 16/10/2026:** após a auditoria local, o proprietário solicitou o deploy no projeto Vercel vinculado. A produção está em `https://mg-borrachas.vercel.app`, deployment `dpl_EsLV5Sw3G6xk9Fy16x4g1tzLzxwu`, com status Ready. A verificação pública confirmou 15 produtos, 10 categorias, 6 fotos HTTP 200, 9 marcadores de foto pendente e links de orçamento. O plano vinculado é Hobby, restrito pelos termos da Vercel a uso pessoal ou não comercial; a migração para um plano compatível continua pendente para uso comercial. O painel autenticado aguarda um usuário em `admin_profiles`. A instalação PWA em celular real continua pendente.
