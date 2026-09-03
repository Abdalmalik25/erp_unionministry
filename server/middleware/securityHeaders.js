// server/middleware/securityHeaders.js — Nuclear Shield WAF & Security Headers
// OWASP recommended headers + advanced threat detection + IP reputation + automated blocking

const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.vercel.app wss:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'self' https://www.youtube.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

const PERMISSIONS_POLICY = [
  'geolocation=()',
  'microphone=()',
  'camera=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'accelerometer=()',
  'gyroscope=()',
  'autoplay=()',
].join(', ');

export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('Content-Security-Policy', DEFAULT_CSP);
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Request-ID', crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'NLSMP');

  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/health')) {
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }

  next();
}

export function requestSizeLimitMiddleware(maxBytes = 10 * 1024 * 1024) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      return res.status(413).json({ error: 'الطلب كبير جداً — الحد الأقصى 10 ميجابايت', code: 'PAYLOAD_TOO_LARGE' });
    }
    next();
  };
}

// ===================== Nuclear WAF — Advanced Threat Patterns =====================

const THREAT_PATTERNS = {
  xss: [
    /<script\b[^>]*>/i,
    /javascript\s*:/i,
    /on\w+\s*=\s*["']?/i,
    /expression\s*\(/i,
    /eval\s*\(/i,
    /document\s*\.\s*(cookie|write|location)/i,
    /window\s*\.\s*(location|open)/i,
    /\balert\s*\(/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<applet\b/i,
    /data\s*:\s*text\/html/i,
    /vbscript\s*:/i,
    /livescript\s*:/i,
    /mocha\s*:/i,
    /\bFunction\s*\(/i,
    /setTimeout\s*\(\s*["']/i,
    /setInterval\s*\(\s*["']/i,
    /document\s*\[\s*["']/i,
    /\\x[0-9a-f]{2}/i,
    /\\u[0-9a-f]{4}/i,
  ],
  sqli: [
    /union\s+(all\s+)?select/i,
    /select\s+.*\s+from\s+/i,
    /insert\s+into\s+/i,
    /update\s+.*\s+set\s+/i,
    /delete\s+from\s+/i,
    /drop\s+(table|database|column)/i,
    /alter\s+table/i,
    /exec\s*(ute)?\s*\(/i,
    /execute\s+immediate/i,
    /;\s*drop\b/i,
    /'\s*or\s+'1'\s*=\s*'1/i,
    /'\s*or\s+1\s*=\s*1/i,
    /"\s*or\s+1\s*=\s*1/i,
    /benchmark\s*\(/i,
    /sleep\s*\(/i,
    /waitfor\s+delay/i,
    /load_file\s*\(/i,
    /into\s+(out)?file/i,
    /information_schema/i,
    /sysobjects/i,
    /syscolumns/i,
    /pg_sleep/i,
    /generate_series/i,
  ],
  lfi: [
    /\.\.\//,
    /\.\.\\/,
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\/proc\/self/i,
    /\/bin\/bash/i,
    /\/bin\/sh/i,
    /php\s*:\s*\/\//i,
    /zip\s*:\s*\/\//i,
    /phar\s*:\s*\/\//i,
    /expect\s*:\s*\/\//i,
    /input\s*:\s*\/\//i,
    /\/\/etc\/hosts/i,
    /windows\/win\.ini/i,
    /boot\.ini/i,
    /system\.ini/i,
  ],
  rce: [
    /;\s*(?:bash|sh|cmd|powershell|python|perl|ruby|php)\b/i,
    /\|\s*(?:bash|sh|cmd|powershell)\b/i,
    /`[^`]+`/,
    /\$\([^)]+\)/,
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bsystem\s*\(/i,
    /\bpassthru\s*\(/i,
    /\bshell_exec\s*\(/i,
    /\bpopen\s*\(/i,
    /\bproc_open\s*\(/i,
    /\bassert\s*\(/i,
    /\bcreate_function\s*\(/i,
    /\bcall_user_func\s*\(/i,
    /\bcall_user_func_array\s*\(/i,
    /\barray_map\s*\(/i,
    /\barray_filter\s*\(.*\bgetenv\b/i,
  ],
  ssrf: [
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i,
    /https?:\/\/(?:169\.254|10\.|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./i,
    /https?:\/\/metadata\.google/i,
    /https?:\/\/169\.254\.169\.254/i,
    /gopher:\/\//i,
    /file:\/\//i,
    /dict:\/\//i,
    /ftp:\/\//i,
  ],
  deserialization: [
    /O\s*:\s*\d+\s*:\s*["'].*?["']/i,
    /a\s*:\s*\d+\s*:\s*\{.*?\}/i,
    /s\s*:\s*\d+\s*:\s*["'].*?["']/i,
    /__serialize/i,
    /__wakeup/i,
    /Serializable/i,
    /JndiLookup/i,
    /rmi:\/\//i,
    /ldap:\/\//i,
  ],
  pathTraversal: [
    /\.\./,
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e/i,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /%252e%252e/i,
    /\.\.%2f/i,
    /\.\.%5c/i,
  ],
  headerInjection: [
    /\r\n/i,
    /%0d%0a/i,
    /\n\s*(?:set-cookie|location|content-type|authorization)/i,
  ],
};

const DANGEROUS = /[<>\"'`;]|--|\/\*|\*\//g;

// ===================== IP Reputation System =====================

const ipReputation = new Map();
const BLOCKED_IPS = new Set();
const SUSPICIOUS_IPS = new Map();

const REPUTATION_THRESHOLDS = {
  blockThreshold: 50,
  suspectThreshold: 20,
  decayInterval: 300000, // 5 minutes
  blockDuration: 3600000, // 1 hour
};

function updateReputation(ip, score, event) {
  const now = Date.now();
  const entry = ipReputation.get(ip) || { score: 0, events: [], firstSeen: now, lastSeen: now };

  entry.score += score;
  entry.lastSeen = now;
  entry.events.push({ event, time: now, score });
  if (entry.events.length > 100) entry.events = entry.events.slice(-50);

  ipReputation.set(ip, entry);

  if (entry.score >= REPUTATION_THRESHOLDS.blockThreshold) {
    BLOCKED_IPS.add(ip);
    SUSPICIOUS_IPS.set(ip, { blockedAt: now, reason: event });
    setTimeout(() => {
      BLOCKED_IPS.delete(ip);
      SUSPICIOUS_IPS.delete(ip);
      entry.score = Math.max(0, entry.score - 30);
    }, REPUTATION_THRESHOLDS.blockDuration);
  } else if (entry.score >= REPUTATION_THRESHOLDS.suspectThreshold) {
    SUSPICIOUS_IPS.set(ip, { suspectAt: now, score: entry.score });
  }
}

function isIPBlocked(ip) {
  return BLOCKED_IPS.has(ip);
}

function isIPSuspicious(ip) {
  return SUSPICIOUS_IPS.has(ip);
}

// ===================== Request Fingerprinting =====================

function generateRequestFingerprint(req) {
  const components = [
    req.method,
    req.path,
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    Object.keys(req.query || {}).sort().join(','),
    req.headers['content-type'] || '',
  ];
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// ===================== Behavioral Analysis =====================

const requestHistory = new Map();
const BEHAVIORAL_WINDOW = 60000; // 1 minute
const MAX_SAME_ENDPOINT = 30;
const MAX_UNIQUE_PATHS = 50;
const SQLI_PROBE_THRESHOLD = 3;

function analyzeBehavior(ip, req) {
  const now = Date.now();
  const history = requestHistory.get(ip) || { requests: [], paths: new Set(), sqliProbes: 0, xssProbes: 0 };

  history.requests.push({ time: now, path: req.path, method: req.method });
  history.requests = history.requests.filter(r => now - r.time < BEHAVIORAL_WINDOW);

  const endpointHits = history.requests.filter(r => r.path === req.path).length;
  if (endpointHits > MAX_SAME_ENDPOINT) {
    return { suspicious: true, reason: 'endpoint-flood', score: 30 };
  }

  history.paths.add(req.path);
  if (history.paths.size > MAX_UNIQUE_PATHS) {
    return { suspicious: true, reason: 'path-scanning', score: 25 };
  }

  requestHistory.set(ip, history);
  return { suspicious: false };
}

// ===================== Advanced Threat Detection =====================

function detectThreats(req) {
  const threats = [];
  const checkTarget = (val, category) => {
    if (typeof val !== 'string') return;
    const patterns = THREAT_PATTERNS[category];
    if (!patterns) return;
    for (const pattern of patterns) {
      if (pattern.test(val)) {
        threats.push({ category, pattern: pattern.source.slice(0, 50), value: val.slice(0, 200) });
        break;
      }
    }
  };

  const allFields = [req.path, req.url, ...(req.headers['referer'] || '').split('?')];
  for (const field of allFields) {
    for (const cat of Object.keys(THREAT_PATTERNS)) checkTarget(field, cat);
  }

  for (const [k, v] of Object.entries(req.query || {})) {
    checkTarget(k, 'pathTraversal');
    checkTarget(String(v), 'xss');
    checkTarget(String(v), 'sqli');
    checkTarget(String(v), 'lfi');
    checkTarget(String(v), 'ssrf');
    checkTarget(String(v), 'deserialization');
    checkTarget(String(v), 'rce');
  }

  if (req.body && typeof req.body === 'object') {
    const walk = (obj, depth = 0) => {
      if (depth > 5) return;
      for (const [k, v] of Object.entries(obj)) {
        checkTarget(k, 'pathTraversal');
        if (typeof v === 'string') {
          checkTarget(v, 'xss');
          checkTarget(v, 'sqli');
          checkTarget(v, 'lfi');
          checkTarget(v, 'ssrf');
          checkTarget(v, 'rce');
          checkTarget(v, 'deserialization');
          checkTarget(v, 'headerInjection');
        } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          walk(v, depth + 1);
        }
      }
    };
    walk(req.body);
  }

  return threats;
}

function logThreat(req, type, details = {}) {
  const log = {
    timestamp: new Date().toISOString(),
    level: 'CRITICAL',
    type,
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent']?.slice(0, 200),
    userId: req.user?.id || null,
    fingerprint: generateRequestFingerprint(req),
    ...details,
  };
  console.warn('[NUCLEAR-WAF][THREAT]', JSON.stringify(log));
}

// ===================== Nuclear WAF Middleware =====================

export function threatDetectionMiddleware(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

  if (isIPBlocked(ip)) {
    logThreat(req, 'IP_BLOCKED', { ip, reason: 'reputation-blocked' });
    return res.status(403).json({ error: 'تم حظر هذا العنوان', code: 'IP_BLOCKED' });
  }

  const threats = detectThreats(req);

  if (threats.length > 0) {
    const primaryThreat = threats[0];
    const severity = threats.length >= 3 ? 40 : threats.length >= 2 ? 30 : 20;
    updateReputation(ip, severity, primaryThreat.category);
    logThreat(req, 'MULTI_THREAT', { threats, severity, ip });
    return res.status(400).json({
      error: 'تم رصد نشاط مشبوه — تم حظر الطلب',
      code: 'NUCLEAR_WAF_BLOCK',
      ref: generateRequestFingerprint(req),
    });
  }

  const behavior = analyzeBehavior(ip, req);
  if (behavior.suspicious) {
    updateReputation(ip, behavior.score, behavior.reason);
    logThreat(req, 'BEHAVIORAL', { reason: behavior.reason, score: behavior.score, ip });
    if (behavior.score >= 25) {
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح — تم تقييد الوصول',
        code: 'BEHAVIORAL_BLOCK',
        retryAfter: 60,
      });
    }
  }

  if (isIPSuspicious(ip)) {
    res.setHeader('X-Security-Flag', 'monitored');
    logThreat(req, 'SUSPICIOUS_IP_MONITORED', { ip });
  }

  next();
}

// ===================== Threat Intelligence Feed =====================

export function getThreatIntelligence() {
  const stats = {
    blockedIPs: BLOCKED_IPS.size,
    suspiciousIPs: SUSPICIOUS_IPS.size,
    totalTrackedIPs: ipReputation.size,
    recentThreats: [],
    topThreats: {},
    reputationDistribution: { clean: 0, suspicious: 0, blocked: 0 },
  };

  const now = Date.now();
  for (const [ip, entry] of ipReputation) {
    if (entry.score >= REPUTATION_THRESHOLDS.blockThreshold) stats.reputationDistribution.blocked++;
    else if (entry.score >= REPUTATION_THRESHOLDS.suspectThreshold) stats.reputationDistribution.suspicious++;
    else stats.reputationDistribution.clean++;

    const recentEvents = entry.events.filter(e => now - e.time < 3600000);
    for (const evt of recentEvents) {
      stats.topThreats[evt.event] = (stats.topThreats[evt.event] || 0) + 1;
      if (stats.recentThreats.length < 20) {
        stats.recentThreats.push({ ip, event: evt.event, time: evt.time, score: evt.score });
      }
    }
  }

  stats.recentThreats.sort((a, b) => b.time - a.time);
  return stats;
}

export function manualBlockIP(ip, reason = 'manual') {
  BLOCKED_IPS.add(ip);
  SUSPICIOUS_IPS.set(ip, { blockedAt: Date.now(), reason });
  updateReputation(ip, 100, 'manual-block');
}

export function manualUnblockIP(ip) {
  BLOCKED_IPS.delete(ip);
  SUSPICIOUS_IPS.delete(ip);
  const entry = ipReputation.get(ip);
  if (entry) entry.score = 0;
}
