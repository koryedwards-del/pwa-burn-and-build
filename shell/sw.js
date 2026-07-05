/** Plan Support UI — service worker (shell only; PWA v2 uses /sw.js) */

const CACHE = 'bnb-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  '../css/styles.css',
  '../css/shell.css',
  '../js/shell.js',
  '../js/groceryEngine.js',
  '../js/programPackage.js',
  '../js/burnEngine.js',
  '../js/onboardingEngine.js',
  '../data/foods.json',
  '../icons/icon-192.png',
  '../icons/icon-512.png',
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
    e.respondWith(fetch(e.request).then((res) => res).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});
