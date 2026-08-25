import fs from 'node:fs';
import pg from 'pg';
const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });

await pool.query(`
  INSERT INTO system_settings (setting_key, setting_value, category, description)
  VALUES ('system_name_en', 'National Labour Sector Management Platform', 'identity', 'التسمية الدولية الرسمية للمنظومة')
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
`);
const { rows } = await pool.query(
  `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('system_name_ar','system_name_en')`
);
console.log(JSON.stringify(rows, null, 1));
await pool.end();
