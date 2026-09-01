/**
 * inspectionExpertLogic.test.ts — Expert risk-based inspection triage tests.
 */

import { describe, it, expect } from 'vitest';
import {
  triageInspection,
  sortByRisk,
  recommendNextAction,
  type Inspection,
} from './inspectionExpertLogic';

function baseInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: 'i1',
    caseNumber: 'INSP-001',
    type: 'scheduled',
    status: 'planned',
    priority: 'low',
    entityId: 'e1',
    entityName: 'منشأة',
    entityType: 'employer',
    address: '',
    governorate: '',
    directorate: '',
    schedule: {
      id: 's1',
      inspectionId: 'i1',
      scheduledDate: new Date().toISOString(),
      scheduledTime: '09:00',
      duration: 60,
      location: '',
      governorate: '',
      directorate: '',
      assignedInspector: '',
      assignedInspectorName: '',
    },
    witnesses: [],
    violations: [],
    attachments: [],
    createdBy: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Inspection;
}

describe('triageInspection', () => {
  it('returns routine urgency for a clean low-priority inspection', () => {
    const r = triageInspection(baseInspection());
    expect(r.urgency).toBe('routine');
    expect(r.riskScore).toBeLessThan(30);
  });

  it('raises score for sensitive types (child labor)', () => {
    const r = triageInspection(baseInspection({ type: 'child_labor' }));
    expect(r.urgency).toBe('urgent');
    expect(r.drivers.some((d) => d.includes('حسّاس'))).toBe(true);
  });

  it('adds a critical-violation driver with an open critical violation', () => {
    const r = triageInspection(
      baseInspection({
        violations: [
          { id: 'v1', inspectionId: 'i1', category: 'x', description: 'x', severity: 'critical', status: 'identified', } as any,
        ],
      })
    );
    expect(r.drivers.some((d) => d.includes('مخالفة حرجة'))).toBe(true);
    expect(r.riskScore).toBeGreaterThan(50);
  });

  it('reflects a breached SLA as a driver', () => {
    const r = triageInspection(baseInspection({ slaStatus: 'breached' }));
    expect(r.drivers.some((d) => d.includes('المهلة'))).toBe(true);
  });

  it('does not inject fabricated numbers when no signals present', () => {
    const r = triageInspection(baseInspection());
    expect(r.riskScore).toBe(0);
    expect(r.drivers.length).toBe(0);
  });
});

describe('recommendNextAction', () => {
  it('leads with scheduling for a planned inspection', () => {
    expect(recommendNextAction(baseInspection({ status: 'planned' }))).toContain('تعيين مفتش');
  });
  it('leads with starting for an assigned inspection', () => {
    expect(recommendNextAction(baseInspection({ status: 'assigned' }))).toContain('بدء التفتيش');
  });
});

describe('sortByRisk', () => {
  it('sorts highest-risk inspection first without mutating input', () => {
    const low = baseInspection({ id: 'low', caseNumber: 'B' });
    const high = baseInspection({
      id: 'high',
      caseNumber: 'A',
      type: 'OSH',
      slaStatus: 'breached',
      violations: [{ id: 'v', inspectionId: 'h', category: 'c', description: 'd', severity: 'critical', status: 'identified' } as any],
    });
    const sorted = sortByRisk([low, high]);
    expect(sorted[0].id).toBe('high');
    expect(sorted[1].id).toBe('low');
  });
});
