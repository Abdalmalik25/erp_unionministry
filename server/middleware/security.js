// server/middleware/security.js — Nuclear Zero Trust hardening
// TD-006 CSRF, TD-028 HTTPS, TD-029 CSP, sanitization, encryption, MFA hook

import '../lib/loadEnv.js';
import crypto from 'crypto';

// CSRF: double-submit cookie pattern (stateless, no extra store)
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

// MFA hook — TOTP placeholder
// ⚠️ لا يوجد تنفيذ حقيقي لـ TOTP بعد؛ فرضه افتراضياً كان يحجب كل طلبات
// الإنتاج (بما فيها تسجيل الدخول و/health). الفرض الآن opt-in صريح:
// اضبط ENABLE_MFA='enforced' فقط عند إطلاق تنفيذ MFA فعلي.
export function requireMFA(req, res, next) {
  if (process.env.ENABLE_MFA === 'enforced') {
    return res.status(403).json({ error: 'مطلوب رمز MFA للعمليات الحساسة', code: 'MFA_REQUIRED' });
  }
  next();
}
