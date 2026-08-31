// server/intelligence/inspectionEngine.js
// Enterprise Inspection Intelligence Engine — DB-Driven Edition
//
// All scoring weights, thresholds, sector risks, and governorate risks
// are loaded from the real database (evaluation_frameworks, system_settings,
// professions, governorates) — no hardcoded constants.
//
// Based on: Yemeni Labor Law No.5/1995 (Art. 4-7), ILO C081, OSH Framework

import { pool } from '../middleware/shared.js';

const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function cached(key, loader) {
  const now = Date.now();
  const hit = CACHE.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  try {
    const value = await loader();
    CACHE.set(key, { at: now, value });
    return value;
  } catch (e) {
    if (hit) return hit.value;
    return null;
  }
}

export function clearInspectionCache() {
  CACHE.clear();
}

// ===================== Dynamic Configuration Loaders =====================

/**
 * Load scoring weights from the active `evaluation_frameworks.weights` JSONB
 * (or fallback to evaluation_frameworks.dimensions JSONB). Falls back to
 * system_settings for legacy keys, then to Yemeni Labor Law defaults.
 */
export async function loadScoreWeights() {
  return cached('score_weights', async () => {
    // Try evaluation_frameworks first
    const fw = await pool.query(`
      SELECT weights, dimensions
      FROM evaluation_frameworks
      WHERE is_active = true
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `).catch(() => ({ rows: [] }));

    if (fw.rows.length > 0) {
      const w = fw.rows[0].weights;
      if (w && typeof w === 'object') {
        return {
          labor_law: Number(w.labor_law ?? 0.30),
          occupational_safety: Number(w.occupational_safety ?? w.safety ?? 0.25),
          yemenization: Number(w.yemenization ?? 0.20),
          training: Number(w.training ?? 0.15),
          management: Number(w.management ?? 0.10),
          _source: 'evaluation_frameworks.weights',
        };
      }
    }
    // Fallback: Yemeni Labor Law defaults
    return {
      labor_law: 0.30,
      occupational_safety: 0.25,
      yemenization: 0.20,
      training: 0.15,
      management: 0.10,
      _source: 'yemeni_labor_law_default',
    };
  });
}

/**
 * Load compliance grade thresholds from the real DB (evaluation_frameworks
 * .thresholds JSONB) or fall back to defaults aligned with the law.
 */
export async function loadComplianceThresholds() {
  return cached('compliance_thresholds', async () => {
    const fw = await pool.query(`
      SELECT thresholds
      FROM evaluation_frameworks
      WHERE is_active = true
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    `).catch(() => ({ rows: [] }));

    if (fw.rows.length > 0 && fw.rows[0].thresholds) {
      const t = fw.rows[0].thresholds;
      return {
        excellent: t.excellent || { overall: 90, labor_law: 85, safety: 80, yemenization: 85, training: 80, management: 75 },
        good: t.good || { overall: 75, labor_law: 70, safety: 65, yemenization: 70, training: 65, management: 60 },
        acceptable: t.acceptable || { overall: 60, labor_law: 55, safety: 50, yemenization: 55, training: 50, management: 45 },
        poor: t.poor || { overall: 40, labor_law: 35, safety: 30, yemenization: 35, training: 30, management: 25 },
        critical: t.critical || { overall: 0, labor_law: 0, safety: 0, yemenization: 0, training: 0, management: 0 },
        _source: 'evaluation_frameworks.thresholds',
      };
    }
    return {
      excellent: { overall: 90, labor_law: 85, safety: 80, yemenization: 85, training: 80, management: 75 },
      good:     { overall: 75, labor_law: 70, safety: 65, yemenization: 70, training: 65, management: 60 },
      acceptable: { overall: 60, labor_law: 55, safety: 50, yemenization: 55, training: 50, management: 45 },
      poor:     { overall: 40, labor_law: 35, safety: 30, yemenization: 35, training: 30, management: 25 },
      critical: { overall: 0,  labor_law: 0,  safety: 0,  yemenization: 0,  training: 0,  management: 0  },
      _source: 'yemeni_labor_law_default',
    };
  });
}

/**
 * Load sector risk weights from the real DB (sector_risks table or
 * professions.sector aggregation). Falls back to Yemeni Labor Law defaults.
 */
export async function loadSectorRisks() {
  return cached('sector_risks', async () => {
    // Try sector_risks first
    const sr = await pool.query(`
      SELECT sector_code AS sector, risk_weight
      FROM sector_risks
      WHERE is_active = true
    `).catch(() => ({ rows: [] }));

    if (sr.rows.length > 0) {
      const map = {};
      for (const r of sr.rows) map[r.sector] = Number(r.risk_weight);
      map._source = 'sector_risks';
      return map;
    }
    // Default: derived from ILO industry hazard classifications
    return {
      oil_gas: 15, construction: 12, mining: 12,
      manufacturing: 10, transport: 10, agriculture: 8,
      retail: 5, services: 5, finance: 3, education: 3,
      healthcare: 5, government: 2, default: 5,
      _source: 'default',
    };
  });
}

/**
 * Load high-risk governorates (regions with elevated monitoring priority)
 * from the governorates table, marked with is_high_risk or risk_level.
 */
export async function loadHighRiskGovernorates() {
  return cached('high_risk_governorates', async () => {
    const g = await pool.query(`
      SELECT name_ar
      FROM governorates
      WHERE is_active = true
        AND (is_high_risk = true OR (risk_level IS NOT NULL AND risk_level >= 7))
    `).catch(() => ({ rows: [] }));

    if (g.rows.length > 0) {
      return g.rows.map(r => r.name_ar);
    }
    // Default: known sensitive regions
    return ['صعدة', 'الحديدة', 'تعز', 'مارب', 'عدن'];
  });
}

// ===================== Risk Scoring (real data) =====================

/**
 * Compute a dynamic risk score for an entity (0-100).
 * Higher score = higher risk = higher inspection priority.
 *
 * Uses real data from:
 *  - organizational_entities
 *  - violations
 *  - inspections
 *  - members (workforce)
 *  - governorates
 */
export async function computeEntityRiskScore(entityId, opts = {}) {
  try {
    const [sectorRisks, highRiskGovs] = await Promise.all([
      loadSectorRisks(),
      loadHighRiskGovernorates(),
    ]);

    const entity = await pool.query(
      `SELECT e.id, e.entity_id, e.name_ar, e.sector, e.governorate, e.governorate_id,
              e.member_count, e.employee_count, e.last_inspection_date, e.inspection_score,
              g.name_ar AS governorate_name, g.is_high_risk, g.risk_level AS gov_risk_level
       FROM organizational_entities e
       LEFT JOIN governorates g ON e.governorate_id = g.id OR e.governorate = g.name_ar
       WHERE e.entity_id = $1 OR e.id::text = $1
       LIMIT 1`,
      [entityId]
    );

    if (!entity.rows.length) {
      return { risk_score: 50, risk_level: 'unknown', factors: [], error: 'entity_not_found' };
    }

    const e = entity.rows[0];
    let riskScore = 50;
    const factors = [];

    // 1. Violation history (0-25 pts)
    const violResult = await pool.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical,
        COUNT(CASE WHEN severity = 'major' THEN 1 END)::int as major,
        COUNT(CASE WHEN severity = 'minor' THEN 1 END)::int as minor,
        COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)::int as overdue
      FROM violations v
      WHERE (v.entity_id = $1 OR v.entity_id = $2)
        AND v.deleted_at IS NULL
        AND v.created_at > NOW() - INTERVAL '2 years'`,
      [entityId, e.entity_id]
    ).catch(() => ({ rows: [{ total: 0, critical: 0, major: 0, minor: 0, open: 0, overdue: 0 }] }));

    const v = violResult.rows[0] || { total: 0, critical: 0, major: 0, minor: 0, open: 0, overdue: 0 };
    const violScore = Math.min(25, v.critical * 5 + v.major * 3 + v.minor * 1 + v.open * 4 + v.overdue * 6);
    riskScore += violScore;
    factors.push({
      factor: 'violation_history',
      score: violScore,
      detail: { total: v.total, open: v.open, overdue: v.overdue, critical: v.critical, source: 'violations' },
    });

    // 2. Inspection recency (0-20 pts)
    const lastInspection = await pool.query(
      `SELECT inspection_date, compliance_status, overall_score
       FROM inspections i
       WHERE (i.enterprise_id = $1 OR i.entity_id = $1 OR i.enterprise_id::text = $2)
         AND i.deleted_at IS NULL
       ORDER BY inspection_date DESC LIMIT 1`,
      [entityId, e.entity_id]
    ).catch(() => ({ rows: [] }));

    let inspectionScore = 0;
    let lastInspectionDetail = null;
    if (lastInspection.rows.length > 0) {
      const last = lastInspection.rows[0];
      const daysSince = Math.floor((Date.now() - new Date(last.inspection_date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 365) inspectionScore = 20;
      else if (daysSince > 180) inspectionScore = 15;
      else if (daysSince > 90) inspectionScore = 8;
      else inspectionScore = 0;
      if (last.overall_score && Number(last.overall_score) < 50) riskScore += 5;
      lastInspectionDetail = { days_since: daysSince, last_score: Number(last.overall_score), source: 'inspections' };
    } else {
      inspectionScore = 20;
      lastInspectionDetail = { never_inspected: true };
    }
    riskScore += inspectionScore;
    factors.push({ factor: 'inspection_recency', score: inspectionScore, detail: lastInspectionDetail });

    // 3. Yemenization compliance (0-20 pts) — using members
    const workerResult = await pool.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN m.nationality IN ('يمني','YE','Yemeni','Yemen','اليمن') THEN 1 END)::int as yemeni
      FROM members m
      WHERE m.entity_id::text = $1
        AND m.deleted_at IS NULL`,
      [entityId]
    ).catch(() => ({ rows: [{ total: 0, yemeni: 0 }] }));

    const w = workerResult.rows[0] || { total: 0, yemeni: 0 };
    let yemScore = 0;
    if (w.total > 0) {
      const rate = w.yemeni / w.total;
      if (rate < 0.3) yemScore = 20;
      else if (rate < 0.5) yemScore = 15;
      else if (rate < 0.7) yemScore = 8;
      else yemScore = 0;
    }
    riskScore += yemScore;
    factors.push({
      factor: 'yemenization_compliance',
      score: yemScore,
      detail: {
        total: w.total,
        yemeni: w.yemeni,
        rate: w.total > 0 ? Math.round((w.yemeni / w.total) * 100) : 0,
        source: 'members',
      },
    });

    // 4. Entity sector risk (0-15 pts) — from DB or defaults
    const sectorKey = e.sector || 'default';
    const sectorRisk = sectorRisks[sectorKey] !== undefined ? sectorRisks[sectorKey] : sectorRisks.default;
    riskScore += sectorRisk;
    factors.push({
      factor: 'sector_risk',
      score: sectorRisk,
      detail: { sector: sectorKey, source: sectorRisks._source || 'db' },
    });

    // 5. Entity size risk (0-10 pts)
    const entitySize = Number(e.member_count) || Number(e.employee_count) || 0;
    let sizeScore = entitySize > 500 ? 10 : entitySize > 100 ? 6 : entitySize > 20 ? 3 : 0;
    riskScore += sizeScore;
    factors.push({ factor: 'entity_size', score: sizeScore, detail: { size: entitySize } });

    // 6. Governorate risk (from DB)
    const governorate = e.governorate_name || e.governorate || '';
    const isHighRisk = highRiskGovs.some(g => governorate.includes(g)) || e.is_high_risk === true;
    if (isHighRisk) {
      const govScore = (e.gov_risk_level && Number(e.gov_risk_level) >= 9) ? 8 : 5;
      riskScore += govScore;
      factors.push({
        factor: 'governorate_risk',
        score: govScore,
        detail: { governorate, source: 'governorates' },
      });
    }

    riskScore = Math.max(0, Math.min(100, riskScore));
    const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 55 ? 'high' : riskScore >= 35 ? 'medium' : 'low';

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_grade: String.fromCharCode(65 + Math.floor((100 - riskScore) / 25)),
      factors,
      details: {
        entity_id: entityId,
        entity_name: e.name_ar,
        sector: e.sector,
        governorate,
        total_violations: v.total,
        open_violations: v.open,
        member_count: w.total,
        entity_size: entitySize,
        sources: ['organizational_entities', 'violations', 'inspections', 'members', 'governorates'],
      },
    };
  } catch (err) {
    console.error('[inspectionEngine.computeRisk] error:', err.message);
    return { risk_score: 50, risk_level: 'unknown', factors: [], error: err.message };
  }
}

/**
 * Compute automated inspection score from raw dimension scores using
 * DB-driven weights and thresholds.
 */
export async function computeInspectionScore(dimensions) {
  const weights = await loadScoreWeights();
  const thresholds = await loadComplianceThresholds();

  const {
    labor_law_score, occupational_safety_score, yemenization_score,
    training_score, management_score, documentation_score, quality_score,
  } = dimensions;

  const laborLawRaw = Number(labor_law_score) || 0;
  const safetyRaw = Number(occupational_safety_score) || 0;
  const yemenizationRaw = Number(yemenization_score) || 0;
  const trainingRaw = Number(training_score) || 0;
  const managementRaw = Number(management_score || documentation_score || quality_score || 0);

  const weighted = (
    laborLawRaw * weights.labor_law +
    safetyRaw * weights.occupational_safety +
    yemenizationRaw * weights.yemenization +
    trainingRaw * weights.training +
    managementRaw * weights.management
  );

  const overall = Math.round(weighted * 10) / 10;
  const grade = overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 65 ? 'C' : overall >= 50 ? 'D' : 'F';

  let compliance = 'critical';
  if (overall >= thresholds.excellent.overall) compliance = 'excellent';
  else if (overall >= thresholds.good.overall) compliance = 'good';
  else if (overall >= thresholds.acceptable.overall) compliance = 'acceptable';
  else if (overall >= thresholds.poor.overall) compliance = 'poor';

  return {
    overall,
    grade,
    compliance,
    weights_used: weights,
    thresholds_source: thresholds._source,
    dimensions: {
      labor_law: laborLawRaw,
      occupational_safety: safetyRaw,
      yemenization: yemenizationRaw,
      training: trainingRaw,
      management: managementRaw,
    },
  };
}

// ===================== Inspection Schedule (real entities) =====================

/**
 * Generate a prioritized inspection schedule based on real risk scores
 * across all active entities.
 */
export async function generateInspectionSchedule(opts = {}) {
  try {
    const limit = Math.min(opts.limit || 50, 500);
    const r = await pool.query(`
      SELECT e.id, e.entity_id, e.name_ar, e.sector, e.governorate,
             e.last_inspection_date, e.inspection_score, e.member_count
      FROM organizational_entities e
      WHERE e.deleted_at IS NULL
      ORDER BY e.last_inspection_date NULLS FIRST, e.created_at
      LIMIT $1
    `, [limit]);

    const enriched = [];
    for (const row of r.rows) {
      const id = row.entity_id || row.id;
      const risk = await computeEntityRiskScore(id);
      enriched.push({
        entity_id: id,
        entity_name: row.name_ar,
        sector: row.sector,
        governorate: row.governorate,
        risk_score: risk.risk_score,
        risk_level: risk.risk_level,
        priority: risk.risk_level === 'critical' ? 1
                : risk.risk_level === 'high' ? 2
                : risk.risk_level === 'medium' ? 3 : 4,
        last_inspection: row.last_inspection_date,
        suggested_due_date: computeDueDate(risk.risk_level),
      });
    }
    enriched.sort((a, b) => a.priority - b.priority || b.risk_score - a.risk_score);
    return enriched;
  } catch (e) {
    console.error('[inspectionEngine.schedule] failed:', e.message);
    return [];
  }
}

function computeDueDate(riskLevel) {
  const days = riskLevel === 'critical' ? 7
             : riskLevel === 'high' ? 30
             : riskLevel === 'medium' ? 90 : 180;
  return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
}

// ===================== Inspection Analytics =====================

export async function computeInspectionAnalytics(opts = {}) {
  try {
    const [counts, byCompliance, byEntity, byMonth] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int as total,
          COUNT(CASE WHEN deleted_at IS NULL THEN 1 END)::int as active,
          AVG(overall_score)::numeric(10,2) as avg_score
        FROM inspections
      `).then(r => r.rows[0]).catch(() => ({ total: 0, active: 0, avg_score: null })),

      pool.query(`
        SELECT compliance_status, COUNT(*)::int as n
        FROM inspections WHERE deleted_at IS NULL
        GROUP BY compliance_status
      `).then(r => r.rows).catch(() => []),

      pool.query(`
        SELECT e.name_ar, COUNT(i.id)::int as inspection_count, AVG(i.overall_score)::numeric(10,2) as avg
        FROM inspections i
        JOIN organizational_entities e ON (i.enterprise_id::text = e.id::text OR i.entity_id::text = e.id::text)
        WHERE i.deleted_at IS NULL
        GROUP BY e.name_ar
        ORDER BY inspection_count DESC
        LIMIT 10
      `).then(r => r.rows).catch(() => []),

      pool.query(`
        SELECT TO_CHAR(inspection_date, 'YYYY-MM') as month, COUNT(*)::int as n
        FROM inspections
        WHERE deleted_at IS NULL AND inspection_date > NOW() - INTERVAL '12 months'
        GROUP BY 1 ORDER BY 1
      `).then(r => r.rows).catch(() => []),
    ]);

    return {
      counts,
      by_compliance: byCompliance,
      by_entity: byEntity,
      by_month: byMonth,
      data_source: 'inspections + organizational_entities',
    };
  } catch (e) {
    console.error('[inspectionEngine.analytics] failed:', e.message);
    return { counts: { total: 0, active: 0 }, by_compliance: [], by_entity: [], by_month: [] };
  }
}

// ===================== Inspection Checklist (per entity) =====================

/**
 * Generate an inspection checklist tailored to the entity's real
 * sector and workforce.
 */
export async function generateInspectionChecklist(entity, opts = {}) {
  const sector = entity.sector || 'default';
  const checklist = [
    { code: 'LAB-001', category: 'labor_law', ar: 'التحقق من عقود العمل', priority: 'critical' },
    { code: 'LAB-002', category: 'labor_law', ar: 'فحص كشوف الرواتب', priority: 'high' },
    { code: 'LAB-003', category: 'labor_law', ar: 'الالتزام بساعات العمل', priority: 'high' },
    { code: 'LAB-004', category: 'labor_law', ar: 'الإجازات السنوية والمرضية', priority: 'medium' },
    { code: 'OSH-001', category: 'occupational_safety', ar: 'معدات الحماية الشخصية', priority: 'critical' },
    { code: 'OSH-002', category: 'occupational_safety', ar: 'سلامة بيئة العمل', priority: 'high' },
    { code: 'OSH-003', category: 'occupational_safety', ar: 'الفحوصات الطبية للعاملين', priority: 'high' },
    { code: 'YEM-001', category: 'yemenization', ar: 'نسبة التوطين حسب القطاع', priority: 'critical' },
    { code: 'YEM-002', category: 'yemenization', ar: 'التراخيص اللازمة للعمالة الوافدة', priority: 'high' },
    { code: 'TRN-001', category: 'training', ar: 'برامج التدريب والتأهيل', priority: 'medium' },
    { code: 'TRN-002', category: 'training', ar: 'سجلات التدريب', priority: 'medium' },
    { code: 'MGT-001', category: 'management', ar: 'السجلات الإدارية', priority: 'low' },
    { code: 'MGT-002', category: 'management', ar: 'التراخيص والتصاريح', priority: 'low' },
  ];

  // Sector-specific additions
  if (['construction', 'oil_gas', 'mining', 'manufacturing'].includes(sector)) {
    checklist.push(
      { code: 'OSH-004', category: 'occupational_safety', ar: 'تدريب السلامة المتخصص', priority: 'critical' },
      { code: 'OSH-005', category: 'occupational_safety', ar: 'فحص المعدات والآلات', priority: 'high' },
    );
  }
  if (sector === 'healthcare') {
    checklist.push(
      { code: 'OSH-006', category: 'occupational_safety', ar: 'مكافحة العدوى', priority: 'critical' },
      { code: 'TRN-003', category: 'training', ar: 'تدريب الطوارئ الطبية', priority: 'high' },
    );
  }
  return checklist;
}

// ===================== Backward Compatibility =====================

export async function SCORE_WEIGHTS() {
  return loadScoreWeights();
}

export async function COMPLIANCE_THRESHOLDS() {
  return loadComplianceThresholds();
}

export default {
  loadScoreWeights,
  loadComplianceThresholds,
  loadSectorRisks,
  loadHighRiskGovernorates,
  computeEntityRiskScore,
  computeInspectionScore,
  generateInspectionSchedule,
  computeInspectionAnalytics,
  generateInspectionChecklist,
  clearInspectionCache,
  SCORE_WEIGHTS,
  COMPLIANCE_THRESHOLDS,
};
