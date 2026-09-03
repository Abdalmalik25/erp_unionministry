/**
 * Performance Metrics Hook - Web Vitals + Custom Metrics
 *
 * Metrics collected:
 * - Core Web Vitals: LCP, FID, CLS, INP, TTFB
 * - Custom: FCP, SI, TTI, TBT
 * - Resource timing: JS/CSS load times
 * - API latency tracking
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router';

// Types
interface WebVitals {
  lcp?: number;
  fid?: number;
  cls?: number;
  inp?: number;
  ttfb?: number;
  fcp?: number;
  si?: number;
  tti?: number;
  tbt?: number;
}

interface ResourceTiming {
  name: string;
  type: string;
  duration: number;
  size: number;
  dns: number;
  tcp: number;
  ttfb: number;
}

interface APIMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  cached: boolean;
}

interface PerformanceMetrics {
  vitals: WebVitals;
  resources: ResourceTiming[];
  apiCalls: APIMetrics[];
  navigationTiming: PerformanceNavigationTiming | null;
}

// Singleton metrics store
const metricsStore: PerformanceMetrics = {
  vitals: {},
  resources: [],
  apiCalls: [],
  navigationTiming: null,
};

const observers: PerformanceObserver[] = [];

function observePerformanceEntry(
  entryType: string,
  callback: (entry: PerformanceEntry) => void
): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') return null;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(callback);
    });
    observer.observe({ type: entryType, buffered: true });
    observers.push(observer);
    return observer;
  } catch {
    return null;
  }
}

function measureCoreWebVitals(): void {
  observePerformanceEntry('largest-contentful-paint', (entry) => {
    const lcp = entry as PerformancePaintTiming;
    metricsStore.vitals.lcp = lcp.startTime;
    reportMetric('LCP', lcp.startTime, 'ms', { target: 2500 });
  });

  observePerformanceEntry('first-input', (entry) => {
    const fid = entry as PerformanceEventTiming;
    metricsStore.vitals.fid = fid.processingStart - fid.startTime;
    reportMetric('FID', fid.processingStart - fid.startTime, 'ms', { target: 100 });
  });

  observePerformanceEntry('layout-shift', (entry) => {
    const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
    if (!clsEntry.hadRecentInput) {
      metricsStore.vitals.cls = (metricsStore.vitals.cls || 0) + (clsEntry.value || 0);
      reportMetric('CLS', metricsStore.vitals.cls, 'score', { target: 0.1 });
    }
  });

  observePerformanceEntry('event', (entry) => {
    const event = entry as PerformanceEventTiming;
    if (event.duration > 50) {
      const inp = event.duration;
      if (!metricsStore.vitals.inp || inp > metricsStore.vitals.inp) {
        metricsStore.vitals.inp = inp;
        reportMetric('INP', inp, 'ms', { target: 200 });
      }
    }
  });

  observePerformanceEntry('navigation', (entry) => {
    const nav = entry as PerformanceNavigationTiming;
    metricsStore.navigationTiming = nav;

    const ttfb = nav.responseStart - nav.requestStart;
    metricsStore.vitals.ttfb = ttfb;
    reportMetric('TTFB', ttfb, 'ms', { target: 800 });

    metricsStore.vitals.fcp = nav.domContentLoadedEventEnd - nav.requestStart;
    metricsStore.vitals.tti = nav.domContentLoadedEventEnd - nav.requestStart;
  });
}

function measureResourceTiming(): void {
  observePerformanceEntry('resource', (entry) => {
    const resource = entry as PerformanceResourceTiming;
    const timing: ResourceTiming = {
      name: resource.name,
      type: getResourceType(resource.name),
      duration: resource.responseEnd - resource.startTime,
      size: resource.transferSize || 0,
      dns: resource.domainLookupEnd - resource.domainLookupStart,
      tcp: resource.connectEnd - resource.connectStart,
      ttfb: resource.responseStart - resource.startTime,
    };
    metricsStore.resources.push(timing);

    if (timing.duration > 1000) {
      reportMetric('SLOW_RESOURCE', timing.duration, 'ms', {
        target: 1000,
        metadata: { name: timing.name, type: timing.type },
      });
    }
  });
}

function getResourceType(url: string): string {
  if (url.includes('.js')) return 'script';
  if (url.includes('.css')) return 'style';
  if (url.includes('.woff2') || url.includes('.woff')) return 'font';
  if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
  if (url.includes('/api/')) return 'api';
  return 'other';
}

function reportMetric(
  name: string,
  value: number,
  unit: string,
  options: { target?: number; metadata?: Record<string, unknown> } = {}
): void {
  const rating = options.target
    ? value <= options.target
      ? 'good'
      : value <= options.target * 2
        ? 'needs-improvement'
        : 'poor'
    : 'unknown';

  if (import.meta.env.DEV) {
    const color = rating === 'good' ? '#22c55e' : rating === 'needs-improvement' ? '#eab308' : '#ef4444';
    console.warn(`[WebVitals] ${name}: ${value.toFixed(2)} ${unit} (${rating}) — ${color}`);
  }

  if (typeof window !== 'undefined') {
    (window as unknown as { __PERFORMANCE_METRICS__?: unknown[] }).__PERFORMANCE_METRICS__ = [
      ...((window as unknown as { __PERFORMANCE_METRICS__?: unknown[] }).__PERFORMANCE_METRICS__ || []),
      { name, value, unit, rating, timestamp: Date.now(), metadata: options.metadata },
    ];
  }

  const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (analyticsEndpoint && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(analyticsEndpoint, JSON.stringify({ name, value, unit, rating }));
  }
}

export function useAPIMetrics(): {
  trackApiCall: (metrics: Omit<APIMetrics, 'timestamp'>) => void;
} {
  const trackApiCall = useCallback((metrics: Omit<APIMetrics, 'timestamp'>) => {
    const entry: APIMetrics = { ...metrics, timestamp: Date.now() };
    metricsStore.apiCalls.push(entry);

    if (metrics.duration > 2000) {
      reportMetric('SLOW_API', metrics.duration, 'ms', {
        target: 2000,
        metadata: { endpoint: metrics.endpoint, status: metrics.status },
      });
    }
  }, []);

  return { trackApiCall };
}

export function usePerformanceMetrics(): PerformanceMetrics & {
  getSummary: () => { score: number; issues: string[]; recommendations: string[] };
} {
  const location = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    measureCoreWebVitals();
    measureResourceTiming();

    if (typeof window !== 'undefined' && 'performance' in window) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        metricsStore.navigationTiming = navEntries[0] as PerformanceNavigationTiming;
      }
    }

    return () => {
      observers.forEach((obs) => obs.disconnect());
      observers.length = 0;
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn('[Navigation]', location.pathname, metricsStore);
    }
  }, [location]);

  const getSummary = useCallback(() => {
    const { vitals } = metricsStore;
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (vitals.lcp && vitals.lcp > 2500) {
      issues.push(`LCP: ${vitals.lcp.toFixed(0)}ms (target: 2500ms)`);
      score -= 20;
      recommendations.push('Optimize LCP: Use faster CDN, preload hero image, reduce server response time');
    }

    if (vitals.fid && vitals.fid > 100) {
      issues.push(`FID: ${vitals.fid.toFixed(0)}ms (target: 100ms)`);
      score -= 15;
      recommendations.push('Optimize FID: Break up long tasks, defer non-critical JS');
    }

    if (vitals.cls && vitals.cls > 0.1) {
      issues.push(`CLS: ${vitals.cls.toFixed(3)} (target: 0.1)`);
      score -= 25;
      recommendations.push('Optimize CLS: Set dimensions on images, avoid injecting content above existing content');
    }

    if (vitals.ttfb && vitals.ttfb > 800) {
      issues.push(`TTFB: ${vitals.ttfb.toFixed(0)}ms (target: 800ms)`);
      score -= 20;
      recommendations.push('Optimize TTFB: Enable compression, use CDN, optimize database queries');
    }

    if (vitals.inp && vitals.inp > 200) {
      issues.push(`INP: ${vitals.inp.toFixed(0)}ms (target: 200ms)`);
      score -= 15;
      recommendations.push('Optimize INP: Reduce JavaScript execution time, optimize event handlers');
    }

    const slowResources = metricsStore.resources.filter((r) => r.duration > 1000);
    if (slowResources.length > 0) {
      recommendations.push(`${slowResources.length} slow resources detected - consider lazy loading or caching`);
    }

    const slowApiCalls = metricsStore.apiCalls.filter((a) => a.duration > 2000);
    if (slowApiCalls.length > 0) {
      recommendations.push(`${slowApiCalls.length} slow API calls - consider query optimization or caching`);
    }

    return { score: Math.max(0, score), issues, recommendations };
  }, []);

  return { ...metricsStore, getSummary };
}

export function getMetricsStore(): PerformanceMetrics {
  return { ...metricsStore };
}

export function reportCustomMetric(
  name: string,
  value: number,
  unit: string = 'ms',
  target?: number
): void {
  reportMetric(name, value, unit, { target });
}
