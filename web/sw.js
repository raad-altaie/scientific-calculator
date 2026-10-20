// Offline support: the whole calculator is cached on the first visit.
// Online, every file comes from the server, so an update shows at once and the
// files are never a mix of two versions; the cache is used only without a connection,
// or on one too slow to wait for (SLOW, below).
const CACHE = 'calculator-v82';
const FILES = [
    './', 'index.html', 'manifest.webmanifest',
    'css/style.css', 'css/options.css', 'css/site.css',
    'js/app.js', 'js/engine.js', 'js/formulas.js', 'js/maths.js', 'js/main.js', 'js/options.js', 'js/tips.js', 'js/units.js', 'js/chem.js',
    'fonts/Play-Regular.ttf', 'fonts/Play-Bold.ttf',
    'imgs/icon.png', 'imgs/icon128.png', 'imgs/icon-192.png', 'imgs/icon-512.png',
    'imgs/icon-maskable-512.png', 'imgs/apple-touch-icon.png', 'imgs/og-image.png'
];

// 'reload' skips the browser's own cache, so the copies kept are the new ones
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// the network first ('no-cache' asks the server whether the file changed), keeping a copy
// for offline; the cached copy when the network fails, or has not answered in SLOW ms, as on a
// poor connection, the copy still kept from the network as it comes
const SLOW = 3000;

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
    const network = fetch(request, { cache: 'no-cache' })
        .then((response) => {
            if (response.ok) {
                const copy = response.clone();
                return caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => { }).then(() => response);
            }
            return response;
        });
    const cached = () => caches.match(request, { ignoreSearch: true });

    event.waitUntil(network.catch(() => { }));
    event.respondWith(new Promise((answer) => {
        const late = setTimeout(() => cached().then((copy) => copy && answer(copy)), SLOW);

        network
            .then((response) => {
                clearTimeout(late);
                answer(response);
            })
            .catch(() => {
                clearTimeout(late);
                cached().then((copy) => answer(copy || Response.error()));
            });
    }));
});
