// server/routes/contracts.js — Structured Employment Contract Engine + OSH + Evidence
import express from 'express';
import { pool, paginate } from '../middleware/shared.js';

const router = express.Router();

// ========== Contracts ==========
router.get('/api/v1/contracts', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { status, establishment_id, worker_person_id, search } = req.query;
    const conds = ['deleted_at IS NULL']; const params = []; let i = 1;
    if (status) { conds.push(`status = $${i++}`); params.push(status); }
    if (establishment_id) { conds.push(`establishment_id = $${i++}`); params.push(establishment_id); }
    if (worker_person_id) { conds.push(`worker_person_id = $${i++}`); params.push(worker_person_id); }
    if (search) { conds.push(`contract_number ILIKE $${i++}`); params.push(`%${search}%`); }
    const where = 'WHERE ' + conds.join(' AND ');
    const total = await pool.query(`SELECT COUNT(*)::int as c FROM employment_contracts ${where}`, params);
    const rows = await pool.query(`SELECT * FROM employment_contracts ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]);
    // enrich with person/establishment names
    res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.get('/api/v1/contracts/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM employment_contracts WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'العقد غير موجود' });
    const evidence = await pool.query('SELECT * FROM evidence_records WHERE contract_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...r.rows[0], evidence: evidence.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/contracts', async (req, res) => {
  try {
    const { worker_person_id, establishment_id, branch_id, occupation_id, contract_type_id, start_date, end_date, wage_amount, wage_currency, working_hours_per_day, leave_days_annual, benefits } = req.body;
    if (!worker_person_id || !establishment_id || !start_date || !wage_amount) return res.status(400).json({ error: 'worker_person_id, establishment_id, start_date, wage_amount مطلوبة' });
    const contract_number = `CTR-${Date.now().toString(36).toUpperCase()}`;
    // Legal validation via rule engine (call internal)
    let legalResult = { passed: true, failed: [], note: 'LEGAl_VALIDATION_PENDING_HUMAN_REVIEW_IF_BLOCKED' };
    try {
      const payload = { worker: { person_id: worker_person_id }, contract: req.body, establishment: { id: establishment_id } };
      // inline evaluate contract rules
      const rules = await pool.query(`SELECT * FROM regulatory_rules WHERE status='active' AND 'contract' = ANY(applies_to) ORDER BY priority`);
      for (const rule of rules.rows) {
        const cond = rule.condition;
        const get = (obj, path) => path.split('.').reduce((o,k)=>o?.[k], obj);
        let passed = true;
        if (cond.field) {
          const v = get(payload, cond.field);
          if (cond.operator === 'is_null') passed = !(v == null);
          else if (cond.operator === 'lt') passed = !(v < cond.value);
        }
        if (!passed) legalResult.failed.push(rule.rule_code);
      }
      legalResult.passed = legalResult.failed.length === 0;
    } catch {}
    const r = await pool.query(
      `INSERT INTO employment_contracts (contract_number, worker_person_id, establishment_id, branch_id, occupation_id, contract_type_id, start_date, end_date, wage_amount, wage_currency, working_hours_per_day, leave_days_annual, benefits, legal_validation_result, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft',$15) RETURNING *`,
      [contract_number, worker_person_id, establishment_id, branch_id || null, occupation_id || null, contract_type_id || null, start_date, end_date || null, wage_amount, wage_currency || 'YER', working_hours_per_day || null, leave_days_annual || null, JSON.stringify(benefits || []), JSON.stringify(legalResult), req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.put('/api/v1/contracts/:id/approve', async (req, res) => {
  try {
    const r = await pool.query(`UPDATE employment_contracts SET status='active', approved_by=$1, approved_at=NOW(), updated_at=NOW() WHERE id=$2 AND status='draft' RETURNING *`, [req.user?.id || null, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'العقد غير موجود أو غير قابل للاعتماد' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ========== OSH ==========
router.get('/api/v1/osh/hazards', async (req, res) => {
  try {
    const { establishment_id } = req.query;
    const cond = establishment_id ? 'WHERE establishment_id = $1' : '';
    const params = establishment_id ? [establishment_id] : [];
    const r = await pool.query(`SELECT * FROM osh_hazards ${cond} ORDER BY risk_level DESC, created_at DESC`, params);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/osh/hazards', async (req, res) => {
  try {
    const { establishment_id, hazard_type, hazard_category, description, risk_level } = req.body;
    if (!establishment_id || !hazard_type) return res.status(400).json({ error: 'establishment_id و hazard_type مطلوبان' });
    const r = await pool.query(`INSERT INTO osh_hazards (establishment_id, hazard_type, hazard_category, description, risk_level, assessed_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [establishment_id, hazard_type, hazard_category, description, risk_level || 'medium', req.user?.id || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ========== Evidence ==========
router.post('/api/v1/evidence', async (req, res) => {
  try {
    const { case_id, contract_id, source_type, file_url, file_hash, file_size, mime_type } = req.body;
    if (!source_type || !file_url || !file_hash) return res.status(400).json({ error: 'source_type, file_url, file_hash مطلوبة' });
    const num = `EVD-${Date.now().toString(36).toUpperCase()}`;
    const r = await pool.query(
      `INSERT INTO evidence_records (evidence_number, case_id, contract_id, source_type, file_url, file_hash, file_size, mime_type, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [num, case_id || null, contract_id || null, source_type, file_url, file_hash, file_size || null, mime_type || null, req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.get('/api/v1/evidence', async (req, res) => {
  try {
    const { case_id, contract_id } = req.query;
    const conds = []; const params = []; let i = 1;
    if (case_id) { conds.push(`case_id = $${i++}`); params.push(case_id); }
    if (contract_id) { conds.push(`contract_id = $${i++}`); params.push(contract_id); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const r = await pool.query(`SELECT * FROM evidence_records ${where} ORDER BY created_at DESC LIMIT 50`, params);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

export default router;
