/* Service worker: guarda la app para que funcione sin internet.
   Al cambiar cualquier archivo, sube el número de VERSION. */
const VERSION = 'acyzlab-v22';
// Las fotos de los ejercicios no cambian: van en una caché aparte que se conserva entre versiones
const MEDIA = 'acyzlab-media';
const FILES = [
  './', 'index.html', 'styles.css', 'config.js', 'vendor/supabase.js', 'storage.js', 'pin.js', 'social.js', 'exercises.js', 'variations.js', 'catalog.js', 'data/exercises-extra.json', 'animations.js', 'generator.js', 'leveling.js', 'app.js', 'manifest.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== MEDIA).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la red (para recibir mejoras); si no hay conexión, la copia guardada.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Fotos: primero la copia guardada (son muchas y no cambian); si no está, se descarga y se guarda
  if (new URL(e.request.url).pathname.includes('/media/')) {
    e.respondWith(caches.open(MEDIA).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }))));
    return;
  }
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

// ---------- Avisos con la app cerrada ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Acyz Lab', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: d.tag || 'acyzlab',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
