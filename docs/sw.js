/* Service worker: tiene l'app sul dispositivo, così si apre anche senza rete. */
const VERSION = '5e79386845';
const CACHE = 'playbook-' + VERSION;
const FILES = ['./', 'index.html', 'config.js', 'firebase.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('playbook-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Firebase e Google passano direttamente
  if (r.mode === 'navigate') {
    // pagina: prima la rete (per gli aggiornamenti), se manca o è lenta la copia sul dispositivo
    e.respondWith((async () => {
      const cached = await caches.match('index.html');
      try {
        const net = fetch(r).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put('index.html', res.clone())); return res; });
        return cached ? await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 3000))]) : await net;
      } catch (err) { return cached || Response.error(); }
    })());
    return;
  }
  e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(ca => ca.put(r, cp)); } return res; })));
});
