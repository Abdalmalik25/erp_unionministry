import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
await c.connect();

const fixes = [
  `ALTER TABLE unified_registry_entries ADD COLUMN IF NOT EXISTS entry_type TEXT`,
  `ALTER TABLE unified_registry_entries ADD COLUMN IF NOT EXISTS data_snapshot TEXT`,
  `ALTER TABLE unified_registry_entries ADD COLUMN IF NOT EXISTS synced_across_portals BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE unified_registry_entries ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ`,
  // Backfill from existing migration columns where possible
  `UPDATE unified_registry_entries SET entry_type = registry_type WHERE entry_type IS NULL`,
  `UPDATE unified_registry_entries SET data_snapshot = data WHERE data_snapshot IS NULL OR data_snapshot = '{}'::jsonb`,
  `UPDATE unified_registry_entries SET last_synced_at = synced_at WHERE last_synced_at IS NULL`,
];

for (const sql of fixes) {
  try {
    const r = await c.query(sql);
    console.log(`OK  ${r.command} (${r.rowCount || 0}) :: ${sql.slice(0, 80)}`);
  } catch (e) {
    console.log(`ERR ${e.message.slice(0, 120)} :: ${sql.slice(0, 60)}`);
  }
}
await c.end();