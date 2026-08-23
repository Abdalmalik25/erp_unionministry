import pg from 'pg';
import { readFileSync } from 'fs';
const env = readFileSync('G:\\App25\\unionministry1\\.env', 'utf8').split('\n');
env.forEach(l => {
  const t = l.trim();
  if (!t || t.startsWith('#')) return;
  const i = t.indexOf('=');
  if (i === -1) return;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[k]) process.env[k] = v;
});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, l = 3) => String(n).padStart(l, '0');

const c = await pool.connect();
try {
  await c.query('BEGIN');

  const ents = await c.query('select entity_id, name_ar from organizational_entities where deleted_at is null');
  const members = await c.query('select id, full_name from members where deleted_at is null');
  const profs = await c.query('select id from professions');
  if (!ents.rows.length) throw new Error('لا توجد كيانات مسجلة — شغّل سكربت seed-data.mjs أولاً');
  if (!members.rows.length) throw new Error('لا يوجد أعضاء — شغّل سكربت seed-data.mjs أولاً');

  const ent = () => rnd(ents.rows);
  const member = () => rnd(members.rows);
  const prof = () => rnd(profs.rows);

  const nat = ['هندي', 'مصري', 'أردني', 'سوداني', 'باكستاني', 'فلبيني', 'بنغلاديشي', 'إثيوبي'];
  const wnames = ['أحمد علي', 'محمد حسن', 'سالم محمد', 'خالد أحمد', 'عمر سعيد', 'ياسر ناصر', 'فاطمة علي', 'نورة سالم', 'سارة خالد', 'مريم حسن', 'عبدالله سعيد', 'هاني عمر'];
  const causes = ['تأخر في صرف الأجور', 'فصل تعسفي', 'عدم توفير بيئة عمل آمنة', 'نزاع حول العلاوات', 'إنهاء خدمة دون مبرر', 'تحويل مهنة قسرية', 'عدم صرف مستحقات نهاية الخدمة'];
  const redCats = ['هيكلة تنظيمية', 'ظروف اقتصادية', 'دمج إدارات', 'تقليص أنشطة', 'أتمتة عمليات'];
  const purposes = ['تدريب مهني', 'دعم فني مؤقت', 'تغطية نقص بالكوادر', 'مشروع مشترك', 'صيانة دورية', 'تشغيل خط إنتاج'];
  const estTypes = ['company', 'corporation', 'llc', 'factory', 'shop', 'office', 'service', 'craft'];
  const sectors = ['industry', 'services', 'construction', 'healthcare', 'education', 'trade', 'technology', 'finance', 'tourism'];
  const sizes = ['small', 'medium', 'large', 'mega'];
  const estStatus = ['active', 'active', 'active', 'suspended', 'under_review'];
  const gov = ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'مأرب', 'حضرموت', 'إب', 'ذمار'];

  // ---- expatriate_licenses ----
  const elCount = (await c.query('select count(*)::int n from expatriate_licenses')).rows[0].n;
  if (elCount === 0) {
    for (let i = 1; i <= 14; i++) {
      const e = ent();
      const status = rnd(['نشط', 'نشط', 'نشط', 'منتهي', 'ملغي']);
      await c.query(
        `insert into expatriate_licenses (enterprise_id, expatriate_name, expatriate_nationality, passport_number, license_number, issue_date, expiry_date, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
        [e.entity_id, rnd(wnames), rnd(nat), 'P' + pad(i, 7), 'EXP-' + pad(i), '2024-01-15', '2026-01-14', status]
      );
    }
    console.log('  expatriate_licenses: 14');
  } else console.log('  expatriate_licenses: skipped (has ' + elCount + ')');

  // ---- labor_disputes ----
  const ldCount = (await c.query('select count(*)::int n from labor_disputes')).rows[0].n;
  if (ldCount === 0) {
    for (let i = 1; i <= 12; i++) {
      const e = ent();
      await c.query(
        `insert into labor_disputes (enterprise_id, enterprise_name, worker_name, occupation_id, dispute_type, dispute_description, dispute_date, settlement_proposal, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [e.entity_id, e.name_ar, rnd(wnames), prof().id, rnd(['فردي', 'جماعي', 'أجور', 'فصل تعسفي', 'بيئة عمل']), rnd(causes), '2025-0' + (i % 9 + 1) + '-10', 'الجلوس للتفاوض ودياً', rnd(['قيد النظر', 'تم التسوية ودياً', 'محال للقضاء العمالي'])]
      );
    }
    console.log('  labor_disputes: 12');
  } else console.log('  labor_disputes: skipped (has ' + ldCount + ')');

  // ---- worker_reduction_requests ----
  const rrCount = (await c.query('select count(*)::int n from worker_reduction_requests')).rows[0].n;
  if (rrCount === 0) {
    for (let i = 1; i <= 10; i++) {
      const e = ent();
      await c.query(
        `insert into worker_reduction_requests (request_number, enterprise_id, enterprise_name, requested_reduction_count, current_employee_count, reduction_reason, reduction_category, legal_basis, detailed_description, status, submitted_at, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW(),NOW())`,
        ['RR-' + pad(i), e.entity_id, e.name_ar, 5 + i, 100 + i * 5, 'تقليص النفقات التشغيلية', rnd(redCats), 'المادة 87 من قانون العمل', 'طلب تخفيض العمالة بناءً على خطة إعادة الهيكلة', rnd(['مسودة', 'قيد المراجعة', 'قيد مراجعة القسم', 'تمت الموافقة النهائية', 'مرفوض'])]
      );
    }
    console.log('  worker_reduction_requests: 10');
  } else console.log('  worker_reduction_requests: skipped (has ' + rrCount + ')');

  // ---- worker_dispatches ----
  const wdCount = (await c.query('select count(*)::int n from worker_dispatches')).rows[0].n;
  if (wdCount === 0) {
    for (let i = 1; i <= 12; i++) {
      const s = ent();
      const r = ent();
      await c.query(
        `insert into worker_dispatches (dispatch_number, sending_enterprise_id, sending_enterprise_name, receiving_enterprise_id, receiving_enterprise_name, occupation_id, worker_name, worker_national_id, dispatch_date, expected_return_date, purpose, legal_basis, status, safety_briefing_done, medical_clearance_done, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
        ['DISP-' + pad(i), s.entity_id, s.name_ar, r.entity_id, r.name_ar, prof().id, rnd(wnames), '200' + pad(i, 8), '2025-03-0' + (i % 9 + 1), '2025-09-0' + (i % 9 + 1), rnd(purposes), 'المادة 102 من قانون العمل', rnd(['مسودة', 'قيد الموافقة', 'تمت الموافقة', 'جاري التنفيذ', 'مكتمل']), true, true]
      );
    }
    console.log('  worker_dispatches: 12');
  } else console.log('  worker_dispatches: skipped (has ' + wdCount + ')');

  // ---- worker_profiles ----
  const wpCount = (await c.query('select count(*)::int n from worker_profiles')).rows[0].n;
  if (wpCount === 0) {
    const used = new Set();
    for (let i = 0; i < Math.min(18, members.rows.length); i++) {
      const m = members.rows[i];
      const e = ent();
      await c.query(
        `insert into worker_profiles (member_id, current_enterprise_id, current_occupation_id, employment_status, employment_start_date, contract_type, social_insurance_number, current_salary_grade, total_experience_years, compliance_score, notes, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
        [m.id, e.entity_id, prof().id, rnd(['دائم', 'مؤقت', 'موسمي', 'تدريب']), '2023-0' + (i % 9 + 1) + '-01', rnd(['سنوي', 'محدد المدة', 'مؤقت']), 'SI' + pad(i, 6), rnd(['درجة أ', 'درجة ب', 'درجة ج']), 2 + (i % 15), (60 + (i * 3) % 40), 'ملف تعريف العامل', ]
      );
    }
    console.log('  worker_profiles: ' + Math.min(18, members.rows.length));
  } else console.log('  worker_profiles: skipped (has ' + wpCount + ')');

  // ---- commercial_establishments ----
  const ceCount = (await c.query('select count(*)::int n from commercial_establishments')).rows[0].n;
  if (ceCount === 0) {
    const names = ['مؤسسة الأمل التجارية', 'شركة الفجر للصناعات', 'مصنع النور للأغذية', 'متجر الراحة', 'مكتب الخليج للاستشارات', 'شركة البناء الحديث', 'مؤسسة الصحة المتقدمة', 'شركة التقنية الذكية', 'مصنع النسيج الوطني', 'مكتب المعاملات المالية', 'شركة السياحة الفضلى', 'مؤسسة الخدمات الشاملة'];
    for (let i = 0; i < names.length; i++) {
      const g = rnd(gov);
      await c.query(
        `insert into commercial_establishments (establishment_id, unified_code, commercial_register_number, name_ar, name_en, entity_type, sector, classification, status, governorate, city, address, phone, email, owner_name, capital_amount, employees_count, license_number, license_date, expiry_date, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),NOW())`,
        ['EST-' + pad(i + 1), 'UC' + pad(i + 1, 4), 'CR' + pad(i + 1, 5), names[i], names[i].replace(/[^\x00-\x7F]/g, '') + ' Co', rnd(estTypes), rnd(sectors), rnd(sizes), rnd(estStatus), g, g, 'شارع الرئيسي', '01' + pad(i, 7), 'info' + (i + 1) + '@example.ye', 'مالك ' + (i + 1), 1000000 + i * 500000, 20 + i * 10, 'LIC-' + pad(i + 1), '2024-01-01', '2027-01-01']
      );
    }
    console.log('  commercial_establishments: ' + names.length);
  } else console.log('  commercial_establishments: skipped (has ' + ceCount + ')');

  // ---- enterprise_occupation_links ----
  const eolCount = (await c.query('select count(*)::int n from enterprise_occupation_links')).rows[0].n;
  if (eolCount === 0) {
    const estList = (await c.query('select entity_id as id, name_ar from organizational_entities limit 25')).rows;
    const profList = (await c.query('select id, name_ar, isco_code from professions limit 30')).rows;
    if (estList.length && profList.length) {
      for (let i = 0; i < estList.length; i++) {
        const est = estList[i];
        const p1 = profList[i % profList.length];
        const p2 = profList[(i + 1) % profList.length];
        for (const p of [p1, p2]) {
          await c.query(
            `insert into enterprise_occupation_links (enterprise_id, occupation_id, enterprise_name, cr_number, occupation_code, occupation_name_ar, isco_code, department, allocated_headcount, yemeni_headcount, expatriate_headcount, salary_scale, contract_types, yemenization_policy, link_status, compliance_score, labor_law_compliant, salary_compliant, osh_compliant, medical_checks_done, yemenization_compliant, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW())`,
            [est.id, p.id, est.name_ar, est.commercial_register_number || 'CR-001', p.isco_code, p.name_ar, p.isco_code, 'الإدارة والتشغيل', 10, 8, 2, 'فئة أ - رواتب معتمدة', ['عقود محددة المدة'], 'مستوفية كوتة التوطين 80%', 'نشط', 92, true, true, true, true, true]
          );
        }
      }
      console.log('  enterprise_occupation_links: ' + (estList.length * 2));
    }
  } else console.log('  enterprise_occupation_links: skipped (has ' + eolCount + ')');

  await c.query('COMMIT');
  console.log('\n✅ تم إدراج بيانات تجريبية للجداول الفارغة.');
} catch (err) {
  await c.query('ROLLBACK');
  console.error('❌ خطأ:', err.message);
} finally {
  await c.release();
  await pool.end();
}
