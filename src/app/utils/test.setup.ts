/**
 * Test Setup - إعداد بيئة الاختبار
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';

const memoryStore: Record<string, string> = {};

const mockStorage = {
  getItem: (k: string) => memoryStore[k] || null,
  setItem: (k: string, v: string) => { memoryStore[k] = String(v); },
  removeItem: (k: string) => { delete memoryStore[k]; },
  clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}