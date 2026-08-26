// تطبيق ترحيل رسمي على القاعدة الحية — يستخدم DATABASE_URL من .env
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const root = resolve(process.cwd());
let env = {};
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\r\n]*)"?/);
    if (m) env[m[1]] = m[2];
  }
}
const url = process.env.DATABASE_URL || env.DATABASE_URL || env.NEON_DATABASE_URL;
if (!url) { console.error('NO_DB_URL'); process.exit(1); }

const migrationFile = process.argv[2];
if (!migrationFile) { console.error('USAGE: node apply-migration.mjs <migration.sql>'); process.exit(1); }
const sqlPath = resolve(root, migrationFile);
if (!existsSync(sqlPath)) { console.error('MIGRATION_NOT_FOUND', sqlPath); process.exit(1); }

const sql = readFileSync(sqlPath, 'utf8');
// مرحلة 1: استخراج عبارات ALTER TYPE ADD VALUE (تتطلب autocommit) بغضّ النظر عن العلامات
const alterRe = /ALTER\s+TYPE\s+\w+\s+ADD\s+VALUE\s+IF\s+NOT\s+EXISTS\s+'[^']+'\s*;/gi;
const alterStatements = sql.match(alterRe) || [];
const mainPart = alterStatements.length ? sql.replace(alterRe, '') : sql;
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  let donePre = 0;
  for (const stmt of alterStatements) {
    await client.query(stmt);
    donePre++;
  }
  console.log('PRELUDE_STATEMENTS_APPLIED', donePre);

  await client.query('BEGIN');
  try {
    await client.query(mainPart);
    await client.query('COMMIT');
    console.log('APPLIED_OK', migrationFile);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('APPLY_FAILED', e.message);
    process.exit(2);
  }

  // تحقق فعلي بعد التطبيق
  const verify = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('dynamic_fields','sync_log')
    ORDER BY table_name`);
  console.log('VERIFY_TABLES', verify.rows.map(r => r.table_name).join(','));
  const colsDf = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name='dynamic_fields' ORDER BY ordinal_position`);
  const colsSl = await client.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name='sync_log' ORDER BY ordinal_position`);
  console.log('DYNAMIC_FIELDS_COLS', colsDf.rowCount, '| SYNC_LOG_COLS', colsSl.rowCount);
  const totalTables = await client.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`);
  console.log('TOTAL_TABLES', totalTables.rows[0].n);
} finally {
  await client.end();
}
