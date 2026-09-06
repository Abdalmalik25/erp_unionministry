import pg from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
const existing = new Set(r.rows.map(x => x.table_name));

const migrationDir = path.join('supabase', 'migrations');
const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
const tableRe = /CREATE TABLE IF NOT EXISTS\s+(\w+)/g;

let summary = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(migrationDir, f), 'utf8');
  const tables = [];
  let m;
  while ((m = tableRe.exec(src))) tables.push(m[1]);
  if (!tables.length) { continue; }
  const missing = tables.filter(t => !existing.has(t));
  const status = missing.length === 0 ? 'APPLIED' : (missing.length === tables.length ? 'MISSING-ALL' : 'PARTIAL');
  summary.push({ file: f, status, total: tables.length, missingCount: missing.length });
}

console.log('Migration application status vs Neon DB:\n');
for (const s of summary) {
  console.log(`${s.status.padEnd(11)} ${String(s.missingCount).padStart(2)}/${s.total} missing  ${s.file}`);
}
await pool.end();