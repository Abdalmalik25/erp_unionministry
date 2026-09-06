-- Migration 20260907_02_mitre_attack_detections.sql — MITRE ATT&CK Detection Tables
-- Supports real-time TTP mapping, attack chains, and MITRE Navigator integration

-- 1. MITRE ATT&CK Detections Table
CREATE TABLE IF NOT EXISTS mitre_attack_detections (
    id BIGSERIAL PRIMARY KEY,
    technique_id TEXT NOT NULL,           -- e.g., 'T1190', 'T1110'
    tactic TEXT NOT NULL,                 -- e.g., 'TA0001', 'TA0043'
    name TEXT NOT NULL,                   -- English technique name
    name_ar TEXT NOT NULL,                -- Arabic technique name
    confidence NUMERIC(3,2) NOT NULL,     -- 0.00 to 1.00
    evidence JSONB NOT NULL DEFAULT '[]', -- Array of evidence strings
    indicators JSONB NOT NULL DEFAULT '[]', -- Array of indicator types
    source_ip INET,                       -- Source IP address
    user_id UUID REFERENCES sector_users(id),
    session_id TEXT,                      -- Session ID if available
    details JSONB DEFAULT '{}',           -- Additional context
    acknowledged BOOLEAN DEFAULT FALSE,   -- Analyst acknowledgment
    acknowledged_by UUID REFERENCES sector_users(id),
    acknowledged_at TIMESTAMPTZ,
    false_positive BOOLEAN DEFAULT FALSE, -- Marked as false positive
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_mitre_technique ON mitre_attack_detections(technique_id);
CREATE INDEX IF NOT EXISTS idx_mitre_tactic ON mitre_attack_detections(tactic);
CREATE INDEX IF NOT EXISTS idx_mitre_ip ON mitre_attack_detections(source_ip);
CREATE INDEX IF NOT EXISTS idx_mitre_user ON mitre_attack_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_mitre_confidence ON mitre_attack_detections(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_mitre_created ON mitre_attack_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mitre_ack ON mitre_attack_detections(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_mitre_fp ON mitre_attack_detections(false_positive) WHERE false_positive = FALSE;

-- 2. Attack Chains Table (Aggregated per IP)
CREATE TABLE IF NOT EXISTS mitre_attack_chains (
    id BIGSERIAL PRIMARY KEY,
    source_ip INET NOT NULL,
    techniques TEXT[] NOT NULL DEFAULT '{}',     -- Array of technique IDs
    tactics TEXT[] NOT NULL DEFAULT '{}',        -- Array of tactic IDs
    score NUMERIC(10,2) NOT NULL DEFAULT 0,      -- Aggregated risk score
    detection_count INTEGER NOT NULL DEFAULT 0,  -- Total detections in chain
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity TEXT NOT NULL DEFAULT 'low',        -- 'low', 'medium', 'high', 'critical'
    status TEXT NOT NULL DEFAULT 'active',       -- 'active', 'investigating', 'resolved', 'false_positive'
    assigned_to UUID REFERENCES sector_users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mitre_chain_ip ON mitre_attack_chains(source_ip);
CREATE INDEX IF NOT EXISTS idx_mitre_chain_severity ON mitre_attack_chains(severity);
CREATE INDEX IF NOT EXISTS idx_mitre_chain_status ON mitre_attack_chains(status);
CREATE INDEX IF NOT EXISTS idx_mitre_chain_score ON mitre_attack_chains(score DESC);
CREATE INDEX IF NOT EXISTS idx_mitre_chain_active ON mitre_attack_chains(last_seen) WHERE status = 'active';

-- 3. MITRE Technique Catalog (Reference data)
CREATE TABLE IF NOT EXISTS mitre_technique_catalog (
    technique_id TEXT PRIMARY KEY,              -- e.g., 'T1190', 'T1110.004'
    tactic_id TEXT NOT NULL,                    -- e.g., 'TA0001'
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    detection_notes TEXT,
    mitigation TEXT[],
    data_sources TEXT[],
    platform TEXT[] DEFAULT '{"enterprise"}',   -- enterprise, mobile, ics
    version TEXT DEFAULT '15.1',
    is_subtechnique BOOLEAN DEFAULT FALSE,
    parent_technique TEXT,                      -- For sub-techniques
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mitre_catalog_tactic ON mitre_technique_catalog(tactic_id);
CREATE INDEX IF NOT EXISTS idx_mitre_catalog_parent ON mitre_technique_catalog(parent_technique);

-- 4. Insert core technique catalog (subset - key techniques for our environment)
INSERT INTO mitre_technique_catalog (technique_id, tactic_id, name, name_ar, description, detection_notes, mitigation, data_sources, is_subtechnique, parent_technique) VALUES
-- Reconnaissance
('T1590', 'TA0043', 'Active Scanning', 'المسح النشط', 'Adversaries may execute active scans to gather information', 'High volume of unique paths, rapid endpoint enumeration', ARRAY['Rate limiting', 'WAF', 'IP reputation'], ARRAY['Web logs', 'WAF logs'], FALSE, NULL),
('T1595', 'TA0043', 'Active Directory Reconnaissance', 'استطلاع دليل النشاط', 'Adversaries may enumerate AD', 'User/entity enumeration queries', ARRAY['Least privilege', 'Monitoring'], ARRAY['Auth logs', 'DB audit'], FALSE, NULL),

-- Initial Access
('T1190', 'TA0001', 'Exploit Public-Facing Application', 'استغلال التطبيقات العامة', 'Exploit vulns in public apps', 'SQLi, RCE, deserialization signatures', ARRAY['WAF', 'Input validation', 'Patch management'], ARRAY['WAF logs', 'App logs'], FALSE, NULL),
('T1110', 'TA0001', 'Brute Force', 'القوة الغاشمة', 'Guess credentials via trial', 'Multiple failed logins, rapid attempts', ARRAY['Account lockout', 'MFA', 'Rate limiting', 'CAPTCHA'], ARRAY['Auth logs', 'Security events'], FALSE, NULL),
('T1110.004', 'TA0001', 'Credential Stuffing', 'حشو البيانات', 'Use leaked credentials', 'Many emails from same IP', ARRAY['MFA', 'IP reputation', 'Credential monitoring'], ARRAY['Auth logs', 'Threat intel'], TRUE, 'T1110'),
('T1078', 'TA0001', 'Valid Accounts', 'حسابات صالحة', 'Use valid credentials', 'New device/geo, impossible travel', ARRAY['MFA', 'Device fingerprinting', 'Geo-analysis'], ARRAY['Auth logs', 'Session logs'], FALSE, NULL),
('T1566', 'TA0001', 'Phishing', 'التصيد الاحتيالي', 'Harvest credentials via deception', 'Credential reuse patterns', ARRAY['Email security', 'User training', 'MFA'], ARRAY['Email logs', 'User reports'], FALSE, NULL),

-- Execution
('T1059', 'TA0002', 'Command and Scripting Interpreter', 'مفسر الأوامر والنصوص', 'Execute commands/scripts', 'RCE signatures, shell commands', ARRAY['WAF', 'App sandboxing', 'Input validation'], ARRAY['WAF logs', 'Process logs'], FALSE, NULL),
('T1203', 'TA0002', 'Exploitation for Client Execution', 'استغلال لتنفيذ العميل', 'Exploit client-side', 'XSS, deserialization', ARRAY['CSP', 'Input validation', 'Secure headers'], ARRAY['Browser logs', 'WAF logs'], FALSE, NULL),

-- Persistence
('T1556', 'TA0003', 'Modify Authentication Process', 'تعديل عملية المصادقة', 'Modify auth mechanisms', 'MFA disable, password reset', ARRAY['MFA enforcement', 'Audit auth changes'], ARRAY['Auth logs', 'Config audit'], FALSE, NULL),
('T1505', 'TA0003', 'Server Software Component', 'مكون برمجي للخادم', 'Install malicious components', 'Web shell uploads', ARRAY['File integrity', 'Upload validation', 'WAF'], ARRAY['File logs', 'Upload logs'], FALSE, NULL),

-- Privilege Escalation
('T1068', 'TA0004', 'Exploitation for Privilege Escalation', 'استغلال لتصعيد الصلاحيات', 'Exploit for higher perms', 'Role escalation to admin', ARRAY['Least privilege', 'Role change approval'], ARRAY['Auth logs', 'RBAC audit'], FALSE, NULL),
('T1548', 'TA0004', 'Abuse Elevation Control Mechanism', 'إساءة استخدام آلية التحكم بالتصعيد', 'Bypass elevation controls', 'Permission modifications', ARRAY['RBAC audit', 'Change approval'], ARRAY['Config audit', 'Auth logs'], FALSE, NULL),

-- Defense Evasion
('T1070', 'TA0005', 'Indicator Removal', 'إزالة المؤشرات', 'Remove forensic artifacts', 'Audit log deletion attempts', ARRAY['Immutable audit log', 'WORM storage'], ARRAY['Audit logs', 'DB triggers'], FALSE, NULL),
('T1562', 'TA0005', 'Impair Defenses', 'إضعاف الدفاعات', 'Disable security tools', 'Config changes to disable WAF/rate-limit', ARRAY['Config integrity', 'Change management'], ARRAY['Config audit', 'System logs'], FALSE, NULL),
('T1027', 'TA0005', 'Obfuscated/Stored Files', 'ملفات مشفرة/مخزنة', 'Hide malicious payloads', 'Polyglot files, double extensions', ARRAY['File validation', 'Content scanning'], ARRAY['Upload logs', 'AV scans'], FALSE, NULL),

-- Credential Access
('T1003', 'TA0006', 'Credential Dumping', 'تفريغ البيانات', 'Extract credentials', 'DB queries for password hashes', ARRAY['Encryption at rest', 'Column encryption', 'Access logging'], ARRAY['DB audit', 'Access logs'], FALSE, NULL),
('T1555', 'TA0006', 'Credentials from Password Stores', 'بيانات من مخازن كلمات المرور', 'Extract from stores', 'Login attempts table access', ARRAY['Encryption', 'Access control', 'Audit'], ARRAY['DB audit'], FALSE, NULL),

-- Discovery
('T1087', 'TA0007', 'Account Discovery', 'اكتشاف الحسابات', 'Enumerate accounts', 'User list API access', ARRAY['Least privilege', 'API rate limiting'], ARRAY['API logs', 'Auth logs'], FALSE, NULL),
('T1083', 'TA0007', 'File and Directory Discovery', 'اكتشاف الملفات والمجلدات', 'Enumerate files/dirs', 'LFI, path traversal', ARRAY['Input validation', 'WAF', 'Least privilege'], ARRAY['WAF logs', 'App logs'], FALSE, NULL),
('T1018', 'TA0007', 'Remote System Discovery', 'اكتشاف الأنظمة البعيدة', 'Network reconnaissance', 'Health/version endpoint probing', ARRAY['Network segmentation', 'Rate limiting'], ARRAY['Network logs', 'API logs'], FALSE, NULL),
('T1069', 'TA0007', 'Permission Groups Discovery', 'اكتشاف مجموعات الصلاحيات', 'Enumerate permissions', 'RBAC/permissions API access', ARRAY['Least privilege', 'API rate limiting'], ARRAY['API logs', 'Auth logs'], FALSE, NULL),

-- Lateral Movement
('T1021', 'TA0008', 'Remote Services', 'الخدمات البعيدة', 'Use valid creds for lateral', 'Session hijacking, token reuse', ARRAY['Session binding', 'Short expiry', 'Device fingerprint'], ARRAY['Session logs', 'Auth logs'], FALSE, NULL),
('T1550', 'TA0008', 'Use Alternate Authentication Material', 'استخدام مادة مصادقة بديلة', 'Use tokens/keys instead of pass', 'JWT replay, session theft', ARRAY['Token binding', 'Short TTL', 'Rotation'], ARRAY['Auth logs', 'Session logs'], FALSE, NULL),

-- Collection
('T1005', 'TA0009', 'Data from Local System', 'بيانات من النظام المحلي', 'Collect data from system', 'Mass export/download', ARRAY['DLP', 'Export limits', 'Audit'], ARRAY['Export logs', 'API logs'], FALSE, NULL),
('T1530', 'TA0009', 'Data from Cloud Storage', 'بيانات من التخزين السحابي', 'Access cloud storage', 'Backup downloads', ARRAY['Backup encryption', 'Access control'], ARRAY['Backup logs', 'Storage logs'], FALSE, NULL),

-- Command and Control
('T1071', 'TA0011', 'Application Layer Protocol', 'بروتوكول طبقة التطبيق', 'C2 over HTTP/WS', 'Long polling, heartbeat abuse', ARRAY['Traffic analysis', 'Anomaly detection'], ARRAY['Network logs', 'Proxy logs'], FALSE, NULL),
('T1105', 'TA0011', 'Ingress Tool Transfer', 'نقل أدوات الدخول', 'Transfer tools via upload', 'Executable/script uploads', ARRAY['Upload validation', 'Content scanning'], ARRAY['Upload logs', 'File analysis'], FALSE, NULL),

-- Exfiltration
('T1041', 'TA0010', 'Exfiltration Over C2 Channel', 'التهريب عبر قناة C2', 'Exfil via C2', 'Large uploads, data hoarding', ARRAY['DLP', 'Egress monitoring'], ARRAY['Network logs', 'Proxy logs'], FALSE, NULL),
('T1020', 'TA0010', 'Automated Exfiltration', 'التهريب الآلي', 'Scheduled exfil', 'Automated exports', ARRAY['Export monitoring', 'Schedule audit'], ARRAY['Export logs', 'Scheduler logs'], FALSE, NULL),
('T1567', 'TA0010', 'Exfiltration Over Web Service', 'التهريب عبر خدمة الويب', 'Exfil via webhooks/API', 'Webhook registrations', ARRAY['Webhook validation', 'Egress control'], ARRAY['Integration logs', 'API logs'], FALSE, NULL),

-- Impact
('T1485', 'TA0040', 'Data Destruction', 'تدمير البيانات', 'Delete/destroy data', 'Mass deletions', ARRAY['Soft delete', 'Backup', 'Deletion approval'], ARRAY['Audit logs', 'DB triggers'], FALSE, NULL),
('T1486', 'TA0040', 'Data Encrypted for Impact', 'تشفير البيانات للتأثير', 'Ransomware encryption', 'Mass encryption flags', ARRAY['Backup', 'Encryption monitoring'], ARRAY['File logs', 'Process logs'], FALSE, NULL),
('T1499', 'TA0040', 'Endpoint Denial of Service', 'حجب الخدمة عن النقاط النهائية', 'DoS against endpoints', 'Rate limit exhaustion', ARRAY['Rate limiting', 'Auto-scaling', 'WAF'], ARRAY['Rate limit logs', 'WAF logs'], FALSE, NULL)

ON CONFLICT (technique_id) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    detection_notes = EXCLUDED.detection_notes,
    mitigation = EXCLUDED.mitigation,
    data_sources = EXCLUDED.data_sources,
    updated_at = NOW();

-- 5. Tactic Catalog
CREATE TABLE IF NOT EXISTS mitre_tactic_catalog (
    tactic_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    short_name TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO mitre_tactic_catalog (tactic_id, name, name_ar, short_name, description, description_ar, order_index) VALUES
('TA0043', 'Reconnaissance', 'الاستطلاع', 'RECON', 'Gathering information', 'جمع المعلومات', 1),
('TA0042', 'Resource Development', 'تطوير الموارد', 'RESDEV', 'Establishing resources', 'إنشاء الموارد', 2),
('TA0001', 'Initial Access', 'الوصول الأولي', 'INITIAL', 'Getting into the network', 'الدخول للشبكة', 3),
('TA0002', 'Execution', 'التنفيذ', 'EXEC', 'Running malicious code', 'تشغيل الكود الضار', 4),
('TA0003', 'Persistence', 'الثبات', 'PERSIST', 'Maintaining access', 'الحفاظ على الوصول', 5),
('TA0004', 'Privilege Escalation', 'تصعيد الصلاحيات', 'PRIVESC', 'Gaining higher permissions', 'الحصول على صلاحيات أعلى', 6),
('TA0005', 'Defense Evasion', 'التهرب من الدفاع', 'EVASION', 'Avoiding detection', 'تجنب الكشف', 7),
('TA0006', 'Credential Access', 'الوصول للبيانات', 'CREDACCESS', 'Stealing credentials', 'سرقة البيانات', 8),
('TA0007', 'Discovery', 'الاكتشاف', 'DISCOVERY', 'Exploring environment', 'استكشاف البيئة', 9),
('TA0008', 'Lateral Movement', 'الحركة الجانبية', 'LATERAL', 'Moving through network', 'التحرك في الشبكة', 10),
('TA0009', 'Collection', 'التجميع', 'COLLECTION', 'Gathering data', 'جمع البيانات', 11),
('TA0011', 'Command and Control', 'القيادة والتحكم', 'C2', 'Communicating with C2', 'التواصل مع C2', 12),
('TA0010', 'Exfiltration', 'التهريب', 'EXFIL', 'Stealing data', 'تهريب البيانات', 13),
('TA0040', 'Impact', 'التأثير', 'IMPACT', 'Manipulating/destroying data', 'التلاعب/تدمير البيانات', 14)

ON CONFLICT (tactic_id) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    updated_at = NOW();

-- 6. Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_mitre_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS update_mitre_detections_updated ON mitre_attack_detections;
CREATE TRIGGER update_mitre_detections_updated
    BEFORE UPDATE ON mitre_attack_detections
    FOR EACH ROW EXECUTE FUNCTION update_mitre_updated_at();

DROP TRIGGER IF EXISTS update_mitre_chains_updated ON mitre_attack_chains;
CREATE TRIGGER update_mitre_chains_updated
    BEFORE UPDATE ON mitre_attack_chains
    FOR EACH ROW EXECUTE FUNCTION update_mitre_updated_at();

DROP TRIGGER IF EXISTS update_mitre_catalog_updated ON mitre_technique_catalog;
CREATE TRIGGER update_mitre_catalog_updated
    BEFORE UPDATE ON mitre_technique_catalog
    FOR EACH ROW EXECUTE FUNCTION update_mitre_updated_at();

-- 7. Updated timestamp trigger (only for tables with updated_at)
CREATE OR REPLACE FUNCTION update_mitre_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS update_mitre_detections_updated ON mitre_attack_detections;
CREATE TRIGGER update_mitre_detections_updated
    BEFORE UPDATE ON mitre_attack_detections
    FOR EACH ROW EXECUTE FUNCTION update_mitre_updated_at();

DROP TRIGGER IF EXISTS update_mitre_chains_updated ON mitre_attack_chains;
CREATE TRIGGER update_mitre_chains_updated
    BEFORE UPDATE ON mitre_attack_chains
    FOR EACH ROW EXECUTE FUNCTION update_mitre_updated_at();

DROP TRIGGER IF EXISTS update_mitre_catalog_updated ON mitre_technique_catalog;
CREATE TRIGGER update_mitre_catalog_updated
    BEFORE UPDATE ON mitre_technique_catalog
    FOR EACH ROW EXECUTE FUNCTION update_mitre_updated_at();

-- 8. View for MITRE Navigator Layer Generation
CREATE OR REPLACE VIEW mitre_navigator_layer AS
SELECT 
    mad.technique_id as "techniqueID",
    mtc.tactic_id as tactic,
    mad.confidence * 100 as score,
    CASE 
        WHEN mad.confidence >= 0.85 THEN '#b71c1c'
        WHEN mad.confidence >= 0.7 THEN '#f44336'
        WHEN mad.confidence >= 0.5 THEN '#ff9800'
        WHEN mad.confidence >= 0.3 THEN '#ffeb3b'
        ELSE '#ffffff'
    END as color,
    jsonb_build_object(
        'Detections', COUNT(*),
        'Max Confidence', MAX(mad.confidence),
        'Unique IPs', COUNT(DISTINCT mad.source_ip)
    ) as metadata,
    true as enabled
FROM mitre_attack_detections mad
JOIN mitre_technique_catalog mtc ON mad.technique_id = mtc.technique_id
WHERE mad.created_at > NOW() - INTERVAL '7 days'
  AND mad.false_positive = FALSE
GROUP BY mad.technique_id, mtc.tactic_id, mad.confidence;

-- 8. Grants
GRANT SELECT, INSERT, UPDATE ON mitre_attack_detections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mitre_attack_chains TO authenticated;
GRANT SELECT ON mitre_technique_catalog TO authenticated;
GRANT SELECT ON mitre_tactic_catalog TO authenticated;
GRANT SELECT ON mitre_navigator_layer TO authenticated;

-- Migration completed successfully