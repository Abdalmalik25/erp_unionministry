// server/middleware/securityHeaders.js — Advanced Security Headers
// Implements OWASP recommended security headers with strict CSP

const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss:",
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
  // Content Security Policy
  res.setHeader('Content-Security-Policy', DEFAULT_CSP);

  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);

  // Strict Transport Security (HSTS) — 1 year, include subdomains, preload-ready
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // X-Frame-Options: DENY
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: nosniff
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // X-XSS-Protection (legacy but harmless)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Cross-Origin Embedder Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Cross-Origin Opener Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin Resource Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // DNS Prefetch Control
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Server fingerprinting removal
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'NLSMP');

  // Cache-Control for sensitive responses
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/health')) {
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }

  next();
}

// Request size limit guard
export function requestSizeLimitMiddleware(maxBytes = 10 * 1024 * 1024) {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'الطلب كبير جداً — الحد الأقصى 10 ميجابايت',
        code: 'PAYLOAD_TOO_LARGE',
      });
    }
    next();
  };
}

// IP-based threat detection (basic heuristics)
const SUSPICIOUS_PATTERNS = [
  /\.\.\//,                 // path traversal
  /<script\b/i,            // XSS attempt
  /union\s+select/i,       // SQL injection
  /exec\s*\(/i,            // code execution
  /etc\/passwd/i,          // LFI
  /\/proc\//i,             // process access
];

export function threatDetectionMiddleware(req, res, next) {
  const checkValue = (val) => {
    if (typeof val !== 'string') return false;
    return SUSPICIOUS_PATTERNS.some(p => p.test(val));
  };

  // Check URL path
  if (checkValue(req.path) || checkValue(req.url)) {
    logThreat(req, 'path-pattern');
    return res.status(400).json({
      error: 'طلب غير صالح',
      code: 'MALICIOUS_REQUEST',
    });
  }

  // Check query params
  for (const [k, v] of Object.entries(req.query)) {
    if (checkValue(k) || checkValue(v)) {
      logThreat(req, 'query-pattern');
      return res.status(400).json({
        error: 'طلب غير صالح',
        code: 'MALICIOUS_REQUEST',
      });
    }
  }

  // Check body
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body)) {
      if (checkValue(k) || checkValue(String(v))) {
        logThreat(req, 'body-pattern');
        return res.status(400).json({
          error: 'طلب غير صالح',
          code: 'MALICIOUS_REQUEST',
        });
      }
    }
  }

  next();
}

function logThreat(req, type) {
  // Threat log — in production, this would go to a SIEM
  const log = {
    timestamp: new Date().toISOString(),
    type,
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent']?.slice(0, 200),
    userId: req.user?.id || null,
  };
  // eslint-disable-next-line no-console
  console.warn('[SECURITY][THREAT]', JSON.stringify(log));
}
