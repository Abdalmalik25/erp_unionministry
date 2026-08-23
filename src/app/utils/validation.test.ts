/**
 * Validation Tests - اختبارات التحقق من البيانات
 * تغطية Schema validation، required fields، patterns، sanitization
 */

import { describe, it, expect } from 'vitest';
import { validate } from './validation';

describe('validate function', () => {
  it('should validate required field with value', () => {
    const data = { name: 'test' };
    const schema = { name: { required: true } };
    const errors = validate(data, schema);
    expect(errors).toEqual({});
  });

  it('should error on missing required field', () => {
    const data = {};
    const schema = { name: { required: true } };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('name', 'هذا الحقل مطلوب');
  });

  it('should validate minLength', () => {
    const data = { name: 'ab' };
    const schema = { name: { minLength: 5 } };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('name', 'الحد الأدنى 5 أحرف');
  });

  it('should validate maxLength', () => {
    const data = { name: 'thisisaveryuniquelongstring' };
    const schema = { name: { maxLength: 10 } };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('name', 'الحد الأقصى 10 حرف');
  });

  it('should validate pattern', () => {
    const data = { email: 'test@example.com' };
    const schema = { email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } };
    const errors = validate(data, schema);
    expect(errors).toEqual({});
  });

  it('should error on pattern mismatch', () => {
    const data = { email: 'invalid-email' };
    const schema = { email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('email');
  });

  it('should validate number range min', () => {
    const data = { age: 15 };
    const schema = { age: { min: 18 } };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('age');
  });

  it('should validate number range max', () => {
    const data = { age: 100 };
    const schema = { age: { max: 65 } };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('age');
  });

  it('should validate optional field with no value', () => {
    const data = {};
    const schema = { optionalField: { required: false } };
    const errors = validate(data, schema);
    expect(errors).toEqual({});
  });

  it('should validate multiple fields', () => {
    const data = { name: 'ab', email: 'bad-email' };
    const schema = {
      name: { minLength: 5 },
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    };
    const errors = validate(data, schema);
    expect(errors).toHaveProperty('name');
    expect(errors).toHaveProperty('email');
  });
});