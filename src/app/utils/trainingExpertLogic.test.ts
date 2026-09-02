/**
 * trainingExpertLogic.test.ts — Expert training record analysis tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeTraining } from './trainingExpertLogic';
import type { TrainingLike } from './trainingExpertLogic';

const now = new Date('2025-06-01T00:00:00Z');
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function rec(overrides: Partial<TrainingLike> = {}): TrainingLike {
  return {
    status: 'completed',
    start_date: inDays(-10),
    end_date: inDays(-5),
    participants_count: 12,
    pass_rate: 85,
    certification_issued: true,
    ...overrides,
  };
}

describe('analyzeTraining', () => {
  it('flags in-progress past its end date', () => {
    const r = analyzeTraining(rec({ status: 'in_progress', end_date: inDays(-10) }), now);
    expect(r.issue).toBe('overshoot_in_progress');
    expect(r.daysOver).toBeGreaterThanOrEqual(9);
  });

  it('flags pending training whose start date has passed', () => {
    const r = analyzeTraining(rec({ status: 'pending', start_date: inDays(-3), end_date: inDays(7) }), now);
    expect(r.issue).toBe('pending_overdue');
  });

  it('does not flag pending training that has not started', () => {
    const r = analyzeTraining(rec({ status: 'pending', start_date: inDays(5) }), now);
    expect(r.issue).toBeNull();
  });

  it('flags a completed training without certification', () => {
    const r = analyzeTraining(rec({ status: 'completed', certification_issued: false }), now);
    expect(r.issue).toBe('certification_missing');
  });

  it('flags an active program with no participants', () => {
    const r = analyzeTraining(rec({ status: 'in_progress', participants_count: 0, end_date: inDays(10) }), now);
    expect(r.issue).toBe('no_participants');
  });

  it('flags a completed training without a pass rate', () => {
    const r = analyzeTraining(rec({ status: 'completed', pass_rate: undefined }), now);
    expect(r.issue).toBe('no_result');
  });

  it('keeps a clean completed record as healthy', () => {
    const r = analyzeTraining(rec({}), now);
    expect(r.issue).toBeNull();
  });
});