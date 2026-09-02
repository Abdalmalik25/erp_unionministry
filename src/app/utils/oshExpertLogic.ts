/**
 * oshExpertLogic.ts — Expert Occupational Safety & Health (OSH) Incident Triage
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derives an OSH incident's risk/urgency profile from its real fields:
 * severity declaration, worker injuries (medical attention, hospitalization),
 * status, and investigation/remediation state. No synthetic numbers.
 *
 * Legal anchor: Law 23/1997 on OSH — fatal and serious workplace injuries carry
 * mandatory notification to the competent authority and immediate investigation.
 */

import type { OSHIncident } from '../services/oshService';

export type OSHResponse = 'routine' | 'watch' | 'critical';

export interface OSHExpert {
  response: OSHResponse;
  responseLabel: string;
  badge: string;
  drivers: string[];
  recommendedAction: string;
  /** Mandatory notification obligations derived from real worker-injury data. */
  mandatoryNotifications: string[];
  /** True when a serious/fatal/critical incident still lacks an investigation. */
  investigationMissing: boolean;
}

export function analyzeOSHIncident(incident: OSHIncident): OSHExpert {
  const drivers: string[] = [];
  const mandatoryNotifications: string[] = [];
  const workers = incident.workersInvolved ?? [];

  let response: OSHResponse = 'routine';
  let investigationMissing = false;

  // 1) Worst real medical attention across every worker involved (computed, not declared).
  let worstMedical: string | null = null;
  for (const w of workers) {
    const m = w.medicalAttention;
    if (!m) continue;
    const order = ['none', 'first_aid', 'outpatient', 'hospitalized', 'fatal'];
    if (worstMedical === null || order.indexOf(m) > order.indexOf(worstMedical)) {
      worstMedical = m;
    }
  }

  // 2) Declared severity drives the floor; real medical data may raise it.
  if (incident.severity === 'fatal') {
    response = 'critical';
    drivers.push('حالة وفاة مُعلنة');
  } else if (incident.severity === 'critical' || incident.severity === 'serious') {
    response = 'watch';
    drivers.push('إصابة خطيرة/حرجة مُعلنة');
  }

  if (worstMedical === 'fatal') {
    response = 'critical';
    drivers.push('عامل متوفى وفق سجل الإصابات');
  } else if (worstMedical === 'hospitalized' && response !== 'critical') {
    if (response === 'routine') response = 'watch';
    drivers.push('عامل منوم (استشفاء) وفق سجل العمال المتأثرين');
  }

  // 3) Mandatory notification obligations (real data → real legal consequence).
  if (worstMedical === 'fatal' || incident.severity === 'fatal') {
    mandatoryNotifications.push('إبلاغ فوري: السلطة المختصة بالسلامة المهنية + الجهات المختصة وفقاً لقانون 23/1997');
  }
  if (worstMedical === 'hospitalized' || incident.severity === 'critical') {
    mandatoryNotifications.push('إبلاغ لجنة السلامة المهنية بالمنشأة وتوثيق الحادثة رسمياً');
  }

  // 4) Investigation completeness for serious+ incidents.
  if (
    (response === 'watch' || response === 'critical') &&
    incident.status !== 'closed' &&
    !incident.investigation?.findings?.length
  ) {
    investigationMissing = true;
    drivers.push('حادث خطير دون تحقيقات مسجلة — يلزم بدء التحقيق');
  }

  // 5) Remediation requirement recorded but status still open.
  if (incident.remediation?.required && incident.status !== 'closed') {
    drivers.push('مطالبة تصحيحية مفروضة وغير مُغلقة');
  }

  const map: Record<OSHResponse, { label: string; badge: string; action: string }> = {
    routine: {
      label: 'متابعة روتينية',
      badge: 'bg-emerald-100 text-emerald-800',
      action: 'توثيق وتسجيل؛ لا إجراء عاجل',
    },
    watch: {
      label: 'مراقبة نشطة',
      badge: 'bg-amber-100 text-amber-800',
      action: 'متابعة التحقيق والإغلاق في أقرب وقت وفقاً للدورة',
    },
    critical: {
      label: 'تدخل فوري',
      badge: 'bg-red-100 text-red-800',
      action: 'بدء التحقيق فوراً وتفعيل الإبلاغات الإلزامية قبل الإغلاق',
    },
  };

  return {
    response,
    responseLabel: map[response].label,
    badge: map[response].badge,
    drivers,
    recommendedAction: map[response].action,
    mandatoryNotifications,
    investigationMissing,
  };
}