/**
 * Service Worker - للعمل دون اتصال
 * تخزين مؤقت ذكي ومزامنة في الخلفية
 * النسخة المحسنة v3 - دعم IndexedDB متقدم
 */

const CACHE_VERSION = 'v6';
const CACHE_NAME = `unionsphere-${CACHE_VERSION}`;
const DB_NAME = 'UnionSphereDB';
const DB_VERSION = 1;

// الملفات الأساسية للتخزين المؤقت
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/theme-init.js',
];

// استراتيجيات التخزين المؤقت
const CACHE_STRATEGIES = {
  // Cache First - للملفات الثابتة
  cacheFirst: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      return cached;
    }
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
      
      // إذا كانت بيانات API وفشل الاتصال، نعيد بيانات فارغة
      if (request.url.includes('/api/')) {
        return new Response(JSON.stringify([]), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
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
    }).catch(() => cached);

    return cached || fetchPromise;
  },
};

// فتح قاعدة البيانات
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// إعداد قاعدة البيانات
function setupIndexedDB(db) {
  const stores = ['unions', 'members', 'activities', 'documents', 'pendingActions', 'cache', 'backups', 'sync_history'];
  stores.forEach(storeName => {
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: 'id' });
    }
  });
}

// التثبيت
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  // تخطي الانتظار فوراً
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
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
    }).then(() => {
      // اختيار العملاء
      return self.clients.claim();
    })
  );
});

// معالجة الطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات الخارجية
  if (url.origin !== location.origin) {
    return;
  }

  // تخطي الطلبات غير GET
  if (request.method !== 'GET') {
    return;
  }

  // التنقل بين الصفحات (SPA) - Network First مع الرجوع للصفحة المخزنة
  // يضمن استمرار العمل دون اتصال وعدم تعليق الملاحة
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/', copy).catch(() => {});
          });
          return response;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // اختيار الاستراتيجية المناسبة
  let strategy;

  if (request.url.includes('/api/')) {
    // API requests - Network First مع fallback للبيانات الفارغة
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
  } else if (event.tag === 'sync-unions') {
    event.waitUntil(syncSpecificTable('unions'));
  } else if (event.tag === 'sync-members') {
    event.waitUntil(syncSpecificTable('members'));
  } else if (event.tag === 'sync-activities') {
    event.waitUntil(syncSpecificTable('activities'));
  }
});

// إشعارات Push
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'UnionSphere';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
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
    const db = await openIndexedDB();
    const pending = await getPendingActions(db);

    // إرسال كل عملية معلقة
    for (const action of pending) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });

        if (response.ok) {
          // حذف العملية بعد النجاح
          await deletePendingAction(db, action.id);
          console.log('[SW] Synced action:', action.id);
        } else {
          console.error('[SW] Sync failed for action:', action.id, response.status);
        }
      } catch (error) {
        console.error('[SW] Sync error for action:', action.id, error);
      }
    }

    // إبلاغ التطبيق بالانتهاء
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        synced: pending.length,
      });
    });

    console.log('[SW] Sync completed');
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// مزامنة جدول محدد
async function syncSpecificTable(tableName) {
  console.log('[SW] Syncing table:', tableName);
  
  // يمكن توسيع هذه الوظيفة لاحقاً
  // حالياً نعيد استخدام syncPendingData
  return syncPendingData();
}

// IndexedDB helpers
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

// رسائل من التطبيق
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CACHE_URLS':
      if (data?.urls) {
        caches.open(CACHE_NAME).then(cache => {
          cache.addAll(data.urls);
        });
      }
      break;
    
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.source?.postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
    
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// حساب حجم الكاش
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('[SW] Get cache size error:', error);
    return 0;
  }
}