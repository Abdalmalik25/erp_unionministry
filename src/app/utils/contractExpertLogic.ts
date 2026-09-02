/**
 * contractExpertLogic.ts — Expert Contract Lifecycle & Expiry Logic
 * وزارة الشؤون الاجتماعية والعمل — قطاع العمل
 *
 * Derives a contract's lifecycle/expiry status and recommended next action
 * solely from real fields on the contract (status, endDate, noticePeriod,
 * worker passport/work-permit expiry). No synthetic numbers are injected.
 *
 * Legal anchor: Yemeni Labour Law No. 5 of 1995 — fixed-term contracts end by
 * their term; renewal/termination is governed by notice requirements recorded
 * on each contract.
 */

import type { Contract } from '../services/contractService';

export type ExpiryStatus =
  | 'active_in_term'   // still within term / indefinite active
  | 'renewal_due'      // fixed-term ending soon → prepare renewal
  | 'expired_pending'  // term passed but status not yet updated
  | 'documents_risk';  // passport/work-permit expires before/with contract end (expatriates)

export interface ContractLifecycle {
  expiryStatus: ExpiryStatus;
  label: string;
  daysToEnd: number | null; // null when indefinite/undated
  drivers: string[];
  recommendedAction: string;
  badge: string;
}

const EXPIRY_WINDOW_DAYS = 60;

export function analyzeContractLifecycle(contract: Contract): ContractLifecycle {
  const drivers: string[] = [];
  const now = new Date();
  let daysToEnd: number | null = null;
  let expiryStatus: ExpiryStatus = 'active_in_term';

  const isDone =
    contract.status === 'terminated' ||
    contract.status === 'cancelled' ||
    contract.status === 'expired';

  // Fixed-term contracts only: compute remaining days from real endDate.
  if (!isDone && contract.endDate) {
    const end = new Date(contract.endDate);
    if (!Number.isNaN(end.getTime())) {
      daysToEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysToEnd < 0) {
        expiryStatus = 'expired_pending';
        drivers.push('انتهت مدة العقد وفق تاريخ النهاية المسجل');
      } else if (daysToEnd <= EXPIRY_WINDOW_DAYS) {
        expiryStatus = 'renewal_due';
        // Honor the contract's own recorded notice period when present.
        const notice = contract.noticePeriod && contract.noticePeriod > 0 ? contract.noticePeriod : EXPIRY_WINDOW_DAYS;
        if (daysToEnd <= notice) {
          drivers.push(`داخل مهلة الإخطار المسجلة (${notice} يوماً) — تجديد/إنهاء وفق العقد`);
        } else {
          drivers.push(`تنتهي خلال ${daysToEnd} يوماً — جارٍ تجهيز التجديد`);
        }
      }
    }
  }

  // Expatriate documentation check from real worker fields.
  if (contract.worker.workerType === 'expatriate' && daysToEnd != null && daysToEnd > 0) {
    const passportExp = contract.worker.passportExpiry ? new Date(contract.worker.passportExpiry) : null;
    if (passportExp && !Number.isNaN(passportExp.getTime()) && passportExp.getTime() <= new Date(contract.endDate!).getTime()) {
      drivers.push('جواز العامل الأجنبي ينتهي قبل نهاية العقد — يجدد الجواز قبل التجديد');
      if (expiryStatus === 'active_in_term') expiryStatus = 'documents_risk';
    }
  }

  // Confidence driver for active indefinite contracts.
  if (expiryStatus === 'active_in_term' && String(contract.type) === 'indefinite' && contract.status === 'active') {
    drivers.push('عقد غير محدد المدة — شاغر ومستمر بلا تاريخ نهاية');
  }

  const map: Record<ExpiryStatus, { label: string; badge: string; action: string }> = {
    active_in_term: {
      label: 'ساري',
      badge: 'bg-emerald-100 text-emerald-800',
      action: 'متابعة دورية؛ لا إجراء عاجل',
    },
    renewal_due: {
      label: 'قرب التجديد',
      badge: 'bg-amber-100 text-amber-800',
      action: 'تجهيز نموذج التجديد/الإنهاء وفق مدة الإخطار المسجلة في العقد',
    },
    expired_pending: {
      label: 'منتهٍ بانتظار التحديث',
      badge: 'bg-red-100 text-red-800',
      action: 'تحديث حالة العقد (تجديد أو إنهاء) لتصحيح السجل',
    },
    documents_risk: {
      label: 'خطر الوثائق',
      badge: 'bg-orange-100 text-orange-800',
      action: 'مراجعة صلاحية جواز/تصريح العامل الأجنبي قبل مدة العقد',
    },
  };

  return {
    expiryStatus,
    label: map[expiryStatus].label,
    daysToEnd,
    drivers,
    recommendedAction: map[expiryStatus].action,
    badge: map[expiryStatus].badge,
  };
}
