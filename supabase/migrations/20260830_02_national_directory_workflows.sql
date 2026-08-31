-- ============================================================================
-- Migration: 20260830_02_national_directory_workflows.sql
-- العنوان: Workflows مؤسسية متقدمة للأدلة الوطنية
-- 
-- يتضمن:
--   • حالات Workflows لتغييرات الأدلة (draft → review → approved → published)
--   • نظام الموافقات متعدد المستويات
--   • تقييم الأثر المؤسسي قبل النشر
--   • تتبع زمني دقيق (SLA)
--   • تنبيهات تلقائية للمسؤولين
--   • سجل التدقيق المؤسسي الكامل
-- ============================================================================
BEGIN;
-- ============================================================================
-- 1) حالات تغييرات الأدلة (Directory Change Workflows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS directory_change_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    directory_type TEXT NOT NULL,
    record_code TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (
        change_type IN (
            'create',
            'update',
            'deactivate',
            'bulk_update',
            'delete'
        )
    ),
    change_payload JSONB NOT NULL,
    current_state TEXT NOT NULL DEFAULT 'draft' CHECK (
        current_state IN (
            'draft',
            -- مسودة
            'submitted',
            -- مُقدَّم للمراجعة
            'impact_review',
            -- مراجعة الأثر
            'pending_approval',
            -- في انتظار الموافقة
            'approved',
            -- معتمد
            'rejected',
            -- مرفوض
            'published',
            -- منشور
            'rolled_back' -- تم التراجع
        )
    ),
    priority TEXT DEFAULT 'normal' CHECK (
        priority IN ('low', 'normal', 'high', 'critical')
    ),
    -- التقييم المؤسسي
    impact_score NUMERIC(5, 2) DEFAULT 0,
    -- 0-100 درجة الأثر
    affected_records_count INTEGER DEFAULT 0,
    impact_summary JSONB DEFAULT '{}',
    -- ملخص الأثر
    -- الموافقات
    submitted_by UUID,
    submitted_at TIMESTAMPTZ,
    impact_reviewer UUID,
    impact_reviewed_at TIMESTAMPTZ,
    approver_id UUID,
    approved_at TIMESTAMPTZ,
    publisher_id UUID,
    published_at TIMESTAMPTZ,
    -- SLA
    sla_deadline TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,
    -- الملاحظات
    change_reason TEXT NOT NULL,
    rejection_reason TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcwf_state ON directory_change_workflows(current_state);
CREATE INDEX IF NOT EXISTS idx_dcwf_type_code ON directory_change_workflows(directory_type, record_code);
CREATE INDEX IF NOT EXISTS idx_dcwf_sla ON directory_change_workflows(sla_deadline)
WHERE sla_breached = FALSE;
-- ============================================================================
-- 2) سجل الموافقات متعدد المستويات
-- ============================================================================
CREATE TABLE IF NOT EXISTS directory_change_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES directory_change_workflows(id) ON DELETE CASCADE,
    approval_level INTEGER NOT NULL,
    -- 1=أول، 2=ثاني، 3=نهائي
    approver_role TEXT NOT NULL,
    -- ministry_admin, ministry_director, undersecretary
    approver_id UUID,
    decision TEXT CHECK (
        decision IN ('pending', 'approved', 'rejected', 'returned')
    ),
    decision_at TIMESTAMPTZ,
    decision_notes TEXT,
    required_approvals INTEGER DEFAULT 1,
    received_approvals INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, approval_level)
);
CREATE INDEX IF NOT EXISTS idx_dcwf_approvals_pending ON directory_change_approvals(approver_id)
WHERE decision = 'pending';
-- ============================================================================
-- 3) تقييم الأثر المؤسسي التلقائي
-- ============================================================================
CREATE TABLE IF NOT EXISTS directory_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES directory_change_workflows(id) ON DELETE CASCADE,
    -- المقاييس الكمية
    affected_entities_count INTEGER DEFAULT 0,
    affected_persons_count INTEGER DEFAULT 0,
    affected_contracts_count INTEGER DEFAULT 0,
    affected_inspections_count INTEGER DEFAULT 0,
    affected_services_count INTEGER DEFAULT 0,
    -- درجة الأثر (0-100)
    operational_impact NUMERIC(5, 2) DEFAULT 0,
    -- أثر تشغيلي
    financial_impact NUMERIC(5, 2) DEFAULT 0,
    -- أثر مالي
    legal_impact NUMERIC(5, 2) DEFAULT 0,
    -- أثر قانوني
    reputational_impact NUMERIC(5, 2) DEFAULT 0,
    -- أثر سمعة
    overall_impact NUMERIC(5, 2) DEFAULT 0,
    -- أثر إجمالي
    -- تفاصيل
    impact_details JSONB DEFAULT '[]',
    -- قائمة السجلات المتأثرة
    recommendations TEXT [],
    -- توصيات
    mitigation_plan TEXT,
    -- خطة التخفيف
    requires_executive_approval BOOLEAN DEFAULT FALSE,
    auto_calculated BOOLEAN DEFAULT TRUE,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculated_by TEXT DEFAULT 'system',
    metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_dcwf_impact_workflow ON directory_impact_assessments(workflow_id);
-- ============================================================================
-- 4) SLA Tracking & Alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS directory_sla_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES directory_change_workflows(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (
        alert_type IN (
            'sla_warning',
            -- تحذير قبل الانتهاء
            'sla_breach',
            -- تجاوز الموعد
            'escalation_required',
            -- تصعيد مطلوب
            'action_required' -- إجراء مطلوب
        )
    ),
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    notified_users UUID [],
    notification_sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sla_alerts_unack ON directory_sla_alerts(created_at DESC)
WHERE acknowledged_at IS NULL;
-- ============================================================================
-- 5) سجل التدقيق المؤسسي الكامل
-- ============================================================================
CREATE TABLE IF NOT EXISTS directory_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES directory_change_workflows(id) ON DELETE
    SET NULL,
        directory_type TEXT,
        record_code TEXT,
        action TEXT NOT NULL,
        -- action performed
        actor_id UUID,
        actor_name TEXT,
        actor_role TEXT,
        previous_state TEXT,
        new_state TEXT,
        action_details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        session_id TEXT,
        compliance_check JSONB,
        -- فحص الامتثال
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_workflow ON directory_audit_trail(workflow_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON directory_audit_trail(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_directory ON directory_audit_trail(directory_type, record_code, created_at DESC);
-- ============================================================================
-- 6) دوال حساب الأثر التلقائي
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_directory_impact(p_workflow_id UUID) RETURNS void AS $$
DECLARE v_wf directory_change_workflows %ROWTYPE;
v_impact_score NUMERIC(5, 2) := 0;
v_operational NUMERIC(5, 2) := 0;
v_financial NUMERIC(5, 2) := 0;
v_legal NUMERIC(5, 2) := 0;
v_entities INTEGER := 0;
v_persons INTEGER := 0;
v_contracts INTEGER := 0;
v_inspections INTEGER := 0;
v_services INTEGER := 0;
BEGIN
SELECT * INTO v_wf
FROM directory_change_workflows
WHERE id = p_workflow_id;
IF NOT FOUND THEN RETURN;
END IF;
-- حساب السجلات المتأثرة حسب نوع الدليل
IF v_wf.directory_type = 'occupation' THEN
SELECT COUNT(*) INTO v_persons
FROM worker_registry wr
    JOIN national_occupations no ON wr.occupation_id = no.id
WHERE no.code = v_wf.record_code;
ELSIF v_wf.directory_type = 'activity' THEN
SELECT COUNT(*) INTO v_entities
FROM legal_entities
WHERE classification = v_wf.record_code
    OR sector = v_wf.record_code;
ELSIF v_wf.directory_type = 'governorate' THEN
SELECT COUNT(*) INTO v_persons
FROM persons
WHERE governorate = v_wf.record_code;
SELECT COUNT(*) INTO v_entities
FROM legal_entities
WHERE governorate = v_wf.record_code;
ELSIF v_wf.directory_type = 'contract_type' THEN
SELECT COUNT(*) INTO v_contracts
FROM employment_contracts ec
    JOIN contract_types_registry ctr ON ec.contract_type_id = ctr.id
WHERE ctr.code = v_wf.record_code;
END IF;
-- حساب درجة الأثر
v_operational := LEAST(
    100,
    (v_persons * 0.5) + (v_entities * 1.0) + (v_contracts * 0.8) + (v_inspections * 0.3)
);
v_financial := CASE
    WHEN (v_contracts * 1000) > 1000000 THEN 80
    WHEN (v_contracts * 1000) > 100000 THEN 40
    ELSE 10
END;
v_legal := CASE
    WHEN v_wf.change_type IN ('deactivate', 'delete') THEN 70
    ELSE 20
END;
v_impact_score := (v_operational * 0.4) + (v_financial * 0.3) + (v_legal * 0.3);
-- إدراج/تحديث تقييم الأثر
INSERT INTO directory_impact_assessments (
        workflow_id,
        affected_entities_count,
        affected_persons_count,
        affected_contracts_count,
        affected_inspections_count,
        operational_impact,
        financial_impact,
        legal_impact,
        overall_impact,
        requires_executive_approval
    )
VALUES (
        p_workflow_id,
        v_entities,
        v_persons,
        v_contracts,
        v_inspections,
        v_operational,
        v_financial,
        v_legal,
        v_impact_score,
        v_impact_score > 60
    ) ON CONFLICT (workflow_id) DO
UPDATE
SET affected_entities_count = EXCLUDED.affected_entities_count,
    affected_persons_count = EXCLUDED.affected_persons_count,
    affected_contracts_count = EXCLUDED.affected_contracts_count,
    operational_impact = EXCLUDED.operational_impact,
    financial_impact = EXCLUDED.financial_impact,
    overall_impact = EXCLUDED.overall_impact,
    calculated_at = NOW();
-- تحديث درجة الأثر في الـ workflow
UPDATE directory_change_workflows
SET impact_score = v_impact_score,
    updated_at = NOW()
WHERE id = p_workflow_id;
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- 7) Triggers تلقائية
-- ============================================================================
-- Trigger لتسجيل التدقيق عند كل تغيير حالة
CREATE OR REPLACE FUNCTION audit_directory_workflow_state() RETURNS TRIGGER AS $$ BEGIN IF OLD.current_state IS DISTINCT
FROM NEW.current_state THEN
INSERT INTO directory_audit_trail (
        workflow_id,
        directory_type,
        record_code,
        action,
        previous_state,
        new_state,
        action_details
    )
VALUES (
        NEW.id,
        NEW.directory_type,
        NEW.record_code,
        'state_change',
        OLD.current_state,
        NEW.current_state,
        jsonb_build_object(
            'change_type',
            NEW.change_type,
            'impact_score',
            NEW.impact_score
        )
    );
END IF;
NEW.updated_at := NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_audit_workflow_state BEFORE
UPDATE ON directory_change_workflows FOR EACH ROW EXECUTE FUNCTION audit_directory_workflow_state();
-- Trigger لحساب الأثر تلقائياً عند الإدراج
CREATE OR REPLACE FUNCTION auto_calculate_impact() RETURNS TRIGGER AS $$ BEGIN PERFORM calculate_directory_impact(NEW.id);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_auto_calculate_impact
AFTER
INSERT ON directory_change_workflows FOR EACH ROW EXECUTE FUNCTION auto_calculate_impact();
-- ============================================================================
-- 8) Views للتقارير المؤسسية
-- ============================================================================
-- لوحة مؤشرات الأداء
CREATE OR REPLACE VIEW v_directory_workflow_kpi AS
SELECT COUNT(*) as total_workflows,
    COUNT(*) FILTER (
        WHERE current_state = 'approved'
    ) as approved_count,
    COUNT(*) FILTER (
        WHERE current_state = 'rejected'
    ) as rejected_count,
    COUNT(*) FILTER (
        WHERE current_state = 'published'
    ) as published_count,
    COUNT(*) FILTER (
        WHERE sla_breached = TRUE
    ) as breached_count,
    COUNT(*) FILTER (
        WHERE priority = 'critical'
            AND current_state NOT IN ('approved', 'published', 'rejected')
    ) as critical_pending,
    ROUND(AVG(impact_score), 2) as avg_impact_score,
    ROUND(
        AVG(
            EXTRACT(
                EPOCH
                FROM (approved_at - submitted_at)
            ) / 3600
        ),
        2
    ) as avg_approval_hours
FROM directory_change_workflows
WHERE created_at >= NOW() - INTERVAL '30 days';
-- عرض الـ workflows النشطة مع تفاصيلها
CREATE OR REPLACE VIEW v_active_workflows AS
SELECT w.id,
    w.directory_type,
    w.record_code,
    w.change_type,
    w.current_state,
    w.priority,
    w.impact_score,
    w.sla_deadline,
    w.sla_breached,
    w.submitted_at,
    w.submitted_by,
    EXTRACT(
        EPOCH
        FROM (NOW() - w.submitted_at)
    ) / 3600 as hours_in_queue,
    ia.affected_persons_count,
    ia.affected_entities_count,
    ia.affected_contracts_count
FROM directory_change_workflows w
    LEFT JOIN directory_impact_assessments ia ON w.id = ia.workflow_id
WHERE w.current_state NOT IN (
        'approved',
        'published',
        'rejected',
        'rolled_back'
    )
ORDER BY CASE
        w.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
    END,
    w.submitted_at ASC;
-- ============================================================================
-- 9) بيانات أولية: إعدادات SLA الافتراضية
-- ============================================================================
CREATE TABLE IF NOT EXISTS directory_sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    directory_type TEXT NOT NULL,
    change_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    sla_hours INTEGER NOT NULL,
    warning_threshold_hours INTEGER DEFAULT 2,
    auto_approve_threshold NUMERIC(5, 2) DEFAULT 30,
    -- أثر منخفض = موافقة تلقائية
    requires_levels INTEGER DEFAULT 1,
    -- عدد مستويات الموافقة
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(directory_type, change_type, priority)
);
INSERT INTO directory_sla_config (
        directory_type,
        change_type,
        priority,
        sla_hours,
        requires_levels
    )
VALUES -- تغييرات عادية
    ('occupation', 'update', 'normal', 24, 1),
    ('occupation', 'update', 'high', 8, 2),
    ('occupation', 'update', 'critical', 4, 3),
    ('activity', 'update', 'normal', 24, 1),
    ('governorate', 'update', 'normal', 48, 1),
    ('contract_type', 'update', 'normal', 24, 1),
    -- تعطيل
    ('occupation', 'deactivate', 'normal', 48, 2),
    ('activity', 'deactivate', 'normal', 48, 2),
    ('governorate', 'deactivate', 'normal', 72, 3),
    -- إنشاء جديد
    ('occupation', 'create', 'normal', 24, 1),
    ('activity', 'create', 'normal', 24, 1) ON CONFLICT DO NOTHING;
-- ============================================================================
-- 10) ملخص
-- ============================================================================
RAISE NOTICE '============================================================';
RAISE NOTICE 'Migration 20260830_02: National Directory Workflows';
RAISE NOTICE '============================================================';
RAISE NOTICE 'Created tables:';
RAISE NOTICE '  - directory_change_workflows (workflow lifecycle)';
RAISE NOTICE '  - directory_change_approvals (multi-level approval)';
RAISE NOTICE '  - directory_impact_assessments (auto impact calc)';
RAISE NOTICE '  - directory_sla_alerts (SLA monitoring)';
RAISE NOTICE '  - directory_audit_trail (institutional audit)';
RAISE NOTICE '  - directory_sla_config (SLA configuration)';
RAISE NOTICE '============================================================';
RAISE NOTICE 'Functions:';
RAISE NOTICE '  - calculate_directory_impact()';
RAISE NOTICE '  - audit_directory_workflow_state()';
RAISE NOTICE '  - auto_calculate_impact()';
RAISE NOTICE '============================================================';
RAISE NOTICE 'Views:';
RAISE NOTICE '  - v_directory_workflow_kpi';
RAISE NOTICE '  - v_active_workflows';
RAISE NOTICE '============================================================';
COMMIT;