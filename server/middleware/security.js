// server/middleware/security.js — Nuclear Zero Trust hardening
// TD-006 CSRF, TD-028 HTTPS, TD-029 CSP, sanitization, encryption, MFA hook

import '../lib/loadEnv.js';
import crypto from 'crypto';

// P0 Gate: refuse to start with CSRF disabled in production
if (process.env.DISABLE_CSRF === 'true' && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] FATAL: DISABLE_CSRF=true in production — refusing to start (P0 Gate)');
  process.exit(1);
}
export function csrfMiddleware(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  // allowlist for login/health
  if (req.path.startsWith('/api/auth/') || req.path==='/api/health' || req.path==='/api/health/detailed') return next();
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  const cookie = req.headers['x-csrf-cookie'] || req.headers.cookie?.match(/csrf=([^;]+)/)?.[1];
  // CSRF always enabled for security — gradual rollout via opt-out
  if (process.env.DISABLE_CSRF === 'true') return next();
  if (!token || !cookie || token !== cookie) {
    return res.status(403).json({ error: 'CSRF token غير صالح', code:'CSRF_FAILED' });
  }
  next();
}

// إصلاح دين تقني: الكوكي لم يكن يُصدر أبدًا (issueCsrfToken غير موصول بأي مسار)
// ما كان يجعل كل الطلبات غير الآمنة تفشل 403 في الإنتاج. يُصدر الكوكي عند غيابه
// على الطلبات الآمنة (GET/HEAD/OPTIONS) فقط — ولا يُعاد توليده وهو موجود
// تجنّبًا لإبطال توكنات طلبات POST متزامنة قيد الطيران.
export function ensureCsrfCookie(req, res, next) {
  const existing = req.headers.cookie?.match(/(?:^|;\s*)csrf=([^;]+)/)?.[1];
  if (existing) return next();
  return issueCsrfToken(req, res, next);
}

export function issueCsrfToken(_req, res, next) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie?.('csrf', token, { httpOnly:false, sameSite:'strict', secure: process.env.NODE_ENV==='production' });
  res.setHeader('x-csrf-token', token);
  next();
}

// Input sanitization — XSS + SQL column injection guard
const DANGEROUS = /[<>\"'`;]|--|\/\*|\*\//g;
export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const [k,v] of Object.entries(req.body)) {
      if (typeof v === 'string') {
        // trim + limit + strip dangerous for non-rich fields
        if (k!=='description' && k!=='content_ar' && k!=='summary') {
          req.body[k]= v.replace(DANGEROUS,'').slice(0,5000);
        }
      }
    }
  }
  next();
}

// Field-level encryption for PII (AES-256-GCM) — key from env
// P0 Gate: production must have ENCRYPTION_KEY set — no defaults allowed
const ENC_KEY = process.env.ENCRYPTION_KEY;
if (!ENC_KEY) {
  console.error('[SECURITY] FATAL: ENCRYPTION_KEY is not set — refusing to start (P0 Gate)');
  process.exit(1);
}
const ENC_ALGO='aes-256-gcm';
export function encryptField(plaintext) {
  if (!plaintext) return null;
  const iv=crypto.randomBytes(12);
  const key=crypto.createHash('sha256').update(ENC_KEY).digest();
  const cipher=crypto.createCipheriv(ENC_ALGO, key, iv);
  const enc=Buffer.concat([cipher.update(String(plaintext),'utf8'), cipher.final()]);
  const tag=cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}
export function decryptField(ciphertext) {
  try {
    const [ivHex, tagHex, encHex]=ciphertext.split(':');
    const key=crypto.createHash('sha256').update(ENC_KEY).digest();
    const decipher=crypto.createDecipheriv(ENC_ALGO, key, Buffer.from(ivHex,'hex'));
    decipher.setAuthTag(Buffer.from(tagHex,'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex,'hex')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

// MFA — TOTP حقيقي (RFC 6238) عبر server/lib/totp.js
// سلوك تزايدي: دون ENABLE_MFA='enforced' يمر الطلب كما كان (لا تغيير على الوضع الحالي).
// عند التفعيل: يُشترط رأس x-mfa-token صالح ضد سر المستخدم المُسجّل (mfa_enabled=true).
import { pool } from './shared.js';
import { verifyTotp } from '../lib/totp.js';

export async function requireMFA(req, res, next) {
  if (process.env.ENABLE_MFA !== 'enforced') return next();
  if (!req.user?.sub) {
    return res.status(403).json({ error: 'مطلوب رمز MFA للعمليات الحساسة', code: 'MFA_REQUIRED' });
  }
  try {
    const u = await pool.query(
      'SELECT mfa_secret, mfa_enabled FROM sector_users WHERE id=$1 AND deleted_at IS NULL',
      [req.user.sub]);
    const row = u.rows[0];
    if (!row?.mfa_enabled || !row.mfa_secret) {
      return res.status(403).json({ error: 'MFA غير مُسجّل لهذا الحساب', code: 'MFA_NOT_ENROLLED' });
    }
    const token = req.headers['x-mfa-token'];
    if (!verifyTotp(row.mfa_secret, token)) {
      return res.status(403).json({ error: 'رمز MFA غير صالح أو منتهي', code: 'MFA_INVALID' });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'خطأ في التحقق من MFA', code: 'MFA_ERROR' });
  }
}
