/**
 * Security Middleware - طبقة وسيطة للأمان المؤسسية
 * Enterprise Grade Security Headers · CORS · Rate Limiting
 */

// ============================================================
// Security Headers Configuration
// ============================================================

export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking - Only DENY for maximum security
  'X-Frame-Options': 'DENY',
  
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // HSTS - Force HTTPS for 1 year
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Content Security Policy - Strict for government systems
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';",
  
  // Referrer Policy - Minimal information leakage
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy - Disable sensitive APIs
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  
  // Cache Control for sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
} as const;

export const ALLOWED_ORIGINS = [
  'https://unionsphere.gov.ye',
  'https://www.unionsphere.gov.ye',
  'https://unionsphere.vercel.app',
  'https://dynamicgsye.com',
  'https://www.dynamicgsye.com',
] as const;

// ============================================================
// Security Utilities
// ============================================================

/**
 * Validate request origin against allowed origins
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin as any);
}

/**
 * Get security headers object for use in other contexts
 */
export function getSecurityHeaders(): Record<string, string> {
  return { ...SECURITY_HEADERS };
}

/**
 * Generate security headers for static hosting (Vercel)
 */
export function getStaticSecurityHeaders(): Array<{ key: string; value: string }> {
  return Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value }));
}

/**
 * CSP Nonce Generator (for inline scripts)
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// ============================================================
// Rate Limiting Configuration
// ============================================================

export const RATE_LIMIT_CONFIG = {
  DEFAULT_LIMIT: 100,
  DEFAULT_WINDOW_MS: 60000, // 1 minute
  STRICT_LIMIT: 50,
  STRICT_WINDOW_MS: 60000,
  AUTH_LIMIT: 10, // More strict for auth endpoints
  AUTH_WINDOW_MS: 60000,
} as const;