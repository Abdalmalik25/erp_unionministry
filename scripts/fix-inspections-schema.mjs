/**
 * fix-inspections-schema.mjs
 * Additive ALTER to the existing (empty) `inspections` table so the gateway
 * inspection-workflow router (server/routes/inspections.js) works, WITHOUT
 * disturbing the enterprise-evaluation columns used by BI functions/views.
 * Idempotent (ADD COLUMN IF NOT EXISTS). Run: node --env-file=.env ...
 */
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
await c.connect();

const cols = [
  ['case_number', 'TEXT'],
  ['type', 'TEXT'],
  ['status', 'TEXT'],
  ['priority', 'TEXT'],
  ['entity_id', 'UUID'],
  ['entity_name', 'TEXT'],
  ['entity_type', 'TEXT'],
  ['entity_license', 'TEXT'],
  ['address', 'TEXT'],
  ['governorate', 'TEXT'],
  ['directorate', 'TEXT'],
  ['coordinates', 'JSONB'],
  ['schedule', 'JSONB'],
  ['trigger_reason', 'TEXT'],
  ['complaint_id', 'UUID'],
  ['dispute_id', 'UUID'],
  ['osh_incident_id', 'UUID'],
  ['notes', 'TEXT'],
  ['created_by', 'UUID'],
  ['sla_status', 'TEXT'],
  ['inspector', 'UUID'],
  ['inspector_name', 'TEXT'],
  ['assigned_inspector', 'UUID'],
  ['start_time', 'TIMESTAMPTZ'],
  ['area_inspected', 'JSONB'],
  ['end_time', 'TIMESTAMPTZ'],
  ['actual_duration', 'INTEGER'],
  ['areas_not_accessible', 'JSONB'],
  ['summary', 'TEXT'],
  ['osh_context', 'JSONB'],
  ['previous_inspection_id', 'UUID'],
  ['cancellation_reason', 'TEXT'],
  ['legal_escalation_note', 'TEXT'],
  ['legal_team_id', 'UUID'],
  ['scheduled_date', 'TIMESTAMPTZ'],
  ['scheduled_time', 'TEXT'],
];

for (const [name, dtype] of cols) {
  try {
    await c.query(`ALTER TABLE inspections ADD COLUMN IF NOT EXISTS ${name} ${dtype}`);
    console.log(`OK  ${name} ${dtype}`);
  } catch (e) {
    console.log(`ERR ${name}: ${e.message.slice(0, 100)}`);
  }
}
await c.end();