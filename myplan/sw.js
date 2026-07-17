/** My Plan PWA service worker */

const CACHE = 'bnb-myplan-v55';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  '../css/styles.css',
  '../css/home.css',
  '../css/plan.css',
  '../css/grocery.css',
  '../css/projections.css',
  '../css/previousPlans.css',
  '../js/programHistory.js',
  '../js/bodyCompositionAnalysis.js',
  '../img/brand/bblogo.png',
  '../js/shellApp.js',
  '../js/apiConfig.js',
  '../js/apiFetch.js',
  '../js/programApi.js',
  '../js/localDataBackup.js',
  '../js/contactsApi.js',
  '../js/groceryEngine.js',
  '../js/programPackage.js',
  '../js/burnEngine.js',
  '../js/onboardingEngine.js',
  '../js/onboardingUI.js',
  '../js/coachEngine.js',
  '../js/reminderScheduler.js',
  '../data/foods.json',
  '../icons/apple-touch-icon.png',
  '../icons/icon-192.png',
  '../icons/icon-512.png',
];

const NETWORK_FIRST = ['/js/', '/css/'];

function isNetworkFirst(url, request) {
  if (NETWORK_FIRST.some((p) => url.pathname.includes(p))) return true;
  if (request.mode === 'navigate') return true;
  if (url.pathname.endsWith('/myplan/') || url.pathname.endsWith('/myplan/index.html')) return true;
  return url.pathname.endsWith('.html');
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

let reminderTimers = [];

function clearReminderTimers() {
  reminderTimers.forEach((id) => clearTimeout(id));
  reminderTimers = [];
}

self.addEventListener('message', (e) => {
  const data = e.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'CLEAR_REMINDERS') {
    clearReminderTimers();
    return;
  }

  if (data.type === 'SCHEDULE_REMINDERS' && Array.isArray(data.reminders)) {
    clearReminderTimers();
    const now = Date.now();
    reminderTimers = data.reminders.map((reminder) => {
      const delay = Math.max(0, Number(reminder.at) - now);
      return setTimeout(() => {
        self.registration.showNotification(reminder.title || "It's time for your Burn & Build meal", {
          body: reminder.body || '',
          tag: reminder.tag || 'bnb-meal-reminder',
          icon: '../icons/icon-192.png',
          badge: '../icons/icon-192.png',
          data: { screen: 'plan' },
        });
      }, delay);
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_PLAN' });
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
      return undefined;
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (isNetworkFirst(url, e.request)) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
