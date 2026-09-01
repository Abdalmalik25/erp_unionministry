// server/routes/regulatory.js — National Labor Regulatory Foundation
// Law First — كل قاعدة لها مصدر قانوني + versioning + explainability
import express from 'express';
import { pool, paginate } from '../middleware/shared.js';
import { guard } from '../middleware/rbacFactory.js';
import { embed, toPgVector } from '../lib/embeddings.js';
import { invalidateCache } from '../middleware/cache.js';

const router = express.Router();

// ========== Legal Sources ==========
router.get('/api/v1/legal/sources', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { source_type, status, law_year, search } = req.query;
    const conds = []; const params = []; let i = 1;
    if (source_type) { conds.push(`source_type = $${i++}`); params.push(source_type); }
    if (status) { conds.push(`status = $${i++}`); params.push(status); }
    if (law_year) { conds.push(`law_year = $${i++}`); params.push(parseInt(law_year)); }
    if (search) { conds.push(`(title_ar ILIKE $${i} OR law_number ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const total = await pool.query(`SELECT COUNT(*)::int as c FROM legal_sources ${where}`, params);
    const rows = await pool.query(`SELECT id, source_type, law_number, law_year, title_ar, title_en, issuing_authority, issue_date, effective_from, effective_to, status, version, parent_source_id, amendment_of, document_url, summary, metadata, created_at, updated_at, created_by, approved_by FROM legal_sources ${where} ORDER BY law_year DESC, law_number ASC LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]);
    res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/legal/sources', guard('regulatory','write'), async (req, res) => {
  try {
    const { source_type, law_number, law_year, title_ar, title_en, issuing_authority, issue_date, effective_from, effective_to, status, summary } = req.body;
    if (!source_type || !title_ar || !effective_from) return res.status(400).json({ error: 'source_type, title_ar, effective_from مطلوبة' });
    const r = await pool.query(
      `INSERT INTO legal_sources (source_type, law_number, law_year, title_ar, title_en, issuing_authority, issue_date, effective_from, effective_to, status, summary, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [source_type, law_number, law_year, title_ar, title_en, issuing_authority, issue_date, effective_from, effective_to, status || 'draft', summary, req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.get('/api/v1/legal/sources/:id/articles', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, legal_source_id, chapter_id, article_number, title_ar, title_en, content_ar, content_en, scope, penalties, order_index, effective_from, effective_to, status, version, metadata, created_at, updated_at FROM legal_articles WHERE legal_source_id = $1 ORDER BY order_index, article_number', [req.params.id]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/legal/articles', guard('regulatory','write'), async (req, res) => {
  try {
    const { legal_source_id, chapter_id, article_number, title_ar, content_ar, scope, penalties } = req.body;
    if (!legal_source_id || !article_number || !title_ar) return res.status(400).json({ error: 'legal_source_id, article_number, title_ar مطلوبة' });
    const r = await pool.query(
      `INSERT INTO legal_articles (legal_source_id, chapter_id, article_number, title_ar, content_ar, scope, penalties, embedding)
       VALUES ($1,$2,$3,$4,$5,$6,$7, $8::vector) RETURNING *`,
      [legal_source_id, chapter_id || null, article_number, title_ar, content_ar, scope, penalties,
       toPgVector(embed(`${title_ar || ''} ${content_ar || ''}`))]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ========== Regulatory Rules ==========
router.get('/api/v1/regulatory/rules', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { status, rule_type, severity, search, applicable_date } = req.query;
    const conds = []; const params = []; let i = 1;
    if (status) { conds.push(`r.status = $${i++}`); params.push(status); }
    if (rule_type) { conds.push(`r.rule_type = $${i++}`); params.push(rule_type); }
    if (severity) { conds.push(`r.severity = $${i++}`); params.push(severity); }
    if (search) { conds.push(`(r.rule_code ILIKE $${i} OR r.name_ar ILIKE $${i})`); params.push(`%${search}%`); i++; }
    if (applicable_date) { conds.push(`r.effective_from <= $${i} AND (r.effective_to IS NULL OR r.effective_to >= $${i})`); params.push(applicable_date); i++; }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const total = await pool.query(`SELECT COUNT(*)::int as c FROM regulatory_rules r ${where}`, params);
    const rows = await pool.query(
      `SELECT r.*, ls.title_ar as legal_source_title, ls.law_number, ls.law_year FROM regulatory_rules r
       LEFT JOIN legal_sources ls ON r.legal_source_id = ls.id
       ${where} ORDER BY r.priority ASC, r.rule_code ASC LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]
    );
    res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.get('/api/v1/regulatory/rules/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT r.*, ls.title_ar as legal_source_title FROM regulatory_rules r LEFT JOIN legal_sources ls ON r.legal_source_id = ls.id WHERE r.id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'القاعدة غير موجودة' });
    const versions = await pool.query('SELECT id, rule_id, version, snapshot, change_reason, changed_by, effective_from, effective_to, created_at FROM regulatory_rule_versions WHERE rule_id = $1 ORDER BY version DESC', [req.params.id]);
    res.json({ ...r.rows[0], versions: versions.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/regulatory/rules', guard('regulatory','write'), async (req, res) => {
  try {
    const { rule_code, name_ar, description_ar, legal_source_id, article_id, article_reference, rule_type, condition, action, severity, applies_to, effective_from, effective_to, priority, exceptions, is_hard_constraint } = req.body;
    if (!rule_code || !name_ar || !rule_type || !condition || !action || !effective_from) return res.status(400).json({ error: 'حقول إلزامية مفقودة: rule_code, name_ar, rule_type, condition, action, effective_from' });
    const r = await pool.query(
      `INSERT INTO regulatory_rules (rule_code, name_ar, description_ar, legal_source_id, article_id, article_reference, rule_type, condition, action, severity, applies_to, effective_from, effective_to, priority, exceptions, is_hard_constraint, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft') RETURNING *`,
      [rule_code, name_ar, description_ar, legal_source_id || null, article_id || null, article_reference, rule_type, JSON.stringify(condition), JSON.stringify(action), severity || 'warning', applies_to || [], effective_from, effective_to || null, priority || 100, JSON.stringify(exceptions || []), is_hard_constraint !== false, req.user?.id || null]
    );
    // initial version snapshot
    await pool.query(`INSERT INTO regulatory_rule_versions (rule_id, version, snapshot, effective_from) VALUES ($1, 1, $2, $3)`, [r.rows[0].id, JSON.stringify(r.rows[0]), effective_from]);
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'رمز القاعدة مكرر' });
    res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' });
  }
});

router.put('/api/v1/regulatory/rules/:id/approve', guard('regulatory','write'), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(`UPDATE regulatory_rules SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2 AND status IN ('draft','pending_review') RETURNING *`, [req.user?.id || null, id]);
    if (!r.rows.length) return res.status(404).json({ error: 'القاعدة غير موجودة أو غير قابلة للموافقة' });
    res.json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// Time-machine: applicable rules at a transaction date
router.get('/api/v1/regulatory/applicable', async (req, res) => {
  try {
    const { date, applies_to, jurisdiction } = req.query;
    const txDate = date || new Date().toISOString().split('T')[0];
    const conds = [`r.status = 'active'`, `r.effective_from <= $1`, `(r.effective_to IS NULL OR r.effective_to >= $1)`];
    const params = [txDate]; let i = 2;
    if (applies_to) { conds.push(`$${i++} = ANY(r.applies_to)`); params.push(applies_to); }
    if (jurisdiction) { conds.push(`(r.jurisdiction IS NULL OR r.jurisdiction = $${i++})`); params.push(jurisdiction); }
    const rows = await pool.query(
      `SELECT r.*, ls.title_ar as legal_source_title FROM regulatory_rules r LEFT JOIN legal_sources ls ON r.legal_source_id = ls.id WHERE ${conds.join(' AND ')} ORDER BY r.priority ASC`, params
    );
    res.json({ date: txDate, count: rows.rowCount, data: rows.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// Evaluate rules against payload — explainable
router.post('/api/v1/regulatory/evaluate', async (req, res) => {
  try {
    const { subject_type, subject_id, transaction_date, payload } = req.body;
    if (!subject_type || !payload) return res.status(400).json({ error: 'subject_type و payload مطلوبان' });
    const txDate = transaction_date || new Date().toISOString().split('T')[0];
    const rules = await pool.query(
      `SELECT id, rule_code, name_ar, name_en, description_ar, description_en, legal_source_id, article_id, article_reference, rule_type, condition, action, severity, applies_to, jurisdiction, effective_from, effective_to, priority, exceptions, status, version, is_hard_constraint, created_by, approved_by, approved_at, metadata, created_at, updated_at FROM regulatory_rules WHERE status = 'active' AND effective_from <= $1 AND (effective_to IS NULL OR effective_to >= $1) AND $2 = ANY(applies_to) ORDER BY priority ASC`,
      [txDate, subject_type]
    );
    const evaluations = [];
    for (const rule of rules.rows) {
      const cond = rule.condition;
      let passed = true; let reason = '';
      // Minimal evaluator: supports { field, operator, value } with dot-path
      try {
        const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
        const fieldVal = get(payload, cond.field || '');
        const op = cond.operator; const expected = cond.value;
        if (op === 'lt') passed = !(fieldVal < expected);
        else if (op === 'lte') passed = !(fieldVal <= expected);
        else if (op === 'gt') passed = !(fieldVal > expected);
        else if (op === 'gte') passed = !(fieldVal >= expected);
        else if (op === 'eq') passed = !(fieldVal == expected);
        else if (op === 'ne') passed = !(fieldVal != expected);
        else if (op === 'is_null') passed = !(fieldVal == null);
        else if (op === 'in') passed = !(Array.isArray(expected) && expected.includes(fieldVal));
        // failed means condition matched → rule triggered
        const triggered = !passed;
        const result = triggered ? (rule.severity === 'block' ? 'blocked' : 'failed') : 'passed';
        if (triggered) reason = rule.action?.message_ar || rule.description_ar;
        evaluations.push({
          rule_code: rule.rule_code,
          rule_id: rule.id,
          legal_basis: rule.article_reference || rule.legal_source_id,
          severity: rule.severity,
          result,
          reason,
          version: rule.version,
          action: rule.action,
        });
        // persist
        await pool.query(
          `INSERT INTO regulatory_rule_evaluations (rule_id, rule_code, evaluation_input, evaluation_result, reason_ar, legal_basis, applied_version, subject_type, subject_id, transaction_date, evaluated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [rule.id, rule.rule_code, JSON.stringify(payload), result, reason, rule.article_reference, rule.version, subject_type, subject_id || null, txDate, req.user?.id || null]
        );
      } catch (evalErr) {
        evaluations.push({ rule_code: rule.rule_code, result: 'not_applicable', error: evalErr.message });
      }
    }
    const blocked = evaluations.some(e => e.result === 'blocked');
    res.json({
      transaction_date: txDate,
      subject_type,
      overall: blocked ? 'blocked' : evaluations.some(e => e.result === 'failed') ? 'failed' : 'passed',
      evaluations,
      explainable: evaluations.filter(e => e.result !== 'passed').map(e => `${e.rule_code}: ${e.reason} [${e.legal_basis}] v${e.version}`),
    });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// Impact analysis for new regulation
router.get('/api/v1/regulatory/impact/:sourceId', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const source = await pool.query('SELECT id, source_type, law_number, law_year, title_ar, title_en, issuing_authority, issue_date, effective_from, effective_to, status, version, parent_source_id, amendment_of, document_url, summary, metadata, created_at, updated_at, created_by, approved_by FROM legal_sources WHERE id = $1', [sourceId]);
    if (!source.rows.length) return res.status(404).json({ error: 'المصدر غير موجود' });
    const rules = await pool.query('SELECT id, rule_code, name_ar, name_en, description_ar, description_en, legal_source_id, article_id, article_reference, rule_type, condition, action, severity, applies_to, jurisdiction, effective_from, effective_to, priority, exceptions, status, version, is_hard_constraint, created_by, approved_by, approved_at, metadata, created_at, updated_at FROM regulatory_rules WHERE legal_source_id = $1', [sourceId]);
    res.json({
      source: source.rows[0],
      affected_rules: rules.rows,
      affected_rule_count: rules.rowCount,
      note: 'تأثير الخدمات/Workflows/Forms يتطلب ربط service_catalog (قيد التنفيذ) — LEGAL_REVIEW_REQUIRED لتأكيد نطاق التعديل',
      recommendation: 'شغّل الاختبارات التنظيمية بعد تفعيل القاعدة وحدّث Workflow definitions المرتبطة',
    });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

export default router;
