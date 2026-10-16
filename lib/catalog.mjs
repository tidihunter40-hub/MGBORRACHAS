import { readFile } from 'node:fs/promises';

const source = JSON.parse(await readFile(new URL('../data/catalogo-original.json', import.meta.url), 'utf8'));

export const slugify = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const localProducts = source.produtos.map((item, index) => ({
  id: item.SKU,
  sku: item.SKU,
  name: item.Produto,
  slug: slugify(item.Produto),
  category: item.Categoria,
  category_slug: slugify(item.Categoria),
  description: item['Descrição para o site'],
  short_description: item['Descrição para o site'],
  features: item['Características divulgadas']?.split(';').map(x => x.trim()).filter(x => x && !/confirmar/i.test(x)) ?? [],
  image: item['Foto para card'] ? `/assets/products/${item['Foto para card'].split('/').pop()}` : null,
  image_note: item['Foto para card'] ? 'Recorte de publicação fornecida pela empresa' : 'Imagem individual ainda não fornecida',
  featured: index < 6,
  sort_order: index,
  status: 'source-preview',
  custom: /sob medida/i.test(item.Produto),
  provenance: item.Evidência,
  review_note: item.Observações
}));

export const localCategories = [...new Set(localProducts.map(item => item.category))].map((name, index) => ({
  id: slugify(name), name, slug: slugify(name), sort_order: index,
  count: localProducts.filter(item => item.category === name).length
}));

export const defaultSettings = {
  company_name: 'MG Borrachas',
  whatsapp: '5571981417081',
  instagram: 'https://www.instagram.com/mgborrachas.oficial/',
  hero_title: 'Artefatos de borracha direto da fábrica para sua empresa!',
  hero_description: 'Qualidade, resistência e variedade em produtos de borracha para empresas, indústrias e diversos segmentos do mercado.',
  hero_skus: [],
  about_text: 'A MG Borrachas apresenta produtos de borracha para aplicações industriais, manutenção, vedação, amortecimento e peças técnicas.',
  seo_title: 'MG Borrachas | Artefatos de Borracha Direto da Fábrica',
  seo_description: 'Conheça os artefatos de borracha da MG Borrachas para empresas, indústrias e diferentes aplicações. Explore o catálogo e solicite orçamento.'
};

export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function normalizeDbProduct(item) {
  const category = Array.isArray(item.category) ? item.category[0] : item.category;
  const images = [...(item.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  return {
    id: item.id, sku: item.sku, name: item.name, slug: item.slug,
    category: category?.name ?? 'Sem categoria', category_slug: category?.slug ?? '',
    description: item.description ?? '', short_description: item.short_description ?? item.description ?? '',
    features: item.features ?? [],
    image: images[0]?.id ? `/media/${images[0].id}` : null,
    images: images.map(image => `/media/${image.id}`),
    image_note: images.length ? 'Imagem do catálogo' : 'Imagem individual ainda não fornecida',
    featured: item.featured, sort_order: item.sort_order, status: item.status,
    custom: item.custom, technical: item.technical ?? {}, applications: item.applications ?? ''
  };
}
