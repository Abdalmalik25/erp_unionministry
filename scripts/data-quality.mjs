/**
 * data-quality.mjs — Data Quality & Duplication Analysis
 * UnionSphere Enterprise
 *
 * Connects to Neon PostgreSQL, runs analysis queries, and writes
 * results to docs/DATA_QUALITY_REPORT.md and docs/DUPLICATION_REPORT.md.
 *
 * Usage: node scripts/data-quality.mjs
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

function loadEnv() {
  const raw = readFileSync(join(ROOT, '.env'), 'utf8');
  const vars = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}

function fmt(n, total) {
  if (!total) return 'N/A';
  return ((n / total) * 100).toFixed(1) + '%';
}

function mdTable(headers, rows) {
  const lines = [];
  lines.push('| ' + headers.join(' | ') + ' |');
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const row of rows) {
    lines.push('| ' + row.map(String).join(' | ') + ' |');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Analysis runners
// ---------------------------------------------------------------------------

async function completenessCheck(client) {
  const tables = [
    {
      name: 'organizational_entities',
      totalCol: 'entity_id',
      columns: ['name_ar', 'email', 'phone', 'governorate', 'entity_type', 'status', 'member_count'],
    },
    {
      name: 'members',
      totalCol: 'id',
      columns: ['full_name', 'national_id', 'gender', 'profession', 'governorate', 'phone'],
    },
    {
      name: 'professions',
      totalCol: 'id',
      columns: ['name_ar', 'isco_code', 'sector'],
    },
  ];

  const results = [];
  for (const t of tables) {
    const totalRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM ${t.name}`);
    const total = totalRes.rows[0].cnt;
    const row = { table: t.name, total };
    for (const col of t.columns) {
      try {
        const res = await client.query(
          `SELECT COUNT(*)::int AS filled FROM ${t.name} WHERE ${col} IS NOT NULL AND ${col}::text != ''`
        );
        row[col] = { filled: res.rows[0].filled, pct: fmt(res.rows[0].filled, total) };
      } catch {
        row[col] = { filled: '-', pct: 'column missing' };
      }
    }
    results.push(row);
  }
  return results;
}

async function referentialIntegrity(client) {
  const checks = [
    {
      name: 'members → organizational_entities',
      query: `SELECT COUNT(*)::int AS orphaned FROM members m
              LEFT JOIN organizational_entities oe ON oe.entity_id = m.entity_id
              WHERE oe.entity_id IS NULL`,
    },
    {
      name: 'violations → organizational_entities',
      query: `SELECT COUNT(*)::int AS orphaned FROM violations v
              LEFT JOIN organizational_entities oe ON oe.entity_id = v.entity_id
              WHERE oe.entity_id IS NULL`,
    },
    {
      name: 'inspections → organizational_entities',
      query: `SELECT COUNT(*)::int AS orphaned FROM inspections i
              LEFT JOIN organizational_entities oe ON oe.entity_id = i.entity_id
              WHERE oe.entity_id IS NULL`,
    },
    {
      name: 'activities → organizational_entities',
      query: `SELECT COUNT(*)::int AS orphaned FROM activities a
              LEFT JOIN organizational_entities oe ON oe.entity_id = a.entity_id
              WHERE oe.entity_id IS NULL`,
    },
    {
      name: 'board_members → organizational_entities',
      query: `SELECT COUNT(*)::int AS orphaned FROM board_members bm
              LEFT JOIN organizational_entities oe ON oe.entity_id = bm.entity_id
              WHERE oe.entity_id IS NULL`,
    },
  ];

  const results = [];
  for (const c of checks) {
    try {
      const res = await client.query(c.query);
      results.push({ relationship: c.name, orphaned: res.rows[0].orphaned });
    } catch (err) {
      results.push({ relationship: c.name, orphaned: 'table missing: ' + err.message.split('\n')[0] });
    }
  }
  return results;
}

async function duplicateDetection(client) {
  const checks = [
    {
      label: 'Entities with same name_ar',
      query: `SELECT name_ar, COUNT(*)::int AS cnt
              FROM organizational_entities
              WHERE deleted_at IS NULL
              GROUP BY name_ar HAVING COUNT(*) > 1
              ORDER BY cnt DESC LIMIT 20`,
    },
    {
      label: 'Members with same national_id',
      query: `SELECT national_id, COUNT(*)::int AS cnt
              FROM members
              GROUP BY national_id HAVING COUNT(*) > 1
              ORDER BY cnt DESC LIMIT 20`,
    },
    {
      label: 'Professions with same isco_code',
      query: `SELECT isco_code, name_ar, COUNT(*)::int AS cnt
              FROM professions
              WHERE isco_code IS NOT NULL
              GROUP BY isco_code, name_ar HAVING COUNT(*) > 1
              ORDER BY cnt DESC LIMIT 20`,
    },
  ];

  const results = [];
  for (const c of checks) {
    try {
      const res = await client.query(c.query);
      results.push({ label: c.label, rows: res.rows });
    } catch (err) {
      results.push({ label: c.label, rows: [], error: err.message.split('\n')[0] });
    }
  }
  return results;
}

async function dataDistribution(client) {
  const queries = [
    {
      label: 'Entities by entity_type',
      query: `SELECT entity_type AS value, COUNT(*)::int AS count
              FROM organizational_entities WHERE deleted_at IS NULL
              GROUP BY entity_type ORDER BY count DESC`,
    },
    {
      label: 'Entities by status',
      query: `SELECT status::text AS value, COUNT(*)::int AS count
              FROM organizational_entities WHERE deleted_at IS NULL
              GROUP BY status ORDER BY count DESC`,
    },
    {
      label: 'Entities by governorate',
      query: `SELECT governorate AS value, COUNT(*)::int AS count
              FROM organizational_entities WHERE deleted_at IS NULL
              GROUP BY governorate ORDER BY count DESC`,
    },
    {
      label: 'Members by gender',
      query: `SELECT gender::text AS value, COUNT(*)::int AS count
              FROM members GROUP BY gender ORDER BY count DESC`,
    },
    {
      label: 'Members by membership_type',
      query: `SELECT membership_type AS value, COUNT(*)::int AS count
              FROM members GROUP BY membership_type ORDER BY count DESC`,
    },
  ];

  const results = [];
  for (const q of queries) {
    try {
      const res = await client.query(q.query);
      results.push({ label: q.label, rows: res.rows });
    } catch (err) {
      results.push({ label: q.label, rows: [], error: err.message.split('\n')[0] });
    }
  }
  return results;
}

async function enumValidation(client) {
  const enums = {
    entity_type: ['union', 'organization', 'federation', 'branch', 'committee', 'department', 'unit', 'office'],
    status: ['active', 'suspended', 'inactive', 'dissolved', 'under_review'],
    severity: ['minor', 'moderate', 'major', 'critical'],
    compliance_status: ['compliant', 'non_compliant', 'under_review', 'warned', 'sanctioned'],
  };

  const results = [];

  // organizational_entities checks
  for (const [enumName, allowed] of Object.entries(enums)) {
    const col = enumName === 'severity' ? 'severity' : enumName;
    const table = enumName === 'severity' ? 'violations' : 'organizational_entities';
    try {
      const res = await client.query(
        `SELECT DISTINCT ${col}::text AS value FROM ${table}
         WHERE ${col}::text NOT IN (${allowed.map((a) => `'${a}'`).join(',')})`
      );
      results.push({
        table,
        column: enumName,
        invalid_values: res.rows.map((r) => r.value),
        valid_enums: allowed,
      });
    } catch (err) {
      results.push({
        table,
        column: enumName,
        invalid_values: [],
        error: err.message.split('\n')[0],
      });
    }
  }

  return results;
}

async function dateAnalysis(client) {
  const checks = [];

  // Expired licenses
  try {
    const res = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM licenses WHERE expiry_date < CURRENT_DATE AND status = 'valid'`
    );
    checks.push({ label: 'Entities with expired licenses (status=valid)', count: res.rows[0].cnt });
  } catch (err) {
    checks.push({ label: 'Entities with expired licenses', count: err.message.split('\n')[0] });
  }

  // Members with future join_date
  try {
    const res = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM members WHERE join_date > CURRENT_DATE`
    );
    checks.push({ label: 'Members with future join_date', count: res.rows[0].cnt });
  } catch (err) {
    checks.push({ label: 'Members with future join_date', count: err.message.split('\n')[0] });
  }

  // Overdue inspections (next_inspection_date in the past)
  try {
    const res = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM organizational_entities
       WHERE next_inspection_date < CURRENT_DATE AND deleted_at IS NULL`
    );
    checks.push({ label: 'Entities with overdue inspections', count: res.rows[0].cnt });
  } catch (err) {
    checks.push({ label: 'Entities with overdue inspections', count: err.message.split('\n')[0] });
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Report generators
// ---------------------------------------------------------------------------

function buildDataQualityReport(
  completeness,
  referential,
  distribution,
  enumVals,
  dates,
  totalEntities,
  totalMembers
) {
  const lines = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  lines.push('# Data Quality Report');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push('');
  lines.push(`**Total entities:** ${totalEntities} | **Total members:** ${totalMembers}`);
  lines.push('');

  // 1. Completeness
  lines.push('## 1. Completeness Check');
  lines.push('');
  lines.push('Percentage of non-null, non-empty values for critical columns.');
  lines.push('');

  for (const t of completeness) {
    lines.push(`### ${t.table} (${t.total} rows)`);
    lines.push('');
    const headers = ['Column', 'Filled', '% Complete'];
    const rows = [];
    for (const [key, val] of Object.entries(t)) {
      if (key === 'table' || key === 'total') continue;
      if (typeof val === 'object' && val !== null) {
        rows.push([key, val.filled, val.pct]);
      } else {
        rows.push([key, val, '']);
      }
    }
    lines.push(mdTable(headers, rows));
    lines.push('');
  }

  // 2. Referential Integrity
  lines.push('## 2. Referential Integrity');
  lines.push('');
  lines.push('Orphaned records where the foreign key points to a non-existent parent.');
  lines.push('');
  const riHeaders = ['Relationship', 'Orphaned Records'];
  const riRows = referential.map((r) => [r.relationship, r.orphaned]);
  lines.push(mdTable(riHeaders, riRows));
  lines.push('');

  // 3. Data Distribution
  lines.push('## 3. Data Distribution');
  lines.push('');
  for (const d of distribution) {
    lines.push(`### ${d.label}`);
    lines.push('');
    if (d.error) {
      lines.push(`> Error: ${d.error}`);
    } else if (d.rows.length === 0) {
      lines.push('No data found.');
    } else {
      lines.push(mdTable(['Value', 'Count'], d.rows.map((r) => [r.value, r.count])));
    }
    lines.push('');
  }

  // 4. Enum Validation
  lines.push('## 4. Enum Validation');
  lines.push('');
  const evHeaders = ['Table', 'Column', 'Invalid Values', 'Valid Enums'];
  const evRows = enumVals.map((e) => [
    e.table,
    e.column,
    e.invalid_values.length ? e.invalid_values.join(', ') : e.error || 'None found',
    e.valid_enums.join(', '),
  ]);
  lines.push(mdTable(evHeaders, evRows));
  lines.push('');

  // 5. Date Analysis
  lines.push('## 5. Date Analysis');
  lines.push('');
  const dtHeaders = ['Check', 'Count'];
  const dtRows = dates.map((d) => [d.label, d.count]);
  lines.push(mdTable(dtHeaders, dtRows));
  lines.push('');

  lines.push('---');
  lines.push('*End of Data Quality Report*');
  return lines.join('\n');
}

function buildDuplicationReport(duplicates) {
  const lines = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  lines.push('# Duplication Report');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push('');

  // 1. Entity name duplicates
  const entityDups = duplicates.find((d) => d.label.includes('Entities with same name_ar'));
  lines.push('## 1. Entities with Duplicate name_ar');
  lines.push('');
  if (entityDups.error) {
    lines.push(`> ${entityDups.error}`);
  } else if (entityDups.rows.length === 0) {
    lines.push('No duplicate entity names found.');
  } else {
    lines.push(`Found **${entityDups.rows.length}** duplicate name groups.`);
    lines.push('');
    lines.push(mdTable(['name_ar', 'Count'], entityDups.rows.map((r) => [r.name_ar, r.cnt])));
  }
  lines.push('');

  // 2. Member national_id duplicates
  const memberDups = duplicates.find((d) => d.label.includes('Members with same national_id'));
  lines.push('## 2. Members with Duplicate national_id');
  lines.push('');
  if (memberDups.error) {
    lines.push(`> ${memberDups.error}`);
  } else if (memberDups.rows.length === 0) {
    lines.push('No duplicate member national IDs found.');
  } else {
    lines.push(`Found **${memberDups.rows.length}** duplicate national_id groups.`);
    lines.push('');
    lines.push(mdTable(['national_id', 'Count'], memberDups.rows.map((r) => [r.national_id, r.cnt])));
  }
  lines.push('');

  // 3. Profession isco_code duplicates
  const profDups = duplicates.find((d) => d.label.includes('Professions with same isco_code'));
  lines.push('## 3. Professions with Duplicate isco_code');
  lines.push('');
  if (profDups.error) {
    lines.push(`> ${profDups.error}`);
  } else if (profDups.rows.length === 0) {
    lines.push('No duplicate profession ISCO codes found.');
  } else {
    lines.push(`Found **${profDups.rows.length}** duplicate isco_code groups.`);
    lines.push('');
    lines.push(
      mdTable(['isco_code', 'name_ar', 'Count'], profDups.rows.map((r) => [r.isco_code, r.name_ar, r.cnt]))
    );
  }
  lines.push('');

  lines.push('---');
  lines.push('*End of Duplication Report*');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== UnionSphere Data Quality Analysis ===');
  console.log('');

  const env = loadEnv();
  const connectionString = env.DATABASE_URL || env.NEON_DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connecting to Neon PostgreSQL...');
  await client.connect();
  console.log('Connected.\n');

  // Row counts
  let totalEntities = 0;
  let totalMembers = 0;
  try {
    const eRes = await client.query('SELECT COUNT(*)::int AS cnt FROM organizational_entities WHERE deleted_at IS NULL');
    totalEntities = eRes.rows[0].cnt;
  } catch { /* table may not exist */ }
  try {
    const mRes = await client.query('SELECT COUNT(*)::int AS cnt FROM members');
    totalMembers = mRes.rows[0].cnt;
  } catch { /* table may not exist */ }

  console.log(`Entities: ${totalEntities} | Members: ${totalMembers}\n`);

  // 1. Completeness
  console.log('1/6 Completeness check...');
  const completeness = await completenessCheck(client);

  // 2. Referential integrity
  console.log('2/6 Referential integrity...');
  const referential = await referentialIntegrity(client);

  // 3. Duplicate detection
  console.log('3/6 Duplicate detection...');
  const duplicates = await duplicateDetection(client);

  // 4. Data distribution
  console.log('4/6 Data distribution...');
  const distribution = await dataDistribution(client);

  // 5. Enum validation
  console.log('5/6 Enum validation...');
  const enumVals = await enumValidation(client);

  // 6. Date analysis
  console.log('6/6 Date analysis...');
  const dates = await dateAnalysis(client);

  await client.end();
  console.log('Database connection closed.\n');

  // Generate reports
  mkdirSync(DOCS, { recursive: true });

  const qualityReport = buildDataQualityReport(
    completeness,
    referential,
    distribution,
    enumVals,
    dates,
    totalEntities,
    totalMembers
  );
  const qualityPath = join(DOCS, 'DATA_QUALITY_REPORT.md');
  writeFileSync(qualityPath, qualityReport, 'utf8');
  console.log('Written: ' + qualityPath);

  const dupReport = buildDuplicationReport(duplicates);
  const dupPath = join(DOCS, 'DUPLICATION_REPORT.md');
  writeFileSync(dupPath, dupReport, 'utf8');
  console.log('Written: ' + dupPath);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
