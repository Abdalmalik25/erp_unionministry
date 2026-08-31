// server/utils/referentialIntegrity.js
// Referential integrity checks before DELETE/CASCADE operations
// Prevents orphan records and ensures relationship consistency

import { pool } from '../middleware/shared.js';

/**
 * Check if a record has dependent records in any related table
 * Returns list of { table, count, fkColumn } for each dependency
 */
export async function checkReferentialIntegrity(table, id) {
  const dependencies = {
    // entities → children
    commercial_entities: [
      { table: 'members', fk: 'entity_id' },
      { table: 'workers', fk: 'entity_id' },
      { table: 'employment_contracts', fk: 'entity_id' },
      { table: 'inspections', fk: 'enterprise_id' },
      { table: 'violations', fk: 'entity_id' },
      { table: 'licenses', fk: 'entity_id' },
      { table: 'audit_log', fk: 'resource_id' },
    ],
    persons: [
      { table: 'members', fk: 'person_id' },
      { table: 'workers', fk: 'person_id' },
      { table: 'employment_contracts', fk: 'worker_person_id' },
    ],
    sector_users: [
      { table: 'audit_log', fk: 'user_id' },
      { table: 'login_attempts', fk: 'user_id' },
      { table: 'sessions', fk: 'user_id' },
    ],
    // Add more as schema evolves
  };

  const tableDeps = dependencies[table];
  if (!tableDeps) return [];

  const results = [];
  for (const { table: depTable, fk } of tableDeps) {
    try {
      const res = await pool.query(
        `SELECT COUNT(*)::int as cnt FROM "${depTable}" WHERE "${fk}" = $1 AND deleted_at IS NULL`,
        [id],
      );
      if (res.rows[0]?.cnt > 0) {
        results.push({ table: depTable, fk, count: res.rows[0].cnt });
      }
    } catch (e) {
      // Table might not have deleted_at or FK column might differ — skip
      console.warn(`[RefIntegrity] skipped ${depTable}: ${e.message}`);
    }
  }

  return results;
}

/**
 * Validate that an ID actually exists in the target table
 */
export async function recordExists(table, id) {
  try {
    const res = await pool.query(
      `SELECT 1 FROM "${table}" WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    return res.rows.length > 0;
  } catch (e) {
    console.error(`[RefIntegrity] exists check failed for ${table}/${id}:`, e);
    return false;
  }
}

/**
 * Get all orphan records (records pointing to deleted/non-existent parents)
 * Used in data quality checks
 */
export async function findOrphans(childTable, fkColumn, parentTable) {
  try {
    const res = await pool.query(`
      SELECT c.id, c."${fkColumn}" as orphan_ref
      FROM "${childTable}" c
      LEFT JOIN "${parentTable}" p ON c."${fkColumn}" = p.id
      WHERE c."${fkColumn}" IS NOT NULL
        AND p.id IS NULL
        AND c.deleted_at IS NULL
      LIMIT 500
    `);
    return res.rows;
  } catch (e) {
    console.error(`[RefIntegrity] orphan check failed:`, e);
    return [];
  }
}

/**
 * Batch integrity report for all known relationships
 */
export async function generateIntegrityReport() {
  const checks = [
    { child: 'members', fk: 'entity_id', parent: 'commercial_entities' },
    { child: 'workers', fk: 'entity_id', parent: 'commercial_entities' },
    { child: 'employment_contracts', fk: 'entity_id', parent: 'commercial_entities' },
    { child: 'inspections', fk: 'enterprise_id', parent: 'commercial_entities' },
    { child: 'violations', fk: 'entity_id', parent: 'commercial_entities' },
    { child: 'members', fk: 'person_id', parent: 'persons' },
    { child: 'workers', fk: 'person_id', parent: 'persons' },
  ];

  const report = [];
  for (const { child, fk, parent } of checks) {
    const orphans = await findOrphans(child, fk, parent);
    if (orphans.length > 0) {
      report.push({ child, fk, parent, orphanCount: orphans.length, samples: orphans.slice(0, 5) });
    }
  }

  return {
    checked: checks.length,
    issuesFound: report.length,
    issues: report,
    generatedAt: new Date().toISOString(),
  };
}
