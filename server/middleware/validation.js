// server/middleware/validation.js — Nuclear input validation with allowlists
// TD-010, TD-005, TD-022 payoff: Zod-like schemas without extra dep (lightweight, zero-trust)

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rule] of Object.entries(schema)) {
      const val = req.body[field];
      if (rule.required && (val === undefined || val === null || val === '')) {
        errors.push(`${field} مطلوب`);
        continue;
      }
      if (val === undefined) continue;
      if (rule.type === 'string' && typeof val !== 'string') errors.push(`${field} يجب أن يكون نصاً`);
      if (rule.type === 'number' && typeof val !== 'number' && isNaN(Number(val))) errors.push(`${field} يجب أن يكون رقماً`);
      if (rule.type === 'date' && isNaN(Date.parse(val))) errors.push(`${field} تاريخ غير صالح`);
      if (rule.maxLength && typeof val === 'string' && val.length > rule.maxLength) errors.push(`${field} أطول من المسموح (${rule.maxLength})`);
      if (rule.enum && !rule.enum.includes(val)) errors.push(`${field} قيمة غير مسموحة`);
      if (rule.pattern && !rule.pattern.test(val)) errors.push(`${field} تنسيق غير صالح`);
    }
    if (errors.length) return res.status(400).json({ error: 'خطأ في التحقق', details: errors, code: 'VALIDATION_ERROR' });
    next();
  };
}

// Allowlist sanitizer for query params (prevent injection)
const ALLOWED_SORT_FIELDS = new Set(['created_at','updated_at','name_ar','status','governorate','city']);
export function sanitizeQuery(req, _res, next) {
  if (req.query.sort && !ALLOWED_SORT_FIELDS.has(req.query.sort)) req.query.sort = 'created_at';
  if (req.query.order && !['asc','desc'].includes(req.query.order)) req.query.order='desc';
  // strip dangerous chars
  for (const k of ['search','q']) if (req.query[k]) req.query[k]= String(req.query[k]).replace(/[<>"'`;]/g,'').slice(0,200);
  next();
}

// Schemas — nuclear: هرم القواعد القانونية لا يُخترق
export const schemas = {
  entityCreate: {
    name_ar: { required: true, type:'string', maxLength: 200 },
    entity_type: { required: true, type:'string', enum:['union','federation','branch','committee','organization','establishment'] },
    governorate: { required: true, type:'string', maxLength: 100 },
    city: { required: true, type:'string', maxLength: 100 },
    phone: { type:'string', pattern: /^[0-9+\-\s]{7,20}$/ },
    email: { type:'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  },
  contractCreate: {
    worker_person_id: { required:true, type:'string' },
    establishment_id: { required:true, type:'string' },
    start_date: { required:true, type:'date' },
    wage_amount: { required:true, type:'number' },
  },
  caseCreate: {
    case_type: { required:true, type:'string', enum:['complaint','dispute','inspection','violation','appeal','injury','union_action','request'] },
    subject: { required:true, type:'string', maxLength: 300 },
  },
};
