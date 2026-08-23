/**
 * Tests for certificate profession/standards validation.
 * Pure, no database required. Run with: node --test server/lib/certificateValidation.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCertificateProfession, normalizeCertificateStatus } from './certificateValidation.mjs';

test('allows assessed=false with no profession (honest unresolved state)', () => {
  const r = validateCertificateProfession({ assessed_against_standards: false });
  assert.equal(r.valid, true);
  assert.equal(r.professionId, null);
});

test('allows assessed=true when a profession is linked', () => {
  const r = validateCertificateProfession({ assessed_against_standards: true, profession_id: 'uuid-123' });
  assert.equal(r.valid, true);
});

test('rejects assessed=true with null profession (boolean fix prevention)', () => {
  const r = validateCertificateProfession({ assessed_against_standards: true, profession_id: null });
  assert.equal(r.valid, false);
  assert.ok('assessed_against_standards' in r.errors);
  assert.ok('profession_id' in r.errors);
});

test('rejects assessed=true with empty-string profession', () => {
  const r = validateCertificateProfession({ assessed_against_standards: true, profession_id: '' });
  assert.equal(r.valid, false);
});

test('accepts alternative prof_id key', () => {
  const r = validateCertificateProfession({ assessed_against_standards: true, prof_id: 'uuid-9' });
  assert.equal(r.valid, true);
  assert.equal(r.professionId, 'uuid-9');
});

test('allows a profession link without being assessed (informational)', () => {
  const r = validateCertificateProfession({ assessed_against_standards: false, profession_id: 'uuid-1' });
  assert.equal(r.valid, true);
});

test('normalizeCertificateStatus maps english valid -> Arabic', () => {
  assert.equal(normalizeCertificateStatus('valid'), 'صالحة');
});

test('normalizeCertificateStatus passes through Arabic already', () => {
  assert.equal(normalizeCertificateStatus('شرطية'), 'شرطية');
});

test('normalizeCertificateStatus returns unknown values unchanged', () => {
  assert.equal(normalizeCertificateStatus('weird'), 'weird');
});
