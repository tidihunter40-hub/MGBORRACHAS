// Usage: node scripts/verify-public.mjs https://seu-site.vercel.app
const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) {
  console.error('Informe a URL do site: node scripts/verify-public.mjs https://seu-site.vercel.app');
  process.exit(2);
}

const base = origin.replace(/\/$/, '');
async function page(path) {
  const response = await fetch(new URL(path, `${base}/`), { redirect: 'follow', cache: 'no-store' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

const html = await page('/produtos');
const cards = [...html.matchAll(/<article class="product-card"[^>]*>/g)];
const skus = [...html.matchAll(/<span class="visual-index">(MG\d{3})<\/span>/g)].map(match => match[1]);
if (cards.length !== 15 || new Set(skus).size !== 15) {
  throw new Error(`Catálogo público incompleto: ${cards.length} cartões e ${new Set(skus).size} SKUs distintos; esperados 15.`);
}
for (let index = 1; index <= 15; index++) {
  const sku = `MG${String(index).padStart(3, '0')}`;
  if (!skus.includes(sku)) throw new Error(`SKU ausente no catálogo público: ${sku}`);
}

const productLinks = [...new Set([...html.matchAll(/href="(\/produtos\/[a-z0-9-]+)"/g)].map(match => match[1]))];
if (productLinks.length !== 15) throw new Error(`Esperadas 15 páginas de produto; encontradas ${productLinks.length}.`);
const categoryHtml = await page('/categorias');
const categoryLinks = [...new Set([...categoryHtml.matchAll(/href="(\/categorias\/[a-z0-9-]+)"/g)].map(match => match[1]))];
if (!categoryLinks.length) throw new Error('Nenhuma categoria pública encontrada.');

let photos = 0;
for (const path of productLinks) {
  const detail = await page(path);
  if (!detail.includes('wa.me/5571981417081?text=')) throw new Error(`${path}: botão de WhatsApp ausente.`);
  const image = detail.match(/<div class="detail-main-image">(?:<button[^>]*>)?<img src="([^"]+)"/);
  if (image) {
    const response = await fetch(new URL(image[1], `${base}/`), { cache: 'no-store' });
    if (!response.ok || !(response.headers.get('content-type') || '').startsWith('image/')) {
      throw new Error(`${path}: imagem indisponível (HTTP ${response.status}).`);
    }
    photos++;
  } else if (!detail.includes('Fotografia ainda não disponível')) {
    throw new Error(`${path}: faltam imagem e marcador de foto pendente.`);
  }
}
for (const path of categoryLinks) await page(path);
console.log(JSON.stringify({ url: base, products: cards.length, categories: categoryLinks.length, photos, placeholders: cards.length - photos, whatsapp: 'ok' }, null, 2));
