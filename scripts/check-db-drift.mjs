/**
 * check-db-drift.mjs — فحص رسمي لاتصال قاعدة الإنتاج (Neon PostgreSQL) وانحراف المخطط
 * استشعار آمن read-only: لا يطبع الـ connection string أبداً — يُعيد OK/FAIL فقط.
 * الاستخدام: npm run db:drift
 */
import pg from 'pg';
import fs from 'fs';

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const m = env.match(/^DATABASE_URL\s*=\s*(.+)$/m) || env.match(/^NEON_DATABASE_URL\s*=\s*(.+)$/m);
if (!m) { console.log('RESULT: NO_DATABASE_URL'); process.exit(2); }
const url = m[1].trim().replace(/^["']|["']$/g, '');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 12000 });
try {
  await client.connect();
  const r = await client.query('SELECT 1::int AS ok');
  console.log('RESULT: DB_CONNECTED ok=' + r.rows[0].ok);

  // فحص read-only: قوائم الجداول والعدد (بدون أي سر)
  const t = await client.query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema','supabase') ORDER BY tablename");
  const liveTables = new Set(t.rows.map(r => r.tablename));
  console.log('TABLE_COUNT: ' + liveTables.size);

  // === فحص التوافق (schema drift) === read-only
  let definedTables = [];
  const sqlPath = 'src/app/utils/schema_comprehensive.sql';
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?([A-Za-z_][A-Za-z0-9_]*)"?\s)/gi;
    let mt;
    while ((mt = re.exec(sql)) !== null) {
      definedTables.push(mt[1].toLowerCase());
    }
  }
  const defined = new Set([...new Set(definedTables)]);
  const missing = [...defined].filter(name => !liveTables.has(name));
  console.log('SCHEMA_DEF_TABLES: ' + defined.size);
  console.log('DRIFT_MISSING_COUNT: ' + missing.length);
  if (missing.length) {
    console.log('DRIFT_MISSING: ' + missing.join(', '));
  } else {
    console.log('DRIFT_STATUS: SYNCHRONIZED (all defined tables present live)');
  }
  await client.end();
  process.exit(0);
} catch (e) {
  const redact = String((e && e.message) || e).replace(url, '[REDACTED]');
  console.log('RESULT: DB_CONNECT_FAILED ' + redact.slice(0, 180));
  process.exit(1);
}

