import { describe, it, expect } from 'vitest';
import type { PaginationMeta, ApiEnvelope } from './api';

describe('PaginationMeta — canonical type replacing any', () => {
  it('accepts numeric pagination fields', () => {
    const meta: PaginationMeta = { total: 100, totalPages: 10, page: 1, limit: 10 };
    expect(meta.total).toBe(100);
    expect(meta.totalPages).toBe(10);
  });
  it('allows index signature for extended fields', () => {
    const meta: PaginationMeta = { total: 5, customField: 'x', hasMore: true };
    expect(meta.customField).toBe('x');
  });
  it('ApiEnvelope wraps data with meta', () => {
    const env: ApiEnvelope<{ id: string }> = { data: { id: '1' }, meta: { total: 1 }, success: true };
    expect(env.meta?.total).toBe(1);
    expect(env.success).toBe(true);
  });
  it('meta is optional', () => {
    const env: ApiEnvelope<number[]> = { data: [1,2,3] };
    expect(env.meta).toBeUndefined();
  });
});
