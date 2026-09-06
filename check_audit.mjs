import pg from 'pg';
const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require";

console.log('Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({ 
  connectionString, 
  ssl: { rejectUnauthorized: false } 
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

async function checkAudit() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database successfully');
    
    // التحقق من وجود الجدول
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log'
      )
    `);
    console.log('audit_log table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Table audit_log does not exist');
      return;
    }

    // عدد السجلات الكلي
    const count = await client.query(`SELECT COUNT(*) as total FROM audit_log`);
    console.log('Total audit records:', count.rows[0].total);

    // آخر 30 عملية تدقيق
    const r = await client.query(`
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
    console.log('\n=== آخر 30 عملية تدقيق ===');
    console.table(r.rows);

    // تجميع حسب IP
    const byIp = await client.query(`
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
    const users = await client.query(`
      SELECT DISTINCT actor_id, COUNT(*) as ops
      FROM audit_log
      WHERE actor_id IS NOT NULL
      GROUP BY actor_id
      ORDER BY ops DESC
    `);
    console.log('\n=== المستخدمين النشطين ===');
    console.table(users.rows);

    // أنواع العمليات
    const actions = await client.query(`
      SELECT action, COUNT(*) as count
      FROM audit_log
      GROUP BY action
      ORDER BY count DESC
    `);
    console.log('\n=== أنواع العمليات ===');
    console.table(actions.rows);

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
checkAudit();