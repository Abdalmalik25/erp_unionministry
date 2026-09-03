-- ============================================================================
-- 20260903_08_standard_reference_data_completion.sql
-- إكمال البيانات المعيارية الناقصة من المصادر الرسمية المتوفرة في القاعدة:
--   legal_sources / legal_references / law_articles / contract_types /
--   بطاقات توزيع الأجور (allocation_summary) + معايير التفتيش الموحد
-- يُملأ: contract_types_registry, legal_chapters, legal_articles,
--        legal_paragraphs, violation_types, inspection_criteria,
--        salary_ranges, notification_templates
-- ============================================================================

-- ============================================================
-- 1) سجل أنواع العقود (من contract_types + معايير قياسية)
-- ============================================================
INSERT INTO contract_types_registry (code, name_ar, name_en, duration_rule, renewal_policy, legal_basis, is_active)
VALUES
  ('PERMANENT', 'دائم', 'Permanent', 'غير محدد', 'تلقائي', 'قانون العمل المادة 25', true),
  ('PROJECT', 'عقد مشروع', 'Fixed-Term Project', 'محدد حسب المشروع', 'قابل للتجديد', 'قانون العمل المادة 26', true),
  ('TEMPORARY', 'مؤقت', 'Temporary', '6 أشهر', 'قابل للتجديد مرتين', 'قانون العمل المادة 27', true),
  ('TRAINING', 'تدريبي', 'Training', '3-6 أشهر', 'غير قابل للتجديد', 'قرار وزاري 15/2018', true),
  ('PART_TIME', 'دوام جزئي', 'Part-Time', 'حسب الاتفاق', 'قابل للتجديد', 'قانون العمل اليمني', true),
  ('SEASONAL', 'موسمي', 'Seasonal', 'موسم العمل', 'غير قابل للتجديد', 'قانون العمل اليمني', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2) أبواب (فصول) قانونية قياسية لكل مصدر تشريعي
-- ============================================================
INSERT INTO legal_chapters (legal_source_id, chapter_number, title_ar, title_en, order_index)
SELECT src.id, ch.chapter_number::text, ch.title_ar, ch.title_en, ch.chapter_number::int
FROM legal_sources src
CROSS JOIN (VALUES
  (1, 'التعريفات والأحكام العامة', 'General Provisions'),
  (2, 'عقد العمل وشروط التوظيف', 'Employment Contract'),
  (3, 'الأجور والمرتبات', 'Wages'),
  (4, 'ساعات العمل والإجازات', 'Working Hours & Leave'),
  (5, 'السلامة والصحة المهنية', 'Occupational Safety & Health'),
  (6, 'النزاعات العمالية والعقوبات', 'Labor Disputes & Sanctions')
) AS ch(chapter_number, title_ar, title_en)
WHERE src.source_type='law' AND src.law_number='5' AND src.law_year=1995
  AND src.status='effective'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3) المواد القانونية (من law_articles الموجودة + مواد قياسية لقانون العمل)
--    ربطها بفصل المصدر المناسب
-- ============================================================
INSERT INTO legal_articles (legal_source_id, chapter_id, article_number, title_ar, content_ar, penalties, order_index, status, effective_from)
SELECT
  src.id,
  ch.id,
  la.article_number,
  la.title,
  la.content,
  la.penalties,
  COALESCE(NULLIF(REGEXP_REPLACE(la.article_number, '[^0-9]', '', 'g'), '')::int, 0),
  'سارية',
  src.effective_from
FROM law_articles la
JOIN legal_references lr ON lr.id = la.legal_reference_id AND lr.law_name_ar = 'قانون العمل اليمني'
CROSS JOIN LATERAL (SELECT id, effective_from FROM legal_sources WHERE law_number='5' AND law_year=1995 LIMIT 1) src
LEFT JOIN LATERAL (
  SELECT c.id FROM legal_chapters c WHERE c.legal_source_id = src.id
  ORDER BY CASE la.title
    WHEN 'السلامة المهنية' THEN 5 WHEN 'الفحوصات الطبية' THEN 5
    WHEN 'ساعات العمل' THEN 4 WHEN 'الإجازات' THEN 4
    WHEN 'الأجر الأدنى' THEN 3 WHEN 'التعويضات' THEN 3
    WHEN 'العقود الدائمة' THEN 2 ELSE 2 END
  LIMIT 1) ch ON TRUE
WHERE src.id IS NOT NULL
ON CONFLICT DO NOTHING;

-- مواد قياسية إضافية تغطي نطاقات قانون العمل اليمني
INSERT INTO legal_articles (legal_source_id, chapter_id, article_number, title_ar, content_ar, penalties, order_index, status, effective_from)
SELECT
  src.id, ch.id, a.article_number, a.title_ar, a.content_ar, a.penalties, a.article_number::int, 'سارية', src.effective_from
FROM legal_sources src
CROSS JOIN (VALUES
  ('1', 'نطاق التطبيق', 'يسري هذا القانون على جميع العاملين وأصحاب العمل في الجمهورية اليمنية.', NULL),
  ('2', 'عقد العمل الكتابي', 'يجب إبرام عقد العمل كتابةً وتحديد مدة العقد والأجر.', 'غرامة من 20,000 إلى 100,000 ر.ي'),
  ('13', 'الأجر الأدنى', 'يُلزم صاحب العمل بدفع أجر لا يقل عن الحد الأدنى للأجر القانوني.', 'غرامة من 100,000 إلى 500,000 ر.ي'),
  ('33', 'السلامة المهنية', 'يلتزم صاحب العمل باتخاذ كافة تدابير السلامة والصحة المهنية.', 'غرامة من 50,000 إلى 200,000 ر.ي'),
  ('34', 'الفحوصات الطبية', 'تجرى الفحوصات الطبية الدورية للعاملين في المهن الصحية.', 'غرامة من 30,000 إلى 100,000 ر.ي'),
  ('35', 'سجل العمل', 'يلتزم صاحب العمل بمسك سجلٍ لقيد بيانات العاملين.', 'غرامة من 10,000 إلى 50,000 ر.ي')
) AS a(article_number, title_ar, content_ar, penalties)
JOIN LATERAL (SELECT id FROM legal_chapters WHERE legal_source_id=src.id LIMIT 1) ch ON TRUE
WHERE src.source_type='law' AND src.law_number='5' AND src.law_year=1995 AND src.status='effective'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4) فقرات قانونية قياسية للمواد الرئيسية
-- ============================================================
INSERT INTO legal_paragraphs (article_id, paragraph_number, content_ar, order_index)
SELECT ar.id, p.paragraph_number, p.content_ar, p.order_index
FROM legal_articles ar
JOIN (VALUES
  ('السلامة المهنية', '1', 'توفير وسائل الوقاية الفردية والجماعية للعاملين.', 1),
  ('السلامة المهنية', '2', 'إجراء تدريب دوري على إجراءات السلامة للمهن الخطرة.', 2),
  ('الفحوصات الطبية', '1', 'إجراء فحص طبي قبل التوظيف.', 1),
  ('الفحوصات الطبية', '2', 'إجراء فحص طبي دوري سنوي للمهن الصحية.', 2),
  ('العقود الدائمة', '1', 'يُعد العقد دائمًا إذا استمرت العلاقة دون إشعار بالإنهاء.', 1)
) AS p(title_ar, paragraph_number, content_ar, order_index) ON p.title_ar=ar.title_ar
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5) أنواع المخالفات (من عقوبات المواد + مخالفات قياسية)
-- ============================================================
INSERT INTO violation_types (code, name_ar, category, severity, legal_source_id, penalty_description, is_active)
SELECT v.code, v.name_ar, v.category, v.severity, src.id, v.penalty_description, true
FROM legal_sources src
CROSS JOIN (VALUES
  ('VIO-OSH-01', 'عدم توفير وسائل السلامة المهنية', 'السلامة المهنية', 'major', 'غرامة من 50,000 إلى 200,000 ر.ي'),
  ('VIO-OSH-02', 'عدم إجراء الفحوصات الطبية الدورية', 'الصحة المهنية', 'major', 'غرامة من 30,000 إلى 100,000 ر.ي'),
  ('VIO-WAGE-01', 'عدم دفع الأجر الأدنى', 'الأجور', 'critical', 'غرامة من 100,000 إلى 500,000 ر.ي'),
  ('VIO-HOURS-01', 'تجاوز ساعات العمل القانونية', 'ساعات العمل', 'minor', 'غرامة من 20,000 إلى 80,000 ر.ي'),
  ('VIO-LEAVE-01', 'الحرمان من الإجازات النظامية', 'الإجازات', 'minor', 'غرامة من 10,000 إلى 50,000 ر.ي'),
  ('VIO-CONTRACT-01', 'عدم إبرام عقد عمل كتابي', 'عقود العمل', 'major', 'غرامة من 20,000 إلى 100,000 ر.ي'),
  ('VIO-EMPLOY-01', 'توظيف عمال غير منتظمين بدون ترخيص', 'التوظيف', 'major', 'غرامة من 50,000 إلى 200,000 ر.ي'),
  ('VIO-RECORD-01', 'عدم مسك سجل بيانات العاملين', 'التوثيق', 'minor', 'غرامة من 10,000 إلى 50,000 ر.ي')
) AS v(code, name_ar, category, severity, penalty_description)
WHERE src.source_type='law' AND src.law_number='5' AND src.law_year=1995 AND src.status='effective'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6) معايير التفتيش الموحد (قرار 42/2020 + معايير قطاعية)
-- ============================================================
INSERT INTO inspection_criteria (criteria_code, title_ar, description, sector, establishment_type, inspection_kind, frequency_months, weight, is_mandatory, legal_reference, status)
VALUES
  ('INS-OSH-01', 'مسار السلامة المهنية', 'التحقق من وسائل السلامة والصحة المهنية والوقاية الفردية', NULL, NULL, 'field', 6, 25, true, 'قرار وزاري 42/2020', 'نشط'),
  ('INS-WAGE-01', 'مسار الأجور', 'التحقق من الالتزام بالأجر الأدنى ودفع الأجور في مواعيدها', NULL, NULL, 'field', 6, 20, true, 'قانون العمل المادة 13', 'نشط'),
  ('INS-CONTRACT-01', 'مسار عقود العمل', 'التحقق من وجود عقود عمل كتابية وتحديد مددها', NULL, NULL, 'field', 12, 15, true, 'قانون العمل المادة 25', 'نشط'),
  ('INS-HOURS-01', 'مسار ساعات العمل', 'التحقق من الالتزام بساعات العمل القانونية والإجازات', NULL, NULL, 'field', 6, 10, false, 'قانون العمل', 'نشط'),
  ('INS-EMPLOY-01', 'مسار التوظيف', 'التحقق من تراخيص التوظيف وتسجيل العمالة', NULL, NULL, 'field', 6, 15, true, 'قانون العمل', 'نشط'),
  ('INS-OSH-HAZ', 'مسار المنشآت الخطرة', 'فحص التزام المنشآت الخطرة بتدابير الوقاية والفحوصات', 'industry', NULL, 'field', 3, 30, true, 'قانون العمل المادة 33', 'نشط'),
  ('INS-OSH-AGR', 'مسار المهن الزراعية', 'فحص سلامة المهن الزراعية والبيطرية', 'agriculture', NULL, 'field', 6, 20, true, 'قانون العمل', 'نشط')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7) نطاقات الأجور لكل مهنة (من بطاقات توزيع الأجور المعتمدة)
-- ============================================================
INSERT INTO salary_ranges (occupation_id, min_salary, max_salary, currency, pay_frequency, salary_grade, allowances)
SELECT
  p.id,
  (pc.data->'benchmark_salary_range'->>'min')::numeric,
  (pc.data->'benchmark_salary_range'->>'max')::numeric,
  COALESCE(pc.data->'benchmark_salary_range'->>'currency', 'YER'),
  'شهري',
  NULLIF(pc.data->>'salary_grade',''),
  ARRAY(SELECT jsonb_array_elements_text(pc.data->'allowances_ar'))
FROM profession_analysis_cards pc
JOIN professions p ON p.code = pc.profession_code
WHERE pc.card_type = 'allocation_summary'
  AND pc.data->'benchmark_salary_range'->>'min' IS NOT NULL
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8) قوالب إشعارات قياسية
-- ============================================================
INSERT INTO notification_templates (template_key, title_ar, body_ar, channel, priority, action_required)
VALUES
  ('inspection_scheduled', 'موعد تفتيش', 'تم جدولة تفتيش ميداني لمنشأتك في {التاريخ}. يرجى تجهيز الوثائق المطلوبة.', 'email', 'high', 'تجهيز الوثائق'),
  ('violation_issued', 'مخالفة', 'صدرت مخالفة {النوع} على منشأتك بمبلغ {الغرامة}.', 'email', 'high', 'الاطلاع والاعتراض'),
  ('license_renewal', 'تجديد ترخيص', 'يقترب موعد تجديد ترخيصك في {التاريخ}.', 'email', 'medium', 'تجديد الترخيص'),
  ('wage_compliance', 'التزام بالأجور', 'تذكير بالالتزام بالأجر الأدنى القانوني.', 'email', 'medium', NULL),
  ('osh_reminder', 'تذكير سلامة', 'تذكير بضرورة إجراء الفحوصات الطبية الدورية للمهن الخطرة.', 'email', 'medium', NULL)
ON CONFLICT (template_key) DO NOTHING;
