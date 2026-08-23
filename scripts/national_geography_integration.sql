-- ============================================================================
-- national_geography_integration.sql — الجغرافيا الوطنية والتكامل المؤسسي
-- المحافظات (22) + المديريات + مكاتب الوزارة + منطق الترابط مع السجلات
--
-- منطق الخبير المؤسسي:
--   • national_governorates   — المرجع الأم للمحافظات (رموز رسمية + نطاق)
--   • national_directorates   — المديريات مرتبطة برمز المحافظة (FK)
--   • national_ministry_offices — مكاتب الوزارة في المحافظات (تغطية كاملة)
--   • v_establishment_geography — ربط سجل المنشآت الرئيسي بالجغرافيا
--   • fn_normalize_gov        — توحيد كتابة اسم المحافظة (تطابق متسامح)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 1) المحافظات — المرجع الأم ----------
CREATE TABLE IF NOT EXISTS national_governorates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gov_code    TEXT UNIQUE NOT NULL,
  name_ar     TEXT UNIQUE NOT NULL,
  name_en     TEXT,
  region      TEXT CHECK (region IN ('وسط','جنوب','شرق','شمال','غرب')),
  capital_ar  TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO national_governorates (gov_code, name_ar, name_en, region, capital_ar, sort_order) VALUES
  ('AMN', 'أمانة العاصمة', 'Amanat Al-Asimah', 'وسط', 'صنعاء', 1),
  ('SN',  'صنعاء',         'Sana''a',            'وسط', 'صنعاء', 2),
  ('AD',  'عدن',           'Aden',               'جنوب', 'عدن', 3),
  ('TA',  'تعز',           'Taiz',               'جنوب', 'تعز', 4),
  ('LA',  'لحج',           'Lahj',               'جنوب', 'الحوت', 5),
  ('AB',  'أبين',          'Abyan',              'جنوب', 'زنجبار', 6),
  ('SH',  'شبوة',          'Shabwah',            'شرق', 'عتق', 7),
  ('HD',  'حضرموت',        'Hadramaut',          'شرق', 'المكلا', 8),
  ('MR',  'المهرة',        'Al-Mahrah',          'شرق', 'الغيضة', 9),
  ('SC',  'سقطرى',         'Socotra',            'شرق', 'حاديبو', 10),
  ('JA',  'الجوف',         'Al-Jawf',            'شمال', 'الحزم', 11),
  ('MJ',  'مأرب',          'Marib',              'وسط', 'مأرب', 12),
  ('BY',  'البيضاء',       'Al-Bayda',           'وسط', 'البيضاء', 13),
  ('HU',  'الحديدة',       'Al-Hudaydah',        'غرب', 'الحديدة', 14),
  ('IB',  'إب',            'Ibb',                'وسط', 'إب', 15),
  ('DA',  'ذمار',          'Dhamar',             'وسط', 'ذمار', 16),
  ('RD',  'الريمة',        'Raymah',             'غرب', 'الجبين', 17),
  ('HJ',  'حجة',           'Hajjah',             'شمال', 'حجة', 18),
  ('SD',  'صعدة',          'Sa''dah',            'شمال', 'صعدة', 19),
  ('AM',  'عمران',         'Amran',              'شمال', 'عمران', 20),
  ('MA',  'المحويت',       'Al-Mahwit',          'غرب', 'المحويت', 21),
  ('DH',  'الضالع',        'Al-Dhale''e',        'جنوب', 'الضالع', 22)
ON CONFLICT (gov_code) DO NOTHING;

-- ---------- 2) المديريات — مرتبطة برمز المحافظة ----------
CREATE TABLE IF NOT EXISTS national_directorates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dir_code    TEXT UNIQUE NOT NULL,
  name_ar     TEXT NOT NULL,
  gov_code    TEXT NOT NULL REFERENCES national_governorates(gov_code),
  is_capital  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (name_ar, gov_code)
);
CREATE INDEX IF NOT EXISTS idx_nat_dirs_gov ON national_directorates(gov_code);

INSERT INTO national_directorates (dir_code, name_ar, gov_code, is_capital) VALUES
  -- أمانة العاصمة (8)
  ('AMN-01','أزال','AMN',FALSE),('AMN-02','بني الحارث','AMN',FALSE),('AMN-03','الثورة','AMN',FALSE),
  ('AMN-04','الصافية','AMN',FALSE),('AMN-05','السبعين','AMN',TRUE),('AMN-06','الشعوب','AMN',FALSE),
  ('AMN-07','التحرير','AMN',FALSE),('AMN-08','معين','AMN',FALSE),
  -- صنعاء (15)
  ('SN-01','أرحب','SN',FALSE),('SN-02','العطال','SN',FALSE),('SN-03','الحيمة الداخلية','SN',FALSE),
  ('SN-04','الحيمة الخارجية','SN',FALSE),('SN-05','جحانة','SN',FALSE),('SN-06','همدان','SN',FALSE),
  ('SN-07','خولان','SN',FALSE),('SN-08','مناخة','SN',FALSE),('SN-09','نهم','SN',FALSE),
  ('SN-10','سنحان وبني بهلول','SN',FALSE),('SN-11','شبام كوكبان','SN',FALSE),('SN-12','بني حشيش','SN',FALSE),
  ('SN-13','بني مطر','SN',FALSE),('SN-14','بلاد الروس','SN',FALSE),('SN-15','جبل الشرق','SN',FALSE),
  -- عدن (7)
  ('AD-01','التواهي','AD',FALSE),('AD-02','كريتر','AD',TRUE),('AD-03','خور مكسر','AD',FALSE),
  ('AD-04','الشيخ عثمان','AD',FALSE),('AD-05','المنصورة','AD',FALSE),('AD-06','بوريقا','AD',FALSE),
  ('AD-07','دار سعد','AD',FALSE),
  -- تعز (17)
  ('TA-01','صالة','TA',TRUE),('TA-02','المظفر','TA',FALSE),('TA-03','القاهرة','TA',FALSE),
  ('TA-04','الحوبان','TA',FALSE),('TA-05','جبل حبشي','TA',FALSE),('TA-06','المعافر','TA',FALSE),
  ('TA-07','الموسيم','TA',FALSE),('TA-08','التعزية','TA',FALSE),('TA-09','شرعب السلام','TA',FALSE),
  ('TA-10','شرعب الرونة','TA',FALSE),('TA-11','سامي','TA',FALSE),('TA-12','حيفان','TA',FALSE),
  ('TA-13','ماوية','TA',FALSE),('TA-14','وسم','TA',FALSE),('TA-15','المقاطيرة','TA',FALSE),
  ('TA-16','المفرح المفلحي','TA',FALSE),('TA-17','ذي نجار','TA',FALSE),
  -- لحج (10)
  ('LA-01','الطور','LA',TRUE),('LA-02','يافع','LA',FALSE),('LA-03','ردفان','LA',FALSE),
  ('LA-04','تبن','LA',FALSE),('LA-05','القبيطة','LA',FALSE),('LA-06','طور الباحة','LA',FALSE),
  ('LA-07','المضاربة والمصايدة','LA',FALSE),('LA-08','الجند','LA',FALSE),('LA-09','ذي نجار','LA',FALSE),
  ('LA-10','حجري','LA',FALSE),
  -- أبين (7)
  ('AB-01','زنجبار','AB',TRUE),('AB-02','جار','AB',FALSE),('AB-03','وادي عبسان','AB',FALSE),
  ('AB-04','لدر','AB',FALSE),('AB-05','شقرا','AB',FALSE),('AB-06','خنفر','AB',FALSE),
  ('AB-07','بيان','AB',FALSE),
  -- شبوة (10)
  ('SH-01','عتق','SH',TRUE),('SH-02','عين','SH',FALSE),('SH-03','بيحان','SH',FALSE),
  ('SH-04','نصاب','SH',FALSE),('SH-05','حبان','SH',FALSE),('SH-06','مرخة','SH',FALSE),
  ('SH-07','روكب','SH',FALSE),('SH-08','قطابر','SH',FALSE),('SH-09','حطم','SH',FALSE),
  ('SH-10','عرم','SH',FALSE),
  -- حضرموت (8)
  ('HD-01','المكلا','HD',TRUE),('HD-02','سيئون','HD',FALSE),('HD-03','تريم','HD',FALSE),
  ('HD-04','غيل باوزير','HD',FALSE),('HD-05','شبام','HD',FALSE),('HD-06','القطن','HD',FALSE),
  ('HD-07','بروم ميفعة','HD',FALSE),('HD-08','عمد','HD',FALSE),
  -- المهرة (7)
  ('MR-01','الغيضة','MR',TRUE),('MR-02','حاجر','MR',FALSE),('MR-03','قشن','MR',FALSE),
  ('MR-04','الظهر','MR',FALSE),('MR-05','حوف','MR',FALSE),('MR-06','شحن','MR',FALSE),
  ('MR-07','ردوم','MR',FALSE),
  -- سقطرى (3)
  ('SC-01','حاديبو','SC',TRUE),('SC-02','قلنسية وعبد الكوري','SC',FALSE),('SC-03','دكسم','SC',FALSE),
  -- الجوف (6)
  ('JA-01','الحزم','JA',TRUE),('JA-02','البراق','JA',FALSE),('JA-03','خب والشف','JA',FALSE),
  ('JA-04','المطون','JA',FALSE),('JA-05','الرغوان','JA',FALSE),('JA-06','خراب المراشدة','JA',FALSE),
  -- مأرب (5)
  ('MJ-01','مأرب مدينة','MJ',TRUE),('MJ-02','مأرب','MJ',FALSE),('MJ-03','الجوبة','MJ',FALSE),
  ('MJ-04','حريب','MJ',FALSE),('MJ-05','صرواح','MJ',FALSE),
  -- البيضاء (10)
  ('BY-01','البيضاء','BY',TRUE),('BY-02','رداع','BY',FALSE),('BY-03','الناطع','BY',FALSE),
  ('BY-04','الصوميع','BY',FALSE),('BY-05','الجوشن','BY',FALSE),('BY-06','مكيراس','BY',FALSE),
  ('BY-07','مذية','BY',FALSE),('BY-08','السودة','BY',FALSE),('BY-09','نعمان','BY',FALSE),
  ('BY-10','قيفة','BY',FALSE),
  -- الحديدة (9)
  ('HU-01','الحديدة','HU',TRUE),('HU-02','بيت الفقيه','HU',FALSE),('HU-03','بجل','HU',FALSE),
  ('HU-04','الزيدية','HU',FALSE),('HU-05','الخرخير','HU',FALSE),('HU-06','الجراحي','HU',FALSE),
  ('HU-07','الزهرة','HU',FALSE),('HU-08','الدريهمي','HU',FALSE),('HU-09','المنصورية','HU',FALSE),
  -- إب (10)
  ('IB-01','إب','IB',TRUE),('IB-02','العدين','IB',FALSE),('IB-03','يريم','IB',FALSE),
  ('IB-04','جبلة','IB',FALSE),('IB-05','المخادر','IB',FALSE),('IB-06','السدة','IB',FALSE),
  ('IB-07','بعدان','IB',FALSE),('IB-08','الظهار','IB',FALSE),('IB-09','الرضم','IB',FALSE),
  ('IB-10','حزم العدين','IB',FALSE),
  -- ذمار (5)
  ('DA-01','ذمار','DA',TRUE),('DA-02','عنس','DA',FALSE),('DA-03','وصاب العالي','DA',FALSE),
  ('DA-04','وصاب السافل','DA',FALSE),('DA-05','الحدا','DA',FALSE),
  -- الريمة (5)
  ('RD-01','الجبين','RD',TRUE),('RD-02','كسمة','RD',FALSE),('RD-03','بني عطية','RD',FALSE),
  ('RD-04','السلفية','RD',FALSE),('RD-05','مزهر','RD',FALSE),
  -- حجة (12)
  ('HJ-01','حجة','HJ',TRUE),('HJ-02','عبس','HJ',FALSE),('HJ-03','أفلح الشام','HJ',FALSE),
  ('HJ-04','أفلح اليمن','HJ',FALSE),('HJ-05','الجديدة','HJ',FALSE),('HJ-06','الخبت','HJ',FALSE),
  ('HJ-07','المحابشة','HJ',FALSE),('HJ-08','شرس','HJ',FALSE),('HJ-09','مستبا','HJ',FALSE),
  ('HJ-10','بنى قيس','HJ',FALSE),('HJ-11','قفلة شمر','HJ',FALSE),('HJ-12','الشغادرة','HJ',FALSE),
  -- صعدة (10)
  ('SD-01','صعدة','SD',TRUE),('SD-02','ساقين','SD',FALSE),('SD-03','ظاهر','SD',FALSE),
  ('SD-04','حيدان','SD',FALSE),('SD-05','مجز','SD',FALSE),('SD-06','رازح','SD',FALSE),
  ('SD-07','كتاف','SD',FALSE),('SD-08','السفيان','SD',FALSE),('SD-09','الحشم','SD',FALSE),
  ('SD-10','منبه','SD',FALSE),
  -- عمران (9)
  ('AM-01','عمران','AM',TRUE),('AM-02','جبل عيال يزيد','AM',FALSE),('AM-03','ثعلب','AM',FALSE),
  ('AM-04','حرف سفيان','AM',FALSE),('AM-05','الخرق','AM',FALSE),('AM-06','بني صريم','AM',FALSE),
  ('AM-07','العشة','AM',FALSE),('AM-08','شهارة','AM',FALSE),('AM-09','حنكة','AM',FALSE),
  -- المحويت (7)
  ('MA-01','المحويت','MA',TRUE),('MA-02','الطويلة','MA',FALSE),('MA-03','بني معاذ','MA',FALSE),
  ('MA-04','الجابرة','MA',FALSE),('MA-05','ملحان','MA',FALSE),('MA-06','الحمادي','MA',FALSE),
  ('MA-07','الرجام','MA',FALSE),
  -- الضالع (8)
  ('DH-01','الضالع','DH',TRUE),('DH-02','الحصين','DH',FALSE),('DH-03','الجحوب','DH',FALSE),
  ('DH-04','الحشاء','DH',FALSE),('DH-05','قعطبة','DH',FALSE),('DH-06','الشعيب','DH',FALSE),
  ('DH-07','بتيس','DH',FALSE),('DH-08','العظم','DH',FALSE)
ON CONFLICT (dir_code) DO NOTHING;

-- ---------- 3) مكاتب الوزارة في المحافظات (تغطية كاملة) ----------
CREATE TABLE IF NOT EXISTS national_ministry_offices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code TEXT UNIQUE NOT NULL,
  name_ar     TEXT NOT NULL,
  gov_code    TEXT NOT NULL REFERENCES national_governorates(gov_code),
  dir_code    TEXT REFERENCES national_directorates(dir_code),
  office_type TEXT DEFAULT 'main' CHECK (office_type IN ('main','branch','unit')),
  address     TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO national_ministry_offices (office_code, name_ar, gov_code, dir_code, office_type)
SELECT 'MO-' || g.gov_code,
       'مكتب الوزارة — محافظة ' || g.name_ar,
       g.gov_code,
       (SELECT d.dir_code FROM national_directorates d WHERE d.gov_code = g.gov_code AND d.is_capital LIMIT 1),
       'main'
FROM national_governorates g
ON CONFLICT (office_code) DO NOTHING;

-- ---------- 4) توحيد مطابقة أسماء المحافظات مع السجلات ----------
CREATE OR REPLACE FUNCTION fn_normalize_gov(p_name TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(TRIM(REGEXP_REPLACE(COALESCE(p_name,''), '\s+', ' ', 'g')), '');
$$;

-- ---------- 5) عرض التكامل: سجل المنشآت الرئيسي ↔ الجغرافيا ----------
CREATE OR REPLACE VIEW v_establishment_geography AS
SELECT
  e.id,
  e.establishment_id,
  e.unified_code,
  e.name_ar,
  e.sector,
  e.classification,
  e.status,
  e.employees_count,
  e.governorate AS governorate_raw,
  g.gov_code,
  g.name_ar AS governorate_name,
  g.region,
  o.office_code,
  o.name_ar AS jurisdiction_office
FROM commercial_establishments e
LEFT JOIN national_governorates g
  ON fn_normalize_gov(e.governorate) = g.name_ar
LEFT JOIN national_ministry_offices o
  ON o.gov_code = g.gov_code AND o.office_type = 'main';

-- ---------- 6) عرض التجميع الوطني عبر السجلات ----------
CREATE OR REPLACE VIEW v_national_geo_rollup AS
SELECT
  g.gov_code,
  g.name_ar AS governorate,
  g.region,
  (SELECT COUNT(*)::int FROM commercial_establishments e
    WHERE fn_normalize_gov(e.governorate) = g.name_ar) AS establishments_count,
  (SELECT COALESCE(SUM(e.employees_count),0)::int FROM commercial_establishments e
    WHERE fn_normalize_gov(e.governorate) = g.name_ar) AS registered_workers,
  (SELECT COUNT(*)::int FROM organizational_entities oe
    WHERE fn_normalize_gov(oe.governorate) = g.name_ar) AS unions_entities_count,
  (SELECT COUNT(*)::int FROM irregular_workers iw
    WHERE fn_normalize_gov(iw.governorate) = g.name_ar) AS irregular_workers_count,
  (SELECT COUNT(*)::int FROM national_directorates d
    WHERE d.gov_code = g.gov_code AND d.is_active) AS directorates_count,
  (SELECT COUNT(*)::int FROM national_ministry_offices o
    WHERE o.gov_code = g.gov_code AND o.is_active) AS ministry_offices_count
FROM national_governorates g
ORDER BY g.sort_order;