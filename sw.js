/* Service worker: makes the site installable and quick to open.
   - Pages: network first, but never a long wait: if the network hasn't answered within 1.5 s and a saved copy exists,
     the saved copy shows at once and the fresh one is saved for next time. Offline: the saved copy.
   - Site files (css, js, images): served from cache, refreshed in the background. File links carry ?v=…,
     so a new release always uses new files.
   - rules.yaml and .json files: network first, so points are always computed from the current rulebook.
   - Firebase sign-in and database traffic is never touched. */
const CACHE = 'tc-v2';
const PAGES = ['/', '/schedule', '/about', '/apply', '/mountain', '/village', '/rules', '/feedback'];
const CDN = ['https://cdn.jsdelivr.net/npm/pixi.js@', 'https://www.gstatic.com/firebasejs/'];

self.addEventListener('install', (e) => {
  // the main pages, one by one (one missing page must not stop the others)
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PAGES.concat(['/assets/icons/icon-192.png']).map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tc-') && k !== CACHE).map(k => caches.delete(k)))),
    // start fetching the page while the service worker wakes up (faster navigations)
    self.registration.navigationPreload ? self.registration.navigationPreload.enable().catch(() => {}) : null,
  ]).then(() => self.clients.claim()));
});

// pages: the network, unless it's slow and we have a saved copy
const pageFirst = async (e) => {
  const req = e.request, cache = await caches.open(CACHE);
  const saved = await cache.match(req, { ignoreSearch: true });
  const net = (async () => {
    const pre = e.preloadResponse ? await e.preloadResponse.catch(() => null) : null;
    const res = pre || await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  })();
  e.waitUntil(net.catch(() => {}));
  if (!saved) { try { return await net; } catch (x) { return (await cache.match('/')) || Response.error(); } }
  const slow = new Promise(r => setTimeout(() => r(null), 1500));
  try { return (await Promise.race([net, slow])) || saved; } catch (x) { return saved; }
};
const networkFirst = async (req, fallback) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: req.mode === 'navigate' })) || (fallback && (await cache.match(fallback))) || Response.error();
  }
};
const staleWhileRevalidate = async (req) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const fresh = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') return e.respondWith(pageFirst(e));
    if (/\.(ya?ml|json|webmanifest)$/.test(url.pathname)) return e.respondWith(networkFirst(req));
    return e.respondWith(staleWhileRevalidate(req));
  }
  // versioned libraries only (PixiJS, Firebase SDK files); everything else goes straight to the network
  if (CDN.some(p => req.url.startsWith(p))) return e.respondWith(staleWhileRevalidate(req));
});
