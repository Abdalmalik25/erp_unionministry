-- 20260829_01_intelligence_evaluation_frameworks.sql
-- Enterprise Intelligence Framework: configurable evaluation indicators
-- Ministry-administered scoring framework with multi-dimensional indicators
-- ===================== Evaluation Frameworks (Master) =====================
CREATE TABLE IF NOT EXISTS evaluation_frameworks (
    id serial PRIMARY KEY,
    name_ar text NOT NULL,
    name_en text,
    model_type text NOT NULL CHECK (
        model_type IN (
            'entity_maturity',
            'worker_competency',
            'professional_cert',
            'compliance_score'
        )
    ),
    sector text,
    version text NOT NULL DEFAULT '2026.1',
    effective_from timestamptz NOT NULL DEFAULT NOW(),
    effective_until timestamptz,
    status text NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'active', 'archived', 'suspended')
    ),
    description text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_evaluation_frameworks_status ON evaluation_frameworks(status)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_frameworks_sector ON evaluation_frameworks(sector)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_frameworks_model ON evaluation_frameworks(model_type)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_frameworks_effective ON evaluation_frameworks(effective_from, effective_until)
WHERE deleted_at IS NULL;
-- ===================== Framework Dimensions =====================
CREATE TABLE IF NOT EXISTS framework_dimensions (
    id serial PRIMARY KEY,
    framework_id integer NOT NULL REFERENCES evaluation_frameworks(id) ON DELETE CASCADE,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    weight numeric(5, 4) NOT NULL CHECK (
        weight >= 0
        AND weight <= 1
    ),
    category text,
    display_order integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(framework_id, code)
);
CREATE INDEX IF NOT EXISTS idx_framework_dimensions_framework ON framework_dimensions(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_dimensions_order ON framework_dimensions(framework_id, display_order);
-- ===================== Framework Indicators =====================
CREATE TABLE IF NOT EXISTS framework_indicators (
    id serial PRIMARY KEY,
    dimension_id integer NOT NULL REFERENCES framework_dimensions(id) ON DELETE CASCADE,
    code text NOT NULL,
    name_ar text NOT NULL,
    name_en text,
    description text,
    data_type text NOT NULL CHECK (
        data_type IN ('boolean', 'number', 'enum', 'text', 'formula')
    ),
    weight numeric(5, 4) NOT NULL DEFAULT 1.0 CHECK (
        weight >= 0
        AND weight <= 1
    ),
    criteria_min numeric(12, 2),
    criteria_max numeric(12, 2),
    criteria_formula text,
    criteria_enum jsonb,
    linked_profession_required boolean DEFAULT false,
    mandatory boolean DEFAULT true,
    display_order integer DEFAULT 0,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(dimension_id, code)
);
CREATE INDEX IF NOT EXISTS idx_framework_indicators_dimension ON framework_indicators(dimension_id);
CREATE INDEX IF NOT EXISTS idx_framework_indicators_status ON framework_indicators(status);
CREATE INDEX IF NOT EXISTS idx_framework_indicators_order ON framework_indicators(dimension_id, display_order);
-- ===================== Periodic Evaluation Plans (ربط خطط التقييم) =====================
CREATE TABLE IF NOT EXISTS evaluation_plans (
    id serial PRIMARY KEY,
    framework_id integer NOT NULL REFERENCES evaluation_frameworks(id),
    name_ar text NOT NULL,
    name_en text,
    target_type text NOT NULL CHECK (
        target_type IN (
            'all_entities',
            'sector',
            'governorate',
            'entity_type',
            'specific'
        )
    ),
    target_filter jsonb,
    frequency text NOT NULL CHECK (
        frequency IN (
            'monthly',
            'quarterly',
            'biannual',
            'annual',
            'biennial'
        )
    ),
    start_date date NOT NULL,
    end_date date,
    last_run_at timestamptz,
    next_run_at timestamptz,
    status text NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'paused', 'completed', 'cancelled')
    ),
    notification_enabled boolean DEFAULT true,
    reminder_days_before integer DEFAULT 7,
    linked_profession_required boolean DEFAULT false,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_framework ON evaluation_plans(framework_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_status ON evaluation_plans(status)
WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_next_run ON evaluation_plans(next_run_at)
WHERE status = 'active';
-- ===================== Evaluation Plan Assignments =====================
CREATE TABLE IF NOT EXISTS evaluation_plan_assignments (
    id serial PRIMARY KEY,
    plan_id integer NOT NULL REFERENCES evaluation_plans(id) ON DELETE CASCADE,
    entity_id text,
    worker_id text,
    due_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'in_progress',
            'completed',
            'overdue',
            'skipped'
        )
    ),
    evaluation_id text,
    score numeric(5, 1),
    maturity_level integer,
    completed_at timestamptz,
    assigned_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_plan ON evaluation_plan_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_status ON evaluation_plan_assignments(status);
CREATE INDEX IF NOT EXISTS idx_evaluation_assignments_due ON evaluation_plan_assignments(due_date);
-- ===================== Profession Analysis Cards (بطائق التحليل المهني) =====================
CREATE TABLE IF NOT EXISTS profession_analysis_cards (
    id serial PRIMARY KEY,
    profession_id text NOT NULL,
    card_type text NOT NULL CHECK (
        card_type IN (
            'classification',
            'yemenization',
            'gap_analysis',
            'career_path',
            'risk_profile',
            'allocation_summary'
        )
    ),
    title_ar text NOT NULL,
    data jsonb NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT NOW(),
    generated_by text,
    expires_at timestamptz,
    shared_with jsonb
);
CREATE INDEX IF NOT EXISTS idx_profession_cards_profession ON profession_analysis_cards(profession_id);
CREATE INDEX IF NOT EXISTS idx_profession_cards_type ON profession_analysis_cards(card_type);
-- ===================== Add foreign-key-like indexes for performance =====================
CREATE INDEX IF NOT EXISTS idx_inspections_enterprise_id ON inspections(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_maturity_assessments_entity_id ON maturity_assessments(entity_id);
CREATE INDEX IF NOT EXISTS idx_workers_occupation_id ON workers(occupation_id)
WHERE deleted_at IS NULL;
-- ===================== Updated_at trigger =====================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_frameworks_updated ON evaluation_frameworks;
CREATE TRIGGER trg_frameworks_updated BEFORE
UPDATE ON evaluation_frameworks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_dimensions_updated ON framework_dimensions;
CREATE TRIGGER trg_dimensions_updated BEFORE
UPDATE ON framework_dimensions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_indicators_updated ON framework_indicators;
CREATE TRIGGER trg_indicators_updated BEFORE
UPDATE ON framework_indicators FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_plans_updated ON evaluation_plans;
CREATE TRIGGER trg_plans_updated BEFORE
UPDATE ON evaluation_plans FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
-- ===================== Seed default framework (entity_maturity) =====================
INSERT INTO evaluation_frameworks (
        name_ar,
        name_en,
        model_type,
        status,
        version,
        description,
        effective_from
    )
VALUES (
        'تقييم النضج المؤسسي — الافتراضي',
        'Default Entity Maturity Framework',
        'entity_maturity',
        'active',
        '2026.1',
        'إطار تقييم النضج المؤسسي الافتراضي — 5 أبعاد (الإدارة، الأنشطة، الكفاءات، السلامة، المسار الوظيفي)',
        NOW()
    ) ON CONFLICT DO NOTHING;
-- Comments for documentation
COMMENT ON TABLE evaluation_frameworks IS 'إطارات التقييم المُعرَّفة من الوزارة — يمكن تخصيصها لكل قطاع';
COMMENT ON TABLE framework_dimensions IS 'أبعاد التقييم داخل كل إطار (مثل: الإدارة، السلامة، الكفاءات)';
COMMENT ON TABLE framework_indicators IS 'المؤشرات التفصيلية داخل كل بُعد — تتحكم بها الوزارة بالكامل';
COMMENT ON TABLE evaluation_plans IS 'خطط التقييم الدورية (ربعية، نصف سنوية، سنوية) مرتبطة بإطار محدد';
COMMENT ON TABLE evaluation_plan_assignments IS 'تعيينات التقييم لكل خطة';
COMMENT ON TABLE profession_analysis_cards IS 'بطائق التحليل المهني — تُربط بالتقارير المهنية';