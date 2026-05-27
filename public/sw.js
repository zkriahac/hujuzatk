const CACHE_NAME = 'hujuzatk-v3';

// Paths the SW must NEVER intercept — these are standalone static pages /
// machine-readable files served directly from /public. Intercepting them
// risks serving a stale SPA shell and breaking AI crawlers + direct visitors.
const BYPASS_PREFIXES = ['/ar/', '/en/'];
const BYPASS_EXACT = ['/llms.txt', '/pricing.md', '/sitemap.xml', '/robots.txt'];
const STATIC_ASSETS = [
  '/manifest.json'
];

// Install: cache only static non-HTML assets, skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: claim all clients and delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML/navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never intercept static marketing pages or machine-readable files —
  // they must go straight to the network and bypass any SW caching.
  if (
    BYPASS_PREFIXES.some((p) => url.pathname.startsWith(p)) ||
    BYPASS_EXACT.includes(url.pathname)
  ) {
    return;
  }

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache HTML — always fresh from network
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
