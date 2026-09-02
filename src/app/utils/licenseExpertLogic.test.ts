/**
 * licenseExpertLogic.test.ts — Expert license consistency/urgency tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeLicense } from './licenseExpertLogic';
import type { LicenseLike } from './licenseExpertLogic';

const now = new Date('2025-06-01T00:00:00Z');
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function lic(overrides: Partial<LicenseLike> = {}): LicenseLike {
  return { expiry_date: inDays(120), status: 'valid', renewal_status: 'not_required', ...overrides };
}

describe('analyzeLicense', () => {
  it('computes days to expiry from real expiry_date', () => {
    const r = analyzeLicense(lic({ expiry_date: inDays(90) }), now);
    expect(r.daysToExpiry).toBeGreaterThanOrEqual(89);
    expect(r.daysToExpiry).toBeLessThanOrEqual(91);
  });

  it('flags a passed expiry date still labelled valid', () => {
    const r = analyzeLicense(lic({ expiry_date: inDays(-40), status: 'valid' }), now);
    expect(r.expiredByDays).toBeGreaterThanOrEqual(39);
    expect(r.issue).toBe('expired_pending_status');
  });

  it('does not flag when status already expired', () => {
    const r = analyzeLicense(lic({ expiry_date: inDays(-40), status: 'expired' }), now);
    expect(r.issue).toBeNull();
  });

  it('flags a future expiry date mislabelled as expired', () => {
    const r = analyzeLicense(lic({ expiry_date: inDays(200), status: 'expired' }), now);
    expect(r.issue).toBe('expired_mislabel');
  });

  it('flags the renewal window when close to expiry with no renewal', () => {
    const r = analyzeLicense(lic({ expiry_date: inDays(20), renewal_status: 'not_required' }), now);
    expect(r.issue).toBe('renewal_window');
  });

  it('does not flag the window once a renewal is pending', () => {
    const r = analyzeLicense(lic({ expiry_date: inDays(20), renewal_status: 'pending' }), now);
    expect(r.issue).not.toBe('renewal_window');
  });

  it('flags a rejected renewal still shown as valid', () => {
    const r = analyzeLicense(lic({ renewal_status: 'rejected', status: 'valid' }), now);
    expect(r.issue).toBe('renewal_rejected');
  });
});