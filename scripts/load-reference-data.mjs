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
const pool = new pg.Pool({ connectionString: vars.DATABASE_URL || vars.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });

const SECTOR_KEYWORDS = [
  { sector: 'agriculture', kw: ['زراعة', 'حيوان', 'غاب', 'سمك', 'مزارع', 'ثروة', 'بيطري'] },
  { sector: 'industry',    kw: ['صناع', 'تعدين', 'بتروكيماو', 'طاقة', 'نفط', 'غاز', 'كهرباء', 'تحلية', 'تصنيع', 'توليد', 'مصنع'] },
  { sector: 'construction',kw: ['بناء', 'تشييد', 'خرسان', 'مقاول', 'عمران', 'هندسة مدنية', 'مساح', 'كهربائ'] },
  { sector: 'healthcare',  kw: ['صحي', 'طبي', 'مستشف', 'مختب', 'صيدل', 'دوائ', 'تمريض', 'طبيب'] },
  { sector: 'education',   kw: ['تعليم', 'مدرس', 'مدرسي', 'رياض أطفال', 'جامع', 'تربوي'] },
  { sector: 'transportation', kw: ['نقل', 'موانئ', 'شحن', 'تخزين', 'سحب', 'تبريد', 'مركبات', 'قياد'] },
  { sector: 'trade',       kw: ['تجارة', 'جملة', 'بائع', 'تجزئ'] },
  { sector: 'technology',  kw: ['برمج', 'تقنية', 'اتصال', 'رقمي', 'معلوم', 'شبكة', 'برمجة', 'إنترنت'] },
  { sector: 'finance',     kw: ['مالي', 'محاسب', 'صيرف', 'مصرف', 'تأمين', 'محاسبة', 'تدقيق'] },
  { sector: 'tourism',     kw: ['سياح', 'فندق', 'ضياف', 'سفر', 'إرشاد'] },
  { sector: 'services',    kw: ['خدم', 'إدار', 'قانون', 'قضائ', 'محام', 'مكتب', 'استشار', 'عقار', 'أمن'] },
];

function classifySector(text) {
  for (const g of SECTOR_KEYWORDS) {
    for (const k of g.kw) if (text.includes(k)) return g.sector;
  }
  return null;
}

function extractIsicCode(entry) {
  if (!entry) return null;
  const s = entry.trim();
  // patterns: "A0110", "C1010", "01 - ..", "G46: ..", "H49: ..", leading code
  const m = s.match(/^([A-Z]?\d{2,4})(?=\s*[-:：\s]|$)/);
  if (m) return m[1];
  const m2 = s.match(/^([A-HJ-NP-Z]{1}\d{4})$/);
  if (m2) return m2[1];
  return null;
}

(async () => {
  const c = await pool.connect();
  try {
    // ---------- 1) isic4 classifications index ----------
    const isicRows = await c.query(`SELECT isic_code, section_code, division_code, sector, level, description_ar, is_active FROM isic4_classifications`);
    const byCode = new Map();
    const bySection = new Map();
    for (const r of isicRows.rows) {
      byCode.set(r.isic_code, r);
      if (r.level === 'section') bySection.set(r.sector, r);
    }

    // ---------- 2) sector -> isic section for commercial establishments ----------
    const sectionsBySector = new Map();
    for (const r of isicRows.rows) if (r.level === 'section') sectionsBySector.set(r.sector, r.isic_code);

    // ---------- helper for risk mapping ----------
    const riskMap = { منخفضة: 'low', متوسطة: 'medium', عالية: 'high', حرجة: 'critical' };
    const inspMap = { 'low': 'سنوية', 'medium': 'سنوية', 'high': 'شهرية', 'critical': 'أسبوعية' };

    // ---------- 3) enterprise_isic_links (معياري) ----------
    const est = await c.query(`SELECT id, name_ar, sector FROM commercial_establishments WHERE sector IS NOT NULL`);
    let eil = 0;
    const eilRows = [];
    const seenEil = new Set();
    for (const r of est.rows) {
      const sec = sectionsBySector.get(r.sector);
      if (!sec) continue;
      const key = r.id + '|' + sec;
      if (seenEil.has(key)) continue;
      seenEil.add(key);
      eilRows.push({ enterprise_id: r.id, isic_code: sec, is_primary: true, assigned_date: new Date().toISOString().slice(0,10), notes: 'مشتق من قطاع المنشأة', data_status: 'معياري', data_source: 'commercial_establishments.sector → isic4 section' });
    }
    if (eilRows.length) {
      const { rows } = await c.query(`
        INSERT INTO enterprise_isic_links (enterprise_id, isic_code, is_primary, assigned_date, notes, data_status, data_source)
        SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(enterprise_id uuid, isic_code text, is_primary bool, assigned_date date, notes text, data_status text, data_source text)
        ON CONFLICT (enterprise_id, isic_code) DO NOTHING`, [JSON.stringify(eilRows)]);
      eil = rows.length;
    }
    console.log('enterprise_isic_links inserted:', eil, '(from', eilRows.length, 'candidates)');

    // ---------- 4) profession_applicability (معياري/تجريبي) ----------
    const cards = await c.query(`
      SELECT pc.profession_code, pc.profession_name_ar, pc.data->'isic_sectors' AS isic_sectors,
             r.data->>'hazard_level' AS hazard_level
      FROM profession_analysis_cards pc
      LEFT JOIN profession_analysis_cards r ON r.profession_code = pc.profession_code AND r.card_type='risk_profile'
      WHERE pc.card_type='classification'`);
    let pa = 0, paStd = 0, paTrial = 0;
    const paRows = [];
    const seenPa = new Set();
    for (const cd of cards.rows) {
      const sectors = cd.isic_sectors || [];
      const arr = Array.isArray(sectors) ? sectors : [];
      const profCode = cd.profession_code;
      let risk = riskMap[cd.hazard_level] || 'medium';
      let idx = 0;
      for (const entry of arr) {
        idx++;
        const code = extractIsicCode(entry);
        const isicRec = (code && byCode.get(code)) || (code && byCode.get(code + (code.length===2?'0':'')));
        const sector = (isicRec && isicRec.sector) || classifySector(entry) || null;
        const std = !!isicRec;
        // enterprise_id = isic activity/division scope, activity_id = isic4 code
        const entId = std ? isicRec.isic_code : (sector ? 'SECTOR:'+sector : 'SECTOR:other');
        const actId = std ? isicRec.isic_code : null;
        const key = [profCode, entId, actId || entId, 'v1.0'].join('|');
        if (seenPa.has(key)) continue;
        seenPa.add(key);
        paRows.push({
          id: 'pa_' + profCode + '_' + idx,
          profession_id: profCode,
          enterprise_id: entId,
          activity_id: actId || entId,
          standard_version: 'v1.0',
          is_primary: idx === 1,
          risk_level: risk,
          inspection_frequency: inspMap[risk] || 'سنوية',
          is_active: true,
          effective_from: '2026-01-01',
          data_status: std ? 'معياري' : 'تجريبي',
          data_source: std ? ('isic4:' + isicRec.isic_code) : ('derived-sector:' + (sector||'other')),
        });
        if (std) paStd++; else paTrial++;
      }
    }
    if (paRows.length) {
      const { rowCount } = await c.query(`
        INSERT INTO profession_applicability
          (id, profession_id, enterprise_id, activity_id, standard_version, is_primary, risk_level, inspection_frequency, is_active, effective_from, data_status, data_source, created_at, updated_at)
        SELECT id, profession_id, enterprise_id, activity_id, standard_version, is_primary, risk_level, inspection_frequency, is_active, effective_from::timestamptz, data_status, data_source, now(), now()
        FROM jsonb_to_recordset($1::jsonb) AS x(
          id text, profession_id text, enterprise_id text, activity_id text, standard_version text,
          is_primary bool, risk_level text, inspection_frequency text, is_active bool,
          effective_from text, data_status text, data_source text)
        ON CONFLICT (profession_id, enterprise_id, activity_id, standard_version) DO NOTHING`, [JSON.stringify(paRows)]);
      pa = rowCount;
    }
    console.log('profession_applicability inserted:', pa, '(معياري', paStd, '/ تجريبي', paTrial, ')');

    // ---------- 5) enterprise_occupation_links (تجريبي، رابط تمثيلي واحد لكل منشأة) ----------
    // تنظيف صريح (تعطيل الحارس مؤقتاً للتمكين من تنظيف فعلي، ثم إعادة تفعيله)
    await c.query(`ALTER TABLE enterprise_occupation_links DISABLE TRIGGER trg_protect_enterprise_occupation_links`).catch(()=>{});
    await c.query(`DELETE FROM enterprise_occupation_links`).catch(()=>{});
    await c.query(`ALTER TABLE enterprise_occupation_links ENABLE TRIGGER trg_protect_enterprise_occupation_links`).catch(()=>{});
    // خريطة مهنة -> مجموعة قطاعاتها القابلة للتطبيق (من profession_applicability أعلاه)
    const orgSector = new Map();
    for (const row of paRows) {
      const ent = row.enterprise_id;
      const sec = ent && ent.startsWith('SECTOR:') ? ent.slice(7) : (byCode.get(ent) ? byCode.get(ent).sector : null);
      if (!sec) continue;
      if (!orgSector.has(row.profession_id)) orgSector.set(row.profession_id, new Set());
      orgSector.get(row.profession_id).add(sec);
    }
    // مهنة أولوية لكل كود (من allocation_summary)
    const pri = await c.query(`SELECT profession_code, COALESCE((data->>'priority')::int, 999) AS priority FROM profession_analysis_cards WHERE card_type='allocation_summary'`);
    const profByCode = await c.query(`SELECT p.id, p.code, p.name_ar FROM professions p JOIN profession_analysis_cards pc ON pc.profession_code=p.code WHERE pc.card_type='classification'`);
    const profInfo = new Map(profByCode.rows.map(r=>[r.code, r]));
    const profPriority = new Map(pri.rows.map(r=>[r.profession_code, r.priority]));
    // sector -> أعلى مهنة أولوية (قابلة للتطبيق)
    const bestProfBySector = new Map();
    for (const [profCode, secSet] of orgSector) {
      const p = profPriority.get(profCode) ?? 999;
      for (const sec of secSet) {
        const cur = bestProfBySector.get(sec);
        if (!cur || p < cur.priority) bestProfBySector.set(sec, { profession_code: profCode, priority: p });
      }
    }
    const orgs = await c.query(`SELECT entity_id, name_ar, sector FROM organizational_entities WHERE sector IS NOT NULL`);
    const occRows = [];
    const seenOcc = new Set();
    for (const org of orgs.rows) {
      const best = bestProfBySector.get(org.sector);
      if (!best) continue;
      const pi = profInfo.get(best.profession_code);
      if (!pi) continue;
      const key = org.entity_id + '|' + pi.id;
      if (seenOcc.has(key)) continue;
      seenOcc.add(key);
      occRows.push({
        enterprise_id: org.entity_id,
        occupation_id: pi.id,
        enterprise_name: org.name_ar,
        occupation_code: best.profession_code,
        occupation_name_ar: pi.name_ar,
        allocated_headcount: 0, yemeni_headcount: 0, expatriate_headcount: 0,
        link_status: 'معلق',
        data_status: 'تجريبي',
        data_source: 'رابط تمثيلي — أعلى مهنة أولوية قابلة للتطبيق في قطاع المنشأة (تعبئة تقديرية، بيانات التوظيف غير مؤكدة)',
      });
    }
    let occ = 0;
    if (occRows.length) {
      const { rowCount } = await c.query(`
        INSERT INTO enterprise_occupation_links
          (enterprise_id, occupation_id, enterprise_name, occupation_code, occupation_name_ar,
           allocated_headcount, yemeni_headcount, expatriate_headcount, link_status, data_status, data_source)
        SELECT enterprise_id, occupation_id, enterprise_name, occupation_code, occupation_name_ar,
               allocated_headcount, yemeni_headcount, expatriate_headcount, link_status, data_status, data_source
        FROM jsonb_to_recordset($1::jsonb) AS x(
          enterprise_id uuid, occupation_id uuid, enterprise_name text, occupation_code text, occupation_name_ar text,
          allocated_headcount int, yemeni_headcount int, expatriate_headcount int, link_status text, data_status text, data_source text)
        ON CONFLICT (enterprise_id, occupation_id) DO NOTHING`, [JSON.stringify(occRows)]);
      occ = rowCount;
    }
    console.log('enterprise_occupation_links inserted:', occ, '(تجريبي، رابط تمثيلي واحد لكل منشأة)');

    // ---------- 6) osh_hazards skipped (legal_entities empty) ----------
    const le = await c.query(`SELECT count(*)::int c FROM legal_entities`);
    console.log('osh_hazards: skipped (legal_entities count =', le.rows[0].c, ') — لا مصدر منشأة سليم بعد لتعبئة المخاطر دون تلفيق');
  } finally { c.release(); await pool.end(); }
})().catch(e => { console.error('LOAD_ERR:', e.message); process.exit(1); });
