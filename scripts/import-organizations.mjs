/**
 * scripts/import-organizations.mjs — Import Yemeni Civil Society Organizations & Unions
 * Source: docs/المنظمات25/الجمعيات بدون تكرار.txt (~9,970 tab-separated rows)
 *
 * Populates: organizational_entities (entity_type, classification, legal_form, sector,
 * governorate, president, phone, address, establishment_date, etc.)
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs', 'المنظمات25', 'الجمعيات بدون تكرار.txt');

function loadEnv() {
  const raw = readFileSync(join(ROOT, '.env'), 'utf8');
  const vars = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}

const env = loadEnv();
const DATABASE_URL = env.DATABASE_URL || env.NEON_DATABASE_URL;
if (!DATABASE_URL) { console.error('❌ DATABASE_URL is required in .env'); process.exit(1); }
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 10 });

// ---------- Date parser: "20/5/2015م" or "2015" ----------
function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/م$/, '').trim();
  const m = s.match(/^(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{2,4})$/);
  if (m) {
    let y = parseInt(m[3], 10);
    if (y < 100) y += (y < 40 ? 2000 : 1900);
    const mo = Math.min(12, Math.max(1, parseInt(m[2], 10)));
    const d = Math.min(28, Math.max(1, parseInt(m[1], 10)));
    const dt = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return isNaN(Date.parse(dt)) ? null : dt;
  }
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return null;
}

// ---------- Governorate normalizer ----------
function normalizeGovernorate(v) {
  if (!v) return 'غير محدد';
  // Strip Arabic tatweel and normalize legacy forms
  let s = String(v).trim().replace(/\u0640/g, '');
  s = s.replace(/^محافظة\s*/i, '').replace(/^م\s+/, '');
  // For verbose "governorate / district / sub-district", take the leading part
  const firstPart = s.split(/[\/\\]/)[0].trim();
  let lower = firstPart.toLowerCase();

  const govs = {
    'امانة العاصمة': 'أمانة العاصمة', 'الأمانة': 'أمانة العاصمة', 'امانة': 'أمانة العاصمة',
    'صنعاء': 'صنعاء', 'صعاء': 'صنعاء', 'عدن': 'عدن', 'تعز': 'تعز', 'تعز ': 'تعز',
    'الحديدة': 'الحديدة', 'حديدة': 'الحديدة',
    'إب': 'إب', 'اب': 'إب', 'ذمار': 'ذمار', 'حضرموت': 'حضرموت',
    'حجة': 'حجة', 'حجه': 'حجة', 'صعدة': 'صعدة', 'صعده': 'صعدة', 'عمران': 'عمران',
    'لحج': 'لحج', 'أبين': 'أبين', 'ابين': 'أبين', 'شبوة': 'شبوة', 'شبوه': 'شبوة',
    'المهرة': 'المهرة', 'مهرة': 'المهرة',
    'مارب': 'مأرب', 'مأرب': 'مأرب', 'ارب': 'مأرب', 'ارب ': 'مأرب',
    'الجوف': 'الجوف', 'جوف': 'الجوف', 'البيضاء': 'البيضاء', 'بيضاء': 'البيضاء',
    'الضالع': 'الضالع', 'ضالع': 'الضالع', 'ريمة': 'ريمة', 'ريمه': 'ريمة',
    'سقطرى': 'سقطرى', 'سقطرة': 'سقطرى', 'المحويت': 'المحويت',
  };

  // Exact-ish match on first part
  if (govs[lower] !== undefined) return govs[lower];

  // Substring-based fallback for composite governorate names
  if (lower.includes('امانة العاصمة') || lower.includes('الأمانة') || lower.includes('امانة')) return 'أمانة العاصمة';
  if (lower.includes('حضرموت')) return 'حضرموت';
  if (lower.includes('الحديدة') || lower.includes('حديدة')) return 'الحديدة';
  if (lower.includes('صنعاء') || lower.includes('صعاء')) return 'صنعاء';
  if (lower.includes('صعدة') || lower.includes('صعده')) return 'صعدة';
  if (lower.includes('عمران')) return 'عمران';
  if (lower.includes('أبين') || lower.includes('ابين')) return 'أبين';
  if (lower.includes('شبوة') || lower.includes('شبوه')) return 'شبوة';
  if (lower.includes('المهرة') || lower.includes('مهرة')) return 'المهرة';
  if (lower.includes('مارب') || lower.includes('مأرب') || lower.includes('ارب')) return 'مأرب';
  if (lower.includes('الجوف') || lower.includes('جوف')) return 'الجوف';
  if (lower.includes('البيضاء') || lower.includes('بيضاء')) return 'البيضاء';
  if (lower.includes('الضالع') || lower.includes('ضالع')) return 'الضالع';
  if (lower.includes('ريمة') || lower.includes('ريمه')) return 'ريمة';
  if (lower.includes('سقطرى') || lower.includes('سقطرة')) return 'سقطرى';
  if (lower.includes('المحويت')) return 'المحويت';
  if (lower.includes('تعز') || lower.includes('تعز')) return 'تعز';
  if (lower.startsWith('إب') || lower.startsWith('اب')) return 'إب';
  if (lower.includes('ذمار')) return 'ذمار';
  if (lower.includes('حجة') || lower.includes('حجه')) return 'حجة';
  if (lower.includes('لحج')) return 'لحج';
  if (lower.includes('عدن')) return 'عدن';

  // Nationwide / republic-level
  if (lower.includes('الجمهورية اليمنية') || lower.includes('اليمن') || lower.includes('جمهورية')) return 'نطاق وطني';

  // Keep short values as-is
  return firstPart.length <= 15 ? firstPart : 'غير محدد';
}

// ---------- Type / classification / legal_form / sector classifier ----------
function classifyEntity(typeStr, name) {
  const t = (typeStr || '').toLowerCase();
  const n = (name || '').toLowerCase();

  // entity_type (union, organization, federation, branch, committee, department, unit, office)
  let entity_type = 'organization';
  if (t.includes('نقاب')) entity_type = 'union';
  else if (t.includes('اتحاد')) entity_type = 'federation';
  else if (t.includes('فرع')) entity_type = 'branch';
  else if (t.includes('لجنة')) entity_type = 'committee';
  else if (t.includes('قسم') || t.includes('دائرة')) entity_type = 'department';
  else if (t.includes('وحدة')) entity_type = 'unit';
  else if (t.includes('مكتب')) entity_type = 'office';

  // legal_form (syndicate, association, federation, cooperative, foundation)
  let legal_form = 'association';
  if (t.includes('نقاب')) legal_form = 'syndicate';
  else if (t.includes('اتحاد')) legal_form = 'federation';
  else if (t.includes('تعاون')) legal_form = 'cooperative';
  else if (t.includes('مؤسسة') || t.includes('منظمة')) legal_form = 'foundation';

  // classification (labor, professional, employers, charity, social, cultural, sports)
  let classification = 'social';
  if (t.includes('خير') || t.includes('اغاث') || t.includes('إغاث') || t.includes('انسان')) classification = 'charity';
  else if (t.includes('رياض')) classification = 'sports';
  else if (t.includes('ثقاف') || t.includes('ادب') || t.includes('أدب') || t.includes('فن') || t.includes('اعلام') || t.includes('إعلام') || t.includes('صحاف') || t.includes('محتوى') || t.includes('دراسات')) classification = 'cultural';
  else if (t.includes('مهني') || t.includes('مهنية') || t.includes('نقاب')) classification = 'professional';
  else if (t.includes('اصحاب') || t.includes('أصحاب') || t.includes('تجار') || t.includes('صناع') || t.includes('رجل اعمال') || t.includes('رجال اعمال') || t.includes('مقاول')) classification = 'employers';
  else if (t.includes('عمال') || t.includes('عمّال')) classification = 'labor';
  else if (n.includes('عمال') || n.includes('عمّال') || t.includes('نقابة')) classification = 'labor';
  else if (n.includes('مهندس') || n.includes('طبيب') || n.includes('محام') || n.includes('معلم') || n.includes('مدرس') || n.includes('صحاف') || n.includes('اعلام')) classification = 'professional';
  else if (n.includes('رياض')) classification = 'sports';
  else if (n.includes('خير') || n.includes('اغاث')) classification = 'charity';
  else if (n.includes('ثقاف') || n.includes('أدبي') || n.includes('لادبي')) classification = 'cultural';

  // sector (industry, services, agriculture, construction, healthcare, education, transportation, trade, technology, finance, tourism, other)
  let sector = 'other';
  const all = t + ' ' + n;
  if (all.includes('زراع') || all.includes('حيوان') || all.includes('دواجن') || all.includes('ماشية') || all.includes('صياد') || all.includes('سمك') || all.includes('ثروة حيوانية')) sector = 'agriculture';
  else if (all.includes('صناع') || all.includes('ورش') || all.includes('منتج') || all.includes('حرف')) sector = 'industry';
  else if (all.includes('تجار') || all.includes('سوق') || all.includes('تسويق') || all.includes('موزع')) sector = 'trade';
  else if (all.includes('تعلم') || all.includes('مدرس') || all.includes('جامع') || all.includes('معهد') || all.includes('تعليم') || all.includes('طلاب') || all.includes('نشر') || all.includes('كتاب') || all.includes('ثقاف')) sector = 'education';
  else if (all.includes('صحي') || all.includes('مستشف') || all.includes('طبي') || all.includes('صيدل') || all.includes('طبيب') || all.includes('معاق') || all.includes('اعاق')) sector = 'healthcare';
  else if (all.includes('نقل') || all.includes('شحن') || all.includes('مواصلات') || all.includes('سيارات') || all.includes('سائق')) sector = 'transportation';
  else if (all.includes('تمويل') || all.includes('مال') || all.includes('بنك') || all.includes('اعمال') || all.includes('أعمال') || all.includes('تجارة')) sector = 'finance';
  else if (all.includes('تكنو') || all.includes('برمج') || all.includes('حاسوب') || all.includes('رقمي') || all.includes('انترنت') || all.includes('اتصالات')) sector = 'technology';
  else if (all.includes('سياح') || all.includes('فندق') || all.includes('سفر') || all.includes('شقق')) sector = 'tourism';
  else if (all.includes('بناء') || all.includes('مقاول') || all.includes('عقار') || all.includes('مكتب هندسي') || all.includes('مهندس')) sector = 'construction';
  else if (all.includes('خدم') || all.includes('اجتماع') || all.includes('تنمو') || all.includes('حقوق') || all.includes('مياه') || all.includes('بيئ') || all.includes('مراة') || all.includes('اطفال') || all.includes('تاهيل') || all.includes('إعاق') || all.includes('اغاث') || all.includes('انسان')) sector = 'services';

  return { entity_type, classification, legal_form, sector };
}

// ---------- Position normalizer ----------
function normalizePosition(pos) {
  if (!pos) return null;
  const p = String(pos).trim();
  if (p.includes('رئيس')) return 'رئيس';
  if (p.includes('أمين') || p.includes('امين')) return 'أمين عام';
  if (p.includes('مدير')) return 'مدير تنفيذي';
  if (p.includes('مالي') || p.includes('مسئول')) return 'مسئول مالي';
  return p || null;
}

// ---------- Main ----------
async function main() {
  console.log('🏛️  UnionSphere Enterprise — Organizations & Unions Importer\n');
  if (!existsSync(SRC)) { console.error('❌ Source file not found:', SRC); process.exit(1); }

  const content = readFileSync(SRC, 'utf8');
  const lines = content.split(/\r?\n/);
  console.log(`📄 Loaded ${lines.length} lines from source.`);

  const client = await pool.connect();
  try {
    // Ensure a fallback default entity (ministry) exists
    let defaultEntityId = null;
    const orgRes = await client.query(`SELECT entity_id FROM organizational_entities WHERE entity_type='department' LIMIT 1`);
    if (orgRes.rows.length > 0) defaultEntityId = orgRes.rows[0].entity_id;

    // Parse rows
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.indexOf('\t') < 0) continue;
      const c = line.split('\t');
      if (c.length < 7) continue;

      const name = (c[2] || '').trim();
      if (!name || name === 'اسم المنظمة' || name === 'tflGsDy3') continue;
      if (c[2] && (c[2].startsWith('tflGsDy') || c[2].indexOf('tflGsDy') >= 0)) continue;

      const regNo = (c[0] || '').trim();
      const refNo = (c[1] || '').trim();
      const typeStr = (c[3] || '').trim();
      const estDate = parseDate(c[4]);
      const gov = normalizeGovernorate(c[5]);
      const official = (c[7] || '').trim();
      const position = normalizePosition(c[8]);
      const address = (c[9] || '').trim();
      const phone = (c[10] || '').trim();
      const ref2 = (c[15] || '').trim();

      const cls = classifyEntity(typeStr, name);

      const rawRegNo = regNo && regNo !== 'NULL' ? (isNaN(parseInt(regNo, 10)) ? regNo : String(parseInt(regNo, 10))) : null;

      rows.push({
        seq: rows.length + 1,
        name,
        rawRegNo,
        rawRefNo: refNo && refNo !== 'NULL' ? String(refNo).replace(/\s/g, '') : null,
        entity_type: cls.entity_type,
        classification: cls.classification,
        legal_form: cls.legal_form,
        sector: cls.sector,
        estDate,
        gov,
        official: official && official !== 'NULL' ? official : null,
        position,
        address: address && address !== 'NULL' ? address : null,
        phone: phone && phone !== 'NULL' ? phone.replace(/^ت:\s*/, '') : null,
      });
    }
    console.log(`📦 Parsed ${rows.length} valid organization records to import.`);

    // Optional dry-run summary
    const typeDist = {};
    for (const r of rows) typeDist[r.entity_type] = (typeDist[r.entity_type] || 0) + 1;
    console.log('   entity_type distribution:', JSON.stringify(typeDist));
    const clsDist = {};
    for (const r of rows) clsDist[r.classification] = (clsDist[r.classification] || 0) + 1;
    console.log('   classification distribution:', JSON.stringify(clsDist));
    const legalDist = {};
    for (const r of rows) legalDist[r.legal_form] = (legalDist[r.legal_form] || 0) + 1;
    console.log('   legal_form distribution:', JSON.stringify(legalDist));

    // Insert in batches
    const batchSize = 200;
    let inserted = 0;
    let skipped = 0;
    for (let b = 0; b < rows.length; b += batchSize) {
      const batch = rows.slice(b, b + batchSize);
      const values = [];
      const params = [];
      let p = 1;
      for (const r of batch) {
        // Not-null date fallback
        const theDate = r.estDate || '1990-01-01';
        const seqStr = String(r.seq).padStart(7, '0');
        const unified = `UC-${seqStr}`;
        const entityCode = `ORG-${seqStr}`;
        const regNum = r.rawRegNo ? `${r.rawRegNo}-${seqStr}` : `REG-${seqStr}`;
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}::entity_type, $${p++}::classification, $${p++}::legal_form, $${p++}::sector, $${p++}::entity_status, $${p++}::compliance_status, $${p++}::risk_level, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::jsonb, $${p++})`);
        params.push(
          r.name,
          unified,
          regNum,
          r.entity_type,
          r.classification,
          r.legal_form,
          r.sector,
          'active',
          'compliant',
          'low',
          theDate,
          theDate,
          r.gov,
          r.gov,
          r.address,
          r.phone,
          r.official,
          r.position,
          JSON.stringify({ source: 'المنظمات25', ref_no: r.rawRefNo, reg_no: r.rawRegNo }),
          entityCode
        );
      }
      const sql = `
        INSERT INTO organizational_entities (
          name_ar, unified_code, registration_number,
          entity_type, classification, legal_form, sector,
          status, compliance_status, risk_level,
          establishment_date, registration_date, governorate, city, street, phone,
          president_name, president_position, metadata, entity_code
        ) VALUES ${values.join(', ')}
      `;
      try {
        await client.query(sql, params);
        inserted += batch.length;
        process.stdout.write(`\r   Progress: ${inserted}/${rows.length} organizations`);
      } catch (err) {
        console.error(`\n   ❌ Batch insert error at ${b}:`, err.message);
        // Try individually to salvage
        for (const r of batch) {
          try {
            const theDate = r.estDate || '1990-01-01';
            const seqStr = String(r.seq).padStart(7, '0');
            const unified = `UC-${seqStr}`;
            const regNum = r.rawRegNo ? `${r.rawRegNo}-${seqStr}` : `REG-${seqStr}`;
            await client.query(`
              INSERT INTO organizational_entities (
                name_ar, unified_code, registration_number,
                entity_type, classification, legal_form, sector,
                status, compliance_status, risk_level,
                establishment_date, registration_date, governorate, city, street, phone,
                president_name, president_position, metadata, entity_code
              ) VALUES ($1,$2,$3,$4::entity_type,$5::classification,$6::legal_form,$7::sector,
                'active'::entity_status,'compliant'::compliance_status,'low'::risk_level,
                $8,$8,$9,$9,$10,$11,$12,$13,$14::jsonb,$15)
            `, [
              r.name, unified, regNum, r.entity_type, r.classification, r.legal_form, r.sector,
              theDate, r.gov, r.address, r.phone, r.official, r.position,
              JSON.stringify({ source: 'المنظمات25', ref_no: r.rawRefNo, reg_no: r.rawRegNo }),
              `ORG-${seqStr}`
            ]);
            inserted++;
          } catch (e2) {
            skipped++;
          }
        }
      }
    }
    console.log(`\n\n✅ Successfully inserted ${inserted} organizations. Skipped/errors: ${skipped}`);

    const total = await client.query(`SELECT COUNT(*)::int AS c FROM organizational_entities WHERE deleted_at IS NULL`);
    console.log(`📊 Total organizational_entities now: ${total.rows[0].c}`);

  } catch (err) {
    console.error('❌ Critical error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
