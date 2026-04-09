// Service Worker - Offline caching pro Losovací web
const CACHE_NAME = 'losovaci-web-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/state.js',
    './js/ui.js',
    './js/matches.js',
    './js/swiss.js',
    './js/playoff.js',
    './js/stats.js',
    './js/export.js',
    './js/utils.js',
    './js/i18n.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js'
];

// Install - precache all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - cache-first for static assets, network-first for external CDN
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) return;

    // Cache-first strategy for our own assets
    if (url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version, but refresh cache in background
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const cloned = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                        }
                        return networkResponse;
                    }).catch(() => cachedResponse);

                    return cachedResponse;
                }

                // Not in cache - fetch from network and cache it
                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const cloned = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                    }
                    return networkResponse;
                }).catch(() => {
                    // Offline fallback
                    if (event.request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                });
            })
        );
        return;
    }

    // Network-first for everything else (Google Charts QR codes etc.)
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
