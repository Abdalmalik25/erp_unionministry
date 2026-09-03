// server/routes/workflow.js — Universal Workflow + Case + SLA + Correspondence
import express from 'express';
import { pool, paginate } from '../middleware/shared.js';
import { requirePermission } from '../middleware/rbac.js';
import { invalidateCache } from '../middleware/cache.js';

const router = express.Router();

// ========== Workflow Definitions ==========
router.get('/api/v1/workflows/definitions', async (_req, res) => {
  try {
    const r = await pool.query('SELECT id, workflow_key, name_ar, name_en, entity_type, version, is_active, definition, created_at, updated_at FROM workflow_definitions ORDER BY workflow_key, version DESC');
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ========== Workflow Instances ==========
router.post('/api/v1/workflows/instances', requirePermission('admin:system'), async (req, res) => {
  try {
    const { workflow_key, entity_type, entity_id, assigned_to, metadata } = req.body;
    if (!workflow_key || !entity_type || !entity_id) return res.status(400).json({ error: 'workflow_key, entity_type, entity_id مطلوبة' });
    const def = await pool.query('SELECT id, workflow_key, name_ar, name_en, entity_type, version, is_active, definition, created_at, updated_at FROM workflow_definitions WHERE workflow_key = $1 AND is_active = true ORDER BY version DESC LIMIT 1', [workflow_key]);
    if (!def.rows.length) return res.status(404).json({ error: 'تعريف Workflow غير موجود' });
    const initialState = (def.rows[0].definition?.states?.[0]) || 'draft';
    if (typeof initialState === 'object') initialState = initialState.state || 'draft';
    const r = await pool.query(
      `INSERT INTO workflow_instances (workflow_key, workflow_version, entity_type, entity_id, current_state, assigned_to, created_by, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [workflow_key, def.rows[0].version, entity_type, entity_id, typeof initialState === 'string' ? initialState : 'draft', assigned_to || null, req.user?.id || null, JSON.stringify(metadata || {})]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.get('/api/v1/workflows/instances/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, workflow_key, workflow_version, entity_type, entity_id, current_state, previous_state, assigned_to, assigned_office_id, started_at, completed_at, due_at, metadata, created_by, updated_at FROM workflow_instances WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'غير موجود' });
    const history = await pool.query('SELECT id, workflow_instance_id, from_state, to_state, action, actor_id, actor_role, comment, legal_basis, rule_evaluation_id, created_at FROM workflow_transitions_log WHERE workflow_instance_id = $1 ORDER BY created_at ASC', [req.params.id]);
    res.json({ ...r.rows[0], history: history.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/workflows/instances/:id/transition', requirePermission('write:workflows'), async (req, res) => {
  try {
    const { action, to_state, comment } = req.body;
    const inst = await pool.query('SELECT id, workflow_key, workflow_version, entity_type, entity_id, current_state, previous_state, assigned_to, assigned_office_id, started_at, completed_at, due_at, metadata, created_by, updated_at FROM workflow_instances WHERE id = $1', [req.params.id]);
    if (!inst.rows.length) return res.status(404).json({ error: 'غير موجود' });
    const current = inst.rows[0].current_state;
    const def = await pool.query('SELECT definition FROM workflow_definitions WHERE workflow_key = $1 ORDER BY version DESC LIMIT 1', [inst.rows[0].workflow_key]);
    const transitions = def.rows[0]?.definition?.transitions || [];
    const allowed = transitions.find(t => t.from === current && (t.to === to_state || t.action === action));
    if (!allowed && transitions.length) return res.status(400).json({ error: `انتقال غير مسموح من ${current} إلى ${to_state || action}`, allowed: transitions.filter(t => t.from === current) });
    const nextState = to_state || allowed?.to || current;
    const updated = await pool.query(
      `UPDATE workflow_instances SET current_state = $1, previous_state = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [nextState, current, req.params.id]
    );
    await pool.query(
      `INSERT INTO workflow_transitions_log (workflow_instance_id, from_state, to_state, action, actor_id, actor_role, comment) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.params.id, current, nextState, action || 'transition', req.user?.id || null, req.user?.role || null, comment || null]
    );
    res.json(updated.rows[0]);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// ========== Cases ==========
router.get('/api/v1/cases', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const { case_type, status, priority, sla_status, search } = req.query;
    const conds = ['deleted_at IS NULL']; const params = []; let i = 1;
    if (case_type) { conds.push(`case_type = $${i++}`); params.push(case_type); }
    if (status) { conds.push(`status = $${i++}`); params.push(status); }
    if (priority) { conds.push(`priority = $${i++}`); params.push(priority); }
    if (sla_status) { conds.push(`sla_status = $${i++}`); params.push(sla_status); }
    if (search) { conds.push(`(case_number ILIKE $${i} OR subject ILIKE $${i})`); params.push(`%${search}%`); i++; }
    // jurisdiction scoping for non-super users
    if (req.user?.governorate && !['super_admin','ministry_admin'].includes(req.user.role)) {
      conds.push(`(jurisdiction_governorate IS NULL OR jurisdiction_governorate = $${i++})`); params.push(req.user.governorate);
    }
    const where = 'WHERE ' + conds.join(' AND ');
    const total = await pool.query(`SELECT COUNT(*)::int as c FROM cases ${where}`, params);
    const rows = await pool.query(`SELECT id, case_number, case_type, subject, description, priority, status, jurisdiction_governorate, jurisdiction_directorate, office_id, assigned_to, assigned_office_id, legal_basis, legal_source_id, workflow_instance_id, sla_deadline, sla_status, parties, linked_entity_id, linked_entity_type, created_by, created_at, updated_at, deleted_at FROM cases ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`, [...params, limit, offset]);
    res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/cases', requirePermission('write:workflows'), async (req, res) => {
  try {
    const { case_type, subject, description, priority, jurisdiction_governorate, jurisdiction_directorate, office_id, parties, linked_entity_id, linked_entity_type } = req.body;
    if (!case_type || !subject) return res.status(400).json({ error: 'case_type و subject مطلوبان' });
    const case_number = `CASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
    // compute SLA
    const sla = await pool.query(`SELECT id, policy_key, name_ar, applies_to, duration_days, escalation_after_days, escalation_to_role, pause_on, is_active, created_at FROM sla_policies WHERE applies_to = $1 AND is_active = true LIMIT 1`, [case_type]);
    let sla_deadline = null;
    if (sla.rows.length) sla_deadline = new Date(Date.now() + sla.rows[0].duration_days * 86400000).toISOString();
    const r = await pool.query(
      `INSERT INTO cases (case_number, case_type, subject, description, priority, jurisdiction_governorate, jurisdiction_directorate, office_id, parties, linked_entity_id, linked_entity_type, sla_deadline, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [case_number, case_type, subject, description, priority || 'medium', jurisdiction_governorate || req.user?.governorate || null, jurisdiction_directorate || null, office_id || null, JSON.stringify(parties || []), linked_entity_id || null, linked_entity_type || null, sla_deadline, req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.get('/api/v1/cases/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, case_number, case_type, subject, description, priority, status, jurisdiction_governorate, jurisdiction_directorate, office_id, assigned_to, assigned_office_id, legal_basis, legal_source_id, workflow_instance_id, sla_deadline, sla_status, parties, linked_entity_id, linked_entity_type, created_by, created_at, updated_at, deleted_at FROM cases WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'القضية غير موجودة' });
    const [actions, docs, hearings] = await Promise.all([
      pool.query('SELECT id, case_id, action_type, description, actor_id, actor_role, due_date, completed_at, metadata, created_at FROM case_actions WHERE case_id = $1 ORDER BY created_at ASC', [req.params.id]),
      pool.query('SELECT id, case_id, document_id, file_url, file_hash, uploaded_by, created_at FROM case_documents WHERE case_id = $1', [req.params.id]),
      pool.query('SELECT id, case_id, hearing_date, location, parties_present, outcome, next_hearing_date, created_by, created_at FROM case_hearings WHERE case_id = $1 ORDER BY hearing_date ASC', [req.params.id]),
    ]);
    res.json({ ...r.rows[0], actions: actions.rows, documents: docs.rows, hearings: hearings.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/cases/:id/actions', requirePermission('write:workflows'), async (req, res) => {
  try {
    const { action_type, description, due_date } = req.body;
    const r = await pool.query(
      `INSERT INTO case_actions (case_id, action_type, description, actor_id, actor_role, due_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, action_type, description, req.user?.id || null, req.user?.role || null, due_date || null]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// SLA overview
router.get('/api/v1/sla/overview', async (_req, res) => {
  try {
    const r = await pool.query(`SELECT sla_status, COUNT(*)::int as count FROM cases WHERE deleted_at IS NULL GROUP BY sla_status`);
    const overdue = await pool.query(`SELECT id, case_number, case_type, subject, description, priority, status, sla_deadline, sla_status, created_at FROM cases WHERE sla_deadline < NOW() AND status NOT IN ('closed','resolved') AND deleted_at IS NULL LIMIT 20`);
    res.json({ by_status: r.rows, overdue: overdue.rows });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

// Correspondence
router.get('/api/v1/correspondence', async (req, res) => {
  try {
    const { limit, page, offset } = paginate(req);
    const rows = await pool.query('SELECT id, reference_number, direction, subject, body, sender_entity_type, sender_entity_id, recipient_entity_type, recipient_entity_id, case_id, linked_entity_id, status, attachments, created_by, created_at FROM correspondences ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const total = await pool.query('SELECT COUNT(*)::int as c FROM correspondences');
    res.json({ data: rows.rows, total: total.rows[0].c, page, limit });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

router.post('/api/v1/correspondence', requirePermission('write:workflows'), async (req, res) => {
  try {
    const { direction, subject, body, sender_entity_type, sender_entity_id, recipient_entity_type, recipient_entity_id, case_id } = req.body;
    if (!subject) return res.status(400).json({ error: 'الموضوع مطلوب' });
    const ref = `CORR-${Date.now().toString(36).toUpperCase()}`;
    const r = await pool.query(
      `INSERT INTO correspondences (reference_number, direction, subject, body, sender_entity_type, sender_entity_id, recipient_entity_type, recipient_entity_id, case_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [ref, direction || 'outgoing', subject, body, sender_entity_type, sender_entity_id, recipient_entity_type, recipient_entity_id, case_id || null, req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
    invalidateCache('dashboard');
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم', code: 'INTERNAL_ERROR' }); }
});

export default router;
