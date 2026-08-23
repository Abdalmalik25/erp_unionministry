
const { pool } = require(" ../server/middleware/shared.js\);

async function run() {
 try {
 const res = await pool.query(\UPDATE sector_users SET name = \ WHERE email = \ OR name LIKE \ RETURNING id email name role\, [
 \???? ?????\,
 \ministry@yemen.gov.ye\,
 \%??????%\
 ]);
 console.log(\UPDATED:\, res.rows);
 const all = await pool.query(\SELECT id email name role user_type FROM sector_users WHERE deleted_at IS NULL ORDER BY id ASC\);
 console.log(\ALL USERS:\, all.rows);
 process.exit(0);
 } catch (e) {
 console.error(e);
 process.exit(1);
 }
}
run();

