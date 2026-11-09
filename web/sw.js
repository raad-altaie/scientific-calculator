// Offline support: the whole calculator is cached on the first visit.
// Online, every file comes from the server, so an update shows at once and the
// files are never a mix of two versions; the cache is used only without a connection,
// or on one too slow to wait for (SLOW, below).
const CACHE = 'calculator-v88';
const FILES = [
    './', 'index.html', 'manifest.webmanifest',
    'css/style.css', 'css/options.css', 'css/site.css',
    'js/app.js', 'js/lang.js', 'js/engine.js', 'js/formulas.js', 'js/maths.js', 'js/main.js', 'js/options.js', 'js/tips.js', 'js/units.js', 'js/icons.js', 'js/chem.js', 'js/physics.js', 'js/biology.js',
    'fonts/Play-Regular.ttf', 'fonts/Play-Bold.ttf',
    'imgs/icon.png', 'imgs/icon128.png', 'imgs/icon-192.png', 'imgs/icon-512.png',
    'imgs/icon-maskable-512.png', 'imgs/apple-touch-icon.png', 'imgs/og-image.png'
];
// and what the language in use needs, as the page registers this with it (app.js), sw.js?lang=ar: the English of
// each name and its words (lang.js), and for one in Arabic letters their font; in English, none of them. A
// language of a country, pt-BR, with the words of pt where there are any
const LANG = new URL(location.href).searchParams.get('lang') || 'en';
const LANG_FILES = LANG === 'en' ? [] : ['js/lang/en.js', 'js/lang/' + LANG + '.js']
    .concat(/^(ar|fa|ur)\b/.test(LANG) ? ['fonts/NotoKufiArabic-Regular.ttf', 'fonts/NotoKufiArabic-Bold.ttf'] : []);
const LANG_BASE = LANG.includes('-') ? ['js/lang/' + LANG.split('-')[0] + '.js'] : [];

// 'reload' skips the browser's own cache, so the copies kept are the new ones
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(FILES.concat(LANG_FILES).map((file) => new Request(file, { cache: 'reload' })))
                .then(() => Promise.all(LANG_BASE.map((file) => cache.add(new Request(file, { cache: 'reload' })).catch(() => { })))))
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
