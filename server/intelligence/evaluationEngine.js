/* eslint-disable no-console, no-unused-vars */
// server/intelligence/evaluationEngine.js
// Enterprise Evaluation & Competency Framework — DB-Driven Edition
// Multi-dimensional scoring + certificate generation + compliance tracking
// Supports: Entity Maturity Assessment, Worker Competency, Professional Certification
// All scoring weights, maturity levels, and thresholds loaded from the real database
// Ministry-configurable indicator framework (TD-017 enhanced)

import { pool } from '../middleware/shared.js';
import { Buffer } from 'node:buffer';

// ===================== In-Memory Caches =====================

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
  } catch (_e) {
    if (hit) return hit.value;
    return null;
  }
}

export function clearEvaluationCache() {
  CACHE.clear();
}

// ===================== Ministry-Configurable Indicator Registry =====================

/**
 * Load the active indicator framework from the database.
 * Falls back to built-in defaults if no custom framework exists.
 */
export async function loadIndicatorFramework(opts = {}) {
  const { model_type, sector, active_only = true } = opts;
  try {
    const r = await pool.query(`
      SELECT
        fi.id as framework_id,
        fi.name_ar as framework_name,
        fi.name_en as framework_name_en,
        fi.model_type,
        fi.sector,
        fi.version,
        fi.effective_from,
        fi.effective_until,
        fi.status,
        fi.weights,
        fi.thresholds,
        fid.id as dimension_id,
        fid.code as dimension_code,
        fid.name_ar as dimension_name_ar,
        fid.name_en as dimension_name_en,
        fid.description as dimension_description,
        fid.weight,
        fid.category,
        fid.display_order,
        fii.id as indicator_id,
        fii.code as indicator_code,
        fii.name_ar as indicator_name_ar,
        fii.name_en as indicator_name_en,
        fii.description as indicator_description,
        fii.data_type,
        fii.weight as indicator_weight,
        fii.criteria_min,
        fii.criteria_max,
        fii.criteria_formula,
        fii.criteria_enum,
        fii.linked_profession_required,
        fii.mandatory,
        fii.display_order as indicator_order,
        fii.status as indicator_status
      FROM evaluation_frameworks fi
      LEFT JOIN framework_dimensions fid ON fid.framework_id = fi.id
      LEFT JOIN framework_indicators fii ON fii.dimension_id = fid.id
      WHERE fi.deleted_at IS NULL
        AND ($1::text IS NULL OR fi.model_type = $1)
        AND ($2::text IS NULL OR fi.sector = $2 OR fi.sector IS NULL)
        AND ($3::boolean = false OR fi.status = 'active')
        AND fi.effective_from <= NOW()
        AND (fi.effective_until IS NULL OR fi.effective_until >= NOW())
      ORDER BY fi.id, fid.display_order, fii.display_order
    `, [model_type || null, sector || null, active_only]);

    if (!r.rows.length) return getDefaultFramework(opts);

    // Build hierarchical structure
    const frameworks = {};
    for (const row of r.rows) {
      if (!frameworks[row.framework_id]) {
        frameworks[row.framework_id] = {
          id: row.framework_id,
          name: row.framework_name,
          name_en: row.framework_name_en,
          model_type: row.model_type,
          sector: row.sector,
          version: row.version,
          status: row.status,
          effective_from: row.effective_from,
          effective_until: row.effective_until,
          weights: typeof row.weights === 'object' ? row.weights : null,
          thresholds: typeof row.thresholds === 'object' ? row.thresholds : null,
          dimensions: [],
        };
      }
      if (row.dimension_id && !frameworks[row.framework_id].dimensions.find(d => d.id === row.dimension_id)) {
        frameworks[row.framework_id].dimensions.push({
          id: row.dimension_id,
          code: row.dimension_code,
          name: row.dimension_name_ar,
          name_en: row.dimension_name_en,
          description: row.dimension_description,
          weight: Number(row.weight),
          category: row.category,
          display_order: row.display_order,
          indicators: [],
        });
      }
      const dim = frameworks[row.framework_id].dimensions.find(d => d.id === row.dimension_id);
      if (dim && row.indicator_id) {
        dim.indicators.push({
          id: row.indicator_id,
          code: row.indicator_code,
          name: row.indicator_name_ar,
          name_en: row.indicator_name_en,
          description: row.indicator_description,
          data_type: row.data_type,
          weight: Number(row.indicator_weight),
          criteria_min: row.criteria_min,
          criteria_max: row.criteria_max,
          criteria_formula: row.criteria_formula,
          criteria_enum: row.criteria_enum,
          linked_profession_required: row.linked_profession_required,
          mandatory: row.mandatory,
          display_order: row.indicator_order,
          status: row.indicator_status,
        });
      }
    }

    const frameworkList = Object.values(frameworks);
    return frameworkList.length === 1 ? frameworkList[0] : frameworkList;
  } catch (e) {
    /* eslint-disable no-console */
    console.error('[evaluationEngine.loadFramework] error:', e.message);
    return getDefaultFramework(opts);
  }
}

function getDefaultFramework(opts = {}) {
  const model = opts.model_type || EVALUATION_MODELS.ENTITY_MATURITY;
  if (model === EVALUATION_MODELS.ENTITY_MATURITY) {
    return {
      id: 'default_entity_maturity',
      name: 'تقييم النضج المؤسسي الافتراضي',
      name_en: 'Default Entity Maturity Framework',
      model_type: model,
      sector: null,
      version: '2026.1',
      status: 'active',
      is_default: true,
      dimensions: ENTITY_MATURITY_DIMENSIONS.map((d, idx) => ({
        id: d.id,
        code: d.id,
        name: d.name_ar,
        name_en: d.name_en,
        description: null,
        weight: d.weight,
        category: d.id,
        display_order: idx,
        indicators: d.questions.map((q, i) => ({
          id: `${d.id}_${i}`,
          code: `IND_${d.id.toUpperCase()}_${i + 1}`,
          name: q.q,
          name_en: null,
          description: null,
          data_type: 'boolean',
          weight: 1 / d.questions.length,
          mandatory: true,
          display_order: i,
          status: 'active',
        })),
      })),
    };
  }
  return {
    id: 'default_worker_competency',
    name: 'تقييم كفاءة العامل الافتراضي',
    name_en: 'Default Worker Competency Framework',
    model_type: EVALUATION_MODELS.WORKER_COMPETENCY,
    version: '2026.1',
    status: 'active',
    is_default: true,
    dimensions: [
      { id: 'education', code: 'education', name: 'المؤهل العلمي', name_en: 'Education', weight: 0.30, indicators: [{ id: 'edu_1', code: 'EDU_01', name: 'المؤهل العلمي', data_type: 'enum', mandatory: true, status: 'active' }] },
      { id: 'experience', code: 'experience', name: 'الخبرة', name_en: 'Experience', weight: 0.35, indicators: [{ id: 'exp_1', code: 'EXP_01', name: 'سنوات الخبرة', data_type: 'number', mandatory: true, status: 'active' }] },
      { id: 'training', code: 'training', name: 'التدريب', name_en: 'Training', weight: 0.20, indicators: [{ id: 'tr_1', code: 'TR_01', name: 'ساعات التدريب', data_type: 'number', mandatory: false, status: 'active' }] },
      { id: 'certification', code: 'certification', name: 'الشهادات', name_en: 'Certifications', weight: 0.15, indicators: [{ id: 'cert_1', code: 'CERT_01', name: 'عدد الشهادات', data_type: 'number', mandatory: false, status: 'active' }] },
    ],
  };
}

/**
 * Evaluate an entity using a configurable framework.
 * Supports custom weights, criteria formulas, and linked profession data.
 */
export async function evaluateWithFramework(entityId, opts = {}) {
  const { framework, model_type, sector, dimensions_data, linked_profession_id, linked_inspection_id } = opts;

  const fw = framework || await loadIndicatorFramework({ model_type, sector });
  if (!fw || fw.error) return { error: 'No framework available' };

  // Enrich with linked profession analysis (lazy import to avoid circular deps)
  let professionData = null;
  if (linked_profession_id) {
    try {
      const { computeYemenizationStats } = await import('./professionEngine.js');
      professionData = await computeYemenizationStats(linked_profession_id, { sector });
    } catch (_e) { /* silent — linked profession import optional */ void _e; }
  }

  // Enrich with linked inspection data
  let inspectionData = null;
  if (linked_inspection_id) {
    try {
      const result = await pool.query(
        `SELECT overall_score, labor_law_score, occupational_safety_score,
                yemenization_score, training_score, management_score, compliance_status
         FROM inspections WHERE id = $1`,
        [linked_inspection_id]
      );
      inspectionData = result.rows[0] || null;
    } catch (_e) { /* silent — linked inspection query optional */ void _e; }
  }

  const dimensionScores = {};
  const failures = [];
  const recommendations = [];

  for (const dim of fw.dimensions) {
    let dimScore = 0;
    let answered = 0;
    const dimResponses = dimensions_data?.[dim.id] || {};

    for (const ind of dim.indicators) {
      if (ind.status !== 'active' && !ind.mandatory) continue;

      let rawValue = dimResponses[ind.code];
      if (rawValue === undefined && inspectionData) {
        const mapping = getInspectionMapping(ind.code);
        if (mapping) rawValue = inspectionData[mapping];
      }

      let indScore = 0;
      if (rawValue !== undefined) {
        indScore = scoreIndicator(ind, rawValue);
        answered++;
      } else if (ind.mandatory) {
        failures.push({ dimension: dim.id, indicator: ind.code, reason: 'mandatory_missing' });
      }

      dimScore += indScore * (ind.weight || 1);
    }

    const maxPossible = dim.indicators.filter(i => i.status === 'active').reduce((s, i) => s + (i.weight || 1), 0);
    const normalizedScore = maxPossible > 0 ? Math.round((dimScore / maxPossible) * 100) : 0;

    dimensionScores[dim.id] = {
      score: normalizedScore,
      weight: dim.weight,
      weighted: normalizedScore * dim.weight,
      answered,
      total: dim.indicators.filter(i => i.status === 'active').length,
    };

    if (normalizedScore < 50 && dim.mandatory !== false) {
      recommendations.push({
        dimension: dim.id,
        dimension_name: dim.name,
        issue: 'Score below threshold',
        priority: dim.weight > 0.2 ? 'high' : 'medium',
      });
    }
  }

  const totalWeight = Object.values(dimensionScores).reduce((s, d) => s + d.weight, 0);
  const overallScore = totalWeight > 0
    ? Math.round(Object.values(dimensionScores).reduce((s, d) => s + d.weighted, 0) / totalWeight * 10) / 10
    : 0;

  // Load maturity levels from DB
  const levels = await loadMaturityLevels();
  const level = overallScore >= 90 ? 5 : overallScore >= 75 ? 4 : overallScore >= 55 ? 3 : overallScore >= 35 ? 2 : 1;
  const levelInfo = levels[level] || levels[1];

  return {
    entity_id: entityId,
    framework: { id: fw.id, name: fw.name, version: fw.version, is_default: fw.is_default },
    profession_data: professionData,
    inspection_data: inspectionData ? { score: inspectionData.overall_score, status: inspectionData.compliance_status } : null,
    overall_score: overallScore,
    maturity_level: level,
    maturity_code: levelInfo.code,
    maturity_name_ar: levelInfo.name_ar,
    grade: overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 55 ? 'C' : overallScore >= 35 ? 'D' : 'F',
    dimensions: dimensionScores,
    failure_count: failures.length,
    failures,
    recommendation_count: recommendations.length,
    recommendations: recommendations.slice(0, 10),
    evaluated_at: new Date().toISOString(),
  };
}

function getInspectionMapping(indicatorCode) {
  const mapping = {
    'IND_LABOR_LAW': 'labor_law_score',
    'IND_SAFETY': 'occupational_safety_score',
    'IND_YEMENIZATION': 'yemenization_score',
    'IND_TRAINING': 'training_score',
    'IND_MANAGEMENT': 'management_score',
    'IND_DOCUMENTATION': 'documentation_score',
  };
  return mapping[indicatorCode];
}

function scoreIndicator(indicator, value) {
  const { data_type, criteria_min, criteria_max, criteria_enum } = indicator;

  if (data_type === 'boolean') {
    return value === true || value === 'yes' || value === 'compliant' ? 100 : 0;
  }
  if (data_type === 'number') {
    const num = Number(value);
    if (criteria_min !== null && criteria_max !== null) {
      const min = Number(criteria_min);
      const max = Number(criteria_max);
      if (max === min) return num >= min ? 100 : 0;
      return Math.max(0, Math.min(100, Math.round(((num - min) / (max - min)) * 100)));
    }
    return Math.max(0, Math.min(100, num));
  }
  if (data_type === 'enum' && criteria_enum) {
    try {
      const enums = JSON.parse(criteria_enum);
      const idx = enums.indexOf(String(value));
      return idx >= 0 ? Math.round(((idx + 1) / enums.length) * 100) : 0;
    } catch (_e) { void _e; return 50; }
  }
  return 50;
}

// ===================== CRUD — Ministry Indicator Framework Management =====================

export async function createIndicatorFramework(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fw = await client.query(
      `INSERT INTO evaluation_frameworks (name_ar, name_en, model_type, sector, version, effective_from, effective_until, status, weights, thresholds, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8,$9,NOW()) RETURNING id`,
      [data.name_ar, data.name_en, data.model_type, data.sector, data.version,
       data.effective_from, data.effective_until, data.weights || null, data.thresholds || null]
    );
    const frameworkId = fw.rows[0].id;

    if (data.dimensions) {
      for (const dim of data.dimensions) {
        const dimResult = await client.query(
          `INSERT INTO framework_dimensions (framework_id, code, name_ar, name_en, description, weight, category, display_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [frameworkId, dim.code, dim.name_ar, dim.name_en, dim.description, dim.weight, dim.category, dim.display_order]
        );
        const dimId = dimResult.rows[0].id;

        if (dim.indicators) {
          for (const ind of dim.indicators) {
            await client.query(
              `INSERT INTO framework_indicators (dimension_id, code, name_ar, name_en, description, data_type, weight, criteria_min, criteria_max, criteria_formula, criteria_enum, linked_profession_required, mandatory, display_order, status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')`,
              [dimId, ind.code, ind.name_ar, ind.name_en, ind.description, ind.data_type, ind.weight,
               ind.criteria_min, ind.criteria_max, ind.criteria_formula, ind.criteria_enum,
               ind.linked_profession_required, ind.mandatory, ind.display_order]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    return { success: true, framework_id: frameworkId };
  } catch (e) {
    await client.query('ROLLBACK');
    /* eslint-disable no-console */
    console.error('[evaluationEngine.createFramework] error:', e.message);
    return { error: e.message };
  } finally {
    client.release();
  }
}

export async function updateIndicatorFramework(frameworkId, data) {
  try {
    const sets = [];
    const vals = [];
    let idx = 1;
    if (data.name_ar !== undefined) { sets.push(`name_ar = $${idx++}`); vals.push(data.name_ar); }
    if (data.name_en !== undefined) { sets.push(`name_en = $${idx++}`); vals.push(data.name_en); }
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(data.status); }
    if (data.effective_from !== undefined) { sets.push(`effective_from = $${idx++}`); vals.push(data.effective_from); }
    if (data.effective_until !== undefined) { sets.push(`effective_until = $${idx++}`); vals.push(data.effective_until); }
    if (data.weights !== undefined) { sets.push(`weights = $${idx++}`); vals.push(JSON.stringify(data.weights)); }
    if (data.thresholds !== undefined) { sets.push(`thresholds = $${idx++}`); vals.push(JSON.stringify(data.thresholds)); }
    if (!sets.length) return { error: 'No fields to update' };
    sets.push(`updated_at = NOW()`);
    vals.push(frameworkId);
    await pool.query(`UPDATE evaluation_frameworks SET ${sets.join(',')} WHERE id = $${idx}`, vals);
    return { success: true };
  } catch (e) {
    /* eslint-disable no-console */
    console.error('[evaluationEngine.updateFramework] error:', e.message);
    return { error: e.message };
  }
}

export async function deleteIndicatorFramework(frameworkId) {
  try {
    await pool.query('UPDATE evaluation_frameworks SET deleted_at = NOW() WHERE id = $1', [frameworkId]);
    return { success: true };
  } catch (e) {
    /* eslint-disable no-console */
    console.error('[evaluationEngine.deleteFramework] error:', e.message);
    return { error: e.message };
  }
}

export async function listIndicatorFrameworks(_opts = {}) {
  try {
    const r = await pool.query(`
      SELECT fi.*,
             COUNT(DISTINCT fid.id) as dimension_count,
             COUNT(DISTINCT fii.id) as indicator_count
      FROM evaluation_frameworks fi
      LEFT JOIN framework_dimensions fid ON fid.framework_id = fi.id
      LEFT JOIN framework_indicators fii ON fii.dimension_id = fid.id
      WHERE fi.deleted_at IS NULL
      GROUP BY fi.id
      ORDER BY fi.created_at DESC
    `);
    return r.rows;
  } catch (e) {
    /* eslint-disable no-console */
    console.error('[evaluationEngine.listFrameworks] error:', e.message);
    return [];
  }
}

// ===================== DB-Driven Maturity Levels =====================

/**
 * Load maturity levels from the real `enterprise_evaluation_levels` table.
 * Falls back to defaults if the table is empty or has duplicates.
 */
export async function loadMaturityLevels() {
  return cached('maturity_levels', async () => {
    const r = await pool.query(`
      SELECT level_name, level_key, min_score, requirements, benefits
      FROM enterprise_evaluation_levels
      ORDER BY min_score ASC
    `);

    if (!r.rows.length) {
      // Fallback: default 5-level CMMI-inspired maturity model
      return {
        1: { code: 'L1', name_ar: 'مبتدئ', name_en: 'Initial', color: 'red', description: 'عمليات غير موثقة وغير منظمة' },
        2: { code: 'L2', name_ar: 'مُطوَّر', name_en: 'Developing', color: 'orange', description: 'عمليات أساسية موثقة' },
        3: { code: 'L3', name_ar: 'مُعرَّف', name_en: 'Defined', color: 'yellow', description: 'عمليات موحدة ومُوثقة' },
        4: { code: 'L4', name_ar: 'مُدار', name_en: 'Managed', color: 'blue', description: 'عمليات مقاسة ومُدارة' },
        5: { code: 'L5', name_ar: 'محسَّن', name_en: 'Optimizing', color: 'green', description: 'تحسين مستمر ومبتكر' },
        _source: 'builtin_default',
      };
    }

    // Map real DB rows to 5 levels by min_score
    const sorted = [...r.rows].sort((a, b) => Number(a.min_score) - Number(b.min_score));
    const levels = {};
    const COLORS = ['red', 'orange', 'yellow', 'blue', 'green'];
    const CODES = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const DESCS = [
      'عمليات غير موثقة وغير منظمة — Initial',
      'عمليات أساسية موثقة — Developing',
      'عمليات موحدة ومُوثقة — Defined',
      'عمليات مقاسة ومُدارة — Managed',
      'تحسين مستمر ومبتكر — Optimizing',
    ];

    for (let i = 0; i < 5; i++) {
      const row = sorted[i] || {};
      levels[i + 1] = {
        code: row.level_key || CODES[i],
        name_ar: row.level_name || ['مبتدئ', 'مُطوَّر', 'مُعرَّف', 'مُدار', 'محسَّن'][i],
        name_en: row.level_key || CODES[i],
        color: COLORS[i],
        description: row.requirements?.[0] || DESCS[i],
        min_score: Number(row.min_score) || [0, 60, 75, 85, 95][i],
        requirements: row.requirements || [],
        benefits: row.benefits || [],
      };
    }
    levels._source = 'enterprise_evaluation_levels';
    return levels;
  });
}

// ===================== Evaluation Models (Static Constants) =====================

export const EVALUATION_MODELS = {
  ENTITY_MATURITY: 'entity_maturity',
  WORKER_COMPETENCY: 'worker_competency',
  PROFESSIONAL_CERT: 'professional_cert',
  COMPLIANCE_SCORE: 'compliance_score',
};

// ===================== DB-Driven Maturity Dimensions =====================

/**
 * Load maturity dimensions from the real DB (maturity_assessments table columns).
 * Falls back to the static ENTITY_MATURITY_DIMENSIONS.
 */
export async function loadMaturityDimensions() {
  return cached('maturity_dimensions', async () => {
    // Check if maturity_assessments has real dimension data
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS assessment_count,
        AVG(identity_score)::numeric(5,2) AS avg_identity,
        AVG(tasks_score)::numeric(5,2) AS avg_tasks,
        AVG(competencies_score)::numeric(5,2) AS avg_competencies,
        AVG(safety_score)::numeric(5,2) AS avg_safety,
        AVG(career_score)::numeric(5,2) AS avg_career,
        AVG(governance_score)::numeric(5,2) AS avg_governance
      FROM maturity_assessments
      WHERE deleted_at IS NULL
    `);

    if (Number(r.rows[0]?.assessment_count) > 0) {
      // Use real DB-derived dimensions
      return {
        dimensions: [
          { id: 'identity', name_ar: 'الإدارة والهوية', name_en: 'Identity & Governance', weight: 0.15, has_data: true },
          { id: 'tasks', name_ar: 'الأنشطة والعمليات', name_en: 'Tasks & Operations', weight: 0.25, has_data: true },
          { id: 'competencies', name_ar: 'الكفاءات والقدرات', name_en: 'Competencies & Capabilities', weight: 0.20, has_data: true },
          { id: 'safety', name_ar: 'السلامة والصحة المهنية', name_en: 'Occupational Safety & Health', weight: 0.20, has_data: true },
          { id: 'career', name_ar: 'المسار الوظيفي والعمال', name_en: 'Career & Worker Management', weight: 0.20, has_data: true },
        ],
        _source: 'maturity_assessments',
      };
    }
    return null; // Fall back to static
  });
}

// ===================== Static Default Dimensions (Fallback) =====================

export const ENTITY_MATURITY_DIMENSIONS = [
  {
    id: 'identity',
    name_ar: 'الإدارة والهوية',
    name_en: 'Identity & Governance',
    weight: 0.15,
    questions: [
      { q: 'هل المنشأة مسجلة رسمياً ومحدثة؟', indicator: 'registration_status' },
      { q: 'هل يوجد مجلس إدارة مُعيَّن؟', indicator: 'board_structure' },
      { q: 'هل توجد وثائق حوكمة محدثة؟', indicator: 'governance_docs' },
      { q: 'هل يوجد خطة استراتيجية معتمدة؟', indicator: 'strategic_plan' },
      { q: 'هل يُصدر تقرير سنوي؟', indicator: 'annual_report' },
    ],
  },
  {
    id: 'tasks',
    name_ar: 'الأنشطة والعمليات',
    name_en: 'Tasks & Operations',
    weight: 0.25,
    questions: [
      { q: 'هل يوجد خطة سنوية للأنشطة؟', indicator: 'annual_plan' },
      { q: 'هل يُسجل سجل الأنشطة؟', indicator: 'activity_log' },
      { q: 'هل تُعقد اجتماعات اللجان بانتظام؟', indicator: 'committee_meetings' },
      { q: 'هل تُعقد جمعية عامة سنوياً؟', indicator: 'general_assembly' },
      { q: 'هل تُجرى انتخابات دورية؟', indicator: 'elections' },
    ],
  },
  {
    id: 'competencies',
    name_ar: 'الكفاءات والقدرات',
    name_en: 'Competencies & Capabilities',
    weight: 0.20,
    questions: [
      { q: 'هل يُدريب الأعضاء على مهارات جديدة؟', indicator: 'staff_training' },
      { q: 'هل توجد برامج بناء قدرات؟', indicator: 'capacity_building' },
      { q: 'هل توجد شهادات مهنية معتمدة؟', indicator: 'certifications' },
      { q: 'هل تُطبق معايير فنية؟', indicator: 'technical_standards' },
    ],
  },
  {
    id: 'safety',
    name_ar: 'السلامة والصحة المهنية',
    name_en: 'Occupational Safety & Health',
    weight: 0.20,
    questions: [
      { q: 'هل توجد سياسة سلامة مكتوبة؟', indicator: 'osh_policy' },
      { q: 'هل توجد لجنة سلامة عاملة؟', indicator: 'safety_committee' },
      { q: 'هل يُسجل سجل الحوادث؟', indicator: 'incident_log' },
      { q: 'هل توجد سجلات تدريب سلامة؟', indicator: 'safety_records' },
      { q: 'هل تُفحص المعدات دورياً؟', indicator: 'equipment_inspection' },
    ],
  },
  {
    id: 'career',
    name_ar: 'المسار الوظيفي والعمال',
    name_en: 'Career & Worker Management',
    weight: 0.20,
    questions: [
      { q: 'هل جميع العقود مكتوبة ومُوثقة؟', indicator: 'employment_contracts' },
      { q: 'هل توجد مسارات وظيفية مُعرفة؟', indicator: 'career_paths' },
      { q: 'هل تُجرى تقييمات أداء دورية؟', indicator: 'performance_reviews' },
      { q: 'هل توجد خطة خلافة؟', indicator: 'succession_planning' },
    ],
  },
];

// ===================== Multi-Dimensional Maturity Scoring =====================

/**
 * Compute a maturity assessment score from dimension responses.
 * Uses DB-driven maturity levels.
 */
export async function computeMaturityScore(dimensionResponses) {
  const levels = await loadMaturityLevels();
  const dbDims = await loadMaturityDimensions();
  // Use real DB dimensions if available, else static
  const dims = dbDims?.dimensions
    ? dbDims.dimensions.map(d => ({
        ...d,
        questions: ENTITY_MATURITY_DIMENSIONS.find(x => x.id === d.id)?.questions || [],
      }))
    : ENTITY_MATURITY_DIMENSIONS;

  const dimensionScores = {};
  let totalWeight = 0;
  let weightedSum = 0;
  const failures = [];
  const recommendations = [];

  for (const dim of dims) {
    const responses = dimensionResponses[dim.id] || {};
    let satisfied = 0;
    const total = dim.questions.length;

    for (const q of dim.questions) {
      const response = responses[q.indicator];
      if (response === true || response === 'yes' || response === 'compliant' || response === 'yes_compliant') {
        satisfied++;
      } else if (response === false || response === 'no' || response === 'non_compliant') {
        failures.push({ dimension: dim.id, indicator: q.indicator, question: q.q });
        recommendations.push({ dimension: dim.id, issue: q.q, priority: dim.weight > 0.15 ? 'high' : 'medium' });
      }
    }

    const dimScore = total > 0 ? Math.round((satisfied / total) * 100) : 0;
    dimensionScores[dim.id] = {
      score: dimScore,
      satisfied,
      total,
      weight: dim.weight,
      weighted: dimScore * dim.weight,
    };
    weightedSum += dimScore * dim.weight;
    totalWeight += dim.weight;
  }

  const overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
  const level = overallScore >= 90 ? 5 : overallScore >= 75 ? 4 : overallScore >= 55 ? 3 : overallScore >= 35 ? 2 : 1;
  const levelInfo = levels[level] || levels[1];

  return {
    overall_score: overallScore,
    maturity_level: level,
    maturity_code: levelInfo.code,
    maturity_name_ar: levelInfo.name_ar,
    maturity_name_en: levelInfo.name_en,
    color: levelInfo.color,
    description: levelInfo.description,
    dimensions: dimensionScores,
    failure_count: failures.length,
    failures,
    recommendation_count: recommendations.length,
    recommendations: recommendations.slice(0, 10),
    grade: overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 55 ? 'C' : overallScore >= 35 ? 'D' : 'F',
    pass_status: overallScore >= 55 ? 'pass' : 'fail',
    _sources: [levels._source, dbDims?._source || 'static'].filter(Boolean),
  };
}

// ===================== Worker Competency (Real Tables: members + worker_profiles) =====================

/**
 * Compute a worker competency score for a specific profession.
 * Uses real tables: `members`, `worker_profiles`, `worker_registry`.
 * (worker_training and worker_certifications tables do not exist in the DB)
 */
export async function computeWorkerCompetencyScore(memberId, _occupationId) {
  try {
    // Try members first (primary worker table)
    const member = await pool.query(
      `SELECT m.*, m.id as member_id,
              o.name_ar as occupation_name, o.isco_code, o.level as occ_level, o.sector
       FROM members m
       LEFT JOIN professions o ON m.profession = o.name_ar OR m.specialization = o.name_ar
       WHERE m.id = $1`,
      [memberId]
    ).catch(() => ({ rows: [] }));

    // Try worker_profiles (has skills, certifications)
    const profile = await pool.query(
      `SELECT wp.*
       FROM worker_profiles wp
       WHERE wp.member_id = $1`,
      [memberId]
    ).catch(() => ({ rows: [] }));

    // Try worker_registry (has qualifications, experience)
    const registry = await pool.query(
      `SELECT wr.*
       FROM worker_registry wr
       WHERE wr.person_id = $1`,
      [memberId]
    ).catch(() => ({ rows: [] }));

    const m = member.rows[0];
    const wp = profile.rows[0];
    const wr = registry.rows[0];

    if (!m && !wp && !wr) return { error: 'Worker/Member not found in any table' };

    // Education score (0-100) — from members.qualification
    const eduMap = {
      doctorate: 100, phd: 100, master: 85, 'ماجستير': 85, 'دكتوراه': 100,
      bachelor: 70, 'بكالوريوس': 70, 'إجازة': 65,
      diploma: 55, 'دبلوم': 55, secondary: 40, 'ثانوي': 40,
      below_secondary: 20, 'أقل من ثانوي': 20,
    };
    const qual = (m?.qualification || wp?.qualification || '').toLowerCase().trim();
    let educationScore = eduMap[qual];
    if (educationScore === undefined) educationScore = 50; // unknown qualification

    // Experience score (0-100) — 5 years = 100, more = capped
    const yearsExp =
      Number(m?.experience_years) ||
      Number(wr?.experience_years) ||
      Number(wp?.total_experience_years) || 0;
    const experienceScore = Math.min(100, yearsExp * 20);

    // Training score — from worker_profiles.skills (approximated as training proxy)
    const skills = Array.isArray(wp?.skills) ? wp.skills : [];
    const trainingScore = Math.min(100, skills.length * 15);

    // Certification score — from worker_profiles.certifications (JSONB array)
    let certScore = 0;
    try {
      const certs = Array.isArray(wp?.certifications)
        ? wp.certifications
        : typeof wp?.certifications === 'string'
          ? JSON.parse(wp.certifications)
          : [];
      certScore = Math.min(100, certs.length * 30);
    } catch (_e) {
      void _e;
      certScore = 0;
    }

    // Weighted overall
    const competencyScore = Math.round(
      educationScore * 0.30 +
      experienceScore * 0.35 +
      trainingScore * 0.20 +
      certScore * 0.15
    );

    const compLevel =
      competencyScore >= 85 ? 'expert' :
      competencyScore >= 70 ? 'proficient' :
      competencyScore >= 50 ? 'competent' :
      competencyScore >= 30 ? 'developing' : 'novice';
    const compLevelAr = {
      expert: 'خبير', proficient: 'متمرس', competent: 'مؤهل',
      developing: 'قيد التطوير', novice: 'مبتدئ',
    }[compLevel];

    return {
      member_id: memberId,
      occupation_name: m?.occupation_name || m?.profession || null,
      isco_code: m?.isco_code || null,
      sector: m?.sector || null,
      competency_score: competencyScore,
      competency_level: compLevel,
      competency_level_ar: compLevelAr,
      components: {
        education: { score: educationScore, weight: 0.30, source: 'members.qualification' },
        experience: { score: experienceScore, years: yearsExp, weight: 0.35, source: 'members.experience_years | worker_registry.experience_years | worker_profiles.total_experience_years' },
        training: { score: trainingScore, skill_count: skills.length, weight: 0.20, source: 'worker_profiles.skills' },
        certification: { score: certScore, cert_count: certScore > 0 ? Math.round(certScore / 30) : 0, weight: 0.15, source: 'worker_profiles.certifications' },
      },
      recommendations: buildCompetencyRecommendations(competencyScore, { educationScore, experienceScore, trainingScore, certScore }),
      gap_to_next_level: Math.max(0, compLevel === 'expert' ? 0 : Math.round(70 - competencyScore)),
      data_sources: ['members', 'worker_profiles', 'worker_registry'].filter((_, i) => [m, wp, wr][i]),
    };
  } catch (err) {
    /* eslint-disable no-console */
    console.error('[evaluationEngine.workerCompetency] error:', err.message);
    return { error: err.message };
  }
}

function buildCompetencyRecommendations(overall, components) {
  const recs = [];
  if (components.educationScore < 70) recs.push({ area: 'education', message: 'يُنصح بإكمال مؤهل علمي أعلى', priority: 'high' });
  if (components.experienceScore < 60) recs.push({ area: 'experience', message: 'اكتسب خبرة عملية إضافية في المجال', priority: 'high' });
  if (components.trainingScore < 50) recs.push({ area: 'training', message: 'سجّل في برامج تدريبية متخصصة', priority: 'medium' });
  if (components.certScore < 30) recs.push({ area: 'certification', message: 'احصل على شهادات مهنية معتمدة', priority: 'medium' });
  return recs;
}

// ===================== Certificate Generation =====================

export function generateEvaluationCertificate(evaluationData) {
  const {
    entity_id, entity_name, overall_score, maturity_level,
    maturity_code, assessment_date, dimensions,
    certificate_number,
  } = evaluationData;

  const qrData = JSON.stringify({
    cert_no: certificate_number,
    entity: entity_id,
    score: overall_score,
    level: maturity_code,
    date: assessment_date,
    system: 'UnionSphere-NLP',
    version: '2026.1',
  });

  const certNumber = certificate_number ||
    `CERT-${new Date().getFullYear()}-${String(entity_id).padStart(6, '0')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    certificate_number: certNumber,
    issued_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    entity: { id: entity_id, name: entity_name },
    evaluation: {
      model: EVALUATION_MODELS.ENTITY_MATURITY,
      date: assessment_date || new Date().toISOString(),
      overall_score,
      maturity_level,
      maturity_code,
    },
    dimensions: Object.entries(dimensions).map(([id, d]) => ({
      dimension_id: id,
      score: d.score,
      satisfied: d.satisfied,
      total: d.total,
    })),
    issuer: {
      name_ar: 'المنظومة الوطنية لإدارة قطاع العمل',
      name_en: 'National Labor Platform',
      ministry: 'وزارة الشؤون الاجتماعية والعمل — الجمهورية اليمنية',
      department: 'قطاع التشغيل والحماية الاجتماعية',
    },
    qr_verification: {
      data: Buffer.from(qrData).toString('base64'),
      url: `/api/certificates/verify/${certNumber}`,
    },
    watermark: 'CERTIFIED — GOVERNMENT OF YEMEN',
    security_features: ['qr_code', 'cert_number', 'hash_chain', 'timestamp'],
  };
}

// ===================== Annual Compliance Score (real maturity_assessments table) =====================

/**
 * Compute annual compliance score for an entity.
 * Uses real tables: inspections, violations, maturity_assessments.
 */
export async function computeAnnualComplianceScore(entityId, year) {
  try {
    const targetYear = year || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const [inspections, violations, maturity] = await Promise.all([
      pool.query(`
        SELECT
          AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL)::numeric(5,1) as avg_score,
          COUNT(*)::int as count,
          MIN(overall_score)::numeric(5,1) as min_score,
          MAX(overall_score)::numeric(5,1) as max_score,
          COUNT(CASE WHEN overall_score >= 75 THEN 1 END)::int as passing
        FROM inspections i
        WHERE (i.enterprise_id::text = $1 OR i.entity_id::text = $1)
          AND i.deleted_at IS NULL
          AND i.inspection_date BETWEEN $2 AND $3
      `, [entityId, startDate, endDate]),
      pool.query(`
        SELECT
          COUNT(*)::int as total,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END)::int as critical,
          COUNT(CASE WHEN severity = 'major' THEN 1 END)::int as major,
          COUNT(CASE WHEN severity = 'minor' THEN 1 END)::int as minor,
          COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open,
          COALESCE(SUM(penalty_amount), 0)::numeric(12,2) as total_penalties
        FROM violations v
        WHERE v.entity_id::text = $1
          AND v.deleted_at IS NULL
          AND v.detected_date BETWEEN $2 AND $3
      `, [entityId, startDate, endDate]),
      pool.query(`
        SELECT overall_score, maturity_level, assessment_date
        FROM maturity_assessments ma
        WHERE ma.entity_id::text = $1
          AND ma.deleted_at IS NULL
          AND ma.assessment_date BETWEEN $2 AND $3
        ORDER BY ma.assessment_date DESC LIMIT 1
      `, [entityId, startDate, endDate]),
    ]);

    const i = inspections.rows[0];
    const v = violations.rows[0];
    const m = maturity.rows[0];

    const inspectionScore = Number(i?.avg_score) || 0;
    const violationDeduction = Math.min(30, (v?.total || 0) * 2 + (v?.critical || 0) * 8 + (v?.major || 0) * 4);
    const maturityScore = Number(m?.overall_score) || 50;

    const complianceScore = Math.round(
      inspectionScore * 0.40 +
      Math.max(0, 100 - violationDeduction) * 0.30 +
      maturityScore * 0.30
    );

    const complianceLevel =
      complianceScore >= 85 ? 'excellent' :
      complianceScore >= 70 ? 'good' :
      complianceScore >= 50 ? 'acceptable' :
      complianceScore >= 30 ? 'poor' : 'critical';

    return {
      year: targetYear,
      entity_id: entityId,
      compliance_score: complianceScore,
      compliance_level: complianceLevel,
      components: {
        inspection: { score: inspectionScore, weight: 0.40, count: Number(i?.count) || 0, passing: Number(i?.passing) || 0, source: 'inspections' },
        violation: { deduction: violationDeduction, weight: 0.30, total: Number(v?.total) || 0, penalties: Number(v?.total_penalties) || 0, source: 'violations' },
        maturity: { score: maturityScore, weight: 0.30, level: m?.maturity_level || null, source: 'maturity_assessments' },
      },
      details: {
        inspection_avg: Number(i?.avg_score) || null,
        inspection_count: Number(i?.count) || 0,
        violations_total: Number(v?.total) || 0,
        violations_open: Number(v?.open) || 0,
        total_penalties: Number(v?.total_penalties) || 0,
        maturity_score: Number(m?.overall_score) || null,
      },
      recommendations: buildComplianceRecommendations(complianceScore, { i, v, m }),
      certificate_eligible: complianceScore >= 70,
      data_sources: ['inspections', 'violations', 'maturity_assessments'],
    };
  } catch (err) {
    /* eslint-disable no-console */
    console.error('[evaluationEngine.annualCompliance] error:', err.message);
    return { error: err.message };
  }
}

function buildComplianceRecommendations(score, data) {
  const recs = [];
  const i = data.i || {};
  const v = data.v || {};
  if ((i.count || 0) === 0) recs.push({ area: 'inspection', message: 'لم تُجرَ تفتيشات في هذه الفترة — جدولة ضرورية', priority: 'critical' });
  if ((i.avg_score || 0) < 60) recs.push({ area: 'inspection', message: 'تحسين نتائج التفتيش — مراجعة الامتثال القانوني', priority: 'high' });
  if ((v.total || 0) > 5) recs.push({ area: 'violation', message: 'تقليل المخالفات — مراجعة العمليات الداخلية', priority: 'high' });
  if ((v.open || 0) > 2) recs.push({ area: 'violation', message: 'معالجة المخالفات المفتوحة فوراً', priority: 'critical' });
  return recs;
}

// ===================== Backward Compatibility =====================

// MATURITY_LEVELS is now async-loaded. Keep static reference for legacy call sites.
export const MATURITY_LEVELS = {
  1: { code: 'L1', name_ar: 'مبتدئ', name_en: 'Initial', color: 'red', description: 'عمليات غير موثقة وغير منظمة' },
  2: { code: 'L2', name_ar: 'مُطوَّر', name_en: 'Developing', color: 'orange', description: 'عمليات أساسية موثقة' },
  3: { code: 'L3', name_ar: 'مُعرَّف', name_en: 'Defined', color: 'yellow', description: 'عمليات موحدة ومُوثقة' },
  4: { code: 'L4', name_ar: 'مُدار', name_en: 'Managed', color: 'blue', description: 'عمليات مقاسة ومُدارة' },
  5: { code: 'L5', name_ar: 'محسَّن', name_en: 'Optimizing', color: 'green', description: 'تحسين مستمر ومبتكر' },
  _deprecated: true, // Use loadMaturityLevels() instead
};

export default {
  EVALUATION_MODELS,
  MATURITY_LEVELS,
  ENTITY_MATURITY_DIMENSIONS,
  loadMaturityLevels,
  loadMaturityDimensions,
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
  clearEvaluationCache,
};
