/**
 * Security Utilities — XSS prevention, input sanitization, CSRF helpers
 * Lightweight, zero dependencies, production-ready
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const DANGEROUS_PROTOCOLS = /^(?:javascript|data|vbscript|file|about):/i;
const ALLOWED_TAGS = /<\/?(?:a|b|blockquote|br|code|div|em|h[1-6]|i|li|ol|p|pre|span|strong|ul)\b[^>]*>/gi;
const ON_EVENT_ATTRS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_HREF = /\b(?:href|src|action|formaction|background|poster|cite)\s*=\s*(?:"\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*')/gi;

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (str == null) return '';
  return String(str).replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Alias of `escapeHtml` (pascal-cased) for callers expecting `escapeHTML`.
 */
export const escapeHTML: typeof escapeHtml = escapeHtml;

/**
 * Sanitize URL to prevent javascript: and data: URI XSS
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (DANGEROUS_PROTOCOLS.test(trimmed)) {
    return '#';
  }
  return trimmed;
}

/**
 * Sanitize HTML by allowing only safe tags and stripping event handlers
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(JAVASCRIPT_HREF, '#')
    .replace(ON_EVENT_ATTRS, '')
    .replace(ALLOWED_TAGS, (match) => match);
}

/**
 * Strip all HTML tags - leaves only text content
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email);
}

/**
 * Validate Yemeni phone number (multiple formats)
 */
export function isValidYemeniPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Yemen: +967 7XXXXXXXX or 7XXXXXXXX or 01XXXXXX (landline)
  return /^(\+967[1-9]\d{7,8}|0[1-9]\d{6,7}|[1-9]\d{6,8})$/.test(cleaned);
}

/**
 * Validate national ID (Yemen - 9 digits typically)
 */
export function isValidNationalId(id: string): boolean {
  if (!id) return false;
  const cleaned = id.replace(/[\s-]/g, '');
  return /^\d{9,12}$/.test(cleaned);
}

/**
 * Generate cryptographically random ID
 */
export function generateId(length = 12): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison (for tokens)
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const maskChar = '•';

/**
 * Mask sensitive data (e.g., national ID, phone) for display
 */
export function maskString(value: string, visibleStart = 2, visibleEnd = 2, customMaskChar?: string): string {
  const char = customMaskChar || maskChar;
  if (!value || value.length <= visibleStart + visibleEnd) {
    return value ? char.repeat(value.length) : '';
  }
  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const middle = char.repeat(Math.max(value.length - visibleStart - visibleEnd, 3));
  return `${start}${middle}${end}`;
}

/**
 * Mask email: a****@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const masked = maskChar.repeat(Math.max(local.length - 2, 1));
  return `${visible}${masked}@${domain}`;
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string, maxLength = 100): string {
  if (!query) return '';
  return query
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"`;]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Rate limiter (client-side, simple)
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60_000
  ) {}

  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const recent = attempts.filter((t) => now - t < this.windowMs);

    if (recent.length >= this.maxAttempts) {
      const oldest = recent[0];
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.max(0, this.windowMs - (now - oldest)),
      };
    }

    recent.push(now);
    this.attempts.set(key, recent);
    return {
      allowed: true,
      remaining: this.maxAttempts - recent.length,
      resetIn: this.windowMs,
    };
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Detect and report potential security issues
 */
export interface SecurityReport {
  isHttps: boolean;
  hasCSP: boolean;
  hasHSTS: boolean;
  hasXFrameOptions: boolean;
  hasReferrerPolicy: boolean;
  fingerprint: string;
}

export function auditSecurity(): SecurityReport {
  if (typeof window === 'undefined') {
    return {
      isHttps: false,
      hasCSP: false,
      hasHSTS: false,
      hasXFrameOptions: false,
      hasReferrerPolicy: false,
      fingerprint: '',
    };
  }
  return {
    isHttps: window.location.protocol === 'https:',
    hasCSP: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
    hasHSTS: false, // Only available server-side
    hasXFrameOptions: false, // Only available server-side
    hasReferrerPolicy: !!document.querySelector('meta[name="referrer"]'),
    fingerprint: generateId(8),
  };
}

/**
 * Content Security Policy directive builder
 */
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.googletagmanager.com', 'https://www.google-analytics.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  connectSrc: ["'self'", 'https:', 'wss:'],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: [],
};

// ============================================================
// Session Management — client-side, used by AuthContext
// ============================================================

const SESSION_KEY = 'unionsphere_session';
const AUDIT_KEY = 'unionsphere_audit_log';
const RATE_LIMIT_KEY = 'unionsphere_rate_limit';

export interface Session {
  userId: string;
  email: string;
  userType: 'ministry' | 'organization';
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  csrfToken?: string;
}

export function createSession(
  userId: string,
  email: string,
  userType: 'ministry' | 'organization',
  ttlMs: number = 8 * 60 * 60 * 1000
): Session {
  const now = Date.now();
  const session: Session = {
    userId,
    email,
    userType,
    sessionId: generateId(24),
    createdAt: now,
    lastActivity: now,
    expiresAt: now + ttlMs,
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
  logAudit({ action: 'LOGIN', details: { userId, email, userType } });
  return session;
}

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      destroySession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function refreshSession(): Session | null {
  const session = getSession();
  if (!session) return null;
  session.lastActivity = Date.now();
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
  return session;
}

export function destroySession(): void {
  try {
    const existing = getSession();
    if (existing) {
      logAudit({ action: 'LOGOUT', details: { userId: existing.userId, email: existing.email } });
    }
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function isSessionExpired(): boolean {
  return getSession() === null;
}

export function isSessionWarning(warningMs: number = 5 * 60 * 1000): boolean {
  const session = getSession();
  if (!session) return false;
  return session.expiresAt - Date.now() < warningMs;
}

export function getSessionTimeRemaining(): number {
  const session = getSession();
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

// ============================================================
// Rate Limiting (client-side defense in depth)
// ============================================================

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

function getRateLimitStore(): Record<string, RateLimitEntry> {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRateLimitStore(store: Record<string, RateLimitEntry>): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable */
  }
}

export function recordFailedAttempt(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  lockoutMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetIn: number; locked: boolean } {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store[key];

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.lockedUntil - now,
      locked: true,
    };
  }

  if (!entry || now - entry.firstAttempt > windowMs) {
    store[key] = { attempts: 1, firstAttempt: now };
  } else {
    entry.attempts += 1;
    if (entry.attempts >= maxAttempts) {
      entry.lockedUntil = now + lockoutMs;
    }
  }

  saveRateLimitStore(store);
  const current = store[key];
  return {
    allowed: !current.lockedUntil || now >= current.lockedUntil,
    remaining: Math.max(0, maxAttempts - current.attempts),
    resetIn: current.lockedUntil ? Math.max(0, current.lockedUntil - now) : windowMs,
    locked: !!(current.lockedUntil && now < current.lockedUntil),
  };
}

export function clearRateLimit(key: string): void {
  const store = getRateLimitStore();
  delete store[key];
  saveRateLimitStore(store);
}

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetIn: number } {
  const store = getRateLimitStore();
  const now = Date.now();
  const entry = store[key];

  if (!entry) {
    return { allowed: true, remaining: maxAttempts, resetIn: windowMs };
  }

  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remaining: 0, resetIn: entry.lockedUntil - now };
  }

  if (now - entry.firstAttempt > windowMs) {
    delete store[key];
    saveRateLimitStore(store);
    return { allowed: true, remaining: maxAttempts, resetIn: windowMs };
  }

  return {
    allowed: entry.attempts < maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.attempts),
    resetIn: Math.max(0, windowMs - (now - entry.firstAttempt)),
  };
}

// ============================================================
// CSRF helpers
// ============================================================

const CSRF_STORAGE_KEY = 'unionsphere_csrf_token';
let _memoryCsrfToken: string | null = null;

/**
 * Generate a fresh CSRF token.
 * Persists it to document.cookie (browser), localStorage and an in-memory fallback so
 * it can be validated consistently in both browser and non-DOM (test) environments.
 */
export function generateCSRFToken(): string {
  const token = generateId(32);
  _memoryCsrfToken = token;
  try {
    localStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    /* storage unavailable */
  }
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `csrf_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Secure`;
    } catch {
      /* cookie unavailable */
    }
  }
  return token;
}

export function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  if (_memoryCsrfToken) return _memoryCsrfToken;
  try {
    const stored = localStorage.getItem(CSRF_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function validateCSRFToken(token: string | null): boolean {
  const stored = getCsrfToken();
  if (!stored || !token) return false;
  return timingSafeEqual(stored, token);
}

// ============================================================
// Input Sanitization
// ============================================================

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : typeof item === 'string' ? escapeHtml(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function sanitizeInput(value: unknown, maxLength: number = 1000): string {
  if (value == null) return '';
  const str = String(value);
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Strip SQL injection fragments from user-provided strings.
 * Removes SQL comments, statement terminators, quotes and common DDL/DML keywords
 * so values cannot escape the intended query context.
 */
export function sanitizeSQLInput(value: string): string {
  if (!value) return '';
  return String(value)
    .replace(/['";\\`]/g, '')
    .replace(/\b(union|select|insert|update|delete|drop|alter|create|truncate|exec|execute|declare|grant|revoke|merge|replace|rename)\b/gi, '')
    .replace(/\s*--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

/**
 * Evaluate password strength and return a score plus requirement breakdown.
 * `requirements` always contains 5 categories; `score` is the number met.
 */
export interface PasswordStrength {
  score: number;
  label: string;
  requirements: { label: string; met: boolean }[];
}

const COMMON_PASSWORDS = /^(123456|12345678|123456789|password|qwerty|letmein|admin|welcome|iloveyou|monkey|dragon|football|abc123|111111|666666|888888|password1)$/i;

export function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = [
    { label: '8+ أحرف', met: password.length >= 8 },
    { label: 'حروف كبيرة وصغيرة', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'أرقام', met: /\d/.test(password) },
    { label: 'رموز خاصة', met: /[^A-Za-z0-9]/.test(password) },
    { label: 'غير شائعة', met: !COMMON_PASSWORDS.test(password) },
  ];
  const score = requirements.filter((r) => r.met).length;
  let label: string;
  if (score <= 1) label = 'ضعيفة جداً';
  else if (score === 2) label = 'ضعيفة';
  else if (score === 3) label = 'مقبولة';
  else if (score === 4) label = 'قوية';
  else label = 'قوية جداً';
  return { score, label, requirements };
}

// ============================================================
// Audit Logging
// ============================================================

export interface AuditEntry {
  timestamp?: number;
  action?: string;
  details?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  email?: string;
  resource?: string;
  [key: string]: unknown;
}

export function logAudit(entry: Omit<AuditEntry, 'timestamp'>): void {
  try {
    const session = getSession();
    const log: AuditEntry = {
      ...entry,
      timestamp: Date.now(),
      userId: (entry.userId as string) ?? session?.userId,
      sessionId: (entry.sessionId as string) ?? session?.sessionId,
    };
    const raw = localStorage.getItem(AUDIT_KEY);
    const arr: AuditEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(log);
    // Keep last 500 entries
    while (arr.length > 500) arr.shift();
    localStorage.setItem(AUDIT_KEY, JSON.stringify(arr));

    if (import.meta.env?.DEV) {
      console.warn('[Audit]', log.action, log.details);
    }
  } catch {
    /* storage unavailable */
  }
}

export function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function buildCSP(directives = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([key, values]) => {
      const kebabKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      if (values.length === 0) return kebabKey;
      return `${kebabKey} ${values.join(' ')}`;
    })
    .join('; ');
}
