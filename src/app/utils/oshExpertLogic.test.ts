/**
 * oshExpertLogic.test.ts — Expert OSH incident triage tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeOSHIncident } from './oshExpertLogic';
import type { OSHIncident } from '../services/oshService';

function baseIncident(overrides: Partial<OSHIncident> = {}): OSHIncident {
  return {
    id: 'i1',
    caseNumber: 'OSH-1',
    type: 'injury',
    severity: 'minor',
    status: 'reported',
    incidentDate: new Date().toISOString(),
    incidentTime: '09:00',
    reportedAt: new Date().toISOString(),
    reportedBy: 'u',
    employerEntityId: 'e1',
    employerName: 'منشأة',
    workplaceLocation: 'موقع',
    governorate: 'صنعاء',
    directorate: '',
    sector: '',
    workersInvolved: [{ workerId: 'w', workerName: 'عامل', medicalAttention: 'first_aid' }],
    title: 'حادث',
    description: '',
    ...overrides,
  } as OSHIncident;
}

describe('analyzeOSHIncident', () => {
  it('returns routine for a minor incident with first-aid only', () => {
    const r = analyzeOSHIncident(baseIncident());
    expect(r.response).toBe('routine');
  });

  it('escalates to critical for a fatal declared severity', () => {
    const r = analyzeOSHIncident(baseIncident({ severity: 'fatal' }));
    expect(r.response).toBe('critical');
    expect(r.mandatoryNotifications.length).toBeGreaterThan(0);
  });

  it('raises response when a worker was hospitalized even if declared minor', () => {
    const r = analyzeOSHIncident(
      baseIncident({ workersInvolved: [{ workerId: 'w', workerName: 'عامل', medicalAttention: 'hospitalized' }] })
    );
    expect(r.response).not.toBe('routine');
  });

  it('flags a missing investigation for serious incidents', () => {
    const r = analyzeOSHIncident(baseIncident({ severity: 'serious', status: 'reported' }));
    expect(r.investigationMissing).toBe(true);
  });

  it('does not flag investigation when one is recorded', () => {
    const r = analyzeOSHIncident(
      baseIncident({ severity: 'serious', investigation: { investigators: [], findings: ['x'], recommendations: [] } })
    );
    expect(r.investigationMissing).toBe(false);
  });
});