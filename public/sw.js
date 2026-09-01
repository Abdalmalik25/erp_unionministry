/**
 * Service Worker — Full Offline Support
 * Yemen National Labor Platform
 * Strategy: Stale-While-Revalidate for API, Cache-First for assets
 */

// __SW_VERSION__ يُستبدل آلياً عند البناء (vite plugin: sw-version-stamp) بمعرّف فريد لكل نشرت.
// أي نشرت جديدة ⇒ sw.js جديد ⇒ المتصفح يثبّت العامل الجديد ⇒ activate يحذف كاشات النسخ السابقة.
// هذا يمنع جذرياً خدمة حزم/أيقونات/manifest قديمة بعد النشر (stale assets).
const RAW_VERSION = '__SW_VERSION__';
const CACHE_VERSION = RAW_VERSION.startsWith('__') ? 'dev' : RAW_VERSION;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Static assets to precache (matches Vite build output)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/base.css',
  '/theme-init.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/browserconfig.xml',
  '/fonts/IBMPlexSansArabic-400-arabic.woff2',
  '/fonts/IBMPlexSansArabic-600-arabic.woff2',
];

// API routes to cache with stale-while-revalidate
const API_ROUTES = [
  '/api/health',
  '/api/metrics',
  '/api/system/branding',
];

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Some precache URLs failed, continuing...', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: intelligent routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (only handle same-origin)
  if (url.origin !== self.location.origin) return;

  // Skip chrome-extension and other special protocols
  if (!url.protocol.startsWith('http')) return;

  // Route: API requests → stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    // For health/metrics/branding: network-first with cache fallback
    if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
      event.respondWith(networkFirstWithCache(request, API_CACHE));
    } else {
      // Other API: network-only (always fresh)
      return;
    }
    return;
  }

  // Route: manifest → network-first دائماً
  // (manifest صغير؛ يجب أن يصل أي تغيير في الأيقونات/الاسم فوراً بدل انتظار أسبوع من الكاش)
  if (url.pathname === '/manifest.json' || url.pathname === '/site.webmanifest') {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
    return;
  }

  // Route: static assets →
  //   الملفات المُختمة بـ hash (assets/*-[hash].js) آمنة للـ cache-first إلى الأبد.
  //   الملفات غير المُختمة (index.html, base.css, theme-init.js, icons/*) تُخدم
  //   stale-while-revalidate حتى لا يعلق الزائر على نسخة قديمة بعد النشر.
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    const isHashedAsset = /-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
    if (isHashedAsset) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else {
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    }
    return;
  }

  // Route: HTML pages → network-first (لضمان حصول الزائر على آخر bundle بعد كل نشرت)
  // ملاحظة جوهرية: 'document' يجب ألا يدخل فرع cache-first أعلاه — التنقلات
  // شبكة-أولاً دائماً، وإلا بقيت الحزم القديمة تعمل لزوار العائدين (الجذر التاريخي
  // لأخطاء data:audio/wav وicon-144 التي أبلغ عنها المستخدمون على نسخ قديمة).
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ─────────────────────────────────────────────────
// Strategy Implementations
// ─────────────────────────────────────────────────

/**
 * Cache-First — best for versioned static assets
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Revalidate in background
    fetchAndCache(request, cacheName).catch(() => {});
    return cached;
  }
  return fetchAndCache(request, cacheName);
}

/**
 * Network-First — best for API health checks
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw new Error('No network and no cache');
  }
}

/**
 * Stale-While-Revalidate — best for dynamic content
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetchAndCache(request, cacheName).catch(() => {});

  return cachedResponse || fetchPromise;
}

/**
 * Fetch and cache a response
 */
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// ─────────────────────────────────────────────────
// Background Sync — queue failed mutations
// ─────────────────────────────────────────────────

const SYNC_TAG = 'nlp-sync-queue';

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  // Open IndexedDB to get pending operations
  const db = await openDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  const allKeys = await getAllKeys(store);

  for (const key of allKeys) {
    const op = await getItem(store, key);
    try {
      const response = await fetch(op.url, {
        method: op.method,
        headers: { 'Content-Type': 'application/json', ...op.headers },
        body: JSON.stringify(op.body),
      });
      if (response.ok) {
        // Remove from queue on success
        await deleteItem(store, key);
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_SUCCESS', operation: op });
        });
      }
    } catch (err) {
      console.warn('[SW] Sync failed for operation:', op, err);
      // Leave in queue for next sync attempt
    }
  }
}

/**
 * Queue an operation for background sync
 */
async function queueOperation(operation) {
  const db = await openDB();
  const tx = db.transaction('sync-queue', 'readwrite');
  const store = tx.objectStore('sync-queue');
  await addItem(store, {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...operation,
    queuedAt: Date.now(),
  });
  // Request background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register(SYNC_TAG);
  }
}

// ─────────────────────────────────────────────────
// Push Notifications
// ─────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let notification;
  try {
    notification = event.data.json();
  } catch {
    notification = {
      title: 'إشعار من منظومة العمل',
      body: event.data.text(),
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-32.png',
    };
  }

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: notification.badge || '/icons/badge-32.png',
      tag: notification.tag || 'nlp-notification',
      requireInteraction: notification.requireInteraction || false,
      data: notification.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ─────────────────────────────────────────────────
// Message Handler — for communication with main app
// ─────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'QUEUE_OPERATION':
      queueOperation(payload);
      break;

    case 'CLEAR_API_CACHE':
      caches.delete(API_CACHE).then(() => {
        event.ports[0]?.postMessage({ ok: true });
      });
      break;

    case 'CLEAR_ALL_CACHE':
      Promise.all([
        caches.delete(STATIC_CACHE),
        caches.delete(API_CACHE),
        caches.delete(DYNAMIC_CACHE),
      ]).then(() => {
        event.ports[0]?.postMessage({ ok: true });
      });
      break;

    case 'GET_CACHE_STATUS':
      Promise.all([
        caches.open(STATIC_CACHE).then((c) => c.keys().then((k) => ({ name: STATIC_CACHE, count: k.length }))),
        caches.open(API_CACHE).then((c) => c.keys().then((k) => ({ name: API_CACHE, count: k.length }))),
        caches.open(DYNAMIC_CACHE).then((c) => c.keys().then((k) => ({ name: DYNAMIC_CACHE, count: k.length }))),
      ]).then((stats) => {
        event.ports[0]?.postMessage({ ok: true, stats });
      });
      break;

    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

// ─────────────────────────────────────────────────
// IndexedDB Helpers
// ─────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nlp-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-uploads')) {
        db.createObjectStore('pending-uploads', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllKeys(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAllKeys();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getItem(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function addItem(store, item) {
  return new Promise((resolve, reject) => {
    const request = store.add(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteItem(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
