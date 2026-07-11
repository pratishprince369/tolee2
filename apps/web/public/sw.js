const CACHE_NAME = 'tolee-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/default-user-avatar.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('[PWA SW] Pre-caching failed during install:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let browser handle all non-GET requests
  if (event.request.method !== 'GET') return;

  // Let browser handle external APIs, websockets, and Next.js webpack streams / api calls
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/_next/') ||
    url.pathname.includes('webpack-hmr')
  ) {
    return;
  }

  // Only handle static assets and the root page '/'
  const isStaticAsset = url.pathname.match(/\.(png|jpg|jpeg|svg|ico|json|js|css)$/);
  const isRootPage = url.pathname === '/';
  
  if (!isStaticAsset && !isRootPage) {
    return; // Let browser handle it natively
  }

  // Network-first with cache fallback strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback response for browser navigations to prevent service worker crashes
          return new Response('Network error occurred', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
