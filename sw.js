/* Service worker: guarda la app para que funcione sin internet.
   Al cambiar cualquier archivo, sube el número de VERSION. */
const VERSION = 'acyzlab-v13';
const FILES = [
  './', 'index.html', 'styles.css', 'config.js', 'vendor/supabase.js', 'storage.js', 'pin.js', 'exercises.js', 'animations.js', 'generator.js', 'app.js', 'manifest.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la red (para recibir mejoras); si no hay conexión, la copia guardada.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // "no-cache": pregunta siempre al servidor si hay versión nueva (sin esperar a que caduque la memoria del navegador)
  const net = e.request.mode === 'navigate' ? fetch(e.request, { cache: 'no-cache' }) : fetch(e.request.url, { cache: 'no-cache' });
  e.respondWith(
    net
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
