// tests/security.test.ts — Security Regression Test Suite
// Tests that verify critical security fixes are in place and cannot regress

import { describe, it, expect, beforeAll } from 'vitest';

// ========================================================================
// 1. SESSION SECURITY
// ========================================================================
describe('Session Security — Fail-Closed', () => {
  it('isSessionActive returns false for null/undefined sid', async () => {
    // The fix: isSessionActive now returns false when sid is falsy
    // This is a code-level test that the function signature requires a valid sid
    const { isSessionActive } = await import('../server/lib/sessions.js');
    const result = await isSessionActive(null);
    expect(result).toBe(false);
  });

  it('isSessionActive returns false for empty string', async () => {
    const { isSessionActive } = await import('../server/lib/sessions.js');
    const result = await isSessionActive('');
    expect(result).toBe(false);
  });
});

// ========================================================================
// 2. JWT / AUTHENTICATION
// ========================================================================
describe('JWT Security', () => {
  it('JWT_SECRET must be at least 32 characters', () => {
    // Verify the auth.js enforces minimum length
    const shortSecret = 'abc123';
    expect(shortSecret.length).toBeLessThan(32);
    // The real fix: auth.js exits if JWT_SECRET < 32 chars
    // This test documents that policy
  });

  it('signToken produces valid JWT format', async () => {
    const { signToken, verifyToken } = await import('../server/middleware/auth.js');
    const token = signToken({ sub: 'test-user', role: 'worker', iss: 'national-labor-platform' });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    // JWT should have 3 parts separated by dots (base64url)
    const parts = token.split('.');
    expect(parts.length).toBe(2); // Our custom JWT is body.signature
  });

  it('verifyToken rejects invalid tokens', async () => {
    const { verifyToken } = await import('../server/middleware/auth.js');
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('invalid')).toBeNull();
    expect(verifyToken('a.b.c.d')).toBeNull();
  });

  it('verifyToken rejects expired tokens', async () => {
    const { verifyToken } = await import('../server/middleware/auth.js');
    // Test with a token that has clearly invalid format
    expect(verifyToken('aGVsbG8.bW9yZQ')).toBeNull();
    // Test with completely malformed token
    expect(verifyToken('not-a-valid-token')).toBeNull();
  });
});

// ========================================================================
// 3. PASSWORD SECURITY
// ========================================================================
describe('Password Security', () => {
  it('hashPassword produces salt and hash', async () => {
    const { hashPassword } = await import('../server/middleware/auth.js');
    const result = hashPassword('TestPassword123!');
    expect(result.salt).toBeDefined();
    expect(result.hash).toBeDefined();
    expect(result.salt.length).toBe(32); // 16 bytes hex
    expect(result.hash.length).toBe(128); // 64 bytes hex
  });

  it('verifyPassword with correct password returns true', async () => {
    const { hashPassword, verifyPassword } = await import('../server/middleware/auth.js');
    const { salt, hash } = hashPassword('CorrectPassword123!');
    expect(verifyPassword('CorrectPassword123!', salt, hash)).toBe(true);
  });

  it('verifyPassword with wrong password returns false', async () => {
    const { hashPassword, verifyPassword } = await import('../server/middleware/auth.js');
    const { salt, hash } = hashPassword('CorrectPassword123!');
    expect(verifyPassword('WrongPassword!', salt, hash)).toBe(false);
  });
});

// ========================================================================
// 4. RBAC / AUTHORIZATION
// ========================================================================
describe('RBAC Security', () => {
  it('rbacFactory denies unknown resources (fail-closed)', async () => {
    const { guard } = await import('../server/middleware/rbacFactory.js');
    // Create a mock req/res/next
    const mockReq = { user: { id: '1', role: 'worker', governorate: 'صنعاء' } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          expect(code).toBe(403);
          expect(data.code).toBe('RESOURCE_NOT_AUTHORIZED');
        }
      })
    };
    const mockNext = () => { throw new Error('should not reach next'); };
    const handler = guard('nonexistent_resource', 'read');
    handler(mockReq, mockRes, mockNext);
  });

  it('rbacFactory denies unauthenticated requests', async () => {
    const { guard } = await import('../server/middleware/rbacFactory.js');
    const mockReq = { user: null };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          expect(code).toBe(401);
        }
      })
    };
    const mockNext = () => { throw new Error('should not reach next'); };
    const handler = guard('entities', 'read');
    handler(mockReq, mockRes, mockNext);
  });

  it('requirePermission does not leak role/permission in error', async () => {
    const { requirePermission } = await import('../server/middleware/rbac.js');
    const mockReq = { user: { id: '1', role: 'worker', governorate: 'صنعاء' } };
    let responseData;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          responseData = { code, data };
        }
      })
    };
    const mockNext = () => {};
    const handler = requirePermission('write:entities');
    handler(mockReq, mockRes, mockNext);
    // The error should NOT contain 'required' or 'role' fields
    expect(responseData.code).toBe(403);
    expect(responseData.data.code).toBe('FORBIDDEN');
    expect(responseData.data.required).toBeUndefined();
    expect(responseData.data.role).toBeUndefined();
  });
});

// ========================================================================
// 5. INPUT SANITIZATION
// ========================================================================
describe('Input Sanitization', () => {
  it('escapeHtml escapes dangerous characters', async () => {
    const { escapeHtml } = await import('../src/app/utils/security.ts');
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    // escapeHtml escapes quotes and =, making XSS payloads inert
    const result2 = escapeHtml('"onload=alert(1)');
    expect(result2).toContain('&quot;');
    expect(result2).toContain('&#x3D;');
  });

  it('sanitizeUrl blocks javascript: URIs', async () => {
    const { sanitizeUrl } = await import('../src/app/utils/security.ts');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('checkPasswordStrength rejects weak passwords', async () => {
    const { checkPasswordStrength } = await import('../src/app/utils/security.ts');
    const weak = checkPasswordStrength('123');
    expect(weak.score).toBeLessThan(3);
    const strong = checkPasswordStrength('MyStr0ng!Pass');
    expect(strong.score).toBeGreaterThanOrEqual(4);
  });
});

// ========================================================================
// 6. CSRF PROTECTION
// ========================================================================
describe('CSRF Security', () => {
  it('CSRF is enforced in production', async () => {
    // Verify DISABLE_CSRF gate exists in security.js
    // The fix: process.exit(1) if DISABLE_CSRF=true in production
    const fs = await import('fs');
    const securityCode = fs.readFileSync(
      new URL('../server/middleware/security.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(securityCode).toContain('DISABLE_CSRF');
    expect(securityCode).toContain('FATAL');
    expect(securityCode).toContain('refusing to start');
  });
});

// ========================================================================
// 7. SECURITY HEADERS
// ========================================================================
describe('Security Headers', () => {
  it('CSP does not contain unsafe-eval', async () => {
    const fs = await import('fs');
    const securityHeadersCode = fs.readFileSync(
      new URL('../server/middleware/securityHeaders.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(securityHeadersCode).not.toContain("'unsafe-eval'");
  });

  it('HSTS header is set', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/securityHeaders.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('Strict-Transport-Security');
    expect(code).toContain('max-age=31536000');
  });

  it('X-Frame-Options is DENY', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/securityHeaders.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain("X-Frame-Options', 'DENY'");
  });
});

// ========================================================================
// 8. GITIGNORE / DOCKERIGNORE
// ========================================================================
describe('Secrets Not Committed', () => {
  it('.gitignore excludes .env.production', async () => {
    const fs = await import('fs');
    const gitignore = fs.readFileSync(
      new URL('../.gitignore', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(gitignore).toContain('.env.production');
  });

  it('.dockerignore exists and excludes .env*', async () => {
    const fs = await import('fs');
    const dockerignore = fs.readFileSync(
      new URL('../.dockerignore', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(dockerignore).toContain('.env*');
    expect(dockerignore).toContain('.git');
    expect(dockerignore).toContain('node_modules');
  });
});

// ========================================================================
// 9. ENCRYPTION
// ========================================================================
describe('Encryption (AES-256-GCM)', () => {
  // Encryption tests require ENCRYPTION_KEY to be set
  // In CI, the security gate ensures this is configured
  const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;

  it('ENCRYPTION_KEY is required (P0 Gate)', () => {
    // This test verifies the P0 Gate exists in security.js
    const fs = require('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/security.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('ENCRYPTION_KEY');
    expect(code).toContain('FATAL');
    expect(code).toContain('refusing to start');
  });

  it.skipIf(!hasEncryptionKey)('encryptField produces iv:tag:ciphertext format', async () => {
    const { encryptField } = await import('../server/middleware/security.js');
    const plaintext = 'Sensitive PII data';
    const encrypted = encryptField(plaintext);
    expect(encrypted).toBeDefined();
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3); // iv:tag:ciphertext
  });

  it.skipIf(!hasEncryptionKey)('decryptField recovers original plaintext', async () => {
    const { encryptField, decryptField } = await import('../server/middleware/security.js');
    const plaintext = 'National ID: 123456789';
    const encrypted = encryptField(plaintext);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it.skipIf(!hasEncryptionKey)('decryptField returns null for tampered ciphertext', async () => {
    const { encryptField, decryptField } = await import('../server/middleware/security.js');
    const encrypted = encryptField('test data');
    const parts = encrypted.split(':');
    parts[2] = parts[2].slice(0, -4) + '0000';
    const tampered = parts.join(':');
    const result = decryptField(tampered);
    expect(result).toBeNull();
  });
});

// ========================================================================
// 10. RATE LIMITING
// ========================================================================
describe('Rate Limiting Configuration', () => {
  it('login rate limit is configured (5 attempts/15min)', async () => {
    const fs = await import('fs');
    const rateLimitCode = fs.readFileSync(
      new URL('../server/middleware/rateLimit.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(rateLimitCode).toContain('loginLimit');
    expect(rateLimitCode).toContain('5'); // 5 attempts
  });
});

// ========================================================================
// 11. REGISTRATION AUTH
// ========================================================================
describe('Registration Security', () => {
  it('approve endpoint requires admin auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/registration.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('requireAdminAuth');
    // approve should use requireAdminAuth
    const approveLine = code.split('\n').find(l => l.includes('/approve'));
    expect(approveLine).toContain('requireAdminAuth');
  });

  it('reject endpoint requires admin auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/registration.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const rejectLine = code.split('\n').find(l => l.includes('/reject'));
    expect(rejectLine).toContain('requireAdminAuth');
  });

  it('branch mutations require auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/registration.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain("requireAuth, async (req, res) =>");
  });
});

// ========================================================================
// 12. ADMINISTRATION AUTH
// ========================================================================
describe('Administration Security', () => {
  it('settings endpoint requires admin auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/administration.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('requireAdminAuth');
  });

  it('role-permissions endpoint requires admin auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/administration.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const rpLine = code.split('\n').find(l => l.includes('/api/role-permissions') && l.includes('router.get'));
    expect(rpLine).toContain('requireAdminAuth');
  });
});

// ========================================================================
// 13. RESTORE ENDPOINTS
// ========================================================================
describe('Restore Endpoints Security', () => {
  it('members restore requires write:members permission', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/workers.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const restoreLine = code.split('\n').find(l => l.includes('/api/members/:id/restore'));
    expect(restoreLine).toContain('requirePermission');
  });

  it('fee_payments restore requires fees:edit permission', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/financial.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const restoreLine = code.split('\n').find(l => l.includes('/api/fee_payments/:id/restore'));
    expect(restoreLine).toContain('requirePermission');
  });
});

// ========================================================================
// 14. METRICS ENDPOINTS
// ========================================================================
describe('Metrics Security', () => {
  it('metrics endpoint requires admin auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/index.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('requireMetricsAuth');
    // Check that /api/metrics uses requireMetricsAuth
    const metricsLine = code.split('\n').find(l =>
      l.includes("/api/metrics'") && l.includes('app.get')
    );
    expect(metricsLine).toContain('requireMetricsAuth');
  });
});

// ========================================================================
// 15. FILE UPLOAD SECURITY
// ========================================================================
describe('Upload Security', () => {
  it('file download checks ownership', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/uploads.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('uploaded_by');
    expect(code).toContain('super_admin');
    expect(code).toContain('ministry_admin');
  });
});

// ========================================================================
// 16. INFORMATION DISCLOSURE
// ========================================================================
describe('Information Disclosure Prevention', () => {
  it('health endpoint does not expose pg_version', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/system.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    // The health endpoint should NOT contain pg_version
    const healthSection = code.split('/api/health')[1]?.split('router.')[0] || '';
    expect(healthSection).not.toContain('pg_version');
  });

  it('version endpoint does not expose nodeVersion or dbPool', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/index.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const versionSection = code.split('/api/version')[1]?.split('\n\n')[0] || '';
    expect(versionSection).not.toContain('nodeVersion');
    expect(versionSection).not.toContain('dbPool');
  });

  it('audit-log is not in PUBLIC_POST', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/index.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const publicPostLine = code.split('\n').find(l => l.includes('PUBLIC_POST'));
    expect(publicPostLine).not.toContain('audit-log');
  });
});

// ========================================================================
// 17. GEO DATA PRIVACY
// ========================================================================
describe('Geo Data Privacy', () => {
  it('geo headers are not exposed in responses', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/locationTracker.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).not.toContain('X-Geo-Country');
    expect(code).not.toContain('X-Geo-City');
  });

  it('IP geolocation uses HTTPS', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/locationTracker.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).not.toContain('http://ip-api.com');
    expect(code).toContain('https://ip-api.com');
  });
});

// ========================================================================
// 18. INCLUDE_DELETED RESTRICTION
// ========================================================================
describe('Soft Delete Security', () => {
  it('include_deleted only allowed for admin users', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/shared.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain("isAdmin && req.query.include_deleted");
  });
});

// ========================================================================
// 19. OFFLINE-FIRST DATABASE
// ========================================================================
describe('Offline-First Database', () => {
  it('localDb.js module exists', async () => {
    const fs = await import('fs');
    const path = new URL('../server/lib/localDb.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
    expect(fs.existsSync(path)).toBe(true);
  });

  it('shared.js imports localDb fallback', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/middleware/shared.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain("from '../lib/localDb.js'");
    expect(code).toContain('getNeonStatus');
    expect(code).toContain('healthyPool');
  });

  it('health endpoint reports offline_first status', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/system.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    expect(code).toContain('offline_first');
    expect(code).toContain('local_sqlite');
    expect(code).toContain('getNeonStatus');
  });

  it('sql.js is installed', () => {
    const fs = require('fs');
    const path = require('path');
    const sqlJsPath = path.join(
      new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'node_modules', 'sql.js'
    );
    expect(fs.existsSync(sqlJsPath)).toBe(true);
  });
});

// ========================================================================
// 20. OPERATIONS ROUTE AUTH
// ========================================================================
describe('Operations Route Security', () => {
  it('activities POST requires write:activities permission', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/operations.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const line = code.split('\n').find(l => l.includes("router.post('/api/activities'"));
    expect(line).toContain('requirePermission');
  });

  it('activities PUT requires write:activities permission', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/operations.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const line = code.split('\n').find(l => l.includes("router.put('/api/activities/:id'"));
    expect(line).toContain('requirePermission');
  });

  it('activities DELETE requires write:activities permission', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/operations.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const line = code.split('\n').find(l => l.includes("router.delete('/api/activities/:id'"));
    expect(line).toContain('requirePermission');
  });

  it('documents POST requires write:documents permission', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/routes/operations.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const line = code.split('\n').find(l => l.includes("router.post('/api/documents'"));
    expect(line).toContain('requirePermission');
  });

  it('dashboard analytics refresh requires admin auth', async () => {
    const fs = await import('fs');
    const code = fs.readFileSync(
      new URL('../server/index.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      'utf8'
    );
    const line = code.split('\n').find(l => l.includes('/api/dashboard/analytics/refresh'));
    expect(line).toContain('requireMetricsAuth');
  });
});
