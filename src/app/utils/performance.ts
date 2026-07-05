/**
 * Performance Utilities - أدوات تحسين الأداء
 * تحسينات ذكية للأداء والتفاعل
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================
// Debouncing - تأخير تنفيذ الدالة
// ============================================
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Hook للـ Debounce
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// Throttling - تحديد معدل التنفيذ
// ============================================
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================
// Memoization - التخزين المؤقت للنتائج
// ============================================
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================
// Local Storage Cache - تخزين مؤقت ذكي
// ============================================
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key: string;
}

export function useLocalStorageCache<T>(options: CacheOptions) {
  const { key, ttl = 5 * 60 * 1000 } = options; // Default 5 minutes

  const get = useCallback((): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const { value, timestamp } = JSON.parse(item);
      const now = Date.now();

      if (ttl && now - timestamp > ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return value;
    } catch {
      return null;
    }
  }, [key, ttl]);

  const set = useCallback(
    (value: T) => {
      try {
        const item = {
          value,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(item));
      } catch (error) {
        console.error('Cache set error:', error);
      }
    },
    [key]
  );

  const remove = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return { get, set, remove };
}

// ============================================
// Intersection Observer - كشف ظهور العناصر
// ============================================
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return { isIntersecting, hasIntersected };
}

// ============================================
// Image Lazy Loading - تحميل الصور الكسول
// ============================================
export function useLazyImage(src: string) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver;

    if (imageRef) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.disconnect();
            }
          });
        },
        { rootMargin: '50px' }
      );

      observer.observe(imageRef);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [imageRef, src]);

  return [imageSrc, setImageRef] as const;
}

// ============================================
// Optimistic Updates - تحديثات متفائلة
// ============================================
export function useOptimisticUpdate<T>() {
  const [data, setData] = useState<T | null>(null);
  const [tempData, setTempData] = useState<T | null>(null);

  const optimisticUpdate = useCallback(
    async (
      newData: T,
      apiCall: () => Promise<T>,
      onSuccess?: (data: T) => void,
      onError?: (error: any) => void
    ) => {
      // حفظ البيانات الحالية
      const previousData = data;

      // تحديث فوري (optimistic)
      setTempData(newData);

      try {
        // استدعاء API
        const result = await apiCall();

        // تحديث البيانات الفعلية
        setData(result);
        setTempData(null);

        if (onSuccess) onSuccess(result);
      } catch (error) {
        // إرجاع البيانات القديمة في حالة الفشل
        setData(previousData);
        setTempData(null);

        if (onError) onError(error);
      }
    },
    [data]
  );

  return {
    data: tempData || data,
    optimisticUpdate,
    setData,
  };
}

// ============================================
// Request Batching - تجميع الطلبات
// ============================================
export class RequestBatcher<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: any) => void;
  }> = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private batchDelay: number;
  private batchFn: (items: T[]) => Promise<R[]>;

  constructor(batchFn: (items: T[]) => Promise<R[]>, batchDelay: number = 50) {
    this.batchFn = batchFn;
    this.batchDelay = batchDelay;
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        this.flush();
      }, this.batchDelay);
    });
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const currentQueue = [...this.queue];
    this.queue = [];

    try {
      const items = currentQueue.map((q) => q.item);
      const results = await this.batchFn(items);

      currentQueue.forEach((q, index) => {
        q.resolve(results[index]);
      });
    } catch (error) {
      currentQueue.forEach((q) => {
        q.reject(error);
      });
    }
  }
}

// ============================================
// Retry Logic - إعادة المحاولة
// ============================================
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = 2, onRetry } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        if (onRetry) onRetry(attempt, error);

        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

// ============================================
// Idle Callback - تنفيذ عند الخمول
// ============================================
export function useIdleCallback(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    const handle = requestIdleCallback
      ? requestIdleCallback(callback)
      : setTimeout(callback, 1);

    return () => {
      if (typeof handle === 'number') {
        if (requestIdleCallback) {
          cancelIdleCallback(handle);
        } else {
          clearTimeout(handle);
        }
      }
    };
  }, deps);
}

// ============================================
// Performance Monitoring - مراقبة الأداء
// ============================================
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  start(name: string) {
    this.marks.set(name, performance.now());
  }

  end(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  measure(name: string, fn: () => any) {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  async measureAsync(name: string, fn: () => Promise<any>) {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }
}

export const perfMonitor = new PerformanceMonitor();

// ============================================
// Chunk Array - تقسيم المصفوفات الكبيرة
// ============================================
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

// ============================================
// Process in Batches - معالجة دفعية
// ============================================
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const batches = chunkArray(items, batchSize);
  const results: R[] = [];
  let processed = 0;

  for (const batch of batches) {
    const batchResults = await processor(batch);
    results.push(...batchResults);

    processed += batch.length;
    if (onProgress) {
      onProgress(processed, items.length);
    }
  }

  return results;
}
