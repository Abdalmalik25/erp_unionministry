# معايير الأدلة الوطنية — دليل شامل

## نظرة عامة

يحدد هذا المستند معايير وإرشادات تطبيق الأدلة الوطنية في نظام وزارة العمل اليمنية، بما يتوافق مع المعايير الدولية والقوانين اليمنية.

---

## الفهرس

1. [المعايير الدولية](#1-المعايير-الدولية)
2. [القوانين اليمنية المطبقة](#2-القوانين-اليمنية-المطبقة)
3. [هيكل الأدلة](#3-هيكل-الأدلة)
4. [جداول الأدلة الوطنية](#4-جداول-الأدلة-الوطنية)
5. [قواعد التسمية](#5-قواعد-التسمية)
6. [إدارة الإصدارات](#6-إدارة-الإصدارات)
7. [سجل التغييرات](#7-سجل-التغييرات)
8. [ضوابط جودة البيانات](#8-ضوابط-جودة-البيانات)
9. [واجهات برمجة التطبيقات (APIs)](#9-واجهات-برمجة-التطبيقات)

---

## 1. المعايير الدولية

### 1.1 ISCO-08 — التصنيف الدولي الموحد للمهن

| المستوى | الوصف | مثال |
|---------|-------|------|
| مجموعة رئيسية (1-digit) | 10 مجموعات | المديرون، المهنيون، الفنيون |
| مجموعة فرعية (2-digit) | 43 مجموعة فرعية | المهنيون في العلوم والتقنية |
| مجموعة صغيرة (3-digit) | 130 مجموعة صغيرة | المهندسون المدنيون |
| مجموعة وحدة (4-digit) | 436 مجموعة وحدة | مهندسو الطرق والجسور |

**الروابط:**
- [`national_occupations`](supabase/migrations/20260825_02_canonical_data_fabric.sql:150) ← `isco_group`
- [`national_directories`](scripts/enhanced_national_directories.sql:46) ← `occupation` type

### 1.2 ISIC Rev.4 — التصنيف الصناعي الدولي الموحد

| القسم | الوصف |
|-------|-------|
| A | الزراعة والثروة الحيوانية وصيد الأسماك |
| B | التعدين واستغلال المحاجر |
| C | الصناعات التحويلية |
| D | إمداد الكهرباء والغاز والبخار |
| E | إمداد المياه والصرف |
| F | البناء والتشييد |
| G | تجارة الجملة والتجزئة |
| H | النقل والتخزين |
| I | خدمات الإقامة والطعام |
| J | المعلومات والاتصالات |
| K | الأنشطة المالية والتأمين |
| L | الأنشطة العقارية |
| M | الأنشطة المهنية والعلمية والتقنية |
| N | الأنشطة الإدارية والدعم |
| O | الإدارة العامة والدفاع |
| P | التعليم |
| Q | الصحة والعمل الاجتماعي |
| R | الفنون والترفيه والتسلية |
| S | أنشطة الخدمات الأخرى |
| T | أنشطة المنازل كأرباب عمل |
| U | أنشطة المنظمات والهيئات |

**الروابط:**
- [`national_activities`](supabase/migrations/20260825_02_canonical_data_fabric.sql:168) ← `isic_section`
- [`economic_sectors`](supabase/migrations/20260830_01_national_directories_complete.sql) ← ISIC alignment

### 1.3 معايير أخرى مطبقة

| المعيار | الوصف | التطبيق |
|---------|-------|--------|
| ISO 80000 | الأوزان والمقاييس | الوحدات المالية والفيزيائية |
| UN/LOCODE | الأكواد الجغرافية | [`national_governorates`](supabase/migrations/20260830_01_national_directories_complete.sql) |
| NACE Rev.2 | تصنيف الأنشطة الاقتصادية الأوروبية | [`economic_sectors`](supabase/migrations/20260830_01_national_directories_complete.sql) |

---

## 2. القوانين اليمنية المطبقة

### 2.1 قانون العمل اليمني رقم (15) لسنة 1995

| المادة | الموضوع | التطبيق في النظام |
|--------|---------|------------------|
| المادة 26 | العقد غير محدد المدة | [`work_contract_types`](supabase/migrations/20260830_01_national_directories_complete.sql) |
| المادة 27 | العقد محدد المدة | `CNT-DEF-001` |
| المادة 28 | العقد الموسمي | `CNT-SES-001` |
| المادة 30 | العمل الجزئي | `CNT-HRS-001` |
| المادة 37 | عقد التدريب | `CNT-TRN-001` |
| المادة 45-49 | تصاريح العمل | [`work_permit_categories`](supabase/migrations/20260830_01_national_directories_complete.sql) |
| المادة 148-152 | المخالفات والجزاءات | [`violation_classifications`](supabase/migrations/20260830_01_national_directories_complete.sql) |

### 2.2 قانون النقابات العمالية رقم (35) لسنة 2002

| المادة | الموضوع | التطبيق |
|--------|---------|--------|
| المادة 1 | تعريف النقابة | [`labor_roles`](scripts/enhanced_national_directories.sql:38) |
| المادة 35 | شروط التأسيس | [`service_catalog`](supabase/migrations/20260825_06_service_catalog_nuclear.sql:88) |

### 2.3 قانون التأمينات الاجتماعية رقم (26) لسنة 1991

| المادة | الموضوع | التطبيق |
|--------|---------|--------|
| - | التغطية التأمينية | [`employment_types.benefits_eligible`](supabase/migrations/20260830_01_national_directories_complete.sql) |
| - | الاستحقاقات | [`worker_categories`](supabase/migrations/20260830_01_national_directories_complete.sql) |

---

## 3. هيكل الأدلة

### 3.1 التسلسل الهرمي

```
الأدلة الوطنية
├── أدلة جغرافية
│   ├── المحافظات (21 محافظة)
│   ├── المديريات
│   └── الرموز البريدية
├── أدلة التصنيف
│   ├── المهن (ISCO-08)
│   ├── الأنشطة الاقتصادية (ISIC-4)
│   ├── المنشآت
│   ├── الأشكال القانونية
│   └── أنواع الملكية
├── أدلة العمل
│   ├── أنواع العقود
│   ├── فئات التوظيف
│   ├── فئات العمال
│   ├── تصاريح العمل
│   └── الشهادات التدريبية
├── أدلة تنظيمية
│   ├── أقسام الوزارة
│   ├── أنواع التفتيش
│   ├── مراحل النزاعات
│   └── تصنيفات المخالفات
├── أدلة اقتصادية
│   ├── القطاعات الاقتصادية
│   ├── فئات الترخيص
│   └── المناطق الصناعية
└── أدلة قانونية
    ├── المرجعيات القانونية
    └── الأطر التنظيمية
```

### 3.2 نموذج ER مبسط

```
┌─────────────────────────────────────────────────────────────────────┐
│                    national_governorates                            │
│  (21 Yemeni governorates with UN/LOCODE alignment)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 1:N
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       national_districts                            │
│  (District hierarchy within governorates)                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ 1:N
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     national_postal_codes                            │
│  (Postal code system for all regions)                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      economic_sectors                               │
│  (18 sectors aligned with ISIC Rev.4)                              │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           │ 1:N                          1:N
           ▼                              ▼
┌──────────────────────┐    ┌────────────────────────────────────────┐
│ national_activities  │    │         legal_entities                  │
│ (ISIC codes)         │    │         (Establishment Registry)        │
└──────────────────────┘    └────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐
│ national_occupations │
│ (ISCO-08 codes)      │
└──────────────────────┘
```

---

## 4. جداول الأدلة الوطنية

### 4.1 جداول الإدخال الرئيسية

| الجدول | الغرض | السجلات المتوقعة |
|--------|-------|------------------|
| `national_governorates` | المحافظات اليمنية | 21 |
| `national_districts` | المديريات والأحياء | 300+ |
| `national_postal_codes` | النظام البريدي | 500+ |
| `work_contract_types` | أنواع العقود | 7 |
| `employment_types` | أنماط التوظيف | 7 |
| `worker_categories` | فئات العمال | 7 |
| `work_permit_categories` | تصاريح العمل | 5 |
| `occupational_hazard_categories` | مخاطر العمل | 10 |
| `training_certification_types` | الشهادات التدريبية | 7 |
| `economic_sectors` | القطاعات الاقتصادية | 18 |
| `business_license_categories` | فئات الترخيص | 6 |
| `industrial_zones` | المناطق الصناعية | 10+ |
| `ministry_departments` | أقسام الوزارة | 10 |
| `inspection_types` | أنواع التفتيش | 6 |
| `dispute_resolution_stages` | مراحل النزاع | 8 |
| `violation_classifications` | تصنيفات المخالفات | 5 |
| `legal_reference_hierarchy` | التسلسل القانوني | 7 |
| `regulatory_framework` | الأطر التنظيمية | 20+ |

### 4.2 جداول التتبع والإدارة

| الجدول | الغرض |
|--------|-------|
| `directory_versions` | إدارة إصدارات الأدلة |
| `directory_change_log` | سجل التغييرات التدقيقي |

---

## 5. قواعد التسمية

### 5.1 قواعد أكواد الجداول

| النوع | النمط | مثال |
|------|-------|------|
| المحافظة | 2 حرف | `SA`, `AD`, `TA` |
| نوع العقد | `CNT-{TYPE}-{SEQ}` | `CNT-DEF-001`, `CNT-IND-001` |
| نوع التوظيف | `EMP-{TYPE}` | `EMP-FULL`, `EMP-PART` |
| فئة الترخيص | `LIC-{TYPE}` | `LIC-COMM`, `LIC-INDU` |
| الخطر المهني | `HZRD-{TYPE}` | `HZRD-CHEM`, `HZRD-PHYS` |

### 5.2 قواعد الأعمدة

```sql
-- أعمدة البيانات الأساسية
id              UUID PRIMARY KEY
code            TEXT UNIQUE NOT NULL
name_ar         TEXT NOT NULL
name_en         TEXT
description     TEXT

-- أعمدة التصنيف
status          TEXT DEFAULT 'active'
is_active       BOOLEAN DEFAULT TRUE

-- أعمدة التعقب
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
deleted_at      TIMESTAMPTZ

-- أعمدة البيانات الوصفية
metadata        JSONB DEFAULT '{}'
```

---

## 6. إدارة الإصدارات

### 6.1 هيكل الإصدار

```
version_number: INTEGER (sequential)
version_date: DATE
changes_summary: TEXT
change_reasons: TEXT[]
approved_by: UUID
approved_at: TIMESTAMPTZ
is_current: BOOLEAN
```

### 6.2 عملية إصدار دليل جديد

1. **التخطيط**: تحديد التغييرات المطلوبة
2. **المراجعة**: مراجعة التأثير على الأنظمة القائمة
3. **الاعتماد**: موافقة الجهات المختصة
4. **الإصدار**: تحديث `directory_versions`
5. **التوثيق**: تسجيل في `directory_change_log`

### 6.3 دالة التحقق من الإصدار الحالي

```sql
CREATE OR REPLACE FUNCTION get_current_version(
    p_directory_type TEXT
) RETURNS TABLE(
    version_number INTEGER,
    version_date DATE,
    changes_summary TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT dv.version_number, dv.version_date, dv.changes_summary
    FROM directory_versions dv
    WHERE dv.directory_type = p_directory_type
      AND dv.is_current = TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. سجل التغييرات

### 7.1 بنية السجل

| الحقل | الوصف |
|-------|-------|
| `directory_type` | نوع الدليل |
| `record_id` | معرف السجل |
| `record_code` | كود السجل |
| `change_type` | نوع التغيير (create/update/deactivate/delete) |
| `field_changed` | الحقل المعدل |
| `old_value` | القيمة القديمة |
| `new_value` | القيمة الجديدة |
| `change_reason` | سبب التغيير |
| `changed_by` | المستخدم المسؤول |
| `changed_at` | تاريخ التغيير |

### 7.2 تفعيل التسجيل التلقائي

```sql
CREATE TRIGGER trg_{table}_change_log
AFTER INSERT OR UPDATE OR DELETE ON {table}
FOR EACH ROW EXECUTE FUNCTION log_directory_change();
```

---

## 8. ضوابط جودة البيانات

### 8.1 القيود على مستوى قاعدة البيانات

```sql
-- فريد وغير فارغ
code TEXT UNIQUE NOT NULL

-- قيم محددة
severity_level TEXT CHECK (severity_level IN ('minor','moderate','serious','critical'))

-- نطاق رقمي
fees_yER NUMERIC(12,2) CHECK (fees_yER >= 0)

-- تاريخ فعال
effective_date DATE CHECK (effective_date <= CURRENT_DATE)
```

### 8.2 عرض جودة البيانات

```sql
CREATE OR REPLACE VIEW v_directory_completeness AS
SELECT 
    'governorates' as directory_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_records,
    21 as expected_minimum,
    CASE 
        WHEN COUNT(*) >= 21 THEN '✓ COMPLETE'
        ELSE '⚠ INCOMPLETE'
    END as status
FROM national_governorates;
```

### 8.3 فحص سلامة البيانات

```sql
-- فحص السجلات غير النشطة
SELECT code, name_ar, 'INACTIVE' as status
FROM national_governorates
WHERE is_active = FALSE;

-- فحص السجلات بدون كود
SELECT id, name_ar, 'MISSING_CODE' as issue
FROM national_governorates
WHERE code IS NULL;
```

---

## 9. واجهات برمجة التطبيقات (APIs)

### 9.1 نقاط الوصول الأساسية

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/api/directories/{type}` | جلب جميع سجلات الدليل |
| GET | `/api/directories/{type}/{code}` | جلب سجل واحد |
| POST | `/api/directories/{type}` | إنشاء سجل جديد |
| PUT | `/api/directories/{type}/{code}` | تحديث سجل |
| GET | `/api/directories/versions/{type}` | جلب إصدارات الدليل |
| GET | `/api/directories/changes/{type}` | جلب سجل التغييرات |

### 9.2 مثال استجابة

```json
{
  "data": {
    "id": "uuid",
    "code": "SA",
    "name_ar": "صنعاء",
    "name_en": "Sana'a",
    "region": "صنعاء",
    "is_active": true,
    "metadata": {}
  },
  "meta": {
    "version": 1,
    "last_updated": "2026-08-30T00:00:00Z"
  }
}
```

### 9.3 معايير الاستجابة

| المعيار | القيمة |
|---------|--------|
| HTTP Status 200 | نجاح |
| HTTP Status 201 | إنشاء جديد |
| HTTP Status 400 | خطأ في الطلب |
| HTTP Status 404 | غير موجود |
| HTTP Status 500 | خطأ داخلي |

---

## 10. الأمان والصلاحيات

### 10.1 أدوار الوصول

| الدور | الصلاحيات |
|-------|----------|
| `admin` | قراءة/كتابة لجميع الأدلة |
| `ministry` | قراءة/كتابة للأدلة التنظيمية |
| `viewer` | قراءة فقط لجميع الأدلة |
| `system` | إدارة النظام والتحديثات |

### 10.2 سياسات RLS

```sql
-- سياسة القراءة للوزارة
CREATE POLICY "Ministry reads directories"
ON national_governorates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('ministry', 'admin', 'viewer')
    )
);

-- سياسة الكتابة للإدارة
CREATE POLICY "Admin writes directories"
ON national_governorates FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);
```

---

## 11. الصيانة والتحسين المستمر

### 11.1 المهام الدورية

| المهمة | التكرار | المسؤول |
|--------|---------|--------|
| مراجعة اكتمال البيانات | شهرياً | فريق البيانات |
| تحديث الإصدارات | عند الحاجة | إدارة النظام |
| فحص السجلات غير النشطة | أسبوعياً | فريق الجودة |
| نسخ احتياطي | يومي | فريق التشغيل |

### 11.2 مؤشرات الأداء

| المؤشر | الهدف | التكرار |
|--------|-------|--------|
| نسبة اكتمال البيانات | ≥ 95% | شهري |
| وقت استجابة API | < 200ms | يومي |
| معدل الأخطاء | < 0.1% | يومي |
| تغطية الاختبارات | ≥ 80% | لكل إصدار |

---

## 12. الملاحق

### 12.1 قائمة المحافظات اليمنية

| الكود | الاسم | المنطقة |
|-------|------|---------|
| SA | صنعاء | صنعاء |
| AD | عدن | عدن |
| TA | تعز | تعز |
| IH | الحديدة | الحديدة |
| IB | إب | إب |
| SD | ذمار | ذمار |
| MR | المهرة | المهرة |
| SH | شبوة | شبوة |
| AB | أبين | عدن |
| MN | المحويت | حجة |
| AM | عمران | صنعاء |
| DA | الضالع | تعز |
| BB | البيضاء | البيضاء |
| HJ | حجة | حجة |
| SW | صعدة | صعدة |
| RF | الرفيدية | عسير |
| SM | صنعاء | صنعاء |
| TH | ذمار | ذمار |
| YN | البيضاء | البيضاء |

### 12.2 رموز القطاعات ISIC

| الكود | القطاع |
|-------|--------|
| A | الزراعة |
| B | التعدين |
| C | الصناعات التحويلية |
| D | الكهرباء |
| E | المياه |
| F | البناء |
| G | التجارة |
| H | النقل |
| I | الضيافة |
| J | المعلومات |
| K | المالية |
| L | العقارات |
| M | المهنية |
| N | الإدارية |
| O | الحكومية |
| P | التعليم |
| Q | الصحة |
| R | الترفيه |
| S | الخدمات |
| T | المنازل |
| U | المنظمات |

---

**تاريخ الإصدار:** 2026-08-30  
**رقم الإصدار:** 1.0  
**الحالة:** ✅ معتمد
