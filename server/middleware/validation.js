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

// Explicit body validator — same contract as validate(schema), reads req.body
export function validateBody(schema) {
  return validate(schema);
}

// Query validator — validates req.query against the same rule format
export function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rule] of Object.entries(schema)) {
      const val = req.query[field];
      if (rule.required && (val === undefined || val === null || val === '')) {
        errors.push(`${field} مطلوب`);
        continue;
      }
      if (val === undefined) continue;
      if (rule.type === 'number' && typeof val !== 'number' && isNaN(Number(val))) errors.push(`${field} يجب أن يكون رقماً`);
      if (rule.enum && !rule.enum.includes(val)) errors.push(`${field} قيمة غير مسموحة`);
      if (rule.integer && (!/^-?\d+$/.test(String(val)))) errors.push(`${field} يجب أن يكون عدداً صحيحاً`);
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

// TD-005: Column name whitelist validator for dynamic UPDATE operations
// Prevents SQL injection through user-controlled column names
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export function validateColumnNames(allowedColumns) {
  const allowedSet = new Set(allowedColumns);
  return (columns) => {
    const valid = [];
    const invalid = [];
    for (const col of columns) {
      if (VALID_IDENTIFIER.test(col) && allowedSet.has(col)) {
        valid.push(col);
      } else {
        invalid.push(col);
      }
    }
    return { valid, invalid };
  };
}

// TD-005: Table name validator for dynamic table operations
const ALLOWED_TABLES = new Set([
  'organizational_entities', 'commercial_establishments', 'commercial_branches',
  'members', 'activities', 'elections', 'board_members', 'documents',
  'violations', 'inspections', 'risk_assessments', 'compliance_matrices',
  'maturity_assessments', 'compliance_alerts', 'licenses', 'professions',
  'services', 'service_requests', 'worker_profiles', 'worker_dispatches',
  'worker_reduction_requests', 'fee_payments', 'training_records',
  'evaluation_certificates', 'labor_disputes', 'expatriate_licenses',
  'legal_references', 'notifications', 'sector_users', 'audit_log',
  'custom_field_definitions', 'custom_field_values', 'national_directories',
  'isic4_classifications', 'employment_contracts', 'cases', 'workflow_instances',
  'legal_sources', 'regulatory_rules', 'service_catalog', 'service_instances',
  'external_integrations', 'external_cache', 'user_sessions', 'device_registry'
]);
export function validateTableName(table) {
  return VALID_IDENTIFIER.test(table) && ALLOWED_TABLES.has(table);
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
