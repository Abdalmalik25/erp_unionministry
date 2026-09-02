/**
 * feePaymentExpertLogic.test.ts — Expert fee payment analysis tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeFeePayment } from './feePaymentExpertLogic';
import type { FeePaymentLike } from './feePaymentExpertLogic';

const now = new Date('2025-06-01T00:00:00Z');
const inDaysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

function pay(overrides: Partial<FeePaymentLike> = {}): FeePaymentLike {
  return { status: 'pending', created_at: inDaysAgo(5), amount: 1000, ...overrides };
}

describe('analyzeFeePayment', () => {
  it('flags pending payments past the follow-up window', () => {
    const r = analyzeFeePayment(pay({ created_at: inDaysAgo(40) }), now);
    expect(r.issue).toBe('pending_aging');
    expect(r.daysPending).toBeGreaterThanOrEqual(39);
  });

  it('does not flag a recent pending payment', () => {
    const r = analyzeFeePayment(pay({ created_at: inDaysAgo(3) }), now);
    expect(r.issue).toBeNull();
  });

  it('flags failed payments', () => {
    const r = analyzeFeePayment(pay({ status: 'failed' }), now);
    expect(r.issue).toBe('failed');
  });

  it('keeps completed payments as healthy', () => {
    const r = analyzeFeePayment(pay({ status: 'completed' }), now);
    expect(r.issue).toBeNull();
  });
});