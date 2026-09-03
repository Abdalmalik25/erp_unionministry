// تحميل بنك بطاقات تحليل وتوصيف المهنة (أهم 50 مهنة) إلى profession_analysis_cards
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(ROOT, '.env'), 'utf8');
const vars = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const pool = new pg.Pool({ connectionString: vars.DATABASE_URL || vars.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

const BATCHES = ['A','B','C','D','E'];
const CARD_TYPES = ['classification','yemenization','gap_analysis','career_path','risk_profile','allocation_summary'];

(async () => {
  const c = await pool.connect();
  try {
    let total = 0;
    let missingProf = [];
    let skipped = [];
    for (const b of BATCHES) {
      const file = join(ROOT, 'scripts', `_cards_${b}.json`);
      const arr = JSON.parse(readFileSync(file, 'utf8'));
      for (const prof of arr) {
        const code = prof.code;
        // resolve canonical profession row
        const p = await c.query(
          `SELECT code,name_ar,isco_code,sector,level FROM professions WHERE code=$1 AND deleted_at IS NULL LIMIT 1`, [code]);
        if (!p.rows.length) {
          // fallback: try name match on any profession
          const p2 = await c.query(
            `SELECT code,name_ar,isco_code,sector,level FROM professions WHERE name_ar=$1 AND deleted_at IS NULL ORDER BY length(code) LIMIT 1`, [prof.name]);
          if (!p2.rows.length) { missingProf.push(code); continue; }
          p.rows = p2.rows;
        }
        const row = p.rows[0];
        const name = row.name_ar || prof.name;
        const iscoCode = row.isco_code || null;
        const sector = row.sector || prof.sector || null;
        const jobLevel = row.level || null;

        for (const ct of CARD_TYPES) {
          const cardData = prof.cards && prof.cards[ct];
          if (!cardData) { skipped.push(`${code}:${ct}`); continue; }
          const titles = {
            classification: `بطاقة تصنيف وتوصيف المهنة — ${name}`,
            yemenization: `بطاقة اليمننة وفرص التوطين — ${name}`,
            gap_analysis: `بطاقة فجوة المهارات والعرض والطلب — ${name}`,
            career_path: `بطاقة المسار الوظيفي والتدرج — ${name}`,
            risk_profile: `بطاقة ملف المخاطر المهنية والصحة — ${name}`,
            allocation_summary: `بطاقة خلاصة التوظيف والتخصيص — ${name}`
          };
          await c.query(`
            INSERT INTO profession_analysis_cards
              (profession_code, profession_name_ar, isco_code, sector, job_level, card_type, title_ar, data, methodology_version, source, is_benchmark)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'2026.1','منهجية مؤسسية (ISCO-08/ESCO/O*NET/OSHA + القوانين اليمنية)',TRUE)
            ON CONFLICT (profession_code, card_type)
            DO UPDATE SET profession_name_ar=EXCLUDED.profession_name_ar,
                          isco_code=EXCLUDED.isco_code,
                          sector=EXCLUDED.sector,
                          job_level=EXCLUDED.job_level,
                          title_ar=EXCLUDED.title_ar,
                          data=EXCLUDED.data,
                          updated_at=NOW()
          `, [code, name, iscoCode, sector, jobLevel, ct, titles[ct], JSON.stringify(cardData)]);
          total++;
        }
        console.log(`loaded ${code} | ${name}`);
      }
    }
    console.log('\n===== SUMMARY =====');
    console.log('cards upserted:', total);
    console.log('professions missing in professions table:', missingProf.length ? missingProf.join(',') : '(none)');
    console.log('skipped cards:', skipped.length ? skipped.join(',') : '(none)');
  } finally { c.release(); await pool.end(); }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
