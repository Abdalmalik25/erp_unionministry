const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech',
  database: 'unionministrydb',
  user: 'neondb_owner',
  password: 'npg_dIXtW6LQw8sH',
  ssl: { rejectUnauthorized: false }
});

async function applyMigrations() {
  try {
    console.log('=== Applying Profession Standards Linking Migration ===\n');
    
    // 1. Create profession_applicability table
    console.log('1. Creating profession_applicability table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profession_applicability (
        id TEXT PRIMARY KEY,
        profession_id UUID NOT NULL,
        enterprise_id UUID NOT NULL,
        activity_id UUID,
        standard_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        is_primary BOOLEAN DEFAULT false,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
        inspection_frequency VARCHAR(20) NOT NULL DEFAULT 'annual',
        is_active BOOLEAN DEFAULT true,
        effective_from TIMESTAMPTZ DEFAULT now(),
        effective_to TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        created_by UUID,
        updated_at TIMESTAMPTZ DEFAULT now(),
        updated_by UUID,
        CONSTRAINT uq_profession_applicability_unique UNIQUE (profession_id, enterprise_id, activity_id, standard_version)
      );
    `);
    console.log('   ✓ profession_applicability table created');
    
    // Create indexes
    console.log('2. Creating indexes on profession_applicability...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_profession_applicability_profession ON profession_applicability(profession_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_profession_applicability_enterprise ON profession_applicability(enterprise_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_profession_applicability_activity ON profession_applicability(activity_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_profession_applicability_active ON profession_applicability(is_active, effective_from, effective_to);`);
    console.log('   ✓ Indexes created');
    
    // Add foreign key constraints with correct column names
    console.log('3. Adding foreign key constraints...');
    try {
      await pool.query(`ALTER TABLE profession_applicability ADD CONSTRAINT fk_pa_profession FOREIGN KEY (profession_id) REFERENCES professions(id) ON DELETE CASCADE;`);
      console.log('   ✓ FK to professions(id) added');
    } catch (e) {
      console.log('   ⚠ FK to professions: ' + e.message.split('\\n')[0]);
    }
    try {
      await pool.query(`ALTER TABLE profession_applicability ADD CONSTRAINT fk_pa_enterprise FOREIGN KEY (enterprise_id) REFERENCES organizational_entities(entity_id) ON DELETE CASCADE;`);
      console.log('   ✓ FK to organizational_entities(entity_id) added');
    } catch (e) {
      console.log('   ⚠ FK to organizational_entities: ' + e.message.split('\\n')[0]);
    }
    try {
      await pool.query(`ALTER TABLE profession_applicability ADD CONSTRAINT fk_pa_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL;`);
      console.log('   ✓ FK to activities(id) added');
    } catch (e) {
      console.log('   ⚠ FK to activities: ' + e.message.split('\\n')[0]);
    }
    
    // 2. Add columns to evaluation_certificates
    console.log('4. Adding columns to evaluation_certificates...');
    await pool.query(`ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS profession_id UUID REFERENCES professions(id) ON DELETE SET NULL;`);
    await pool.query(`ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS standard_version VARCHAR(20) DEFAULT 'v1.0';`);
    await pool.query(`ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS assessed_against_standards BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE evaluation_certificates ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB DEFAULT '{}';`);
    console.log('   ✓ evaluation_certificates columns added');
    
    // Create indexes on evaluation_certificates
    console.log('5. Creating indexes on evaluation_certificates...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_evaluation_certificates_profession ON evaluation_certificates(profession_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_evaluation_certificates_standard ON evaluation_certificates(standard_version);`);
    console.log('   ✓ Indexes created');
    
    // 3. Add columns to professions
    console.log('6. Adding columns to professions...');
    await pool.query(`ALTER TABLE professions ADD COLUMN IF NOT EXISTS performance_standards_version VARCHAR(20) DEFAULT 'v1.0';`);
    await pool.query(`ALTER TABLE professions ADD COLUMN IF NOT EXISTS standards_effective_from TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE professions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
    console.log('   ✓ professions columns added');
    
    // Create index on professions
    console.log('7. Creating index on professions...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_professions_active ON professions(is_active, performance_standards_version);`);
    console.log('   ✓ Index created');
    
    // 4. Migrate existing data
    console.log('8. Migrating existing data...');
    await pool.query(`UPDATE professions SET performance_standards_version = 'v1.0' WHERE performance_standards_version IS NULL;`);
    await pool.query(`UPDATE evaluation_certificates SET standard_version = 'v1.0' WHERE standard_version IS NULL;`);
    await pool.query(`UPDATE evaluation_certificates SET assessed_against_standards = true WHERE assessed_against_standards IS NULL;`);
    console.log('   ✓ Data migrated');
    
    console.log('\n=== Migration Complete ===');
    
    // Verify
    console.log('\n=== Verification ===');
    
    // Check profession_applicability table
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'profession_applicability'
      ) AS table_exists
    `);
    console.log('profession_applicability table exists:', tableCheck.rows[0].table_exists);
    
    // Check new columns on evaluation_certificates
    const colsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'evaluation_certificates' 
      AND column_name IN ('profession_id', 'standard_version', 'assessed_against_standards', 'evaluation_criteria')
      ORDER BY ordinal_position
    `);
    console.log('evaluation_certificates new columns:', colsCheck.rows.map(r => r.column_name).join(', '));
    
    // Check new columns on professions
    const profColsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'professions' 
      AND column_name IN ('performance_standards_version', 'standards_effective_from', 'is_active')
      ORDER BY ordinal_position
    `);
    console.log('professions new columns:', profColsCheck.rows.map(r => r.column_name).join(', '));
    
    // Count profession_applicability rows
    const countCheck = await pool.query('SELECT COUNT(*) as cnt FROM profession_applicability');
    console.log('profession_applicability row count:', countCheck.rows[0].cnt);
    
    // Show sample data if any
    const sampleCheck = await pool.query('SELECT * FROM profession_applicability LIMIT 3');
    console.log('profession_applicability sample data:', sampleCheck.rows);
    
    console.log('\n=== All Checks Complete ===');
    
  } catch (err) {
    console.error('Migration Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigrations();