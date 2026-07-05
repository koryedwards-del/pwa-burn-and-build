/** Shell PWA — v2 clone service worker */

const CACHE = 'bnb-shell-v2-clone-1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  '../css/styles.css',
  '../css/home.css',
  '../img/shell/home-logo.svg',
  '../js/shellApp.js',
  '../js/programApi.js',
  '../js/contactsApi.js',
  '../js/groceryEngine.js',
  '../js/programPackage.js',
  '../js/burnEngine.js',
  '../js/onboardingEngine.js',
  '../js/onboardingUI.js',
  '../js/coachEngine.js',
  '../data/foods.json',
  '../img/coach/card-1.png',
  '../img/coach/card-2.png',
  '../img/coach/card-3.png',
  '../img/coach/card-4.png',
  '../img/coach/card-5.png',
  '../img/coach/card-6.png',
  '../img/coach/card-7.png',
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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (NETWORK_FIRST.some((p) => url.pathname.includes(p))) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
