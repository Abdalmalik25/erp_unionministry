// server/lib/device.js — استخبارات الجهاز والموقع بذكاء هندسي عميق
// تحليل User-Agent بدقة (متصفح/إصدار/نظام/نوع/علامة) + جغرافيا Vercel الحقيقية
// + بصمة جهاز مشفرة + تقييم مخاطر (جهاز جديد، دولة جديدة، سفر مستحيل فيزيائياً)

import crypto from 'crypto';

/** تحليل User-Agent — محرك regex بدون اعتماديات خارجية */
export function parseUserAgent(ua = '') {
  const s = String(ua);
  let browser = 'Unknown', browser_version = null;
  // الترتيب مهم: الأخص أولاً (Edge يدّعي Chrome، وOpera يدّعي كل شيء)
  const browsers = [
    ['Edg/', 'Microsoft Edge'], ['EdgA/', 'Microsoft Edge'], ['SamsungBrowser/', 'Samsung Internet'],
    ['OPR/', 'Opera'], ['Opera/', 'Opera'], ['Firefox/', 'Firefox'], ['CriOS/', 'Chrome'],
    ['Chrome/', 'Chrome'], ['Version/.*Safari', 'Safari'], ['Safari/', 'Safari'], ['MSIE', 'IE'], ['Trident/', 'IE'],
  ];
  for (const [marker, name] of browsers) {
    const m = s.match(new RegExp(`${marker}\\s*([\\d.]+)`));
    if (m) { browser = name; browser_version = m[1].split('.').slice(0, 2).join('.'); break; }
  }
  let os = 'Unknown', os_version = null;
  const systems = [
    [/Windows NT ([\d.]+)/, 'Windows', v => ({ '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }[v] || v)],
    [/Android ([\d.]+)/, 'Android', v => v],
    [/iPhone OS ([\d_]+)/, 'iOS', v => v.replace(/_/g, '.')],
    [/Mac OS X ([\d_.]+)/, 'macOS', v => v.replace(/_/g, '.')],
    [/Linux/, 'Linux', () => null],
  ];
  for (const [re, name, norm] of systems) {
    const m = s.match(re);
    if (m) { os = name; os_version = norm(m[1]); break; }
  }
  let device_type = 'desktop', device_brand = null;
  if (/iPad|Tablet|PlayBook|Silk/i.test(s)) device_type = 'tablet';
  else if (/Mobi|iPhone|Android.*Mobile|Windows Phone/i.test(s)) device_type = 'mobile';
  if (/iPhone/i.test(s)) device_brand = 'Apple iPhone';
  else if (/iPad/i.test(s)) device_brand = 'Apple iPad';
  else if (/SM-[A-Z0-9]+/i.test(s)) device_brand = `Samsung ${s.match(/SM-[A-Z0-9]+/i)[0]}`;
  else if (/Huawei/i.test(s)) device_brand = 'Huawei';
  else if (/Xiaomi|RedMi|POCO/i.test(s)) device_brand = 'Xiaomi';
  else if (/Macintosh/i.test(s)) device_brand = 'Mac';
  else if (/Windows/i.test(s) && device_type === 'desktop') device_brand = 'PC';

/** تحليل Accept-Language — اللغات المفضلة مرتبة */
export function parseLanguage(header = '') {
  if (!header) return null;
  return String(header).split(',')
    .map(p => { const [l, q] = p.trim().split(';q='); return { lang: l.split('-')[0], q: q ? parseFloat(q) : 1 }; })
    .sort((a, b) => b.q - a.q).map(x => x.lang).join(',');
}

/** الجغرافيا الحقيقية من رؤوس Vercel Edge — الموقع الفعلي للطلب */
export function geoFromHeaders(req) {
  const h = req.headers || {};
  const decode = v => { if (!v) return null; try { return decodeURIComponent(Buffer.from(v, 'base64').toString('utf8')); } catch { return v; } };
  return {
    country: h['x-vercel-ip-country'] || h['cf-ipcountry'] || null,
    region: h['x-vercel-ip-country-region'] || h['cf-region'] || null,
    city: decode(h['x-vercel-ip-city']) || h['cf-city'] || null,
    latitude: h['x-vercel-ip-latitude'] ? parseFloat(h['x-vercel-ip-latitude']) : null,
    longitude: h['x-vercel-ip-longitude'] ? parseFloat(h['x-vercel-ip-longitude']) : null,
  };
}

/** بصمة الجهاز — SHA-256 لخصائص مستقرة (لا تتغير مع كل طلب) */
export function deviceFingerprint(req) {
  const h = req.headers || {};
  const stable = [h['user-agent'] || '', parseLanguage(h['accept-language'] || '') || '',
    h['sec-ch-ua-platform'] || '', h['sec-ch-ua'] || ''].join('|');
  return crypto.createHash('sha256').update(stable).digest('hex').slice(0, 32);
}

/** المسافة بين نقطتين (هافرسين كم) — أساس كشف السفر المستحيل */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => v == null || Number.isNaN(v))) return null;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** تجهيز حزمة الاستخبارات الكاملة من الطلب — نقطة دخول موحدة */
export function collectDeviceIntel(req) {
  const ua = req.headers['user-agent'] || '';
  return {
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null,
    user_agent: ua,
    ...parseUserAgent(ua),
    language: parseLanguage(req.headers['accept-language'] || ''),
    timezone: req.headers['x-client-timezone'] || null,
    ...geoFromHeaders(req),
    fingerprint: deviceFingerprint(req),
  };
}
  return { browser, browser_version, os, os_version, device_type, device_brand };
}

/**
 * تقييم مخاطر الجلسة — ذكاء مقارن ضد تاريخ المستخدم وسجل أجهزته
 * عوامل: جهاز غير مسجل، دولة/مدينة جديدة، سفر مستحيل فيزيائياً (سرعة > 900 كم/س بين الجلسات)
 */
export async function assessSessionRisk(pool, { userId, fingerprint, country, city, latitude, longitude, deviceType }) {
  const flags = []; let score = 0;
  try {
    // 1) الجهاز مسجل؟ موثوق؟
    const dev = await pool.query(
      `SELECT trusted FROM device_registry WHERE user_id=$1 AND fingerprint=$2 AND revoked=false`, [userId, fingerprint]);
    if (!dev.rows.length) { flags.push('new_device'); score += 2; }
    else if (!dev.rows[0].trusted) { flags.push('untrusted_device'); score += 1; }

    // 2) مقارنة مع آخر جلسة: تغير الموقع + كشف السفر المستحيل فيزيائياً
    const last = await pool.query(
      `SELECT country, city, latitude, longitude, login_at FROM user_sessions
       WHERE user_id=$1 AND ip_address IS NOT NULL ORDER BY login_at DESC LIMIT 1`, [userId]);
    const p = last.rows[0];
    if (p) {
      if (country && p.country && country !== p.country) { flags.push(`country_change_${p.country}_to_${country}`); score += 3; }
      else if (city && p.city && city !== p.city) { flags.push('city_change'); score += 1; }
      const km = haversineKm(p.latitude, p.longitude, latitude, longitude);
      if (km != null && p.login_at) {
        const hours = (Date.now() - new Date(p.login_at).getTime()) / 3600000;
        if (hours > 0.01 && km / hours > 900) {
          flags.push(`impossible_travel_${Math.round(km)}km_in_${hours.toFixed(1)}h`); score += 4;
        }
      }
    }
    // 3) أوقات غريبة (1-5 فجراً)
    const hr = new Date().getHours();
    if (hr >= 1 && hr < 5) { flags.push('odd_hours'); score += 1; }
    // 4) نوع جهاز غير معتاد للمستخدم
    const types = await pool.query(
      `SELECT DISTINCT device_type FROM user_sessions WHERE user_id=$1 AND device_type IS NOT NULL`, [userId]);
    if (types.rows.length && !types.rows.some(r => r.device_type === deviceType)) { flags.push('unusual_device_type'); score += 1; }
  } catch { /* فشل التقييم لا يعطل الدخول */ }
  return { score: Math.min(score, 10), flags };
}