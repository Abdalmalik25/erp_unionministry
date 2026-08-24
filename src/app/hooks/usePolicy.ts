/**
 * usePolicy — مصدر عتبات السياسات الرسمية الموحد
 * يجلب العتبات القانونية من إعدادات الخادم مرة واحدة لكل جلسة،
 * فتتغير السياسات من لوحة الإدارة دون إعادة نشر أو تعديل كود.
 */
import { useEffect, useState } from 'react';

export interface PolicyThresholds {
  /** الحد الأدنى القانوني لنسبة التوطين (اليمننة) — نسبة مئوية 0..100 */
  yemenizationMinRatio: number;
}

const FALLBACK: PolicyThresholds = { yemenizationMinRatio: 80 };

let cached: PolicyThresholds | null = null;
let inflight: Promise<PolicyThresholds> | null = null;

export async function getPolicyThresholds(): Promise<PolicyThresholds> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/system/policy')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const d = j?.data ?? j;
        const num = (v: unknown, def: number) => {
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 && n <= 100 ? n : def;
        };
        const policy: PolicyThresholds = {
          yemenizationMinRatio: num(d?.yemenizationMinRatio, FALLBACK.yemenizationMinRatio),
        };
        cached = policy;
        return policy;
      })
      .catch(() => FALLBACK)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function usePolicy(): PolicyThresholds {
  const [policy, setPolicy] = useState<PolicyThresholds>(cached ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    getPolicyThresholds().then(p => { if (alive) setPolicy(p); });
    return () => { alive = false; };
  }, []);
  return policy;
}
