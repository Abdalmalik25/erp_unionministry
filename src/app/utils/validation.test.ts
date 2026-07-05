/**
 * اختبارات الوحدة لأدوات التحقق من البيانات
 * Unit Tests for Validation Utilities
 */

import { describe, it, expect } from 'vitest';
import { validate, validateYemeniNationalId, validateYemeniPhone, validatePasswordStrength, sanitizeData } from './validation';

describe('validate function', () => {
  const schema = {
    name: { required: true, minLength: 3, maxLength: 50 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { min: 18, max: 100 },
  };

  it('should validate required fields', () => {
    const data = { name: '', email: 'test@test.com', age: 25 };
    const errors = validate(data, schema);
    expect(errors.name).toBe('هذا الحقل مطلوب');
  });

  it('should validate minLength', () => {
    const data = { name: 'ab', email: 'test@test.com', age: 25 };
    const errors = validate(data, schema);
    expect(errors.name).toBe('الحد الأدنى 3 أحرف');
  });

  it('should validate maxLength', () => {
    const data = { name: 'a'.repeat(51), email: 'test@test.com', age: 25 };
    const errors = validate(data, schema);
    expect(errors.name).toBe('الحد الأقصى 50 حرف');
  });

  it('should validate pattern', () => {
    const data = { name: 'test', email: 'invalid-email', age: 25 };
    const errors = validate(data, schema);
    expect(errors.email).toBe('صيغة غير صحيحة');
  });

  it('should validate min value', () => {
    const data = { name: 'test', email: 'test@test.com', age: 15 };
    const errors = validate(data, schema);
    expect(errors.age).toBe('القيمة يجب أن تكون 18 على الأقل');
  });

  it('should validate max value', () => {
    const data = { name: 'test', email: 'test@test.com', age: 101 };
    const errors = validate(data, schema);
    expect(errors.age).toBe('القيمة يجب أن تكون 100 على الأكثر');
  });

  it('should return empty errors for valid data', () => {
    const data = { name: 'محمد أحمد', email: 'test@test.com', age: 25 };
    const errors = validate(data, schema);
    expect(Object.keys(errors).length).toBe(0);
  });
});

describe('validateYemeniNationalId', () => {
  it('should validate correct Yemeni national ID format', () => {
    expect(validateYemeniNationalId('12345678901')).toBe(true);
  });

  it('should reject invalid format (less than 11 digits)', () => {
    expect(validateYemeniNationalId('1234567890')).toBe(false);
  });

  it('should reject invalid format (more than 11 digits)', () => {
    expect(validateYemeniNationalId('123456789012')).toBe(false);
  });

  it('should reject invalid province code', () => {
    expect(validateYemeniNationalId('23456789012')).toBe(false); // Province code 23
  });

  it('should reject non-numeric characters', () => {
    expect(validateYemeniNationalId('1234567890a')).toBe(false);
  });
});

describe('validateYemeniPhone', () => {
  it('should validate correct Yemeni phone format', () => {
    expect(validateYemeniPhone('777123456')).toBe(true);
  });

  it('should reject invalid format (not starting with 7)', () => {
    expect(validateYemeniPhone('887123456')).toBe(false);
  });

  it('should reject invalid format (less than 9 digits)', () => {
    expect(validateYemeniPhone('77712345')).toBe(false);
  });

  it('should reject invalid format (more than 9 digits)', () => {
    expect(validateYemeniPhone('7771234567')).toBe(false);
  });
});

describe('validatePasswordStrength', () => {
  it('should validate strong password', () => {
    const result = validatePasswordStrength('Password123');
    expect(result.isStrong).toBe(true);
  });

  it('should reject weak password (less than 8 characters)', () => {
    const result = validatePasswordStrength('Pass1');
    expect(result.isStrong).toBe(false);
    expect(result.message).toContain('8 أحرف');
  });

  it('should reject password without lowercase', () => {
    const result = validatePasswordStrength('PASSWORD123');
    expect(result.isStrong).toBe(false);
  });

  it('should reject password without uppercase', () => {
    const result = validatePasswordStrength('password123');
    expect(result.isStrong).toBe(false);
  });

  it('should reject password without number', () => {
    const result = validatePasswordStrength('PasswordTest');
    expect(result.isStrong).toBe(false);
  });
});

describe('sanitizeData', () => {
  it('should trim whitespace from strings', () => {
    const data = { name: '  محمد  ', email: 'TEST@TEST.COM  ' };
    const sanitized = sanitizeData(data);
    expect(sanitized.name).toBe('محمد');
    expect(sanitized.email).toBe('TEST@TEST.COM');
  });

  it('should remove null values', () => {
    const data = { name: 'محمد', email: null };
    const sanitized = sanitizeData(data);
    expect(sanitized.email).toBeUndefined();
  });

  it('should preserve non-string values', () => {
    const data = { count: 123, active: true };
    const sanitized = sanitizeData(data);
    expect(sanitized.count).toBe(123);
    expect(sanitized.active).toBe(true);
  });
});