/**
 * useOfflineData Hook - جلب البيانات مع دعم العمل أوفلاين
 * يجلب البيانات من الخادم، وإذا فشل، يجلب من IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { db } from '../utils/indexedDB';
import { toast } from '../components/ui/Toast';

interface OfflineQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  saveToLocal: (items: T[]) => Promise<void>;
}

interface OfflineItemResult<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * جلب قائمة من البيانات مع دعم الأوفلاين
 */
export function useOfflineList<T>(
  endpoint: string,
  storeName: string,
  options: { autoSync?: boolean } = {}
): OfflineQueryResult<T> {
  const { isOnline } = useOffline();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('فشل جلب البيانات');
        
        const result = await response.json();
        setData(result.data || result);
        
        if (options.autoSync !== false) {
          await db.putMany(storeName, result.data || result);
        }
      } else {
        const result = await db.getAll<T>(storeName);
        setData(result);
        toast.info('عرض البيانات المخزنة محلياً');
      }
    } catch (err) {
      setError(err as Error);
      try {
        const result = await db.getAll<T>(storeName);
        if (result.length > 0) {
          setData(result);
          toast.warning('عرض البيانات المخزنة محلياً (بدون اتصال)');
        }
      } catch (offlineErr) {
        toast.error('فشل جلب البيانات');
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, storeName, isOnline, options.autoSync]);

  const saveToLocal = useCallback(async (items: T[]) => {
    try {
      await db.putMany(storeName, items);
      setData(items);
    } catch (err) {
      toast.error('فشل حفظ البيانات محلياً');
    }
  }, [storeName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOffline: !isOnline,
    error,
    refetch: fetchData,
    saveToLocal,
  };
}

/**
 * جلب عنصر واحد من البيانات مع دعم الأوفلاين
 */
export function useOfflineItem<T>(
  endpoint: string,
  storeName: string,
  id: string | number
): OfflineItemResult<T> {
  const { isOnline } = useOffline();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        const response = await fetch(`${endpoint}/${id}`);
        if (!response.ok) throw new Error('فشل جلب البيانات');
        
        const result = await response.json();
        setData(result.data || result);
      } else {
        const result = await db.get<T>(storeName, id);
        setData(result || null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, id, isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOffline: !isOnline,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook لمزامنة البيانات المعلقة
 */
export function usePendingActions() {
  const { syncAll, pendingActions, syncStatus } = useOffline();
  const [actions, setActions] = useState<any[]>([]);

  const refreshActions = useCallback(async () => {
    const pending = await db.getAll('pendingActions');
    setActions(pending);
  }, []);

  useEffect(() => {
    refreshActions();
    const interval = setInterval(refreshActions, 5000);
    return () => clearInterval(interval);
  }, [refreshActions]);

  return {
    actions,
    count: pendingActions,
    syncStatus,
    refresh: refreshActions,
    syncNow: syncAll,
  };
}

/**
 * Hook لعرض حالة الاتصال
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine ?? true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.success('تم الاتصال بالإنترنت مرة أخرى');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.warning('بدأ التطبيق في العمل دون اتصال');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}