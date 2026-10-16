import { getPublicData, supabase } from '../lib/supabase.mjs';
import { catalog, productPage } from '../lib/views.mjs';

const data = await getPublicData();
const html = catalog(data);
const images = await supabase('/rest/v1/product_images?select=storage_path,product_id');
const imageChecks = [];
for (const image of images) {
  const response = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/product-images/${image.storage_path}`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY }, cache: 'no-store'
  });
  imageChecks.push({ status: response.status, type: response.headers.get('content-type') });
  await response.body?.cancel();
}
console.log(JSON.stringify({
  products: data.products.length,
  cards: (html.match(/<article class="product-card"/g) || []).length,
  whatsapp: (html.match(/Solicitar orçamento pelo WhatsApp/g) || []).length,
  categories: data.categories.length,
  productPages: data.products.filter(product => productPage(data, product.slug).includes('data-detail-whatsapp')).length,
  images: imageChecks
}, null, 2));
