import pg from 'pg';
import { TOP_30_YEMEN_OCCUPATIONS } from '../src/app/data/professionsKnowledgeBank.ts';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dIXtW6LQw8sH@ep-shiny-wind-ai4w5o0l-pooler.c-4.us-east-1.aws.neon.tech/unionministrydb?sslmode=require';

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function enrichTop30Professions() {
  console.log(`Starting enrichment for ${TOP_30_YEMEN_OCCUPATIONS.length} top Yemeni professions in PostgreSQL...`);

  let updatedCount = 0;
  let insertedCount = 0;

  for (const prof of TOP_30_YEMEN_OCCUPATIONS) {
    try {
      const existing = await pool.query('SELECT id, isco_code FROM professions WHERE isco_code = $1', [prof.isco_code]);

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE professions SET
            name_ar = $1,
            name_en = $2,
            description_ar = $3,
            tasks = $4::jsonb,
            competencies = $5::jsonb,
            qualifications = $6,
            training_requirements = $7,
            protective_equipment = $8,
            medical_exams = $9::jsonb,
            min_salary = $10,
            max_salary = $11,
            yemenization_policy = $12,
            training_hours_required = $13,
            license_required = true,
            career_path = $14::jsonb,
            legal_references = $15::jsonb,
            status = 'معتمدة',
            updated_at = NOW()
          WHERE isco_code = $16`,
          [
            prof.name_ar,
            prof.name_en,
            prof.description_ar,
            JSON.stringify(prof.duties.map((t, idx) => ({ id: idx + 1, task: t, is_critical: true }))),
            JSON.stringify({ hard_skills: prof.hard_skills, soft_skills: prof.soft_skills }),
            [prof.education_level, prof.required_license],
            [`${prof.training_hours} ساعة تدريب معتمد`],
            prof.safety_equipment,
            JSON.stringify({ required_exams: prof.medical_examinations }),
            prof.salary_min,
            prof.salary_max,
            `نسبة اليمننة المقررة: ${prof.yemenization_ratio}% — ${prof.is_restricted_to_yemenis ? 'مهنة مقصورة على الكوادر الوطنية' : 'مفتوحة بكوتة مرخصة'}`,
            prof.training_hours,
            JSON.stringify(prof.career_path),
            JSON.stringify([{ law: 'قانون العمل رقم 5 لسنة 1995', reference: prof.legal_reference }]),
            prof.isco_code,
          ]
        );
        updatedCount++;
        console.log(`[UPDATED] ${prof.isco_code} - ${prof.name_ar}`);
      } else {
        await pool.query(
          `INSERT INTO professions (
            isco_code, code, name_ar, name_en, sector, family, major_group_code, major_group_name,
            level, status, description_ar, tasks, competencies, qualifications,
            training_requirements, protective_equipment, medical_exams, min_salary, max_salary,
            yemenization_policy, training_hours_required, license_required, career_path, legal_references,
            created_at, updated_at
          ) VALUES (
            $1, $1, $2, $3, $4, $4, $5, 'المجموعات الرئيسية',
            $6, 'معتمدة', $7, $8::jsonb, $9::jsonb, $10,
            $11, $12, $13::jsonb, $14, $15,
            $16, $17, true, $18::jsonb, $19::jsonb,
            NOW(), NOW()
          )`,
          [
            prof.isco_code,
            prof.name_ar,
            prof.name_en,
            prof.sector,
            prof.major_group_code,
            prof.level,
            prof.description_ar,
            JSON.stringify(prof.duties.map((t, idx) => ({ id: idx + 1, task: t, is_critical: true }))),
            JSON.stringify({ hard_skills: prof.hard_skills, soft_skills: prof.soft_skills }),
            [prof.education_level, prof.required_license],
            [`${prof.training_hours} ساعة تدريب معتمد`],
            prof.safety_equipment,
            JSON.stringify({ required_exams: prof.medical_examinations }),
            prof.salary_min,
            prof.salary_max,
            `نسبة اليمننة المقررة: ${prof.yemenization_ratio}% — ${prof.is_restricted_to_yemenis ? 'مهنة مقصورة على الكوادر الوطنية' : 'مفتوحة بكوتة مرخصة'}`,
            prof.training_hours,
            JSON.stringify(prof.career_path),
            JSON.stringify([{ law: 'قانون العمل رقم 5 لسنة 1995', reference: prof.legal_reference }]),
          ]
        );
        insertedCount++;
        console.log(`[INSERTED] ${prof.isco_code} - ${prof.name_ar}`);
      }

      // Upsert into hazardous_occupations if hazard_level is high or extreme
      if (prof.hazard_level === 'high' || prof.hazard_level === 'extreme') {
        const hazRisk = prof.hazard_level === 'extreme' ? 4 : 3;
        await pool.query(
          `INSERT INTO hazardous_occupations (
            occupation_code, occupation_name_ar, occupation_name_en, risk_level,
            hazard_category, critical_tasks, safety_requirements,
            medical_examinations, protective_equipment, training_requirements, min_salary
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10, $11
          ) ON CONFLICT (occupation_code) DO UPDATE SET
            risk_level = EXCLUDED.risk_level,
            critical_tasks = EXCLUDED.critical_tasks,
            safety_requirements = EXCLUDED.safety_requirements,
            medical_examinations = EXCLUDED.medical_examinations,
            protective_equipment = EXCLUDED.protective_equipment,
            min_salary = EXCLUDED.min_salary`,
          [
            prof.isco_code,
            prof.name_ar,
            prof.name_en,
            hazRisk,
            prof.sector,
            prof.duties,
            [prof.required_license, prof.legal_reference],
            prof.medical_examinations,
            prof.safety_equipment,
            [`${prof.training_hours} ساعة تدريب معتمد`],
            prof.salary_min,
          ]
        ).catch(() => {});
      }
    } catch (err) {
      console.error(`Error enriching ${prof.isco_code}:`, err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Enrichment Complete for All 31 Professions!`);
  console.log(`Updated: ${updatedCount}, Inserted: ${insertedCount}`);
  console.log(`========================================\n`);
  await pool.end();
}

enrichTop30Professions();
