// ====== Service Worker (أفضل أوفلاين وتحديث سريع) ======
const STATIC_CACHE = 'theeb-static-v2';
const RUNTIME_CACHE = 'theeb-runtime-v2';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
  // './icon-192.png',
  // './icon-512.png'
];

// INSTALL: نزّل الأصول الثابتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting(); // فعّل النسخة الجديدة فورًا
});

// ACTIVATE: حذف الكاشات القديمة + claim
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// FETCH: صفحات = شبكة أولًا + كاش، باقي الملفات = كاش أولًا
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // صفحات HTML
  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  // أصول أخرى (CSS/JS/صور...)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchAndCache = fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || fetchAndCache;
    })
  );
});
