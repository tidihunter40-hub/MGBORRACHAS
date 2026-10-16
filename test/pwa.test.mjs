import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { offlinePage } from '../lib/views.mjs';

const root = new URL('../public/', import.meta.url);

test('manifesto e ícones PWA preservam dimensões instaláveis', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'pt-BR');
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const png = await readFile(new URL(`assets/pwa/${file}`, root));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.match(offlinePage(), /VOCÊ ESTÁ SEM CONEXÃO/);
});

test('service worker ignora admin e API e recupera página pública offline', async () => {
  const source = await readFile(new URL('sw.js', root), 'utf8');
  assert.match(source, /contact-page\.css/);
  assert.match(source, /quote-page\.css/);
  assert.match(source, /floating-whatsapp\.css/);
  assert.match(source, /hero-contato\.webp/);
  const handlers = new Map();
  const offline = new Response('offline', { status: 200 });
  const scope = {
    self: { location: { origin: 'http://localhost:4318' }, addEventListener: (type, handler) => handlers.set(type, handler) },
    caches: { match: async key => key === '/offline' ? offline : undefined, open: async () => ({ put: async () => {} }) },
    fetch: async () => { throw new Error('sem rede'); },
    URL,
  };
  vm.runInNewContext(source, scope);
  const dispatch = (url, mode = 'navigate') => {
    let answer;
    handlers.get('fetch')({ request: { url, mode, method: 'GET' }, respondWith: value => { answer = value; } });
    return answer;
  };
  assert.equal(dispatch('http://localhost:4318/admin'), undefined);
  assert.equal(dispatch('http://localhost:4318/api/admin/data'), undefined);
  assert.equal(dispatch('http://localhost:4318/media/123'), undefined);
  assert.equal(dispatch('https://example.com/produtos'), undefined);
  assert.equal((await dispatch('http://localhost:4318/produtos')).status, 200);
  assert.equal(await (await dispatch('http://localhost:4318/produtos')).text(), 'offline');
});
