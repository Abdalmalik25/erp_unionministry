// server/lib/totp.js — TOTP حقيقي وفق RFC 6238 (بلا اعتماديات خارجية)
// HMAC-SHA1، خطوة 30 ثانية، 6 خانات، نافذة تحقق ±1 لمواجهة انحراف الساعة
import crypto from 'crypto';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** ترميز Buffer إلى Base32 (RFC 4648) */
export function base32Encode(buf) {
  let bits = 0, value = 0, output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/** فك ترميز Base32 إلى Buffer — يعيد null عند إدخال غير صالح */
export function base32Decode(str) {
  if (!str) return null;
  const clean = String(str).toUpperCase().replace(/[=\s]/g, '');
  if (!clean.length || /[^A-Z2-7]/.test(clean)) return null;
  let bits = 0, value = 0;
  const bytes = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** توليد سر جديد (20 بايت = 160 بت وفق RFC 4226) */
export function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** رابط otpauth:// لتطبيقات المصادقة (Google Authenticator وغيرها) */
export function otpauthUrl(secret, accountLabel, issuer) {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** حساب رمز TOTP لعدّاد زمني محدد (إصدار داخلي) */
function hotp(secretBuf, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

/** التحقق من رمز TOTP بنافذة ±1 (90 ثانية إجمالاً) — ثابت الزمن ضد هجمات التوقيت */
export function verifyTotp(secret, token, window = 1) {
  const secretBuf = base32Decode(secret);
  if (!secretBuf) return false;
  const clean = String(token || '').trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  // مقارنة كل الاحتمالات ثم الاختيار — لا خروج مبكر يعتمد على المدخل
  let ok = false;
  for (let i = -window; i <= window; i++) {
    const expected = hotp(secretBuf, counter + i);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) ok = true;
  }
  return ok;
}