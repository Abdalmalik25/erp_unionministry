import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const a = await p.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='user_sessions' ORDER BY ordinal_position");
console.log('SESSIONS:', a.rows.map(r => r.column_name + ':' + r.data_type).join(' | '));
const b = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='audit_log' ORDER BY ordinal_position");
console.log('AUDIT:', b.rows.map(r => r.column_name).join(','));
await p.end();