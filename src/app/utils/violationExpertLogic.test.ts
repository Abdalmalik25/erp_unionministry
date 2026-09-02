/**
 * violationExpertLogic.test.ts — Expert violation analysis tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeViolation } from './violationExpertLogic';
import type { ViolationLike } from './violationExpertLogic';

function v(overrides: Partial<ViolationLike>): ViolationLike {
  return {
    detected_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    severity: 'minor',
    status: 'open',
    ...overrides,
  };
}

describe('analyzeViolation', () => {
  it('computes days from real detected_date', () => {
    const r = analyzeViolation(v({ detected_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }));
    expect(r.daysOpen).toBeGreaterThanOrEqual(9);
    expect(r.daysOpen).toBeLessThanOrEqual(11);
  });

  it('flags overdue only for pending violations past the window', () => {
    const old = v({ detected_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) });
    expect(analyzeViolation(old).overdue).toBe(true);
    const closed = v({ ...old, status: 'closed', decision: 'قرار' });
    expect(analyzeViolation(closed).overdue).toBe(false);
  });

  it('flags a severe violation missing a penalty', () => {
    const r = analyzeViolation(v({ severity: 'critical', penalty_amount: null }));
    expect(r.drivers.some(d => d.includes('غرامة'))).toBe(true);
  });

  it('does not flag penalty when present', () => {
    const r = analyzeViolation(v({ severity: 'critical', penalty_amount: 50000 }));
    expect(r.drivers.some(d => d.includes('غرامة'))).toBe(false);
  });

  it('flags closed without a decision', () => {
    const r = analyzeViolation(v({ status: 'closed', decision: undefined }));
    expect(r.drivers.some(d => d.includes('القرار'))).toBe(true);
  });

  it('keeps fully closed violations as complete', () => {
    const r = analyzeViolation(v({ status: 'closed', decision: 'قرار', severity: 'major', penalty_amount: 50000 }));
    expect(r.drivers.length).toBe(0);
  });
});