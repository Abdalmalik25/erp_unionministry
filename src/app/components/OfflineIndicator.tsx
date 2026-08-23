/**
 * Offline Indicator - مؤشر الحالة (متصل/غير متصل)
 * يظهر في أعلى الصفحة عندما يكون التطبيق بلا إنترنت
 */

import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import { usePendingActions } from '../hooks/useOfflineData';

export function OfflineIndicator() {
  const { isOnline, syncStatus, pendingActions } = useOffline();
  const { syncNow } = usePendingActions();

  if (isOnline) {
    return (
      <div className="hidden" />
    );
  }

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2" dir="rtl">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-warning-dark" />
          <span className="text-sm font-medium text-warning-dark">
            غير متصل بالإنترنت
          </span>
          {pendingActions > 0 && (
            <span className="bg-warning/20 text-warning-dark px-2 py-0.5 rounded-full text-xs font-semibold">
              {pendingActions} عملية معلقة
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw className="w-4 h-4 text-warning-dark animate-spin" />
              <span className="text-xs text-warning-dark">جاري المزامنة...</span>
            </>
          ) : (
            <button
              onClick={syncNow}
              disabled={!isOnline}
              className="text-xs text-warning-dark underline hover:text-warning-dark"
            >
              إعادة المحاولة عند الاتصال
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Connection Status Badge - شارة الحالة في الشريط الجانبي
 */
export function ConnectionStatusBadge() {
  const { isOnline } = useOffline();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-success-dark" />
          <span className="text-sm font-medium text-foreground">متصل</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-error" />
          <span className="text-sm font-medium text-foreground">غير متصل</span>
        </>
      )}
    </div>
  );
}

/**
 * Offline Sync Banner - لافت تنبيهات المزامنة
 */
export function OfflineSyncBanner() {
  const { isOnline, pendingActions, syncStatus } = useOffline();

  if (isOnline && pendingActions === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-primary-bright text-white rounded-xl shadow-2xl p-4 z-40" dir="rtl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1">
            {isOnline ? 'بدأت المزامنة' : 'وضع عدم الاتصال'}
          </h4>
          <p className="text-xs text-blue-100">
            {isOnline 
              ? `جاري مزامنة ${pendingActions} عنصر...`
              : `سيتم مزامنة ${pendingActions} عنصر عند عودة الاتصال`
            }
          </p>
        </div>
        {syncStatus === 'syncing' && (
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        )}
      </div>
    </div>
  );
}