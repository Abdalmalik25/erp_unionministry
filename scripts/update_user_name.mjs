import { pool } from '../server/middleware/shared.js';

async function run() {
  try {
    const res = await pool.query(
      `UPDATE sector_users SET name = $1 WHERE email = $2 OR name LIKE $3 RETURNING id, email, name, role`,
      ['معين محاوش', 'ministry@yemen.gov.ye', '%الوزير%']
    );
    console.log('Successfully updated rows in PostgreSQL:', res.rows);
    console.log(`Total rows affected: ${res.rowCount}`);
  } catch (err) {
    console.error('Error updating users:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
