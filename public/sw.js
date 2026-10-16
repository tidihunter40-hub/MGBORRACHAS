/* Cache exclusively public, anonymous pages and same-origin site assets. */
const VERSION = 'mg-borrachas-v15';
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const PUBLIC_PAGES = /^\/(?:$|produtos(?:\/[a-z0-9-]+)?|categorias(?:\/[a-z0-9-]+)?|orcamento|sob-medida|sobre|contato|privacidade|offline)\/?$/;
const PUBLIC_ASSETS = /^\/(?:site|header|reference-home|polish|catalog|pwa|custom-page|about-page|contact-page|quote-page|floating-whatsapp|typography)\.(?:css|js)$|^\/manifest\.webmanifest$|^\/assets\/(?:brand|products|pwa|icons)\/[a-zA-Z0-9_.-]+\.(?:png|jpg|jpeg|webp|svg)$/;
const SHELL = ['/offline', '/site.css', '/header.css', '/reference-home.css', '/polish.css', '/catalog.css', '/custom-page.css', '/about-page.css', '/contact-page.css', '/quote-page.css', '/floating-whatsapp.css', '/typography.css', '/site.js', '/custom-page.js', '/about-page.js', '/pwa.js', '/manifest.webmanifest', '/assets/brand/marca-mg-oficial-transparente.png', '/assets/brand/hero-sob-medida-v2.webp', '/assets/brand/hero-contato.webp', '/assets/icons/whatsapp.svg', '/assets/icons/instagram.svg', '/assets/pwa/icon-192.png', '/assets/pwa/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(ASSET_CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('mg-borrachas-') && key !== PAGE_CACHE && key !== ASSET_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/media/')) return;

  if (request.mode === 'navigate' && PUBLIC_PAGES.test(path)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !response.headers.has('set-cookie')) {
          const cache = await caches.open(PAGE_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match('/offline'));
      }
    })());
    return;
  }

  if (PUBLIC_ASSETS.test(path)) {
    event.respondWith((async () => {
      if (/\.(?:css|js)$/.test(path)) {
        try {
          const response = await fetch(request);
          if (response.ok && response.type === 'basic' && !response.headers.has('set-cookie')) {
            const cache = await caches.open(ASSET_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        } catch { return (await caches.match(request)) || Response.error(); }
      }
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic' && !response.headers.has('set-cookie')) {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});
