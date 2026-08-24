/**
 * portals — خريطة البوابات والجمهور المستهدف
 * توجيه كل نوع مستخدم (موظف وزارة / صاحب عمل / نقابة / عامل)
 * إلى بوابته الصحيحة من شاشة الدخول حتى آخر شاشة.
 */

export type Audience = 'ministry' | 'employer' | 'union' | 'worker';

export type PortalKind = 'ministry' | 'organization' | 'employer' | 'worker';

export interface AudienceInfo {
  id: Audience;
  label: string;
  hint: string;
  placeholder: string;
  exampleEmail: string;
}

export const AUDIENCES: AudienceInfo[] = [
  {
    id: 'ministry',
    label: 'موظفو الوزارة',
    hint: 'الحسابات الرسمية على نطاق yemen.gov.ye',
    placeholder: 'name@yemen.gov.ye أو اسم المستخدم الرسمي',
    exampleEmail: 'ministry@yemen.gov.ye',
  },
  {
    id: 'employer',
    label: 'أصحاب العمل والمنشآت',
    hint: 'إدارة المنشأة والعاملين والامتثال والخدمات',
    placeholder: 'البريد المسجل للمنشأة',
    exampleEmail: 'employer@business.ye',
  },
  {
    id: 'union',
    label: 'النقابات والمنظمات',
    hint: 'الاتحادات والنقابات العمالية المسجلة',
    placeholder: 'البريد المسجل للنقابة',
    exampleEmail: 'engineers@union.ye',
  },
  {
    id: 'worker',
    label: 'العاملون',
    hint: 'جواز العمل الرقمي والعقود والشكاوى',
    placeholder: 'رقم الهوية أو البريد المسجل',
    exampleEmail: 'worker@labor.ye',
  },
];

export function getAudience(id: Audience): AudienceInfo {
  return AUDIENCES.find(a => a.id === id) ?? AUDIENCES[0];
}

/** البوابة الافتراضية لكل دور وظيفي */
const ROLE_LANDING: Record<string, string> = {
  worker: '/worker',
  employer_owner: '/employer',
};

/** مسار الهبوط الذكي حسب الدور ونوع المستخدم */
export function getLandingPath(user?: { role?: string; userType?: string } | null): string {
  if (!user) return '/';
  const byRole = user.role ? ROLE_LANDING[user.role] : undefined;
  if (byRole) return byRole;
  return user.userType === 'organization' ? '/organization' : '/ministry';
}

export function getPortalKind(pathname: string, isMinistryUser: boolean): PortalKind {
  if (pathname.startsWith('/employer')) return 'employer';
  if (pathname.startsWith('/worker')) return 'worker';
  return isMinistryUser ? 'ministry' : 'organization';
}

/** ألوان شرائح الأدوار في الواجهة */
export const ROLE_COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};
