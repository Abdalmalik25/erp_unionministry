import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Column check for both tables
for (const t of ['violations', 'organizational_entities']) {
  const r = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = $1 ORDER BY ordinal_position
  `, [t]);
  console.log(`\n${t} columns:`);
  console.log(' ', r.rows.map(c => c.column_name).join(', '));
}

// Test the exact query from compliance.js
try {
  const r = await pool.query(`
    SELECT v.id, v.entity_id, v.violation_number, v.violation_type, v.violation_name, v.severity, v.status,
           v.description, v.legal_basis, v.detected_date, v.detected_by, v.decision_date, v.decision,
           v.penalty, v.penalty_amount, v.resolved_date, v.resolved_by, v.resolution_notes,
           v.appeal_date, v.appeal_status, v.appeal_decision, v.evidence_urls, v.created_at,
           v.created_by, v.updated_at, v.deleted_at, e.name_ar as entity_name
    FROM violations v
    JOIN organizational_entities e ON v.entity_id = e.entity_id
    WHERE 1=1 AND v.deleted_at IS NULL
    ORDER BY v.created_at DESC LIMIT 20 OFFSET 0
  `);
  console.log('\nQuery OK, rows:', r.rows.length);
} catch (e) {
  console.log('\nQuery FAILED:', e.message);
}

await pool.end();