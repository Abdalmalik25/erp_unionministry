/**
 * contractExpertLogic.test.ts — Expert contract lifecycle tests.
 */

import { describe, it, expect } from 'vitest';
import { analyzeContractLifecycle } from './contractExpertLogic';
import type { Contract } from '../services/contractService';

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function baseContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    contractNumber: 'C-001',
    status: 'active',
    type: 'fixed_term',
    employer: { entityId: 'e1', entityName: 'x', entityType: 'employer', representativeName: '', representativeId: '' },
    worker: { id: 'w1', name: 'عامل', idNumber: '1', nationality: 'يمني', workerType: 'yemeni' } as any,
    startDate: new Date().toISOString(),
    endDate: futureDate(90),
    durationMonths: 3,
    probationPeriod: 0,
    noticePeriod: 30,
    occupation: '',
    workLocation: '',
    governorate: '',
    directorate: '',
    workSchedule: 'full_time',
    wages: { baseSalary: 0, currency: 'YER', paymentSchedule: 'monthly', paymentMethod: 'cash' } as any,
    benefits: {} as any,
    oshTrainingRequired: false,
    medicalExaminationRequired: false,
    signatures: [],
    employerSignatureRequired: false,
    workerSignatureRequired: false,
    ministryApprovalRequired: false,
    amendments: [],
    attachments: [],
    createdBy: 'u',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    source: 'employer_portal',
    ...overrides,
  } as Contract;
}

describe('analyzeContractLifecycle', () => {
  it('returns active_in_term for a contract ending beyond the window', () => {
    const r = analyzeContractLifecycle(baseContract({ endDate: futureDate(90) }));
    expect(r.expiryStatus).toBe('active_in_term');
    expect(r.daysToEnd).toBeGreaterThan(60);
  });

  it('flags renewal_due for a contract ending soon', () => {
    const r = analyzeContractLifecycle(baseContract({ endDate: futureDate(30) }));
    expect(r.expiryStatus).toBe('renewal_due');
    expect(r.label).toBe('قرب التجديد');
  });

  it('flags expired_pending when the end date has passed but status is active', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const r = analyzeContractLifecycle(baseContract({ endDate: past.toISOString() }));
    expect(r.expiryStatus).toBe('expired_pending');
  });

  it('keeps indefinite contracts as active_in_term without a countdown', () => {
    const r = analyzeContractLifecycle(baseContract({ type: 'indefinite', endDate: undefined }));
    expect(r.daysToEnd).toBeNull();
    expect(r.expiryStatus).toBe('active_in_term');
  });

  it('flags documents_risk for an expatriate whose passport ends with the contract', () => {
    const contract = baseContract({
      endDate: futureDate(30),
      worker: { id: 'w', name: 'أجنبي', idNumber: '1', nationality: 'وافد', workerType: 'expatriate', passportExpiry: futureDate(20) } as any,
    });
    const r = analyzeContractLifecycle(contract);
    expect(r.drivers.some((d) => d.includes('جواز العامل'))).toBe(true);
  });
});
