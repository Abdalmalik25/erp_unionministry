/**
 * errorTracker.test.ts — اختبارات شاملة لملتقط الأخطاء
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { errorTracker } from './errorTracker';
import { ApiError } from '../services/api';

describe('errorTracker', () => {
  beforeEach(() => {
    errorTracker.clear();
  });

  describe('capture', () => {
    it('should capture a new error', () => {
      const id = errorTracker.capture({ message: 'Test error' });
      expect(id).toMatch(/^err_/);
      const all = errorTracker.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].message).toBe('Test error');
      expect(all[0].count).toBe(1);
    });

    it('should deduplicate identical errors', () => {
      const id1 = errorTracker.capture({ message: 'Duplicate', stack: 'stack1' });
      const id2 = errorTracker.capture({ message: 'Duplicate', stack: 'stack1' });
      const id3 = errorTracker.capture({ message: 'Duplicate', stack: 'stack1' });
      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
      const all = errorTracker.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].count).toBe(3);
    });

    it('should track different errors separately', () => {
      errorTracker.capture({ message: 'Error 1', stack: 's1' });
      errorTracker.capture({ message: 'Error 2', stack: 's2' });
      const all = errorTracker.getAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should bound the buffer at 50 items', () => {
      for (let i = 0; i < 60; i++) {
        errorTracker.capture({ message: `Error ${i}`, stack: `s${i}` });
      }
      expect(errorTracker.getAll().length).toBeLessThanOrEqual(50);
    });
  });

  describe('captureApiError', () => {
    it('should capture ApiError with status and correlationId', () => {
      const apiErr = new ApiError('Server error', { status: 500, code: 'INTERNAL', correlationId: 'cid-123' });
      errorTracker.captureApiError(apiErr, { route: '/api/test' });
      const all = errorTracker.getAll();
      expect(all[0].correlationId).toBe('cid-123');
      expect(all[0].source).toBe('api');
      expect(all[0].severity).toBe('error');
    });

    it('should mark 4xx as warning', () => {
      const apiErr = new ApiError('Not found', { status: 404, code: 'NOT_FOUND', correlationId: 'cid-1' });
      errorTracker.captureApiError(apiErr);
      const all = errorTracker.getAll();
      expect(all[0].severity).toBe('warning');
    });

    it('should handle plain Error', () => {
      errorTracker.captureApiError(new Error('Plain'));
      const all = errorTracker.getAll();
      expect(all[0].message).toBe('Plain');
    });

    it('should handle non-Error values', () => {
      errorTracker.captureApiError('string error');
      const all = errorTracker.getAll();
      expect(all[0].message).toBe('string error');
    });
  });

  describe('getStats', () => {
    it('should compute aggregate stats', () => {
      errorTracker.capture({ message: 'E1', stack: 'a', severity: 'error' });
      errorTracker.capture({ message: 'E2', stack: 'b', severity: 'error' });
      errorTracker.capture({ message: 'E3', stack: 'c', severity: 'warning' });
      const stats = errorTracker.getStats();
      expect(stats.total).toBe(3);
      expect(stats.bySeverity.error).toBe(2);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.topSource).toBe('manual');
    });
  });

  describe('persistence', () => {
    it('should persist to localStorage', () => {
      errorTracker.capture({ message: 'Persistent', stack: 'p' });
      const stored = localStorage.getItem('app_error_buffer_v1');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('auto-capture (contract)', () => {
    it('should have an install() method that is idempotent', () => {
      expect(() => errorTracker.install()).not.toThrow();
      // Calling again should be a no-op
      expect(() => errorTracker.install()).not.toThrow();
    });

    it('should have enable/disable methods', () => {
      expect(() => errorTracker.enable()).not.toThrow();
      expect(() => errorTracker.disable()).not.toThrow();
    });
  });
});
