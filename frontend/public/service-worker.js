const CACHE_NAME = 'freshmor-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Only handle http(s) requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Network-first for API calls — always get fresh data
  if (event.request.url.includes('/api/')) {
    try {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
      );
    } catch (e) {
      console.warn('[ServiceWorker] API fetch error:', e);
    }
    return;
  }

  // Network-first for navigation requests (index.html, SPA routes)
  if (event.request.mode === 'navigate') {
    try {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request) || caches.match('/'))
      );
    } catch (e) {
      console.warn('[ServiceWorker] Navigation fetch error:', e);
    }
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  try {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            // Only cache successful, same-origin static assets
            if (response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch((e) => {
            console.warn('[ServiceWorker] Static asset fetch error:', e);
            return new Response('', { status: 503 });
          });
      })
    );
  } catch (e) {
    console.warn('[ServiceWorker] Cache-first fetch error:', e);
  }
});
