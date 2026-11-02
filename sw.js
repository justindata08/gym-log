// Service worker: keeps a copy of the app on the phone so it opens with no signal.
//
// RELEASING AN UPDATE: change CACHE_VERSION (e.g. v1 -> v2) every time you change
// any app file. The phone then downloads the new files and shows "Update available".

const CACHE_VERSION = 'gym-log-v1';
const FONT_CACHE = 'gym-log-fonts';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './data/exercises.js',
  './js/app.js',
  './js/catalog.js',
  './js/catalogView.js',
  './js/csv.js',
  './js/db.js',
  './js/session.js',
  './js/state.js',
  './js/sync.js',
  './js/time.js',
  './js/ui.js',
  './js/screens/active.js',
  './js/screens/catalog.js',
  './js/screens/home.js',
  './js/screens/sessions.js',
  './js/screens/settings.js'
];

self.addEventListener('install', event => {
  // cache: 'reload' skips the browser's HTTP cache so we store the fresh files.
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE_VERSION && key !== FONT_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') event.ports[0]?.postMessage(CACHE_VERSION);
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // POSTs to Google go straight to the network.
  const url = new URL(req.url);

  // Google Fonts: use the saved copy, fetch and save it the first time.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONT_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Opening the app serves the cached index.html (screens are after the #, so
  // only the app's root URL is ever opened).
  const scopePath = new URL(self.registration.scope).pathname;
  if (req.mode === 'navigate' && (url.pathname === scopePath || url.pathname === scopePath + 'index.html')) {
    event.respondWith(
      caches.match('./index.html', { cacheName: CACHE_VERSION }).then(hit => hit || fetch(req))
    );
    return;
  }

  // App files: cached copy first, network for anything not cached (e.g. tests/).
  event.respondWith(
    caches.match(req, { cacheName: CACHE_VERSION, ignoreSearch: true }).then(hit => hit || fetch(req))
  );
});
