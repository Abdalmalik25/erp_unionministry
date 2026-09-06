// server/middleware/enhancedSecurity.js — Enhanced Security Based on Audit Findings
// Implements geo-blocking, IP allowlisting, account lockout, anomaly detection, and security monitoring

import { pool } from './shared.js';
import { auditLog } from './shared.js';

// ===================== Geo-Blocking Configuration =====================
// Countries identified as suspicious in audit: KR (South Korea), CN (China), NL (Netherlands)
const BLOCKED_COUNTRIES = new Set([
  'KR', // South Korea - 11+1 operations from 175.110.x.x
  'CN', // China - 2 operations from 110.238.x.x
  'NL', // Netherlands - 2 operations from 82.114.x.x (DigitalOcean/cloud)
]);

// Allowed countries for ministry operations (Yemen and potentially GCC)
const ALLOWED_COUNTRIES = new Set([
  'YE', // Yemen (primary)
  'SA', // Saudi Arabia
  'AE', // UAE
  'QA', // Qatar
  'KW', // Kuwait
  'BH', // Bahrain
  'OM', // Oman
  'JO', // Jordan
  'EG', // Egypt
]);

// High-risk ASN/org patterns (cloud providers, VPNs, proxies)
const HIGH_RISK_ASNS = new Set([
  'DIGITALOCEAN',
  'AMAZON',
  'GOOGLE',
  'MICROSOFT',
  'LINODE',
  'VULTR',
  'OVH',
  'HETZNER',
  'CONTABO',
]);

// ===================== IP Allowlist/Blocklist Management =====================
const ipAllowlist = new Set([
  '127.0.0.1',
  '::1',
  // Add ministry IPs here from env
  ...(process.env.ALLOWED_IPS?.split(',') || []),
]);

const ipBlocklist = new Set([
  // Auto-populated from threat intelligence
  ...(process.env.BLOCKED_IPS?.split(',') || []),
]);

// Manually blocked IPs from audit findings
const MANUAL_BLOCKED_IPS = new Set([
  '175.110.42.148', // South Korea - 11 operations
  '175.110.41.2',   // South Korea - 1 operation
  '110.238.39.136', // China - 2 operations
  '82.114.181.175', // Netherlands - 2 operations
]);

ipBlocklist.forEach(ip => MANUAL_BLOCKED_IPS.add(ip));

// ===================== Database Sync Functions =====================
let dbSyncInitialized = false;

export async function syncSecurityListsFromDB() {
  if (dbSyncInitialized) return;
  
  try {
    // Load country blocking rules
    const countries = await pool.query(
      'SELECT country_code, action, is_active FROM country_blocking WHERE is_active = TRUE'
    );
    BLOCKED_COUNTRIES.clear();
    for (const row of countries.rows) {
      if (row.action === 'block') {
        BLOCKED_COUNTRIES.add(row.country_code);
      }
    }
    
    // Load IP allowlist
    const allowIPs = await pool.query(
      'SELECT ip_address FROM ip_management WHERE is_active = TRUE AND action = \'allow\' AND (expires_at IS NULL OR expires_at > NOW())'
    );
    for (const row of allowIPs.rows) {
      ipAllowlist.add(row.ip_address);
    }
    
    // Load IP blocklist
    const blockIPs = await pool.query(
      'SELECT ip_address FROM ip_management WHERE is_active = TRUE AND action = \'block\' AND (expires_at IS NULL OR expires_at > NOW())'
    );
    for (const row of blockIPs.rows) {
      ipBlocklist.add(row.ip_address);
      MANUAL_BLOCKED_IPS.add(row.ip_address);
    }
    
    // Load account lockouts
    const lockouts = await pool.query(
      'SELECT email, locked_until, failed_attempts, lockout_count FROM account_lockout WHERE locked_until > NOW()'
    );
    const now = Date.now();
    for (const row of lockouts.rows) {
      const lockedUntil = new Date(row.locked_until).getTime();
      if (lockedUntil > now) {
        failedAttempts.set(row.email.toLowerCase(), {
          count: row.failed_attempts,
          lastAttempt: lockedUntil - LOCKOUT_CONFIG.lockoutDurationMs,
          lockedUntil,
          lockoutCount: row.lockout_count,
        });
      }
    }
    
    dbSyncInitialized = true;
    console.log('[SECURITY] Loaded security lists from database:', {
      blockedCountries: BLOCKED_COUNTRIES.size,
      allowedIPs: ipAllowlist.size,
      blockedIPs: ipBlocklist.size,
      activeLockouts: failedAttempts.size,
    });
  } catch (e) {
    console.error('[SECURITY] Failed to sync from database:', e.message);
  }
}

// Periodic sync every 5 minutes
setInterval(async () => {
  try {
    await syncSecurityListsFromDB();
  } catch (e) {
    console.error('[SECURITY] Periodic sync failed:', e.message);
  }
}, 5 * 60 * 1000).unref?.();

// ===================== Account Lockout Configuration =====================
const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  progressiveLockout: true, // Increase duration on repeated lockouts
  maxLockoutDurationMs: 24 * 60 * 60 * 1000, // 24 hours max
  resetWindowMs: 60 * 60 * 1000, // Reset counter after 1 hour of no attempts
};

const failedAttempts = new Map(); // email -> { count, lastAttempt, lockedUntil, lockoutCount }

// ===================== Anomaly Detection Configuration =====================
const ANOMALY_THRESHOLDS = {
  // Multiple IPs for same user in short time
  maxIpsPerUserPerHour: 3,
  // Login from new country
  newCountryScore: 5,
  // Impossible travel
  impossibleTravelScore: 10,
  // New device
  newDeviceScore: 3,
  // Odd hours (1-5 AM)
  oddHoursScore: 2,
  // Multiple failed logins
  failedLoginScore: 3,
  // Rapid successive logins
  rapidLoginScore: 4,
  // Threshold for alert
  alertThreshold: 7,
  // Threshold for blocking
  blockThreshold: 15,
};

// Track user login patterns
const userLoginHistory = new Map(); // userId -> [{ip, country, deviceFingerprint, timestamp}]

// ===================== Geo-Blocking Middleware =====================
export async function geoBlockingMiddleware(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const country = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || null;
  
  // Skip for health checks and internal
  if (req.path.startsWith('/api/health')) return next();
  
  // Check allowlist first (highest priority)
  if (ipAllowlist.has(ip)) return next();
  
  // Check manual blocklist
  if (MANUAL_BLOCKED_IPS.has(ip) || ipBlocklist.has(ip)) {
    await logSecurityEvent('IP_BLOCKED', { ip, reason: 'manual_blocklist', path: req.path }, req);
    return res.status(403).json({ 
      error: 'تم حظر عنوان IP هذا', 
      code: 'IP_BLOCKED',
      reason: 'security_policy' 
    });
  }
  
  // Check country blocking
  if (country && BLOCKED_COUNTRIES.has(country)) {
    await logSecurityEvent('GEO_BLOCKED', { ip, country, reason: 'blocked_country', path: req.path }, req);
    return res.status(403).json({ 
      error: 'الوصول غير مسموح من هذا البلد', 
      code: 'GEO_BLOCKED',
      country 
    });
  }
  
  // Check if country is not in allowed list (warning but not blocking for now)
  if (country && !ALLOWED_COUNTRIES.has(country) && process.env.NODE_ENV === 'production') {
    // Log for monitoring but don't block yet - can be tightened later
    await logSecurityEvent('GEO_WARNING', { ip, country, reason: 'unusual_country', path: req.path }, req);
  }
  
  next();
}

// ===================== Account Lockout Middleware =====================
export async function accountLockoutMiddleware(req, res, next) {
  // Only apply to login endpoints
  if (!req.path.includes('/auth/login') && !req.path.includes('/auth/mfa')) {
    return next();
  }
  
  const email = req.body?.email?.toLowerCase().trim();
  if (!email) return next();
  
  const now = Date.now();
  const record = failedAttempts.get(email) || { 
    count: 0, 
    lastAttempt: 0, 
    lockedUntil: 0, 
    lockoutCount: 0 
  };
  
  // Clean old attempts
  if (now - record.lastAttempt > LOCKOUT_CONFIG.resetWindowMs) {
    record.count = 0;
  }
  
  // Check if locked
  if (record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    await logSecurityEvent('ACCOUNT_LOCKED', { 
      email, 
      retryAfter, 
      lockoutCount: record.lockoutCount,
      ip: req.ip 
    }, req);
    
    return res.status(429).json({
      error: 'الحساب مقفل مؤقتاً — حاول لاحقاً',
      code: 'ACCOUNT_LOCKED',
      retryAfter,
      lockedUntil: new Date(record.lockedUntil).toISOString(),
    });
  }
  
  // Store the record for after login attempt
  req.accountLockoutRecord = { email, record };
  next();
}

// ===================== Post-Login Lockout Handler =====================
export async function handleLoginResult(req, res, next) {
  const { email, record } = req.accountLockoutRecord || {};
  if (!email || !record) return next();
  
  const now = Date.now();
  const isSuccess = res.statusCode === 200 && res.locals?.loginSuccess;
  
  if (isSuccess) {
    // Reset on successful login
    record.count = 0;
    record.lockoutCount = 0;
    record.lockedUntil = 0;
    failedAttempts.set(email, record);
    
    // Log successful login with anomaly check
    await checkLoginAnomalies(req, email);
  } else {
    // Increment failed attempts
    record.count += 1;
    record.lastAttempt = now;
    
    if (record.count >= LOCKOUT_CONFIG.maxFailedAttempts) {
      // Calculate lockout duration
      let duration = LOCKOUT_CONFIG.lockoutDurationMs;
      if (LOCKOUT_CONFIG.progressiveLockout) {
        duration = Math.min(
          duration * Math.pow(2, record.lockoutCount),
          LOCKOUT_CONFIG.maxLockoutDurationMs
        );
      }
      record.lockedUntil = now + duration;
      record.lockoutCount += 1;
      
      await logSecurityEvent('ACCOUNT_LOCKOUT_TRIGGERED', {
        email,
        failedAttempts: record.count,
        lockoutDuration: duration,
        lockoutCount: record.lockoutCount,
        ip: req.ip,
      }, req);
    }
    
    failedAttempts.set(email, record);
  }
  
  next();
}

// ===================== Anomaly Detection =====================
async function checkLoginAnomalies(req, email) {
  try {
    // Get user ID from email
    const userResult = await pool.query(
      'SELECT id FROM sector_users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    if (!userResult.rows.length) return;
    
    const userId = userResult.rows[0].id;
    const now = Date.now();
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const country = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || null;
    const deviceFingerprint = req.headers['x-device-fingerprint'] || 'unknown';
    
    // Get user history
    const history = userLoginHistory.get(userId) || [];
    
    // Clean old history (keep last 24 hours)
    const recentHistory = history.filter(h => now - h.timestamp < 24 * 60 * 60 * 1000);
    
    let anomalyScore = 0;
    const flags = [];
    
    // Check unique IPs in last hour
    const lastHour = recentHistory.filter(h => now - h.timestamp < 60 * 60 * 1000);
    const uniqueIps = new Set(lastHour.map(h => h.ip));
    if (uniqueIps.size > ANOMALY_THRESHOLDS.maxIpsPerUserPerHour) {
      anomalyScore += ANOMALY_THRESHOLDS.rapidLoginScore;
      flags.push(`multiple_ips_${uniqueIps.size}_in_1h`);
    }
    
    // Check new country
    const knownCountries = new Set(recentHistory.map(h => h.country).filter(Boolean));
    if (country && !knownCountries.has(country)) {
      anomalyScore += ANOMALY_THRESHOLDS.newCountryScore;
      flags.push(`new_country_${country}`);
    }
    
    // Check new device
    const knownDevices = new Set(recentHistory.map(h => h.deviceFingerprint).filter(Boolean));
    if (deviceFingerprint && !knownDevices.has(deviceFingerprint)) {
      anomalyScore += ANOMALY_THRESHOLDS.newDeviceScore;
      flags.push('new_device');
    }
    
    // Check odd hours
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 5) {
      anomalyScore += ANOMALY_THRESHOLDS.oddHoursScore;
      flags.push('odd_hours');
    }
    
    // Add to history
    recentHistory.push({ ip, country, deviceFingerprint, timestamp: now });
    userLoginHistory.set(userId, recentHistory);
    
    // Alert if threshold exceeded
    if (anomalyScore >= ANOMALY_THRESHOLDS.alertThreshold) {
      await logSecurityEvent('LOGIN_ANOMALY_DETECTED', {
        userId,
        email,
        anomalyScore,
        flags,
        ip,
        country,
        deviceFingerprint,
      }, req);
      
      // If critical, notify admins
      if (anomalyScore >= ANOMALY_THRESHOLDS.blockThreshold) {
        await logSecurityEvent('CRITICAL_ANOMALY', {
          userId,
          email,
          anomalyScore,
          flags,
          action: 'requires_admin_review',
        }, req);
      }
    }
    
  } catch (e) {
    console.error('[ANOMALY] Check failed:', e.message);
  }
}

// ===================== Security Event Logging =====================
async function logSecurityEvent(type, details, req) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    ip: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown',
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent']?.slice(0, 200),
    userId: req.user?.id || null,
    email: req.body?.email || null,
    ...details,
  };
  
  console.warn(`[SECURITY][${type}]`, JSON.stringify(logEntry));
  
  // Persist to audit_log
  try {
    await auditLog(type.toLowerCase(), 'security', req.user?.id || null, logEntry);
  } catch (e) {
    console.error('[SECURITY] Audit log failed:', e.message);
  }
  
  // Also store in dedicated security_events table if exists
  try {
    await pool.query(
      `INSERT INTO security_events (event_type, severity, source_ip, user_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [type, details.severity || 'warning', logEntry.ip, req.user?.id || null, JSON.stringify(details)]
    ).catch(() => {}); // Table might not exist yet
  } catch (e) {
    // Ignore if table doesn't exist
  }
}

// ===================== IP Management API =====================
export async function manageIP(req, res) {
  if (!req.user || !['super_admin', 'ministry_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  
  const { action, ip, reason } = req.body;
  
  switch (action) {
    case 'block':
      if (ip) {
        ipBlocklist.add(ip);
        MANUAL_BLOCKED_IPS.add(ip);
        await logSecurityEvent('IP_MANUAL_BLOCK', { ip, reason, admin: req.user.id }, req);
        return res.json({ success: true, message: `تم حظر ${ip}` });
      }
      break;
      
    case 'unblock':
      if (ip) {
        ipBlocklist.delete(ip);
        MANUAL_BLOCKED_IPS.delete(ip);
        await logSecurityEvent('IP_MANUAL_UNBLOCK', { ip, admin: req.user.id }, req);
        return res.json({ success: true, message: `تم إلغاء حظر ${ip}` });
      }
      break;
      
    case 'allowlist':
      if (ip) {
        ipAllowlist.add(ip);
        await logSecurityEvent('IP_ALLOWLIST', { ip, admin: req.user.id }, req);
        return res.json({ success: true, message: `أضيف ${ip} للقائمة البيضاء` });
      }
      break;
      
    case 'remove_allowlist':
      if (ip) {
        ipAllowlist.delete(ip);
        return res.json({ success: true, message: `أزيل ${ip} من القائمة البيضاء` });
      }
      break;
      
    case 'block_country':
      if (req.body.countryCode) {
        BLOCKED_COUNTRIES.add(req.body.countryCode.toUpperCase());
        await logSecurityEvent('COUNTRY_BLOCK', { country: req.body.countryCode, admin: req.user.id }, req);
        return res.json({ success: true, message: `تم حظر البلد ${req.body.countryCode}` });
      }
      break;
      
    case 'unblock_country':
      if (req.body.countryCode) {
        BLOCKED_COUNTRIES.delete(req.body.countryCode.toUpperCase());
        return res.json({ success: true, message: `تم إلغاء حظر البلد ${req.body.countryCode}` });
      }
      break;
      
    case 'list':
      return res.json({
        blockedIPs: [...ipBlocklist, ...MANUAL_BLOCKED_IPS],
        allowlistedIPs: [...ipAllowlist],
        blockedCountries: [...BLOCKED_COUNTRIES],
        allowedCountries: [...ALLOWED_COUNTRIES],
        lockedAccounts: getLockedAccounts(),
      });
  }
  
  res.status(400).json({ error: 'عملية غير صالحة' });
}

function getLockedAccounts() {
  const now = Date.now();
  const locked = [];
  for (const [email, record] of failedAttempts) {
    if (record.lockedUntil > now) {
      locked.push({
        email,
        lockedUntil: new Date(record.lockedUntil).toISOString(),
        failedAttempts: record.count,
        lockoutCount: record.lockoutCount,
      });
    }
  }
  return locked;
}

// ===================== Security Monitoring Dashboard =====================
export async function getSecurityDashboard(req, res) {
  if (!req.user || !['super_admin', 'ministry_admin', 'supervisory_director'].includes(req.user.role)) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  
  try {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;
    
    // Get recent security events from audit_log
    const events = await pool.query(`
      SELECT action, details, created_at
      FROM audit_log
      WHERE action IN (
        'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_LOCKOUT_TRIGGERED',
        'GEO_BLOCKED', 'IP_BLOCKED', 'LOGIN_ANOMALY_DETECTED', 'CRITICAL_ANOMALY',
        'IP_MANUAL_BLOCK', 'IP_MANUAL_UNBLOCK', 'COUNTRY_BLOCK'
      )
      AND created_at > $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [new Date(last24h).toISOString()]);
    
    // Get login stats
    const loginStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE success = true) as successful_logins,
        COUNT(*) FILTER (WHERE success = false) as failed_logins,
        COUNT(DISTINCT email_attempted) as unique_emails_targeted,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM login_attempts
      WHERE created_at > $1
    `, [new Date(last24h).toISOString()]);
    
    // Get current locked accounts
    const lockedAccounts = getLockedAccounts();
    
    // Get threat intelligence from WAF
    const { getThreatIntelligence } = await import('./securityHeaders.js');
    const wafStats = getThreatIntelligence();
    
    // Geographic distribution of logins
    const geoStats = await pool.query(`
      SELECT 
        details->>'country' as country,
        COUNT(*) as login_count
      FROM audit_log
      WHERE action = 'LOGIN' AND created_at > $1 AND details->>'country' IS NOT NULL
      GROUP BY details->>'country'
      ORDER BY login_count DESC
    `, [new Date(last24h).toISOString()]);
    
    res.json({
      summary: {
        period: '24h',
        timestamp: new Date().toISOString(),
        totalEvents: events.rows.length,
        lockedAccounts: lockedAccounts.length,
        wafBlockedIPs: wafStats.blockedIPs,
        wafSuspiciousIPs: wafStats.suspiciousIPs,
      },
      recentEvents: events.rows,
      loginStats: loginStats.rows[0],
      lockedAccounts,
      wafStats,
      geoDistribution: geoStats.rows,
      anomalyThresholds: ANOMALY_THRESHOLDS,
      lockoutConfig: LOCKOUT_CONFIG,
    });
  } catch (e) {
    console.error('[SECURITY] Dashboard error:', e.message);
    res.status(500).json({ error: 'فشل جلب لوحة المراقبة' });
  }
}

// ===================== Session Security Enhancement =====================
export function sessionSecurityMiddleware(req, res, next) {
  // Bind session to device fingerprint
  const sessionId = req.user?.sid;
  const deviceFingerprint = req.headers['x-device-fingerprint'];
  
  if (sessionId && deviceFingerprint) {
    // Store binding for validation
    req.sessionBinding = { sessionId, deviceFingerprint };
    
    // Add header for client
    res.setHeader('X-Session-Bound', 'true');
  }
  
  // Add security headers for session
  res.setHeader('X-Session-ID', sessionId || 'anonymous');
  
  next();
}

// ===================== Export Utilities =====================
export function addToAllowlist(ip) { ipAllowlist.add(ip); }
export function removeFromAllowlist(ip) { ipAllowlist.delete(ip); }
export function addToBlocklist(ip) { ipBlocklist.add(ip); MANUAL_BLOCKED_IPS.add(ip); }
export function removeFromBlocklist(ip) { ipBlocklist.delete(ip); MANUAL_BLOCKED_IPS.delete(ip); }
export function blockCountry(code) { BLOCKED_COUNTRIES.add(code.toUpperCase()); }
export function unblockCountry(code) { BLOCKED_COUNTRIES.delete(code.toUpperCase()); }
export function getBlockedCountries() { return [...BLOCKED_COUNTRIES]; }
export function getAllowedCountries() { return [...ALLOWED_COUNTRIES]; }
export function getLockedAccountsList() { return getLockedAccounts(); }
export function clearLockout(email) { failedAttempts.delete(email); }
export function setLockoutConfig(config) { Object.assign(LOCKOUT_CONFIG, config); }
export function setAnomalyThresholds(thresholds) { Object.assign(ANOMALY_THRESHOLDS, thresholds); }