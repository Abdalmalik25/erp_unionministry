import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const t = await p.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('audit_log','user_sessions','login_attempts') ORDER BY table_name, ordinal_position`);
console.log(t.rows.map(r => `${r.table_name}.${r.column_name} (${r.data_type})`).join('\n'));
await p.end();