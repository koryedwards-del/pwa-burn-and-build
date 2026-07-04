const CACHE = 'bnb-v23';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/start.css',
  './data/foods.json',
  './manifest.json',
  './img/coach/card-1.png',
  './img/coach/card-2.png',
  './img/coach/card-3.png',
  './img/coach/card-4.png',
  './img/coach/card-5.png',
  './img/coach/card-6.png',
  './img/coach/card-7.png',
  './start/index.html',
];

const NETWORK_FIRST = ['/js/', '/css/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (NETWORK_FIRST.some((part) => url.includes(part))) {
    e.respondWith(
      fetch(e.request)
        .then((res) => res)
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});
