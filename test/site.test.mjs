import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import source from '../lib/catalog-data.mjs';
import { localProducts, localCategories, defaultSettings, normalize } from '../lib/catalog.mjs';
import { home, catalog, productPage, quotePage, customPage, simplePage, esc } from '../lib/views.mjs';
import { buildCustomQuoteMessage } from '../public/custom-page.js';
import { loginPage, adminPage } from '../lib/admin-views.mjs';

const data = { products: localProducts, categories: localCategories, settings: defaultSettings, preview: true };

test('o catálogo empacotado corresponde ao JSON original', async () => {
  const original = JSON.parse(await readFile(new URL('../data/catalogo-original.json', import.meta.url), 'utf8'));
  assert.deepEqual(source, original);
});

test('o catálogo preserva os 15 SKUs reais e as seis fotografias correspondentes', async () => {
  assert.equal(localProducts.length, 15);
  assert.deepEqual(localProducts.map(p => p.sku), Array.from({ length: 15 }, (_, i) => `MG${String(i + 1).padStart(3, '0')}`));
  assert.equal(localProducts.filter(p => p.image).length, 6);
  assert.equal(new Set(localProducts.map(p => p.slug)).size, 15);
  for (const product of localProducts.filter(p => p.image)) await access(new URL(`../public${product.image}`, import.meta.url));
});

test('a busca pode tratar diferenças de acento', () => {
  assert.equal(normalize('vedação'), 'vedacao');
  assert.equal(normalize('Pinhão'), 'pinhao');
});

test('a seleção administrativa das fotos da capa altera a composição inicial', () => {
  const html = home({ ...data, settings: { ...defaultSettings, hero_skus: ['MG006'] } });
  assert.match(html, /hero-selected-products"[^>]*><a class="hero-picked hero-picked-1" href="\/produtos\/roda-de-borracha-macica"/);
});

test('a página inicial usa a logo transparente oficial e não apresenta preços inventados', async () => {
  const html = home(data);
  await access(new URL('../public/assets/brand/marca-mg-oficial-transparente.png', import.meta.url));
  assert.match(html, /<img class="brand-art" src="\/assets\/brand\/marca-mg-oficial-transparente\.png"/);
  assert.match(html, /MG Borrachas/);
  assert.match(html, /ARTEFATOS DE/);
  assert.match(html, /BORRACHA/);
  assert.match(html, /DIRETO DA FÁBRICA/);
  assert.match(html, /PARA SUA EMPRESA!/);
  assert.match(html, /Qualidade, resistência e variedade em produtos de borracha/);
  assert.match(html, /<img class="hero-backdrop" src="\/assets\/brand\/hero-borracha-fabrica\.png"/);
  assert.match(html, /Solicitar orçamento <span aria-hidden="true">→<\/span><\/a><a class="btn btn-outline" href="\/produtos"/);
  assert.doesNotMatch(html, /R\$\s*\d/);
});

test('a hero atualiza os textos antigos salvos nas configurações', () => {
  const html = home({ ...data, settings: { ...defaultSettings, hero_title: 'Soluções em borracha para sua indústria.', hero_description: 'Peças técnicas, vedação, amortecimento, revestimentos e soluções sob medida para diferentes aplicações.' } });
  assert.match(html, /ARTEFATOS DE/);
  assert.match(html, /Qualidade, resistência e variedade em produtos de borracha/);
  assert.doesNotMatch(html, /PARA SUA INDÚSTRIA/);
});

test('produto, categoria e orçamento possuem conteúdo real e URLs próprias', () => {
  assert.match(productPage(data, 'coxim-de-borracha'), /MG001/);
  const html = catalog(data, 'vedacao');
  assert.match(html, /3 resultados/);
  assert.match(html, /Solicitar orçamento pelo WhatsApp/);
  assert.match(html, /wa\.me\/5571981417081\?text=/);
  assert.match(quotePage(data), /data-send-quote/);
  assert.match(quotePage(data), /data-whatsapp="5571981417081"/);
  assert.match(quotePage(data), /quote-page\.css/);
  assert.match(quotePage(data), /id="quote-title">LISTA DE <span>ORÇAMENTO<\/span>/);
  assert.match(quotePage(data), /data-send-quote disabled/);
  assert.match(quotePage(data), /data-clear-quote disabled/);
  assert.match(quotePage(data), /id="quote-catalog"/);
});

test('página Sob Medida mantém o WhatsApp configurado e campos acessíveis', () => {
  const html = customPage({ ...data, settings: { ...defaultSettings, whatsapp: '5511999999999' } });
  assert.match(html, /custom-page\.css/);
  assert.match(html, /custom-page\.js/);
  assert.match(html, /data-whatsapp="5511999999999"/);
  assert.match(html, /<label for="custom-nome">Seu nome/);
  assert.match(html, /data-custom-form novalidate onsubmit="return false"/);
  assert.match(html, /name="quantidade"[^>]*required/);
  assert.match(html, /name="medidas"[^>]*aria-describedby/);
  assert.doesNotMatch(html, /name="medidas"[^>]*required/);
  assert.match(html, /ENVIAR SOLICITAÇÃO DE ORÇAMENTO/);
  assert.doesNotMatch(home(data), /custom-page\.(?:css|js)/);
});

test('Sobre Nós apresenta a marca oficial, fotos do catálogo e links para soluções reais', async () => {
  const html = simplePage(data, 'sobre');
  assert.match(html, /<title>Sobre Nós \| MG Borrachas<\/title>/);
  assert.match(html, /about-page\.css/);
  assert.match(html, /about-page\.js/);
  assert.match(html, /<h1 id="about-title">MG <span>BORRACHAS\.<\/span><\/h1>/);
  assert.match(html, /href="\/sobre" aria-current="page"/);
  assert.match(html, /class="about-story__logo" src="\/assets\/brand\/marca-mg-oficial-transparente\.png"/);
  for (const href of ['/categorias/lencois-e-chapas', '/categorias/pecas-para-betoneiras', '/categorias/vedacao', '/sob-medida']) assert.match(html, new RegExp(`href="${href}"`));
  for (const image of ['04_lencol_borracha_viton.jpg', '03_pinhao_borracha_betoneira.jpg', '06_aneis_vedacao.jpg', '02_coxim_borracha.jpg']) {
    assert.match(html, new RegExp(image));
    await access(new URL(`../public/assets/products/${image}`, import.meta.url));
  }
  assert.doesNotMatch(home(data), /about-page\.(?:css|js)/);
});

test('Contato usa canais configurados e o WhatsApp flutuante abre a mensagem correta', async () => {
  const settings = { ...defaultSettings, whatsapp: '5511999999999', instagram: 'https://www.instagram.com/mgborrachas.oficial/' };
  const html = simplePage({ ...data, settings }, 'contato');
  const message = 'Olá, MG Borrachas! Visitei o site e gostaria de solicitar informações e um orçamento.';
  const quote = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
  assert.match(html, /<h1 id="contact-title">FALE COM A <span>MG BORRACHAS<\/span><\/h1>/);
  assert.match(html, /contact-page\.css/);
  assert.match(html, /floating-whatsapp\.css/);
  assert.match(html, /class="mobile-whatsapp"[^>]*><span class="wa-glyph" aria-hidden="true"><\/span><\/a>/);
  assert.doesNotMatch(html, /class="mobile-whatsapp"[^>]*>◉<\/a>/);
  assert.match(html, /href="\/produtos"/);
  assert.match(html, /href="https:\/\/www\.instagram\.com\/mgborrachas\.oficial\/"/);
  assert.match(html, /\(11\) 99999-9999/);
  assert.equal(html.split(`href="${quote}"`).length - 1, 4);
  assert.match(html, /class="floating-whatsapp" href="https:\/\/wa\.me\/5511999999999\?text=Ol%C3%A1%2C%20MG%20Borrachas!%20Gostaria/);
  assert.equal(html.split('class="floating-whatsapp"').length - 1, 1);
  assert.match(html, /href="\/contato" aria-current="page"/);
  assert.doesNotMatch(html, /VAMOS <span class="heading-yellow">CONVERSAR\?/);
  assert.doesNotMatch(home(data), /contact-page\.css/);
  for (const path of ['assets/brand/hero-contato.webp', 'assets/icons/whatsapp.svg', 'assets/icons/instagram.svg']) await access(new URL(`../public/${path}`, import.meta.url));
});

test('mensagem Sob Medida inclui dados informados e omite campos opcionais vazios', () => {
  const message = buildCustomQuoteMessage(new Map([
    ['nome', ' Cliente '], ['produto', ' Chapa de borracha '], ['quantidade', '12'],
    ['empresa', ''], ['medidas', '10 mm x 20 mm'], ['material', 'EPDM'],
    ['aplicacao', 'Vedação de equipamento']
  ]));
  assert.match(message, /Nome: Cliente\nProduto desejado: Chapa de borracha\nQuantidade: 12/);
  assert.match(message, /Medidas: 10 mm x 20 mm\nMaterial: EPDM\nAplicação \/ Observações: Vedação de equipamento/);
  assert.doesNotMatch(message, /Empresa:/);
});

test('dados externos são escapados no HTML e painel sem configuração não simula login', () => {
  assert.equal(esc('<script>'), '&lt;script&gt;');
  const login = loginPage(false);
  assert.match(login, /Supabase ainda não foi configurada/);
  assert.match(login, /<img class="brand-art" src="\/assets\/brand\/marca-mg-oficial-transparente\.png"/);
  assert.doesNotMatch(login, /type="password"/);
});

test('banners e ferramentas administrativas novas exibem apenas links internos seguros', () => {
  const html = home({ ...data, banners: [{ is_active: true, title: 'Vedação técnica', description: '<teste>', cta_label: 'Ver catálogo', cta_href: '/produtos' }, { is_active: true, title: 'Link inválido', cta_label: 'Abrir', cta_href: 'javascript:alert(1)' }] });
  assert.match(html, /Vedação técnica/);
  assert.match(html, /&lt;teste&gt;/);
  assert.match(html, /href="\/produtos">Ver catálogo/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(adminPage('/admin/produtos'), /data-bulk-apply/);
  assert.match(adminPage('/admin/midia'), /data-document-form/);
  assert.match(adminPage('/admin/banners'), /data-banner-form/);
});
