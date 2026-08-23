/**
 * Certificate profession/standards validation - منع الإصلاحات الوهمية (Boolean Fixes)
 *
 * Business rule (Evidence Before Mutation):
 *   A certificate can ONLY be marked `assessed_against_standards = true`
 *   when it is actually linked to a valid profession. Marking it true without
 *   a profession FK is a "boolean fix" that hides a real data-integrity gap.
 *
 * These functions are PURE (no DB/IO) so they can be unit-tested without a
 * live database and reused by both the API and the UI.
 */

// Maps the UI/legacy English status values to the DB enum (certificate_status).
const STATUS_MAP = {
  valid: 'صالحة',
  conditional: 'شرطية',
  revoked: 'ملغاة',
  'صالحة': 'صالحة',
  'شرطية': 'شرطية',
  'ملغاة': 'ملغاة',
};

export function normalizeCertificateStatus(value) {
  if (value == null) return value;
  return STATUS_MAP[String(value).trim()] ?? value;
}

/**
 * Validate the profession <-> assessed_against_standards invariant.
 * @param {object} d  input payload (profession_id / prof_id, assessed_against_standards)
 * @returns {{ valid: boolean, errors: Record<string,string>, professionId: (string|null), assessed: boolean }}
 */
export function validateCertificateProfession(d = {}) {
  const errors = {};
  const assessed = d.assessed_against_standards === true;
  const professionId =
    d.profession_id != null && d.profession_id !== ''
      ? d.profession_id
      : (d.prof_id != null && d.prof_id !== '' ? d.prof_id : null);

  // Core invariant: you cannot claim assessment-against-standards without a profession.
  if (assessed && !professionId) {
    errors.assessed_against_standards =
      'لا يمكن اعتماد التقييم مقابل معايير مهنية بدون ربط الشهادة بمهنة صحيحة';
    errors.profession_id = 'مطلوب ربط المهنة عند تفعيل الاعتماد مقابل المعايير';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    professionId,
    assessed,
  };
}
