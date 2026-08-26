/**
 * PWA Utilities - أدوات التطبيق التقدمي
 * تسجيل Service Worker وإدارة التثبيت
 */

import { toast } from '../components/ui/Toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * تسجيل Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    if (import.meta.env.DEV) console.warn('[PWA] Service Worker not supported');
    return null;
  }

  // تعطيل في بيئة Figma Make (iframe preview)
  if (window.location.hostname.includes('figma.site') || window.location.hostname.includes('makeproxy')) {
    // معطل في بيئة Figma Make - سيعمل في Production
    return null;
  }

  // تعطيل في Development (اختياري)
  if (import.meta.env.DEV) {
    // معطل في Development - سيعمل في Production
    return null;
  }

  try {
    // التحقق من وجود الملف أولاً
    const checkResponse = await fetch('/sw.js', { method: 'HEAD' });
    if (!checkResponse.ok || !checkResponse.headers.get('content-type')?.includes('javascript')) {
      if (import.meta.env.DEV) console.warn('[PWA] Service Worker file not found or incorrect MIME type');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    if (import.meta.env.DEV) console.warn('[PWA] Service Worker registered:', registration.scope);

    // الاستماع للتحديثات
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
           if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
             toast.info('يتوفر تحديث جديد. أعد تحميل الصفحة للحصول عليه.', {
               duration: 10000,
           });
           }
      });
    });

    return registration;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * إلغاء تسجيل Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return await registration.unregister();
    }
    return false;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * التحقق من إمكانية التثبيت
 */
export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

/**
 * إعداد حدث التثبيت
 */
export function setupInstallPrompt() {
  // تعطيل في بيئة Figma Make
  if (window.location.hostname.includes('figma.site') || window.location.hostname.includes('makeproxy')) {
    return;
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    if (import.meta.env.DEV) console.warn('[PWA] Install prompt ready');

    // إظهار زر التثبيت
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    if (import.meta.env.DEV) console.warn('[PWA] App installed');
    deferredPrompt = null;
    toast.success('تم تثبيت التطبيق بنجاح!');
  });
}

/**
 * عرض نافذة التثبيت
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    if (import.meta.env.DEV) console.warn('[PWA] Install prompt not available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (import.meta.env.DEV) console.warn('[PWA] Install outcome:', outcome);

    if (outcome === 'accepted') {
      toast.success('شكراً لتثبيت التطبيق!');
      return true;
    } else {
      toast.info('يمكنك تثبيت التطبيق لاحقاً من القائمة');
      return false;
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Install prompt error:', error);
    return false;
  } finally {
    deferredPrompt = null;
  }
}

/**
 * التحقق من كون التطبيق مثبتاً
 */
export function isPWAInstalled(): boolean {
  // في وضع Standalone
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // في iOS
  if ((navigator as any).standalone === true) {
    return true;
  }

  return false;
}

/**
 * طلب إذن الإشعارات
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    if (import.meta.env.DEV) console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      toast.success('تم تفعيل الإشعارات بنجاح');
    } else {
      toast.warning('يمكنك تفعيل الإشعارات لاحقاً من الإعدادات');
    }

    return permission;
  }

  return 'denied';
}

/**
 * الاشتراك في Push Notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (import.meta.env.DEV) console.warn('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // يجب استبدال هذا بالمفتاح العام من الخادم
        import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
      ),
    });

    if (import.meta.env.DEV) console.warn('[PWA] Push subscription:', subscription);

    // إرسال الاشتراك للخادم
    await sendSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Push subscription error:', error);
    return null;
  }
}

/**
 * إلغاء الاشتراك في الإشعارات
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      if (import.meta.env.DEV) console.warn('[PWA] Unsubscribed from push');
      return true;
    }

    return false;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Unsubscribe error:', error);
    return false;
  }
}

/**
 * مزامنة في الخلفية
 */
export async function requestBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('sync' in navigator.serviceWorker)) {
    if (import.meta.env.DEV) console.warn('[PWA] Background sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
    if (import.meta.env.DEV) console.warn('[PWA] Background sync registered:', tag);
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Background sync error:', error);
  }
}

/**
 * مساعدات
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer;
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Failed to send subscription to server:', error);
  }
}

/**
 * مسح الكاش
 */
export async function clearCache(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    if (import.meta.env.DEV) console.warn('[PWA] Cache cleared');
    toast.success('تم مسح الذاكرة المؤقتة');
  } catch (error) {
    if (import.meta.env.DEV) console.error('[PWA] Clear cache error:', error);
    toast.error('فشل مسح الذاكرة المؤقتة');
  }
}

/**
 * الحصول على حجم الكاش
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }

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
    if (import.meta.env.DEV) console.error('[PWA] Get cache size error:', error);
    return 0;
  }
}

/**
 * تنسيق حجم الملف
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
