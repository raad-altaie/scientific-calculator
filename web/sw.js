// Offline support: the whole calculator is cached on the first visit.
// Raise CACHE when the files change, so the old copies are dropped.
const CACHE = 'calculator-v43';
const FILES = [
    './', 'index.html', 'manifest.webmanifest',
    'css/style.css', 'css/options.css', 'css/site.css',
    'js/app.js', 'js/engine.js', 'js/formulas.js', 'js/maths.js', 'js/main.js', 'js/options.js', 'js/tips.js', 'js/units.js',
    'fonts/Play-Regular.ttf', 'fonts/Play-Bold.ttf',
    'imgs/icon.png', 'imgs/icon128.png', 'imgs/icon-192.png', 'imgs/icon-512.png',
    'imgs/icon-maskable-512.png', 'imgs/apple-touch-icon.png', 'imgs/og-image.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// the cached copy first, the network when it is missing; a fresh copy is kept for next time
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cached) => {
            const fresh = fetch(event.request).then((response) => {
                if (response.ok && new URL(event.request.url).origin === location.origin) {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
                }
                return response;
            });
            return cached || fresh;
        })
    );
});
