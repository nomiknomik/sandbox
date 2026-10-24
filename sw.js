// Service Worker des Spieleportals: macht nur das Portal selbst offline-fähig.
// Die Spiele haben eigene Service Worker (in apps/<name>/sw.js).
// WICHTIG: Bei jeder Änderung CACHE hochzählen (und PORTAL_VERSION in index.html).
const CACHE = 'portal-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const PORTAL = new Set(SHELL.map(u => new URL(u, self.registration.scope).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('portal-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Alles außer dem Portal (Spiele, Icons der Spiele) erledigen die Spiele selbst
  if (url.origin !== location.origin || !PORTAL.has(url.pathname)) {
    // Icons der Spiele für die Kacheln: aus irgendeinem Cache holen, wenn offline
    if (url.origin === location.origin && /\/apps\/[^/]+\/icon-\d+\.png$/.test(url.pathname))
      e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Portal: erst Netz (Updates sofort), sonst Cache
  e.respondWith(fetch(e.request).then(res => { const k = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(url.origin + url.pathname, k)); return res; })
    .catch(() => caches.match(url.origin + url.pathname).then(r => r || caches.match(new URL('./index.html', self.registration.scope).href))));
});
