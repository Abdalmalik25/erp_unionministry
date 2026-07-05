/**
 * Online Status Hook - كشف حالة الاتصال
 * مراقبة الاتصال بالإنترنت والإشعارات التلقائية
 */

import { useState, useEffect } from 'react';
import { toast } from '../components/ui/Toast';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  downlink?: number; // سرعة الاتصال
  effectiveType?: string; // نوع الاتصال
  rtt?: number; // زمن الاستجابة
}

export function useOnlineStatus(showNotifications: boolean = true) {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      const wasOffline = !isOnline && status.isOnline;

      // الحصول على معلومات الاتصال
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      setStatus({
        isOnline,
        wasOffline,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
      });

      // إشعارات تلقائية
      if (showNotifications) {
        if (!isOnline) {
          toast.error('انقطع الاتصال بالإنترنت. بعض الميزات قد لا تعمل.');
        } else if (wasOffline) {
          toast.success('تم استعادة الاتصال بالإنترنت.');
        }
      }
    };

    const handleOnline = () => {
      updateOnlineStatus();

      // محاولة إعادة الاتصال بالخادم
      if (showNotifications) {
        checkServerConnection();
      }
    };

    const handleOffline = () => {
      updateOnlineStatus();
    };

    const handleConnectionChange = () => {
      updateOnlineStatus();
    };

    // الاستماع للأحداث
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // فحص دوري كل 30 ثانية
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkServerConnection(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      clearInterval(interval);
    };
  }, [showNotifications, status.isOnline]);

  return status;
}

// فحص الاتصال بالخادم
async function checkServerConnection(showToast: boolean = true): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return true;
    } else {
      if (showToast) {
        toast.warning('يوجد مشكلة في الاتصال بالخادم.');
      }
      return false;
    }
  } catch (error) {
    if (showToast) {
      toast.error('تعذر الاتصال بالخادم.');
    }
    return false;
  }
}

// Component لعرض حالة الاتصال
export function OnlineStatusIndicator() {
  const { isOnline, effectiveType, downlink } = useOnlineStatus(false);

  if (isOnline) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span>متصل</span>
        {effectiveType && (
          <span className="text-gray-500">({effectiveType})</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
      <span>غير متصل</span>
    </div>
  );
}

// Component لتحذير Offline في الصفحة
export function OfflineWarning() {
  const { isOnline } = useOnlineStatus(false);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white px-4 py-3 z-50 shadow-lg" dir="rtl">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <div>
            <p className="font-semibold">انقطع الاتصال بالإنترنت</p>
            <p className="text-sm text-red-100">بعض الميزات قد لا تعمل حتى يتم استعادة الاتصال</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
