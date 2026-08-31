// server/middleware/rateLimit.js
// Per-user, per-IP, per-endpoint rate limiting with sliding window
// + Concurrent session limits

import { pool } from './shared.js';

// Sliding window log per (key) -> timestamps
const windows = new Map();
// Concurrent session tracker
const sessionTracker = new Map(); // userId -> Map<sessionId, info>

const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10);

/**
 * Cleanup expired window entries to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    const cutoff = now - 300_000;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) windows.delete(key);
  }
}, 60_000).unref?.();

const DEFAULT_OPTS = {
  windowMs: 60_000,
  max: 200,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  skip: () => false,
  message: 'تجاوزت الحد المسموح من الطلبات — حاول بعد دقيقة',
};

export function rateLimit(options = {}) {
  const opts = { ...DEFAULT_OPTS, ...options };
  return (req, res, next) => {
    if (opts.skip(req)) return next();

    const key = `${opts.keyGenerator(req)}:${req.path}`;
    const now = Date.now();
    const cutoff = now - opts.windowMs;

    let entry = windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      windows.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= opts.max) {
      const resetIn = Math.ceil((entry.timestamps[0] + opts.windowMs - now) / 1000);
      res.setHeader('X-RateLimit-Limit', String(opts.max));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(resetIn));
      res.setHeader('Retry-After', String(resetIn));
      return res.status(429).json({
        error: opts.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetIn,
      });
    }

    entry.timestamps.push(now);
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(opts.max - entry.timestamps.length));
    next();
  };
}

// ── Per-endpoint presets ───────────────────────────────────────────────────────

/** Standard API: 200 req/min per IP+user */
export const standardLimit = rateLimit({
  windowMs: 60_000,
  max: 200,
  keyGenerator: (req) => `${req.ip || 'ip'}:${req.user?.id || 'anon'}`,
});

/** Login endpoint: 5 attempts per 15 minutes per IP+email */
export const loginLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  message: 'محاولات تسجيل دخول كثيرة — حاول بعد 15 دقيقة',
  keyGenerator: (req) => `login:${req.ip}:${req.body?.email || ''}`,
});

/** Password reset: 3 per hour per IP */
export const passwordResetLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 3,
  message: 'تجاوزت حد طلبات إعادة تعيين كلمة المرور',
});

/** MFA verification: 10 attempts per 5 minutes per user */
export const mfaLimit = rateLimit({
  windowMs: 5 * 60_000,
  max: 10,
  message: 'تجاوزت حد محاولات التحقق — حاول بعد 5 دقائق',
  keyGenerator: (req) => `mfa:${req.user?.id || req.ip}`,
});

/** Export endpoints: 10 per hour per user */
export const exportLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 10,
  message: 'تجاوزت حد الصادرات — حاول بعد ساعة',
  keyGenerator: (req) => `export:${req.user?.id || req.ip}`,
});

/** Upload: 20 per hour per user */
export const uploadLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 20,
  message: 'تجاوزت حد الرفع — حاول بعد ساعة',
  keyGenerator: (req) => `upload:${req.user?.id || req.ip}`,
});

// ── Concurrent Session Limits ─────────────────────────────────────────────────

export function trackSession(userId, sessionId, deviceInfo) {
  if (!userId) return null;
  let sessions = sessionTracker.get(userId);
  if (!sessions) {
    sessions = new Map();
    sessionTracker.set(userId, sessions);
  }
  sessions.set(sessionId, Object.assign({ lastSeen: Date.now() }, deviceInfo || {}));

  if (sessions.size > MAX_CONCURRENT_SESSIONS) {
    const sorted = [...sessions.entries()].sort(function(a, b) { return a[1].lastSeen - b[1].lastSeen; });
    const oldestId = sorted[0][0];
    sessions.delete(oldestId);
    return { evicted: oldestId };
  }
  return null;
}

export function untrackSession(userId, sessionId) {
  if (!userId) return;
  const sessions = sessionTracker.get(userId);
  if (sessions) {
    sessions.delete(sessionId);
    if (sessions.size === 0) sessionTracker.delete(userId);
  }
}

export function getActiveSessions(userId) {
  const sessions = sessionTracker.get(userId);
  if (!sessions) return [];
  return [...sessions.entries()].map(function(entry) {
    return { sessionId: entry[0], lastSeen: entry[1].lastSeen, ip: entry[1].ip };
  });
}

/** Middleware: enforce concurrent session limit */
export function enforceConcurrentSessions(options) {
  const max = (options && options.max) ? options.max : MAX_CONCURRENT_SESSIONS;
  return function(req, res, next) {
    const userId = req.user && req.user.id;
    if (!userId) return next();
    const sessionId = req.sessionId || (req.headers && req.headers['x-session-id']) || 'unknown';

    const evicted = trackSession(userId, sessionId, {
      ip: req.ip,
      userAgent: (req.headers && req.headers['user-agent']) ? req.headers['user-agent'].slice(0, 200) : '',
    });

    if (evicted && evicted.evicted) {
      pool.query(
        'INSERT INTO audit_log (action, resource, user_id, details, created_at) VALUES ($1,$2,$3,$4,NOW())',
        ['SESSION_EVICTED', 'session', userId, JSON.stringify({ evicted: evicted.evicted, reason: 'concurrent_limit' })],
      ).catch(function() {});
    }

    res.setHeader('X-Active-Sessions', String(getActiveSessions(userId).length));
    res.setHeader('X-Session-Limit', String(max));
    next();
  };
}
