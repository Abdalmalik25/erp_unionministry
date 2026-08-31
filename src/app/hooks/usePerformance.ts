import { useEffect, useRef, useCallback } from 'react';

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
  page: string;
}

interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
  detail?: Record<string, unknown>;
}

const marks = new Map<string, PerformanceMark>();
const measures = new Map<string, number>();

const thresholds: Record<string, [number, number]> = {
  CLS: [0.1, 0.25],
  FID: [100, 300],
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function rateMetric(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const [good, poor] = thresholds[name] || [0, Infinity];
  if (value <= good) return 'good';
  if (value >= poor) return 'poor';
  return 'needs-improvement';
}

function sendToAnalytics(metric: WebVitalsMetric) {
  const body = JSON.stringify(metric);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/metrics/web-vitals', body);
  } else {
    fetch('/api/metrics/web-vitals', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
}

function onCLS(onReport: (metric: WebVitalsMetric) => void) {
  let clsValue = 0;
  let sessionValue = 0;
  const sessionEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
        const value = (entry as any).value;
        sessionValue += value;
        sessionEntries.push(entry);

        if (sessionValue > clsValue) {
          clsValue = sessionValue;
        }

        const metric: WebVitalsMetric = {
          name: 'CLS',
          value: clsValue,
          rating: rateMetric('CLS', clsValue),
          delta: sessionValue,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          page: window.location.pathname,
        };
        onReport(metric);
      }
    }
  });

  observer.observe({ type: 'layout-shift', buffered: true });
  return observer;
}

function onFID(onReport: (metric: WebVitalsMetric) => void) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'first-input') {
        const delay = (entry as PerformanceEntry & { processingStart?: number }).processingStart
          ? (entry as PerformanceEntry & { processingStart?: number }).processingStart - entry.startTime
          : entry.startTime;
        const metric: WebVitalsMetric = {
          name: 'FID',
          value: delay,
          rating: rateMetric('FID', delay),
          delta: delay,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          page: window.location.pathname,
        };
        onReport(metric);
      }
    }
  });

  observer.observe({ type: 'first-input', buffered: true });
  return observer;
}

function onINP(onReport: (metric: WebVitalsMetric) => void) {
  let inpValue = 0;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'event' && (entry as any).processingStart) {
        const delay = (entry as any).processingStart - entry.startTime;
        inpValue = Math.max(inpValue, delay);
      }
    }

    if (inpValue > 0) {
      const metric: WebVitalsMetric = {
        name: 'INP',
        value: inpValue,
        rating: rateMetric('INP', inpValue),
        delta: inpValue,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        page: window.location.pathname,
      };
      onReport(metric);
    }
  });

  observer.observe({ type: 'event', buffered: true });
  return observer;
}

function onLCP(onReport: (metric: WebVitalsMetric) => void) {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { size?: number };

    if (lastEntry) {
      const metric: WebVitalsMetric = {
        name: 'LCP',
        value: lastEntry.startTime,
        rating: rateMetric('LCP', lastEntry.startTime),
        delta: lastEntry.startTime,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        page: window.location.pathname,
      };
      onReport(metric);
    }
  });

  observer.observe({ type: 'largest-contentful-paint', buffered: true });
  return observer;
}

function onFCP(onReport: (metric: WebVitalsMetric) => void) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        const metric: WebVitalsMetric = {
          name: 'FCP',
          value: entry.startTime,
          rating: rateMetric('FCP', entry.startTime),
          delta: entry.startTime,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          page: window.location.pathname,
        };
        onReport(metric);
      }
    }
  });

  observer.observe({ type: 'paint', buffered: true });
  return observer;
}

function onTTFB(onReport: (metric: WebVitalsMetric) => void) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        const metric: WebVitalsMetric = {
          name: 'TTFB',
          value: ttfb,
          rating: rateMetric('TTFB', ttfb),
          delta: ttfb,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          page: window.location.pathname,
        };
        onReport(metric);
      }
    }
  });

  observer.observe({ type: 'navigation', buffered: true });
  return observer;
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  const reportAll = (metric: WebVitalsMetric) => {
    sendToAnalytics(metric);
  };

  try {
    onCLS(reportAll);
    onFID(reportAll);
    onINP(reportAll);
    onLCP(reportAll);
    onFCP(reportAll);
    onTTFB(reportAll);
  } catch (e) {
    console.warn('Web Vitals not fully supported:', e);
  }
}

export function mark(name: string, detail?: Record<string, unknown>) {
  marks.set(name, { name, startTime: performance.now(), detail });
  performance.mark(name);
}

export function measure(name: string, startMark: string, endMark?: string) {
  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, { start: startMark });
    }
    const entries = performance.getEntriesByName(name, 'measure');
    const duration = entries[entries.length - 1]?.duration;
    measures.set(name, duration || 0);
    return duration;
  } catch {
    return 0;
  }
}

export function getMark(name: string): PerformanceMark | undefined {
  return marks.get(name);
}

export function getMeasure(name: string): number | undefined {
  return measures.get(name);
}

export function getAllMarks(): PerformanceMark[] {
  return Array.from(marks.values());
}

export function getAllMeasures(): Record<string, number> {
  return Object.fromEntries(measures);
}

export function clearMarks(name?: string) {
  if (name) {
    marks.delete(name);
    performance.clearMarks(name);
  } else {
    marks.clear();
    performance.clearMarks();
  }
}

export function clearMeasures(name?: string) {
  if (name) {
    measures.delete(name);
    performance.clearMeasures(name);
  } else {
    measures.clear();
    performance.clearMeasures();
  }
}

export function getNavigationTiming(): PerformanceNavigationTiming | null {
  const entries = performance.getEntriesByType('navigation');
  return (entries[0] as PerformanceNavigationTiming) || null;
}

export function getResourceTiming(): PerformanceResourceTiming[] {
  return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
}

export function getLongTasks(): PerformanceEntry[] {
  return performance.getEntriesByType('longtask');
}

export function onLongTask(callback: (entry: PerformanceEntry) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry);
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
    return observer;
  } catch {
    return null;
  }
}

export function usePerformanceMonitor() {
  const marksRef = useRef<Record<string, number>>({});

  const start = useCallback((name: string) => {
    marksRef.current[name] = performance.now();
    performance.mark(`${name}-start`);
  }, []);

  const end = useCallback((name: string) => {
    const startTime = marksRef.current[name];
    if (startTime) {
      const duration = performance.now() - startTime;
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      delete marksRef.current[name];
      return duration;
    }
    return 0;
  }, []);

  const measureAsync = useCallback(async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    start(name);
    try {
      const result = await fn();
      end(name);
      return result;
    } catch (e) {
      end(name);
      throw e;
    }
  }, [start, end]);

  return { start, end, measureAsync, measure };
}

export function useWebVitals() {
  useEffect(() => {
    initWebVitals();
  }, []);
}

export default { initWebVitals, mark, measure, getMark, getMeasure, getNavigationTiming, getResourceTiming, getLongTasks, onLongTask, usePerformanceMonitor, useWebVitals };