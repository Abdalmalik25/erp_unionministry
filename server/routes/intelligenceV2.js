// server/routes/intelligenceV2.js
// Routes for the Enterprise Intelligence Framework
// Exposes: Profession classification, Inspection scoring, Evaluation framework

import express from 'express';
import { pool } from '../middleware/shared.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  classifyProfession,
  findProfessionMatches,
  computeYemenizationStats,
  analyzeProfessionGaps,
  generateCareerPath,
} from '../intelligence/professionEngine.js';
import {
  computeEntityRiskScore,
  computeInspectionScore,
  generateInspectionSchedule,
  computeInspectionAnalytics,
  generateInspectionChecklist,
} from '../intelligence/inspectionEngine.js';
import {
  loadIndicatorFramework,
  evaluateWithFramework,
  computeMaturityScore,
  computeWorkerCompetencyScore,
  generateEvaluationCertificate,
  computeAnnualComplianceScore,
  createIndicatorFramework,
  updateIndicatorFramework,
  deleteIndicatorFramework,
  listIndicatorFrameworks,
  EVALUATION_MODELS,
  MATURITY_LEVELS,
} from '../intelligence/evaluationEngine.js';
import {
  executeWorkflowStep,
  WORKFLOWS,
  getProfessionCrossPortalView,
} from '../intelligence/crossPortalWorkflow.js';
import { auditLog } from '../middleware/shared.js';

const router = express.Router();

// ===================== Profession Intelligence =====================

/**
 * @route   POST /api/v2/professions/classify
 * @desc    Classify a profession using YNSOC + ISCO + Yemenization rules
 */
router.post('/api/v2/professions/classify', requirePermission('occupations:create'), async (req, res) => {
  try {
    const result = classifyProfession(req.body);
    res.json({ success: true, classification: result });
  } catch (err) {
    res.status(500).json({ error: 'Classification failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/professions/:id/classification
 * @desc    Get full classification for an existing profession
 */
router.get('/api/v2/professions/:id/classification', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM professions WHERE id = $1 OR isco_code = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Profession not found' });
    const classification = classifyProfession(r.rows[0]);
    const careerPath = generateCareerPath(r.rows[0]);
    res.json({ success: true, profession: r.rows[0], classification, career_path: careerPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get classification', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/professions/:id/yemenization
 * @desc    Get Yemenization statistics for a profession
 */
router.get('/api/v2/professions/:id/yemenization', requirePermission('compliance:read'), async (req, res) => {
  try {
    const prof = await pool.query('SELECT * FROM professions WHERE id = $1 OR isco_code = $1', [req.params.id]);
    const profData = prof.rows[0] || {};
    const stats = await computeYemenizationStats(req.params.id, { iscoCode: profData.isco_code, sector: profData.sector });
    res.json({ success: true, ...stats, profession: profData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute yemenization', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/professions/gap-analysis
 * @desc    National profession gap analysis
 */
router.get('/api/v2/professions/gap-analysis', requirePermission('compliance:read'), async (req, res) => {
  try {
    const gaps = await analyzeProfessionGaps();
    const summary = {
      total_professions: gaps.length,
      critical_shortage: gaps.filter(g => g.gap_status === 'critical_shortage').length,
      shortage: gaps.filter(g => g.gap_status === 'shortage').length,
      balanced: gaps.filter(g => g.gap_status === 'balanced').length,
      surplus: gaps.filter(g => g.gap_status === 'surplus').length,
    };
    res.json({ success: true, summary, gaps });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze gaps', detail: err.message });
  }
});

/**
 * @route   POST /api/v2/professions/match
 * @desc    Semantic search for similar professions
 */
router.post('/api/v2/professions/match', async (req, res) => {
  try {
    const { query, threshold, limit } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const matches = await findProfessionMatches(query, { threshold, limit });
    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ error: 'Match failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/professions/:id/cross-portal-view
 * @desc    View profession across all 4 portals
 */
router.get('/api/v2/professions/:id/cross-portal-view', requirePermission('occupations:read'), async (req, res) => {
  try {
    const view = await getProfessionCrossPortalView(req.params.id);
    res.json({ success: true, ...view });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cross-portal view', detail: err.message });
  }
});

// ===================== Inspection Intelligence =====================

/**
 * @route   GET /api/v2/inspections/risk-score/:entityId
 * @desc    Compute risk score for an entity
 */
router.get('/api/v2/inspections/risk-score/:entityId', requirePermission('inspections:read'), async (req, res) => {
  try {
    const risk = await computeEntityRiskScore(req.params.entityId);
    res.json({ success: true, ...risk });
  } catch (err) {
    res.status(500).json({ error: 'Risk computation failed', detail: err.message });
  }
});

/**
 * @route   POST /api/v2/inspections/score
 * @desc    Compute inspection score from dimension values
 */
router.post('/api/v2/inspections/score', requirePermission('inspections:create'), async (req, res) => {
  try {
    const result = computeInspectionScore(req.body.dimensions || req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Scoring failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/inspections/schedule
 * @desc    Generate risk-based inspection schedule
 */
router.get('/api/v2/inspections/schedule', requirePermission('inspections:read'), async (req, res) => {
  try {
    const schedule = await generateInspectionSchedule({ limit: parseInt(req.query.limit || '50', 10) });
    res.json({ success: true, ...schedule });
  } catch (err) {
    res.status(500).json({ error: 'Schedule generation failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/inspections/analytics
 * @desc    Comprehensive inspection analytics
 */
router.get('/api/v2/inspections/analytics', requirePermission('inspections:read'), async (req, res) => {
  try {
    const daysBack = parseInt(req.query.days || '365', 10);
    const analytics = await computeInspectionAnalytics({ daysBack });
    res.json({ success: true, ...analytics });
  } catch (err) {
    res.status(500).json({ error: 'Analytics failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/inspections/checklist/:entityId
 * @desc    Generate an inspection checklist for an entity
 */
router.get('/api/v2/inspections/checklist/:entityId', requirePermission('inspections:create'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM organizational_entities WHERE entity_id = $1 OR id::text = $1', [req.params.entityId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Entity not found' });
    const risk = await computeEntityRiskScore(req.params.entityId);
    const checklist = generateInspectionChecklist(r.rows[0], { riskLevel: risk.risk_level, riskScore: risk.risk_score });
    res.json({ success: true, ...checklist, risk });
  } catch (err) {
    res.status(500).json({ error: 'Checklist generation failed', detail: err.message });
  }
});

// ===================== Evaluation Framework =====================

/**
 * @route   GET /api/v2/evaluations/frameworks
 * @desc    List all indicator frameworks (Ministry admin)
 */
router.get('/api/v2/evaluations/frameworks', requirePermission('compliance:read'), async (req, res) => {
  try {
    const frameworks = await listIndicatorFrameworks();
    res.json({ success: true, frameworks, models: EVALUATION_MODELS, levels: MATURITY_LEVELS });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list frameworks', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/evaluations/frameworks/active
 * @desc    Get the active framework for a given model + sector
 */
router.get('/api/v2/evaluations/frameworks/active', async (req, res) => {
  try {
    const { model_type, sector } = req.query;
    const framework = await loadIndicatorFramework({ model_type, sector });
    res.json({ success: true, framework });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load framework', detail: err.message });
  }
});

/**
 * @route   POST /api/v2/evaluations/frameworks
 * @desc    Create a new indicator framework (Ministry admin only)
 */
router.post('/api/v2/evaluations/frameworks', requirePermission('compliance:create'), async (req, res) => {
  try {
    const result = await createIndicatorFramework(req.body);
    if (result.error) return res.status(400).json(result);
    auditLog('create', 'evaluation_framework', req.user?.id || 'system', { framework_id: result.framework_id }).catch(() => {});
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create framework', detail: err.message });
  }
});

/**
 * @route   PUT /api/v2/evaluations/frameworks/:id
 * @desc    Update an indicator framework
 */
router.put('/api/v2/evaluations/frameworks/:id', requirePermission('compliance:edit'), async (req, res) => {
  try {
    const result = await updateIndicatorFramework(req.params.id, req.body);
    if (result.error) return res.status(400).json(result);
    auditLog('update', 'evaluation_framework', req.user?.id || 'system', { framework_id: req.params.id, changes: Object.keys(req.body) }).catch(() => {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update framework', detail: err.message });
  }
});

/**
 * @route   DELETE /api/v2/evaluations/frameworks/:id
 * @desc    Soft-delete a framework
 */
router.delete('/api/v2/evaluations/frameworks/:id', requirePermission('compliance:delete'), async (req, res) => {
  try {
    const result = await deleteIndicatorFramework(req.params.id);
    auditLog('delete', 'evaluation_framework', req.user?.id || 'system', { framework_id: req.params.id }).catch(() => {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete framework', detail: err.message });
  }
});

/**
 * @route   POST /api/v2/evaluations/evaluate
 * @desc    Evaluate an entity using configurable framework
 */
router.post('/api/v2/evaluations/evaluate', requirePermission('compliance:create'), async (req, res) => {
  try {
    const { entity_id, framework_id, model_type, sector, dimensions_data, linked_profession_id, linked_inspection_id } = req.body;
    if (!entity_id) return res.status(400).json({ error: 'entity_id required' });

    let framework = null;
    if (framework_id) {
      const list = await listIndicatorFrameworks();
      framework = list.find(f => String(f.id) === String(framework_id));
    }

    const result = await evaluateWithFramework(entity_id, {
      framework,
      model_type,
      sector,
      dimensions_data,
      linked_profession_id,
      linked_inspection_id,
    });

    auditLog('evaluate', 'entity', req.user?.id || 'system', {
      entity_id,
      overall_score: result.overall_score,
      maturity_level: result.maturity_level,
      framework_id: result.framework?.id,
    }).catch(() => {});

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Evaluation failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/evaluations/worker-competency/:workerId
 * @desc    Get worker competency score
 */
router.get('/api/v2/evaluations/worker-competency/:workerId', requirePermission('workers:read'), async (req, res) => {
  try {
    const result = await computeWorkerCompetencyScore(req.params.workerId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute competency', detail: err.message });
  }
});

/**
 * @route   POST /api/v2/evaluations/certificate
 * @desc    Generate an evaluation certificate
 */
router.post('/api/v2/evaluations/certificate', requirePermission('compliance:create'), async (req, res) => {
  try {
    const certificate = generateEvaluationCertificate(req.body);
    auditLog('issue', 'certificate', req.user?.id || 'system', {
      certificate_number: certificate.certificate_number,
      entity: certificate.entity.id,
    }).catch(() => {});
    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ error: 'Certificate generation failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/evaluations/annual-compliance/:entityId
 * @desc    Compute annual compliance score for an entity
 */
router.get('/api/v2/evaluations/annual-compliance/:entityId', requirePermission('compliance:read'), async (req, res) => {
  try {
    const year = parseInt(req.query.year || String(new Date().getFullYear()), 10);
    const result = await computeAnnualComplianceScore(req.params.entityId, year);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Annual compliance failed', detail: err.message });
  }
});

// ===================== Cross-Portal Workflow =====================

/**
 * @route   GET /api/v2/workflows
 * @desc    List all defined workflows
 */
router.get('/api/v2/workflows', requirePermission('compliance:read'), async (_req, res) => {
  try {
    const workflows = Object.entries(WORKFLOWS).map(([id, w]) => ({
      id,
      name_ar: w.name_ar,
      name_en: w.name_en,
      step_count: w.steps.length,
      steps: w.steps,
    }));
    res.json({ success: true, workflows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list workflows', detail: err.message });
  }
});

/**
 * @route   POST /api/v2/workflows/:workflowId/execute
 * @desc    Execute a workflow step
 */
router.post('/api/v2/workflows/:workflowId/execute', requirePermission('compliance:create'), async (req, res) => {
  try {
    const { stage, ...context } = req.body;
    context.user = req.user;
    const result = await executeWorkflowStep(req.params.workflowId, stage || 1, context);
    auditLog('workflow_step', req.params.workflowId, req.user?.id || 'system', {
      stage,
      action: result.action,
      side_effects: result.side_effects,
    }).catch(() => {});
    res.json({ success: !result.error && !result.skipped, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Workflow execution failed', detail: err.message });
  }
});

/**
 * @route   GET /api/v2/intelligence/dashboard
 * @desc    Combined intelligence overview for the dashboard
 */
router.get('/api/v2/intelligence/dashboard', requirePermission('compliance:read'), async (_req, res) => {
  try {
    const [professionStats, inspectionStats, evaluationStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int as total,
          COUNT(CASE WHEN level = 4 THEN 1 END)::int as detailed,
          COUNT(CASE WHEN hazard_level >= 7 THEN 1 END)::int as hazardous
        FROM professions WHERE deleted_at IS NULL
      `).catch(() => ({ rows: [{ total: 0, detailed: 0, hazardous: 0 }] })),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE deleted_at IS NULL)::int as total,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND compliance_status = 'compliant')::int as compliant,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND compliance_status = 'non_compliant')::int as non_compliant,
          AVG(overall_score) FILTER (WHERE deleted_at IS NULL AND overall_score IS NOT NULL)::numeric(5,1) as avg_score
        FROM inspections
        WHERE created_at > NOW() - INTERVAL '1 year'
      `).catch(() => ({ rows: [{ total: 0, compliant: 0, non_compliant: 0, avg_score: 0 }] })),
      pool.query(`
        SELECT
          COUNT(*)::int as total,
          COUNT(CASE WHEN overall_score >= 75 THEN 1 END)::int as passing,
          AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL)::numeric(5,1) as avg_score
        FROM maturity_assessments WHERE deleted_at IS NULL
      `).catch(() => ({ rows: [{ total: 0, passing: 0, avg_score: 0 }] })),
    ]);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      professions: professionStats.rows[0],
      inspections: inspectionStats.rows[0],
      evaluations: evaluationStats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard query failed', detail: err.message });
  }
});

export default router;
