/**
 * TOTP (Time-Based One-Time Password) - مصادقة ثنائية
 * يدعم تنفيذ خوارزمية RFC 6238 للمصادقة الثنائية
 */

// تحويل Base32 إلى Uint8Array بطريقة محسنة
function base32ToBytes(base32: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanInput = base32.replace(/\s/g, '').toUpperCase();
  const result: number[] = [];
  
  let bits = 0;
  let buffer = 0;
  
  for (const char of cleanInput) {
    const index = chars.indexOf(char);
    if (index === -1) continue;
    
    buffer = (buffer << 5) | index;
    bits += 5;
    
    if (bits >= 8) {
      bits -= 8;
      result.push((buffer >> bits) & 0xff);
    }
  }
  
  return new Uint8Array(result);
}

// تحويل Uint8Array إلى ArrayBuffer
function toArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  return uint8.slice().buffer;
}

// HMAC-SHA1 - باستخدام Web Crypto API
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const keyBuffer = toArrayBuffer(key);
  const dataBuffer = toArrayBuffer(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}

// TOTP - تنفيذ RFC 6238
export async function generateTOTP(
  secret: string,
  digits: number = 6,
  period: number = 30
): Promise<string> {
  const key = base32ToBytes(secret);
  const time = Math.floor(Date.now() / 1000 / period);
  
  // تحويل الوقت إلى 8 بايت بترتيب big-endian
  const data = new Uint8Array(8);
  let timeBytes = time;
  for (let i = 7; i >= 0; i--) {
    data[i] = timeBytes & 0xff;
    timeBytes >>= 8;
  }
  
  const hash = await hmacSha1(key, data);
  
  // استخراج القيمة
  const offset = hash[hash.length - 1] & 0x0f;
  const code = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  const finalCode = code % Math.pow(10, digits);
  
  return finalCode.toString().padStart(digits, '0');
}

// التحقق من TOTP
export async function verifyTOTP(
  secret: string,
  token: string,
  window: number = 1
): Promise<boolean> {
  const current = await generateTOTP(secret);
  if (current === token) return true;

  // فحص النافذة السابقة واللاحقة
  const period = 30;
  for (let i = 1; i <= window; i++) {
    const prevTime = Math.floor((Date.now() - period * 1000) / 1000 / period);
    const prevCode = await generateTOTPForTime(secret, prevTime);
    if (prevCode === token) return true;
  }

  return false;
}

// توليد TOTP لوقت محدد (للتحقق)
async function generateTOTPForTime(
  secret: string,
  time: number,
  digits: number = 6
): Promise<string> {
  const key = base32ToBytes(secret);
  
  const data = new Uint8Array(8);
  let timeBytes = time;
  for (let i = 7; i >= 0; i--) {
    data[i] = timeBytes & 0xff;
    timeBytes >>= 8;
  }
  
  const hash = await hmacSha1(key, data);
  
  const offset = hash[hash.length - 1] & 0x0f;
  const code = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  const finalCode = code % Math.pow(10, digits);
  
  return finalCode.toString().padStart(digits, '0');
}

// توليد مفتاح سري عشوائي
export function generateSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const result: string[] = [];
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  
  for (const byte of randomBytes) {
    result.push(chars[byte % chars.length]);
  }
  
  return result.join('');
}

// إنشاء رابط QR للمصادقة الثنائية
export function generateQRCodeURL(
  secret: string,
  name: string,
  issuer: string = 'نظام قطاع العمل'
): string {
  const encodedName = encodeURIComponent(name);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedName}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// واجهة الإعداد
export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

// إعداد 2FA للمستخدم
export function setupTwoFactor(userName: string): TwoFactorSetup {
  const secret = generateSecret();
  const qrCode = generateQRCodeURL(secret, userName);
  
  // رموز احتياطية (للاستخدام إذا فقد الوصول للهاتف)
  const backupCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const codes = new Uint8Array(6);
    crypto.getRandomValues(codes);
    backupCodes.push(Array.from(codes)
      .map(b => (b % 10).toString())
      .join('')
    );
  }
  
  return { secret, qrCode, backupCodes };
}

// تخزين إعدادات 2FA
export function storeTwoFactorSettings(
  userId: string,
  secret: string,
  backupCodes: string[]
): void {
  const settings = {
    secret,
    backupCodes,
    enabled: true,
    createdAt: Date.now(),
  };
  localStorage.setItem(`2fa_settings_${userId}`, JSON.stringify(settings));
}

export function getTwoFactorSettings(userId: string): TwoFactorSetup | null {
  try {
    const data = localStorage.getItem(`2fa_settings_${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('[TOTP] Failed to parse 2FA settings:', e);
    return null;
  }
}

export function disableTwoFactor(userId: string): void {
  localStorage.removeItem(`2fa_settings_${userId}`);
}