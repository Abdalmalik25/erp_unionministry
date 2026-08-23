/**
 * Security Utilities — أدوات الأمان المؤسسية
 * Rate Limiting · Session Management · Input Sanitization · Audit
 */

// ============================================================
// Rate Limiter — تحديد معدل المحاولات
// ============================================================

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,   // 15 دقيقة
  lockoutMs: 30 * 60 * 1000,  // حظر 30 دقيقة بعد تجاوز الحد
};

export function checkRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: Date;
  message?: string;
} {
  const storageKey = `rl_${key}`;
  const now = Date.now();
  const raw = localStorage.getItem(storageKey);
  const record: RateLimitRecord = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: now, lastAttempt: now };

  // هل الحساب محظور؟
  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: new Date(record.lockedUntil),
      message: `تم تعليق حسابك مؤقتاً. يرجى المحاولة بعد ${remaining} دقيقة.`,
    };
  }

  // إعادة ضبط النافذة إذا انتهت
  if (now - record.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    const reset: RateLimitRecord = { attempts: 0, firstAttempt: now, lastAttempt: now };
    localStorage.setItem(storageKey, JSON.stringify(reset));
    return { allowed: true, remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts };
  }

  const remaining = RATE_LIMIT_CONFIG.maxAttempts - record.attempts;
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
}

export function recordFailedAttempt(key: string): {
  remainingAttempts: number;
  locked: boolean;
  lockedUntil?: Date;
} {
  const storageKey = `rl_${key}`;
  const now = Date.now();
  const raw = localStorage.getItem(storageKey);
  const record: RateLimitRecord = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: now, lastAttempt: now };

  record.attempts += 1;
  record.lastAttempt = now;

  if (!record.firstAttempt || now - record.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    record.firstAttempt = now;
    record.attempts = 1;
  }

  if (record.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    record.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutMs;
    localStorage.setItem(storageKey, JSON.stringify(record));
    return { remainingAttempts: 0, locked: true, lockedUntil: new Date(record.lockedUntil) };
  }

  localStorage.setItem(storageKey, JSON.stringify(record));
  return {
    remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - record.attempts,
    locked: false,
  };
}

export function clearRateLimit(key: string): void {
  localStorage.removeItem(`rl_${key}`);
}

// ============================================================
// Session Manager — إدارة الجلسات
// ============================================================

const SESSION_KEY = 'us_session';
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;  // 8 ساعات جلسة عمل رسمية
const SESSION_WARN_BEFORE_MS = 10 * 60 * 1000; // تحذير قبل 10 دقائق

export interface SessionData {
  userId: string;
  email: string;
  userType: 'ministry' | 'organization';
  loginAt: number;
  lastActivity: number;
  expiresAt: number;
  sessionId: string;
}

export function createSession(userId: string, email: string, userType: 'ministry' | 'organization'): SessionData {
  const now = Date.now();
  const session: SessionData = {
    userId,
    email,
    userType,
    loginAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_TIMEOUT_MS,
    sessionId: generateSessionId(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): SessionData | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    const demoRaw = localStorage.getItem('demo_user');
    const token = localStorage.getItem('auth_token');
    if (demoRaw || token) {
      try {
        const u = demoRaw ? JSON.parse(demoRaw) : { id: 'admin', email: 'ministry@yemen.gov.ye', userType: 'ministry' };
        return createSession(u.id, u.email, u.userType || 'ministry');
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const session: SessionData = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      destroySession();
      return null;
    }
    return session;
  } catch (e) {
    console.warn('[Security] Session parse failed, destroying session:', e);
    destroySession();
    return null;
  }
}

export function refreshSession(): SessionData | null {
  const session = getSession();
  if (!session) return null;
  const now = Date.now();
  session.lastActivity = now;
  session.expiresAt = now + SESSION_TIMEOUT_MS;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function destroySession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('demo_user');
}

export function getSessionTimeRemaining(): number {
  const session = getSession();
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

export function isSessionWarning(): boolean {
  const remaining = getSessionTimeRemaining();
  return remaining > 0 && remaining <= SESSION_WARN_BEFORE_MS;
}

export function isSessionExpired(): boolean {
  const session = getSession();
  if (!session) return true;
  return Date.now() > session.expiresAt;
}

function generateSessionId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// Input Sanitizer — تعقيم المدخلات
// ============================================================

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<[^>]+on\w+\s*=\s*["'][^"']*["'][^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,
];

const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|HAVING|GROUP BY)\b)/gi,
  /--[^\n]*/g,
  /\/\*[\s\S]*?\*\//g,
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
];

export function sanitizeInput(value: string): string {
  if (typeof value !== 'string') return '';
  let clean = value.trim();
  XSS_PATTERNS.forEach(p => { clean = clean.replace(p, ''); });
  return clean;
}

export function sanitizeSQLInput(value: string): string {
  let clean = sanitizeInput(value);
  SQL_PATTERNS.forEach(p => { clean = clean.replace(p, ''); });
  return clean;
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v) : v);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

// ============================================================
// Audit Logger — تسجيل المراقبة الأمنية
// ============================================================

export type AuditAction =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT'
  | 'SESSION_EXPIRED' | 'RATE_LIMITED' | 'ACCOUNT_LOCKED'
  | 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'EXPORT' | 'IMPORT' | 'PRINT'
  // قيم مبسّطة للاستخدام في الصفحات
  | 'view' | 'create' | 'update' | 'delete' | 'export' | 'import' | 'print';

export interface AuditEntry {
  action: AuditAction;
  userId?: string;
  email?: string;
  resource?: string;
  resourceId?: string;
  details?: string | Record<string, unknown>;
  timestamp: number;
  sessionId?: string;
  ipHint?: string;
}

const AUDIT_KEY = 'us_audit_log';
const MAX_AUDIT_ENTRIES = 500;

export function logAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
  try {
    const session = getSession();
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: Date.now(),
      sessionId: session?.sessionId,
    };

    const raw = localStorage.getItem(AUDIT_KEY);
    const log: AuditEntry[] = raw ? JSON.parse(raw) : [];
    log.push(fullEntry);

    if (log.length > MAX_AUDIT_ENTRIES) log.splice(0, log.length - MAX_AUDIT_ENTRIES);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log));

    fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId,
        details: typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || {}),
        user_id: entry.userId,
        email: entry.email,
      }),
    }).catch(() => {});
  } catch (e) {
    console.warn('[Security] Failed to write audit log:', e);
  }
}

export function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Security] Failed to parse audit log:', e);
    return [];
  }
}

// ============================================================
// Password Strength — قوة كلمة المرور
// ============================================================

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  requirements: { met: boolean; text: string }[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = [
    { met: password.length >= 8, text: 'على الأقل 8 أحرف' },
    { met: /[A-Z]/.test(password), text: 'حرف كبير واحد على الأقل' },
    { met: /[a-z]/.test(password), text: 'حرف صغير واحد على الأقل' },
    { met: /\d/.test(password), text: 'رقم واحد على الأقل' },
    { met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), text: 'رمز خاص واحد على الأقل' },
  ];

  const score = requirements.filter(r => r.met).length as 0 | 1 | 2 | 3 | 4;
  const labels = ['ضعيفة جداً', 'ضعيفة', 'مقبولة', 'قوية', 'قوية جداً'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return { score, label: labels[score] || 'ضعيفة جداً', color: colors[score] || 'bg-red-500', requirements };
}

// ============================================================
// CSRF Token — حماية CSRF
// ============================================================

export function generateCSRFToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const token = btoa(String.fromCharCode(...arr));
  sessionStorage.setItem('csrf_token', token);
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const stored = sessionStorage.getItem('csrf_token');
  return !!stored && stored === token;
}

export function getCSRFToken(): string {
  return sessionStorage.getItem('csrf_token') || generateCSRFToken();
}

// ============================================================
// Content Security Policy Helpers
// ============================================================

export function escapeHTML(str: string): string {
  if (typeof str !== 'string') return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

// ============================================================
// Debounce — تأخير الطلبات لتحسين الأداء
// ============================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  };
}