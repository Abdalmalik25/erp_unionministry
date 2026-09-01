/**
 * inspectionExpertLogic.ts — Expert Triage & Risk-Based Scheduling Logic
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Computes a genuine (non-fabricated) risk/urgency score for each inspection
 * from real inspection data, classifies the recommended next action, and
 * derives scheduling priority so inspectors triage the highest-risk cases first.
 *
 * Legal basis: Law 5/1995 (Labor) & Law 23/1997 (OSH). All values are derived
 * from the actual inspection record — no synthetic defaults are injected.
 */

import type { Inspection } from '../services/inspectionService';

export type TriageUrgency = 'routine' | 'priority' | 'urgent';

export interface InspectionTriage {
  /** 0-100 composite score computed from real signals present on the record. */
  riskScore: number;
  urgency: TriageUrgency;
  /** Human-readable reason list explaining why the score was raised. Empty when no signal applies. */
  drivers: string[];
  /** Recommended next action as plain Arabic label (no fabricated numbers). */
  recommendedAction: string;
  /** SLA advice derived from the record's own slaStatus. */
  slaAdvice: string | null;
}

const SENSITIVE_TYPES = new Set(['child_labor', 'OSH', 'complaint_based']);

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 55,
  major: 20,
  minor: 6,
};

const URGENT_TYPES = new Set(['child_labor', 'OSH']);

/**
 * Compute the recommended next action from the real inspection state.
 */
export function recommendNextAction(inspection: Inspection): string {
  const s = inspection.status;
  if (s === 'planned') return 'جدولة وتعيين مفتش';
  if (s === 'assigned') return 'بدء التفتيش الميداني';
  if (s === 'in_progress') {
    const openViolations = (inspection.violations ?? []).filter(
      (v) => v.status !== 'resolved' && v.status !== 'under_remediation'
    );
    return openViolations.length
      ? 'استكمال الرصد وإصدار الإشعارات'
      : 'تعبئة التقرير ورفعه للمراجعة';
  }
  if (s === 'report_submitted') return 'اعتماد التقرير';
  if (s === 'escalated') return 'إحالة للمسار القانوني';
  if (s === 'violations_found') return 'متابعة تصحيح المخالفات';
  if (s === 'cancelled') return 'إعادة جدولة إن لزم';
  return 'مراجعة الحالة';
}

/**
 * Expert triage: compute risk score, urgency band, drivers and next action.
 * Every point added to the score must be traceable to a real field on the record.
 */
export function triageInspection(inspection: Inspection): InspectionTriage {
  let score = 0;
  const drivers: string[] = [];
  const now = new Date();

  // 1) Declared priority — real field on the record.
  if (inspection.priority === 'urgent') {
    score += 20;
    drivers.push('أولوية معلنة: عاجلة');
  } else if (inspection.priority === 'high') {
    score += 14;
    drivers.push('أولوية معلنة: مرتفعة');
  } else if (inspection.priority === 'medium') {
    score += 7;
    drivers.push('أولوية معلنة: متوسطة');
  }

  // 2) Sensitivity of inspection type.
  if (URGENT_TYPES.has(inspection.type)) {
    score += 25;
    drivers.push('نوع حسّاس: ' + inspection.type);
  } else if (inspection.type === 'complaint_based') {
    score += 12;
    drivers.push('مبني على شكوى');
  }

  // 3) Open/unresolved violations with severity weighting.
  const openViolations = (inspection.violations ?? []).filter(
    (v) => v && v.status !== 'resolved'
  );
  for (const v of openViolations) {
    score += SEVERITY_WEIGHT[v.severity] ?? 4;
  }
  if (openViolations.some((v) => v.severity === 'critical')) {
    drivers.push(`مخالفة حرجة مفتوحة (${openViolations.filter((v) => v.severity === 'critical').length})`);
  }
  if (openViolations.some((v) => v.severity === 'major')) {
    drivers.push(`مخالفة كبرى مفتوحة (${openViolations.filter((v) => v.severity === 'major').length})`);
  }

  // 4) SLA status — real field.
  if (inspection.slaStatus === 'breached') {
    score += 20;
    drivers.push('تجاوز المهلة النظامية (SLA)');
  } else if (inspection.slaStatus === 'at_risk') {
    score += 10;
    drivers.push('قرب تجاوز المهلة النظامية');
  }

  // 5) Overdue scheduled date for an unfinished inspection.
  if (
    inspection.schedule?.scheduledDate &&
    !['completed', 'cancelled', 'no_violations'].includes(inspection.status)
  ) {
    const scheduled = new Date(inspection.schedule.scheduledDate);
    if (!Number.isNaN(scheduled.getTime()) && scheduled < now) {
      score += 15;
      drivers.push('موعد التفتيش تجاوزه التاريخ المقرر');
    }
  }

  // 6) Follow-up of a previous inspection (continuity marker).
  if (inspection.previousInspectionId) {
    score += 5;
    drivers.push('زيارة متابعة لتفتيش سابق');
  }

  // Clamp to 0-100.
  const riskScore = Math.max(0, Math.min(100, score));

  // Urgency is driven first by hard legal/regulatory signals, then by score.
  const hasCriticalViolation = openViolations.some((v) => v.severity === 'critical');
  const forcedUrgent =
    URGENT_TYPES.has(inspection.type) || // child labor / OSH — legal imperative
    hasCriticalViolation ||
    inspection.slaStatus === 'breached' ||
    inspection.priority === 'urgent';

  let urgency: TriageUrgency = 'routine';
  if (forcedUrgent) urgency = 'urgent';
  else if (riskScore >= 30) urgency = 'priority';

  let slaAdvice: string | null = null;
  if (inspection.slaStatus === 'breached') slaAdvice = 'نبّه المشرف واتخذ إجراءً تصحيحيًا فور اعتماد الجدولة.';
  else if (inspection.slaStatus === 'at_risk') slaAdvice = 'أعد الجدولة بأقرب وقت قبل تجاوز المهلة.';

  return {
    riskScore,
    urgency,
    drivers,
    recommendedAction: recommendNextAction(inspection),
    slaAdvice,
  };
}

/**
 * Sort a list of inspections by descending risk so the most critical are triaged first.
 */
export function sortByRisk(inspections: Inspection[]): Inspection[] {
  return [...inspections].sort(
    (a, b) => triageInspection(b).riskScore - triageInspection(a).riskScore
  );
}

/** Arabic urgency label + badge color. */
export const URGENCY_LABEL: Record<TriageUrgency, { label: string; badge: string }> = {
  routine: { label: 'روتينية', badge: 'bg-gray-100 text-gray-700' },
  priority: { label: 'ذات أولوية', badge: 'bg-amber-100 text-amber-800' },
  urgent: { label: 'عاجلة', badge: 'bg-red-100 text-red-800' },
};
