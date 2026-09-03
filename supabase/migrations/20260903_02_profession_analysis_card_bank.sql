-- ============================================================================
-- 20260903_02_profession_analysis_card_bank.sql
-- بنك معلومات تفاصيل بطاقات تحليل وتوصيف المهنة
-- Profession Analysis & Job Description Card Bank (Top-50 Strategic Occupations)
--
-- المنهجية: وفق أفضل الممارسات العالمية (ISCO-08 / ESCO / O*NET / OSHA / SFIA)
--           + القوانين واللوائح اليمنية (قانون العمل 5/1995، قانون التأمينات
--           الاجتماعية، اللوائح المهنية والقطاعية).
-- القيم: تقديرية مرجعية بمنهجية تقييم وظيفي موحّدة (مهارة/مسؤولية/استقلالية/
--        تعقيد/خطر = 100 نقطة لكل بُعد) + نطاقات أجور تقديرية بالريال اليمني.
-- ============================================================================

-- ---------------------------------------------------------------
-- 1) جدول بطاقات التحليل المهني (بنك المعلومات)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profession_analysis_cards (
    id                    SERIAL PRIMARY KEY,
    profession_code       TEXT        NOT NULL,               -- يربط بحقل professions.code
    profession_name_ar    TEXT        NOT NULL,               -- اسم المهنة منقوح + مكرر للاستعلام السريع
    isco_code             TEXT,                               -- رمز ISCO-08
    sector                TEXT,                               -- القطاع الاقتصادي
    job_level             INTEGER,                            -- المستوى الوظيفي (ISCO skill level 1-4 / محلي)
    card_type             TEXT        NOT NULL CHECK (card_type IN (
                              'classification',               -- تصنيف وتوصيف المهنة
                              'yemenization',                 -- اليمننة / فرص التوطين
                              'gap_analysis',                 -- فجوة المهارات والعرض/الطلب
                              'career_path',                  -- المسار الوظيفي والتدرج
                              'risk_profile',                 -- ملف المخاطر المهنية والصحة
                              'allocation_summary'            -- خلاصة التوظيف والتخصيص
                          )),
    title_ar              TEXT        NOT NULL,               -- عنوان البطاقة
    data                  JSONB       NOT NULL,               -- محتوى البطاقة الكامل
    methodology_version   TEXT        NOT NULL DEFAULT '2026.1',
    source                TEXT,                               -- المصدر/المرجع
    is_benchmark          BOOLEAN     NOT NULL DEFAULT TRUE,  -- هل هي بطاقة معيارية مرجعية
    valid_from            DATE        NOT NULL DEFAULT CURRENT_DATE,
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (profession_code, card_type)
);

-- فهرسة
CREATE INDEX IF NOT EXISTS idx_pac_profession     ON profession_analysis_cards(profession_code);
CREATE INDEX IF NOT EXISTS idx_pac_card_type      ON profession_analysis_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_pac_sector         ON profession_analysis_cards(sector);
CREATE INDEX IF NOT EXISTS idx_pac_isco           ON profession_analysis_cards(isco_code);
CREATE INDEX IF NOT EXISTS idx_pac_valid_from     ON profession_analysis_cards(valid_from);

-- ربط منطقي مع جدول المهن (لا فرض FK صارم لتفادي تعقيدات المهاجرة، لكن فهرس يُستخدم للانضمام)
COMMENT ON TABLE profession_analysis_cards IS 'بنك معلومات تفاصيل بطاقات تحليل وتوصيف المهنة — أهم 50 مهنة بالمنهجية المؤسسية + القوانين اليمنية';

-- ---------------------------------------------------------------
-- 2) GRANTs آمنة (authenticated / anonymous بأسلوب DO blocks)
-- ---------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON profession_analysis_cards TO authenticated;
        GRANT USAGE ON SEQUENCE profession_analysis_cards_id_seq TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        GRANT SELECT ON profession_analysis_cards TO anonymous;
    END IF;
END $$;

-- ---------------------------------------------------------------
-- 3) طبقة ذكاء مبسّطة فوق بنك البطاقات (ربط وتكامل مع المنصة)
--    fn_profession_card_bank(profession_code) — يعيد كل بطاقات مهنة واحدة
--    fn_profession_card_bank_summary()           — ملخص البنك كاملاً
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_profession_card_bank(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v JSONB;
BEGIN
    SELECT jsonb_object_agg(card_type, data ORDER BY card_type)
    INTO v
    FROM profession_analysis_cards
    WHERE profession_code = p_code AND is_benchmark = TRUE;
    RETURN COALESCE(v, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION fn_profession_card_bank_summary()
RETURNS TABLE (
    profession_code TEXT,
    profession_name_ar TEXT,
    isco_code TEXT,
    sector TEXT,
    job_level INTEGER,
    has_classification BOOLEAN,
    has_yemenization BOOLEAN,
    has_gap_analysis BOOLEAN,
    has_career_path BOOLEAN,
    has_risk_profile BOOLEAN,
    has_allocation BOOLEAN,
    avg_total_score NUMERIC,
    max_hazard_level TEXT,
    benchmark_salary_min NUMERIC,
    benchmark_salary_max NUMERIC
)
LANGUAGE sql STABLE
AS $$
    SELECT
        profession_code,
        MAX(profession_name_ar) AS profession_name_ar,
        MAX(isco_code) AS isco_code,
        MAX(sector) AS sector,
        MAX(job_level) AS job_level,
        BOOL_OR(card_type='classification') AS has_classification,
        BOOL_OR(card_type='yemenization') AS has_yemenization,
        BOOL_OR(card_type='gap_analysis') AS has_gap_analysis,
        BOOL_OR(card_type='career_path') AS has_career_path,
        BOOL_OR(card_type='risk_profile') AS has_risk_profile,
        BOOL_OR(card_type='allocation_summary') AS has_allocation,
        ROUND(AVG((data->'job_evaluation_scores'->>'total')::NUMERIC),0) AS avg_total_score,
        (ARRAY_AGG(data->>'hazard_level') FILTER (WHERE card_type='risk_profile'))[1] AS max_hazard_level,
        ((ARRAY_AGG(data->'benchmark_salary_range'->>'min') FILTER (WHERE card_type='allocation_summary'))[1])::NUMERIC AS benchmark_salary_min,
        ((ARRAY_AGG(data->'benchmark_salary_range'->>'max') FILTER (WHERE card_type='allocation_summary'))[1])::NUMERIC AS benchmark_salary_max
    FROM profession_analysis_cards
    WHERE is_benchmark = TRUE
    GROUP BY profession_code
    ORDER BY profession_code
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION fn_profession_card_bank(TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION fn_profession_card_bank_summary() TO authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        GRANT EXECUTE ON FUNCTION fn_profession_card_bank(TEXT) TO anonymous;
        GRANT EXECUTE ON FUNCTION fn_profession_card_bank_summary() TO anonymous;
    END IF;
END $$;
