-- ============================================
-- بيانات المنظومة الوطنية الابتدائية
-- UnionSphere Enterprise Platform - Yemen Ministry of Social Affairs
-- ============================================

-- إنشاء مستخدم تجريبي للوزارة
INSERT INTO profiles (id, email, full_name, role, is_active) VALUES
('demo-ministry-001', 'ministry@yemen.gov.ye', 'محمد أحمد الوزير', 'ministry', true)
ON CONFLICT (id) DO NOTHING;

-- إنشاء الكيانات التجريبية
INSERT INTO organizational_entities (
  entity_id, unified_code, registration_number, entity_type, classification, sector,
  name_ar, governorate, city, phone, email, president_name, president_phone,
  member_count, status, compliance_status
) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'YE-2024-001', 'REG-2024-001', 'union', 'professional', 'engineering',
 'نقابة المهندسين اليمنية', 'صنعاء', 'صنعاء', '+967-1-234567', 'info@engineers.ye', 'م. عبدالله أحمد', '+967-777-123456',
 15420, 'active', 'compliant'
),
('b2c3d4e5-f6g7-8901-bcde-fg2345678901', 'YE-2024-002', 'REG-2024-002', 'union', 'labor', 'construction',
 'نقابة عمال البناء', 'عدن', 'عدن', '+967-2-345678', 'info@construction.ye', 'أحمد محمد سالم', '+967-733-234567',
 8750, 'active', 'compliant'
),
('c3d4e5f6-g7h8-9012-cdef-gh3456789012', 'YE-2024-003', 'REG-2024-003', 'union', 'professional', 'healthcare',
 'نقابة الأطباء اليمنية', 'صنعاء', 'صنعاء', '+967-1-456789', 'info@doctors.ye', 'د. فاطمة علي', '+967-711-345678',
 12300, 'active', 'compliant'
),
('d4e5f6g7-h8i9-0123-defg-hi4567890123', 'YE-2024-004', 'REG-2024-004', 'union', 'professional', 'education',
 'نقابة المعلمين', 'تعز', 'تعز', '+967-4-567890', 'info@teachers.ye', 'أ. خالد حسن', '+967-770-456789',
 25680, 'active', 'compliant'
),
('e5f6g7h8-i9j0-1234-efgh-ij5678901234', 'YE-2024-005', 'REG-2024-005', 'union', 'professional', 'media',
 'نقابة الصحفيين', 'صنعاء', 'صنعاء', '+967-1-678901', 'info@journalists.ye', 'محمد عبدالله', '+967-777-567890',
 3250, 'active', 'compliant'
)
ON CONFLICT (entity_id) DO NOTHING;

-- إنشاء الأعضاء التجريبيين
INSERT INTO members (
  id, entity_id, national_id, full_name, gender, phone, email,
  union_id, profession, status
) VALUES
('m1-national-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '01011234567', 'أحمد محمد علي', 'male', '+967-777-111222', 'ahmed.ali@email.ye',
 'YE-2024-001', 'مهندس مدني', 'active'
),
('m2-national-002', 'c3d4e5f6-g7h8-9012-cdef-gh3456789012', '01021234568', 'فاطمة أحمد حسن', 'female', '+967-733-222333', 'fatima.hassan@email.ye',
 'YE-2024-003', 'طبيبة', 'active'
)
ON CONFLICT (id) DO NOTHING;

-- إنشاء الأنشطة التجريبية
INSERT INTO activities (
  entity_id, activity_number, activity_name, activity_type, start_date, status
) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ACT-2024-001', 'ورشة عمل هندسية', 'workshop', '2024-02-15', 'completed'),
('c3d4e5f6-g7h8-9012-cdef-gh3456789012', 'ACT-2024-002', 'مؤتمر طبي', 'conference', '2024-03-01', 'ongoing')
ON CONFLICT DO NOTHING;

-- إنشاء الخدمات الاحترافية
INSERT INTO services (
  service_code, service_name, description, category, is_active, processing_days
) VALUES
('SRV-001', 'تجديد الترخيص', 'طلب تجديد ترخيص الكيان النقابي', 'licenses', true, 7),
('SRV-002', 'تقديم طلب عضوية', 'طلب اضافة عضو جديد', 'membership', true, 3),
('SRV-003', 'الحصول على شهادة', 'طلب إصدار شهادة عضوية', 'certificates', true, 5),
('SRV-004', 'طلب استخراج بيانات', 'استخراج بيانات عضو أو كيان', 'data', true, 2)
ON CONFLICT (service_code) DO NOTHING;

-- إنشاء المخالفات التجريبية
INSERT INTO violations (
  entity_id, violation_number, violation_type, severity, description, status
) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'VIO-2024-001', 'عدم تقديم التقارير الشهرية', 'minor', 'لم يتم تقديم التقرير المالي للمنظمة', 'open')
ON CONFLICT (violation_number) DO NOTHING;

-- إنشاء التقارير التجريبية
INSERT INTO reports (
  report_name, report_type, description, is_public
) VALUES
('تقرير الأعضاء الشهري', 'members', 'تقرير مفصل بأعداد الأعضاء', true),
('تقرير المخالفات', 'violations', 'تقرير المخالفات والعقوبات', false),
('تقرير الانتخابات', 'elections', 'تقرير انتخابات مجلس الإدارة', true)
ON CONFLICT DO NOTHING;

-- تم تنفيذ البيانات الابتدائية بنجاح
-- تاريخ التنفيذ: 2024-01-01
-- UnionSphere Platform v1.0