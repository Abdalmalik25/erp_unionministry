// server/middleware/locationTracker.js
// IP geolocation + device fingerprinting + session tracking
// Caches results to avoid repeated lookups

import { pool } from './shared.js';
import crypto from 'crypto';

// In-memory cache: IP -> geo info (TTL 1 hour)
const geoCache = new Map();
const GEO_CACHE_TTL = 60 * 60_000; // 1 hour

/**
 * Get geolocation info from IP (privacy-respecting: only city/country, not exact coordinates)
 * Uses a public IP-to-geo service with caching
 */
export async function getIPGeolocation(ip) {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return {
      ip: ip || 'unknown',
      country: 'YE',
      countryName: 'Yemen',
      city: 'Local',
      isLocal: true,
    };
  }

  // Skip private IPs
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip)) {
    return { ip, country: 'YE', countryName: 'Yemen', city: 'Private Network', isPrivate: true };
  }

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL) {
    return cached.data;
  }

  // Try ip-api.com (free, no key, 45 req/min limit)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success') {
        const data = {
          ip,
          country: json.countryCode || 'XX',
          countryName: json.country || 'Unknown',
          region: json.regionName,
          city: json.city,
          timezone: json.timezone,
          isp: json.isp,
          org: json.org,
          // Privacy: round coordinates to 2 decimals (~1km precision)
          lat: json.lat ? Math.round(json.lat * 100) / 100 : null,
          lon: json.lon ? Math.round(json.lon * 100) / 100 : null,
        };
        geoCache.set(ip, { data, timestamp: Date.now() });
        return data;
      }
    }
  } catch (e) {
    // Silent fail — return minimal info
  }

  const fallback = { ip, country: 'XX', countryName: 'Unknown', city: 'Unknown' };
  geoCache.set(ip, { data: fallback, timestamp: Date.now() });
  return fallback;
}

/**
 * Compute a stable device fingerprint hash from request headers
 * (Server-side complement to client-side fingerprinting)
 */
export function computeServerFingerprint(req) {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.headers['sec-ch-ua'] || '',
    req.headers['sec-ch-ua-platform'] || '',
    req.headers['sec-ch-ua-mobile'] || '',
  ];
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .slice(0, 32);
}

/**
 * Express middleware: enrich request with geo + device info
 */
export function locationTracker(options = {}) {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      const geo = await getIPGeolocation(ip);
      const deviceFingerprint = computeServerFingerprint(req);

      req.geoContext = geo;
      req.deviceContext = {
        fingerprint: deviceFingerprint,
        userAgent: req.headers['user-agent']?.slice(0, 500),
        platform: req.headers['sec-ch-ua-platform']?.replace(/"/g, ''),
        mobile: req.headers['sec-ch-ua-mobile'] === '?1',
      };

      // Geo data kept server-side only — NOT exposed in response headers

      next();
    } catch (e) {
      console.error('[LocationTracker] error:', e);
      next();
    }
  };
}

/**
 * Log session creation with full context
 */
export async function logSessionEvent(eventType, req, userId, extra = {}) {
  if (!req.geoContext || !req.deviceContext) return;
  const ip = req.geoContext.ip;
  const geo = req.geoContext;
  const device = req.deviceContext;

  try {
    await pool.query(
      `INSERT INTO session_log (event_type, user_id, ip_address, country, city, region, device_fingerprint, user_agent, platform, mobile, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [
        eventType,
        userId,
        ip,
        geo.country,
        geo.city,
        geo.region,
        device.fingerprint,
        device.userAgent,
        device.platform,
        device.mobile,
        JSON.stringify(extra),
      ],
    );
  } catch (e) {
    // table might not exist — log but don't fail
    console.warn('[SessionLog] insert failed:', e.message);
  }
}

/**
 * Get suspicious activity: different geo + new device within short window
 */
export async function detectSuspiciousActivity(userId, currentReq) {
  if (!userId) return { suspicious: false, reasons: [] };

  try {
    const result = await pool.query(
      `SELECT country, city, device_fingerprint, created_at
       FROM session_log
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId],
    );

    const reasons = [];
    const recentCountries = new Set(result.rows.map((r) => r.country));
    const recentDevices = new Set(result.rows.map((r) => r.device_fingerprint));

    // Country jump (Yemen → other within 24h is suspicious)
    if (recentCountries.size > 1) {
      const hasForeign = [...recentCountries].some((c) => c !== 'YE' && c !== 'XX');
      if (hasForeign) reasons.push('foreign_login_within_24h');
    }

    // New device
    if (currentReq.deviceContext?.fingerprint && !recentDevices.has(currentReq.deviceContext.fingerprint)) {
      reasons.push('new_device');
    }

    return { suspicious: reasons.length > 0, reasons };
  } catch {
    return { suspicious: false, reasons: [] };
  }
}

// Initialize: ensure session_log table exists
export async function initSessionLog() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_log (
        id serial PRIMARY KEY,
        event_type text NOT NULL,
        user_id text,
        ip_address text,
        country text,
        city text,
        region text,
        device_fingerprint text,
        user_agent text,
        platform text,
        mobile boolean,
        metadata jsonb,
        created_at timestamptz DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_session_log_user ON session_log(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_session_log_fingerprint ON session_log(device_fingerprint);
    `);
    console.info('[SessionLog] table ready');
  } catch (e) {
    console.warn('[SessionLog] init failed:', e.message);
  }
}
