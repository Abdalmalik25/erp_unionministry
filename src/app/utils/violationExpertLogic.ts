/**
 * violationExpertLogic.ts — Expert Analysis for Violations & Penalties
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derived from real violation fields only (detected_date, severity, status,
 * penalty_amount, decision, resolved_date). Thresholds are normative ministry
 * review standards — clearly labelled as policy guidance, not law.
 */

export type ViolationStatus = 'open' | 'under_review' | 'resolved' | 'closed' | 'appealed';
export type ViolationSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export interface ViolationLike {
  detected_date?: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  penalty_amount?: number | null;
  decision?: string;
  resolved_date?: string;
}

export type ViolationExpert = {
  daysOpen: number;
  pending: boolean;
  overdue: boolean;
  drivers: string[];
  recommendedAction: string;
  badge: string;
};

export function analyzeViolation(v: ViolationLike, now: Date = new Date()): ViolationExpert {
  const drivers: string[] = [];
  const pending = v.status === 'open' || v.status === 'under_review' || v.status === 'appealed';
  const severe = v.severity === 'major' || v.severity === 'critical';

  let daysOpen = 0;
  if (v.detected_date) {
    const detected = new Date(v.detected_date);
    if (!Number.isNaN(detected.getTime())) {
      daysOpen = Math.max(0, Math.ceil((now.getTime() - detected.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  // Resolution SLA (normative 30-day review window for pending violations).
  const overdue = pending && daysOpen > 30;
  if (overdue) drivers.push(`مفتوحة منذ ${daysOpen} يوماً تتجاوز نافذة المراجعة القياسية`);

  // Penalty gap: severe violation without a recorded penalty.
  const penaltyMissing = severe && (v.penalty_amount == null);
  if (penaltyMissing) drivers.push('مخالفة كبيرة/حرجة دون غرامة مسجلة');

  // Decision gap: closed/resolved/appealed should carry a recorded decision.
  const decisionMissing =
    (v.status === 'closed' || v.status === 'resolved' || v.status === 'appealed') && !v.decision;
  if (decisionMissing) drivers.push('غُلقت دون تسجيل القرار');

  let recommendedAction: string;
  if (v.status === 'closed') {
    recommendedAction = 'مكتملة؛ لا إجراء مطلوب';
  } else if (overdue) {
    recommendedAction = 'معالجة عاجلة وإغلاق أو فرض غرامة وفق الإجراءات';
  } else if (penaltyMissing) {
    recommendedAction = 'استكمال تحديد الغرامة واتخاذ القرار بشأن المخالفة';
  } else if (v.status === 'appealed') {
    recommendedAction = 'إعادة فتح المراجعة أو تأكيد القرار وفق الاستئناف';
  } else {
    recommendedAction = 'إبقاء المراجعة ضمن النافذة القياسية';
  }

  const badge = v.status === 'closed'
    ? 'bg-emerald-100 text-emerald-800'
    : overdue
      ? 'bg-red-100 text-red-800'
      : penaltyMissing || v.status === 'appealed'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-800';

  return { daysOpen, pending, overdue, drivers, recommendedAction, badge };
}