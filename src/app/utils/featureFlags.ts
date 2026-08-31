// src/app/utils/featureFlags.ts
// Configuration-driven feature toggles with override support per user/role

export type FeatureKey =
  | 'ai_labor_intelligence'
  | 'excellence_dashboard'
  | 'maturity_assessments'
  | 'data_quality_center'
  | 'intelligence_center'
  | 'national_platform'
  | 'biometric_verification'
  | 'sms_notifications'
  | 'advanced_analytics'
  | 'export_csv'
  | 'pwa_install'
  | 'real_time_sync'
  | 'telemetry';

interface FeatureFlag {
  key: FeatureKey;
  /** Default enabled state */
  default: boolean;
  /** Human-readable label (ar) */
  label_ar: string;
  /** Human-readable label (en) */
  label_en: string;
  /** Rollout percentage (0-100) */
  rollout?: number;
  /** Roles that always have access regardless of rollout */
  forceRoles?: string[];
  /** Environments where this flag is active */
  environments?: ('development' | 'staging' | 'production')[];
}

const FEATURE_REGISTRY: readonly FeatureFlag[] = [
  { key: 'ai_labor_intelligence', default: true, label_ar: 'ذكاء العمل بالذكاء الاصطناعي', label_en: 'AI Labor Intelligence', rollout: 100 },
  { key: 'excellence_dashboard', default: true, label_ar: 'لوحة التميّز المؤسسي', label_en: 'Excellence Dashboard', rollout: 100 },
  { key: 'maturity_assessments', default: true, label_ar: 'تقييمات نضج المنشآت', label_en: 'Maturity Assessments', rollout: 100 },
  { key: 'data_quality_center', default: true, label_ar: 'مركز جودة البيانات', label_en: 'Data Quality Center', rollout: 100 },
  { key: 'intelligence_center', default: true, label_ar: 'مركز الاستخبارات', label_en: 'Intelligence Center', rollout: 100 },
  { key: 'national_platform', default: true, label_ar: 'المنصة الوطنية الموحدة', label_en: 'National Unified Platform', rollout: 100 },
  { key: 'biometric_verification', default: false, label_ar: 'التحقق البيومتري', label_en: 'Biometric Verification' },
  { key: 'sms_notifications', default: false, label_ar: 'إشعارات الرسائل النصية', label_en: 'SMS Notifications' },
  { key: 'advanced_analytics', default: true, label_ar: 'التحليلات المتقدمة', label_en: 'Advanced Analytics', rollout: 50 },
  { key: 'export_csv', default: true, label_ar: 'تصدير CSV', label_en: 'CSV Export', rollout: 100 },
  { key: 'pwa_install', default: true, label_ar: 'تثبيت التطبيق', label_en: 'PWA Install', rollout: 100 },
  { key: 'real_time_sync', default: true, label_ar: 'مزامنة الوقت الحقيقي', label_en: 'Real-time Sync', rollout: 100 },
  { key: 'telemetry', default: false, label_ar: 'القياسات والتحليل', label_en: 'Telemetry', environments: ['production'] },
];

const OVERRIDES_KEY = 'feature_overrides';

function loadOverrides(): Partial<Record<FeatureKey, boolean>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOverrides(overrides: Partial<Record<FeatureKey, boolean>>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Check if a feature flag is enabled.
 * @param key Feature flag key
 * @param userId Optional user ID for per-user rollout
 * @param role Optional role for force-enable
 */
export function isFeatureEnabled(
  key: FeatureKey,
  userId?: string,
  role?: string,
): boolean {
  const flag = FEATURE_REGISTRY.find((f) => f.key === key);
  if (!flag) return false;

  // Check local override first (admin debugging)
  const overrides = loadOverrides();
  if (key in overrides) return overrides[key]!;

  // Check forced roles
  if (flag.forceRoles && role && flag.forceRoles.includes(role)) return true;

  // Check environment
  if (flag.environments) {
    const env = import.meta.env.MODE as 'development' | 'production' | 'staging';
    if (!flag.environments.includes(env)) return false;
  }

  // Rollout percentage check
  if (flag.rollout !== undefined && flag.rollout < 100) {
    const bucket = hashString(userId || 'anonymous') % 100;
    return bucket < flag.rollout;
  }

  return flag.default;
}

/** Set a temporary override (for admin testing) */
export function setFeatureOverride(key: FeatureKey, value: boolean): void {
  const overrides = loadOverrides();
  overrides[key] = value;
  saveOverrides(overrides);
}

/** Clear all overrides */
export function clearFeatureOverrides(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(OVERRIDES_KEY);
}

/** Get all flags with their current state */
export function getAllFeatureFlags(role?: string): ReadonlyArray<FeatureFlag & { enabled: boolean }> {
  return FEATURE_REGISTRY.map((f) => ({
    ...f,
    enabled: isFeatureEnabled(f.key, undefined, role),
  }));
}

/** React hook: useFeature('ai_labor_intelligence') */
export function useFeature(key: FeatureKey, role?: string): boolean {
  // This will be a hook in the hooks directory
  return isFeatureEnabled(key, undefined, role);
}
