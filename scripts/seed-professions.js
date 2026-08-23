/**
 * UnionSphere Enterprise — NOAS Professions Seeder
 * Run: node scripts/seed-professions.js
 * 
 * Reads 3,590 occupations from NOAS and seeds them into the professions table
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}
loadEnv();

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

async function loadNOASData() {
  const noasPath = path.join('G:', 'App25', 'NOAS', 'src', 'app', 'data', 'standardOccupations.raw.js');
  
  if (!fs.existsSync(noasPath)) {
    console.error('❌ NOAS data file not found:', noasPath);
    return [];
  }

  const content = fs.readFileSync(noasPath, 'utf-8');
  
  // Find the start of the array — supports "export default [" or "= ["
  const arrStart = content.indexOf('[');
  if (arrStart === -1) {
    console.error('❌ Could not find array start in NOAS data');
    return [];
  }
  const arrayStr = content.slice(arrStart); // starts with [
  
  // Use Function constructor instead of eval
  try {
    const data = new Function('return ' + arrayStr)();
    if (!Array.isArray(data)) {
      console.error('❌ Parsed data is not an array');
      return [];
    }
    console.log(`📋 Loaded ${data.length} occupations from NOAS`);
    return data;
  } catch (e) {
    console.error('❌ Could not parse NOAS data:', e.message);
    return [];
  }
}

async function seed() {
  console.log('🌱 UnionSphere Enterprise — Professions Seeder\n');
  
  const occupations = await loadNOASData();
  if (occupations.length === 0) {
    console.log('⚠️  No occupations to seed');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  let total = 0;
  
  try {
    await client.query('BEGIN');
    
    const batchSize = 100;
    for (let i = 0; i < occupations.length; i += batchSize) {
      const batch = occupations.slice(i, i + batchSize);
      const values = [];
      const params = [];
      let paramIdx = 1;
      
      for (const occ of batch) {
        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        params.push(
          occ.code,
          occ.nameAr,
          occ.nameEn || null,
          occ.nameFr || null,
          occ.iscoCode,
          occ.majorGroupCode || occ.iscoCode?.charAt(0) || '0',
          occ.majorGroupName || occ.nameAr,
          occ.sector || 'other',
          occ.family || 'عام',
          occ.level || 1,
          occ.status || 'مسودة',
          occ.descriptionAr || null,
          occ.descriptionEn || null,
          occ.scope || null,
          occ.hierarchy?.subMajorGroupName || null,
          occ.hierarchy?.minorGroupName || null,
          occ.hierarchy?.unitGroupName || null,
        );
      }
      
      const sql = `INSERT INTO professions (code, name_ar, name_en, name_fr, isco_code, major_group_code, major_group_name, sector, family, level, status, description_ar, description_en, scope, sub_major_group, minor_group, unit_group)
        VALUES ${values.join(', ')}
        ON CONFLICT (code) DO NOTHING`;
      
      await client.query(sql, params);
      total += batch.length;
      process.stdout.write(`\r   Seeded: ${total}/${occupations.length}`);
    }

    await client.query('COMMIT');
    console.log(`\n\n🎉 Seeding complete! Total: ${total} professions`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
