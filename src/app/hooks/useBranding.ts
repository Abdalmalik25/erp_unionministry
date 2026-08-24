/**
 * useBranding — مصدر الهوية الرسمية الموحد للواجهة
 * يجلب تعريف النظام من إعدادات الخادم مرة واحدة ويشاركه بين كل الشاشات والمستندات.
 */
import { useEffect, useState } from 'react';
import { BRAND } from '../branding';

export interface OfficialIdentity {
  ministryNameAr: string;
  ministryNameEn: string;
  countryAr: string;
  systemNameAr: string;
  legalBasis: string;
}

const FALLBACK: OfficialIdentity = {
  ministryNameAr: BRAND.ministry,
  ministryNameEn: 'Ministry of Social Affairs and Labor',
  countryAr: BRAND.country,
  systemNameAr: BRAND.systemName,
  legalBasis: 'قانون العمل رقم 40 لسنة 2025 ولائحه التنفيذية',
};

// ذاكرة مشتركة على مستوى التطبيق — جلب واحد لكل جلسة
let cached: OfficialIdentity | null = null;
let inflight: Promise<OfficialIdentity> | null = null;

export async function getOfficialIdentity(): Promise<OfficialIdentity> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/system/branding')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const d = j?.data ?? j;
        const identity: OfficialIdentity = {
          ministryNameAr: d?.ministryNameAr || FALLBACK.ministryNameAr,
          ministryNameEn: d?.ministryNameEn || FALLBACK.ministryNameEn,
          countryAr: d?.countryAr || FALLBACK.countryAr,
          systemNameAr: d?.systemNameAr || FALLBACK.systemNameAr,
          legalBasis: d?.legalBasis || FALLBACK.legalBasis,
        };
        cached = identity;
        return identity;
      })
      .catch(() => FALLBACK)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useBranding(): OfficialIdentity {
  const [identity, setIdentity] = useState<OfficialIdentity>(cached ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    getOfficialIdentity().then(i => { if (alive) setIdentity(i); });
    return () => { alive = false; };
  }, []);
  return identity;
}
