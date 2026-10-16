import { readFile } from 'node:fs/promises';
import { defaultSettings, localCategories, localProducts, normalizeDbProduct } from './catalog.mjs';

try {
  const env = await readFile(new URL('../.env', import.meta.url), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* Optional local configuration. */ }

export const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const url = () => process.env.SUPABASE_URL.replace(/\/$/, '');

export async function supabase(path, { method = 'GET', token, body, headers = {}, raw = false, service = false } = {}) {
  if (!configured) throw new Error('Supabase ainda não configurado.');
  const key = service ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error('Credencial do Supabase ausente.');
  const response = await fetch(`${url()}${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
      ...(body && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body == null ? undefined : raw ? body : JSON.stringify(body),
    cache: 'no-store'
  });
  const type = response.headers.get('content-type') ?? '';
  const data = type.includes('json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(typeof data === 'object' ? data.message || data.error_description || data.error || 'Erro no Supabase' : 'Erro no Supabase');
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getPublicData() {
  if (!configured) return { products: localProducts, categories: localCategories, settings: defaultSettings, banners: [], preview: true };
  let result;
  try {
    result = await Promise.all([
    supabase('/rest/v1/products?select=*,category:categories(name,slug),product_images(id,is_primary,sort_order)&status=eq.published&order=sort_order.asc,created_at.desc'),
    supabase('/rest/v1/categories?select=*&is_active=eq.true&order=sort_order.asc'),
    supabase('/rest/v1/site_settings?select=*&id=eq.1'),
    supabase('/rest/v1/site_banners?select=*&is_active=eq.true&order=sort_order.asc').catch(() => []),
    supabase('/rest/v1/product_attributes?select=product_id,name,value,sort_order&order=sort_order.asc').catch(() => []),
    supabase('/rest/v1/product_documents?select=id,product_id,title,sort_order&order=sort_order.asc').catch(() => [])
    ]);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && error.status === 404 && /schema cache|Could not find the table/i.test(error.message)) {
      return { products: localProducts, categories: localCategories, settings: defaultSettings, banners: [], preview: true };
    }
    throw error;
  }
  const [products, categories, settings, banners, attributes, documents] = result;
  const normalized = products.map(product => {
    const result = normalizeDbProduct(product);
    result.technical = { ...result.technical, ...Object.fromEntries(attributes.filter(attr => attr.product_id === product.id).map(attr => [attr.name, attr.value])) };
    result.documents = documents.filter(doc => doc.product_id === product.id).map(doc => ({ title: doc.title, href: `/documentos/${doc.id}` }));
    return result;
  });
  return {
    products: normalized,
    categories: categories.map(category => ({ ...category, count: normalized.filter(product => product.category_slug === category.slug).length })),
    settings: { ...defaultSettings, ...(settings[0] ?? {}) },
    banners,
    preview: false
  };
}

export async function getAdminData(token) {
  const [products, categories, settings, banners, documents] = await Promise.all([
    supabase('/rest/v1/products?select=*,category:categories(name,slug),product_images(*)&order=created_at.desc', { token }),
    supabase('/rest/v1/categories?select=*&order=sort_order.asc', { token }),
    supabase('/rest/v1/site_settings?select=*&id=eq.1', { token }),
    supabase('/rest/v1/site_banners?select=*&order=sort_order.asc', { token }).catch(() => []),
    supabase('/rest/v1/product_documents?select=*&order=sort_order.asc', { token }).catch(() => [])
  ]);
  return { products, categories, settings: settings[0] ?? defaultSettings, banners, documents };
}

export async function isAdmin(token) {
  if (!token || !configured) return false;
  try {
    const profile = await supabase('/rest/v1/admin_profiles?select=user_id&limit=1', { token });
    return profile.length > 0;
  } catch { return false; }
}
