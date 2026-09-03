// server/middleware/shared.js — Shared utilities for all route modules
import pg from 'pg';
import { localPool, initLocalDb, startAutoSync, stopAutoSync } from '../lib/localDb.js';

// Lazy pool — created on first access so DATABASE_URL is loaded by the time it's needed
let _pool = null;
let _neonOnline = true;
let _fallbackActive = false;
let _lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 30000;

async function getPool() {
  if (!_pool) {
    const connStr = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!connStr) {
      // No Neon configured — use local only (offline-first mode)
      console.log('[DB] No DATABASE_URL configured — using offline-first local SQLite');
      await initLocalDb();
      _pool = localPool;
      _fallbackActive = true;
      return _pool;
    }
    const useSSL = process.env.DB_SSL !== 'false';
    _pool = new pg.Pool({
      connectionString: connStr,
      ssl: useSSL ? { rejectUnauthorized: true } : false,
      // National-grade: balanced for Neon serverless + high concurrency
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '3', 10),
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '8000', 10),
      query_timeout: 15000,
      statement_timeout: 15000,
      keepAlive: true,
    });
    _pool.on('error', (err) => console.error('[DB] Pool error:', err.message));
    _pool.on('connect', () => console.log('[DB] Connection established'));

    // Start auto-sync with Neon
    await initLocalDb();
    startAutoSync(_pool);
  }
  return _pool;
}

// Health-check wrapper: tests Neon, falls back to local if unreachable
async function getHealthyPool() {
  const now = Date.now();
  if (_fallbackActive && (now - _lastHealthCheck) < HEALTH_CHECK_INTERVAL_MS) {
    return localPool; // Recently confirmed offline, use local
  }

  try {
    const p = await getPool();
    if (p === localPool) return p; // No Neon configured
    await p.query('SELECT 1');
    _neonOnline = true;
    _fallbackActive = false;
    _lastHealthCheck = now;
    return p;
  } catch (e) {
    _neonOnline = false;
    _fallbackActive = true;
    _lastHealthCheck = now;
    console.warn('[DB] Neon unreachable, falling back to local SQLite:', e.message);
    await initLocalDb();
    return localPool;
  }
}

// Connection pool observability — exposes pool stats for health/metrics endpoints
function getPoolStats() {
  if (!_pool) return { totalCount: 0, idleCount: 0, waitingCount: 0 };
  return {
    totalCount: _pool.totalCount,
    idleCount: _pool.idleCount,
    waitingCount: _pool.waitingCount,
    maxConnections: parseInt(process.env.DB_POOL_MAX || '20', 10),
  };
}

const pool = new Proxy({}, {
  get(target, prop) {
    // Use async health-check for query/connect to ensure Neon pool is initialized
    // before falling back to local. Prevents no-op pool from silently returning
    // empty results on cold starts (e.g. Vercel serverless).
    if (prop === 'query' || prop === 'connect') {
      return async (...args) => {
        const p = await getHealthyPool();
        return p[prop](...args);
      };
    }
    const p = _pool || localPool;
    return p[prop]?.bind(p);
  }
});

const healthyPool = new Proxy({}, {
  get(target, prop) {
    // Async health-check wrapper — falls back to local SQLite on Neon failure
    if (prop === 'query' || prop === 'connect') {
      return async (...args) => {
        const p = await getHealthyPool();
        return p[prop](...args);
      };
    }
    const p = _pool || localPool;
    return p[prop]?.bind(p);
  }
});

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  // include_deleted مسموح فقط للمدير — يمنع المستخدمين العاديين من رؤية السجلات المحذوفة
  const isAdmin = req.user && ['super_admin', 'ministry_admin'].includes(req.user.role);
  const includeDeleted = isAdmin && req.query.include_deleted === 'true';
  return { limit, page, offset, includeDeleted };
}

// Cursor-based pagination for large datasets (P1: avoids OFFSET degradation)
// Usage: ?cursor=<created_at value of last row>&limit=20
function paginateCursor(req, defaultSortColumn = 'created_at') {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const cursor = req.query.cursor || null;
  const direction = req.query.direction === 'asc' ? 'ASC' : 'DESC';
  const isAdmin = req.user && ['super_admin', 'ministry_admin'].includes(req.user.role);
  const includeDeleted = isAdmin && req.query.include_deleted === 'true';
  return { limit, cursor, direction, includeDeleted, sortColumn: defaultSortColumn };
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
  'health_fitness_certificates', 'experience_certificates', 'work_procedures',
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
  const c = await pool.connect();
  try {
    // توحيد الفعل: أحرف كبيرة + شرطات سفلية (متطلب قيد القاعدة)
    const act = String(action || 'ACTION').trim().toUpperCase().replace(/\s+/g, '_');
    await c.query('BEGIN');
    // قفل استشاري على مستوى المعاملة: يجعل قراءة-كتابة المشغّل (seq+prev) ذرية أمام التزامن
    await c.query('SELECT pg_advisory_xact_lock($1)', [918273461]);
    // السلسلة (prev_hash/row_hash/sequence) يولدها المشغّل trg_audit_hash في قاعدة البيانات —
    // لا يحسبها التطبيق إطلاقاً؛ أي محاولة تزوير القيم هنا ستُستبدل داخل القاعدة
    // تتبع الأثر الكامل: ip/user_agent/session_id تُكتب عند توفرها في التفاصيل
    // تطهير IP — العمود inet صارم؛ أي قيمة غير سليمة تُهمل بدل كسر السجل كله
    const rawIp = details?.ip || null;
    const ip = rawIp && /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:]+)$/.test(String(rawIp).trim()) ? String(rawIp).trim() : null;
    await c.query(
      `INSERT INTO audit_log (action, table_name, actor_id, notes, ip_address, user_agent, session_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [act, resource, userId || null, JSON.stringify(details),
       ip, details?.user_agent || null, details?.session_id ? String(details.session_id) : null]
    );
    await c.query('COMMIT');
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { /* الاتصال ميت */ }
    console.error('[Audit] Write failed:', e.message);
  } finally { c.release(); }
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

function getNeonStatus() {
  return { online: _neonOnline, fallback: _fallbackActive };
}

export {
  pool, healthyPool, paginate, paginateCursor, countQuery, softDelete, softDeleteFilter, auditLog,
  getPoolStats, SOFT_DELETE_TABLES,
  TABLE_COLUMNS, validateColumns, ALLOWED_TABLES, safeSetClause, validateTableName,
  localPool, initLocalDb, startAutoSync, stopAutoSync, getNeonStatus,
};
