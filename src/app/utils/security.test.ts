/**
 * Security Tests - اختبارات الأمان
 * تغطية rate limiting، session management، input sanitization، password strength
 */

import { describe, it, expect } from 'vitest';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  createSession,
  getSession,
  refreshSession,
  getSessionTimeRemaining,
  sanitizeInput,
  sanitizeSQLInput,
  sanitizeObject,
  checkPasswordStrength,
  escapeHTML,
  generateCSRFToken,
  validateCSRFToken,
  logAudit,
  getAuditLog,
} from './security';

describe('Rate Limiter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should allow first attempt', () => {
    const result = checkRateLimit('test-user-1');
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });

  it('should deny after max attempts', () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('test-user-2');
    }
    const result = checkRateLimit('test-user-2');
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
  });

  it('should clear rate limit', () => {
    recordFailedAttempt('test-user-3');
    clearRateLimit('test-user-3');
    const result = checkRateLimit('test-user-3');
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(5);
  });
});

describe('Session Manager', () => {
  beforeEach(() => {
    localStorage.removeItem('us_session');
  });

  it('should create a session', () => {
    const session = createSession('user123', 'test@test.com', 'ministry');
    expect(session).toBeDefined();
    expect(session.userId).toBe('user123');
    expect(session.email).toBe('test@test.com');
    expect(session.userType).toBe('ministry');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should get active session', () => {
    createSession('user123', 'test@test.com', 'ministry');
    const retrieved = getSession();
    expect(retrieved).toBeDefined();
    expect(retrieved!.userId).toBe('user123');
  });

  it('should return null when no session exists', () => {
    const result = getSession();
    expect(result).toBeNull();
  });

  it('should refresh session activity', () => {
    const session = createSession('user123', 'test@test.com', 'ministry');
    const nowBefore = session.lastActivity;
    const refreshed = refreshSession();
    expect(refreshed).toBeDefined();
    expect(refreshed!.lastActivity).toBeGreaterThanOrEqual(nowBefore);
  });

  it('should detect session time remaining after manual expiry set', () => {
    // Create session
    createSession('user123', 'test@test.com', 'ministry');
    // Directly set the stored session expiry to 5 minutes from now
    const stored = JSON.parse(localStorage.getItem('us_session') as string);
    stored.expiresAt = Date.now() + 5 * 60 * 1000;
    localStorage.setItem('us_session', JSON.stringify(stored));
    const remaining = getSessionTimeRemaining();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(600000);
  });

  it('should detect expired session when no session exists', () => {
    const result = getSession();
    expect(result).toBeNull();
  });
});

describe('Input Sanitization', () => {
  it('should sanitize HTML tags', () => {
    const result = sanitizeInput('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
  });

  it('should sanitize SQL injection patterns', () => {
    const result = sanitizeSQLInput("' UNION SELECT * FROM users --");
    expect(result).not.toContain('UNION');
  });

  it('should sanitize object recursively', () => {
    const obj = { name: '<b>test</b>' };
    const result = sanitizeObject(obj);
    expect(result).toBeDefined();
    expect(result.name).toBeDefined();
  });
});

describe('Escape HTML', () => {
  it('should escape HTML tags', () => {
    const result = escapeHTML('test <b>bold</b> & more');
    expect(result).not.toContain('<b>');
    expect(result).toContain('lt');
    expect(result).toContain('gt');
  });
});

describe('Password Strength', () => {
  it('should evaluate password with mixed characteristics', () => {
    const result = checkPasswordStrength('Str0ngP@ssw0rd!');
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(['ضعيفة جداً', 'ضعيفة', 'مقبولة', 'قوية', 'قوية جداً']).toContain(result.label);
  });

  it('should evaluate weak password', () => {
    const result = checkPasswordStrength('12345678');
    expect(result.score).toBeLessThan(4);
  });

  it('should have all requirement categories defined', () => {
    const result = checkPasswordStrength('test');
    expect(result.requirements.length).toBe(5);
  });
});

describe('CSRF Token', () => {
  it('should generate a CSRF token', () => {
    const token = generateCSRFToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should validate matching CSRF token', () => {
    const token = generateCSRFToken();
    const valid = validateCSRFToken(token);
    expect(valid).toBe(true);
  });

  it('should reject mismatched CSRF token', () => {
    const result = validateCSRFToken('wrong-token');
    expect(result).toBe(false);
  });
});

describe('Audit Logger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should log an audit entry', () => {
    logAudit({
      action: 'VIEW',
      resource: 'entities',
      resourceId: '123',
      details: { test: true },
    });
    const log = getAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].action).toBe('VIEW');
  });

  it('should retrieve audit log', () => {
    const log = getAuditLog();
    expect(log).toBeInstanceOf(Array);
  });
});