import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getPublicData, getAdminData, isAdmin, supabase, configured } from './lib/supabase.mjs';
import { home, catalog, categoriesPage, productPage, quotePage, customPage, simplePage, notFound, offlinePage } from './lib/views.mjs';
import { adminPage, loginPage } from './lib/admin-views.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4317;
if (process.env.NODE_ENV === 'production' && (!configured || !/^https:\/\/[^/]+\/?$/.test(process.env.PUBLIC_SITE_URL || ''))) {
  throw new Error('Produção exige SUPABASE_URL, SUPABASE_ANON_KEY e PUBLIC_SITE_URL com HTTPS.');
}
const publicDir = path.join(root, 'public');
const mime = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8' };

function send(res, status, data, type = 'text/html; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', ...headers });
  res.end(data);
}
const json = (res, status, value, headers = {}) => send(res, status, JSON.stringify(value), 'application/json; charset=utf-8', headers);
const cookies = req => Object.fromEntries((req.headers.cookie ?? '').split(';').map(part => { const at = part.indexOf('='); return at < 0 ? [] : [decodeURIComponent(part.slice(0, at).trim()), decodeURIComponent(part.slice(at + 1).trim())]; }).filter(x => x.length === 2));
const cookieFlags = () => `HttpOnly; SameSite=Strict; Path=/; ${process.env.PUBLIC_SITE_URL?.startsWith('https://') ? 'Secure; ' : ''}`;
const authCookies = (access, refresh) => [`mg_access=${encodeURIComponent(access)}; ${cookieFlags()}Max-Age=3600`, `mg_refresh=${encodeURIComponent(refresh)}; ${cookieFlags()}Max-Age=2592000`];
const clearCookies = () => [`mg_access=; ${cookieFlags()}Max-Age=0`, `mg_refresh=; ${cookieFlags()}Max-Age=0`];

async function readBody(req, max = 1_000_000) {
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > max) { const error = new Error('Arquivo ou dados excedem o limite permitido.'); error.status = 413; throw error; } parts.push(part); }
  return Buffer.concat(parts);
}
async function readJson(req) {
  if (!(req.headers['content-type'] ?? '').includes('application/json')) { const error = new Error('Envie dados JSON.'); error.status = 415; throw error; }
  try { return JSON.parse((await readBody(req)).toString('utf8')); } catch { const error = new Error('JSON inválido.'); error.status = 400; throw error; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  return origin === `http://${host}` || origin === `https://${host}`;
}
async function session(req, res) {
  const saved = cookies(req);
  if (saved.mg_access && await isAdmin(saved.mg_access)) return saved.mg_access;
  if (!saved.mg_refresh || !configured) return null;
  try {
    const tokens = await supabase('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: saved.mg_refresh } });
    if (!await isAdmin(tokens.access_token)) return null;
    res.setHeader('Set-Cookie', authCookies(tokens.access_token, tokens.refresh_token));
    return tokens.access_token;
  } catch { return null; }
}
async function serveMedia(res, id, token) {
  const rows = await supabase(`/rest/v1/product_images?select=storage_path&id=eq.${id}&limit=1`, { token });
  if (!rows.length) return json(res, 404, { error: 'Imagem não encontrada.' });
  const storagePath = rows[0].storage_path;
  const key = process.env.SUPABASE_ANON_KEY;
  const upstream = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/product-images/${storagePath}`, {
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) }, cache: 'no-store'
  });
  if (!upstream.ok) return json(res, upstream.status === 403 ? 404 : upstream.status, { error: 'Imagem indisponível.' });
  const type = upstream.headers.get('content-type') || 'application/octet-stream';
  send(res, 200, Buffer.from(await upstream.arrayBuffer()), type, { 'Cache-Control': 'no-store' });
}
async function serveDocument(res, id) {
  const rows = await supabase(`/rest/v1/product_documents?select=storage_path&id=eq.${id}&limit=1`);
  if (!rows.length) return send(res, 404, 'Documento não encontrado.', 'text/plain; charset=utf-8', { 'Cache-Control': 'no-store' });
  const key = process.env.SUPABASE_ANON_KEY;
  const upstream = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/product-documents/${rows[0].storage_path}`, {
    headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) }, cache: 'no-store'
  });
  if (!upstream.ok) return send(res, 404, 'Documento indisponível.', 'text/plain; charset=utf-8', { 'Cache-Control': 'no-store' });
  send(res, 200, Buffer.from(await upstream.arrayBuffer()), 'application/pdf', { 'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="ficha-tecnica.pdf"' });
}
const validSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 180;
const text = (value, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
function requireFields(obj, fields) {
  for (const field of fields) if (!text(obj[field])) { const error = new Error(`Campo obrigatório: ${field}.`); error.status = 400; throw error; }
}
function productPayload(input) {
  requireFields(input, ['sku', 'name', 'slug', 'category_id']);
  if (!validSlug(input.slug) || !/^[A-Za-z0-9_-]{1,30}$/.test(input.sku)) { const error = new Error('SKU ou slug inválido.'); error.status = 400; throw error; }
  if (!['draft', 'published', 'archived'].includes(input.status)) { const error = new Error('Status inválido.'); error.status = 400; throw error; }
  const technical = input.technical && typeof input.technical === 'object' && !Array.isArray(input.technical) ? Object.fromEntries(Object.entries(input.technical).slice(0, 20).map(([k,v]) => [text(k, 60), text(v, 300)])) : {};
  return { sku: text(input.sku, 30), name: text(input.name, 160), slug: input.slug, category_id: input.category_id, short_description: text(input.short_description, 300), description: text(input.description), applications: text(input.applications, 1500), features: Array.isArray(input.features) ? input.features.slice(0, 30).map(x => text(x, 250)).filter(Boolean) : [], technical, status: input.status, featured: Boolean(input.featured), custom: Boolean(input.custom), sort_order: Number.isFinite(Number(input.sort_order)) ? Math.trunc(Number(input.sort_order)) : 0 };
}
function categoryPayload(input) {
  requireFields(input, ['name', 'slug']);
  if (!validSlug(input.slug)) { const error = new Error('Slug inválido.'); error.status = 400; throw error; }
  if (input.image_id && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.image_id)) { const error = new Error('Imagem de categoria inválida.'); error.status = 400; throw error; }
  return { name: text(input.name, 120), slug: input.slug, description: text(input.description, 500), sort_order: Math.trunc(Number(input.sort_order) || 0), is_active: Boolean(input.is_active), image_id: input.image_id || null };
}
function bannerPayload(input) {
  requireFields(input, ['title']);
  const href = text(input.cta_href, 200);
  if (href && (!/^\/(?!\/)[a-z0-9/-]*$/.test(href) || href.startsWith('/admin') || href.startsWith('/api'))) { const error = new Error('Use um link interno válido.'); error.status = 400; throw error; }
  if (input.image_id && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.image_id)) { const error = new Error('Imagem do banner inválida.'); error.status = 400; throw error; }
  return { title: text(input.title, 160), description: text(input.description, 600), image_id: input.image_id || null, cta_label: text(input.cta_label, 60), cta_href: href, sort_order: Math.trunc(Number(input.sort_order) || 0), is_active: Boolean(input.is_active) };
}
async function validatePublishedImage(token, imageId, categoryId) {
  if (!imageId) return;
  const rows = await supabase(`/rest/v1/product_images?select=id,product:products(category_id,status)&id=eq.${imageId}&limit=1`, { token });
  const product = Array.isArray(rows[0]?.product) ? rows[0].product[0] : rows[0]?.product;
  if (!product || product.status !== 'published' || (categoryId && product.category_id !== categoryId)) {
    const error = new Error('Selecione a foto de um produto publicado da categoria correspondente.'); error.status = 400; throw error;
  }
}
async function requireActiveCategories(token, categoryIds) {
  const ids = [...new Set(categoryIds)];
  if (!ids.length) return;
  if (ids.some(id => !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))) {
    const error = new Error('Categoria inválida.'); error.status = 400; throw error;
  }
  const active = await supabase(`/rest/v1/categories?select=id&id=in.(${ids.join(',')})&is_active=eq.true`, { token });
  if (active.length !== ids.length) {
    const error = new Error('Ative a categoria antes de publicar ou mover produtos publicados para ela.'); error.status = 409; throw error;
  }
}
function settingsPayload(input) {
  if (!/^\d{10,15}$/.test(input.whatsapp ?? '')) { const error = new Error('WhatsApp inválido.'); error.status = 400; throw error; }
  try { if (!['instagram.com', 'www.instagram.com'].includes(new URL(input.instagram).hostname)) throw new Error(); } catch { const error = new Error('Link do Instagram inválido.'); error.status = 400; throw error; }
  const heroSkus = Array.isArray(input.hero_skus) ? input.hero_skus.filter(Boolean) : [];
  if (heroSkus.length > 4 || new Set(heroSkus).size !== heroSkus.length || heroSkus.some(sku => !/^[A-Za-z0-9_-]{1,30}$/.test(sku))) {
    const error = new Error('Seleção de imagens da capa inválida.'); error.status = 400; throw error;
  }
  return { company_name: 'MG Borrachas', ...Object.fromEntries(['whatsapp', 'instagram', 'hero_title', 'hero_description', 'about_text', 'seo_title', 'seo_description'].map(k => [k, text(input[k], 2000)])), hero_skus: heroSkus };
}
async function api(req, res, pathname) {
  res.setHeader('Cache-Control', 'no-store');
  if (!sameOrigin(req) && req.method !== 'GET') return json(res, 403, { error: 'Origem não permitida.' });
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    if (!configured) return json(res, 503, { error: 'Supabase não configurado.' });
    const input = await readJson(req);
    const tokens = await supabase('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: text(input.email, 254), password: String(input.password ?? '') } });
    if (!await isAdmin(tokens.access_token)) return json(res, 403, { error: 'Usuário sem permissão administrativa.' });
    return json(res, 200, { ok: true }, { 'Set-Cookie': authCookies(tokens.access_token, tokens.refresh_token) });
  }
  if (pathname === '/api/admin/logout' && req.method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookies() });
  const token = await session(req, res);
  if (!token) return json(res, 401, { error: 'Sessão administrativa necessária.' });
  if (pathname === '/api/admin/data' && req.method === 'GET') return json(res, 200, await getAdminData(token));
  if (pathname === '/api/admin/products' && req.method === 'POST') {
    const payload = productPayload(await readJson(req));
    if (payload.status === 'published') await requireActiveCategories(token, [payload.category_id]);
    const result = await supabase('/rest/v1/products', { method: 'POST', token, body: payload, headers: { Prefer: 'return=representation' } });
    return json(res, 201, result[0]);
  }
  if (pathname === '/api/admin/products/bulk' && ['PATCH', 'DELETE'].includes(req.method)) {
    const input = await readJson(req);
    const ids = [...new Set(Array.isArray(input.ids) ? input.ids : [])];
    if (!ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))) return json(res, 400, { error: 'Selecione até 100 produtos válidos.' });
    const filter = `id=in.(${ids.join(',')})`;
    if (req.method === 'PATCH') {
      let change;
      if (input.action === 'publish') change = { status: 'published' };
      else if (input.action === 'unpublish') change = { status: 'draft' };
      else if (input.action === 'feature') change = { featured: true };
      else if (input.action === 'unfeature') change = { featured: false };
      else if (input.action === 'move' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.category_id ?? '')) change = { category_id: input.category_id };
      else return json(res, 400, { error: 'Ação em massa inválida.' });
      if (input.action === 'publish' || input.action === 'move') {
        const affected = await supabase(`/rest/v1/products?select=category_id,status&${filter}`, { token });
        if (input.action === 'publish') await requireActiveCategories(token, affected.map(product => product.category_id));
        else if (affected.some(product => product.status === 'published')) await requireActiveCategories(token, [input.category_id]);
      }
      const rows = await supabase(`/rest/v1/products?${filter}`, { method: 'PATCH', token, body: change, headers: { Prefer: 'return=representation' } });
      return json(res, 200, { updated: rows.length });
    }
    const images = await supabase(`/rest/v1/product_images?select=storage_path,product_id&product_id=in.(${ids.join(',')})`, { token });
    const removed = await supabase(`/rest/v1/products?${filter}`, { method: 'DELETE', token, headers: { Prefer: 'return=representation' } });
    const results = await Promise.allSettled(images.filter(image => removed.some(product => product.id === image.product_id)).map(image => supabase(`/storage/v1/object/product-images/${image.storage_path}`, { method: 'DELETE', token })));
    return json(res, 200, { deleted: removed.length, orphaned_files: results.filter(result => result.status === 'rejected').length });
  }
  const productMatch = pathname.match(/^\/api\/admin\/products\/([0-9a-f-]{36})$/);
  if (productMatch && req.method === 'PATCH') {
    const payload = productPayload(await readJson(req));
    if (payload.status === 'published') await requireActiveCategories(token, [payload.category_id]);
    const result = await supabase(`/rest/v1/products?id=eq.${productMatch[1]}`, { method: 'PATCH', token, body: payload, headers: { Prefer: 'return=representation' } });
    if (!result.length) return json(res, 404, { error: 'Produto não encontrado.' });
    return json(res, 200, result[0]);
  }
  if (productMatch && req.method === 'DELETE') {
    const images = await supabase(`/rest/v1/product_images?select=storage_path&product_id=eq.${productMatch[1]}`, { token });
    const deleted = await supabase(`/rest/v1/products?id=eq.${productMatch[1]}`, { method: 'DELETE', token, headers: { Prefer: 'return=representation' } });
    if (!deleted.length) return json(res, 404, { error: 'Produto não encontrado.' });
    const cleanup = await Promise.allSettled(images.map(image => supabase(`/storage/v1/object/product-images/${image.storage_path}`, { method: 'DELETE', token })));
    return json(res, 200, { ok: true, orphaned_files: cleanup.filter(result => result.status === 'rejected').length });
  }
  if (pathname === '/api/admin/categories' && req.method === 'POST') {
    const payload = categoryPayload(await readJson(req));
    if (payload.image_id) return json(res, 400, { error: 'Crie a categoria antes de escolher a imagem.' });
    const result = await supabase('/rest/v1/categories', { method: 'POST', token, body: payload, headers: { Prefer: 'return=representation' } });
    return json(res, 201, result[0]);
  }
  const categoryMatch = pathname.match(/^\/api\/admin\/categories\/([0-9a-f-]{36})$/);
  if (categoryMatch && req.method === 'PATCH') {
    const payload = categoryPayload(await readJson(req));
    if (!payload.is_active) {
      const published = await supabase(`/rest/v1/products?select=id&category_id=eq.${categoryMatch[1]}&status=eq.published&limit=1`, { token });
      if (published.length) return json(res, 409, { error: 'Mova ou transforme em rascunho os produtos publicados antes de desativar esta categoria.' });
    }
    await validatePublishedImage(token, payload.image_id, categoryMatch[1]);
    const result = await supabase(`/rest/v1/categories?id=eq.${categoryMatch[1]}`, { method: 'PATCH', token, body: payload, headers: { Prefer: 'return=representation' } });
    if (!result.length) return json(res, 404, { error: 'Categoria não encontrada.' });
    return json(res, 200, result[0]);
  }
  if (categoryMatch && req.method === 'DELETE') {
    const linked = await supabase(`/rest/v1/products?select=id&category_id=eq.${categoryMatch[1]}&limit=1`, { token });
    if (linked.length) return json(res, 409, { error: 'Mova ou exclua os produtos vinculados antes de excluir esta categoria.' });
    const deleted = await supabase(`/rest/v1/categories?id=eq.${categoryMatch[1]}`, { method: 'DELETE', token, headers: { Prefer: 'return=representation' } });
    if (!deleted.length) return json(res, 404, { error: 'Categoria não encontrada.' });
    return json(res, 200, { ok: true });
  }
  if (pathname === '/api/admin/banners' && req.method === 'POST') {
    const payload = bannerPayload(await readJson(req));
    await validatePublishedImage(token, payload.image_id);
    const result = await supabase('/rest/v1/site_banners', { method: 'POST', token, body: payload, headers: { Prefer: 'return=representation' } });
    return json(res, 201, result[0]);
  }
  const bannerMatch = pathname.match(/^\/api\/admin\/banners\/([0-9a-f-]{36})$/);
  if (bannerMatch && req.method === 'PATCH') {
    const payload = bannerPayload(await readJson(req));
    await validatePublishedImage(token, payload.image_id);
    const result = await supabase(`/rest/v1/site_banners?id=eq.${bannerMatch[1]}`, { method: 'PATCH', token, body: payload, headers: { Prefer: 'return=representation' } });
    return json(res, 200, result[0]);
  }
  if (bannerMatch && req.method === 'DELETE') {
    await supabase(`/rest/v1/site_banners?id=eq.${bannerMatch[1]}`, { method: 'DELETE', token });
    return json(res, 200, { ok: true });
  }
  if (pathname === '/api/admin/settings' && req.method === 'PATCH') {
    const result = await supabase('/rest/v1/site_settings?id=eq.1', { method: 'PATCH', token, body: settingsPayload(await readJson(req)), headers: { Prefer: 'return=representation' } });
    return json(res, 200, result[0]);
  }
  if (pathname === '/api/admin/images' && req.method === 'POST') {
    const input = await readJson(req);
    if (!/^[0-9a-f-]{36}$/.test(input.product_id ?? '') || !/^[-\w/]+\.(?:jpg|jpeg|png|webp)$/.test(input.storage_path ?? '')) return json(res, 400, { error: 'Imagem ou produto inválido.' });
    const result = await supabase('/rest/v1/product_images', { method: 'POST', token, body: { product_id: input.product_id, storage_path: input.storage_path, alt_text: text(input.alt_text, 200), sort_order: Number(input.sort_order) || 0, is_primary: Boolean(input.is_primary) }, headers: { Prefer: 'return=representation' } });
    return json(res, 201, result[0]);
  }
  const imageMatch = pathname.match(/^\/api\/admin\/images\/([0-9a-f-]{36})$/);
  if (imageMatch && req.method === 'PATCH') {
    const input = await readJson(req);
    const result = await supabase(`/rest/v1/product_images?id=eq.${imageMatch[1]}`, { method: 'PATCH', token, body: { alt_text: text(input.alt_text, 200), sort_order: Math.trunc(Number(input.sort_order) || 0), is_primary: Boolean(input.is_primary) }, headers: { Prefer: 'return=representation' } });
    if (!result.length) return json(res, 404, { error: 'Imagem não encontrada.' });
    return json(res, 200, result[0]);
  }
  if (imageMatch && req.method === 'DELETE') {
    const rows = await supabase(`/rest/v1/product_images?select=storage_path&id=eq.${imageMatch[1]}`, { token });
    if (!rows.length) return json(res, 404, { error: 'Imagem não encontrada.' });
    await supabase(`/rest/v1/product_images?id=eq.${imageMatch[1]}`, { method: 'DELETE', token });
    try { await supabase(`/storage/v1/object/product-images/${rows[0].storage_path}`, { method: 'DELETE', token }); }
    catch { return json(res, 200, { ok: true, orphaned_files: 1 }); }
    return json(res, 200, { ok: true, orphaned_files: 0 });
  }
  const adminMediaMatch = pathname.match(/^\/api\/admin\/media\/([0-9a-f-]{36})$/);
  if (adminMediaMatch && req.method === 'GET') return serveMedia(res, adminMediaMatch[1], token);
  if (pathname === '/api/admin/upload' && req.method === 'POST') {
    const type = (req.headers['content-type'] ?? '').split(';')[0];
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!extensions[type]) return json(res, 415, { error: 'Formato de imagem não permitido.' });
    const buffer = await readBody(req, Math.min(4_000_000, Number(process.env.MAX_UPLOAD_BYTES) || 4_000_000));
    const valid = type === 'image/jpeg' ? buffer[0] === 0xff && buffer[1] === 0xd8 : type === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) return json(res, 400, { error: 'Conteúdo da imagem inválido.' });
    const storagePath = `${randomUUID()}.${extensions[type]}`;
    await supabase(`/storage/v1/object/product-images/${storagePath}`, { method: 'POST', token, body: buffer, raw: true, headers: { 'Content-Type': type, 'x-upsert': 'false' } });
    return json(res, 201, { storage_path: storagePath });
  }
  if (pathname === '/api/admin/documents' && req.method === 'POST') {
    const input = await readJson(req);
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.product_id ?? '') || !/^[0-9a-f-]{36}\.pdf$/.test(input.storage_path ?? '') || !text(input.title, 160)) return json(res, 400, { error: 'Dados do documento inválidos.' });
    const result = await supabase('/rest/v1/product_documents', { method: 'POST', token, body: { product_id: input.product_id, storage_path: input.storage_path, title: text(input.title, 160) }, headers: { Prefer: 'return=representation' } });
    return json(res, 201, result[0]);
  }
  const documentMatch = pathname.match(/^\/api\/admin\/documents\/([0-9a-f-]{36})$/);
  if (documentMatch && req.method === 'DELETE') {
    const rows = await supabase(`/rest/v1/product_documents?select=storage_path&id=eq.${documentMatch[1]}&limit=1`, { token });
    if (!rows.length) return json(res, 404, { error: 'Documento não encontrado.' });
    await supabase(`/rest/v1/product_documents?id=eq.${documentMatch[1]}`, { method: 'DELETE', token });
    try { await supabase(`/storage/v1/object/product-documents/${rows[0].storage_path}`, { method: 'DELETE', token }); }
    catch { return json(res, 200, { ok: true, orphaned_files: 1 }); }
    return json(res, 200, { ok: true, orphaned_files: 0 });
  }
  if (pathname === '/api/admin/upload-document' && req.method === 'POST') {
    if ((req.headers['content-type'] ?? '').split(';')[0] !== 'application/pdf') return json(res, 415, { error: 'Envie um arquivo PDF.' });
    const buffer = await readBody(req, 4_000_000);
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') return json(res, 400, { error: 'PDF inválido.' });
    const storagePath = `${randomUUID()}.pdf`;
    await supabase(`/storage/v1/object/product-documents/${storagePath}`, { method: 'POST', token, body: buffer, raw: true, headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' } });
    return json(res, 201, { storage_path: storagePath });
  }
  return json(res, 404, { error: 'Rota não encontrada.' });
}

async function staticFile(res, pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes('..') || decoded.includes('\\')) return false;
  const file = path.join(publicDir, decoded.slice(1));
  if (!file.startsWith(publicDir + path.sep)) return false;
  try {
    const contents = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const mutableAsset = ext === '.css' || ext === '.js' || ext === '.webmanifest' || decoded.startsWith('/assets/brand/');
    send(res, 200, contents, mime[ext] ?? 'application/octet-stream', { 'Cache-Control': mutableAsset ? 'no-cache' : 'public, max-age=86400' });
    return true;
  } catch { return false; }
}

export async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    const mediaMatch = pathname.match(/^\/media\/([0-9a-f-]{36})$/);
    if (mediaMatch && req.method === 'GET') return await serveMedia(res, mediaMatch[1]);
    const publicDocumentMatch = pathname.match(/^\/documentos\/([0-9a-f-]{36})$/);
    if (publicDocumentMatch && req.method === 'GET') return await serveDocument(res, publicDocumentMatch[1]);
    if (pathname === '/robots.txt') return send(res, 200, `User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /offline\nSitemap: ${(process.env.PUBLIC_SITE_URL || `http://localhost:${port}`).replace(/\/$/, '')}/sitemap.xml\n`, 'text/plain; charset=utf-8');
    if (pathname === '/sitemap.xml') {
      const data = await getPublicData();
      const base = (process.env.PUBLIC_SITE_URL || `http://localhost:${port}`).replace(/\/$/, '');
      const paths = ['/', '/produtos', '/categorias', '/sob-medida', '/sobre', '/contato', '/privacidade', ...data.products.map(p => `/produtos/${p.slug}`), ...data.categories.map(c => `/categorias/${c.slug}`)];
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${base}${p}</loc></url>`).join('')}</urlset>`, 'application/xml; charset=utf-8');
    }
    if (await staticFile(res, pathname)) return;
    if (pathname === '/offline') return send(res, 200, offlinePage(), 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
    if (pathname.startsWith('/admin')) {
      if (pathname === '/admin/login') return send(res, 200, loginPage(configured), 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
      const token = await session(req, res);
      if (!token) { res.writeHead(302, { Location: '/admin/login', 'Cache-Control': 'no-store' }); return res.end(); }
      const page = adminPage(pathname);
      if (page) return send(res, 200, page, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
    }
    const data = await getPublicData();
    let output, status = 200;
    if (pathname === '/') output = home(data);
    else if (pathname === '/produtos') output = catalog(data);
    else if (pathname === '/categorias') output = categoriesPage(data);
    else if (pathname === '/orcamento') output = quotePage(data);
    else if (pathname === '/sob-medida') output = customPage(data);
    else if (['/sobre', '/contato', '/privacidade'].includes(pathname)) output = simplePage(data, pathname.slice(1));
    else if (/^\/produtos\/[a-z0-9-]+$/.test(pathname)) { const slug = pathname.split('/')[2]; status = data.products.some(p => p.slug === slug) ? 200 : 404; output = productPage(data, slug); }
    else if (/^\/categorias\/[a-z0-9-]+$/.test(pathname)) { const slug = pathname.split('/')[2]; status = data.categories.some(c => c.slug === slug) ? 200 : 404; output = catalog(data, slug); }
    else { status = 404; output = notFound(data); }
    send(res, status, output, 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache, must-revalidate' });
  } catch (error) {
    const status = error.status || 500;
    if (req.url.startsWith('/api/')) json(res, status, { error: status === 500 ? 'Erro interno. Tente novamente.' : error.message });
    else send(res, status, `<html lang="pt-BR"><meta charset="utf-8"><title>Serviço indisponível</title><body style="font-family:sans-serif;padding:3rem"><h1>Serviço temporariamente indisponível</h1><p>Verifique a configuração ou tente novamente.</p><a href="/">Voltar ao início</a></body></html>`);
    console.error(error);
  }
}

export const server = http.createServer(handler);
if (process.env.VERCEL !== '1') server.listen(port, () => console.log(`MG Borrachas: http://localhost:${port}`));
