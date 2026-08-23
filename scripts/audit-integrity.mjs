#!/usr/bin/env node
/**
 * scripts/audit-integrity.mjs
 * Re-runnable integrity audit for evaluation certificates (Hybrid Typed Extensibility).
 *
 * Gates:
 *   PASS  - no structurally impossible rows (assessed=true without profession)
 *   FAIL  - any broken profession FK, or custom_data keys absent from registry
 *   BLOCKED - cannot reach DB
 *   UNRESOLVED - certificates with profession_id null (honest data gap, left intact)
 *
 * Run: node scripts/audit-integrity.mjs
 */
import pg from 'pg';

const POOL = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require',
  ssl: { rejectUnauthorized: false }, max: 2,
});

const out = { gates: {}, resolved: 0, unresolved: 0, errors: [] };

async function q(text, params = []) {
  const r = await POOL.query(text, params);
  return r.rows;
}

try {
  // 1) Impossible rows: assessed true without profession (constraint should prevent)
  const impossible = await q(
    "select id, certificate_number from evaluation_certificates where assessed_against_standards = true and profession_id is null"
  );
  out.gates.impossible_assessed_without_profession = impossible.length === 0 ? 'PASS' : 'FAIL';
  if (impossible.length) out.errors.push(['impossible', impossible]);

  // 2) Broken profession FK
  const brokenFk = await q(
    `select ec.id, ec.certificate_number, ec.profession_id
     from evaluation_certificates ec
     left join professions p on p.id = ec.profession_id
     where ec.profession_id is not null and p.id is null`
  );
  out.gates.profession_fk_integrity = brokenFk.length === 0 ? 'PASS' : 'FAIL';
  if (brokenFk.length) out.errors.push(['broken_fk', brokenFk]);

  // 3) Unresolved: profession_id null (honest gap, left intact)
  const unresolved = await q(
    "select id, certificate_number from evaluation_certificates where profession_id is null"
  );
  out.unresolved = unresolved.length;
  out.gates.unresolved_review = unresolved.length === 0 ? 'PASS' : 'UNRESOLVED';

  // 4) custom_data keys vs registry (only for rows that have custom_data)
  const defs = await q("select entity_type, field_key from custom_field_definitions where active = true");
  const defSet = new Set(defs.map(d => `${d.entity_type}:${d.field_key}`));
  const withCustom = await q(
    "select id, certificate_number, custom_data from evaluation_certificates where custom_data is not null and custom_data::text <> '{}'"
  );
  let mismatch = 0;
  for (const row of withCustom) {
    for (const k of Object.keys(row.custom_data || {})) {
      if (!defSet.has(`evaluation_certificates:${k}`)) { mismatch++; break; }
    }
  }
  out.gates.custom_data_vs_registry = mismatch === 0 ? 'PASS' : 'FAIL';
  if (mismatch) out.errors.push(['custom_data_mismatch_rows', mismatch]);

  out.resolved = (await q("select count(*)::int n from evaluation_certificates where profession_id is not null")).pop().n;
} catch (e) {
  out.gates.db_reachable = 'BLOCKED';
  out.errors.push(['db_error', e.message]);
} finally {
  await POOL.end();
}

console.log(JSON.stringify(out, null, 2));
process.exitCode = Object.values(out.gates).some(g => g === 'FAIL' || g === 'BLOCKED') ? 1 : 0;
