/**
 * disputeExpertLogic.test.ts — Expert dispute SLA/escalation tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeDispute } from './disputeExpertLogic';
import type { LaborDispute } from '../services/disputeService';

function baseDispute(overrides: Partial<LaborDispute> = {}): LaborDispute {
  return {
    id: 'd1',
    caseNumber: 'DSP-1',
    status: 'submitted',
    category: 'wages',
    priority: 'medium',
    title: 'نزاع',
    description: '',
    governorate: 'صنعاء',
    directorate: '',
    jurisdiction: 'first_instance',
    parties: [],
    evidence: [],
    timeline: [],
    createdBy: 'u',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as LaborDispute;
}

describe('analyzeDispute', () => {
  it('computes real elapsed days', () => {
    const r = analyzeDispute(baseDispute());
    expect(r.daysOpen).toBeGreaterThanOrEqual(9);
    expect(r.daysOpen).toBeLessThanOrEqual(11);
  });

  it('marks an old open dispute as overdue', () => {
    const old = baseDispute({ createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() });
    const r = analyzeDispute(old);
    expect(r.ageBand).toBe('overdue');
  });

  it('marks a medium-age open dispute as aging', () => {
    const dispute = baseDispute({ createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() });
    const r = analyzeDispute(dispute);
    expect(r.ageBand).toBe('aging');
  });

  it('routes urgent sensitive disputes to immediate conciliation', () => {
    const r = analyzeDispute(baseDispute({ priority: 'critical', category: 'OSH_violation' }));
    expect(r.escalationRoute).toContain('فوري');
  });

  it('keeps a resolved old dispute as not pending', () => {
    const r = analyzeDispute(baseDispute({ status: 'resolved' }));
    expect(r.pending).toBe(false);
  });
});