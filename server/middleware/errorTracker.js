/**
 * Error Tracker — Phase 5
 * Captures and aggregates errors with context for alerting
 * Sends to console (structured) and can be extended to Sentry/Datadog
 */

const ERROR_BUCKETS = new Map();
const RECENT_ERRORS = [];
const ALERT_RULES = [];
const MAX_RECENT = 200;

const DEFAULT_RULES = [
  { name: 'high_error_rate', threshold: 50, windowMs: 60_000, severity: 'critical' },
  { name: 'db_connection_lost', errorCode: 'ECONNREFUSED', severity: 'critical' },
  { name: 'auth_bypass_attempt', errorCode: 'AUTH_BYPASS', severity: 'high' },
  { name: 'unhandled_promise_rejection', errorName: 'UnhandledPromiseRejection', severity: 'high' },
];

/**
 * Classify error
 */
function classifyError(err) {
  if (!err) return { code: 'UNKNOWN', name: 'Unknown' };
  return {
    code: err.code || err.name || 'UNKNOWN',
    name: err.name || 'Error',
    status: err.status || err.statusCode,
  };
}

/**
 * Track an error
 */
export function trackError(err, context = {}) {
  const cls = classifyError(err);
  const key = `${cls.code}:${context.route || context.path || 'global'}`;
  const now = Date.now();
  const bucket = ERROR_BUCKETS.get(key) || { count: 0, firstSeen: now, lastSeen: now, code: cls.code };
  bucket.count += 1;
  bucket.lastSeen = now;
  ERROR_BUCKETS.set(key, bucket);

  const record = {
    ts: new Date(now).toISOString(),
    code: cls.code,
    name: cls.name,
    status: cls.status,
    message: (err?.message || String(err)).substring(0, 200),
    stack: (err?.stack || '').substring(0, 500),
    context: {
      route: context.route || context.path,
      method: context.method,
      userId: context.userId,
      userRole: context.userRole,
      organizationId: context.organizationId,
      ip: context.ip,
      ...context,
    },
  };
  RECENT_ERRORS.unshift(record);
  if (RECENT_ERRORS.length > MAX_RECENT) RECENT_ERRORS.pop();

  // Check alert rules
  for (const rule of ALERT_RULES) {
    if (shouldFireAlert(rule, cls, bucket)) {
      fireAlert(rule, cls, bucket, record);
    }
  }

  return record;
}

function shouldFireAlert(rule, cls, bucket) {
  if (rule.errorCode && cls.code === rule.errorCode) return true;
  if (rule.errorName && cls.name === rule.errorName) return true;
  if (rule.threshold && rule.windowMs) {
    if (bucket.lastSeen - bucket.firstSeen < rule.windowMs && bucket.count >= rule.threshold) {
      return true;
    }
  }
  return false;
}

function fireAlert(rule, cls, bucket, record) {
  const alert = {
    firedAt: new Date().toISOString(),
    rule: rule.name,
    severity: rule.severity,
    code: cls.code,
    count: bucket.count,
    recentMessage: record.message,
  };
  // In production: send to Sentry/Datadog/PagerDuty
  if (process.env.NODE_ENV !== 'production' || process.env.LOG_ALERTS === 'true') {
    console.error(`[ALERT:${rule.severity.toUpperCase()}] ${rule.name}`, JSON.stringify(alert));
  }
  return alert;
}

/**
 * Express error-tracking middleware
 * Place AFTER all routes; BEFORE final error handler
 */
export function errorTrackerMiddleware(err, req, res, next) {
  trackError(err, {
    route: req.route?.path || req.baseUrl,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    userRole: req.user?.role,
    organizationId: req.user?.organizationId,
    ip: req.ip,
  });
  next(err);
}

/**
 * Get aggregated error stats
 */
export function getErrorStats() {
  const buckets = [];
  const now = Date.now();
  for (const [key, b] of ERROR_BUCKETS) {
    buckets.push({
      key,
      code: b.code,
      count: b.count,
      firstSeen: new Date(b.firstSeen).toISOString(),
      lastSeen: new Date(b.lastSeen).toISOString(),
      ageSeconds: Math.floor((now - b.firstSeen) / 1000),
    });
  }
  buckets.sort((a, b) => b.count - a.count);

  return {
    totalBuckets: ERROR_BUCKETS.size,
    totalRecent: RECENT_ERRORS.length,
    topErrors: buckets.slice(0, 20),
    recent: RECENT_ERRORS.slice(0, 50),
    alertRules: DEFAULT_RULES,
  };
}

/**
 * Reset error stats
 */
export function resetErrorStats() {
  ERROR_BUCKETS.clear();
  RECENT_ERRORS.length = 0;
}

// Initialize default rules
ALERT_RULES.push(...DEFAULT_RULES);

// Catch unhandled rejections and exceptions at the process level
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  err.name = 'UnhandledPromiseRejection';
  trackError(err, { source: 'process.unhandledRejection' });
});

process.on('uncaughtException', (err) => {
  err.name = 'UncaughtException';
  trackError(err, { source: 'process.uncaughtException' });
  // In production (non-serverless) let process exit for supervisor restart
  // In Vercel serverless — don't exit, let the function fail gracefully
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
    console.error('[FATAL] Uncaught exception — exiting for supervisor restart');
    process.exit(1);
  }
});

export default { trackError, errorTrackerMiddleware, getErrorStats, resetErrorStats };
