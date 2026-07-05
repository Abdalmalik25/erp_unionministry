/**
 * Service Worker - للعمل دون اتصال
 * تخزين مؤقت ذكي ومزامنة في الخلفية
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `unionsphere-${CACHE_VERSION}`;

// الملفات الأساسية للتخزين المؤقت
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/src/app/App.tsx',
  '/src/styles/fonts.css',
  '/src/styles/theme.css',
  '/src/imports/image.png',
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
  // Cache First - للملفات الثابتة
  cacheFirst: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  },

  // Network First - للبيانات الديناميكية
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw error;
    }
  },

  // Stale While Revalidate - للبيانات المتوسطة
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((response) => {
      cache.put(request, response.clone());
      return response;
    });

    return cached || fetchPromise;
  },
};

// التثبيت
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS);
    })
  );

  self.skipWaiting();
});

// التفعيل
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  self.clients.claim();
});

// معالجة الطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات الخارجية
  if (url.origin !== location.origin) {
    return;
  }

  // اختيار الاستراتيجية المناسبة
  let strategy;

  if (request.url.includes('/api/')) {
    // API requests - Network First
    strategy = CACHE_STRATEGIES.networkFirst;
  } else if (
    request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2)$/)
  ) {
    // Static assets - Cache First
    strategy = CACHE_STRATEGIES.cacheFirst;
  } else {
    // HTML and dynamic content - Stale While Revalidate
    strategy = CACHE_STRATEGIES.staleWhileRevalidate;
  }

  event.respondWith(strategy(request));
});

// المزامنة في الخلفية
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(syncPendingData());
  }
});

// إشعارات Push
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'UnionSphere';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/src/imports/image.png',
    badge: '/src/imports/image.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    dir: 'rtl',
    lang: 'ar',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // إذا كان التطبيق مفتوحاً، استخدمه
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // وإلا افتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// مزامنة البيانات المعلقة
async function syncPendingData() {
  try {
    // جلب البيانات المعلقة من IndexedDB
    const db = await openDatabase();
    const pending = await getPendingActions(db);

    // إرسال كل عملية معلقة
    for (const action of pending) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        // حذف العملية بعد النجاح
        await deletePendingAction(db, action.id);
      } catch (error) {
        console.error('[SW] Sync failed for action:', action.id, error);
      }
    }

    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// IndexedDB helpers
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('UnionSphereDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
