/* Service worker: makes the site installable and quick to open.
   - Pages: network first (always fresh when online), cached copy when offline.
   - Site files (css, js, images): served from cache, refreshed in the background. File links carry ?v=…,
     so a new release always uses new files.
   - rules.yaml and .json files: network first, so points are always computed from the current rulebook.
   - Firebase sign-in and database traffic is never touched. */
const CACHE = 'tc-v1';
const CDN = ['https://cdn.jsdelivr.net/npm/pixi.js@', 'https://www.gstatic.com/firebasejs/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/schedule', '/assets/styles.css', '/assets/icons/icon-192.png'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tc-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

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
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req, '/'));
    if (/\.(ya?ml|json|webmanifest)$/.test(url.pathname)) return e.respondWith(networkFirst(req));
    return e.respondWith(staleWhileRevalidate(req));
  }
  // versioned libraries only (PixiJS, Firebase SDK files); everything else goes straight to the network
  if (CDN.some(p => req.url.startsWith(p))) return e.respondWith(staleWhileRevalidate(req));
});
