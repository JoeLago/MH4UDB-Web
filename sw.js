const CACHE = 'mh4u-v2';

// Large/static assets — cache-first (offline-first, rarely change)
const PRECACHE_ASSETS = [
  './mh4u.db',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Returns true for large assets that should be cache-first
function isCacheFirst(url) {
  return url.includes('mh4u.db') ||
         url.includes('sql-wasm') ||
         url.includes('/icons/');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  if (isCacheFirst(url)) {
    // Cache-first: return cached immediately, update cache in background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        });
        return cached || networkFetch;
      })
    );
  } else {
    // Network-first: always try network, fall back to cache when offline
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() =>
        caches.match(e.request).then(cached => cached || new Response('Offline', { status: 503 }))
      )
    );
  }
});
