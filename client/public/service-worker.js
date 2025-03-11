// Cache names
const STATIC_CACHE = 'boxwise-static-v1';
const DYNAMIC_CACHE = 'boxwise-dynamic-v1';
const API_CACHE = 'boxwise-api-v1';

// Static resources to cache on install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete outdated caches
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients
  self.clients.claim();
});

// Fetch event - serve from cache or fetch
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // API request handling with stale-while-revalidate strategy
  if (requestUrl.pathname.startsWith('/api/')) {
    // Skip non-GET requests or those that don't start with /api/
    if (event.request.method !== 'GET') return;

    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return fetch(event.request)
          .then(networkResponse => {
            // Cache a clone of the response 
            // Only cache successful responses
            if (networkResponse.ok) {
              // Check cache headers
              const cacheControl = networkResponse.headers.get('Cache-Control');
              if (cacheControl && (cacheControl.includes('max-age') || cacheControl.includes('public'))) {
                cache.put(event.request, networkResponse.clone());
              }
            }
            return networkResponse;
          })
          .catch(() => {
            // If network fails, try to return from cache
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  // Static resources - cache-first strategy
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then(networkResponse => {
          // Don't cache cross-origin resources, credentials or error responses
          if (!networkResponse.ok || 
              networkResponse.type === 'opaque' ||
              networkResponse.type === 'cors' ||
              event.request.method !== 'GET') {
            return networkResponse;
          }

          // Cache a copy of the response
          let responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(error => {
          console.error('Fetch failed:', error);
          // For navigation requests, return offline fallback page
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Otherwise just propagate the error
          throw error;
        });
    })
  );
});
