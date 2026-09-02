/**
 * expatLicenseExpertLogic.test.ts — Expatriate work-license expiry tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeExpatLicense } from './expatLicenseExpertLogic';

function dateIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('analyzeExpatLicense', () => {
  it('marks an expired license as expired', () => {
    const r = analyzeExpatLicense({ expiry_date: dateIn(-10), status: 'نشط' });
    expect(r.band).toBe('expired');
    expect(r.daysToExpiry).toBeLessThan(0);
  });

  it('flags licences expiring within 30 days', () => {
    const r = analyzeExpatLicense({ expiry_date: dateIn(15), status: 'نشط' });
    expect(r.band).toBe('expiring_30');
  });

  it('flags licences expiring within 90 days', () => {
    const r = analyzeExpatLicense({ expiry_date: dateIn(60), status: 'نشط' });
    expect(r.band).toBe('expiring_90');
  });

  it('keeps a long-valid license as valid', () => {
    const r = analyzeExpatLicense({ expiry_date: dateIn(200), status: 'نشط' });
    expect(r.band).toBe('valid');
  });

  it('treats cancelled licenses as terminal without a date', () => {
    const r = analyzeExpatLicense({ expiry_date: dateIn(200), status: 'ملغي' });
    expect(r.band).toBe('cancelled');
    expect(r.daysToExpiry).toBeNull();
  });
});
