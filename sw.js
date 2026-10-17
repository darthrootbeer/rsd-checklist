/* Offline support: app files are served from cache and refreshed in the background.
   Cover art for records on your list is saved so the list still looks right in a dead-signal store. */
const SHELL = 'shell-v1';
const ART = 'art-v1';
const FILES = ['./', './index.html', './app.js', './data/releases.json', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== ART).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // stale-while-revalidate: instant from cache, update for next time
    e.respondWith(caches.open(SHELL).then(async c => {
      const key = url.pathname.endsWith('/') ? './' : req;
      const hit = await c.match(key, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res.ok) c.put(key, res.clone()); return res; }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    }));
  } else if (url.hostname === 'img.broadtime.com') {
    e.respondWith(caches.match(req.url, { cacheName: ART }).then(hit => hit || fetch(req)));
  }
});

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'warm') return;
  const want = new Set(e.data.urls);
  e.waitUntil(caches.open(ART).then(async c => {
    const keys = await c.keys();
    await Promise.all(keys.filter(k => !want.has(k.url)).map(k => c.delete(k)));
    const have = new Set(keys.map(k => k.url));
    for (const u of want) {
      if (have.has(u)) continue;
      try { await c.put(u, await fetch(u, { mode: 'no-cors' })); } catch (err) { /* offline: try next time */ }
    }
  }));
});
