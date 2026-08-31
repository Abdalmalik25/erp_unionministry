/**
 * performance.test.ts — اختبارات أدوات الأداء
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  lazyWithPreload,
  preloadOnIntent,
  getStats,
  PerfStats,
  debounce,
  rafThrottle,
} from './performance';

// Mock browser globals that are not available in Node.js test environment
beforeEach(() => {
  if (typeof requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;
  }
  if (typeof cancelAnimationFrame === 'undefined') {
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
});

describe('lazyWithPreload', () => {
  it('should expose a preload function', () => {
    const factory = () => Promise.resolve({ default: () => null });
    const Comp = lazyWithPreload(factory);
    expect(typeof Comp.preload).toBe('function');
    Comp.preload();
  });

  it('should call factory on preload', async () => {
    const factory = vi.fn().mockResolvedValue({ default: () => null });
    const Comp = lazyWithPreload(factory);
    Comp.preload();
    // Wait for promise to resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('preloadOnIntent', () => {
  it('should return handler object', () => {
    const factory = vi.fn().mockResolvedValue(undefined);
    const handlers = preloadOnIntent(factory, 0);
    expect(handlers.onMouseEnter).toBeTypeOf('function');
    expect(handlers.onFocus).toBeTypeOf('function');
    expect(handlers.onTouchStart).toBeTypeOf('function');
    expect(handlers.preload).toBeTypeOf('function');
  });

  it('should preload after delay', async () => {
    const factory = vi.fn().mockResolvedValue(undefined);
    const handlers = preloadOnIntent(factory, 10);
    handlers.onMouseEnter();
    await new Promise((r) => setTimeout(r, 30));
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should not preload twice', async () => {
    const factory = vi.fn().mockResolvedValue(undefined);
    const handlers = preloadOnIntent(factory, 0);
    handlers.preload();
    handlers.preload();
    await new Promise((r) => setTimeout(r, 5));
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should debounce calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced('b');
    debounced('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('should respect leading option', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100, { leading: true, trailing: false });
    debounced('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('should cancel pending calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('rafThrottle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should queue calls and run only one per frame', () => {
    const fn = vi.fn();
    const throttled = rafThrottle(fn);
    throttled();
    throttled();
    throttled();
    // Should be queued, not called synchronously
    expect(fn).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('getStats', () => {
  it('should return a PerfStats object', () => {
    const stats = getStats();
    expect(stats).toBeTypeOf('object');
    expect(stats).toHaveProperty('memoryUsageMB');
    expect(stats).toHaveProperty('connectionEffectiveType');
    expect(stats).toHaveProperty('hardwareConcurrency');
    expect(stats).toHaveProperty('serviceWorkerStatus');
  });

  it('should have valid types for each field', () => {
    const stats: PerfStats = getStats();
    const nullableNumber = (v: unknown): boolean => v === null || typeof v === 'number';
    expect(nullableNumber(stats.memoryUsageMB)).toBe(true);
    expect(nullableNumber(stats.connectionEffectiveType === null ? null : typeof stats.connectionEffectiveType)).toBe(true);
    expect(nullableNumber(stats.deviceMemoryGB)).toBe(true);
    expect(typeof stats.serviceWorkerStatus).toBe('string');
  });
});
