const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkAudit() {
  try {
    // آخر 30 عملية تدقيق
    const r = await pool.query(`
      SELECT 
        action,
        table_name as resource_type,
        actor_id as user_id,
        notes::json->>'ip' as ip_address,
        notes::json->>'user_agent' as device,
        notes::json->>'session_id' as session,
        created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT 30
    `);
    console.log('=== آخر 30 عملية تدقيق ===');
    console.table(r.rows);

    // تجميع حسب IP
    const byIp = await pool.query(`
      SELECT 
        notes::json->>'ip' as ip_address,
        COUNT(*) as operations,
        MAX(created_at) as last_seen,
        MIN(created_at) as first_seen
      FROM audit_log
      WHERE notes::json->>'ip' IS NOT NULL
      GROUP BY notes::json->>'ip'
      ORDER BY operations DESC
    `);
    console.log('\n=== العمليات مجمعة حسب IP ===');
    console.table(byIp.rows);

    // مستخدمين فريدين
    const users = await pool.query(`
      SELECT DISTINCT actor_id, COUNT(*) as ops
      FROM audit_log
      WHERE actor_id IS NOT NULL
      GROUP BY actor_id
      ORDER BY ops DESC
    `);
    console.log('\n=== المستخدمين النشطين ===');
    console.table(users.rows);

    // أنواع العمليات
    const actions = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_log
      GROUP BY action
      ORDER BY count DESC
    `);
    console.log('\n=== أنواع العمليات ===');
    console.table(actions.rows);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
checkAudit();