import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localProducts, slugify } from '../lib/catalog.mjs';
import { supabase, configured } from '../lib/supabase.mjs';

if (!configured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Configure SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY em .env.');
  process.exit(1);
}

const root = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(await readFile(new URL('../data/catalogo-original.json', import.meta.url), 'utf8'));
let categories = await supabase('/rest/v1/categories?select=id,name,slug', { service: true });
let products = await supabase('/rest/v1/products?select=id,sku', { service: true });

for (const categoryName of [...new Set(source.produtos.map(p => p.Categoria))]) {
  const slug = slugify(categoryName);
  if (categories.some(c => c.slug === slug)) continue;
  const result = await supabase('/rest/v1/categories', { method: 'POST', service: true, body: { name: categoryName, slug, sort_order: categories.length }, headers: { Prefer: 'return=representation' } });
  categories.push(result[0]);
}

let inserted = 0, existing = 0, images = 0;
for (const item of source.produtos) {
  const mapped = localProducts.find(p => p.sku === item.SKU);
  let product = products.find(p => p.sku === item.SKU);
  if (!product) {
    const result = await supabase('/rest/v1/products', { method: 'POST', service: true, body: {
      sku: mapped.sku, name: mapped.name, slug: mapped.slug,
      category_id: categories.find(c => c.slug === mapped.category_slug).id,
      short_description: mapped.short_description, description: mapped.description,
      features: mapped.features, status: 'draft', featured: mapped.featured,
      custom: mapped.custom, sort_order: mapped.sort_order
    }, headers: { Prefer: 'return=representation' } });
    product = result[0]; products.push(product); inserted++;
  } else existing++;
  if (!mapped.image) continue;
  const existingImages = await supabase(`/rest/v1/product_images?select=id&product_id=eq.${product.id}&limit=1`, { service: true });
  if (existingImages.length) continue;
  const filename = path.basename(mapped.image);
  const bytes = await readFile(path.join(root, '..', 'public', 'assets', 'products', filename));
  const storagePath = `catalogo-inicial/${mapped.sku.toLowerCase()}-${filename}`;
  await supabase(`/storage/v1/object/product-images/${storagePath}`, { method: 'POST', service: true, body: bytes, raw: true, headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' } });
  await supabase('/rest/v1/product_images', { method: 'POST', service: true, body: { product_id: product.id, storage_path: storagePath, alt_text: `${mapped.name} — recorte de publicação fornecida pela empresa`, sort_order: 0, is_primary: true } });
  images++;
}
console.log(`Importação concluída: ${inserted} novos produtos em rascunho, ${existing} SKUs já existentes, ${images} imagens vinculadas.`);
