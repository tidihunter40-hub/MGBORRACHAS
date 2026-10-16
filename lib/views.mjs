import { defaultSettings, normalize, slugify } from './catalog.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const siteUrl = () => (process.env.PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 4317}`).replace(/\/$/, '');
const wa = (settings, message = 'Olá! Vim pelo site da MG Borrachas e gostaria de solicitar um orçamento.') => `https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
const contactQuoteMessage = 'Olá, MG Borrachas! Visitei o site e gostaria de solicitar informações e um orçamento.';
const floatingQuoteMessage = 'Olá, MG Borrachas! Gostaria de falar com a equipe comercial.';
const productQuote = product => `Olá! Vim pelo site da MG Borrachas e gostaria de solicitar um orçamento para o produto ${product.name}, referência ${product.sku}.`;
const phone = settings => { const digits = String(settings.whatsapp).replace(/\D/g, ''); return digits.startsWith('55') && digits.length === 13 ? `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}` : `+${digits}`; };
const instagramHandle = settings => { try { return `@${new URL(settings.instagram).pathname.split('/').filter(Boolean)[0] || 'Instagram'}`; } catch { return 'Instagram'; } };
const socialIcon = (name, className = '') => `<img class="${className}" src="/assets/icons/${name}.svg" width="24" height="24" alt="" aria-hidden="true">`;

export function brand(href = '/') {
  const label = href === '/admin' ? 'MG Borrachas — painel administrativo' : 'MG Borrachas — página inicial';
  return `<a class="brand" href="${href}" aria-label="${label}"><img class="brand-art" src="/assets/brand/marca-mg-oficial-transparente.png" alt="MG Borrachas" width="1942" height="809" decoding="async"></a>`;
}

function header(path, settings) {
  const links = [['/', 'Início'], ['/produtos', 'Produtos'], ['/categorias', 'Categorias'], ['/sob-medida', 'Sob medida'], ['/sobre', 'Sobre nós'], ['/contato', 'Contato']];
  return `<header class="site-header" id="top"><div class="header-inner container">
    ${brand()}
    <nav class="desktop-nav" aria-label="Navegação principal">${links.map(([href, label]) => `<a href="${href}" ${path === href || (href !== '/' && path.startsWith(href + '/')) ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <div class="header-actions"><form class="header-search-form" action="/produtos" role="search"><label class="sr-only" for="header-search">Buscar produtos</label><input id="header-search" name="q" type="search" placeholder="Buscar produtos..." autocomplete="off"><button type="submit" aria-label="Buscar produtos">⌕</button></form><a class="header-search-mobile" href="/produtos" aria-label="Buscar produtos">⌕</a><a class="quote-link" href="/orcamento" aria-label="Minha lista de orçamento"><span class="cart-icon" aria-hidden="true">▤</span><span class="quote-count" data-quote-count>0</span><span class="quote-label">Meu<br>Orçamento</span></a><a class="btn btn-primary header-cta" href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer"><span class="wa-icon" aria-hidden="true"><span class="wa-glyph"></span></span><span>Solicitar<br>orçamento</span></a><a class="mobile-whatsapp" href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer" aria-label="Solicitar orçamento pelo WhatsApp"><span class="wa-glyph" aria-hidden="true"></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Abrir menu">☰</button></div>
    </div><nav id="mobile-menu" class="mobile-menu" aria-label="Navegação móvel" hidden>${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}<a href="/orcamento">Minha lista de orçamento</a><a href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer">Conversar no WhatsApp</a></nav></header>`;
}

function floatingWhatsapp(settings) {
  return `<a class="floating-whatsapp" href="${esc(wa(settings, floatingQuoteMessage))}" target="_blank" rel="noopener noreferrer" aria-label="Fale com nossa equipe pelo WhatsApp"><span class="floating-whatsapp__icon">${socialIcon('whatsapp')}</span><span class="floating-whatsapp__text">Fale com nossa equipe</span><span class="floating-whatsapp__arrow" aria-hidden="true">→</span></a>`;
}

function footer(settings, categories, path) {
  return `<footer class="site-footer"><div class="container footer-grid"><div>${brand()}<p>Soluções em borracha para aplicações industriais, manutenção e peças técnicas.</p>${path === '/sobre' ? '<a class="about-footer-quote" href="/sob-medida">Solicitar orçamento <span aria-hidden="true">→</span></a>' : ''}<button class="pwa-link" type="button" data-pwa-install hidden>Instalar aplicativo</button><button class="pwa-link" type="button" data-pwa-ios hidden>Como instalar no iPhone</button><p class="pwa-ios-help" data-pwa-ios-help hidden>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div><div><h2>Navegação</h2><a href="/">Início</a><a href="/produtos">Produtos</a><a href="/categorias">Categorias</a><a href="/sobre" ${path === '/sobre' ? 'aria-current="page"' : ''}>Sobre nós</a><a href="/contato" ${path === '/contato' ? 'aria-current="page"' : ''}>Contato</a></div><div><h2>Categorias</h2>${categories.slice(0, 5).map(c => `<a href="/categorias/${esc(c.slug)}">${esc(c.name)}</a>`).join('')}</div><div><h2>Atendimento</h2><a href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer">WhatsApp: ${esc(phone(settings))} ↗</a><a href="${esc(settings.instagram)}" target="_blank" rel="noopener noreferrer">${esc(instagramHandle(settings))} ↗</a><span>Salvador — BA</span><a href="/privacidade">Política de privacidade</a></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} MG Borrachas. Todos os direitos reservados.</span><a href="/privacidade">Política de privacidade</a></div></footer>`;
}

export function layout({ title, description, path, body, settings, categories = [], noIndex = false, structuredData }) {
  const canonical = `${siteUrl()}${path}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080a0d"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="${noIndex ? 'noindex,nofollow' : 'index,follow'}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(siteUrl())}/assets/brand/marca-mg-oficial-transparente.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/pwa/icon-192.png" type="image/png"><link rel="apple-touch-icon" href="/assets/pwa/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/header.css">${path === '/' ? '<link rel="stylesheet" href="/reference-home.css">' : ''}${path === '/' ? '' : '<link rel="stylesheet" href="/polish.css?v=4">'}${path === '/produtos' || path.startsWith('/categorias/') ? '<link rel="stylesheet" href="/catalog.css?v=1">' : ''}${path === '/categorias' ? '<link rel="stylesheet" href="/categories.css?v=1">' : ''}${path === '/sob-medida' ? '<link rel="stylesheet" href="/custom-page.css?v=4">' : ''}${path === '/sobre' ? '<link rel="stylesheet" href="/about-page.css?v=1">' : ''}${path === '/contato' ? '<link rel="stylesheet" href="/contact-page.css?v=1">' : ''}${path === '/orcamento' ? '<link rel="stylesheet" href="/quote-page.css?v=1">' : ''}<link rel="stylesheet" href="/floating-whatsapp.css?v=1"><link rel="stylesheet" href="/typography.css?v=1">${structuredData ? `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>` : ''}</head><body class="readable-site" data-whatsapp="${esc(settings.whatsapp)}">${header(path, settings)}<main id="main">${body}</main>${footer(settings, categories, path)}${floatingWhatsapp(settings)}<aside class="pwa-update" data-pwa-update hidden role="status"><span>Uma nova versão do site está disponível.</span><button type="button">Atualizar agora</button></aside><script src="/site.js" defer></script>${path === '/sob-medida' ? '<script type="module" src="/custom-page.js"></script>' : ''}${path === '/sobre' ? '<script type="module" src="/about-page.js"></script>' : ''}<script src="/pwa.js" defer></script></body></html>`;
}

export function offlinePage() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080a0d"><meta name="robots" content="noindex,nofollow"><title>Sem conexão | MG Borrachas</title><link rel="icon" href="/assets/pwa/icon-192.png"><style>*,*::before,*::after{box-sizing:border-box}body{min-height:100dvh;margin:0;display:grid;place-items:center;background:#080a0d;color:#fff;font-family:Arial,sans-serif;padding:24px}.offline{max-width:560px;text-align:center}.offline img{display:block;width:min(340px,85%);height:auto;margin:0 auto 48px}.offline small{color:#ffcb05;font-weight:800;letter-spacing:.16em}.offline h1{font-size:clamp(2rem,7vw,3.6rem);line-height:1.05;margin:16px 0}.offline p{color:#c2c7ce;line-height:1.6}.offline button{background:#ffcb05;border:0;border-radius:6px;color:#080a0d;font:800 1rem Arial,sans-serif;padding:15px 26px;margin-top:20px;cursor:pointer}</style></head><body><main class="offline"><img src="/assets/brand/marca-mg-oficial-transparente.png" alt="MG Borrachas"><small>CATÁLOGO INDUSTRIAL</small><h1>VOCÊ ESTÁ SEM CONEXÃO.</h1><p>As páginas visitadas podem continuar disponíveis. Para consultar produtos novos ou enviar seu pedido pelo WhatsApp, conecte-se novamente.</p><button type="button" onclick="location.reload()">Tentar novamente</button></main></body></html>`;
}

export function crumb(items) {
  return `<nav class="crumb container" aria-label="Caminho da página"><a href="/">Início</a>${items.map(([href, label]) => `<span aria-hidden="true">/</span>${href ? `<a href="${esc(href)}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}`).join('')}</nav>`;
}

export function productCard(product, settings) {
  return `<article class="product-card" data-product-card data-search="${esc(normalize(`${product.name} ${product.sku} ${product.category} ${product.description}`))}" data-category="${esc(product.category_slug)}" data-custom="${product.custom ? 'true' : 'false'}" data-featured="${product.featured ? 'true' : 'false'}" data-order="${Number(product.sort_order) || 0}">
    <a href="/produtos/${esc(product.slug)}" class="product-visual" aria-label="Ver ${esc(product.name)}">${product.image ? `<img src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" decoding="async">` : `<span class="image-missing"><span class="missing-glyph" aria-hidden="true">◇</span><small>Fotografia ainda não disponível</small></span>`}<span class="visual-index">${esc(product.sku)}</span></a>
    <div class="product-info"><span class="eyebrow">${esc(product.category)}</span><h3><a href="/produtos/${esc(product.slug)}">${esc(product.name)}</a></h3><p>${esc(product.short_description)}</p><div class="card-actions"><a class="card-details" href="/produtos/${esc(product.slug)}">Ver detalhes <span aria-hidden="true">→</span></a><button type="button" class="add-quote" data-add-quote data-sku="${esc(product.sku)}" data-name="${esc(product.name)}">Adicionar ao orçamento <span aria-hidden="true">＋</span></button></div><a class="card-whatsapp" href="${esc(wa(settings, productQuote(product)))}" target="_blank" rel="noopener noreferrer">Solicitar orçamento pelo WhatsApp ↗</a></div></article>`;
}

function categoryVisual(category, sample) {
  const image = category.image_id ? `/media/${category.image_id}` : sample?.image;
  return image
    ? `<img src="${esc(image)}" alt="" loading="lazy">`
    : '<span class="category-photo-pending"><span aria-hidden="true">◇</span><small>Foto em breve</small></span>';
}

export function home(data) {
  const { products, categories, settings, preview, banners = [] } = data;
  const available = products.filter(p => p.image);
  const chosen = [...new Set(settings.hero_skus || [])].map(sku => available.find(p => p.sku === sku)).filter(Boolean);
  const heroImages = chosen.slice(0, 4).map((p, i) => `<a class="hero-picked hero-picked-${i + 1}" href="/produtos/${esc(p.slug)}" aria-label="Ver ${esc(p.name)}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></a>`).join('');
  const categoryOrder = ['amortecimento-e-vibracao', 'rodas-e-roldanas', 'vedacao', 'lencois-e-chapas', 'tarugos-e-perfis', 'acoplamentos', 'pecas-para-betoneiras', 'ponteiras-e-protecao'];
  const homeCategories = [...categories].sort((a, b) => (categoryOrder.indexOf(a.slug) < 0 ? 99 : categoryOrder.indexOf(a.slug)) - (categoryOrder.indexOf(b.slug) < 0 ? 99 : categoryOrder.indexOf(b.slug))).slice(0, 8);
  const categoryCards = homeCategories.map((c, i) => {
    const sample = products.find(p => p.category_slug === c.slug && p.image);
    return `<a class="category-card" href="/categorias/${esc(c.slug)}"><div class="category-image">${categoryVisual(c, sample)}</div><div class="category-copy"><h3>${esc(c.name)}</h3><span>Ver produtos <span aria-hidden="true">→</span></span></div></a>`;
  }).join('');
  const benefitIcons = {
    shield: '<path d="M12 2 4 5v6c0 5 3.1 8.5 8 11 4.9-2.5 8-6 8-11V5l-8-3Z"/><path d="m8 12 2.5 2.5L16 9"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.5 2.2 1.8.8 1.9-1.2 2.8 2.8-1.2 1.9.8 1.8L23 11v4l-2.2.5-.8 1.8 1.2 1.9-2.8 2.8-1.9-1.2-1.8.8L14 24h-4l-.5-2.2-1.8-.8-1.9 1.2L3 19.4l1.2-1.9-.8-1.8L1 15v-4l2.2-.5.8-1.8L2.8 6.8 5.6 4l1.9 1.2 1.8-.8L10 2Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7"/>',
    thermo: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 9v8"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>',
    truck: '<path d="M2 5h12v11H2zM14 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'
  };
  const benefits = [['shield', 'Linha técnica', 'para sua aplicação'], ['gear', 'Produtos', 'sob medida'], ['link', 'Soluções para', 'manutenção'], ['thermo', 'Vedação e', 'amortecimento'], ['layers', 'Diversas', 'categorias'], ['truck', 'Consulte', 'entrega e prazo']].map(([icon, line1, line2]) => `<div class="benefit"><svg viewBox="0 0 24 24" aria-hidden="true">${benefitIcons[icon]}</svg><span>${line1}<br>${line2}</span></div>`).join('');
  const heroTitle = !settings.hero_title || ['Soluções em borracha para sua indústria.', 'Artefatos de borracha direto da fábrica para sua empresa!'].includes(settings.hero_title) ? '<span class="hero-pre">ARTEFATOS DE</span><em class="hero-word">BORRACHA</em><span class="hero-tail">DIRETO DA FÁBRICA</span><span class="hero-end">PARA SUA EMPRESA!</span>' : esc(settings.hero_title);
  const heroDescription = !settings.hero_description || settings.hero_description === 'Peças técnicas, vedação, amortecimento, revestimentos e soluções sob medida para diferentes aplicações.' ? 'Qualidade, resistência e variedade em produtos de borracha para empresas, indústrias e diversos segmentos do mercado.' : settings.hero_description;
  const heroProof = [['gear', 'Qualidade', 'e confiança'], ['shield', 'Atendimento', 'especializado'], ['truck', 'Consulte entrega', 'e prazo']].map(([icon, first, second]) => `<div class="hero-proof-item"><svg viewBox="0 0 24 24" aria-hidden="true">${benefitIcons[icon]}</svg><span>${first}<br>${second}</span></div>`).join('');
  const bannerMarkup = banners.filter(b => b.is_active).map(b => `<section class="site-banner"><div class="container site-banner-inner"><div><span class="eyebrow accent">MG BORRACHAS / EM DESTAQUE</span><h2>${esc(b.title)}</h2>${b.description ? `<p>${esc(b.description)}</p>` : ''}${b.cta_label && /^\/(?!\/)[a-z0-9/-]*$/.test(b.cta_href || '') ? `<a class="btn btn-primary" href="${esc(b.cta_href)}">${esc(b.cta_label)} ↗</a>` : ''}</div>${b.image_id ? `<img src="/media/${esc(b.image_id)}" alt="" loading="lazy">` : ''}</div></section>`).join('');
  const body = `<section class="hero reference-hero"><img class="hero-backdrop" src="/assets/brand/hero-borracha-fabrica.png" alt="" fetchpriority="high"><div class="hero-shade"></div><div class="container hero-stage"><div class="hero-copy"><div class="tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18V9l-5 3V9l-5 3V4H7v11H3zM7 4V2h4v2M3 16h18M8 18h2m3 0h2m3 0h2"/></svg> FÁBRICA DE ARTEFATOS DE BORRACHA</div><h1>${heroTitle}</h1><p>${esc(heroDescription)}</p><div class="hero-actions"><a class="btn btn-primary" href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◉</span> Solicitar orçamento <span aria-hidden="true">→</span></a><a class="btn btn-outline" href="/produtos"><span aria-hidden="true">⬡</span> Conhecer produtos <span aria-hidden="true">→</span></a></div></div><div class="hero-proof" aria-label="Diferenciais de atendimento">${heroProof}</div>${heroImages ? `<div class="hero-selected-products">${heroImages}</div>` : ''}</div><div class="hero-benefits"><div class="container hero-benefits-inner">${benefits}</div></div></section>
  <section class="section categories-section"><div class="container"><div class="section-top"><div><span class="category-pill">NOSSAS CATEGORIAS <span aria-hidden="true">➜</span></span><h2>ENCONTRE A <span>SOLUÇÃO IDEAL</span></h2></div><div class="section-side"><p>Uma linha de produtos e componentes em borracha para diferentes aplicações.</p><a class="btn btn-primary" href="/categorias">Ver todas as categorias <span aria-hidden="true">➜</span></a></div></div><div class="category-rail-wrap"><button class="rail-arrow" type="button" data-category-prev aria-label="Categorias anteriores">‹</button><div class="category-grid category-rail" data-category-rail>${categoryCards}</div><button class="rail-arrow" type="button" data-category-next aria-label="Próximas categorias">›</button></div></div></section>
  ${bannerMarkup}<section class="custom-band"><div class="container custom-band-grid"><div><h2>PEÇAS <em>SOB MEDIDA</em></h2><p>TEMOS A SOLUÇÃO PARA<br>A SUA NECESSIDADE.</p></div><ul><li>Consulte peças conforme seu projeto</li><li>Diversos materiais e medidas</li><li>Atendimento especializado</li><li>Qualidade e confiabilidade</li></ul><a class="btn btn-primary" href="/sob-medida"><span aria-hidden="true">◉</span> Solicitar peça<br>sob medida <span aria-hidden="true">➜</span></a></div></section>
  <section class="section featured-section"><div class="container"><div class="section-top"><div><span class="eyebrow accent">PRODUTOS EM DESTAQUE</span><h2>PRODUTOS DO <span>CATÁLOGO.</span></h2></div><div class="section-side"><p>Conheça produtos publicados e consulte a equipe para detalhes e disponibilidade.</p><a class="text-link" href="/produtos">Ver catálogo completo ↗</a></div></div><div class="product-grid">${[...products].sort((a,b) => Number(b.featured) - Number(a.featured) || Number(b.image != null) - Number(a.image != null) || a.sort_order - b.sort_order).slice(0, 6).map(product => productCard(product, settings)).join('')}</div></div></section>
  <section class="section home-about"><div class="container home-about-grid"><div><span class="eyebrow accent">SOBRE A MG BORRACHAS</span><h2>SOLUÇÕES EM BORRACHA PARA <span>DIFERENTES APLICAÇÕES.</span></h2><p>${esc(settings.about_text)}</p><a class="text-link" href="/sobre">Conheça a MG Borrachas ↗</a></div><div class="home-about-visual"><img src="${esc(available[0]?.image || '/assets/brand/marca-mg-oficial-transparente.png')}" alt="${esc(available[0] ? `Produto do catálogo: ${available[0].name}` : 'Marca MG Borrachas')}" loading="lazy"><span>PEÇAS TÉCNICAS · VEDAÇÃO · REVESTIMENTOS</span></div></div></section>
  <section class="section reasons-section"><div class="container"><div class="section-top"><div><span class="eyebrow accent">04 / MG BORRACHAS</span><h2>UMA LINHA PARA <span>DIFERENTES DESAFIOS.</span></h2></div></div><div class="reasons-grid">${[['01','Soluções técnicas','Peças e componentes para aplicações industriais.'],['02','Variedade de aplicações','Produtos para manutenção, vedação, amortecimento e proteção.'],['03','Atendimento comercial','Converse com a equipe para encontrar a opção adequada.'],['04','Peças sob medida','Consulte possibilidades para seu projeto e suas medidas.']].map(([n,h,p]) => `<div class="reason"><span>${n}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}</div></div></section>
  <section class="closing-cta"><div class="container"><span class="eyebrow">ORÇAMENTO PERSONALIZADO</span><h2>PRECISA DE UMA PEÇA OU SOLUÇÃO ESPECÍFICA?</h2><p>Entre em contato com nossa equipe e consulte as opções disponíveis para sua necessidade.</p><div><a class="btn btn-primary" href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer">Solicitar orçamento pelo WhatsApp ↗</a><a class="btn btn-outline" href="/produtos">Explorar catálogo ↗</a></div></div></section>`;
  const seoTitle = settings.seo_title === 'MG Borrachas | Peças e Soluções em Borracha Industrial' ? 'MG Borrachas | Artefatos de Borracha Direto da Fábrica' : settings.seo_title;
  const seoDescription = settings.seo_description === 'Conheça a MG Borrachas. Produtos de borracha, vedação, coxins, rodas, lençóis, componentes industriais e soluções sob medida. Solicite orçamento.' ? 'Conheça os artefatos de borracha da MG Borrachas para empresas, indústrias e diferentes aplicações. Explore o catálogo e solicite orçamento.' : settings.seo_description;
  return layout({ title: seoTitle, description: seoDescription, path: '/', body, settings, categories, structuredData: { '@context': 'https://schema.org', '@type': 'Organization', name: 'MG Borrachas', url: siteUrl(), sameAs: [settings.instagram], contactPoint: { '@type': 'ContactPoint', telephone: phone(settings), contactType: 'sales' } } });
}

export function catalog(data, selectedCategory = '') {
  const { products, categories, settings, preview } = data;
  const title = selectedCategory ? categories.find(c => c.slug === selectedCategory)?.name : 'Catálogo de produtos';
  if (!title) return notFound(data);
  const visible = products;
  const initialCount = selectedCategory ? products.filter(p => p.category_slug === selectedCategory).length : products.length;
  const headline = selectedCategory
    ? esc(title.toUpperCase())
    : 'CATÁLOGO DE <span>PRODUTOS</span>';
  const filters = categories.map(c => `<label class="catalog-category"><input type="radio" name="category" value="${esc(c.slug)}" ${selectedCategory === c.slug ? 'checked' : ''}><span class="category-mark" aria-hidden="true">▣</span><span>${esc(c.name)}</span><small>${c.count}</small></label>`).join('');
  const body = `<section class="catalog-hero" aria-labelledby="catalog-title"><div class="catalog-hero__shade"></div><div class="catalog-hero__angle" aria-hidden="true"></div><div class="catalog-wide catalog-hero__inner"><nav class="catalog-breadcrumb" aria-label="Caminho da página"><a href="/">Início</a><span aria-hidden="true">/</span>${selectedCategory ? `<a href="/produtos">Produtos</a><span aria-hidden="true">/</span><span aria-current="page">${esc(title)}</span>` : '<span aria-current="page">Produtos</span>'}</nav><div class="catalog-hero__copy"><span class="catalog-hero__eyebrow">CATÁLOGO COMPLETO</span><h1 id="catalog-title">${headline}</h1><p>Soluções em borracha para diversos segmentos e aplicações.<br>Encontre o produto ideal para a sua necessidade.</p></div></div></section>
  <section class="catalog-wide catalog-layout" data-catalog><aside class="filters" id="filters" aria-label="Filtros do catálogo"><div class="filter-title"><h2>Buscar produto</h2></div><label class="catalog-search"><span class="sr-only">Digite o nome, código ou palavra-chave</span><input type="search" data-search-input placeholder="Nome, código ou palavra-chave..." autocomplete="off"><span aria-hidden="true">⌕</span></label><fieldset><legend>Categorias</legend><label class="catalog-category"><input type="radio" name="category" value="" ${selectedCategory ? '' : 'checked'}><span class="category-mark" aria-hidden="true">▦</span><span>Todas as categorias</span><small>${products.length}</small></label>${filters}</fieldset><fieldset class="catalog-options"><legend>Tipo de produto</legend><label class="check"><input type="checkbox" data-custom-only> Apenas produtos sob medida</label></fieldset><button class="catalog-clear" type="button" data-clear-filters>Limpar filtros</button></aside><div class="catalog-main"><div class="catalog-toolbar"><button type="button" class="filter-toggle" aria-controls="filters" aria-expanded="false">☷ <span>Filtros</span></button><strong data-result-count>${initialCount} ${initialCount === 1 ? 'resultado' : 'resultados'}</strong><div class="catalog-toolbar__controls"><label>Ordenar por: <select data-sort><option value="featured">Mais relevantes</option><option value="recent">Mais recentes</option><option value="az">Nome: A–Z</option><option value="za">Nome: Z–A</option></select></label><div class="catalog-view" role="group" aria-label="Visualização dos produtos"><button type="button" data-view="grid" aria-label="Visualização em grade" aria-pressed="true">▦</button><button type="button" data-view="list" aria-label="Visualização em lista" aria-pressed="false">☷</button></div></div></div><div class="product-grid catalog-grid" data-product-grid>${visible.map(product => productCard(product, settings)).join('')}</div><div class="empty-state" data-empty-state hidden><span aria-hidden="true">⌕</span><h2>Nenhum produto encontrado</h2><p>Tente outro termo ou remova os filtros.</p><button class="btn btn-primary" type="button" data-clear-filters>Limpar filtros</button></div><button class="btn btn-light load-more" type="button" data-load-more hidden>Ver mais produtos ↓</button>${preview ? '<p class="catalog-preview-note">Prévia local: medidas e disponibilidade devem ser confirmadas com a equipe.</p>' : ''}</div></section>`;
  return layout({ title: `${title} | MG Borrachas`, description: `Explore ${title.toLowerCase()} no catálogo da MG Borrachas. Solicite orçamento pelo WhatsApp.`, path: selectedCategory ? `/categorias/${selectedCategory}` : '/produtos', body, settings, categories });
}

export function categoriesPage(data) {
  const { categories, products, settings } = data;
  const cards = categories.map(c => {
    const sample = products.find(p => p.category_slug === c.slug && p.image);
    const referencePanel = {
      'tarugos-e-perfis': 'tarugos',
      acoplamentos: 'acoplamentos',
      'pecas-sob-medida': 'sob-medida',
      revestimentos: 'revestimentos'
    }[c.slug];
    const image = c.image_id ? `/media/${c.image_id}` : sample?.image;
    const imageClass = !image && referencePanel ? ` category-directory__image--reference category-directory__image--${referencePanel}` : '';
    const visual = image
      ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">`
      : referencePanel
        ? '<span class="category-directory__reference" aria-hidden="true"></span>'
        : '<span class="category-directory__pending">Fotografia da linha<br>em atualização</span>';
    return `<a class="category-directory__card" href="/categorias/${esc(c.slug)}" aria-label="Ver ${c.count} ${c.count === 1 ? 'produto' : 'produtos'} em ${esc(c.name)}"><div class="category-directory__image${imageClass}">${visual}</div><div class="category-directory__copy"><h2>${esc(c.name)}</h2><span class="category-directory__count">${c.count} ${c.count === 1 ? 'produto' : 'produtos'}</span><span class="category-directory__arrow" aria-hidden="true">→</span></div></a>`;
  }).join('');
  const body = `${crumb([[null, 'Categorias']])}<section class="category-directory"><div class="container"><header class="category-directory__heading"><span class="category-directory__eyebrow">NOSSAS LINHAS DE PRODUTOS</span><h1>NOSSAS LINHAS DE <span>PRODUTOS</span></h1><p>Soluções em borracha para diferentes aplicações industriais.</p></header><div class="category-directory__grid">${cards}</div></div></section>`;
  return layout({ title: 'Categorias | MG Borrachas', description: 'Conheça as categorias de produtos de borracha da MG Borrachas.', path: '/categorias', body, settings, categories });
}

export function productPage(data, slug) {
  const { products, categories, settings } = data;
  const p = products.find(product => product.slug === slug);
  if (!p) return notFound(data);
  const related = products.filter(item => item.sku !== p.sku && item.category_slug === p.category_slug).slice(0, 3);
  const images = p.images?.length ? p.images : p.image ? [p.image] : [];
  const body = `${crumb([['/produtos', 'Produtos'], [`/categorias/${p.category_slug}`, p.category], [null, p.name]])}<section class="container product-detail"><div class="detail-gallery"><div class="detail-main-image">${images.length ? `<button class="detail-zoom-trigger" type="button" data-image-zoom aria-label="Ampliar imagem de ${esc(p.name)}"><img src="${esc(images[0])}" alt="${esc(p.name)}" fetchpriority="high" data-main-image><span>Ampliar imagem ⤢</span></button>` : `<div class="image-missing large"><span class="missing-glyph" aria-hidden="true">◇</span><strong>Fotografia ainda não disponível</strong></div>`}</div>${images.length > 1 ? `<div class="detail-thumbs">${images.map((image, i) => `<button type="button" data-gallery-src="${esc(image)}" aria-label="Ver imagem ${i + 1}"><img src="${esc(image)}" alt=""></button>`).join('')}</div>` : ''}<small>${esc(p.image_note)}</small>${images.length ? `<dialog class="image-zoom" data-image-zoom-dialog><button type="button" data-image-zoom-close aria-label="Fechar imagem ampliada">×</button><img src="${esc(images[0])}" alt="${esc(p.name)}" data-image-zoom-preview></dialog>` : ''}</div><div class="detail-content"><span class="eyebrow accent">${esc(p.category)} / ${esc(p.sku)}</span><h1>${esc(p.name)}</h1><p class="detail-lead">${esc(p.description)}</p><div class="detail-rule"></div><div class="detail-meta"><span>CÓDIGO</span><strong>${esc(p.sku)}</strong></div><div class="detail-meta"><span>CONDIÇÃO COMERCIAL</span><strong>Preço sob consulta</strong></div>${p.applications ? `<div class="feature-list"><h2>Aplicações informadas</h2><p>${esc(p.applications)}</p></div>` : ''}${p.features?.length ? `<div class="feature-list"><h2>Características divulgadas</h2><ul>${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}${p.technical && Object.keys(p.technical).length ? `<div class="feature-list"><h2>Dados técnicos</h2><dl>${Object.entries(p.technical).filter(([,v]) => v).map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>` : ''}${p.documents?.length ? `<div class="feature-list"><h2>Documentos técnicos</h2><ul>${p.documents.map(d => `<li><a href="${esc(d.href)}" target="_blank" rel="noopener noreferrer">${esc(d.title)} (PDF) ↗</a></li>`).join('')}</ul></div>` : ''}<div class="detail-form"><label>Quantidade de interesse <input type="number" min="1" max="99999" value="1" data-detail-qty></label><label>Medidas ou observações <textarea rows="3" placeholder="Informe medidas, modelo ou aplicação" data-detail-note></textarea></label><div class="detail-buttons"><button class="btn btn-primary" type="button" data-detail-add data-sku="${esc(p.sku)}" data-name="${esc(p.name)}">Adicionar à lista ↗</button><a class="btn btn-outline-dark" href="${esc(wa(settings, productQuote(p)))}" data-detail-whatsapp data-sku="${esc(p.sku)}" data-name="${esc(p.name)}" target="_blank" rel="noopener noreferrer">Solicitar pelo WhatsApp</a></div></div><p class="detail-disclaimer">Confirme medidas, aplicação e disponibilidade com a equipe comercial antes da compra.</p></div></section><section class="detail-custom"><div class="container"><div><span class="eyebrow">PEÇA ESPECÍFICA?</span><h2>PRECISA DE UMA MEDIDA DIFERENTE?</h2><p>Envie seu desenho, amostra ou especificação para avaliação.</p></div><a class="btn btn-primary" href="/sob-medida">Consultar sob medida ↗</a></div></section>${related.length ? `<section class="section container related"><div class="section-top"><div><span class="eyebrow accent">CONTINUE EXPLORANDO</span><h2>PRODUTOS <span>RELACIONADOS.</span></h2></div></div><div class="product-grid">${related.map(product => productCard(product, settings)).join('')}</div></section>` : ''}`;
  return layout({ title: `${p.name} | MG Borrachas`, description: p.short_description, path: `/produtos/${slug}`, body, settings, categories, structuredData: { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, description: p.description, image: images.map(image => `${siteUrl()}${image}`), brand: { '@type': 'Brand', name: 'MG Borrachas' } } });
}

export function quotePage(data) {
  const { settings, categories, products } = data;
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    document: icon('<path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v5h5M8 11h8M8 15h7M8 19h4"/>'),
    box: icon('<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10"/>'),
    shield: icon('<path d="M12 2 4 5v6c0 5 3.4 8.8 8 11 4.6-2.2 8-6V5l-8-3Z"/><path d="m8.5 12 2.4 2.4 4.7-4.8"/>'),
    gear: icon('<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .2.2-1.9 3.3-2.3-.6a8 8 0 0 1-1.8 1l-.6 2.3H9.2l-.6-2.3a8 8 0 0 1-1.8-1l-2.3.6-1.9-3.3 1.7-1.7a8 8 0 0 1 0-2l-1.7-1.7 1.9-3.3 2.3.6a8 8 0 0 1 1.8-1l.6-2.3h3.8l.6 2.3a8 8 0 0 1 1.8 1l2.3-.6 1.9 3.3-1.7 1.7a8 8 0 0 1 0 2Z"/>'),
    truck: icon('<path d="M2 6h12v11H2zM14 10h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'),
    headset: icon('<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 14h3v5H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 1-2Zm16 0h-3v5h2a2 2 0 0 0 2-2v-1a2 2 0 0 1 1-2ZM17 19c-.8 1.5-2.4 2-5 2"/>'),
    trash: icon('<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>')
  };
  const benefits = [
    ['shield', 'Atendimento rápido', 'Solicite seu orçamento pelo WhatsApp.'],
    ['gear', 'Produtos sob medida', 'Soluções conforme sua necessidade.'],
    ['truck', 'Entrega facilitada', 'Consulte condições para sua região.'],
    ['headset', 'Suporte especializado', 'Nossa equipe pronta para atender.']
  ].map(([name, title, description]) => `<div class="quote-benefit"><span class="quote-benefit__icon">${icons[name]}</span><div><strong>${title}</strong><p>${description}</p></div></div>`).join('');
  const catalog = Object.fromEntries(products.map(product => [product.sku, { name: product.name, category: product.category, image: product.image || '' }]));
  const body = `<section class="quote-hero" aria-labelledby="quote-title"><img class="quote-hero__image" src="/assets/brand/hero-contato.webp" alt="" fetchpriority="high"><div class="quote-hero__shade"></div><div class="quote-hero__diagonal" aria-hidden="true"></div><div class="container quote-hero__inner"><nav class="quote-breadcrumb" aria-label="Caminho da página"><a href="/">Início</a><span aria-hidden="true">/</span><span aria-current="page">Orçamento</span></nav><div class="quote-hero__copy"><span class="quote-hero__eyebrow">SEU PEDIDO</span><h1 id="quote-title">LISTA DE <span>ORÇAMENTO</span></h1><p>Organize os produtos, quantidades e medidas. A solicitação será preparada para envio pelo WhatsApp.</p></div></div></section><section class="quote-main"><div class="container quote-layout"><div class="quote-left"><div data-quote-items aria-live="polite"></div><div class="quote-benefits" aria-label="Benefícios do atendimento">${benefits}</div></div><aside class="quote-summary" aria-labelledby="quote-summary-title"><div class="quote-summary__top"><span class="eyebrow">RESUMO</span>${icons.document}</div><h2 id="quote-summary-title">Pronto para consultar?</h2><p>Revise os itens antes de abrir o WhatsApp. O envio só será concluído quando você confirmar a mensagem no aplicativo.</p><div class="quote-total"><span>${icons.box} Itens na lista</span><strong data-quote-total>0</strong></div><div class="quote-summary__actions"><button class="btn btn-primary full" type="button" data-send-quote disabled><span class="quote-wa-glyph" aria-hidden="true"></span><span>SOLICITAR PELO WHATSAPP</span><span aria-hidden="true">→</span></button><button class="quote-clear" type="button" data-clear-quote disabled>${icons.trash}<span>LIMPAR LISTA</span></button></div><a class="quote-continue" href="/produtos">← CONTINUAR EXPLORANDO</a></aside><dialog class="quote-clear-dialog" data-clear-dialog aria-labelledby="quote-clear-title"><div class="quote-clear-dialog__icon">${icons.trash}</div><h2 id="quote-clear-title">Limpar sua lista de orçamento?</h2><p>Isso remove apenas os itens que você adicionou à lista neste navegador. Os produtos do catálogo continuarão disponíveis.</p><div class="quote-clear-dialog__actions"><button type="button" data-clear-cancel>Cancelar</button><button type="button" data-clear-confirm>Sim, limpar minha lista</button></div></dialog></div></section><script type="application/json" id="quote-catalog">${JSON.stringify(catalog).replace(/</g, '\\u003c')}</script>`;
  return layout({ title: 'Lista de orçamento | MG Borrachas', description: 'Prepare sua lista de produtos e solicite um orçamento à MG Borrachas pelo WhatsApp.', path: '/orcamento', body, settings, categories, noIndex: true });
}

export function customPage(data) {
  const { settings, categories } = data;
  const icon = (paths, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    gear: icon('<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .2.2-1.9 3.3-2.3-.6a8 8 0 0 1-1.8 1l-.6 2.3H9.2l-.6-2.3a8 8 0 0 1-1.8-1l-2.3.6-1.9-3.3 1.7-1.7a8 8 0 0 1 0-2l-1.7-1.7 1.9-3.3 2.3.6a8 8 0 0 1 1.8-1l.6-2.3h3.8l.6 2.3a8 8 0 0 1 1.8 1l2.3-.6 1.9 3.3-1.7 1.7a8 8 0 0 1 0 2Z"/>'),
    shield: icon('<path d="M12 2 4 5v6c0 5 3.4 8.8 8 11 4.6-2.2 8-6 8-11V5l-8-3Z"/><path d="m8.5 12 2.4 2.4 4.7-4.8"/>'),
    headset: icon('<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><path d="M4 14h3v5H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 1-2Zm16 0h-3v5h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-1-2ZM17 19c-.8 1.5-2.4 2-5 2"/>'),
    file: icon('<path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h5M8 12h7M8 16h7M8 20h5"/>'),
    message: icon('<path d="M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h7"/>'),
    whatsapp: icon('<path d="M20 11.5a8 8 0 0 1-11.7 7.1L3 20l1.5-5A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.4 2.8 2 4.6 5 5.8l1.5-1.3 2 1c-.8 2.2-2.4 2.5-4.2 1.8-2.8-1-5.2-3.5-6.1-6.2-.5-1.7-.2-3.2 1.8-4l1 2-1 1.9Z"/>')
  };
  const benefits = [
    [icons.gear, 'Soluções sob medida'],
    [icons.shield, 'Qualidade e durabilidade'],
    [icons.headset, 'Atendimento especializado']
  ].map(([symbol, label]) => `<li>${symbol}<span>${label}</span></li>`).join('');
  const steps = [
    ['01', icons.file, 'Conte o que precisa', 'Informe a peça, medidas, quantidade e aplicação.'],
    ['02', icons.message, 'Prepare a consulta', 'Organizamos as informações para facilitar o atendimento.'],
    ['03', icons.file, 'Converse com a equipe', 'Nossa equipe analisa sua necessidade e apresenta as possibilidades para seu projeto.']
  ].map(([number, symbol, title, description]) => `<article class="bespoke-step"><strong class="bespoke-step__number">${number}</strong><span class="bespoke-step__icon">${symbol}</span><div><h3>${title}</h3><p>${description}</p></div></article>`).join('');
  const field = (name, label, input, required = false) => `<div class="bespoke-field"><label for="custom-${name}">${label}${required ? ' <span class="bespoke-required" aria-hidden="true">*</span>' : ''}</label>${input}<small class="bespoke-field__error" id="custom-${name}-error" aria-live="polite"></small></div>`;
  const body = `<section class="bespoke-hero" aria-labelledby="bespoke-title"><div class="bespoke-hero__art" aria-hidden="true"></div><div class="container bespoke-hero__inner"><div class="bespoke-hero__copy"><span class="bespoke-hero__eyebrow">SOLUÇÕES SOB MEDIDA</span><h1 id="bespoke-title"><span>SUA NECESSIDADE</span><span>NOSSA SOLUÇÃO.</span></h1><p>Descreva a peça e a aplicação. Nossa equipe avaliará sua necessidade e apresentará as melhores opções para o seu projeto.</p><ul class="bespoke-benefits">${benefits}</ul></div></div></section>
  <section class="bespoke-main"><div class="container bespoke-main__grid"><div class="bespoke-process"><h2>COMO FUNCIONA</h2><div class="bespoke-process__rule"></div><div class="bespoke-steps">${steps}</div></div>
  <form class="bespoke-form" data-custom-form novalidate onsubmit="return false" aria-labelledby="bespoke-form-title"><div class="bespoke-form__heading"><span class="bespoke-form__icon">${icons.file}</span><div><h2 id="bespoke-form-title">Dados para orçamento</h2><p>Preencha as informações para que possamos entender sua necessidade.</p></div></div><div class="bespoke-form__grid">
  ${field('nome', 'Seu nome', '<input id="custom-nome" name="nome" required maxlength="100" autocomplete="name" placeholder="Digite seu nome" aria-describedby="custom-nome-error">', true)}
  ${field('empresa', 'Empresa <span class="bespoke-optional">(opcional)</span>', '<input id="custom-empresa" name="empresa" maxlength="100" autocomplete="organization" placeholder="Nome da empresa" aria-describedby="custom-empresa-error">')}
  ${field('produto', 'Produto desejado', '<input id="custom-produto" name="produto" required maxlength="160" placeholder="Ex: Chapa de borracha, mangueira, vedação..." aria-describedby="custom-produto-error">', true)}
  ${field('quantidade', 'Quantidade', '<input id="custom-quantidade" name="quantidade" type="number" min="1" max="99999" step="1" required placeholder="Informe a quantidade" aria-describedby="custom-quantidade-error">', true)}
  ${field('medidas', 'Medidas <span class="bespoke-optional">(se conhecido)</span>', '<input id="custom-medidas" name="medidas" maxlength="300" placeholder="Diâmetro, espessura, comprimento..." aria-describedby="custom-medidas-error">')}
  ${field('material', 'Material <span class="bespoke-optional">(se conhecido)</span>', '<select id="custom-material" name="material" aria-describedby="custom-material-error"><option value="">Selecione o material</option><option>Borracha natural</option><option>Neoprene</option><option>Nitrílica (NBR)</option><option>EPDM</option><option>Silicone</option><option>Viton (FKM)</option><option>Outro / a confirmar</option></select>')}
  <div class="bespoke-field bespoke-field--wide"><label for="custom-aplicacao">Aplicação / Observações</label><textarea id="custom-aplicacao" name="aplicacao" rows="2" maxlength="800" placeholder="Descreva a aplicação, ambiente de uso ou qualquer detalhe importante..."></textarea></div></div>
  <p class="bespoke-form__hint">Desenhos e arquivos técnicos podem ser compartilhados diretamente na conversa do WhatsApp.</p><p class="bespoke-form__status" data-custom-status role="status" aria-live="polite"></p><button class="bespoke-form__submit" type="submit">${icons.whatsapp}<span>ENVIAR SOLICITAÇÃO DE ORÇAMENTO</span></button></form></div></section>`;
  return layout({ title: 'Soluções sob medida | MG Borrachas', description: 'Consulte peças técnicas de borracha sob medida para sua aplicação.', path: '/sob-medida', body, settings, categories });
}

function aboutBody(settings) {
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const benefits = [
    ['<path d="M12 2 4 5v6c0 5 3 8.5 8 11 5-2.5 8-6 8-11V5l-8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>', 'QUALIDADE E<br>DURABILIDADE'],
    ['<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><path d="M4 13H2v6h4v-6H4Zm16 0h2v6h-4v-6h2Zm0 6a4 4 0 0 1-4 3h-3"/>', 'ATENDIMENTO<br>ESPECIALIZADO'],
    ['<path d="m12 2 8 3v6c0 5-3 8-8 11-5-3-8-6-8-11V5l8-3Z"/><path d="M12 6v12m-4-7 4 4 4-4"/>', 'SOLUÇÕES PARA<br>SUA NECESSIDADE']
  ];
  const cards = [
    ['01', 'PRODUTOS DE BORRACHA', 'Produtos para diferentes aplicações.', '/assets/products/04_lencol_borracha_viton.jpg', 'Lençóis de borracha Viton apresentados no catálogo MG Borrachas', '/categorias/lencois-e-chapas'],
    ['02', 'COMPONENTES TÉCNICOS', 'Soluções para manutenção e equipamentos.', '/assets/products/03_pinhao_borracha_betoneira.jpg', 'Pinhão de borracha para betoneira do catálogo MG Borrachas', '/categorias/pecas-para-betoneiras'],
    ['03', 'VEDAÇÃO E AMORTECIMENTO', 'Componentes para diferentes necessidades técnicas.', '/assets/products/06_aneis_vedacao.jpg', 'Anéis de vedação de borracha do catálogo MG Borrachas', '/categorias/vedacao'],
    ['04', 'SOLUÇÕES SOB MEDIDA', 'Consulte uma solução para sua necessidade.', '/assets/products/02_coxim_borracha.jpg', 'Coxins de borracha para aplicações técnicas', '/sob-medida']
  ];
  const introduction = settings.about_text && settings.about_text !== defaultSettings.about_text
    ? settings.about_text
    : 'A MG Borrachas oferece produtos e componentes de borracha para diferentes aplicações industriais, manutenção, vedação, amortecimento e necessidades técnicas.';
  return `<div class="about-page"><section class="about-hero" aria-labelledby="about-title"><div class="about-hero__image" aria-hidden="true"></div><div class="about-hero__shade" aria-hidden="true"></div><div class="about-container about-hero__inner"><nav class="about-breadcrumb" aria-label="Caminho da página"><a href="/">Início</a><span aria-hidden="true">/</span><span aria-current="page">Sobre nós</span></nav><div class="about-hero__copy"><span class="about-eyebrow">SOBRE NÓS</span><h1 id="about-title">MG <span>BORRACHAS.</span></h1><p>Soluções em borracha para diferentes desafios.</p><div class="about-benefits" aria-label="Diferenciais">${benefits.map(([paths, label]) => `<div class="about-benefit"><span class="about-benefit__icon">${icon(paths)}</span><strong>${label}</strong></div>`).join('')}</div></div></div></section><div class="about-main"><section class="about-story about-container" aria-labelledby="about-story-title"><div class="about-story__visual" data-about-reveal><img class="about-story__background" src="/assets/brand/hero-sob-medida-v2.webp" alt="" loading="lazy" decoding="async"><img class="about-story__logo" src="/assets/brand/marca-mg-oficial-transparente.png" alt="Marca oficial MG Borrachas" loading="lazy" decoding="async"></div><div class="about-story__content" data-about-reveal><span class="about-eyebrow">NOSSA ATUAÇÃO</span><h2 id="about-story-title">COMPONENTES PARA SUA <span>OPERAÇÃO SEGUIR.</span></h2><p>${esc(introduction)}</p><p>Nosso catálogo reúne soluções para diferentes demandas, incluindo chapas de borracha, lençóis, perfis, peças técnicas e componentes para diversas aplicações.</p><a class="about-button" href="/produtos">CONHECER PRODUTOS <span aria-hidden="true">→</span></a></div></section><section class="about-solutions about-container" aria-label="Principais soluções"><div class="about-cards">${cards.map(([number, heading, copy, src, alt, href]) => `<a class="about-card" href="${href}" data-about-reveal><div class="about-card__image"><img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async"></div><div class="about-card__body"><span class="about-card__number">${number}</span><h3>${heading}</h3><p>${copy}</p><span class="about-card__arrow" aria-hidden="true">↗</span></div></a>`).join('')}</div></section></div></div>`;
}

function contactBody(settings) {
  const quote = esc(wa(settings, contactQuoteMessage));
  const instagram = esc(settings.instagram);
  const localNumber = esc(phone(settings).replace(/^\+55\s*/, ''));
  const pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const box = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10"/></svg>';
  const chat = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 9h8M8 12h5"/></svg>';
  return `<div class="contact-page">
    <section class="contact-hero" aria-labelledby="contact-title">
      <img class="contact-hero__photo" src="/assets/brand/hero-contato.webp" alt="" aria-hidden="true" fetchpriority="high" decoding="async">
      <div class="contact-hero__shade" aria-hidden="true"></div>
      <div class="contact-container contact-hero__inner">
        <nav class="contact-breadcrumb" aria-label="Caminho da página"><a href="/">Início</a><span aria-hidden="true">/</span><span aria-current="page">Contato</span></nav>
        <div class="contact-hero__copy">
          <span class="contact-eyebrow">ATENDIMENTO COMERCIAL</span>
          <h1 id="contact-title">FALE COM A <span>MG BORRACHAS</span></h1>
          <p>Precisa de soluções em borracha para sua empresa?<br> Entre em contato com nossa equipe, tire suas dúvidas e solicite um orçamento personalizado.</p>
          <div class="contact-hero__actions">
            <a class="contact-button contact-button--yellow" href="${quote}" target="_blank" rel="noopener noreferrer">${socialIcon('whatsapp')}<span>SOLICITAR ORÇAMENTO</span><span class="contact-button__arrow" aria-hidden="true">→</span></a>
            <a class="contact-button contact-button--outline" href="/produtos">${box}<span>VER NOSSOS PRODUTOS</span><span class="contact-button__arrow" aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </section>
    <div class="contact-content">
      <section class="contact-container contact-channels" aria-label="Canais de contato">
        <article class="contact-channel contact-channel--whatsapp">
          <div class="contact-channel__intro"><span class="contact-channel__icon">${socialIcon('whatsapp')}</span><div><span class="contact-channel__eyebrow">ATENDIMENTO COMERCIAL</span><h2>WhatsApp</h2></div></div>
          <strong class="contact-channel__value">${localNumber}</strong>
          <p>Fale diretamente com nossa equipe para consultar produtos, esclarecer dúvidas e solicitar orçamentos.</p>
          <a class="contact-channel__action contact-channel__action--yellow" href="${quote}" target="_blank" rel="noopener noreferrer">${socialIcon('whatsapp')}<span>CONVERSAR NO WHATSAPP</span><span aria-hidden="true">→</span></a>
        </article>
        <article class="contact-channel contact-channel--instagram">
          <div class="contact-channel__intro"><span class="contact-channel__icon">${socialIcon('instagram')}</span><div><span class="contact-channel__eyebrow">ACOMPANHE A MG BORRACHAS</span><h2>Instagram</h2></div></div>
          <strong class="contact-channel__value">${esc(instagramHandle(settings))}</strong>
          <p>Conheça nossos produtos, aplicações e novidades através do nosso Instagram oficial.</p>
          <a class="contact-channel__action contact-channel__action--dark" href="${instagram}" target="_blank" rel="noopener noreferrer">${socialIcon('instagram')}<span>ACESSAR INSTAGRAM</span><span aria-hidden="true">→</span></a>
        </article>
        <article class="contact-channel contact-channel--region">
          <div class="contact-channel__intro"><span class="contact-channel__icon">${pin}</span><div><span class="contact-channel__eyebrow">NOSSA REGIÃO</span><h2>Salvador — Bahia</h2></div></div>
          <p>Consulte nossa equipe para informações sobre atendimento, disponibilidade e condições de entrega.</p>
          <a class="contact-channel__action contact-channel__action--outline" href="${quote}" target="_blank" rel="noopener noreferrer">${pin}<span>FALE COM A EQUIPE</span><span aria-hidden="true">→</span></a>
        </article>
      </section>
      <section class="contact-container contact-callout" aria-labelledby="contact-callout-title">
        <span class="contact-callout__icon">${chat}</span>
        <h2 id="contact-callout-title">PRECISA DE UMA <span>SOLUÇÃO ESPECÍFICA?</span></h2>
        <p>Conte para nossa equipe o que sua empresa precisa. Estamos disponíveis para conversar sobre produtos, medidas e aplicações.</p>
        <a class="contact-button contact-button--yellow" href="${quote}" target="_blank" rel="noopener noreferrer">${socialIcon('whatsapp')}<span>SOLICITAR ORÇAMENTO<br>PELO WHATSAPP</span><span class="contact-button__arrow" aria-hidden="true">→</span></a>
      </section>
    </div>
  </div>`;
}

export function simplePage(data, kind) {
  const { settings, categories, products } = data;
  let title, description, body;
  if (kind === 'sobre') {
    title = 'Sobre Nós | MG Borrachas'; description = 'Conheça a MG Borrachas: produtos e componentes de borracha para aplicações industriais, vedação, manutenção e soluções sob medida.';
    body = aboutBody(settings);
  } else if (kind === 'contato') {
    title = 'Contato'; description = 'Fale com a MG Borrachas pelo WhatsApp comercial, acompanhe o Instagram oficial e solicite informações ou orçamento.';
    body = contactBody(settings);
  } else {
    title = 'Política de privacidade'; description = 'Entenda como o site MG Borrachas trata os dados usados na navegação e na lista de orçamento.';
    body = `${crumb([[null, 'Privacidade']])}<section class="page-heading container"><span class="eyebrow accent">TRANSPARÊNCIA</span><h1>POLÍTICA DE <span class="heading-yellow">PRIVACIDADE.</span></h1></section><article class="container legal"><h2>Dados utilizados</h2><p>A lista de orçamento é armazenada temporariamente no seu navegador. As informações do formulário sob medida são usadas para preparar uma mensagem que você poderá revisar e enviar pelo WhatsApp.</p><h2>WhatsApp e Instagram</h2><p>Ao abrir links externos, os dados passam a ser tratados conforme as políticas dessas plataformas. O site não confirma o envio nem registra um orçamento recebido apenas por abrir o WhatsApp.</p><h2>Contato</h2><p>Para dúvidas sobre dados pessoais, entre em contato com a MG Borrachas pelo <a href="${esc(wa(settings))}" target="_blank" rel="noopener noreferrer">WhatsApp comercial</a>.</p><p>Este texto deve ser revisado antes da publicação de um site com serviços e integrações adicionais.</p></article>`;
  }
  return layout({ title: kind === 'sobre' ? title : `${title} | MG Borrachas`, description, path: `/${kind}`, body, settings, categories, noIndex: kind === 'privacidade' ? false : false });
}

export function notFound(data) {
  const { settings, categories } = data;
  const body = `<section class="not-found container"><span class="eyebrow accent">ERRO 404</span><h1>ESSA PÁGINA SAIU DO CATÁLOGO.</h1><p>O endereço não foi encontrado. Você pode voltar para a página inicial ou explorar os produtos.</p><div><a class="btn btn-primary" href="/">Voltar ao início ↗</a><a class="btn btn-outline-dark" href="/produtos">Ver produtos</a></div></section>`;
  return layout({ title: 'Página não encontrada | MG Borrachas', description: 'A página solicitada não foi encontrada.', path: '/404', body, settings, categories, noIndex: true });
}
