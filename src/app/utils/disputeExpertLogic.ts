/**
 * disputeExpertLogic.ts — Expert SLA & Escalation Guidance for Labor Disputes
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derives ageing/SLA risk and an escalation recommendation from real fields on
 * the dispute (createdAt, priority, status, category). No synthetic numbers are
 * injected. The guidance uses normative review thresholds clearly labelled as
 * such (Ministry operational policy), never passed off as recorded law.
 */

import type { LaborDispute } from '../services/disputeService';

export interface DisputeExpert {
  daysOpen: number; // real elapsed days since createdAt
  ageBand: 'fresh' | 'aging' | 'overdue';
  ageBandLabel: string;
  pending: boolean;
  drivers: string[];
  escalationRoute: string;
  badge: string;
}

/** Dispute categories that carry immediate legal/safety weight. */
const HIGH_SENSITIVITY = new Set([
  'termination',
  'discrimination',
  'harassment',
  'OSH_violation',
  'workplace_safety',
  'union_rights',
]);

export function analyzeDispute(dispute: LaborDispute, now: Date = new Date()): DisputeExpert {
  const drivers: string[] = [];
  const created = new Date(dispute.createdAt);
  const daysOpen = Number.isNaN(created.getTime())
    ? 0
    : Math.max(0, Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));

  const pending = !['resolved', 'closed', 'dismissed'].includes(dispute.status);

  let ageBand: 'fresh' | 'aging' | 'overdue' = 'fresh';
  let ageBandLabel = 'حديث';
  if (pending && daysOpen > 30) {
    ageBand = 'overdue';
    ageBandLabel = 'متأخر';
  } else if (pending && daysOpen > 15) {
    ageBand = 'aging';
    ageBandLabel = 'متقدم قضائياً';
  } else if (!pending && daysOpen > 30) {
    ageBand = 'overdue';
    ageBandLabel = 'معلق بدون إغلاق';
  }

  if (pending) {
    drivers.push(`مفتوح منذ ${daysOpen} يوماً`);
  }

  const isHighSensitivity = HIGH_SENSITIVITY.has(dispute.category);
  if (isHighSensitivity) {
    drivers.push('فئة حسّاسة (إنهاء/تمييز/تحرش/سلامة/حقوق نقابية)');
  }

  const isUrgent = dispute.priority === 'urgent' || dispute.priority === 'critical';
  if (isUrgent) {
    drivers.push('أولوية معلنة عالية/حرجة');
  }

  // Escalation route derived from real category + priority.
  let escalationRoute: string;
  if (isUrgent && pending) {
    escalationRoute = 'توجيه فوري إلى التوفيق، وإذا تعذر الحل إلى التحكيم/القضاء دون تأخير';
  } else if (isHighSensitivity) {
    escalationRoute = 'مسار التوفيق أولاً مع إبقاء خيار التحكيم مفتوحاً نظراً لطبيعة الشكوى';
  } else {
    escalationRoute = 'البدء بالتوفيق ثم التحكيم وفق مسار النزاعات الاعتيادي';
  }

  let badge: string;
  if (ageBand === 'overdue' && pending) {
    badge = 'bg-red-100 text-red-800';
  } else if (ageBand === 'aging') {
    badge = 'bg-amber-100 text-amber-800';
  } else {
    badge = 'bg-emerald-100 text-emerald-800';
  }

  return {
    daysOpen,
    ageBand,
    ageBandLabel,
    pending,
    drivers,
    escalationRoute,
    badge,
  };
}