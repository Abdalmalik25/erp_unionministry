/**
 * evaluationCertExpertLogic.test.ts — Expert certificate analysis tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeEvaluationCert } from './evaluationCertExpertLogic';
import type { CertLike } from './evaluationCertExpertLogic';

const now = new Date('2025-06-01T00:00:00Z');
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function cert(overrides: Partial<CertLike> = {}): CertLike {
  return { status: 'valid', expiry_date: inDays(180), overall_score: 85, ...overrides };
}

describe('analyzeEvaluationCert', () => {
  it('flags a valid certificate whose expiry has passed', () => {
    const r = analyzeEvaluationCert(cert({ expiry_date: inDays(-30) }), now);
    expect(r.issue).toBe('expired_still_valid');
    expect(r.expiredByDays).toBeGreaterThanOrEqual(29);
  });

  it('flags a valid certificate inside the reassessment window', () => {
    const r = analyzeEvaluationCert(cert({ expiry_date: inDays(20) }), now);
    expect(r.issue).toBe('expiring_soon');
  });

  it('does not flag a far-future valid certificate', () => {
    const r = analyzeEvaluationCert(cert({ expiry_date: inDays(200) }), now);
    expect(r.issue).toBeNull();
  });

  it('flags conditional certificates for active monitoring', () => {
    const r = analyzeEvaluationCert(cert({ status: 'conditional' }), now);
    expect(r.issue).toBe('conditional_active');
  });

  it('flags a revoked certificate with future expiry', () => {
    const r = analyzeEvaluationCert(cert({ status: 'revoked', expiry_date: inDays(90) }), now);
    expect(r.issue).toBe('revoked_future_expiry');
  });

  it('flags low-score certificates still marked valid', () => {
    const r = analyzeEvaluationCert(cert({ status: 'valid', overall_score: 45 }), now);
    expect(r.issue).toBe('low_score_valid');
  });
});