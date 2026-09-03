-- ============================================================================
-- 20260903_03_profession_standardization_operational.sql
-- توحيد بنك بطاقات تحليل وتوصيف المهنة بمنهجية مؤسسية حكومية تشغيلية معيارية
-- Governmental Institutional | Operational | Standardized Methodology
--
-- أهداف هذا الترحيل:
--   (أ) توحيد جدول البطاقات ببيانات اعتماد حكومية تشغيلية (نسخة معيارية/حالة اعتماد/
--       جهة إصدار/سريان/نسخة حالية) مع سجلّ إصدارات.
--   (ب) ملء السجل الوطني للمهن (national_occupations) بالمهن الخمسين المعيارية
--       كسجل رسمي معتمد من الوزارة (مرتبط ب ISCO/ISIC/درجة الخطورة).
--   (ج) إضفاء الطابع التشغيلي عبر دوال API (RPC) جاهزة للاستهلاك.
--   (د) توثيق المنهجية المؤسسية الحكومية التشغيلية كسجل معياري.
-- ============================================================================

-- ============================================================
-- (أ) توحيد جدول بطاقات التحليل ببيانات اعتماد حكومية تشغيلية
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='standard_version') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN standard_version TEXT NOT NULL DEFAULT '2026.1';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='approval_status') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN approval_status TEXT CHECK (approval_status IN ('مسودة','قيد_المراجعة','معتمدة','سارية','ملغاة')) NOT NULL DEFAULT 'معتمدة';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='issuing_authority') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN issuing_authority TEXT NOT NULL DEFAULT 'وزارة الشؤون الاجتماعية والعمل - قطاع العمل';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='approved_at') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='approved_by') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN approved_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='effective_from') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN effective_from DATE DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='effective_to') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN effective_to DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='is_current') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profession_analysis_cards' AND column_name='national_occupation_id') THEN
        ALTER TABLE profession_analysis_cards ADD COLUMN national_occupation_id UUID;
    END IF;
END $$;

-- سجلّ إصدارات البطاقات (نسخ المعيار — قابل للتدقيق التشغيلي)
CREATE TABLE IF NOT EXISTS profession_card_versions (
    id             BIGSERIAL PRIMARY KEY,
    card_id        INTEGER     NOT NULL REFERENCES profession_analysis_cards(id) ON DELETE CASCADE,
    version        INTEGER     NOT NULL,
    approval_status TEXT       NOT NULL,
    data           JSONB       NOT NULL,
    change_reason  TEXT,
    changed_by     TEXT,
    effective_from DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (card_id, version)
);

-- ============================================================
-- (ب) ملء السجل الوطني للمهن (national_occupations) بالمهن المعيارية الخمسين
-- ============================================================
INSERT INTO national_occupations
    (code, parent_code, name_ar, name_en, level, isic_link,
     hazard_level, is_hazardous, status, source, version, effective_from)
SELECT
    c.profession_code AS code,
    c.parent_code AS parent_code,
    c.profession_name_ar AS name_ar,
    NULL AS name_en,
    c.level AS level,
    COALESCE(
        (c.classification_data->'isic_sectors'->>0),
        (c.classification_data->'isic_sectors'->>1)
    ) AS isic_link,
    c.hazard_level AS hazard_level,
    (c.hazard_level IN ('عالية','حرجة')) AS is_hazardous,
    'معتمدة' AS status,
    'وزارة الشؤون الاجتماعية والعمل - قطاع العمل' AS source,
    1 AS version,
    c.effective_from
FROM (
    SELECT
        pc.profession_code,
        pc.profession_name_ar,
        pc.effective_from,
        (pc.data) AS classification_data,
        -- مستوى ISCO-08 للتصنيف الوطني بناءً على طول الرمز
        CASE
            WHEN length(pc.profession_code) <= 1 THEN 'major'
            WHEN length(pc.profession_code) = 2 THEN 'sub_major'
            WHEN length(pc.profession_code) = 3 THEN 'minor'
            ELSE 'unit'
        END AS level,
        -- الرمز الأب (أول رقم ثم أول رقمين ثم أول ثلاثة)
        CASE
            WHEN length(pc.profession_code) >= 4 THEN left(pc.profession_code, 3)
            WHEN length(pc.profession_code) = 3 THEN left(pc.profession_code, 2)
            WHEN length(pc.profession_code) = 2 THEN left(pc.profession_code, 1)
            ELSE NULL
        END AS parent_code,
        (SELECT cd.data->>'hazard_level'
           FROM profession_analysis_cards cd
          WHERE cd.profession_code = pc.profession_code
            AND cd.card_type = 'risk_profile') AS hazard_level
    FROM profession_analysis_cards pc
    WHERE pc.card_type = 'classification'
) c
WHERE c.profession_code IS NOT NULL
ON CONFLICT (code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    parent_code = EXCLUDED.parent_code,
    level = EXCLUDED.level,
    isic_link = EXCLUDED.isic_link,
    hazard_level = EXCLUDED.hazard_level,
    is_hazardous = EXCLUDED.is_hazardous,
    status = 'معتمدة',
    source = EXCLUDED.source;

-- ربط بطاقات التحليل بصفوف السجل الوطني (تكامل ثنائي الاتجاه)
UPDATE profession_analysis_cards pc
SET national_occupation_id = no.id
FROM national_occupations no
WHERE no.code = pc.profession_code
  AND pc.national_occupation_id IS NULL;

-- ============================================================
-- (ج) إضفاء الطابع التشغيلي: تسجيل النسخة الأولى (v1) في سجلّ الإصدارات
--     لكل بطاقة — خط الأساس القابل للتدقيق التشغيلي
-- ============================================================
INSERT INTO profession_card_versions
    (card_id, version, approval_status, data, change_reason, changed_by, effective_from)
SELECT
    pc.id, 1, pc.approval_status, pc.data,
    'نسخة أولى معتمدة — بنك بطاقات تحليل وتوصيف المهن (أهم 50 مهنة)',
    'وزارة الشؤون الاجتماعية والعمل - قطاع العمل',
    pc.effective_from
FROM profession_analysis_cards pc
ON CONFLICT (card_id, version) DO NOTHING;

-- فهارس تشغيلية
CREATE INDEX IF NOT EXISTS idx_pac_approval_status ON profession_analysis_cards(approval_status);
CREATE INDEX IF NOT EXISTS idx_pac_is_current      ON profession_analysis_cards(is_current);
CREATE INDEX IF NOT EXISTS idx_pac_nat_occ         ON profession_analysis_cards(national_occupation_id);
CREATE INDEX IF NOT EXISTS idx_pcv_card_version    ON profession_card_versions(card_id, version);
CREATE INDEX IF NOT EXISTS idx_no_status           ON national_occupations(status);
CREATE INDEX IF NOT EXISTS idx_no_hazard           ON national_occupations(is_hazardous, hazard_level);

-- ============================================================
-- (د) توثيق المنهجية المؤسسية الحكومية التشغيلية كسجل معياري
-- ============================================================
CREATE TABLE IF NOT EXISTS profession_standard_methodology (
    id              BIGSERIAL PRIMARY KEY,
    standard_code   TEXT        NOT NULL UNIQUE,
    title_ar        TEXT        NOT NULL,
    version         TEXT        NOT NULL,
    issuing_authority TEXT      NOT NULL,
    approval_status TEXT        NOT NULL DEFAULT 'معتمدة',
    basis_ar        TEXT        NOT NULL,
    scope_ar        TEXT,
    pillars_ar      JSONB,
    legal_basis_ar  JSONB,
    international_basis_ar JSONB,
    operational_rules_ar TEXT,
    approved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO profession_standard_methodology
    (standard_code, title_ar, version, issuing_authority, approval_status, basis_ar, scope_ar,
     pillars_ar, legal_basis_ar, international_basis_ar, operational_rules_ar)
VALUES (
    'YEM-PAC-2026.1',
    'بنك بطاقات تحليل وتوصيف المهنة — منهجية مؤسسية حكومية تشغيلية معيارية',
    '2026.1',
    'وزارة الشؤون الاجتماعية والعمل - قطاع العمل',
    'معتمدة',
    'توصيف وتقييم المهن الخمسين الأستراتيجية لسوق العمل اليمني بمنهجية موحّدة قابلة للتشغيل، مستندةً إلى التصنيفات الدولية وإلى القوانين واللوائح اليمنية.',
    'مهن قطاعات: الصحة، الهندسة والبناء، الطاقة، تقنية المعلومات والاتصالات، الإدارة والمالية واللوجستيات، الحرف والنقل، التعليم والقانون والسلامة والسياحة.',
    jsonb_build_array(
        'التصنيف والتوصيف الدقيق (ISCO-08 + ISIC-4)',
        'تقييم وظيفي موحّد (مهارة/مسؤولية/استقلالية/تعقيد/خطر، 100 نقطة لكل بُعد)',
        'اليمننة وتوطين الفرص وفق سياسات ترخيص العمل',
        'تحليل فجوة المهارات والعرض/الطلب على المستوى الوطني',
        'المسار الوظيفي وسلّم الأجور التقديري المرجعي',
        'ملف المخاطر المهنية والصحة والسلامة (OSHA/NIOSH)',
        'خلاصة التوظيف والتخصيص القطاعي'
    ),
    jsonb_build_array(
        'قانون العمل اليمني رقم 5 لسنة 1995',
        'قانون التأمينات الاجتماعية (الضمان الاجتماعي)',
        'القرارات الوزارية واللوائح التنفيذية ذات الصلة بالمهن والتراخيص',
        'اتفاقيات منظمة العمل الدولية المصدَّقة (87، 98، 100، 105، 111)'
    ),
    jsonb_build_array(
        'ISCO-08 (التصنيف الدولي الموحد للمهن)',
        'ISIC-4 (التصنيف الدولي الموحد للأنشطة)',
        'ESCO (التصنيف الأوروبي للمهارات والكفاءات)',
        'O*NET (قاعدة بيانات المهن الأمريكية)',
        'OSHA/ISO-45001 (السلامة والصحة المهنية)',
        'SFIA (إطار المهارات لأنظمة المعلومات)'
    ),
    'تُحمَّل البطاقات عبر واجهات RPC للاستهلاك التشغيلي، وتُرشَّح بحسب القطاع/درجة الخطورة/حالة الاعتماد، مع تسجيل كل نسخة في سجلّ الإصدارات للتدقيق.'
)
ON CONFLICT (standard_code) DO NOTHING;

-- ============================================================
-- (هـ) دوال API تشغيلية (RPC) للاستهلاك
-- ============================================================
-- إرجاع ملف المهنة المعياري الكامل (كل البطاقات) باسم الرمز الوطني
CREATE OR REPLACE FUNCTION fn_profession_standard_dossier(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profession_code', p_code,
        'national_occupation',
        (SELECT jsonb_build_object('code',no.code,'name_ar',no.name_ar,'hazard_level',no.hazard_level,
                                   'is_hazardous',no.is_hazardous,'status',no.status,'isic_link',no.isic_link)
           FROM national_occupations no WHERE no.code = p_code LIMIT 1),
        'cards', (SELECT fn_profession_card_bank(p_code)),
        'standard_version', (SELECT MAX(standard_version) FROM profession_analysis_cards WHERE profession_code=p_code),
        'approval_status',  (SELECT MAX(approval_status)   FROM profession_analysis_cards WHERE profession_code=p_code)
    ) INTO v;
    RETURN v;
END $$;

-- السجل الوطني لمهن الجهة (القائمة المعتمدة) حسب معايير تشغيلية
CREATE OR REPLACE FUNCTION fn_national_occupation_registry(p_status TEXT DEFAULT 'معتمدة', p_hazard TEXT DEFAULT NULL)
RETURNS TABLE (
    code TEXT, name_ar TEXT, level TEXT, isic_link TEXT,
    hazard_level TEXT, is_hazardous BOOLEAN, status TEXT, source TEXT
)
LANGUAGE sql STABLE
AS $$
    SELECT code, name_ar, level, isic_link, hazard_level, is_hazardous, status, source
    FROM national_occupations
    WHERE (p_status IS NULL OR status = p_status)
      AND (p_hazard IS NULL OR hazard_level = p_hazard)
    ORDER BY code
$$;

-- عدد المهن المعتمدة حسب القطاع / درجة الخطورة
CREATE OR REPLACE FUNCTION fn_profession_standard_kpis()
RETURNS TABLE (
    total_approved INTEGER,
    hazardous_count INTEGER,
    critical_hazard_count INTEGER,
    by_approval JSONB,
    methodology JSONB
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_approved', (SELECT COUNT(*)::int FROM profession_analysis_cards WHERE approval_status IN ('معتمدة','سارية')),
        'hazardous_count', (SELECT COUNT(DISTINCT profession_code)::int FROM profession_analysis_cards c
                            WHERE c.card_type='risk_profile' AND c.data->>'hazard_level' IN ('عالية','حرجة')),
        'critical_hazard_count', (SELECT COUNT(DISTINCT profession_code)::int FROM profession_analysis_cards c
                                  WHERE c.card_type='risk_profile' AND c.data->>'hazard_level'='حرجة'),
        'by_approval', (SELECT jsonb_object_agg(approval_status, cnt) FROM
                         (SELECT approval_status, COUNT(*)::int cnt FROM profession_analysis_cards GROUP BY 1) s),
        'methodology', (SELECT jsonb_build_object('standard_code',standard_code,'title_ar',title_ar,'version',version,
                          'issuing_authority',issuing_authority,'approval_status',approval_status)
                          FROM profession_standard_methodology WHERE standard_code='YEM-PAC-2026.1' LIMIT 1)
    ) INTO v;
    RETURN QUERY SELECT
        (v->'total_approved')::int,
        (v->'hazardous_count')::int,
        (v->'critical_hazard_count')::int,
        v->'by_approval',
        v->'methodology';
END $$;

-- ============================================================
-- (و) أذونات آمنة (authenticated / anonymous)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON profession_analysis_cards TO authenticated;
        GRANT USAGE ON SEQUENCE profession_analysis_cards_id_seq TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON profession_card_versions TO authenticated;
        GRANT USAGE ON SEQUENCE profession_card_versions_id_seq TO authenticated;
        GRANT SELECT, INSERT, UPDATE ON national_occupations TO authenticated;
        GRANT SELECT ON profession_standard_methodology TO authenticated;
        GRANT USAGE ON SEQUENCE profession_standard_methodology_id_seq TO authenticated;
        GRANT EXECUTE ON FUNCTION fn_profession_standard_dossier(TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION fn_national_occupation_registry(TEXT, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION fn_profession_standard_kpis() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        GRANT SELECT ON profession_analysis_cards TO anonymous;
        GRANT SELECT ON national_occupations TO anonymous;
        GRANT SELECT ON profession_standard_methodology TO anonymous;
        GRANT EXECUTE ON FUNCTION fn_profession_standard_dossier(TEXT) TO anonymous;
        GRANT EXECUTE ON FUNCTION fn_national_occupation_registry(TEXT, TEXT) TO anonymous;
        GRANT EXECUTE ON FUNCTION fn_profession_standard_kpis() TO anonymous;
    END IF;
END $$;
