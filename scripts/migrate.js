/**
 * UnionSphere Enterprise — Database Migration Script
 * Run: node scripts/migrate.js
 * 
 * Applies schema_comprehensive.sql and seeds NOAS professions (3,590 records)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or NEON_DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function applySchema() {
  console.log('📋 Applying schema_comprehensive.sql...');
  const schemaPath = path.join(__dirname, '..', 'src', 'app', 'utils', 'schema_comprehensive.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    return false;
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolons but handle dollar-quoted functions
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < schema.length; i++) {
    const char = schema[i];
    
    // Check for dollar quote
    if (char === '$') {
      const rest = schema.slice(i);
      const match = rest.match(/^\$([a-zA-Z_]*)\$/);
      if (match) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match[0];
          current += match[0];
          i += match[0].length - 1;
        } else if (match[0] === dollarTag) {
          inDollarQuote = false;
          current += match[0];
          i += match[0].length - 1;
          dollarTag = '';
        }
      }
    }

    if (char === ';' && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const stmt of statements) {
    if (!stmt || stmt.startsWith('--')) continue;

    try {
      await pool.query(stmt);
      success++;
    } catch (err) {
      // If object already exists, skip
      if (err.code === '42710' || err.code === '42P07' || err.code === '23505') {
        skipped++;
      } else {
        console.error(`⚠️  Error: ${err.message.slice(0, 100)}`);
        console.error(`   Statement: ${stmt.slice(0, 80)}...`);
        errors++;
      }
    }
  }

  console.log(`✅ Schema applied: ${success} succeeded, ${skipped} skipped (already exist), ${errors} errors`);
  return errors === 0;
}

async function seedProfessions() {
  console.log('\n📋 Seeding NOAS professions (3,590 records)...');
  
  try {
    // Check if professions already exist
    const countResult = await pool.query('SELECT COUNT(*)::int as count FROM professions');
    if (countResult.rows[0].count > 0) {
      console.log(`ℹ️  Professions table already has ${countResult.rows[0].count} records. Skipping seed.`);
      return true;
    }
  } catch (err) {
    // Table might not exist yet, that's ok
    if (err.code !== '42P01') {
      console.error('❌ Error checking professions table:', err.message);
      return false;
    }
  }

  // Read NOAS data
  const noasPath = path.join('G:', 'App25', 'NOAS', 'src', 'app', 'data', 'standardOccupations.raw.js');
  
  if (!fs.existsSync(noasPath)) {
    console.error('❌ NOAS data file not found:', noasPath);
    return false;
  }

  // The raw.js uses `export default` so we need to handle it
  let rawContent = fs.readFileSync(noasPath, 'utf-8');
  rawContent = rawContent.replace(/^export\s+default\s+/, '');
  
  // Write temp file and require it
  const tempPath = path.join(__dirname, '_temp_noas_data.js');
  fs.writeFileSync(tempPath, `module.exports = ${rawContent};`);
  
  let occupations;
  try {
    occupations = require(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }

  if (!Array.isArray(occupations) || occupations.length === 0) {
    console.error('❌ No occupation data found');
    return false;
  }

  console.log(`📊 Found ${occupations.length} occupations to seed`);

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < occupations.length; i += BATCH_SIZE) {
    const batch = occupations.slice(i, i + BATCH_SIZE);
    
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const occ of batch) {
      const hierarchy = occ.hierarchy || {};
      const workEnv = occ.workEnvironment || {};
      const medical = occ.medicalExaminations || {};
      const hazard = occ.hazardAndSafety || {};
      const tasks = occ.tasks || [];
      const competencies = occ.competencies || [];
      const scores = occ.assessmentScores || {};
      const jdc = occ.jobDescriptionCard || {};
      const salary = occ.salaryRange || {};

      values.push(`(
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++},
        $${paramIndex++}, $${paramIndex++}
      )`;

      params.push(
        occ.code || `OCC-${occ.id}`,
        occ.nameAr,
        occ.nameEn || null,
        occ.nameFr || null,
        occ.iscoCode || occ.code,
        hierarchy.majorGroupCode || occ.majorGroupCode || '',
        hierarchy.majorGroupName || occ.majorGroupName || '',
        hierarchy.subMajorGroupName || null,
        hierarchy.minorGroupName || null,
        hierarchy.unitGroupName || null,
        occ.sector || '',
        occ.family || occ.sector || '',
        occ.level || 1,
        occ.status || 'مسودة',
        occ.descriptionAr || occ.detailedDescription || '',
        occ.descriptionEn || null,
        occ.scope || null,
        workEnv.activityCategory || null,
        workEnv.syndicate || null,
        workEnv.indoorSite || null,
        workEnv.outdoorSite || null,
        workEnv.climateCondition || null,
        workEnv.shiftPattern || null,
        workEnv.workAccess || null,
        workEnv.maxServiceYears || null,
        workEnv.workHoursPerDay || null,
        workEnv.restBreak || null,
        workEnv.leavesSchedule || null,
        JSON.stringify(medical),
        hazard.hazardLevel || 'منخفضة',
        JSON.stringify(hazard.possibleHazards || []),
        JSON.stringify(hazard.potentialInjuries || []),
        JSON.stringify(hazard.occupationalDiseases || []),
        JSON.stringify(hazard.preventionMethods || []),
        JSON.stringify(hazard.protectiveEquipment || []),
        JSON.stringify(jdc.qualifications || []),
        JSON.stringify(jdc.trainingRequirements || []),
        JSON.stringify(jdc.preWorkConditions || []),
        JSON.stringify(jdc.onboarding || []),
        jdc.trialPeriod || null,
        JSON.stringify(jdc.performanceEvaluation || []),
        JSON.stringify(jdc.incentivesAndPenalties || []),
        JSON.stringify(tasks),
        JSON.stringify(competencies),
        scores.skill || 0,
        scores.responsibility || 0,
        scores.autonomy || 0,
        scores.complexity || 0,
        scores.hazard || 0,
        scores.totalScore || 0,
        scores.grade || null,
        null // currency
      );
    }

    const insertQuery = `
      INSERT INTO professions (
        code, name_ar, name_en, name_fr,
        isco_code, major_group_code, major_group_name,
        sub_major_group, minor_group, unit_group,
        sector, family, level, status,
        description_ar, description_en, scope,
        activity_category, syndicate,
        indoor_site, outdoor_site,
        climate_condition, shift_pattern,
        work_access, max_service_years,
        work_hours_per_day, rest_break, leaves_schedule,
        medical_exams, hazard_level,
        possible_hazards, potential_injuries,
        occupational_diseases, prevention_methods, protective_equipment,
        qualifications, training_requirements,
        pre_work_conditions, onboarding,
        trial_period, performance_evaluation, incentives_and_penalties,
        tasks, competencies,
        skill_score, responsibility_score, autonomy_score,
        complexity_score, hazard_score, total_score, grade, currency
      ) VALUES ${values.join(',\n')}
      ON CONFLICT (code) DO NOTHING
    `;

    try {
      await pool.query(insertQuery, params);
      inserted += batch.length;
      process.stdout.write(`\r  Progress: ${inserted}/${occupations.length} (${Math.round(inserted/occupations.length*100)}%)`);
    } catch (err) {
      console.error(`\n⚠️  Batch error at offset ${i}:`, err.message.slice(0, 200));
    }
  }

  console.log(`\n✅ Seeded ${inserted} professions`);
  return true;
}

async function seedLegalReferences() {
  console.log('\n📋 Seeding legal references...');
  
  try {
    const countResult = await pool.query('SELECT COUNT(*)::int as count FROM legal_references');
    if (countResult.rows[0].count > 0) {
      console.log('ℹ️  Legal references already seeded. Skipping.');
      return;
    }
  } catch {
    // Table might not exist yet
  }

  const legalRefs = [
    ('قانون العمل اليمني', 'Yemeni Labor Law', '1', 1995, 'نافذ', 'القانون الأساسي لتنظيم العلاقات العمالية'),
    ('قرار وزاري 42/2020', 'Ministerial Decree 42/2020', '42', 2020, 'نافذ', 'التفتيش الميداني الموحد'),
    ('قرار وزاري 15/2018', 'Ministerial Decree 15/2018', '15', 2018, 'نافذ', 'نسبة اليمننة'),
    ('قرار وزاري 10/2000', 'Ministerial Decree 10/2000', '10', 2000, 'نافذ', 'تنظيم العمل الأجنبي'),
    ('قرار وزاري 28/2019', 'Ministerial Decree 28/2019', '28', 2019, 'نافذ', 'السلامة المهنية'),
  ];

  // Already in schema seed data, skip
  console.log('ℹ️  Legal references are in schema seed data');
}

async function main() {
  console.log('🚀 UnionSphere Enterprise — Database Migration');
  console.log('═══════════════════════════════════════════════\n');

  const schemaOk = await applySchema();
  if (!schemaOk) {
    console.error('\n❌ Schema application failed. Aborting.');
    await pool.end();
    process.exit(1);
  }

  await seedProfessions();
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Migration complete!');
  
  await pool.end();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  pool.end();
  process.exit(1);
});
