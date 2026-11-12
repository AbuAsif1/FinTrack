const CACHE_NAME = 'fintrack-shell-v1';

// App shell resources to cache on install
const SHELL_URLS = [
  '/',
  '/login',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request))
    );
    return;
  }

  // Network-first with cache fallback for navigation
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached ?? caches.match('/'))
    )
  );
});
