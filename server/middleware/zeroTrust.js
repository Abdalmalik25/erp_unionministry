// server/middleware/zeroTrust.js — Nuclear Zero Trust Micro-Segmentation
// Per-packet verification, context-aware access, anomaly scoring, Never Trust Always Verify

import crypto from 'crypto';

// ===================== Micro-Segmentation Policy Engine =====================

const SEGMENTS = {
  PUBLIC: { level: 0, label: 'public', requiresAuth: false },
  RESTRICTED: { level: 1, label: 'restricted', requiresAuth: true },
  CONFIDENTIAL: { level: 2, label: 'confidential', requiresAuth: true, requiresMFA: true },
  SECRET: { level: 3, label: 'secret', requiresAuth: true, requiresMFA: true, requiresJurisdiction: true },
  TOP_SECRET: { level: 4, label: 'top-secret', requiresAuth: true, requiresMFA: true, requiresJurisdiction: true, requiresHSM: true },
};

const ROUTE_SEGMENTS = {
  '/api/health': 'PUBLIC',
  '/api/auth/login': 'PUBLIC',
  '/api/version': 'PUBLIC',
  '/api/isic4': 'PUBLIC',
  '/api/geography/governorates': 'PUBLIC',
  '/api/system/branding': 'PUBLIC',
  '/api/system/policy': 'PUBLIC',
  '/api/establishments/lookup': 'PUBLIC',
  '/api/dashboard': 'RESTRICTED',
  '/api/entities': 'RESTRICTED',
  '/api/workers': 'RESTRICTED',
  '/api/occupations': 'RESTRICTED',
  '/api/registration': 'RESTRICTED',
  '/api/compliance': 'CONFIDENTIAL',
  '/api/financial': 'CONFIDENTIAL',
  '/api/inspections': 'CONFIDENTIAL',
  '/api/disputes': 'CONFIDENTIAL',
  '/api/contracts': 'CONFIDENTIAL',
  '/api/payments': 'CONFIDENTIAL',
  '/api/administration': 'SECRET',
  '/api/auth': 'SECRET',
  '/api/telemetry': 'SECRET',
  '/api/cross-portal': 'TOP_SECRET',
};

function resolveSegment(path) {
  let bestMatch = 'PUBLIC';
  let bestLength = 0;
  for (const [prefix, segment] of Object.entries(ROUTE_SEGMENTS)) {
    if (path.startsWith(prefix) && prefix.length > bestLength) {
      bestMatch = segment;
      bestLength = prefix.length;
    }
  }
  return SEGMENTS[bestMatch] || SEGMENTS.PUBLIC;
}

// ===================== Request Context Verification =====================

function buildRequestContext(req) {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const ua = req.headers['user-agent'] || '';
  const method = req.method;
  const path = req.path;
  const timestamp = Date.now();
  const hasAuth = !!req.user;
  const role = req.user?.role || 'anonymous';
  const sessionId = req.user?.sid || null;
  const referer = req.headers['referer'] || '';
  const contentType = req.headers['content-type'] || '';
  const accept = req.headers['accept'] || '';
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  // Generate request integrity hash
  const integrityData = `${method}:${path}:${ip}:${ua}:${timestamp}`;
  const integrity = crypto.createHmac('sha256', 'zero-trust-v1').update(integrityData).digest('hex').slice(0, 16);

  return {
    ip, ua, method, path, timestamp, hasAuth, role, sessionId,
    referer, contentType, accept, contentLength, integrity,
  };
}

// ===================== Anomaly Scoring Engine =====================

const anomalyBaselines = new Map();
const ANOMALY_WINDOW = 300000; // 5 minutes

function calculateAnomalyScore(context) {
  let score = 0;
  const reasons = [];
  const now = context.timestamp;
  const baseline = anomalyBaselines.get(context.ip) || { requests: [], avgContentLength: 0, uniquePaths: new Set() };

  baseline.requests.push({ time: now, path: context.path, method: context.method });
  baseline.requests = baseline.requests.filter(r => now - r.time < ANOMALY_WINDOW);
  baseline.uniquePaths.add(context.path);
  if (baseline.uniquePaths.size > 100) baseline.uniquePaths = new Set([...baseline.uniquePaths].slice(-50));
  anomalyBaselines.set(context.ip, baseline);

  // High request frequency
  const recentRequests = baseline.requests.filter(r => now - r.time < 60000);
  if (recentRequests.length > 60) {
    score += 20;
    reasons.push('high-frequency');
  }

  // Method anomaly (PUT/DELETE on public routes)
  if (['PUT', 'DELETE', 'PATCH'].includes(context.method) && context.path.startsWith('/api/dashboard')) {
    score += 25;
    reasons.push('method-anomaly');
  }

  // Missing expected headers
  if (!context.ua || context.ua.length < 10) {
    score += 15;
    reasons.push('missing-ua');
  }
  if (!context.referer && ['POST', 'PUT', 'DELETE'].includes(context.method)) {
    score += 10;
    reasons.push('missing-referer');
  }

  // Content-Type mismatch
  if (['POST', 'PUT'].includes(context.method) && context.contentLength > 0 && !context.contentType) {
    score += 15;
    reasons.push('missing-content-type');
  }

  // Path scanning detection
  if (baseline.uniquePaths.size > 30 && recentRequests.length > 20) {
    const uniqueRecent = new Set(recentRequests.map(r => r.path));
    if (uniqueRecent.size > 15) {
      score += 30;
      reasons.push('path-scanning');
    }
  }

  // Unusual time access (basic heuristic)
  const hour = new Date(now).getHours();
  if (hour >= 0 && hour < 5) {
    score += 5;
    reasons.push('off-hours');
  }

  return { score, reasons, baseline: { requestCount: baseline.requests.length, uniquePaths: baseline.uniquePaths.size } };
}

// ===================== Context-Aware Access Control =====================

const ROLE_CLEARANCE = {
  anonymous: 0,
  worker: 1,
  employer: 2,
  organization: 2,
  union: 2,
  registry_officer: 3,
  ministry_admin: 4,
  super_admin: 5,
};

function checkAccessClearance(context, segment) {
  const userClearance = ROLE_CLEARANCE[context.role] || 0;
  const requiredClearance = segment.level;

  if (segment.requiresAuth && !context.hasAuth) {
    return { allowed: false, reason: 'authentication-required', required: requiredClearance };
  }
  if (userClearance < requiredClearance) {
    return { allowed: false, reason: 'insufficient-clearance', user: userClearance, required: requiredClearance };
  }
  return { allowed: true };
}

// ===================== Rate Tracking per Segment =====================

const segmentRateLimits = {
  PUBLIC: { maxPerMinute: 120, burst: 30 },
  RESTRICTED: { maxPerMinute: 60, burst: 15 },
  CONFIDENTIAL: { maxPerMinute: 30, burst: 10 },
  SECRET: { maxPerMinute: 15, burst: 5 },
  TOP_SECRET: { maxPerMinute: 10, burst: 3 },
};

const segmentRateTracker = new Map();

function checkSegmentRate(segmentLabel, ip) {
  const key = `${segmentLabel}:${ip}`;
  const now = Date.now();
  const limits = segmentRateLimits[segmentLabel] || segmentRateLimits.PUBLIC;
  const tracker = segmentRateTracker.get(key) || { requests: [], burstCount: 0, lastBurst: 0 };

  tracker.requests.push(now);
  tracker.requests = tracker.requests.filter(t => now - t < 60000);

  if (tracker.requests.length > limits.maxPerMinute) {
    return { allowed: false, reason: 'segment-rate-exceeded', limit: limits.maxPerMinute, current: tracker.requests.length };
  }

  const recentBurst = tracker.requests.filter(t => now - t < 1000).length;
  if (recentBurst > limits.burst) {
    return { allowed: false, reason: 'burst-exceeded', limit: limits.burst, current: recentBurst };
  }

  segmentRateTracker.set(key, tracker);
  return { allowed: true };
}

// ===================== Nuclear Zero Trust Middleware =====================

export function zeroTrustMiddleware(req, res, next) {
  const context = buildRequestContext(req);
  const segment = resolveSegment(req.path);

  // 1. Access clearance check
  const clearance = checkAccessClearance(context, segment);
  if (!clearance.allowed) {
    logZeroTrustEvent(req, 'ACCESS_DENIED', { segment: segment.label, ...clearance });
    return res.status(clearance.reason === 'authentication-required' ? 401 : 403).json({
      error: 'وصول مرفوض — مخالفة لسياسة الثقة المطلقة',
      code: 'ZERO_TRUST_DENIED',
      segment: segment.label,
    });
  }

  // 2. Segment rate limiting
  const rateCheck = checkSegmentRate(segment.label, context.ip);
  if (!rateCheck.allowed) {
    logZeroTrustEvent(req, 'RATE_EXCEEDED', { segment: segment.label, ...rateCheck });
    return res.status(429).json({
      error: 'تجاوز حد الطلبات المسموح لهذا المقطع',
      code: 'SEGMENT_RATE_LIMITED',
      retryAfter: 60,
    });
  }

  // 3. Anomaly scoring
  const anomaly = calculateAnomalyScore(context);
  if (anomaly.score >= 50) {
    logZeroTrustEvent(req, 'ANOMALY_CRITICAL', { score: anomaly.score, reasons: anomaly.reasons });
    return res.status(403).json({
      error: 'تم رصد نشاط غير طبيعي — تم حظر الطلب',
      code: 'ANOMALY_BLOCK',
      anomalyScore: anomaly.score,
    });
  }
  if (anomaly.score >= 25) {
    res.setHeader('X-ZT-Anomaly', String(anomaly.score));
    res.setHeader('X-ZT-Flag', 'watched');
  }

  // 4. Integrity verification
  res.setHeader('X-ZT-Segment', segment.label);
  res.setHeader('X-ZT-Integrity', context.integrity);
  res.setHeader('X-ZT-Timestamp', String(context.timestamp));

  // 5. Attach context to request for downstream use
  req.zeroTrustContext = {
    segment: segment.label,
    anomalyScore: anomaly.score,
    anomalyReasons: anomaly.reasons,
    integrity: context.integrity,
  };

  next();
}

// ===================== Event Logging =====================

function logZeroTrustEvent(req, type, details = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level: type === 'ACCESS_DENIED' || type === 'ANOMALY_CRITICAL' ? 'CRITICAL' : 'WARNING',
    type,
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
    method: req.method,
    path: req.path,
    userId: req.user?.id || null,
    ...details,
  };
  console.warn('[ZERO-TRUST]', JSON.stringify(log));
}

// ===================== Zero Trust Status =====================

export function getZeroTrustStatus() {
  let totalAnomalies = 0;
  let watchedIPs = 0;
  for (const [, baseline] of anomalyBaselines) {
    if (baseline.requests.length > 0) {
      totalAnomalies += baseline.requests.length;
      watchedIPs++;
    }
  }
  return {
    segments: Object.entries(SEGMENTS).map(([k, v]) => ({ name: k, level: v.level, label: v.label })),
    routeMappings: Object.entries(ROUTE_SEGMENTS).length,
    watchedIPs,
    totalTrackedRequests: totalAnomalies,
    rateTrackers: segmentRateTracker.size,
  };
}

export default { zeroTrustMiddleware, getZeroTrustStatus };
