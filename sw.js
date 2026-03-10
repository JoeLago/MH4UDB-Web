const CACHE = 'mh4u-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './js/app.js',
  './js/db.js',
  './js/router.js',
  './js/pages/home.js',
  './js/pages/monsters.js',
  './js/pages/weapons.js',
  './js/pages/armor.js',
  './js/pages/items.js',
  './js/pages/quests.js',
  './js/pages/locations.js',
  './js/pages/decorations.js',
  './js/pages/skills.js',
  './js/pages/combining.js',
  './js/pages/canteen.js',
  './js/pages/wyporium.js',
  './js/pages/veggie-elder.js',
  './js/pages/armor-search.js',
  './js/pages/talismans.js',
  './mh4u.db',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
