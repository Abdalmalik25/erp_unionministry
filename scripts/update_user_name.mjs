import { pool } from '../server/middleware/shared.js';

async function run() {
  try {
    const res = await pool.query(" UPDATE sector_users SET name = \ WHERE email = \ OR name LIKE \ RETURNING id email name role\, [
 'معين محاوش',
 'ministry@yemen.gov.ye',
 '%الوزير%'
 ]);
 console.log('Successfully updated rows in PostgreSQL:', res.rows);
 const all = await pool.query(\SELECT id email name role user_type FROM sector_users WHERE deleted_at IS NULL ORDER BY id ASC\);
 console.log('All sector users in DB:', all.rows);
 process.exit(0);
 } catch (err) {
 console.error('Error:', err);
 process.exit(1);
 }
}

run();