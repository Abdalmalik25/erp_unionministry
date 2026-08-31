-- =============================================================================
-- PHASE 7: NUCLEAR DEEP UPGRADE — UNION MINISTRY DATABASE
-- =============================================================================
-- Date: 2026-08-30
-- Purpose: Fix all DB schema gaps, enhance triggers/views/functions, optimize search,
--          harden E2E flow, institutional-grade database content, testing from login to reports.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: CORE DATABASE FUNCTIONS
-- =============================================================================

-- 1.1 Arabic Full-Text Search Function with Normalization
CREATE OR REPLACE FUNCTION fn_arabic_search(
    search_term TEXT,
    language VARCHAR(2) DEFAULT 'ar'
)
RETURNS TABLE(
    word TEXT,
    normalized TEXT,
    stemmed TEXT
) AS $$
DECLARE
    normalized_term TEXT;
BEGIN
    -- Normalize Arabic text: remove diacritics, normalize characters
    normalized_term := regexp_replace(
        regexp_replace(
            regexp_replace(
                lower(search_term),
                '[\u064B-\u065F\u0670]'::TEXT, '', 'g'  -- Remove Arabic diacritics
            ),
            '[ؤئةءؤئةئإأآ]'::TEXT, 'ا', 'g'  -- Normalize alef variants
        ),
        '[ىئ]'::TEXT, 'ي', 'g'  -- Normalize ya variants
    );
    
    -- Return normalized term
    word := search_term;
    normalized := normalized_term;
    stemmed := substring(normalized_term, 1, 4);  -- Simple prefix stem for Arabic
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1.2 Universal Search Function (searches all text columns)
CREATE OR REPLACE FUNCTION fn_universal_search(
    p_table_name TEXT,
    p_search_term TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_language VARCHAR(2) DEFAULT 'ar'
)
RETURNS TABLE(
    id UUID,
    table_name TEXT,
    matched_column TEXT,
    matched_value TEXT,
    relevance_score NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_sql TEXT;
    v_normalized TEXT;
    v_record RECORD;
BEGIN
    -- Normalize search term for Arabic
    v_normalized := lower(regexp_replace(
        regexp_replace(regexp_replace(p_search_term, '[\u064B-\u065F\u0670]', '', 'g'), '[ؤئةءؤئةئإأآ]', 'ا', 'g'),
        '[ىئ]', 'ي', 'g'
    ));
    
    v_sql := format(
        'WITH search_results AS (
            SELECT id, %L as table_name, ''name'' as matched_column, 
                   name_ar as matched_value, 1.0 as relevance_score, created_at
            FROM %I 
            WHERE deleted_at IS NULL AND (name_ar ILIKE ''%%''||%L||''%%'' OR name_en ILIKE ''%%''||%L||''%%'')
            UNION ALL
            SELECT id, %L, ''description'', description, 0.7, created_at
            FROM %I 
            WHERE deleted_at IS NULL AND description ILIKE ''%%''||%L||''%%''
        )
        SELECT id, table_name, matched_column, matched_value, relevance_score, created_at
        FROM search_results
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT %s OFFSET %s',
        p_table_name, p_table_name, v_normalized, v_normalized,
        p_table_name, p_table_name, v_normalized,
        p_limit, p_offset
    );
    
    -- Execute dynamic query safely
    RETURN QUERY EXECUTE v_sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.3 Smart Suggestion Generator
CREATE OR REPLACE FUNCTION fn_generate_suggestions(
    p_entity_type TEXT,
    p_partial_term TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    suggestion TEXT,
    count BIGINT,
    entity_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format(
        'SELECT 
            COALESCE(name_ar, name_en, %L) as suggestion,
            COUNT(*) OVER () as count,
            %L as entity_type
         FROM %I
         WHERE deleted_at IS NULL 
           AND (name_ar ILIKE $1 OR name_en ILIKE $1 OR unified_code ILIKE $1)
         GROUP BY name_ar, name_en, unified_code
         ORDER BY COUNT(*) DESC
         LIMIT %s',
        p_partial_term, p_entity_type, p_entity_type, p_limit
    ) USING '%' || p_partial_term || '%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.4 Computed Fields Function: Entity Statistics
CREATE OR REPLACE FUNCTION fn_compute_entity_stats(p_entity_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'member_count', COALESCE((SELECT COUNT(*) FROM members WHERE entity_id = p_entity_id AND deleted_at IS NULL), 0),
        'activity_count', COALESCE((SELECT COUNT(*) FROM activities WHERE entity_id = p_entity_id AND deleted_at IS NULL), 0),
        'document_count', COALESCE((SELECT COUNT(*) FROM documents WHERE entity_id = p_entity_id AND deleted_at IS NULL), 0),
        'inspection_count', COALESCE((SELECT COUNT(*) FROM inspections WHERE enterprise_id = p_entity_id AND deleted_at IS NULL), 0),
        'violation_count', COALESCE((SELECT COUNT(*) FROM violations WHERE entity_id = p_entity_id AND deleted_at IS NULL), 0),
        'total_workers', COALESCE((SELECT SUM(yemeni_headcount + expatriate_headcount) FROM enterprise_occupation_links WHERE enterprise_id = p_entity_id AND deleted_at IS NULL), 0)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1.5 Compliance Score Calculator
CREATE OR REPLACE FUNCTION fn_compute_compliance_score(p_entity_id UUID)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    v_labor_score NUMERIC := 0;
    v_safety_score NUMERIC := 0;
    v_yemenization_score NUMERIC := 0;
    v_overall_score NUMERIC := 0;
    v_inspection_count INTEGER := 0;
BEGIN
    -- Get latest inspection scores
    SELECT 
        COALESCE(AVG(labor_law_score), 0),
        COALESCE(AVG(occupational_safety_score), 0),
        COALESCE(AVG(yemenization_rate), 0),
        COUNT(*)
    INTO v_labor_score, v_safety_score, v_yemenization_score, v_inspection_count
    FROM inspections
    WHERE enterprise_id = p_entity_id 
      AND deleted_at IS NULL
      AND inspection_date >= CURRENT_DATE - INTERVAL '1 year';
    
    IF v_inspection_count > 0 THEN
        v_overall_score := (v_labor_score + v_safety_score + v_yemenization_score) / 3;
    ELSE
        v_overall_score := 50; -- Default score if no inspections
    END IF;
    
    RETURN ROUND(v_overall_score, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- 1.6 Age Calculator
CREATE OR REPLACE FUNCTION fn_calculate_age(p_birth_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_years INTEGER;
BEGIN
    IF p_birth_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_years := EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_birth_date));
    RETURN v_years;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1.7 Date Validation Function
CREATE OR REPLACE FUNCTION fn_validate_date_range(
    p_start_date DATE,
    p_end_date DATE,
    p_max_years INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN TRUE;
    END IF;
    
    IF p_end_date < p_start_date THEN
        RETURN FALSE;
    END IF;
    
    IF p_end_date > p_start_date + (p_max_years || ' years')::INTERVAL THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1.8 National ID Validator (Yemen format)
CREATE OR REPLACE FUNCTION fn_validate_national_id(p_national_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_cleaned TEXT;
    v_len INTEGER;
BEGIN
    IF p_national_id IS NULL OR p_national_id = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Remove any non-digit characters
    v_cleaned := regexp_replace(p_national_id, '[^0-9]', '', 'g');
    v_len := length(v_cleaned);
    
    -- Yemen national IDs are typically 9-12 digits
    IF v_len < 9 OR v_len > 12 THEN
        RETURN FALSE;
    END IF;
    
    -- Check if all digits
    IF v_cleaned !~ '^[0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1.9 Phone Number Validator (Yemen format)
CREATE OR REPLACE FUNCTION fn_validate_yemen_phone(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_phone IS NULL OR p_phone = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Remove spaces and common prefixes
    p_phone := regexp_replace(p_phone, '[\s\-\(\)]', '', 'g');
    
    -- Check for Yemen prefixes: +967, 967, 07
    IF p_phone ~ '^\+967[0-9]{9}$' THEN
        RETURN TRUE;
    ELSIF p_phone ~ '^967[0-9]{9}$' THEN
        RETURN TRUE;
    ELSIF p_phone ~ '^07[0-9]{9}$' THEN
        RETURN TRUE;
    ELSIF p_phone ~ '^7[0-9]{9}$' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1.10 Duplicate Detection Function
CREATE OR REPLACE FUNCTION fn_check_duplicate_entity(
    p_entity_type TEXT,
    p_name_ar TEXT,
    p_name_en TEXT,
    p_unified_code TEXT,
    p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(
    is_duplicate BOOLEAN,
    duplicate_id UUID,
    duplicate_name TEXT,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format(
        'SELECT 
            TRUE as is_duplicate,
            e.id as duplicate_id,
            e.name_ar as duplicate_name,
            CASE 
                WHEN $4 IS NOT NULL AND e.unified_code = $4 THEN ''unified_code''
                WHEN e.name_ar = $2 THEN ''exact_name_ar''
                WHEN e.name_en = $3 THEN ''exact_name_en''
                WHEN soundex(e.name_ar) = soundex($2) THEN ''soundex''
                ELSE ''partial''
            END as match_type
         FROM %I e
         WHERE e.deleted_at IS NULL
           AND ($4 IS NULL OR e.id != $5)
           AND (
               e.unified_code = $4
               OR e.name_ar = $2
               OR e.name_en = $3
               OR soundex(e.name_ar) = soundex($2)
           )
         LIMIT 1',
        p_entity_type
    ) USING p_name_ar, p_name_en, p_unified_code, p_unified_code, p_exclude_id;
    
    -- Return no rows if no duplicates
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SECTION 2: ENHANCED AUDIT & TRACKING FUNCTIONS
-- =============================================================================

-- 2.1 Comprehensive Audit Logger
CREATE OR REPLACE FUNCTION fn_audit_log_write(
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_actor_id UUID DEFAULT NULL,
    p_actor_email TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_changed_fields TEXT[] := '{}';
    v_id UUID;
BEGIN
    -- Calculate changed fields
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT array_agg(key)
        INTO v_changed_fields
        FROM jsonb_object_keys_text(p_old_values) key
        WHERE p_old_values->key IS DISTINCT FROM p_new_values->key;
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log (
        table_name, record_id, action, actor_id, actor_email,
        old_values, new_values, changed_fields, ip_address, user_agent, notes
    ) VALUES (
        p_table_name, p_record_id, p_action, p_actor_id, p_actor_email,
        p_old_values, p_new_values, v_changed_fields, p_ip_address, p_user_agent, p_notes
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 Entity Version History
CREATE OR REPLACE FUNCTION fn_get_entity_history(
    p_table_name TEXT,
    p_record_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    action TEXT,
    actor_email TEXT,
    changed_fields TEXT[],
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ,
    time_ago TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.action,
        a.actor_email,
        a.changed_fields,
        a.old_values,
        a.new_values,
        a.created_at,
        CASE 
            WHEN EXTRACT(EPOCH FROM (now() - a.created_at)) < 60 THEN 'just now'
            WHEN EXTRACT(EPOCH FROM (now() - a.created_at)) < 3600 THEN 
                floor(EXTRACT(EPOCH FROM (now() - a.created_at))/60)::TEXT || ' minutes ago'
            WHEN EXTRACT(EPOCH FROM (now() - a.created_at)) < 86400 THEN 
                floor(EXTRACT(EPOCH FROM (now() - a.created_at))/3600)::TEXT || ' hours ago'
            ELSE to_char(a.created_at, 'YYYY-MM-DD HH24:MI')
        END as time_ago
    FROM audit_log a
    WHERE a.table_name = p_table_name 
      AND a.record_id = p_record_id
    ORDER BY a.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2.3 Activity Timeline Builder
CREATE OR REPLACE FUNCTION fn_build_entity_timeline(p_entity_id UUID)
RETURNS TABLE(
    timeline_date TIMESTAMPTZ,
    activity_type TEXT,
    description TEXT,
    actor_name TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Add inspections
    SELECT 
        i.created_at,
        'inspection'::TEXT,
        'Inspection conducted: ' || COALESCE(i.inspection_number, i.id::TEXT),
        COALESCE(i.inspector_name, 'System'),
        jsonb_build_object('inspection_type', i.inspection_type, 'score', i.overall_score)
    FROM inspections i
    WHERE i.enterprise_id = p_entity_id AND i.deleted_at IS NULL
    
    UNION ALL
    
    -- Add violations
    SELECT 
        v.created_at,
        'violation'::TEXT,
        'Violation recorded: ' || v.violation_type,
        COALESCE(v.recorded_by_name, 'System'),
        jsonb_build_object('severity', v.severity, 'fine_amount', v.fine_amount)
    FROM violations v
    WHERE v.entity_id = p_entity_id AND v.deleted_at IS NULL
    
    UNION ALL
    
    -- Add documents
    SELECT 
        d.created_at,
        'document'::TEXT,
        'Document uploaded: ' || d.document_name,
        COALESCE(d.created_by_name, 'System'),
        jsonb_build_object('document_type', d.document_type, 'status', d.status)
    FROM documents d
    WHERE d.entity_id = p_entity_id AND d.deleted_at IS NULL
    
    UNION ALL
    
    -- Add member changes
    SELECT 
        m.updated_at,
        'member_update'::TEXT,
        'Member data updated',
        COALESCE(m.updated_by_name, 'System'),
        jsonb_build_object('full_name', m.full_name)
    FROM members m
    WHERE m.entity_id = p_entity_id AND m.updated_at IS NOT NULL AND m.deleted_at IS NULL
    
    ORDER BY timeline_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SECTION 3: ADVANCED VALIDATION FUNCTIONS
-- =============================================================================

-- 3.1 Employment Contract Validator
CREATE OR REPLACE FUNCTION fn_validate_employment_contract(
    p_contract_data JSONB
)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_code TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_salary NUMERIC;
    v_worker_count INTEGER;
BEGIN
    -- Parse contract data
    v_start_date := (p_contract_data->>'start_date')::DATE;
    v_end_date := (p_contract_data->>'end_date')::DATE;
    v_salary := (p_contract_data->>'salary')::NUMERIC;
    
    -- Check required fields
    IF v_start_date IS NULL THEN
        RETURN QUERY SELECT FALSE, 'MISSING_START_DATE', 'Start date is required';
        RETURN;
    END IF;
    
    IF v_salary IS NULL OR v_salary <= 0 THEN
        RETURN QUERY SELECT FALSE, 'INVALID_SALARY', 'Salary must be greater than zero';
        RETURN;
    END IF;
    
    -- Check minimum wage (Yemen minimum wage check)
    IF v_salary < 21000 THEN  -- Yemen minimum wage as of 2024
        RETURN QUERY SELECT FALSE, 'BELOW_MINIMUM_WAGE', 'Salary below Yemen minimum wage of 21,000 YER';
        RETURN;
    END IF;
    
    -- Check contract duration
    IF v_end_date IS NOT NULL THEN
        IF NOT fn_validate_date_range(v_start_date, v_end_date, 5) THEN
            RETURN QUERY SELECT FALSE, 'INVALID_DURATION', 'Contract duration exceeds maximum allowed period';
            RETURN;
        END IF;
    END IF;
    
    -- All validations passed
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3.2 Business Rule Evaluator
CREATE OR REPLACE FUNCTION fn_evaluate_business_rule(
    p_rule_key TEXT,
    p_context JSONB
)
RETURNS TABLE(
    rule_key TEXT,
    is_satisfied BOOLEAN,
    details JSONB,
    recommendation TEXT
) AS $$
DECLARE
    v_rule RECORD;
    v_result BOOLEAN;
    v_message TEXT;
BEGIN
    -- Get the rule definition
    SELECT * INTO v_rule
    FROM regulatory_rules
    WHERE rule_key = p_rule_key AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN QUERY 
        SELECT 
            p_rule_key, 
            FALSE, 
            jsonb_build_object('error', 'Rule not found'),
            'Please define the business rule before evaluation';
        RETURN;
    END IF;
    
    -- Evaluate based on rule type
    CASE v_rule.rule_type
        WHEN 'age_requirement' THEN
            v_result := (p_context->>'age')::INTEGER >= (v_rule.rule_value->>'min_age')::INTEGER;
            v_message := CASE WHEN v_result THEN 'Age requirement met' ELSE 'Age below minimum requirement' END;
        
        WHEN 'yemenization_quota' THEN
            v_result := (p_context->>'yemenization_rate')::NUMERIC >= (v_rule.rule_value->>'min_rate')::NUMERIC;
            v_message := CASE WHEN v_result THEN 'Yemenization quota met' ELSE 'Yemenization quota not met' END;
        
        WHEN 'license_validity' THEN
            v_result := (p_context->>'license_expiry')::DATE > CURRENT_DATE;
            v_message := CASE WHEN v_result THEN 'License is valid' ELSE 'License has expired' END;
        
        WHEN 'registration_complete' THEN
            v_result := (p_context->>'completion_percentage')::NUMERIC >= 100;
            v_message := CASE WHEN v_result THEN 'Registration complete' ELSE 'Registration incomplete' END;
        
        ELSE
            v_result := TRUE;
            v_message := 'Rule evaluated successfully';
    END CASE;
    
    RETURN QUERY
    SELECT 
        p_rule_key,
        v_result,
        jsonb_build_object(
            'rule_type', v_rule.rule_type,
            'rule_value', v_rule.rule_value,
            'context', p_context
        ),
        v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 SLA Deadline Calculator
CREATE OR REPLACE FUNCTION fn_calculate_sla_deadline(
    p_service_code TEXT,
    p_submission_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    deadline TIMESTAMPTZ,
    business_days INTEGER,
    calendar_days INTEGER,
    urgency_level TEXT
) AS $$
DECLARE
    v_sla_days INTEGER;
    v_urgency TEXT;
BEGIN
    -- Get SLA days from service catalog
    SELECT sla_days INTO v_sla_days
    FROM service_catalog
    WHERE service_code = p_service_code;
    
    IF NOT FOUND THEN
        v_sla_days := 7; -- Default to 7 days
    END IF;
    
    -- Calculate deadline
    deadline := p_submission_date + (v_sla_days || ' days')::INTERVAL;
    business_days := v_sla_days;
    calendar_days := v_sla_days;
    
    -- Determine urgency
    IF v_sla_days <= 2 THEN
        v_urgency := 'critical';
    ELSIF v_sla_days <= 5 THEN
        v_urgency := 'high';
    ELSIF v_sla_days <= 10 THEN
        v_urgency := 'normal';
    ELSE
        v_urgency := 'low';
    END IF;
    
    RETURN QUERY SELECT deadline, business_days, calendar_days, v_urgency;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SECTION 4: AGGREGATION & REPORTING FUNCTIONS
-- =============================================================================

-- 4.1 Dashboard Statistics Aggregator
CREATE OR REPLACE FUNCTION fn_get_dashboard_stats(p_user_role TEXT DEFAULT 'ministry')
RETURNS TABLE(
    stat_key TEXT,
    stat_value BIGINT,
    stat_label TEXT,
    stat_category TEXT,
    trend_direction TEXT,
    trend_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    -- Total entities
    SELECT 
        'total_entities'::TEXT,
        COUNT(*)::BIGINT,
        'إجمالي المنشآت'::TEXT,
        'entities'::TEXT,
        CASE WHEN COUNT(*) > (SELECT COUNT(*) FROM organizational_entities WHERE created_at > NOW() - INTERVAL '30 days') 
             THEN 'up' ELSE 'stable' END,
        0::NUMERIC
    FROM organizational_entities e
    WHERE e.deleted_at IS NULL;
    
    -- Active entities
    SELECT 
        'active_entities'::TEXT,
        COUNT(*)::BIGINT,
        'المنشآت النشطة'::TEXT,
        'entities'::TEXT,
        'up',
        0::NUMERIC
    FROM organizational_entities
    WHERE status = 'active' AND deleted_at IS NULL;
    
    -- Pending inspections
    SELECT 
        'pending_inspections'::TEXT,
        COUNT(*)::BIGINT,
        'التفتيشات المعلقة'::TEXT,
        'inspections'::TEXT,
        CASE WHEN COUNT(*) > 10 THEN 'up' ELSE 'down' END,
        0::NUMERIC
    FROM inspections
    WHERE compliance_status = 'قيد المراجعة' AND deleted_at IS NULL;
    
    -- Violations this month
    SELECT 
        'monthly_violations'::TEXT,
        COUNT(*)::BIGINT,
        'المخالفات الشهرية'::TEXT,
        'violations'::TEXT,
        'neutral',
        0::NUMERIC
    FROM violations
    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      AND deleted_at IS NULL;
    
    -- Total workers
    SELECT 
        'total_workers'::TEXT,
        COALESCE(SUM(yemeni_headcount + expatriate_headcount), 0)::BIGINT,
        'إجمالي العمال'::TEXT,
        'workers'::TEXT,
        'up',
        0::NUMERIC
    FROM enterprise_occupation_links
    WHERE deleted_at IS NULL;
    
    -- Yemenization rate
    SELECT 
        'yemenization_rate'::TEXT,
        CASE 
            WHEN COALESCE(SUM(yemeni_headcount + expatriate_headcount), 0) > 0 
            THEN (SUM(yemeni_headcount)::NUMERIC / NULLIF(SUM(yemeni_headcount + expatriate_headcount), 0) * 100)::BIGINT
            ELSE 0 
        END,
        'نسبة التشغيل'::TEXT,
        'workers'::TEXT,
        'neutral',
        0::NUMERIC
    FROM enterprise_occupation_links
    WHERE deleted_at IS NULL;
    
    -- Open disputes
    SELECT 
        'open_disputes'::TEXT,
        COUNT(*)::BIGINT,
        'النزاعات المفتوحة'::TEXT,
        'disputes'::TEXT,
        CASE WHEN COUNT(*) < 10 THEN 'down' ELSE 'up' END,
        0::NUMERIC
    FROM labor_disputes
    WHERE status NOT IN ('تم الحل', 'ملغي') AND deleted_at IS NULL;
    
    -- Compliance rate
    SELECT 
        'compliance_rate'::TEXT,
        (SELECT COUNT(*) FROM organizational_entities WHERE compliance_status = 'متوافق' AND deleted_at IS NULL)::BIGINT,
        'معدل الامتثال'::TEXT,
        'compliance'::TEXT,
        'up',
        0::NUMERIC
    FROM organizational_entities
    WHERE deleted_at IS NULL
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4.2 Monthly Trend Calculator
CREATE OR REPLACE FUNCTION fn_calculate_monthly_trends(
    p_entity_type TEXT,
    p_months INTEGER DEFAULT 6
)
RETURNS TABLE(
    month_date DATE,
    entity_count BIGINT,
    new_count BIGINT,
    updated_count BIGINT,
    deleted_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT generate_series(
            DATE_TRUNC('month', CURRENT_DATE) - ((p_months - 1) || ' months')::INTERVAL,
            DATE_TRUNC('month', CURRENT_DATE),
            '1 month'::INTERVAL
        )::DATE as month_start
    ),
    counts AS (
        SELECT 
            m.month_start,
            COUNT(e.id) as entity_count,
            COUNT(*) FILTER (WHERE DATE_TRUNC('month', e.created_at) = m.month_start) as new_count,
            COUNT(*) FILTER (WHERE DATE_TRUNC('month', e.updated_at) = m.month_start AND e.updated_at != e.created_at) as updated_count,
            COUNT(*) FILTER (WHERE DATE_TRUNC('month', e.deleted_at) = m.month_start) as deleted_count
        FROM months m
        LEFT JOIN organizational_entities e ON TRUE
            AND DATE_TRUNC('month', COALESCE(e.created_at, e.updated_at)) <= m.month_start
        WHERE p_entity_type = 'all' OR e.entity_type = p_entity_type
        GROUP BY m.month_start
    )
    SELECT 
        c.month_start,
        c.entity_count,
        c.new_count,
        c.updated_count,
        c.deleted_count
    FROM counts c
    ORDER BY c.month_start;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4.3 Geographic Distribution Report
CREATE OR REPLACE FUNCTION fn_get_governorate_distribution()
RETURNS TABLE(
    governorate TEXT,
    entity_count BIGINT,
    worker_count BIGINT,
    violation_count BIGINT,
    inspection_count BIGINT,
    compliance_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(g.name_ar, 'غير محدد') as governorate,
        COUNT(DISTINCT e.id)::BIGINT as entity_count,
        COALESCE(SUM(eol.yemeni_headcount + eol.expatriate_headcount), 0)::BIGINT as worker_count,
        COUNT(DISTINCT v.id)::BIGINT as violation_count,
        COUNT(DISTINCT i.id)::BIGINT as inspection_count,
        CASE 
            WHEN COUNT(DISTINCT e.id) > 0 
            THEN ROUND(
                COUNT(DISTINCT e.id) FILTER (WHERE e.compliance_status = 'متوافق')::NUMERIC / 
                NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2
            )
            ELSE 0 
        END as compliance_rate
    FROM governorates g
    LEFT JOIN organizational_entities e ON e.governorate = g.code AND e.deleted_at IS NULL
    LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.id AND eol.deleted_at IS NULL
    LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
    LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
    GROUP BY g.code, g.name_ar
    ORDER BY entity_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4.4 Sector Performance Report
CREATE OR REPLACE FUNCTION fn_get_sector_performance()
RETURNS TABLE(
    sector TEXT,
    entity_count BIGINT,
    avg_compliance_score NUMERIC,
    total_workers BIGINT,
    violation_rate NUMERIC,
    inspection_frequency NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(s.name_ar, 'أخرى') as sector,
        COUNT(DISTINCT e.id)::BIGINT,
        ROUND(AVG(e.avg_compliance_score), 2),
        COALESCE(SUM(eol.yemeni_headcount + eol.expatriate_headcount), 0)::BIGINT,
        ROUND(
            COUNT(DISTINCT v.id)::NUMERIC / 
            NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2
        ) as violation_rate,
        ROUND(
            COUNT(DISTINCT i.id)::NUMERIC / 
            NULLIF(COUNT(DISTINCT e.id), 0), 2
        ) as inspection_frequency
    FROM economic_sectors s
    LEFT JOIN organizational_entities e ON e.sector = s.code AND e.deleted_at IS NULL
    LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.id AND eol.deleted_at IS NULL
    LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
    LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
    GROUP BY s.code, s.name_ar
    HAVING COUNT(DISTINCT e.id) > 0
    ORDER BY entity_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- SECTION 5: COMPREHENSIVE TRIGGERS
-- =============================================================================

-- 5.1 Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION trg_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Soft delete trigger function
CREATE OR REPLACE FUNCTION trg_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        NEW.deleted_at = NOW();
        NEW.deleted_by = CURRENT_SETTING('app.current_user_id', TRUE)::UUID;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Audit trail trigger function
CREATE OR REPLACE FUNCTION trg_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_user_id UUID;
BEGIN
    -- Get current user ID if available
    BEGIN
        v_user_id := CURRENT_SETTING('app.current_user_id', TRUE)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Capture old values for UPDATE/DELETE
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old_values := row_to_json(OLD)::JSONB;
        -- Remove system fields from audit
        v_old_values := v_old_values - ARRAY['created_at', 'updated_at', 'created_by', 'updated_by'];
    END IF;
    
    -- Capture new values for INSERT/UPDATE
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new_values := row_to_json(NEW)::JSONB;
        -- Remove system fields from audit
        v_new_values := v_new_values - ARRAY['created_at', 'updated_at', 'created_by', 'updated_by'];
    END IF;
    
    -- Write audit record
    INSERT INTO audit_log (
        table_name, record_id, action, actor_id,
        old_values, new_values,
        ip_address, user_agent
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        v_user_id,
        v_old_values,
        v_new_values,
        NULL,  -- Would need application-level setting
        NULL
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Apply audit triggers to core tables
DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'organizational_entities', 'members', 'activities', 'elections',
        'documents', 'inspections', 'violations', 'licenses',
        'enterprise_occupation_links', 'labor_disputes', 'services'
    ];
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        -- Skip if table doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            CONTINUE;
        END IF;
        
        -- Create audit trigger (skip if exists)
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || v_table || '_audit') THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_audit
                 AFTER INSERT OR UPDATE OR DELETE ON %I
                 FOR EACH ROW EXECUTE FUNCTION trg_audit_trail()',
                v_table, v_table
            );
        END IF;
        
        -- Create update timestamp trigger
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || v_table || '_updated_at') THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%I_updated_at
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION trg_update_timestamp()',
                v_table, v_table
            );
        END IF;
    END LOOP;
END $$;

-- 5.5 Auto-compute compliance score on inspection insert/update
CREATE OR REPLACE FUNCTION trg_update_entity_compliance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.enterprise_id IS NOT NULL THEN
        UPDATE organizational_entities
        SET 
            avg_compliance_score = fn_compute_compliance_score(NEW.enterprise_id),
            updated_at = NOW()
        WHERE id = NEW.enterprise_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if inspections table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspections') THEN
        CREATE TRIGGER trg_inspections_compliance_update
            AFTER INSERT OR UPDATE ON inspections
            FOR EACH ROW EXECUTE FUNCTION trg_update_entity_compliance();
    END IF;
END $$;

-- 5.6 Validate date ranges on contract updates
CREATE OR REPLACE FUNCTION trg_validate_contract_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
        IF NEW.end_date < NEW.start_date THEN
            RAISE EXCEPTION 'End date cannot be before start date';
        END IF;
        
        IF NEW.end_date > NEW.start_date + INTERVAL '5 years' THEN
            RAISE EXCEPTION 'Contract duration cannot exceed 5 years';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create contract date validation trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employment_contracts') THEN
        CREATE TRIGGER trg_contract_dates_validation
            BEFORE INSERT OR UPDATE ON employment_contracts
            FOR EACH ROW EXECUTE FUNCTION trg_validate_contract_dates();
    END IF;
END $$;

-- =============================================================================
-- SECTION 6: INSTITUTIONAL REPORTING VIEWS
-- =============================================================================

-- 6.1 Ministry Executive Dashboard View
CREATE OR REPLACE VIEW v_ministry_executive_dashboard AS
SELECT 
    COUNT(*) FILTER (WHERE e.status = 'active') as active_entities,
    COUNT(*) FILTER (WHERE e.status = 'suspended') as suspended_entities,
    COUNT(*) FILTER (WHERE e.status = 'inactive') as inactive_entities,
    COUNT(*) FILTER (WHERE e.compliance_status = 'متوافق') as compliant_entities,
    COUNT(*) FILTER (WHERE e.compliance_status = 'غير متوافق') as non_compliant_entities,
    COUNT(*) FILTER (WHERE e.risk_level = 'high') as high_risk_entities,
    COUNT(*) FILTER (WHERE e.license_status = 'منتهي') as expired_licenses,
    COALESCE(SUM(eol.yemeni_headcount), 0)::BIGINT as total_yemeni_workers,
    COALESCE(SUM(eol.expatriate_headcount), 0)::BIGINT as total_expatriate_workers,
    COUNT(DISTINCT g.code) as governorates_covered,
    COUNT(DISTINCT e.sector) as sectors_active,
    COUNT(i.id) FILTER (WHERE i.inspection_date >= CURRENT_DATE - INTERVAL '30 days') as inspections_last_30_days,
    COUNT(v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as violations_last_30_days,
    COUNT(d.id) FILTER (WHERE d.status = 'approved' AND d.approval_date >= CURRENT_DATE - INTERVAL '30 days') as documents_approved_30_days,
    COUNT(ld.id) FILTER (WHERE ld.status = 'قيد النظر') as pending_disputes,
    CURRENT_DATE as report_date
FROM organizational_entities e
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.id AND eol.deleted_at IS NULL
LEFT JOIN governorates g ON g.code = e.governorate
LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
LEFT JOIN documents d ON d.entity_id = e.id AND d.deleted_at IS NULL
LEFT JOIN labor_disputes ld ON ld.enterprise_id = e.id AND ld.deleted_at IS NULL
WHERE e.deleted_at IS NULL;

-- 6.2 Entity Detailed View
CREATE OR REPLACE VIEW v_entity_details AS
SELECT 
    e.id,
    e.unified_code,
    e.name_ar,
    e.name_en,
    e.entity_type,
    e.classification,
    e.sector,
    e.status,
    e.license_status,
    e.license_expiry,
    e.compliance_status,
    e.risk_level,
    e.governorate,
    e.city,
    e.phone,
    e.email,
    e.establishment_date,
    e.registration_date,
    e.avg_compliance_score,
    fn_compute_entity_stats(e.id) as stats,
    COUNT(DISTINCT m.id) OVER (PARTITION BY e.id) as member_count,
    COUNT(DISTINCT eol.id) OVER (PARTITION BY e.id) as occupation_links_count,
    COALESCE(SUM(eol.yemeni_headcount + eol.expatriate_headcount) OVER (PARTITION BY e.id), 0) as total_workers,
    COUNT(DISTINCT i.id) OVER (PARTITION BY e.id) as inspection_count,
    COUNT(DISTINCT v.id) OVER (PARTITION BY e.id) as violation_count,
    MAX(i.inspection_date) OVER (PARTITION BY e.id) as last_inspection_date,
    e.created_at,
    e.updated_at
FROM organizational_entities e
LEFT JOIN members m ON m.entity_id = e.id AND m.deleted_at IS NULL
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.id AND eol.deleted_at IS NULL
LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
WHERE e.deleted_at IS NULL;

-- 6.3 Inspection Summary View
CREATE OR REPLACE VIEW v_inspection_summary AS
SELECT 
    i.id,
    i.inspection_number,
    i.inspection_date,
    i.inspection_type,
    i.compliance_status,
    i.overall_score,
    i.labor_law_score,
    i.safety_score,
    i.yemenization_score,
    i.training_compliance_rate,
    e.name_ar as enterprise_name,
    e.unified_code as enterprise_code,
    e.governorate,
    e.sector,
    e.compliance_status as entity_compliance,
    COUNT(c.id) as checklist_items,
    COUNT(c.id) FILTER (WHERE c.is_compliant = TRUE) as compliant_items,
    COUNT(c.id) FILTER (WHERE c.is_compliant = FALSE) as non_compliant_items,
    i.created_at
FROM inspections i
JOIN organizational_entities e ON e.id = i.enterprise_id
LEFT JOIN inspection_checklists c ON c.inspection_id = i.id
WHERE i.deleted_at IS NULL
GROUP BY i.id, e.id;

-- 6.4 Violation Analysis View
CREATE OR REPLACE VIEW v_violation_analysis AS
SELECT 
    v.id,
    v.violation_number,
    v.violation_type,
    v.severity,
    v.fine_amount,
    v.status,
    v.resolved_date,
    v.resolution_notes,
    e.name_ar as enterprise_name,
    e.unified_code as enterprise_code,
    e.sector,
    e.governorate,
    e.license_status as enterprise_license_status,
    DATE_TRUNC('month', v.created_at) as violation_month,
    EXTRACT(YEAR FROM v.created_at) as violation_year,
    COUNT(*) OVER (PARTITION BY v.violation_type) as violation_type_count,
    SUM(v.fine_amount) OVER (PARTITION BY v.violation_type) as total_fines_by_type,
    COUNT(*) OVER (PARTITION BY e.sector) as sector_violation_count,
    CASE 
        WHEN v.fine_amount > 100000 THEN 'major'
        WHEN v.fine_amount > 50000 THEN 'moderate'
        ELSE 'minor'
    END as violation_category
FROM violations v
JOIN organizational_entities e ON e.id = v.entity_id
WHERE v.deleted_at IS NULL;

-- 6.5 Worker Distribution View
CREATE OR REPLACE VIEW v_worker_distribution AS
SELECT 
    eol.enterprise_id,
    e.name_ar as enterprise_name,
    e.sector,
    e.governorate,
    eol.occupation_name_ar,
    eol.isco_code,
    eol.yemeni_headcount,
    eol.expatriate_headcount,
    eol.yemeni_headcount + eol.expatriate_headcount as total_headcount,
    ROUND(
        eol.yemeni_headcount::NUMERIC / 
        NULLIF(eol.yemeni_headcount + eol.expatriate_headcount, 0) * 100, 
        2
    ) as yemenization_percentage,
    eol.salary_scale,
    eol.link_status,
    eol.compliance_score,
    CASE 
        WHEN eol.expatriate_headcount > 0 AND 
             ROUND(eol.yemeni_headcount::NUMERIC / NULLIF(eol.yemeni_headcount + eol.expatriate_headcount, 0) * 100, 2) < 25
        THEN 'critical_low'
        WHEN eol.expatriate_headcount > 0 AND 
             ROUND(eol.yemeni_headcount::NUMERIC / NULLIF(eol.yemeni_headcount + eol.expatriate_headcount, 0) * 100, 2) < 50
        THEN 'low'
        WHEN eol.expatriate_headcount > 0 AND 
             ROUND(eol.yemeni_headcount::NUMERIC / NULLIF(eol.yemeni_headcount + eol.expatriate_headcount, 0) * 100, 2) < 75
        THEN 'moderate'
        ELSE 'good'
    END as yemenization_status
FROM enterprise_occupation_links eol
JOIN organizational_entities e ON e.id = eol.enterprise_id
WHERE eol.deleted_at IS NULL AND e.deleted_at IS NULL;

-- 6.6 Service Request Status View
CREATE OR REPLACE VIEW v_service_request_status AS
SELECT 
    sr.id,
    sr.request_number,
    sr.service_id,
    s.name_ar as service_name,
    s.category,
    sr.applicant_type,
    sr.status,
    sr.submission_date,
    sr.processing_deadline,
    sr.completion_date,
    EXTRACT(DAYS FROM (COALESCE(sr.completion_date, NOW()) - sr.submission_date)) as processing_days,
    CASE 
        WHEN sr.completion_date IS NOT NULL AND 
             sr.completion_date <= sr.processing_deadline THEN 'on_time'
        WHEN sr.completion_date IS NOT NULL AND 
             sr.completion_date > sr.processing_deadline THEN 'delayed'
        WHEN sr.processing_deadline < CURRENT_DATE THEN 'overdue'
        WHEN sr.processing_deadline < CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
        ELSE 'on_track'
    END as timeliness_status,
    e.name_ar as enterprise_name,
    e.governorate
FROM service_requests sr
JOIN services s ON s.id = sr.service_id
LEFT JOIN organizational_entities e ON e.id = sr.entity_id
WHERE sr.deleted_at IS NULL;

-- 6.7 Document Lifecycle View
CREATE OR REPLACE VIEW v_document_lifecycle AS
SELECT 
    d.id,
    d.document_number,
    d.document_name,
    d.document_type,
    d.status,
    d.issue_date,
    d.expiry_date,
    d.issuing_authority,
    d.approval_date,
    e.name_ar as enterprise_name,
    e.governorate,
    CASE 
        WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN d.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        WHEN d.expiry_date < CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_90_days'
        ELSE 'valid'
    END as validity_status,
    CASE 
        WHEN d.status = 'approved' AND d.expiry_date >= CURRENT_DATE THEN 'active'
        WHEN d.status = 'pending' THEN 'pending_review'
        WHEN d.status = 'rejected' THEN 'rejected'
        WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
        ELSE 'inactive'
    END as lifecycle_status,
    COUNT(*) OVER (PARTITION BY d.document_type) as type_count,
    AVG(EXTRACT(DAYS FROM (COALESCE(d.approval_date, NOW()) - d.issue_date))) 
        OVER (PARTITION BY d.document_type) as avg_processing_days
FROM documents d
JOIN organizational_entities e ON e.id = d.entity_id
WHERE d.deleted_at IS NULL;

-- 6.8 Annual Report Summary View
CREATE OR REPLACE VIEW v_annual_report_summary AS
SELECT 
    EXTRACT(YEAR FROM e.created_at) as report_year,
    COUNT(DISTINCT e.id) as total_entities_registered,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') as active_entities,
    COUNT(DISTINCT m.id) as total_members,
    COUNT(DISTINCT a.id) as total_activities,
    COUNT(DISTINCT i.id) as total_inspections,
    COUNT(DISTINCT i.id) FILTER (WHERE i.compliance_status = 'متوافق') as compliant_inspections,
    COUNT(DISTINCT v.id) as total_violations,
    SUM(v.fine_amount) FILTER (WHERE v.created_at >= DATE_TRUNC('year', CURRENT_DATE)) as total_fines_collected,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'approved') as approved_documents,
    COALESCE(SUM(eol.yemeni_headcount), 0) as total_yemeni_workers,
    COALESCE(SUM(eol.expatriate_headcount), 0) as total_expatriate_workers,
    COUNT(DISTINCT ld.id) FILTER (WHERE ld.status != 'تم الحل') as open_disputes,
    ROUND(
        COUNT(DISTINCT i.id) FILTER (WHERE i.compliance_status = 'متوافق')::NUMERIC /
        NULLIF(COUNT(DISTINCT i.id), 0) * 100, 2
    ) as overall_compliance_rate
FROM organizational_entities e
LEFT JOIN members m ON m.entity_id = e.id AND m.deleted_at IS NULL
LEFT JOIN activities a ON a.entity_id = e.id AND a.deleted_at IS NULL
LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
LEFT JOIN documents d ON d.entity_id = e.id AND d.deleted_at IS NULL
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.id AND eol.deleted_at IS NULL
LEFT JOIN labor_disputes ld ON ld.enterprise_id = e.id AND ld.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY EXTRACT(YEAR FROM e.created_at)
ORDER BY report_year DESC;

-- =============================================================================
-- SECTION 7: MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================================================

-- 7.1 National Dashboard Materialized View
DROP MATERIALIZED VIEW IF EXISTS mv_national_dashboard CASCADE;
CREATE MATERIALIZED VIEW mv_national_dashboard AS
SELECT 
    CURRENT_DATE as snapshot_date,
    e.sector,
    e.governorate,
    e.entity_type,
    e.classification,
    COUNT(DISTINCT e.id) as entity_count,
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') as active_count,
    COUNT(DISTINCT e.id) FILTER (WHERE e.compliance_status = 'غير متوافق') as non_compliant_count,
    ROUND(
        COUNT(DISTINCT e.id) FILTER (WHERE e.compliance_status = 'متوافق')::NUMERIC /
        NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2
    ) as compliance_rate,
    COALESCE(SUM(eol.yemeni_headcount), 0)::BIGINT as yemeni_workers,
    COALESCE(SUM(eol.expatriate_headcount), 0)::BIGINT as expatriate_workers,
    COUNT(DISTINCT i.id) as inspection_count,
    COUNT(DISTINCT v.id) as violation_count,
    AVG(i.overall_score) as avg_inspection_score
FROM organizational_entities e
LEFT JOIN enterprise_occupation_links eol ON eol.enterprise_id = e.id AND eol.deleted_at IS NULL
LEFT JOIN inspections i ON i.enterprise_id = e.id AND i.deleted_at IS NULL
LEFT JOIN violations v ON v.entity_id = e.id AND v.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.sector, e.governorate, e.entity_type, e.classification
WITH DATA;

CREATE UNIQUE INDEX idx_mv_national_dashboard 
ON mv_national_dashboard(sector, governorate, entity_type, classification);

-- 7.2 Monthly Trends Materialized View
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_trends CASCADE;
CREATE MATERIALIZED VIEW mv_monthly_trends AS
SELECT 
    DATE_TRUNC('month', snapshot_date) as month,
    sector,
    governorate,
    SUM(entity_count) as total_entities,
    SUM(active_count) as active_entities,
    SUM(non_compliant_count) as non_compliant_entities,
    SUM(yemeni_workers) as total_yemeni,
    SUM(expatriate_workers) as total_expatriate,
    SUM(violation_count) as total_violations,
    AVG(compliance_rate) as avg_compliance_rate,
    AVG(avg_inspection_score) as avg_score
FROM mv_national_dashboard
GROUP BY DATE_TRUNC('month', snapshot_date), sector, governorate
WITH DATA;

CREATE UNIQUE INDEX idx_mv_monthly_trends 
ON mv_monthly_trends(month, sector, governorate);

-- 7.3 SLA Performance Materialized View
DROP MATERIALIZED VIEW IF EXISTS mv_sla_performance CASCADE;
CREATE MATERIALIZED VIEW mv_sla_performance AS
SELECT 
    CURRENT_DATE as snapshot_date,
    s.category,
    s.service_code,
    s.title_ar,
    COUNT(sr.id) as total_requests,
    COUNT(sr.id) FILTER (WHERE sr.status = 'completed') as completed_requests,
    COUNT(sr.id) FILTER (WHERE sr.status = 'pending') as pending_requests,
    COUNT(sr.id) FILTER (WHERE sr.completion_date IS NOT NULL AND sr.completion_date <= sr.processing_deadline) as on_time_completions,
    COUNT(sr.id) FILTER (WHERE sr.completion_date IS NOT NULL AND sr.completion_date > sr.processing_deadline) as late_completions,
    AVG(EXTRACT(DAYS FROM (COALESCE(sr.completion_date, CURRENT_DATE) - sr.submission_date))) as avg_processing_days,
    MIN(s.sla_days) as target_sla_days,
    ROUND(
        COUNT(sr.id) FILTER (WHERE sr.completion_date IS NOT NULL AND sr.completion_date <= sr.processing_deadline)::NUMERIC /
        NULLIF(COUNT(sr.id) FILTER (WHERE sr.completion_date IS NOT NULL), 0) * 100, 2
    ) as on_time_percentage
FROM services s
LEFT JOIN service_requests sr ON sr.service_id = s.id AND sr.deleted_at IS NULL
GROUP BY s.category, s.service_code, s.title_ar
WITH DATA;

CREATE UNIQUE INDEX idx_mv_sla_performance 
ON mv_sla_performance(service_code);

-- =============================================================================
-- SECTION 8: ENHANCED INDEXES FOR PERFORMANCE
-- =============================================================================

-- 8.1 Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entities_status_compliance 
ON organizational_entities(status, compliance_status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entities_governorate_sector 
ON organizational_entities(governorate, sector) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entities_license_expiry 
ON organizational_entities(license_expiry) 
WHERE deleted_at IS NULL AND license_expiry IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_entity_status 
ON members(entity_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_enterprise_date 
ON inspections(enterprise_id, inspection_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_violations_entity_severity 
ON violations(entity_id, severity) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_entity_expiry 
ON documents(entity_id, expiry_date) 
WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_links_enterprise 
ON enterprise_occupation_links(enterprise_id) 
WHERE deleted_at IS NULL;

-- 8.2 Arabic text search indexes (using trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_entities_name_ar_trgm 
ON organizational_entities USING gin (name_ar gin_trgm_ops) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_members_name_trgm 
ON members USING gin (full_name gin_trgm_ops) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_professions_name_trgm 
ON professions USING gin (name_ar gin_trgm_ops) 
WHERE deleted_at IS NULL;

-- 8.3 Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_entities_active 
ON organizational_entities(updated_at DESC) 
WHERE deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_audit_log_recent 
ON audit_log(created_at DESC) 
WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_service_requests_pending 
ON service_requests(processing_deadline) 
WHERE status = 'pending' AND deleted_at IS NULL;

-- =============================================================================
-- SECTION 9: MASTER DATA SEED - ENHANCED GOVERNORATES & DISTRICTS
-- =============================================================================

-- 9.1 Enhanced Governorates with all Yemen governorates
INSERT INTO governorates (code, name_ar, name_en, region, population, is_active)
VALUES 
    ('SA', 'صنعاء', 'Sana''a', 'Central', 2500000, true),
    ('AD', 'عدن', 'Aden', 'South', 1200000, true),
    ('TA', 'تعز', 'Taiz', 'Southwest', 1100000, true),
    ('IH', 'إب', 'Ibb', 'Central', 1100000, true),
    ('HA', 'حضرموت', 'Hadramaut', 'East', 800000, true),
    ('HO', 'الحديدة', 'Al Hudaydah', 'West', 900000, true),
    ('SJ', 'صعدة', 'Sa''dah', 'North', 750000, true),
    ('MR', 'مارب', 'Marib', 'Central', 500000, true),
    ('SH', 'شبوة', 'Shabwah', 'East', 450000, true),
    ('DH', 'الضالع', 'Dhamar', 'Central', 500000, true),
    ('BA', 'البيضاء', 'Al Bayda', 'Central', 400000, true),
    ('LA', 'لحج', 'Lahij', 'South', 350000, true),
    ('AA', 'أبين', 'Abyan', 'South', 300000, true),
    ('DA', 'ذمار', 'Dhamar', 'Central', 450000, true),
    ('MA', 'المهرة', 'Al Mahrah', 'East', 150000, true),
    ('AM', 'عمران', 'Amran', 'North', 400000, true),
    ('SU', 'صنعاء', 'Sana''a', 'Central', 500000, true),
    ('SO', 'الحديدة', 'Socotra', 'East', 100000, true),
    ('RJ', 'رمع', 'Raymah', 'Central', 300000, true),
    ('BW', 'البيوض', 'Al Jawf', 'North', 200000, true)
ON CONFLICT (code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    region = EXCLUDED.region,
    population = EXCLUDED.population;

-- 9.2 National Activities Master Data
INSERT INTO national_activities (activity_code, name_ar, name_en, category, isic_code, is_active)
VALUES
    ('ACT001', 'صناعة الأغذية والمشروبات', 'Food & Beverage Manufacturing', 'manufacturing', 'C10', true),
    ('ACT002', 'صناعة المنسوجات والملابس', 'Textile & Apparel Manufacturing', 'manufacturing', 'C13', true),
    ('ACT003', 'صناعة المواد الكيميائية', 'Chemical Manufacturing', 'manufacturing', 'C20', true),
    ('ACT004', 'صناعة المنتجات الدوائية', 'Pharmaceutical Manufacturing', 'manufacturing', 'C21', true),
    ('ACT005', 'صناعة المنتجات المعدنية', 'Metal Products Manufacturing', 'manufacturing', 'C25', true),
    ('ACT006', 'البناء والتشييد', 'Construction', 'construction', 'F41', true),
    ('ACT007', 'تجارة الجملة والتجزئة', 'Wholesale & Retail Trade', 'trade', 'G45', true),
    ('ACT008', 'النقل والتخزين', 'Transportation & Storage', 'services', 'H49', true),
    ('ACT009', 'الفنادق والمطاعم', 'Hotels & Restaurants', 'services', 'I55', true),
    ('ACT010', 'المعلومات والاتصالات', 'Information & Communication', 'services', 'J61', true),
    ('ACT011', 'الخدمات المالية والتأمين', 'Financial & Insurance Services', 'services', 'K64', true),
    ('ACT012', 'التعليم', 'Education', 'services', 'P85', true),
    ('ACT013', 'الصحة والعمل الاجتماعي', 'Health & Social Work', 'services', 'Q86', true),
    ('ACT014', 'الزراعة وال forestry', 'Agriculture & Forestry', 'agriculture', 'A01', true),
    ('ACT015', 'صيد الأسماك', 'Fishing & Aquaculture', 'agriculture', 'A03', true),
    ('ACT016', 'تعدين الفحم', 'Coal Mining', 'mining', 'B05', true),
    ('ACT017', 'تعدين النفط والغاز', 'Oil & Gas Extraction', 'mining', 'B06', true),
    ('ACT018', 'إمدادات الكهرباء والغاز', 'Electricity & Gas Supply', 'utilities', 'D35', true),
    ('ACT019', 'إمدادات المياه والصرف', 'Water Supply & Sewerage', 'utilities', 'E36', true),
    ('ACT020', 'إدارة النفايات', 'Waste Management', 'services', 'E38', true)
ON CONFLICT (activity_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;

-- 9.3 Contract Types Master Data
INSERT INTO work_contract_types (type_code, name_ar, name_en, duration_months, renewal_type, is_active)
VALUES
    ('CTR001', 'عقد دائم', 'Permanent Contract', NULL, 'automatic', true),
    ('CTR002', 'عقد محدد المدة', 'Fixed-Term Contract', 12, 'manual', true),
    ('CTR003', 'عقد موسمي', 'Seasonal Contract', 6, 'manual', true),
    ('CTR004', 'عقد تدريب', 'Training Contract', 12, 'manual', true),
    ('CTR005', 'عقد جزئي', 'Part-Time Contract', NULL, 'manual', true),
    ('CTR006', 'عقد عمل مؤقت', 'Temporary Work Contract', 3, 'manual', true),
    ('CTR007', 'عقد مشروع محدد', 'Project-Based Contract', 24, 'manual', true),
    ('CTR008', 'عقد بالإنابة', 'Contract by Substitution', 6, 'manual', true)
ON CONFLICT (type_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;

-- 9.4 Employment Types Master Data
INSERT INTO employment_types (type_code, name_ar, name_en, description_ar, is_active)
VALUES
    ('EMP001', 'employment', 'موظف بدوام كامل', 'Full-Time Employee', 'عامل يعمل طوال أيام الأسبوع', true),
    ('EMP002', 'part_time', 'موظف بدوام جزئي', 'Part-Time Employee', 'عامل يعمل أيام محددة', true),
    ('EMP003', 'contractor', 'مقاول مستقل', 'Independent Contractor', 'يعمل لحسابه الخاص', true),
    ('EMP004', 'temporary', 'موظف مؤقت', 'Temporary Worker', 'يعمل لفترة محددة', true),
    ('EMP005', 'trainee', 'متدرب', 'Trainee', 'يتدرب للحصول على خبرة', true),
    ('EMP006', 'seasonal', 'عامل موسمي', 'Seasonal Worker', 'يعمل في مواسم محددة', true),
    ('EMP007', 'probation', 'فترة تجربة', 'Probationary Worker', 'في فترة التجربة', true),
    ('EMP008', 'remote', 'عمل عن بعد', 'Remote Worker', 'يعمل من مكان غير المنشأة', true)
ON CONFLICT (type_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;

-- 9.5 Worker Categories Master Data
INSERT INTO worker_categories (category_code, name_ar, name_en, description_ar, minimum_age, is_active)
VALUES
    ('WRK001', 'yemeni', 'عامل يمني', 'Worker with Yemeni Nationality', 18, true),
    ('WRK002', 'expatriate', 'عامل أجنبي', 'Non-Yemeni Worker', 21, true),
    ('WRK003', 'domestic', 'عامل منزلي', 'Domestic Worker', 18, true),
    ('WRK004', 'agricultural', 'عامل زراعي', 'Agricultural Worker', 16, true),
    ('WRK005', 'construction', 'عامل بناء', 'Construction Worker', 18, true),
    ('WRK006', 'mining', 'عامل منجم', 'Mining Worker', 18, true),
    ('WRK007', 'shipping', 'عامل شحن وتفريغ', 'Dock Worker', 18, true),
    ('WRK008', 'healthcare', 'عامل صحي', 'Healthcare Worker', 21, true),
    ('WRK009', 'juvenile', 'عامل قاصر', 'Juvenile Worker (16-18)', 16, true)
ON CONFLICT (category_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;

-- 9.6 Training Certification Types
INSERT INTO training_certification_types (cert_code, name_ar, name_en, validity_years, issuing_authority, is_active)
VALUES
    ('CERT001', 'شهادة إتمام تدريب مهني', 'Vocational Training Completion Certificate', 3, 'المؤسسة العامة للتدريب المهني', true),
    ('CERT002', 'شهادة سلامة مهنية', 'Occupational Safety Certificate', 2, 'وزارة الشؤون الاجتماعية والعمل', true),
    ('CERT003', 'شهادة لياقة صحية', 'Medical Fitness Certificate', 1, 'وزارة الصحة العامة والسكان', true),
    ('CERT004', 'شهادة إسعافات أولية', 'First Aid Certificate', 2, 'الهلال الأحمر اليمني', true),
    ('CERT005', 'شهادة قيادة رافعات', 'Crane Operation Certificate', 2, 'وزارة النقل', true),
    ('CERT006', 'شهادة لحام معتمد', 'Certified Welding Certificate', 3, 'الهيئة اليمنية للمواصفات والمقاييس', true),
    ('CERT007', 'شهادة كهرباء低压', 'Low Voltage Electrical Certificate', 2, 'وزارة الكهرباء والطاقة', true),
    ('CERT008', 'شهادة أمن وسلامة', 'Security & Safety Certificate', 1, 'وزارة الداخلية', true),
    ('CERT009', 'شهادة حماية بيئية', 'Environmental Protection Certificate', 3, 'الهيئة العامة للبيئة', true),
    ('CERT010', 'شهادة إدارة مشاريع', 'Project Management Certificate', 5, 'مختلف الجهات', true)
ON CONFLICT (cert_code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en;

-- =============================================================================
-- SECTION 10: INSTITUTIONAL TEMPLATES
-- =============================================================================

INSERT INTO institutional_templates (template_code, template_name, template_type, description, content, is_active)
VALUES
    ('TPL001', 'نموذج تقرير التفتيش', 'report', 'نموذج موحد لتقرير التفتيش الدوري',
     '{"sections": ["معلومات المنشأة", "نتائج التفتيش", "الملاحظات", "التوصيات"], "signature_required": true}',
     true),
    ('TPL002', 'نموذج عقد العمل', 'contract', 'نموذج عقد العمل الفردي',
     '{"clauses": ["تعريف الطرفين", "طبيعة العمل", "الأجر", "ساعات العمل", "الإجازات", "الإنهاء"], "arabic_only": true}',
     true),
    ('TPL003', 'نموذج شكوى عمالية', 'complaint', 'نموذج تقديم شكوى عمالية',
     '{"fields": ["بيانات المشتكي", "بيانات صاحب العمل", "موضوع الشكوى", "الأدلة"], "required_fields": ["national_id", "complaint_type"]}',
     true),
    ('TPL004', 'نموذج طلب رخصة', 'license', 'نموذج طلب رخصة عمل أجنبي',
     '{"documents": ["جواز السفر", "تصريح العمل", "عقد العمل", "شهادة صحية"], "validity_period": "سنة"}',
     true),
    ('TPL005', 'نموذج تقييم المنشأة', 'evaluation', 'نموذج تقييم أداء المنشأة',
     '{"criteria": ["الالتزام بالقانون", "السلامة المهنية", "التدريب", "التوطين"], "max_score": 100}',
     true)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    description = EXCLUDED.description,
    content = EXCLUDED.content;

-- =============================================================================
-- SECTION 11: SLA POLICIES
-- =============================================================================

INSERT INTO sla_policies (policy_key, name_ar, name_en, target_hours, escalation_hours, priority, is_active)
VALUES
    ('SLA001', 'استجابة فورية', 'Immediate Response', 4, 8, 'critical', true),
    ('SLA002', 'استجابة سريعة', 'Fast Response', 24, 48, 'high', true),
    ('SLA003', 'استجابة قياسية', 'Standard Response', 72, 120, 'medium', true),
    ('SLA004', 'استجابة غير عاجلة', 'Non-Urgent Response', 168, 240, 'low', true),
    ('SLA005', 'تفتيش طارئ', 'Emergency Inspection', 24, 48, 'critical', true),
    ('SLA006', 'تفتيش روتيني', 'Routine Inspection', 720, 1008, 'low', true)
ON CONFLICT (policy_key) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    target_hours = EXCLUDED.target_hours,
    escalation_hours = EXCLUDED.escalation_hours;

-- =============================================================================
-- SECTION 12: REFRESH MATERIALIZED VIEWS
-- =============================================================================

REFRESH MATERIALIZED VIEW mv_national_dashboard;
REFRESH MATERIALIZED VIEW mv_monthly_trends;
REFRESH MATERIALIZED VIEW mv_sla_performance;

-- =============================================================================
-- SECTION 13: FINAL VERIFICATION
-- =============================================================================

-- Create verification function
CREATE OR REPLACE FUNCTION fn_verify_phase7_installation()
RETURNS TABLE(
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check functions
    RETURN QUERY SELECT 'Core Functions', CASE WHEN count(*) > 15 THEN 'OK' ELSE 'MISSING' END, count(*)::TEXT 
    FROM pg_proc WHERE proname LIKE 'fn_%';
    
    RETURN QUERY SELECT 'Triggers', CASE WHEN count(*) > 5 THEN 'OK' ELSE 'MISSING' END, count(*)::TEXT 
    FROM pg_trigger WHERE tgname LIKE 'trg_%';
    
    RETURN QUERY SELECT 'Materialized Views', CASE WHEN count(*) >= 3 THEN 'OK' ELSE 'MISSING' END, count(*)::TEXT 
    FROM pg_matviews WHERE matviewname LIKE 'mv_%';
    
    RETURN QUERY SELECT 'Indexes', CASE WHEN count(*) > 10 THEN 'OK' ELSE 'MISSING' END, count(*)::TEXT 
    FROM pg_indexes WHERE tablename IN ('organizational_entities', 'members', 'inspections');
    
    RETURN QUERY SELECT 'Views', CASE WHEN count(*) >= 7 THEN 'OK' ELSE 'MISSING' END, count(*)::TEXT 
    FROM pg_views WHERE viewname LIKE 'v_%';
    
    RETURN QUERY SELECT 'Master Data', CASE WHEN count(*) > 50 THEN 'OK' ELSE 'NEED_SEED' END, count(*)::TEXT 
    FROM governorates;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
COMMIT;

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
-- This migration adds:
-- 1. Core database functions (search, validation, computation)
-- 2. Audit and tracking functions
-- 3. Advanced validation functions (contracts, business rules, SLA)
-- 4. Aggregation and reporting functions
-- 5. Comprehensive triggers (audit, timestamp, validation)
-- 6. Institutional reporting views (8 views)
-- 7. Materialized views for dashboard performance (3 views)
-- 8. Enhanced indexes for Arabic search and performance
-- 9. Master data seed (governorates, activities, contracts, etc.)
-- 10. Institutional templates and SLA policies
-- =============================================================================
