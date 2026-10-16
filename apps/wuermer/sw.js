// Service Worker: macht die App offline-fähig.
// WICHTIG: Bei jeder Änderung CACHE hochzählen (und APP_VERSION in index.html).
const CACHE = 'wuermer-v62';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './jsQR.js',
  './wurm/01-soldat-angst.webp', './wurm/01-soldat-aua.webp', './wurm/01-soldat-blinzeln.webp', './wurm/01-soldat-fliegen.webp', './wurm/01-soldat-jubel.webp', './wurm/01-soldat.webp',
  './wurm/02-rambo-angst.webp', './wurm/02-rambo-aua.webp', './wurm/02-rambo-blinzeln.webp', './wurm/02-rambo-fliegen.webp', './wurm/02-rambo-jubel.webp', './wurm/02-rambo.webp',
  './wurm/03-hippie-angst.webp', './wurm/03-hippie-aua.webp', './wurm/03-hippie-blinzeln.webp', './wurm/03-hippie-fliegen.webp', './wurm/03-hippie-jubel.webp', './wurm/03-hippie.webp',
  './wurm/04-nachtsicht-angst.webp', './wurm/04-nachtsicht-aua.webp', './wurm/04-nachtsicht-blinzeln.webp', './wurm/04-nachtsicht-fliegen.webp', './wurm/04-nachtsicht-jubel.webp', './wurm/04-nachtsicht.webp',
  './wurm/05-cowboy-angst.webp', './wurm/05-cowboy-aua.webp', './wurm/05-cowboy-blinzeln.webp', './wurm/05-cowboy-fliegen.webp', './wurm/05-cowboy-jubel.webp', './wurm/05-cowboy.webp',
  './wurm/06-sanitaeter-angst.webp', './wurm/06-sanitaeter-aua.webp', './wurm/06-sanitaeter-blinzeln.webp', './wurm/06-sanitaeter-fliegen.webp', './wurm/06-sanitaeter-jubel.webp', './wurm/06-sanitaeter.webp',
  './wurm/07-wikinger-angst.webp', './wurm/07-wikinger-aua.webp', './wurm/07-wikinger-blinzeln.webp', './wurm/07-wikinger-fliegen.webp', './wurm/07-wikinger-jubel.webp', './wurm/07-wikinger.webp',
  './wurm/08-kapitaen-angst.webp', './wurm/08-kapitaen-aua.webp', './wurm/08-kapitaen-blinzeln.webp', './wurm/08-kapitaen-fliegen.webp', './wurm/08-kapitaen-jubel.webp', './wurm/08-kapitaen.webp',
  './wurm/09-kommando-angst.webp', './wurm/09-kommando-aua.webp', './wurm/09-kommando-blinzeln.webp', './wurm/09-kommando-fliegen.webp', './wurm/09-kommando-jubel.webp', './wurm/09-kommando.webp',
  './wurm/10-gasmaske-angst.webp', './wurm/10-gasmaske-aua.webp', './wurm/10-gasmaske-blinzeln.webp', './wurm/10-gasmaske-fliegen.webp', './wurm/10-gasmaske-jubel.webp', './wurm/10-gasmaske.webp',
  './wurm/11-hai-angst.webp', './wurm/11-hai-aua.webp', './wurm/11-hai-blinzeln.webp', './wurm/11-hai-fliegen.webp', './wurm/11-hai-jubel.webp', './wurm/11-hai.webp',
  './wurm/12-polar-angst.webp', './wurm/12-polar-aua.webp', './wurm/12-polar-blinzeln.webp', './wurm/12-polar-fliegen.webp', './wurm/12-polar-jubel.webp', './wurm/12-polar.webp'];

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
    const schluessel = url.origin + url.pathname;            // ?v=… / ?u=… nicht extra speichern
    e.respondWith(fetch(e.request).then(res => { const k = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(schluessel, k)); return res; })
      .catch(() => caches.match(schluessel).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
