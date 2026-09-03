/**
 * api.test.ts — اختبارات api.ts utilities (ApiError, deduplication, etc.)
 * Note: Full fetch-level tests require MSW (Mock Service Worker).
 * These unit tests focus on the pure-logic utilities.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiError, invalidateApiCache } from '../services/api';

describe('ApiError', () => {
  it('should construct with all fields', () => {
    const err = new ApiError('Test', { status: 500, code: 'ERR_CODE', correlationId: 'cid-abc', payload: { extra: 1 } });
    expect(err.message).toBe('Test');
    expect(err.status).toBe(500);
    expect(err.code).toBe('ERR_CODE');
    expect(err.correlationId).toBe('cid-abc');
    expect(err.payload).toEqual({ extra: 1 });
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('ApiError');
  });

  it('should be retryable for 5xx', () => {
    expect(new ApiError('5xx', { status: 500 }).retryable).toBe(true);
    expect(new ApiError('503', { status: 503 }).retryable).toBe(true);
  });

  it('should NOT be retryable for 4xx', () => {
    expect(new ApiError('400', { status: 400 }).retryable).toBe(false);
    expect(new ApiError('401', { status: 401 }).retryable).toBe(false);
    expect(new ApiError('404', { status: 404 }).retryable).toBe(false);
  });

  it('should be retryable for network errors (status 0)', () => {
    expect(new ApiError('network', { status: 0 }).retryable).toBe(true);
  });

  it('should default code to HTTP_<status>', () => {
    expect(new ApiError('x', { status: 404 }).code).toBe('HTTP_404');
  });

  it('should extend Error', () => {
    expect(new ApiError('x', { status: 400 })).toBeInstanceOf(Error);
    expect(new ApiError('x', { status: 400 })).toBeInstanceOf(ApiError);
  });
});

describe('invalidateApiCache', () => {
  beforeEach(() => {
    invalidateApiCache(); // clear before each
  });

  it('should clear all cache when called without prefix', () => {
    // The function should not throw
    expect(() => invalidateApiCache()).not.toThrow();
  });

  it('should accept a path prefix', () => {
    expect(() => invalidateApiCache('/api/entities')).not.toThrow();
  });
});
