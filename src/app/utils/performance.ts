/**
 * Performance Utilities — Lazy loading, prefetch, code splitting helpers
 */
import { ComponentType, lazy, LazyExoticComponent } from 'react';

type PreloadableFactory<T extends ComponentType<unknown>> = () => Promise<{ default: T }>;

/**
 * Lazy load with preload on hover/focus intent
 */
export function lazyWithPreload<T extends ComponentType<unknown>>(
  factory: PreloadableFactory<T>,
  preloadDelay = 200
): LazyExoticComponent<T> & { preload: () => void } {
  let preloadTriggered = false;
  let preloadPromise: Promise<{ default: T }> | null = null;

  const triggerPreload = (): void => {
    if (preloadTriggered) return;
    preloadTriggered = true;
    preloadPromise = factory();
  };

  const Component = lazy(() => {
    if (preloadPromise) return preloadPromise;
    return new Promise<{ default: T }>((resolve) => {
      setTimeout(() => {
        triggerPreload();
        resolve(preloadPromise!);
      }, preloadDelay);
    });
  });

  (Component as LazyExoticComponent<T> & { preload: () => void }).preload = triggerPreload;
  return Component as LazyExoticComponent<T> & { preload: () => void };
}

/**
 * Preload a route on link hover/focus
 */
export function preloadOnIntent(factory: () => Promise<unknown>, delay = 150): {
  onMouseEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
  preload: () => void;
} {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let loaded = false;

  const preload = (): void => {
    if (loaded) return;
    loaded = true;
    if (timeout) clearTimeout(timeout);
    factory();
  };

  const schedule = (): void => {
    if (loaded || timeout) return;
    timeout = setTimeout(preload, delay);
  };

  return {
    onMouseEnter: schedule,
    onFocus: schedule,
    onTouchStart: schedule,
    preload,
  };
}

/**
 * Web Vitals reporter (Core Web Vitals + custom)
 */
export interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
}

const VITALS_THRESHOLDS: Record<string, [number, number]> = {
  CLS: [0.1, 0.25],
  FID: [100, 300],
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function rateVital(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[name];
  if (!thresholds) return 'good';
  const [good, poor] = thresholds;
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

let vitalsObserved = false;
const vitalsCallbacks: Array<(v: WebVital) => void> = [];

export function reportWebVitals(onVital?: (v: WebVital) => void): void {
  if (typeof window === 'undefined' || vitalsObserved) return;
  vitalsObserved = true;

  if (onVital) vitalsCallbacks.push(onVital);

  const report = (entry: PerformanceEntry): void => {
    const vital: WebVital = {
      name: entry.name,
      value: entry.startTime,
      rating: rateVital(entry.name, entry.startTime),
      id: generateId(),
    };
    vitalsCallbacks.forEach((cb) => {
      try {
        cb(vital);
      } catch {
        /* ignore */
      }
    });

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[WebVital]', vital.name, vital.value, vital.rating);
    }

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(vital)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/vitals', blob);
    }
  };

  try {
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach(report);
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
    po.observe({ type: 'first-input', buffered: true });
    po.observe({ type: 'layout-shift', buffered: true });
    po.observe({ type: 'navigation', buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

function generateId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Image lazy loading with native loading attribute + intersection observer fallback
 */
export function useImagePreload(src: string): boolean {
  if (typeof window === 'undefined') return false;
  // Just returns whether the image is in the document
  return Array.from(document.images).some((img) => img.src === src);
}

/**
 * Resource prefetch hints
 */
export function prefetchResource(href: string, as: 'script' | 'style' | 'image' | 'fetch' | 'font'): void {
  if (typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = as;
  link.href = href;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

export function preloadResource(href: string, as: 'script' | 'style' | 'image' | 'fetch' | 'font'): void {
  if (typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Idle callback wrapper
 */
export function whenIdle(callback: () => void, timeout = 2000): void {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Throttle using requestAnimationFrame
 */
export function rafThrottle<T extends (...args: unknown[]) => void>(fn: T): T {
  let rafId: number | null = null;
  return ((...args: unknown[]) => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      fn(...args);
      rafId = null;
    });
  }) as T;
}

/**
 * Debounce with leading + trailing options
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCall = 0;

  const debounced = ((...args: unknown[]) => {
    const now = Date.now();
    const shouldCallNow = options.leading && (now - lastCall) > delay;

    if (timer) clearTimeout(timer);

    if (shouldCallNow) {
      lastCall = now;
      fn(...args);
    } else {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        if (options.trailing !== false) fn(...args);
      }, delay);
    }
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}

/**
 * إحصائيات الأداء المجمّعة (للعرض في DiagnosticPanel)
 */
export interface PerfStats {
  memoryUsageMB: number | null;
  timingNavigationStart: number | null;
  timingLoadEventEnd: number | null;
  connectionEffectiveType: string | null;
  deviceMemoryGB: number | null;
  hardwareConcurrency: number | null;
  serviceWorkerStatus: string;
}

export function getStats(): PerfStats {
  const nav = typeof performance !== 'undefined' ? performance : null;
  const navTiming = nav?.timing ?? null;
  const navMem = (nav as Performance & { memory?: { usedJSHeapSize: number } })?.memory ?? null;
  const navInfo = nav as Performance & { connection?: { effectiveType: string }; deviceMemory?: number; hardwareConcurrency?: number };

  return {
    memoryUsageMB: navMem ? Math.round(navMem.usedJSHeapSize / 1024 / 1024) : null,
    timingNavigationStart: navTiming?.navigationStart ?? null,
    timingLoadEventEnd: navTiming?.loadEventEnd ?? null,
    connectionEffectiveType: navInfo?.connection?.effectiveType ?? null,
    deviceMemoryGB: navInfo?.deviceMemory ?? null,
    hardwareConcurrency: navInfo?.hardwareConcurrency ?? null,
    serviceWorkerStatus: typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? navigator.serviceWorker.controller ? 'controlled' : 'registered'
      : 'unsupported',
  };
}
