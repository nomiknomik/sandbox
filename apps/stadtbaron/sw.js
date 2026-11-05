// Service Worker: macht die App offline-fähig.
// WICHTIG: Bei jeder Änderung CACHE hochzählen (und APP_VERSION in index.html).
const CACHE = 'stadtbaron-v13';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './jsQR.js', './lokal.js', './logo.webp',
  './bilder/auto.webp', './bilder/hund.webp', './bilder/hut.webp', './bilder/rakete.webp', './bilder/dino.webp', './bilder/boot.webp', './bilder/katze.webp', './bilder/gitarre.webp', './bilder/einhorn.webp', './bilder/kroete.webp', './bilder/haus.webp', './bilder/hotel.webp', './bilder/frage.webp', './bilder/kasse.webp', './bilder/start.webp', './bilder/knast.webp',
  './bilder/kiesel.webp', './bilder/strand.webp', './bilder/muehle.webp', './bilder/sonnenblume.webp', './bilder/brunnen.webp', './bilder/rose.webp', './bilder/tulpen.webp', './bilder/schmetterling.webp', './bilder/fisch.webp', './bilder/muschel.webp', './bilder/leuchtturm.webp', './bilder/burg.webp', './bilder/schild.webp', './bilder/drache.webp', './bilder/sonne.webp', './bilder/krone.webp', './bilder/stern.webp', './bilder/riesenrad.webp', './bilder/tanne.webp', './bilder/ente.webp', './bilder/kristall.webp', './bilder/palast.webp', './bilder/steuer.webp', './bilder/ring.webp', './bilder/bus.webp', './bilder/anker.webp', './bilder/flugzeug.webp', './bilder/seilbahn.webp', './bilder/kraftwerk.webp', './bilder/wasserturm.webp', './bilder/korb.webp', './bilder/polizist.webp',
  './bilder/birne.webp', './bilder/ticket.webp', './bilder/schwindel.webp', './bilder/besen.webp', './bilder/roller.webp', './bilder/eis.webp', './bilder/sparschwein.webp', './bilder/dollar.webp', './bilder/zahn.webp', './bilder/teddy.webp', './bilder/briefkasten.webp', './bilder/torte.webp', './bilder/schirm.webp', './bilder/pflaster.webp', './bilder/rucksack.webp', './bilder/karton.webp', './bilder/baustelle.webp', './bilder/kuchen.webp', './bilder/geschenk.webp', './bilder/zug.webp', './bilder/muenze.webp', './bilder/pokal.webp', './bilder/handschlag.webp', './bilder/hammer.webp', './bilder/bank.webp', './bilder/wuerfel.webp', './bilder/roboter.webp', './bilder/totenkopf.webp', './bilder/globus.webp', './bilder/wlan.webp', './bilder/person.webp', './bilder/buch.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
// Nur die eigenen alten Caches löschen – die anderen Spiele (gleiche Adresse) brauchen ihre noch!
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(CACHE.replace(/\d+$/, '')) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
