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
    res.status(500).json({ error: 'Classification failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to get classification', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to compute yemenization', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to analyze gaps', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Match failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to get cross-portal view', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Risk computation failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Scoring failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Schedule generation failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Analytics failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Checklist generation failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to list frameworks', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to load framework', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to create framework', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to update framework', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to delete framework', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Evaluation failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to compute competency', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Certificate generation failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Annual compliance failed', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Failed to list workflows', detail: 'Internal error' });
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
    res.status(500).json({ error: 'Workflow execution failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/intelligence/dashboard
 * @desc    Combined intelligence overview for the dashboard
 */
router.get('/api/v2/intelligence/dashboard', requirePermission('compliance:read'), async (_req, res) => {
  const start = Date.now();
  try {
    // Use optimized CTE-based function (single query replaces 3 parallel queries)
    const r = await pool.query(`SELECT * FROM fn_intelligence_dashboard_fast()`);
    const d = r.rows[0] || {};
    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      took_ms: Date.now() - start,
      optimized: true,
      professions: { total: d.total_professions, detailed: d.detailed_professions, hazardous: d.hazardous_professions },
      inspections: { total: d.total_inspections, compliant: d.compliant_inspections, non_compliant: d.non_compliant_inspections, avg_score: d.avg_inspection_score },
      evaluations: { total: d.total_assessments, passing: d.passing_assessments, avg_score: d.avg_maturity_score },
      entities: { total: d.total_entities, active: d.active_entities },
      violations: { open: d.open_violations },
      alerts: { unresolved: d.pending_alerts },
      service_requests: { pending: d.pending_service_requests },
    });
  } catch (err) {
    // Fallback to original 3 parallel queries if function not yet deployed
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
    } catch (err2) {
      res.status(500).json({ error: 'Dashboard query failed', detail: err2.message });
    }
  }
});

// ===================== Analytical Report Endpoints =====================

/**
 * @route   GET /api/v2/reports/executive-summary
 * @desc    National executive summary (optimized single-pass function)
 */
router.get('/api/v2/reports/executive-summary', requirePermission('compliance:read'), async (_req, res) => {
  const start = Date.now();
  try {
    const r = await pool.query(`SELECT * FROM fn_national_executive_summary()`);
    res.json({
      success: true,
      data: r.rows,
      count: r.rows.length,
      took_ms: Date.now() - start,
      optimized: true,
    });
  } catch (err) {
    res.status(500).json({ error: 'Executive summary failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/entity-drilldown/:entityId
 * @desc    Deep drill-down report for a single entity
 */
router.get('/api/v2/reports/entity-drilldown/:entityId', requirePermission('compliance:read'), async (req, res) => {
  try {
    const r = await pool.query(`SELECT fn_entity_drilldown($1) AS report`, [req.params.entityId]);
    const report = r.rows[0]?.report;
    if (!report || report.error) return res.status(404).json({ error: 'Entity not found' });
    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ error: 'Drill-down failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/comparative-sectors
 * @desc    Comparative sector ranking report
 */
router.get('/api/v2/reports/comparative-sectors', requirePermission('compliance:read'), async (_req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM fn_comparative_sector_report()`);
    res.json({ success: true, sectors: r.rows, count: r.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Sector report failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/sector-analytics
 * @desc    Sector deep analytics (sector x governorate matrix)
 */
router.get('/api/v2/reports/sector-analytics', requirePermission('compliance:read'), async (_req, res) => {
  const start = Date.now();
  try {
    const r = await pool.query(`SELECT sector AS sector, entities AS entity_count, active_entities, compliant_entities, members AS total_workers, compliance_rate, high_risk_entities FROM fn_sector_governorate_matrix() ORDER BY compliance_rate DESC NULLS LAST`);
    res.json({ success: true, sectors: r.rows, took_ms: Date.now() - start, source: 'fn_sector_governorate_matrix' });
  } catch (err) {
    res.status(500).json({ error: 'Sector analytics failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/governorate-intelligence
 * @desc    Governorate intelligence (per-governorate composite risk)
 */
router.get('/api/v2/reports/governorate-intelligence', requirePermission('compliance:read'), async (_req, res) => {
  const start = Date.now();
  try {
    const r = await pool.query(`SELECT entity_id AS linked_entity_id, entity_name, governorate, sector, status AS entity_status, compliance_status, risk_level, open_violations, critical_violations, pending_alerts, expiring_documents, expired_documents, expiring_licenses, low_assessments, composite_risk_score, risk_band FROM fn_composite_risk_matrix() ORDER BY composite_risk_score DESC`);
    res.json({ success: true, governorates: r.rows, took_ms: Date.now() - start, source: 'fn_composite_risk_matrix' });
  } catch (err) {
    res.status(500).json({ error: 'Governorate intelligence failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/cross-portal-performance
 * @desc    Cross-portal performance with composite health score
 */
router.get('/api/v2/reports/cross-portal-performance', requirePermission('compliance:read'), async (req, res) => {
  const start = Date.now();
  const { governorate, sector, risk_band, limit = 50 } = req.query;
  try {
    const params = [];
    let where = '1=1';
    let idx = 1;
    if (governorate) { where += ` AND governorate ILIKE $${idx++}`; params.push(`%${governorate}%`); }
    if (sector) { where += ` AND sector = $${idx++}`; params.push(sector); }
    if (risk_band) { where += ` AND risk_band = $${idx++}`; params.push(risk_band); }
    const r = await pool.query(
      `SELECT entity_id, entity_name, governorate, sector, status AS entity_status, compliance_status, risk_level, open_violations, critical_violations, pending_alerts, expiring_documents, expired_documents, expiring_licenses, low_assessments, composite_risk_score AS composite_health_score, risk_band FROM fn_composite_risk_matrix() WHERE ${where} ORDER BY composite_risk_score DESC LIMIT $${idx}`,
      [...params, parseInt(limit, 10)]
    );
    res.json({ success: true, entities: r.rows, took_ms: Date.now() - start, source: 'fn_composite_risk_matrix' });
  } catch (err) {
    res.status(500).json({ error: 'Cross-portal performance failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/evaluation-analytics
 * @desc    License & certificate summary analytics
 */
router.get('/api/v2/reports/evaluation-analytics', requirePermission('compliance:read'), async (_req, res) => {
  const start = Date.now();
  try {
    const r = await pool.query(`SELECT * FROM fn_license_document_summary()`);
    res.json({ success: true, evaluations: r.rows, took_ms: Date.now() - start, source: 'fn_license_document_summary' });
  } catch (err) {
    res.status(500).json({ error: 'Evaluation analytics failed', detail: 'Internal error' });
  }
});

/**
 * @route   POST /api/v2/reports/refresh-analytics
 * @desc    Manually trigger materialized view refresh (service_role / ministry_admin)
 */
router.post('/api/v2/reports/refresh-analytics', requirePermission('compliance:edit'), async (_req, res) => {
  try {
    await pool.query(`SELECT fn_refresh_analytics_views()`);
    res.json({ success: true, message: 'Analytics views refreshed' });
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed', detail: 'Internal error' });
  }
});

/**
 * @route   GET /api/v2/reports/dispatch-analytics
 * @desc    Worker dispatch analytics
 */
router.get('/api/v2/reports/dispatch-analytics', requirePermission('compliance:read'), async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COALESCE(status, 'غير محدد') AS status,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int AS last_30d,
        COUNT(*) FILTER (WHERE worker_member_id IS NOT NULL)::int AS total_workers
      FROM worker_dispatches
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY total DESC
    `);
    res.json({ success: true, dispatches: r.rows });
  } catch (err) {
    res.status(500).json({ error: 'Dispatch analytics failed', detail: 'Internal error' });
  }
});

export default router;
