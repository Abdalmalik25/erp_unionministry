// إعادة حساب مدير النظام إلى حالة «كلمة مرور ابتدائية» ليظهر له تنبيه التغيير عند الدخول
import pg from 'pg';
import fs from 'node:fs';

const url = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
await pool.query('UPDATE sector_users SET password_changed_at = NULL WHERE email = $1', ['sys.admin@mosal.gov.ye']);
const { rows } = await pool.query('SELECT email, password_changed_at FROM sector_users WHERE email = $1', ['sys.admin@mosal.gov.ye']);
console.log(rows[0]);
await pool.end();
