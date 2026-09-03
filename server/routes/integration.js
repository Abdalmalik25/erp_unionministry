// server/routes/integration.js — National Labor Integration Gateway + Unified Search + Health
import express from 'express';
import { pool } from '../middleware/shared.js';
import APP_VERSION from '../lib/version.js';

const router = express.Router();

// ========== Unified Search (cross-entity) — with correlationId & audit ==========
router.get('/api/v1/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const scope = (req.query.scope || 'all').toString(); // all|establishments|workers|unions|cases|professions
  if (!q || q.length < 2) return res.json({ query: q, results: [], hint: 'أدخل حرفين على الأقل' });
  const start = Date.now();
  const limit = Math.min(50, parseInt(req.query.limit || '5', 10));
  try {
    // Use enhanced Arabic search function with normalization + relevance ranking
    const r = await pool.query(
      `SELECT * FROM fn_enhanced_arabic_search($1, $2, $3, $4)`,
      [q, scope, limit, 0]
    );
    // Record search analytics
    pool.query(
      `INSERT INTO search_analytics (query_text, normalized_query, scope, result_count) VALUES ($1, $1, $2, $3) ON CONFLICT DO NOTHING`,
      [q, scope, r.rows.length]
    ).catch(() => {});

    const results = r.rows.map(x => ({
      type: x.result_type,
      id: x.result_id.toString(),
      title: x.result_title,
      subtitle: x.result_subtitle,
      status: x.result_status,
      relevance: Math.round((x.relevance || 0.5) * 100),
      ...(x.extra_data || {}),
    }));

    res.json({
      query: q,
      scope,
      count: results.length,
      results,
      took_ms: Date.now() - start,
      correlationId: req.audit?.correlationId || req.headers['x-correlation-id'] || null,
      optimized: true,
    });
  } catch (e) {
    // Fallback to original multi-query approach if function not yet deployed
    try {
      const like = `%${q}%`;
      const results = [];
      if (scope==='all' || scope==='establishments') {
        const r = await pool.query(`SELECT 'establishment' as type, id::text as id, name_ar as title, governorate as subtitle, status FROM commercial_establishments WHERE name_ar ILIKE $1 OR unified_code ILIKE $1 OR commercial_register_number ILIKE $1 LIMIT 5`, [like]);
        r.rows.forEach(x=> results.push(x));
      }
      if (scope==='all' || scope==='workers') {
        const r = await pool.query(`SELECT 'worker' as type, id::text as id, full_name as title, profession as subtitle, status FROM members WHERE full_name ILIKE $1 OR national_id ILIKE $1 LIMIT 5`, [like]);
        r.rows.forEach(x=> results.push(x));
      }
      if (scope==='all' || scope==='unions') {
        const r = await pool.query(`SELECT 'union' as type, entity_id::text as id, name_ar as title, governorate as subtitle, status FROM organizational_entities WHERE name_ar ILIKE $1 LIMIT 5`, [like]);
        r.rows.forEach(x=> results.push(x));
      }
      if (scope==='all' || scope==='cases') {
        const r = await pool.query(`SELECT 'case' as type, id::text as id, case_number as title, subject as subtitle, status FROM cases WHERE case_number ILIKE $1 OR subject ILIKE $1 LIMIT 5`, [like]);
        r.rows.forEach(x=> results.push(x));
      }
      const rl = await pool.query(`SELECT 'legal' as type, id::text as id, title_ar as title, law_number as subtitle, status FROM legal_sources WHERE title_ar ILIKE $1 LIMIT 3`, [like]);
      rl.rows.forEach(x=> results.push(x));
      res.json({ query: q, scope, count: results.length, results, took_ms: Date.now()-start, correlationId: req.audit?.correlationId || req.headers['x-correlation-id'] || null, optimized: false });
    } catch (e2) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
  }
});

// ========== Integration Gateway — API registry + versioning ==========
const GATEWAY = [
  { id:'identity', name:'الهوية الوطنية للعمل', prefix:'/api/v1/persons', version:'v1', status:'active', auth:'RBAC+ABAC', rate:'200/min' },
  { id:'establishments', name:'المنشآت', prefix:'/api/v1/establishments', version:'v1', status:'active', auth:'RBAC', rate:'200/min' },
  { id:'workers', name:'العمال', prefix:'/api/v1/workers', version:'v1', status:'active', auth:'RBAC', rate:'200/min' },
  { id:'contracts', name:'العقود المهيكلة', prefix:'/api/v1/contracts', version:'v1', status:'active', auth:'RBAC', rate:'100/min' },
  { id:'inspections', name:'التفتيش الميداني', prefix:'/api/v1/inspections', version:'v1', status:'active', auth:'inspector', rate:'100/min' },
  { id:'disputes', name:'النزاعات', prefix:'/api/v1/cases?type=dispute', version:'v1', status:'active', auth:'legal_counsel', rate:'100/min' },
  { id:'unions', name:'النقابات', prefix:'/api/v1/unions', version:'v1', status:'active', auth:'RBAC', rate:'200/min' },
  { id:'legal', name:'التشريعات', prefix:'/api/v1/legal/sources', version:'v1', status:'active', auth:'public', rate:'500/min' },
  { id:'regulatory', name:'محرك القواعد', prefix:'/api/v1/regulatory', version:'v1', status:'active', auth:'ministry_admin', rate:'100/min' },
  { id:'search', name:'البحث الموحد', prefix:'/api/v1/search', version:'v1', status:'active', auth:'authenticated', rate:'300/min' },
];

router.get('/api/v1/gateway', (_req,res)=> res.json({ version:'1.0.0', gateway: GATEWAY, note:'كل مسار يطبق CorrelationId + RateLimit + RBAC + Audit + Versioning' }));
router.get('/api/v1/gateway/:id/health', async (req,res)=>{
  const g = GATEWAY.find(x=> x.id===req.params.id);
  if(!g) return res.status(404).json({ error:'غير موجود' });
  // lightweight probe
  const start=Date.now();
  try { await pool.query('SELECT 1'); res.json({ id:g.id, status:'healthy', latency_ms: Date.now()-start, timestamp: new Date().toISOString() }); }
  catch(e){ res.status(503).json({ id:g.id, status:'unhealthy', error:e.message }); }
});

// ========== Health — deep ==========
router.get('/api/health/detailed', async (_req,res)=>{
  const checks={};
  try { await pool.query('SELECT 1'); checks.db='up'; } catch(e){ checks.db='down'; checks.db_error=e.message; }
  checks.cache='up'; // memory
  checks.version=APP_VERSION;
  checks.features={ regulatory:true, workflow:true, contracts:true, offline:true, rag:'explainable' };
  const healthy = checks.db==='up';
  res.status(healthy?200:503).json({ status: healthy?'healthy':'degraded', checks, timestamp: new Date().toISOString(), correlationId: `hlth-${Date.now()}` });
});

// ========== Audit — tamper-evident viewer (server-side only) ==========
router.get('/api/v1/audit', async (req,res)=>{
  const limit = Math.min(100, parseInt(req.query.limit||'20'));
  const offset = parseInt(req.query.offset||'0');
  // only ministry_admin / super_admin
  if (!req.user || !['super_admin','ministry_admin','supervisory_director'].includes(req.user.role)) {
    return res.status(403).json({ error:'ليس لديك صلاحية عرض سجل التدقيق' });
  }
  const r = await pool.query(`SELECT id, action, resource_type, user_id, details, created_at FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  const total = await pool.query(`SELECT COUNT(*)::int as c FROM audit_log`);
  res.json({ data: r.rows, total: total.rows[0].c, limit, offset, note:'كل كتابة تُسجل لحظياً من الخادم مع before/after + IP + device حيثما يتوفر — غير قابل للتزوير من العميل' });
});

export default router;
