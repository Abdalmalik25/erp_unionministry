/**
 * Enterprise Encryption System - نظام التشفير المؤسسي
 * High-performance encryption for offline data storage
 * Ministry-grade security for commercial establishments and unions
 */

// إعدادات التشفير
const ENCRYPTION_KEY_STORAGE = 'us_encryption_key';
const ENCRYPTION_ITERATIONS = 100000;
const ENCRYPTION_SALT_LENGTH = 16;

// ============================================================
// توليد مفتاح التشفير من سلسلة نصية
// ============================================================

async function deriveKeyFromString(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(keyString);
  const salt = new Uint8Array(ENCRYPTION_SALT_LENGTH);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ENCRYPTION_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ============================================================
// توليد مفتاح التشفير
// ============================================================

export async function generateEncryptionKey(): Promise<CryptoKey> {
  // محاولة استرجاع المفتاح المخزن
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE);
  if (storedKey) {
    try {
      const rawKey = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        rawKey,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      ) as CryptoKey;
    } catch (e) {
      console.warn('[Encryption] Failed to restore key, creating new one:', e);
    }
  }

  // توليد مفتاح جديد
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // تخزين المفتاح كـ JWK
  const jwk = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(jwk));

  return key;
}

// ============================================================
// تشفير البيانات
// ============================================================

export async function encryptData(data: any, keyString?: string): Promise<string> {
  const encryptionKey = keyString 
    ? await deriveKeyFromString(keyString) 
    : await generateEncryptionKey();
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = typeof data === 'string' ? new TextEncoder().encode(data) : new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    encodedData
  );

  // دمج IV مع البيانات المشفرة
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// ============================================================
// فك تشفير البيانات
// ============================================================

export async function decryptData<T = any>(encryptedData: string, keyString?: string): Promise<T | null> {
  try {
    const encryptionKey = keyString 
      ? await deriveKeyFromString(keyString) 
      : await generateEncryptionKey();
    
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      data
    );

    const decoded = new TextDecoder().decode(decrypted);
    try {
      return JSON.parse(decoded) as T;
    } catch {
      // JSON parse failed, return raw decoded string
      return decoded as unknown as T;
    }
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    return null;
  }
}

// ============================================================
// تخزين مشفر آمن
// ============================================================

export async function secureStore(key: string, data: any, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
  const encrypted = await encryptData({
    data,
    timestamp: Date.now(),
    ttl,
  });
  
  localStorage.setItem(`secure_${key}`, encrypted);
}

// ============================================================
// استرجاع البيانات المشفرة
// ============================================================

export async function secureRetrieve<T = any>(key: string): Promise<T | null> {
  const encrypted = localStorage.getItem(`secure_${key}`);
  
  if (!encrypted) return null;

  const decrypted = await decryptData<{ data: T; timestamp: number; ttl: number }>(encrypted);
  
  if (!decrypted) return null;

  // فحص صلاحية البيانات
  if (Date.now() - decrypted.timestamp > decrypted.ttl) {
    localStorage.removeItem(`secure_${key}`);
    return null;
  }

  return decrypted.data;
}

// ============================================================
// تشفير الحساسات الكامل (للنسخ الاحتياطية)
// ============================================================

export async function encryptFullEstablishment(establishment: any): Promise<string> {
  // استخراج الحقول الحساسة فقط
  const sensitiveFields = {
    nationalId: establishment.ownerNationalId || establishment.managerNationalId,
    financialData: {
      capital: establishment.capital,
      revenue: establishment.annualRevenue,
      expenses: establishment.annualExpenses,
      taxRef: establishment.taxReference,
    },
    contracts: establishment.contracts,
    employees: establishment.employeesCount,
    personalData: {
      ownerName: establishment.ownerName,
      managerName: establishment.managerName,
      ownerPhone: establishment.ownerNationalId ? establishment.mobile : undefined,
      managerPhone: establishment.managerPhone,
    },
  };

  return encryptData(sensitiveFields);
}

// ============================================================
// فحص سلامة البيانات (Data Integrity Check)
// ============================================================

export async function verifyDataIntegrity(data: string, signature?: string): Promise<boolean> {
  if (!signature) return true;
  
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hash === signature;
  } catch (e) {
    console.error('[Encryption] Signature verification failed:', e);
    return false;
  }
}

// ============================================================
// إنشاء توقيع للبيانات
// ============================================================

export async function createDataSignature(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// مسح جميع البيانات المشفرة
// ============================================================

export function clearSecureStorage(): void {
  Object.keys(localStorage)
    .filter(key => key.startsWith('secure_'))
    .forEach(key => localStorage.removeItem(key));
}

// ============================================================
// فحص القدرة على التشفير في المتصفح
// ============================================================

export function canEncrypt(): boolean {
  return !!(
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof crypto.getRandomValues === 'function'
  );
}