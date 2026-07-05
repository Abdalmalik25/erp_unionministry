/**
 * Auto Save Hook - الحفظ التلقائي
 * حفظ تلقائي للنماذج لتجنب فقدان البيانات
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDebounce } from '../utils/performance';

interface AutoSaveOptions<T> {
  key: string; // مفتاح التخزين
  data: T; // البيانات المراد حفظها
  delay?: number; // التأخير قبل الحفظ (ms)
  onSave?: (data: T) => Promise<void>; // دالة الحفظ في الخادم
  onRestore?: (data: T) => void; // دالة الاستعادة
  enabled?: boolean; // تفعيل/تعطيل
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasChanges: boolean;
  error: string | null;
}

export function useAutoSave<T>({
  key,
  data,
  delay = 2000,
  onSave,
  onRestore,
  enabled = true,
}: AutoSaveOptions<T>) {
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasChanges: false,
    error: null,
  });

  const debouncedData = useDebounce(data, delay);
  const isFirstRender = useRef(true);
  const previousDataRef = useRef<T>(data);

  // استعادة البيانات المحفوظة عند التحميل
  useEffect(() => {
    if (!enabled) return;

    try {
      const saved = localStorage.getItem(`autosave:${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (onRestore) {
          onRestore(parsed.data);
        }
        setState((prev) => ({ ...prev, lastSaved: new Date(parsed.timestamp) }));
      }
    } catch (error) {
      console.error('Auto-save restore error:', error);
    }
  }, [key, enabled]);

  // حفظ تلقائي
  useEffect(() => {
    if (!enabled || isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // التحقق من وجود تغييرات
    const hasChanges = JSON.stringify(debouncedData) !== JSON.stringify(previousDataRef.current);

    if (!hasChanges) return;

    const saveData = async () => {
      setState((prev) => ({ ...prev, isSaving: true, hasChanges: true, error: null }));

      try {
        // الحفظ المحلي
        const saveItem = {
          data: debouncedData,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(`autosave:${key}`, JSON.stringify(saveItem));

        // الحفظ في الخادم (اختياري)
        if (onSave) {
          await onSave(debouncedData);
        }

        setState({
          isSaving: false,
          lastSaved: new Date(),
          hasChanges: false,
          error: null,
        });

        previousDataRef.current = debouncedData;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: error.message || 'فشل الحفظ التلقائي',
        }));
      }
    };

    saveData();
  }, [debouncedData, enabled, key, onSave]);

  // حذف البيانات المحفوظة
  const clearSaved = useCallback(() => {
    localStorage.removeItem(`autosave:${key}`);
    setState({
      isSaving: false,
      lastSaved: null,
      hasChanges: false,
      error: null,
    });
  }, [key]);

  // الحفظ اليدوي الفوري
  const saveNow = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      const saveItem = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`autosave:${key}`, JSON.stringify(saveItem));

      if (onSave) {
        await onSave(data);
      }

      setState({
        isSaving: false,
        lastSaved: new Date(),
        hasChanges: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: error.message || 'فشل الحفظ',
      }));
    }
  }, [data, enabled, key, onSave]);

  return {
    ...state,
    clearSaved,
    saveNow,
  };
}

// Component لعرض حالة الحفظ التلقائي
export function AutoSaveIndicator({
  isSaving,
  lastSaved,
  hasChanges,
  error,
}: AutoSaveState) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-600">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        <span>فشل الحفظ التلقائي</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-xs text-blue-600">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        <span>جاري الحفظ...</span>
      </div>
    );
  }

  if (hasChanges) {
    return (
      <div className="flex items-center gap-2 text-xs text-orange-600">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        <span>تغييرات غير محفوظة</span>
      </div>
    );
  }

  if (lastSaved) {
    const timeAgo = getTimeAgo(lastSaved);
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span>تم الحفظ {timeAgo}</span>
      </div>
    );
  }

  return null;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'الآن';
  if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;

  return `منذ ${Math.floor(seconds / 86400)} يوم`;
}
