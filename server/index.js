/**
 * UnionSphere Backend API - خادم API بسيط
 * للاتصال بقاعدة PostgreSQL الحقيقية (Neon)
 */

const express = require('express');
const cors = require('cors');
const pg = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;

// PostgreSQL Connection - Neon Database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://neondb_owner:npg_S2vFTAquDK1g@ep-morning-silence-ahpz7wqf-pooler.c-3.us-east-1.aws.neon.tech/unionministry_db?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API Routes

// GET /api/entities - الحصول على الكيانات
app.get('/api/entities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT entity_id, unified_code, name_ar, name_en, entity_type, 
             classification, governorate, city, member_count, status,
             compliance_status, risk_level, president_name, phone, email
      FROM organizational_entities 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/entities/:id - الكيان المحدد
app.get('/api/entities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM organizational_entities 
      WHERE entity_id = $1 AND deleted_at IS NULL
    `, [id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/entities/:id/members - أعضاء الكيان
app.get('/api/entities/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, national_id, full_name, gender, phone, email, 
             profession, join_date, status
      FROM members 
      WHERE entity_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/entities/:id/activities - أنشطة الكيان
app.get('/api/entities/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM activities 
      WHERE entity_id = $1
      ORDER BY start_date DESC
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/dashboard/stats - إحصائيات لوحة التحكم
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entities,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_entities,
        COUNT(CASE WHEN compliance_status = 'compliant' THEN 1 END) as compliant_entities,
        COALESCE(SUM(member_count), 0) as total_members
      FROM organizational_entities
      WHERE deleted_at IS NULL
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`UnionSphere API Server running on port ${PORT}`);
  console.log(`Connected to: ep-morning-silence-ahpz7wqf-pooler...`);
});

module.exports = app;