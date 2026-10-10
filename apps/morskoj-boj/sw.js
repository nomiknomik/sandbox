// Service Worker: macht die App offline-fähig.
// WICHTIG: Bei jeder Änderung CACHE hochzählen (und APP_VERSION in index.html).
const CACHE = 'morskoj-boj-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './jsQR.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;              // Fremdes (z. B. Sync) nie aus dem Cache
  const seite = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (seite) {                                              // Seite: erst Netz, dann Cache -> Updates kommen sofort
    e.respondWith(fetch(e.request).then(res => { const k = res.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
