// server/lib/sessions.js — التحكم الحي بالجلسات: كاش + إبطال فوري
// كاش 30 ثانية يجعل الإبطال يسري خلال ثوانٍ دون ضربة قاعدة لكل طلب
import { pool } from '../middleware/shared.js';

const sessionCache = new Map(); // sid -> { active, exp }
const SESSION_CACHE_TTL = 10_000; // 10 ثوانٍ — أقصر من أجل إبطال أسرع

export async function isSessionActive(sid) {
  if (!sid) return false; // توكن بلا جلسة = مرفوض (fail-closed)
  const hit = sessionCache.get(sid);
  if (hit && hit.exp > Date.now()) return hit.active;
  try {
    const r = await pool.query('SELECT is_active FROM user_sessions WHERE id=$1', [sid]);
    const active = r.rows[0]?.is_active === true;
    sessionCache.set(sid, { active, exp: Date.now() + SESSION_CACHE_TTL });
    if (sessionCache.size > 5000) {
      const now = Date.now();
      for (const [k, v] of sessionCache) if (v.exp <= now) sessionCache.delete(k);
    }
    return active;
  } catch { return false; } // فشل الفحص = رفض (fail-closed — أمان فوق التوفرية)
}

/** إبطال كاش جلسة بعد إلغائها — يسرّع سريان الإبطال خلال الثواني */
export function invalidateSessionCache(sid) {
  sessionCache.delete(sid);
}