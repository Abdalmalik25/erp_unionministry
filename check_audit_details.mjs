import pg from 'pg';
const { Pool } = pg;

const connectionString = "postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require";

const pool = new Pool({ 
  connectionString, 
  ssl: { rejectUnauthorized: false } 
});

async function checkDetails() {
  let client;
  try {
    client = await pool.connect();
    
    // عمليات غير LOGIN/LOGOUT من IPs خارجية
    const nonLogin = await client.query(`
      SELECT 
        action,
        table_name as resource_type,
        actor_id as user_id,
        notes::json->>'ip' as ip_address,
        notes::json->>'user_agent' as device,
        notes,
        created_at
      FROM audit_log
      WHERE action NOT IN ('LOGIN', 'LOGOUT', 'LOGIN_FAILED')
        AND notes::json->>'ip' IS NOT NULL
        AND notes::json->>'ip' != '127.0.0.1'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    console.log('=== عمليات بيانات (غير تسجيل دخول) من IPs خارجية ===');
    console.table(nonLogin.rows);

    // تفاصيل المستخدم 924a999f (الأكثر نشاطاً)
    const userDetails = await client.query(`
      SELECT 
        action,
        table_name as resource_type,
        notes::json->>'ip' as ip_address,
        notes::json->>'user_agent' as device,
        notes,
        created_at
      FROM audit_log
      WHERE actor_id = '924a999f-573d-404d-b32d-38ae8e479c78'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('\n=== تفاصيل المستخدم 924a999f (الأكثر نشاطاً - 67 عملية) ===');
    console.table(userDetails.rows);

    // محاولات تسجيل دخول فاشلة
    const failed = await client.query(`
      SELECT 
        notes::json->>'ip' as ip_address,
        notes::json->>'user_agent' as device,
        notes,
        created_at
      FROM audit_log
      WHERE action = 'LOGIN_FAILED'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('\n=== محاولات تسجيل دخول فاشلة ===');
    console.table(failed.rows);

    // عمليات INSERT/UPDATE/DELETE الحديثة
    const dataOps = await client.query(`
      SELECT 
        action,
        table_name as resource_type,
        actor_id as user_id,
        notes::json->>'ip' as ip_address,
        notes::json->>'user_agent' as device,
        notes,
        created_at
      FROM audit_log
      WHERE action IN ('INSERT', 'UPDATE', 'DELETE')
      ORDER BY created_at DESC
      LIMIT 30
    `);
    console.log('\n=== عمليات بيانات حديثة (INSERT/UPDATE/DELETE) ===');
    console.table(dataOps.rows);

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
checkDetails();