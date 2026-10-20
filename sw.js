// NAZMUL & ASSOCIATES - PWA SERVICE WORKER
const CACHE_NAME = 'na-tax-os-v1.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './initial_data.js',
  './site.webmanifest',
  './logo-tight.png',
  './logo-emblem.png',
  './logo.png',
  './favicon.png',
  './favicon-32x32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

// Install: Cache Shell Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching offline shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA SW] Pre-cache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First for Firestore/Auth/APIs, Stale-While-Revalidate for app assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass Firebase Auth, Firestore, Google APIs, CDN scripts
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    event.request.method !== 'GET'
  ) {
    return; // Let browser handle network directly
  }

  // App shell assets: Network first with Cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
