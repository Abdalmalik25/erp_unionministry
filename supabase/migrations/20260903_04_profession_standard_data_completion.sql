-- ============================================================================
-- 20260903_04_profession_standard_data_completion.sql
-- إكمال بيانات المعيار المهني من بطاقات التحليل (دون تلفيق — مشتقّة من البنك):
--   (1) المسارات الوظيفية  career_paths              ← من بطاقة career_path + classification
--   (2) المهن الخطرة      hazardous_occupations     ← من بطاقة risk_profile + classification
-- ============================================================================

-- ============================================================
-- (1) المسارات الوظيفية (أهم 50 مهنة)
-- ============================================================
INSERT INTO career_paths
    (occupation_id, entry_level, progression_levels, promotion_criteria,
     training_path, certification_requirements, lateral_moves)
SELECT
    p.id AS occupation_id,
    COALESCE((d->'progression')->0->>'title_ar', 'مبتدئ') AS entry_level,
    COALESCE(
        ARRAY(SELECT e->>'title_ar' FROM jsonb_array_elements(d->'progression') e),
        '{}'
    ) AS progression_levels,
    COALESCE(
        (SELECT array_to_string(ARRAY(SELECT jsonb_array_elements_text(cpdata.data->'advancement_requirements_ar')), '؛ ')
           FROM profession_analysis_cards cpdata WHERE cpdata.profession_code = pc.profession_code
             AND cpdata.card_type = 'career_path'),
        'التدرج وفق الخبرة والكفاءة ونتاج الأداء وتقييم الوظيفة (منهجية YEM-PAC-2026.1)'
    ) AS promotion_criteria,
    COALESCE(
        ARRAY[(SELECT cc.data->'qualifications'->>'training_requirements'
           FROM profession_analysis_cards cc
          WHERE cc.profession_code = pc.profession_code AND cc.card_type='classification')]
        , '{}') AS training_path,
    COALESCE(
        ARRAY[(SELECT cc.data->'qualifications'->>'certification'
           FROM profession_analysis_cards cc
          WHERE cc.profession_code = pc.profession_code AND cc.card_type='classification')]
        , '{}') AS certification_requirements,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(d->'horizontal_moves_ar')), '{}') AS lateral_moves
FROM profession_analysis_cards pc
JOIN professions p ON p.code = pc.profession_code
CROSS JOIN LATERAL (SELECT pc.data AS d) x
WHERE pc.card_type = 'career_path'
  AND p.deleted_at IS NULL;

-- ============================================================
-- (2) المهن الخطرة (درجة الخطر: متوسطة/عالية/حرجة)
--     risk_level على مقياس 1-7: منخفضة=1، متوسطة=3، عالية=5، حرجة=7
-- ============================================================
INSERT INTO hazardous_occupations
    (occupation_id, occupation_code, occupation_name_ar, occupation_name_en,
     risk_level, hazard_category, critical_tasks, safety_requirements,
     medical_examinations, protective_equipment, training_requirements,
     compliance_standards, min_salary, isco_code)
SELECT
    p.id AS occupation_id,
    pc.profession_code AS occupation_code,
    pc.profession_name_ar AS occupation_name_ar,
    p.name_en AS occupation_name_en,
    CASE d->>'hazard_level'
        WHEN 'منخفضة' THEN 1
        WHEN 'متوسطة' THEN 3
        WHEN 'عالية'  THEN 5
        WHEN 'حرجة'   THEN 6
        ELSE 3
    END AS risk_level,
    COALESCE((d->'hazards_ar'->>0), 'عامة') AS hazard_category,
    -- المهام الحرجة من بطاقة التصنيف (حيث is_critical = true)
    COALESCE(
        ARRAY(SELECT e->>'task'
                FROM jsonb_array_elements(
                    (SELECT cc.data->'tasks' FROM profession_analysis_cards cc
                      WHERE cc.profession_code = pc.profession_code AND cc.card_type='classification')
                ) e
               WHERE COALESCE((e->>'is_critical')::boolean, false))
        , '{}') AS critical_tasks,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(d->'prevention_ar')), '{}') AS safety_requirements,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(d->'medical_exams_ar')), '{}') AS medical_examinations,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(d->'ppe_ar')), '{}') AS protective_equipment,
    COALESCE(
        ARRAY[(SELECT cc.data->'qualifications'->>'training_requirements'
                 FROM profession_analysis_cards cc
                WHERE cc.profession_code = pc.profession_code AND cc.card_type='classification')]
        , '{}') AS training_requirements,
    '{}' AS compliance_standards,
    (SELECT ((cd.data->'benchmark_salary_range'->>'min')::NUMERIC)
       FROM profession_analysis_cards cd
      WHERE cd.profession_code = pc.profession_code
        AND cd.card_type = 'allocation_summary') AS min_salary,
    p.isco_code AS isco_code
FROM profession_analysis_cards pc
JOIN professions p ON p.code = pc.profession_code
CROSS JOIN LATERAL (SELECT pc.data AS d) x
WHERE pc.card_type = 'risk_profile'
  AND p.deleted_at IS NULL
  AND (pc.data->>'hazard_level') IN ('متوسطة','عالية','حرجة')
  AND NOT EXISTS (SELECT 1 FROM hazardous_occupations ho WHERE ho.occupation_id = p.id);
