/**
 * reductionExpertLogic.test.ts — Expert workforce-reduction screening tests.
 */

import { describe, it, expect } from 'vitest';
import { screenReductionRequest } from './reductionExpertLogic';

describe('screenReductionRequest', () => {
  it('blocks when requested reduction equals or exceeds current workforce', () => {
    const r = screenReductionRequest({ current_worker_count: 40, requested_reduction_count: 40, justification: 'إغلاق كامل' });
    expect(r.verdict).toBe('blocked');
    expect(r.flags.some((f) => f.includes('يتجاوز إجمالي العمالة'))).toBe(true);
  });

  it('blocks when no current workforce is recorded', () => {
    const r = screenReductionRequest({ current_worker_count: 0, requested_reduction_count: 5 });
    expect(r.verdict).toBe('blocked');
  });

  it('flags enhanced review for a mass reduction (>=30%)', () => {
    const r = screenReductionRequest({
      current_worker_count: 100,
      requested_reduction_count: 40,
      justification: 'تراجع اقتصادي واضح',
    });
    expect(r.verdict).toBe('enhanced');
    expect(r.abbreviation_ratio).toBe(0.4);
  });

  it('keeps small reductions eligible', () => {
    const r = screenReductionRequest({
      current_worker_count: 100,
      requested_reduction_count: 10,
      justification: 'إعادة هيكلة تقنية',
    });
    expect(r.verdict).toBe('eligible');
  });

  it('refers to detailed review when justification indicates replacement', () => {
    const r = screenReductionRequest({
      current_worker_count: 50,
      requested_reduction_count: 5,
      justification: 'استبدال بعمالة وافدة',
    });
    expect(r.verdict).toBe('refer_for_review');
  });

  it('never injects fabricated workforce numbers', () => {
    const r = screenReductionRequest({ current_worker_count: 0, requested_reduction_count: 0 });
    expect(r.abbreviation_ratio).toBeNull();
  });
});
