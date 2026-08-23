// server/middleware/shared.js — Shared utilities for all route modules
import pg from 'pg';

// Lazy pool — created on first access so DATABASE_URL is loaded by the time it's needed
const DEFAULT_NEON_DB = 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require';
let _pool = null;
function getPool() {
  if (!_pool) {
    const connStr = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || DEFAULT_NEON_DB;
    _pool = new pg.Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    _pool.on('error', (err) => console.error('Database pool error:', err));
    _pool.on('connect', () => console.log('[DB] New connection established'));
  }
  return _pool;
}

const pool = new Proxy({}, {
  get(target, prop) {
    const p = getPool();
    return p[prop].bind(p);
  }
});

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const includeDeleted = req.query.include_deleted === 'true';
  return { limit, page, offset, includeDeleted };
}

function softDeleteFilter(table, includeDeleted, alias) {
  if (includeDeleted) return '';
  const a = alias ? `${alias}.` : '';
  return ` AND ${a}deleted_at IS NULL`;
}

function countQuery(fromClause, whereClause, params = []) {
  const wc = whereClause ? `WHERE ${whereClause}` : '';
  return { sql: `SELECT COUNT(*)::int FROM ${fromClause} ${wc}`, params };
}

const SOFT_DELETE_TABLES = new Set([
  'members', 'activities', 'documents', 'violations', 'inspections',
  'licenses', 'training_records', 'worker_profiles', 'fee_payments',
  'worker_dispatches', 'board_members', 'elections', 'service_requests',
  'compliance_alerts', 'notifications', 'professions', 'organizational_entities',
  'commercial_establishments', 'enterprise_occupation_links', 'entity_relationships',
  'risk_assessments', 'compliance_matrices', 'maturity_assessments',
  'labor_disputes', 'expatriate_licenses', 'evaluation_certificates',
  'services', 'isic4_classifications', 'worker_reduction_requests',
  'directorates', 'ministry_offices', 'inspectors', 'ministry_employees',
  'inspection_criteria', 'work_injuries', 'insurance_records', 'irregular_workers',
  'health_fitness_certificates', 'experience_certificates', 'worker_procedures',
]);

async function softDelete(table, id, userId) {
  if (!SOFT_DELETE_TABLES.has(table)) {
    console.warn(`[softDelete] Table ${table} not in SOFT_DELETE_TABLES, skipping`);
    return { rows: [] };
  }
  return pool.query(
    `UPDATE ${table} SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id`,
    [userId || null, id]
  );
}

async function auditLog(action, resource, userId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, resource_type, user_id, details, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [action, resource, userId || null, JSON.stringify(details)]
    );
  } catch (e) { console.error('[Audit] Write failed:', e.message); }
}

// Column whitelist validation
const TABLE_COLUMNS = {
  training_records: ['enterprise_id','training_name','training_code','training_type','training_provider',
    'start_date','end_date','duration_hours','status','employee_id','employee_name','assessment_score',
    'certification_issued','certification_number','regulatory_basis','occupation_id','member_id','competence_ids'],
  risk_assessments: ['enterprise_id','entity_id','risk_type','risk_description','likelihood','impact',
    'risk_score','risk_level','mitigation_plan','responsible_person','review_date','status'],
  compliance_matrices: ['enterprise_id','occupation_id','occupation_type','article_number','article_title',
    'compliance_status','notes','checked_at','checked_by'],
  maturity_assessments: ['entity_id','overall_score','grade','identity_score','description_score','tasks_score',
    'competencies_score','safety_score','career_score','governance_score','missing_count','red_flags',
    'recommendations','assessment_date','assessed_by'],
  commercial_establishments: ['name_ar','name_en','establishment_id','unified_code','commercial_register_number',
    'entity_type','sector','classification','status','capital_amount','employees_count','license_date',
    'expiry_date','address','phone','email','owner_name','license_number','governorate','city'],
  enterprise_occupation_links: ['enterprise_id','occupation_id','enterprise_name','cr_number','occupation_code','occupation_name_ar','isco_code','department','allocated_headcount','yemeni_headcount','expatriate_headcount','salary_scale','contract_types','yemenization_policy','link_status','compliance_score','labor_law_compliant','salary_compliant','osh_compliant','medical_checks_done','yemenization_compliant'],
  entity_relationships: ['source_entity_id','target_entity_id','relationship_type','relationship_level','start_date','end_date','status','metadata'],
  legal_references: ['law_name_ar','law_name_en','law_number','law_year','law_type','summary','status'],
  law_articles: ['legal_reference_id','article_number','article_title_ar','article_title_en','content_ar','content_en'],
  ilo_conventions: ['convention_number','convention_name_ar','convention_name_en','year_adopted','status','summary'],
  international_standards: ['standard_code','standard_name','standard_name_en','organization','category','status','summary'],
};

function validateColumns(table, body, allowedCols) {
  const keys = Object.keys(body).filter(k => k !== 'id' && k !== '_table' && k !== 'created_at' && k !== 'updated_at');
  const valid = keys.filter(k => allowedCols.includes(k));
  const invalid = keys.filter(k => !allowedCols.includes(k));
  return { valid, invalid };
}

const ALLOWED_TABLES = new Set(['legal_references', 'law_articles', 'ilo_conventions', 'international_standards']);

function safeSetClause(table, body) {
  const allowed = TABLE_COLUMNS[table];
  if (!allowed) return null;
  const { valid, invalid } = validateColumns(table, body, allowed);
  if (invalid.length > 0) console.warn(`[SECURITY] Blocked invalid columns for ${table}:`, invalid);
  return valid;
}

function validateTableName(table) {
  return ALLOWED_TABLES.has(table);
}

export {
  pool, paginate, countQuery, softDelete, softDeleteFilter, auditLog, SOFT_DELETE_TABLES,
  TABLE_COLUMNS, validateColumns, ALLOWED_TABLES, safeSetClause, validateTableName,
};
