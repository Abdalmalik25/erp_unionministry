/**
 * Tests for dynamic field definition + value validation engine.
 * Pure, no database required. Run with: node --test server/lib/dynamicFieldsValidation.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFieldDefinition, validateFieldValues, ALLOWED_DATA_TYPES, FIELD_KEY_RE } from './dynamicFieldsValidation.mjs';

test('FIELD_KEY_RE enforces lowercase snake_case', () => {
  assert.ok(FIELD_KEY_RE.test('training_hours'));
  assert.ok(!FIELD_KEY_RE.test('Training_Hours'));
  assert.ok(!FIELD_KEY_RE.test('1field'));
});

test('validateFieldDefinition rejects bad key / type', () => {
  const bad = validateFieldDefinition({ entity_type: 'evaluation_certificates', field_key: 'Bad Key', label: 'x', data_type: 'nope' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.field_key);
  assert.ok(bad.errors.data_type);
});

test('validateFieldDefinition requires options for select', () => {
  const r = validateFieldDefinition({ entity_type: 'evaluation_certificates', field_key: 'level', label: 'Level', data_type: 'select' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.options);
});

test('validateFieldDefinition accepts valid integer field', () => {
  const r = validateFieldDefinition({ entity_type: 'evaluation_certificates', field_key: 'score', label: 'Score', data_type: 'integer' });
  assert.equal(r.valid, true);
});

test('validateFieldValues coerces integer and enforces min', () => {
  const defs = [{ field_key: 'score', data_type: 'integer', required: true, validation_rules: { min: 0, max: 100 }, active: true }];
  const ok = validateFieldValues(defs, { score: '85' });
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized.score, 85);
  const bad = validateFieldValues(defs, { score: 150 });
  assert.equal(bad.valid, false);
});

test('validateFieldValues flags required missing', () => {
  const defs = [{ field_key: 'score', data_type: 'integer', required: true, active: true }];
  const r = validateFieldValues(defs, {});
  assert.equal(r.valid, false);
  assert.ok(r.errors.score);
});

test('validateFieldValues validates email format', () => {
  const defs = [{ field_key: 'contact', data_type: 'email', active: true }];
  assert.equal(validateFieldValues(defs, { contact: 'a@b.com' }).valid, true);
  assert.equal(validateFieldValues(defs, { contact: 'not-an-email' }).valid, false);
});

test('validateFieldValues skips inactive definitions', () => {
  const defs = [{ field_key: 'score', data_type: 'integer', required: true, active: false }];
  const r = validateFieldValues(defs, {});
  assert.equal(r.valid, true);
});

test('ALLOWED_DATA_TYPES includes reference type', () => {
  assert.ok(ALLOWED_DATA_TYPES.includes('reference'));
});

test('validateFieldValues validates multiselect against options', () => {
  const defs = [{ field_key: 'langs', data_type: 'multiselect', options: [{ value: 'ar', label: 'ع' }, { value: 'en', label: 'إ' }], active: true }];
  assert.equal(validateFieldValues(defs, { langs: ['ar', 'en'] }).valid, true);
  assert.equal(validateFieldValues(defs, { langs: ['fr'] }).valid, false);
});
