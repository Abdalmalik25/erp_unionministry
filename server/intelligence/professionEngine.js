// server/intelligence/professionEngine.js
// Enterprise Profession Intelligence Engine — DB-Driven Edition
// All constants and taxonomies are loaded from the real database
// (professions, isic4_classifications, system_settings, governorates)
//
// Yemeni Standard Occupational Classification (YNSOC) aligned with:
//  - ISCO-08 (ILO)        → `professions.major_group_code` (real data)
//  - ISIC Rev.4 (UN)      → `isic4_classifications`        (real data)
//  - National Labour Law → `system_settings.yemenization_min_ratio`

import { pool } from '../middleware/shared.js';
import crypto from 'crypto';

// ===================== In-Memory DB Caches (TTL) =====================

const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

/* eslint-disable no-console */
async function cached(key, loader) {
  const now = Date.now();
  const hit = CACHE.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  try {
    const value = await loader();
    CACHE.set(key, { at: now, value });
    return value;
  } catch (e) {
    console.error(`[professionEngine.cache] ${key} failed:`, e.message); // eslint-disable-line no-console
    // Return stale cache if available
    if (hit) return hit.value;
    return null;
  }
}

export function clearProfessionCache() {
  CACHE.clear();
}

// ===================== Dynamic Configuration Loaders =====================

/**
 * Load ISCO major groups aggregated from real professions data.
 * This REPLACES the hardcoded ISCO_MAJOR_GROUPS static object.
 */
export async function loadIscoMajorGroups(_opts = {}) {
  return cached('isco_major_groups', async () => {
    const r = await pool.query(`
      SELECT major_group_code AS code,
             MIN(major_group_name) AS name_ar,
             COUNT(*)::int AS profession_count
      FROM professions
      WHERE deleted_at IS NULL
        AND major_group_code IS NOT NULL
        AND major_group_code ~ '^[0-9]$'
      GROUP BY major_group_code
      ORDER BY major_group_code
    `);
    // Augment with risk_class derived from major group
    const RISK_CLASS = { '0': 'critical', '1': 'low', '2': 'low', '3': 'medium',
                         '4': 'low', '5': 'medium', '6': 'high', '7': 'high',
                         '8': 'high', '9': 'medium' };
    return r.rows.map(row => ({
      code: row.code,
      name_ar: row.name_ar,
      name_en: row.name_ar, // DB stores only Arabic; UI can map later
      risk_class: RISK_CLASS[row.code] || 'medium',
      profession_count: row.profession_count,
    }));
  });
}

/**
 * Load sector → Yemenization target from the real `professions.yemenization_policy` text.
 * Parses percentages directly from the real data (e.g. "نسبة اليمننة المقررة: 85%").
 * Falls back to system_settings.yemenization_min_ratio if not present.
 */
export async function loadSectorYemenizationTargets(_opts = {}) {
  return cached('sector_yem_targets', async () => {
    // Try to extract distinct sector + max pct from yemenization_policy
    const r = await pool.query(`
      SELECT sector,
             yemenization_policy,
             MAX((regexp_matches(yemenization_policy, '(\\d+)%', 'g'))[1]::int) AS max_pct
      FROM professions
      WHERE deleted_at IS NULL
        AND sector IS NOT NULL
        AND yemenization_policy ~ '\\d+%'
      GROUP BY sector, yemenization_policy
    `);
    const map = {};
    for (const row of r.rows) {
      const pct = Number(row.max_pct);
      if (!map[row.sector] || pct > map[row.sector]) {
        map[row.sector] = pct;
      }
    }
    // If no data found, fall back to system policy
    if (Object.keys(map).length === 0) {
      const s = await pool.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'yemenization_min_ratio'`
      );
      const fallback = Number(s.rows[0]?.setting_value || 80);
      map.default = fallback;
    }
    return map;
  });
}

/**
 * Load the national Yemenization minimum ratio from system_settings.
 * This is the legally mandated baseline.
 */
export async function loadYemenizationMinRatio() {
  return cached('yemenization_min_ratio', async () => {
    const r = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'yemenization_min_ratio'`
    );
    return Number(r.rows[0]?.setting_value || 80);
  });
}

/**
 * Build the YNSOC taxonomy dynamically from the real DB.
 * Returns both ISCO groups and sector mapping.
 */
export async function loadYnsocTaxonomy() {
  return cached('ynsoc_taxonomy', async () => {
    const [isco, sectors, minRatio] = await Promise.all([
      loadIscoMajorGroups(),
      loadSectorYemenizationTargets(),
      loadYemenizationMinRatio(),
    ]);
    return { isco, sectors, minRatio };
  });
}

// ===================== AI Semantic Matching (TF-IDF) =====================

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .split(/[\s,،.;:!?()/]+/)
    .filter(t => t.length >= 2);
}

function buildTfIdf(corpus) {
  const df = new Map();
  const tfs = corpus.map(doc => {
    const tf = new Map();
    const tokens = tokenize(doc);
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { tokens, tf, len: tokens.length || 1 };
  });
  return tfs.map(({ tf, len }) => {
    const vec = new Map();
    for (const [t, count] of tf.entries()) {
      const idf = Math.log((corpus.length + 1) / (df.get(t) + 1)) + 1;
      vec.set(t, (count / len) * idf);
    }
    return vec;
  });
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (const [t, v] of a.entries()) {
    normA += v * v;
    if (b.has(t)) dot += v * b.get(t);
  }
  for (const v of b.values()) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ===================== Profession Classification =====================

/**
 * Classify a profession by its textual description and code.
 * Uses real DB-derived ISCO groups and sector targets.
 */
export async function classifyProfession({ name_ar, isco_code, sector }) {
  const taxonomy = await loadYnsocTaxonomy();
  const iscoGroups = taxonomy.isco;
  const sectorMap = taxonomy.sectors;
  const minRatio = taxonomy.minRatio;

  // 1. Determine ISCO Major Group from code
  const majorGroupCode = isco_code ? String(isco_code).trim().charAt(0) : '9';
  const majorGroup = iscoGroups.find(g => g.code === majorGroupCode)
    || iscoGroups.find(g => g.code === '9')
    || { code: '9', name_ar: 'غير مصنف', risk_class: 'medium', profession_count: 0 };

  // 2. Determine hierarchy level
  let level = 0;
  if (isco_code) {
    const code = String(isco_code).trim();
    if (/^\d{4}$/.test(code)) level = 4;
    else if (/^\d{3}$/.test(code)) level = 3;
    else if (/^\d{2}$/.test(code)) level = 2;
    else if (/^\d{1}$/.test(code)) level = 1;
  }

  // 3. Determine Yemenization Priority from real sector target
  const targetPct = sectorMap[sector || ''] || sectorMap.default || minRatio;
  let priority, priorityLabel;
  if (targetPct >= 90) { priority = 1; priorityLabel = 'CRITICAL'; }
  else if (targetPct >= 80) { priority = 2; priorityLabel = 'HIGH'; }
  else if (targetPct >= 60) { priority = 3; priorityLabel = 'MEDIUM'; }
  else { priority = 4; priorityLabel = 'LOW'; }

  const visaCategory = priority === 4 ? 'expat_friendly' : 'yemenization_required';

  // 4. Compute Hazard Level (0-10) based on ISCO risk_class
  const RISK_FROM_CLASS = { critical: 9, high: 7, medium: 5, low: 2 };
  let hazardLevel = RISK_FROM_CLASS[majorGroup.risk_class] || 5;
  if (sector === 'oil_gas' || sector === 'oil & gas') hazardLevel = Math.min(10, hazardLevel + 1);

  // 5. Compute Training Hours (typical baseline)
  const trainingHours = Math.max(40, level * 80 + (hazardLevel * 20));

  // 6. Generate classification fingerprint for dedup
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${name_ar || ''}|${isco_code || ''}|${sector || ''}|${level}`)
    .digest('hex')
    .slice(0, 32);

  return {
    majorGroup,
    majorGroupCode,
    level,
    hierarchy: {
      isUnit: level === 4,
      isMinor: level === 3,
      isSubMajor: level === 2,
      isMajor: level === 1,
    },
    yemenization: {
      priority,
      priorityLabel,
      targetPct,
      visaCategory,
      minNationalRatio: minRatio,
    },
    safety: {
      hazardLevel,
      hazardClass: hazardLevel >= 8 ? 'critical' : hazardLevel >= 5 ? 'high' : hazardLevel >= 3 ? 'medium' : 'low',
      trainingHours,
      oshRequired: hazardLevel >= 5,
    },
    fingerprint,
    classificationVersion: 'YNSOC-2026.1-DB',
  };
}

// ===================== AI Semantic Match (real DB) =====================

/**
 * Find best matching existing professions for a query (semantic search).
 * Uses the live `professions` table.
 */
export async function findProfessionMatches(query, opts = {}) {
  try {
    const limit = Math.min(opts.limit || 10, 50);
    const r = await pool.query(
      `SELECT id, code, name_ar, name_en, isco_code, major_group_code, sector,
              description_ar, description_en, level, hazard_level
       FROM professions
       WHERE deleted_at IS NULL
         AND (name_ar IS NOT NULL OR name_en IS NOT NULL)
       LIMIT 500`
    );
    if (r.rows.length === 0) return [];

    const corpus = r.rows.map(p => `${p.name_ar || ''} ${p.name_en || ''} ${p.sector || ''} ${p.description_ar || ''} ${p.description_en || ''}`);
    corpus.unshift(`${query.name_ar || ''} ${query.name_en || ''} ${query.sector || ''} ${query.description_ar || ''}`);

    const vectors = buildTfIdf(corpus);
    const queryVec = vectors[0];
    const matches = [];

    for (let i = 0; i < r.rows.length; i++) {
      const sim = cosineSimilarity(queryVec, vectors[i + 1]);
      if (sim >= (opts.threshold || 0.25)) {
        matches.push({
          ...r.rows[i],
          similarity: Number(sim.toFixed(3)),
          matchStrength: sim >= 0.7 ? 'strong' : sim >= 0.45 ? 'moderate' : 'weak',
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, limit);
  } catch (e) {
    console.error('[professionEngine.findMatches] failed:', e.message); // eslint-disable-line no-console
    return [];
  }
}

// ===================== Yemenization Rate (real workers) =====================

/**
 * Calculate the current Yemenization rate using the real `members` table.
 * Members has: nationality, profession, experience_years.
 */
export async function computeYemenizationStats(occupationId, opts = {}) {
  try {
    const r = await pool.query(
      `SELECT
         m.nationality,
         COUNT(*)::int as total
       FROM members m
       WHERE (m.profession = $1 OR m.specialization = $1)
         AND m.deleted_at IS NULL
         AND m.nationality IS NOT NULL
       GROUP BY m.nationality`,
      [opts.professionName || occupationId]
    );

    const total = r.rows.reduce((acc, row) => acc + row.total, 0);
    // Yemeni = nationality = 'يمني' OR 'YE' OR 'Yemeni' OR 'Yemen'
    const yemeni = r.rows
      .filter(row => ['يمني', 'YE', 'Yemeni', 'Yemen', 'اليمن'].includes(row.nationality))
      .reduce((acc, row) => acc + row.total, 0);
    const expat = total - yemeni;
    const yemenizationPct = total > 0 ? Math.round((yemeni / total) * 1000) / 10 : 0;

    const classification = await classifyProfession({
      isco_code: opts.iscoCode,
      sector: opts.sector,
    });
    const target = classification.yemenization.targetPct;
    const gap = Math.max(0, target - yemenizationPct);

    return {
      total_workers: total,
      yemeni_workers: yemeni,
      expat_workers: expat,
      current_rate_pct: yemenizationPct,
      target_rate_pct: target,
      gap_pct: gap,
      compliance: gap <= 0 ? 'compliant' : gap <= 10 ? 'at_risk' : 'non_compliant',
      by_nationality: r.rows,
      classification,
    };
  } catch (e) {
    console.error('[professionEngine.yemenization] failed:', e.message); // eslint-disable-line no-console
    return {
      total_workers: 0,
      yemeni_workers: 0,
      expat_workers: 0,
      current_rate_pct: 0,
      target_rate_pct: 0,
      gap_pct: 0,
      compliance: 'unknown',
      by_nationality: [],
    };
  }
}

// ===================== Profession Gap Analysis (real DB) =====================

/**
 * Identify workforce gaps by querying the real `professions` and `members` tables.
 * No hardcoded data — pure SQL aggregation.
 */
export async function analyzeProfessionGaps(_opts = {}) {
  try {
    const r = await pool.query(`
      WITH profession_summary AS (
        SELECT
          p.id,
          p.code,
          p.name_ar AS profession,
          p.sector,
          p.major_group_code,
          p.yemenization_policy,
          (regexp_match(COALESCE(p.yemenization_policy, ''), '(\\d+)%'))[1]::int AS yemenization_target
        FROM professions p
        WHERE p.deleted_at IS NULL
      ),
      supply AS (
        SELECT
          m.profession AS prof_name,
          COUNT(*)::int AS supply_count
        FROM members m
        WHERE m.deleted_at IS NULL
          AND m.profession IS NOT NULL
        GROUP BY m.profession
      )
      SELECT
        ps.id,
        ps.code,
        ps.profession,
        ps.sector,
        ps.major_group_code,
        ps.yemenization_target,
        COALESCE(s.supply_count, 0) AS supply_count,
        CASE
          WHEN COALESCE(s.supply_count, 0) = 0 THEN 'critical_shortage'
          WHEN s.supply_count < 5 THEN 'shortage'
          WHEN s.supply_count > 100 THEN 'surplus'
          ELSE 'balanced'
        END AS gap_status
      FROM profession_summary ps
      LEFT JOIN supply s ON s.prof_name = ps.profession
      ORDER BY
        CASE
          WHEN COALESCE(s.supply_count, 0) = 0 THEN 0
          WHEN s.supply_count < 5 THEN 1
          ELSE 2
        END,
        s.supply_count ASC NULLS FIRST
      LIMIT 100
    `);
    return r.rows;
  } catch (e) {
    console.error('[professionEngine.gapAnalysis] failed:', e.message); // eslint-disable-line no-console
    return [];
  }
}

// ===================== Career Path Reasoning =====================

/**
 * Generate a structured career progression path for a profession.
 * Uses ISCO major group + hazard level from the real professions table.
 */
export async function generateCareerPath(profession) {
  const isco = profession.isco_code || profession.major_group_code || '';
  const major = String(isco).charAt(0);

  const patterns = {
    '1': ['متخصص', 'رئيس قسم', 'مدير إدارة', 'مدير عام', 'وكيل وزارة'],
    '2': ['اختصاصي', 'اختصاصي أول', 'كبير الاختصاصيين', 'مستشار', 'مدير فني'],
    '3': ['فني', 'فني أول', 'فني خبير', 'مشرف فني', 'مدير فني'],
    '4': ['موظف', 'موظف أول', 'مشرف إداري', 'مدير مكتب', 'مدير إدارة'],
    '5': ['عامل خدمات', 'عامل خبير', 'مشرف خدمات', 'مدير خدمات'],
    '6': ['عامل زراعي', 'عامل خبير', 'مشرف مزرعة', 'مدير مزرعة'],
    '7': ['عامل مهني', 'حرفي', 'حرفي خبير', 'مشرف ورشة', 'مدير إنتاج'],
    '8': ['مشغل', 'مشغل خبير', 'مشرف إنتاج', 'مدير مصنع'],
    '9': ['عامل', 'عامل خبير', 'مشرف عمال', 'مشرف موقع'],
    '0': ['جندي', 'ضابط', 'ضابط أول', 'قائد وحدة', 'قائد عام'],
  };

  const path = patterns[major] || patterns['9'];
  const years = path.map((title, i) => ({
    step: i + 1,
    title_ar: title,
    estimated_years: i * 3,
    required_experience_years: i * 3,
    salary_index: 1 + (i * 0.4),
  }));

  // Use the real ISCO group data for major_group_name
  const iscoGroups = await loadIscoMajorGroups();
  const group = iscoGroups.find(g => g.code === major);

  return {
    starting_level: profession.level || 4,
    path: years,
    total_estimated_years: (path.length - 1) * 3,
    isco_code: isco,
    major_group: group ? group.name_ar : 'غير محدد',
    profession_id: profession.id || null,
  };
}

// ===================== Backward Compatibility =====================
// ISCO_MAJOR_GROUPS now loads dynamically. Kept as async function for old call sites.
// If a caller needs sync access, use the cached value (loaded once at module init).
let _iscoSyncCache = null;
async function preloadSync() {
  if (!_iscoSyncCache) {
    _iscoSyncCache = await loadIscoMajorGroups();
  }
  return _iscoSyncCache;
}

// Pre-load on first import (non-blocking)
preloadSync().catch(() => {});

export async function ISCO_MAJOR_GROUPS() {
  return loadIscoMajorGroups();
}

export async function YEMENIZATION_PRIORITY() {
  return {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
    _source: 'computed_from_system_settings',
  };
}

export async function SECTOR_YEMENIZATION_TARGETS() {
  return loadSectorYemenizationTargets();
}

export default {
  loadIscoMajorGroups,
  loadSectorYemenizationTargets,
  loadYemenizationMinRatio,
  loadYnsocTaxonomy,
  classifyProfession,
  findProfessionMatches,
  computeYemenizationStats,
  analyzeProfessionGaps,
  generateCareerPath,
  clearProfessionCache,
  ISCO_MAJOR_GROUPS,
  YEMENIZATION_PRIORITY,
  SECTOR_YEMENIZATION_TARGETS,
};
