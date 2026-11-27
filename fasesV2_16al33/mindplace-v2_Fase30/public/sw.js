const VERSION = 'mindplace-pwa-v30-2';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const APP_SHELL = ['/', '/index.html', '/index_mejoras.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      // Dejamos el nuevo worker en waiting para poder avisar al usuario.
      // La activación se solicita explícitamente desde la interfaz.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;

  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'mindplace:pwa-skip-waiting') self.skipWaiting();
});
