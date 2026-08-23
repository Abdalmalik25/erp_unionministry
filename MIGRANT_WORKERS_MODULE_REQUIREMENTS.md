# 📋 وثيقة المتطلبات الوظيفية والتقنية
## وحدة إدارة العمالة اليمنية المهاجرة
### **MIGRANT_WORKERS_MODULE_REQUIREMENTS.md**

---

> **المشروع**: UnionSphere Enterprise 2.0  
> **الجهة**: وزارة الشؤون الاجتماعية والعمل — قطاع العمل — الجمهورية اليمنية 🇾🇪  
> **الإصدار**: v1.0.0  
> **تاريخ الإعداد**: أغسطس 2026  
> **الحالة**: `📝 Pending Implementation` — بانتظار التنفيذ  
> **المرجع القانوني**: قانون العمل رقم (5) لسنة 1995م · قرار جمهوري رقم (57) لسنة 1997م · قانون النقابات رقم (35) لسنة 2002م

---

## 1. 🎯 نظرة عامة وأهداف الوحدة

### 1.1 الوصف العام
وحدة إدارة العمالة اليمنية المهاجرة هي إضافة جوهرية ومستقلة ضمن منصة **UnionSphere Enterprise**، تُتيح لقطاع العمل في وزارة الشؤون الاجتماعية والعمل إدارة دورة حياة العامل اليمني المهاجر بالكامل — من لحظة تسجيله قبل السفر، إلى متابعته خلال إقامته في الخارج، حتى استقباله عائداً وإدماجه في سوق العمل المحلي.

### 1.2 المشكلة التي تحلّها الوحدة
- **+80%** من اليمنيين المهاجرين يسافرون **بلا توثيق وزاري**، مما يجردهم من الحماية القانونية.
- **لا يوجد سجل مركزي** لليمنيين في الخارج يمكن الرجوع إليه في حالات الطوارئ.
- **مكاتب الاستقدام** تعمل بلا رقابة رقمية فعلية رغم المادة (109) من قانون العمل.
- **الشكاوى العمالية** من الخارج لا قناة رسمية رقمية لتلقيها.

### 1.3 الأهداف الاستراتيجية
| الهدف | المؤشر القابل للقياس |
|:---|:---|
| رقمنة إجراءات الإيفاد | 100% من وثائق الإيفاد تصدر إلكترونياً بنهاية العام الأول |
| ضبط مكاتب الاستقدام | خفض المكاتب غير الممتثلة بنسبة 70% خلال 18 شهراً |
| استجابة الشكاوى | متوسط الاستجابة للشكوى ≤ 72 ساعة |
| تغطية الهجرة النظامية | رفع نسبة المهاجرين الموثقين من 20% إلى 60% خلال 3 سنوات |

---

## 2. 👥 المستخدمون والصلاحيات (User Roles)

```
┌─────────────────────────────────────────────────────────┐
│                     هرم الصلاحيات                       │
│                                                         │
│  👑 وزير / وكيل الوزارة     ← إشراف استراتيجي + تقارير   │
│  🏛️ رئيس قطاع العمل        ← إدارة النظام كامل           │
│  🖥️ موظف الوزارة (ديوان)   ← تسجيل + توثيق + إصدار      │
│  🏢 موظف مكتب محافظة       ← تسجيل محلي + شكاوى محلية   │
│  ✈️ الملحق العمالي (سفارة) ← متابعة خارجية + شكاوى خارج │
│  👤 العامل المهاجر (ذاتي)  ← تقديم شكوى + استعلام ذاتي  │
│  🏪 مكتب الاستقدام         ← تقديم طلبات الإيفاد         │
└─────────────────────────────────────────────────────────┘
```

| الدور | `role_key` | الصلاحيات |
|:---|:---|:---|
| وزير / وكيل | `super_admin` | كامل — قراءة + كتابة + حذف + تقارير عليا |
| رئيس قطاع العمل | `sector_head` | إدارة كاملة للوحدة + تقارير + موافقات |
| موظف الوزارة | `ministry_officer` | تسجيل + توثيق + إصدار وثائق + رد شكاوى |
| موظف مكتب المحافظة | `office_officer` | تسجيل محلي + تلقي شكاوى + إحالة |
| الملحق العمالي | `labor_attache` | شاشة المتابعة الخارجية + إدارة شكاوى الخارج |
| العامل (ذاتي) | `worker_self` | تقديم شكوى + الاستعلام عن ملفه الشخصي فقط |
| مكتب استقدام | `recruitment_office` | تقديم طلبات إيفاد + عرض حالة الطلبات |

---

## 3. 🗺️ خريطة الوحدة والمسارات (Module Map & Routes)

```
/ministry/
    ├── migrant-workers/                  ← الصفحة الرئيسية (قائمة + إحصاء)
    │   ├── register/                     ← تسجيل عامل جديد (قبل السفر)
    │   ├── :workerId/                    ← ملف العامل التفصيلي
    │   │   ├── profile/                  ← بيانات العامل الشخصية
    │   │   ├── contract/                 ← عقد العمل المرفوع
    │   │   ├── dispatch-document/        ← وثيقة الإيفاد + QR
    │   │   ├── complaints/              ← شكاواه (عرض + إضافة)
    │   │   └── return/                  ← بيانات العودة
    │   ├── complaints/                  ← إدارة كل الشكاوى (لوحة المشرف)
    │   └── statistics/                  ← إحصاء وتقارير إجمالية
    │
    ├── recruitment-offices/             ← إدارة مكاتب الاستقدام
    │   ├── register/                    ← تسجيل مكتب جديد
    │   ├── :officeId/                   ← ملف المكتب
    │   │   ├── workers/                 ← العمال المرتبطون بالمكتب
    │   │   ├── compliance/             ← سجل الامتثال والمخالفات
    │   │   └── license/                ← الترخيص وتجديده
    │   └── blacklist/                  ← قائمة المكاتب المحظورة
    │
    └── dispatch-documents/              ← إدارة وثائق الإيفاد المصدرة
        ├── verify/:docNumber/           ← التحقق من وثيقة (عام - بلا تسجيل)
        └── issued-today/               ← الوثائق الصادرة اليوم
```

---

## 4. 📊 نماذج البيانات (Data Models — TypeScript)

### 4.1 ملف العامل المهاجر

**الملف**: `src/app/types/migrant-worker.ts` ← **[يُنشأ جديداً]**

```typescript
// ============================================================
// ملف العامل اليمني المهاجر
// قانون العمل رقم 5/1995 — قرار جمهوري رقم 57/1997
// ============================================================

export interface MigrantWorkerProfile {
  // ── المعرفات الأساسية ──
  workerId: string;                     // UUID — المفتاح الرئيسي
  nationalId: string;                   // رقم الهوية الوطنية (فريد)
  passportNumber: string;               // رقم جواز السفر
  passportExpiryDate: Date;             // تاريخ انتهاء الجواز (يُنبّه قبل 90 يوم)

  // ── البيانات الشخصية ──
  fullNameAr: string;                   // الاسم الكامل عربي
  fullNameEn: string;                   // الاسم الكامل إنجليزي
  dateOfBirth: Date;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  educationLevel: EducationLevel;
  governorateOrigin: string;            // المحافظة الأصلية
  districtOrigin: string;               // المديرية الأصلية

  // ── بيانات الوجهة وصاحب العمل ──
  destinationCountry: string;           // دولة الوجهة
  destinationCity: string;
  employerName: string;                 // اسم صاحب العمل الأجنبي
  employerAddress: string;              // عنوانه الكامل في الخارج
  employerPhone: string;
  recruitmentOfficeId: string;          // FK → مكتب الاستقدام المسجِّل

  // ── بيانات المهنة والعقد (إلزامية — المادة 55) ──
  contractedOccupationAr: string;       // المسمى الوظيفي عربي
  contractedOccupationEn: string;       // المسمى الوظيفي إنجليزي
  iscoCode: string;                     // رمز ISCO-08 الدولي للمهنة
  competencyLevel: 1 | 2 | 3 | 4 | 5 | 6; // مستوى الجدارة وفق NOAS
  contractStartDate: Date;
  contractEndDate: Date;
  monthlyWageAmount: number;
  wageCurrency: string;                 // 'SAR' | 'KWD' | 'OMR' | 'USD' | ...
  workingHoursPerWeek: number;          // يجب ألا تتجاوز 48 ساعة (المادة 57)
  annualLeaveDays: number;              // الحد الأدنى 30 يوم
  housingProvidedByEmployer: boolean;   // هل يوفر السكن؟
  transportProvidedByEmployer: boolean;
  healthInsuranceIncluded: boolean;     // إلزامي (المادة 50)
  returnTicketCovered: boolean;         // إلزامي (المادة 50)

  // ── وثيقة الإيفاد الرسمية (قرار 57/1997) ──
  dispatchDocument: DispatchDocument;

  // ── وضع العامل الحالي ──
  currentStatus: MigrantWorkerStatus;
  lastKnownLocation?: string;           // آخر موقع مُبلَّغ عنه
  lastContactDate?: Date;               // آخر تواصل موثق
  residencePermitNumber?: string;
  residencePermitExpiryDate?: Date;     // يُنبّه قبل 60 يوم

  // ── جهة الاتصال الطارئة داخل اليمن ──
  emergencyContact: {
    fullName: string;
    relationship: string;               // أب | أم | زوج | أخ | ...
    phone: string;
    governorate: string;
  };

  // ── الشكاوى والانتهاكات ──
  complaints: MigrantComplaint[];

  // ── بيانات العودة ──
  returnRecord?: RepatriationRecord;

  // ── سجل التدقيق ──
  createdAt: Date;
  createdBy: string;                    // معرف الموظف المُسجِّل
  updatedAt: Date;
  updatedBy: string;
  officeRegisteredAt: string;           // مكتب المحافظة أو ديوان الوزارة
}

// ────────────────────────────────────────────
// وثيقة الإيفاد الرسمية — قرار 57/1997
// ────────────────────────────────────────────
export interface DispatchDocument {
  documentNumber: string;               // رقم الوثيقة (تسلسلي + رمز الجهة)
  issueDate: Date;
  issuingOfficeId: string;              // ديوان الوزارة | مكتب المحافظة
  issuingOfficerId: string;             // الموظف المُصدِر
  expiryDate: Date;                     // تاريخ الانتهاء (عادةً = نهاية العقد)
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  cancellationReason?: string;
  // التوثيق الرقمي السيادي
  sha256Hash: string;                   // SHA-256 للبيانات الكاملة
  qrCodeData: string;                   // رابط للتحقق: verify.mol.gov.ye/doc/:hash
  digitalSignature: string;            // التوقيع الرقمي للمُصدِر
  printedCount: number;                 // عدد مرات الطباعة (للمراجعة)
}

// ────────────────────────────────────────────
// حالات العامل المهاجر عبر دورة حياته
// ────────────────────────────────────────────
export type MigrantWorkerStatus =
  | 'pre_departure'       // مُسجَّل — لم يسافر بعد
  | 'in_transit'          // في الطريق (بين اليمن والوجهة)
  | 'working_abroad'      // يعمل بصورة طبيعية في الخارج
  | 'contract_renewed'    // جدد عقده في الخارج
  | 'contract_expired'    // انتهى عقده ولم يُجدَّد ولم يعد
  | 'complaint_pending'   // لديه شكوى قيد المعالجة
  | 'detained'            // مُحتجز (في مركز احتجاز أو سجن)
  | 'missing'             // مفقود — لا يتواصل ولا أخبار عنه
  | 'hospitalized'        // في المستشفى
  | 'returned_voluntary'  // عاد طوعاً بنهاية العقد
  | 'returned_forced'     // أُعيد قسراً أو ترحيله
  | 'returned_emergency'  // أُعيد لظروف طارئة (حرب، كارثة)
  | 'deceased';           // توفي — يُفعّل بروتوكول المواريث

// ────────────────────────────────────────────
// الشكاوى العمالية من الخارج
// ────────────────────────────────────────────
export interface MigrantComplaint {
  complaintId: string;
  workerId: string;                     // FK → MigrantWorkerProfile
  complaintType: ComplaintType;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'; // حرج = يستدعي تدخلاً فورياً
  dateReported: Date;
  reportedVia: ReportChannel;
  descriptionAr: string;
  descriptionEn?: string;
  evidenceAttachments?: string[];       // روابط للصور أو المستندات
  status: ComplaintStatus;
  assignedToAttacheId?: string;         // الملحق العمالي المُكلَّف
  assignedToOfficerId?: string;         // موظف الوزارة المُكلَّف
  escalatedAt?: Date;
  escalatedTo?: string;
  resolutionDetails?: string;
  resolvedAt?: Date;
  workerSatisfaction?: 1 | 2 | 3 | 4 | 5; // تقييم رضا العامل عن الحل
}

export type ComplaintType =
  | 'wage_theft'               // سرقة الأجور أو عدم الصرف
  | 'contract_breach'          // مخالفة شروط العقد
  | 'occupation_switch'        // تغيير المهنة قسراً
  | 'overwork'                 // ساعات عمل مفرطة
  | 'forced_labor'             // عمل قسري
  | 'physical_abuse'           // إيذاء جسدي
  | 'sexual_harassment'        // تحرش جنسي
  | 'verbal_abuse'             // إيذاء نفسي أو لفظي
  | 'passport_confiscation'    // مصادرة جواز السفر (مخالف للقانون)
  | 'illegal_detention'        // احتجاز غير قانوني / منع من المغادرة
  | 'no_accommodation'         // حُرم من السكن الموعود
  | 'no_health_insurance'      // حُرم من التأمين الصحي
  | 'travel_ban'               // منع السفر / قضية مفتوحة
  | 'unpaid_return_ticket'     // لم تدفع تذكرة العودة
  | 'employer_bankruptcy'      // إفلاس صاحب العمل
  | 'abandoned_abroad'         // تُرك بلا رعاية في الخارج
  | 'trafficking_suspected'    // اشتباه اتجار بالبشر (🚨 أولوية قصوى)
  | 'other';

export type ReportChannel =
  | 'web_portal'               // البوابة الإلكترونية للوزارة
  | 'mobile_app'               // تطبيق الجوال
  | 'embassy_in_person'        // زيارة شخصية للسفارة
  | 'embassy_phone'            // الاتصال بالسفارة
  | 'ministry_hotline'         // الخط الساخن للوزارة
  | 'ngo_referral'             // إحالة من منظمة غير حكومية
  | 'family_report'            // بلاغ من الأسرة داخل اليمن
  | 'other_government';        // جهة حكومية أخرى

export type ComplaintStatus =
  | 'received'                 // استُلمت — لم تُعيَّن بعد
  | 'assigned'                 // عُيِّنت لملحق أو موظف
  | 'under_review'             // قيد المراجعة
  | 'contacted_worker'         // تم التواصل مع العامل
  | 'contacted_employer'       // تم التواصل مع صاحب العمل
  | 'escalated_to_embassy'     // رُفعت للسفارة
  | 'escalated_to_ministry'    // رُفعت لديوان الوزارة
  | 'legal_action_initiated'   // بدأت إجراءات قانونية
  | 'resolved'                 // حُلّت
  | 'closed_unresolved'        // أُغلقت دون حل (مع توضيح السبب)
  | 'referred_to_host_country';// أُحيلت لسلطات البلد المضيف

export type EducationLevel =
  | 'illiterate' | 'primary' | 'middle' | 'secondary'
  | 'diploma' | 'bachelor' | 'master' | 'phd';

// ────────────────────────────────────────────
// سجل العودة وإعادة التأهيل
// ────────────────────────────────────────────
export interface RepatriationRecord {
  recordId: string;
  workerId: string;
  returnDate: Date;
  returnReason: ReturnReason;
  returnType: 'voluntary' | 'forced' | 'emergency' | 'deceased_transfer';
  arrivalPort: string;                  // مطار صنعاء | عدن | المكلا | ...
  receptionOfficerId: string;           // الموظف المستقبِل
  physicalCondition: 'good' | 'injured' | 'ill' | 'critical';
  pendingWages?: number;                // أجور لم تُصرف (لرفع المطالبة)
  pendingWagesCurrency?: string;
  legalCaseOpenedAbroad: boolean;       // هل قضية مفتوحة في الخارج؟
  reintegrationPlanEnrolled: boolean;   // هل انخرط في برنامج إعادة تأهيل؟
  reintegrationProgramId?: string;
  postReturnEmploymentStatus?: 'employed' | 'unemployed' | 'self_employed' | 'training';
  followUpDate?: Date;                  // موعد متابعة الحالة بعد 3 أشهر
  notes?: string;
}

export type ReturnReason =
  | 'contract_end'             // انتهاء العقد
  | 'voluntary_resignation'    // استقالة طوعية
  | 'employer_termination'     // فصل من قِبل صاحب العمل
  | 'work_injury'              // إصابة عمل
  | 'illness'                  // مرض
  | 'family_emergency'         // ظرف عائلي طارئ
  | 'war_conflict'             // نزاع مسلح في البلد المضيف
  | 'natural_disaster'         // كارثة طبيعية
  | 'deportation'              // ترحيل من البلد المضيف
  | 'deceased';                // وفاة (استرداد الجثمان)
```

---

### 4.2 مكتب الاستقدام

**الملف**: `src/app/types/recruitment-office.ts` ← **[يُنشأ جديداً]**

```typescript
// ============================================================
// مكتب الاستقدام المرخّص
// المادة (109) قانون العمل — الوزارة ضامنة مسؤوليتهم
// ============================================================

export interface RecruitmentOffice {
  officeId: string;
  officeName: string;
  licenseNumber: string;               // رقم الترخيص الصادر من الوزارة
  licenseIssueDate: Date;
  licenseExpiryDate: Date;             // تنبيه تلقائي قبل 60 يوم
  licenseStatus: 'active' | 'expired' | 'suspended' | 'revoked' | 'pending_renewal';

  ownerFullName: string;
  ownerNationalId: string;
  ownerPhone: string;
  managerFullName: string;
  managerNationalId: string;

  addresses: string;
  governorate: string;
  phone: string;
  email?: string;
  website?: string;

  // الدول والمهن المُرخَّص التعامل معها
  authorizedCountries: string[];       // فقط الدول التي تملك عليها تفويضاً وزارياً
  authorizedOccupationCodes: string[]; // رموز ISCO المسموح بإيفاد عمالة لها

  // الكفالة المالية (إلزامية بموجب اللوائح)
  financialGuaranteeAmount: number;    // مبلغ الكفالة المودع (ريال/دولار)
  financialGuaranteeCurrency: string;
  guaranteeBankName: string;
  guaranteeExpiryDate: Date;

  // السجل التشغيلي
  totalWorkersDispatched: number;      // إجمالي العمال المُوفَدين منذ التأسيس
  workersCurrentlyAbroad: number;      // العمال حالياً في الخارج
  activeComplaints: number;            // الشكاوى النشطة ضد المكتب
  resolvedComplaints: number;
  totalViolations: number;

  // تقييم الامتثال والجودة
  complianceScore: number;             // 0–100 (يُحسب تلقائياً من النظام)
  riskRating: 'green' | 'yellow' | 'red' | 'blacklisted';
  // green: ممتاز / yellow: بحاجة متابعة / red: تحت المراقبة / blacklisted: محظور

  // المخالفات
  violations: OfficeViolation[];

  // التدقيق
  lastInspectionDate?: Date;
  nextScheduledInspectionDate?: Date;
  inspectionHistory: OfficeInspectionRecord[];

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export interface OfficeViolation {
  violationId: string;
  violationType: OfficeViolationType;
  description: string;
  detectedDate: Date;
  penaltyImposed?: string;             // وصف العقوبة (تحذير / غرامة / تعليق)
  fineAmount?: number;
  status: 'open' | 'paid' | 'appealed' | 'waived';
}

export type OfficeViolationType =
  | 'dispatching_without_document'     // إيفاد بلا وثيقة (المخالفة الأكثر شيوعاً)
  | 'dispatching_to_banned_country'    // إيفاد لدولة معلّق الإيفاد إليها
  | 'dispatching_minor'                // إيفاد قاصر دون 18 سنة
  | 'forged_contract'                  // عقد مزوَّر أو منقوص
  | 'unauthorized_occupation'          // إيفاد لمهنة غير مرخّص بها
  | 'unpaid_guarantee'                 // كفالة مالية منتهية أو غير مدفوعة
  | 'worker_abandonment'               // تخلّى عن عامل في الخارج
  | 'data_falsification'               // تزوير بيانات عامل
  | 'unauthorized_fee_collection'      // تحصيل رسوم غير مُقررة من العامل
  | 'other';
```

---

## 5. 🗄️ هيكل قاعدة البيانات (Supabase Schema)

**الملف**: يُضاف إلى `supabase/migrations/` ← **[جديد]**

```sql
-- ============================================================
-- وحدة العمالة اليمنية المهاجرة
-- Migration: add_migrant_workers_module
-- ============================================================

-- تمكين UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. مكاتب الاستقدام المرخّصة ──
CREATE TABLE recruitment_offices (
  office_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_name         VARCHAR(200) NOT NULL,
  license_number      VARCHAR(50) UNIQUE NOT NULL,
  license_status      VARCHAR(30) NOT NULL DEFAULT 'active',
  license_expiry_date DATE NOT NULL,
  owner_name          VARCHAR(200) NOT NULL,
  owner_national_id   VARCHAR(20) NOT NULL,
  governorate         VARCHAR(100),
  authorized_countries TEXT[] DEFAULT '{}',
  authorized_isco_codes TEXT[] DEFAULT '{}',
  compliance_score    NUMERIC(5,2) CHECK (compliance_score BETWEEN 0 AND 100) DEFAULT 100,
  risk_rating         VARCHAR(20) DEFAULT 'green',
  workers_currently_abroad INT DEFAULT 0,
  active_complaints   INT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id)
);

-- ── 2. ملفات العمال المهاجرين ──
CREATE TABLE migrant_workers (
  worker_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  national_id             VARCHAR(20) UNIQUE NOT NULL,
  passport_number         VARCHAR(20) NOT NULL,
  passport_expiry_date    DATE NOT NULL,
  full_name_ar            VARCHAR(200) NOT NULL,
  full_name_en            VARCHAR(200),
  date_of_birth           DATE NOT NULL,
  gender                  VARCHAR(10) CHECK (gender IN ('male','female')),
  governorate_origin      VARCHAR(100),
  destination_country     VARCHAR(100) NOT NULL,
  employer_name           VARCHAR(200) NOT NULL,
  employer_phone          VARCHAR(50),
  recruitment_office_id   UUID REFERENCES recruitment_offices(office_id),

  -- بيانات المهنة والعقد
  contracted_occupation_ar  VARCHAR(200),
  contracted_occupation_en  VARCHAR(200),
  isco_code               VARCHAR(20),               -- رمز ISCO-08
  competency_level        SMALLINT CHECK (competency_level BETWEEN 1 AND 6),
  contract_start_date     DATE,
  contract_end_date       DATE,
  monthly_wage_amount     NUMERIC(12,2),
  wage_currency           VARCHAR(10),
  housing_provided        BOOLEAN DEFAULT FALSE,
  transport_provided      BOOLEAN DEFAULT FALSE,
  health_insurance        BOOLEAN DEFAULT FALSE,
  return_ticket_covered   BOOLEAN DEFAULT FALSE,

  -- الحالة والمتابعة
  current_status          VARCHAR(50) NOT NULL DEFAULT 'pre_departure',
  last_contact_date       DATE,
  residence_permit_expiry DATE,

  -- جهة الاتصال الطارئة
  emergency_contact_name  VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_rel   VARCHAR(50),
  emergency_contact_gov   VARCHAR(100),

  -- التدقيق
  office_registered_at    VARCHAR(200),              -- مكتب التسجيل
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  created_by              UUID REFERENCES auth.users(id),
  updated_by              UUID REFERENCES auth.users(id)
);

-- ── 3. وثائق الإيفاد الرسمية ──
CREATE TABLE dispatch_documents (
  doc_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id           UUID NOT NULL REFERENCES migrant_workers(worker_id) ON DELETE CASCADE,
  document_number     VARCHAR(50) UNIQUE NOT NULL,   -- تسلسلي: MOL-2026-000001
  issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date         DATE NOT NULL,
  issuing_office_id   VARCHAR(200),
  issuing_officer_id  UUID REFERENCES auth.users(id),
  status              VARCHAR(30) DEFAULT 'active',
  cancellation_reason TEXT,
  -- التوثيق السيادي
  sha256_hash         CHAR(64),                      -- SHA-256 الكامل للوثيقة
  qr_code_data        TEXT,                          -- البيانات المشفرة في الـ QR
  digital_signature   TEXT,
  printed_count       SMALLINT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. شكاوى العمالة في الخارج ──
CREATE TABLE migrant_complaints (
  complaint_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id           UUID NOT NULL REFERENCES migrant_workers(worker_id),
  complaint_type      VARCHAR(50) NOT NULL,
  urgency_level       VARCHAR(20) DEFAULT 'medium',
  date_reported       TIMESTAMPTZ DEFAULT NOW(),
  reported_via        VARCHAR(50),
  description_ar      TEXT NOT NULL,
  description_en      TEXT,
  evidence_urls       TEXT[] DEFAULT '{}',
  status              VARCHAR(50) DEFAULT 'received',
  assigned_attache_id UUID,
  assigned_officer_id UUID REFERENCES auth.users(id),
  escalated_at        TIMESTAMPTZ,
  resolution_details  TEXT,
  resolved_at         TIMESTAMPTZ,
  worker_satisfaction SMALLINT CHECK (worker_satisfaction BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. سجلات العودة وإعادة التأهيل ──
CREATE TABLE repatriation_records (
  record_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id               UUID NOT NULL REFERENCES migrant_workers(worker_id),
  return_date             DATE NOT NULL,
  return_reason           VARCHAR(50),
  return_type             VARCHAR(30),
  arrival_port            VARCHAR(100),
  reception_officer_id    UUID REFERENCES auth.users(id),
  physical_condition      VARCHAR(20),
  pending_wages           NUMERIC(12,2),
  pending_wages_currency  VARCHAR(10),
  legal_case_abroad       BOOLEAN DEFAULT FALSE,
  reintegration_enrolled  BOOLEAN DEFAULT FALSE,
  post_return_employment  VARCHAR(30),
  follow_up_date          DATE,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. مخالفات مكاتب الاستقدام ──
CREATE TABLE office_violations (
  violation_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id           UUID NOT NULL REFERENCES recruitment_offices(office_id),
  violation_type      VARCHAR(50) NOT NULL,
  description         TEXT,
  detected_date       DATE DEFAULT CURRENT_DATE,
  penalty_description TEXT,
  fine_amount         NUMERIC(12,2),
  fine_currency       VARCHAR(10) DEFAULT 'YER',
  status              VARCHAR(20) DEFAULT 'open',
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes للأداء ──
CREATE INDEX idx_mw_national_id       ON migrant_workers(national_id);
CREATE INDEX idx_mw_status            ON migrant_workers(current_status);
CREATE INDEX idx_mw_destination       ON migrant_workers(destination_country);
CREATE INDEX idx_mw_office            ON migrant_workers(recruitment_office_id);
CREATE INDEX idx_dispatch_number      ON dispatch_documents(document_number);
CREATE INDEX idx_dispatch_hash        ON dispatch_documents(sha256_hash);
CREATE INDEX idx_complaints_worker    ON migrant_complaints(worker_id);
CREATE INDEX idx_complaints_status    ON migrant_complaints(status);
CREATE INDEX idx_complaints_urgency   ON migrant_complaints(urgency_level);

-- ── Row Level Security (RLS) ──
ALTER TABLE migrant_workers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrant_complaints    ENABLE ROW LEVEL SECURITY;
ALTER TABLE repatriation_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_offices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_violations     ENABLE ROW LEVEL SECURITY;
```

---

## 6. 🖥️ الصفحات والمكونات المطلوبة (Pages & Components)

| الملف | المسار | الحالة | الوصف |
|:---|:---|:---:|:---|
| `MigrantWorkerManagement.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | الصفحة الرئيسية — قائمة العمال + إحصاء |
| `MigrantWorkerRegister.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | نموذج تسجيل عامل جديد قبل السفر |
| `MigrantWorkerProfile.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | ملف العامل التفصيلي بكل تبويباته |
| `MigrantComplaintsBoard.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | لوحة إدارة الشكاوى (للمشرف) |
| `RecruitmentOfficeManagement.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | إدارة مكاتب الاستقدام المرخّصة |
| `DispatchDocumentViewer.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | عرض وثيقة الإيفاد + طباعة + QR |
| `PublicDocumentVerify.tsx` | `src/app/pages/` | `[ ] TODO` | صفحة عامة للتحقق من وثيقة بالرقم |
| `MigrantStatsDashboard.tsx` | `src/app/pages/ministry/` | `[ ] TODO` | لوحة إحصاء العمالة المهاجرة |
| `migrant-worker.ts` | `src/app/types/` | `[ ] TODO` | تعريفات TypeScript الكاملة |
| `recruitment-office.ts` | `src/app/types/` | `[ ] TODO` | تعريفات مكاتب الاستقدام |
| `sovereignCrypto.ts` | `src/app/utils/` | `[ ] TODO` | خوارزمية SHA-256 وتوليد QR السيادي |
| `migrantWorkerService.ts` | `src/app/utils/` | `[ ] TODO` | طبقة الخدمات — API calls لـ Supabase |

---

## 7. 🔗 التعديلات على الملفات القائمة

### `src/app/routes.tsx` — إضافة مسارات الوحدة الجديدة
```typescript
// يُضاف داخل children مسار /ministry
{
  path: "migrant-workers",
  element: <LazyPage><MigrantWorkerManagement /></LazyPage>
},
{
  path: "migrant-workers/register",
  element: <LazyPage><MigrantWorkerRegister /></LazyPage>
},
{
  path: "migrant-workers/:workerId",
  element: <LazyPage><MigrantWorkerProfile /></LazyPage>
},
{
  path: "migrant-workers/complaints",
  element: <LazyPage><MigrantComplaintsBoard /></LazyPage>
},
{
  path: "recruitment-offices",
  element: <LazyPage><RecruitmentOfficeManagement /></LazyPage>
},
// صفحة عامة بلا حماية — التحقق من وثيقة
{
  path: "/verify/:docNumber",
  element: <LazyPage><PublicDocumentVerify /></LazyPage>
},
```

### `src/app/types/commercial-full.ts` — تحديث `EmployeeInfo`
```typescript
// يُضاف للـ EmployeeInfo الموجودة
export interface EmployeeInfo {
  // ... الحقول القائمة ...
  nationality: 'yemeni' | 'foreign';          // جنسية العامل
  iscoCode?: string;                           // رمز المهنة الدولي
  workPermitNumber?: string;                  // رقم تصريح العمل للأجنبي
  workPermitExpiry?: Date;
  replacementPlanId?: string;                 // FK لخطة الإحلال (المادة 28)
}
```

---

## 8. 🔒 القواعد الأمنية والامتثال التشغيلي

### 8.1 قواعد بيانات حساسة
```
⚠️  بيانات ملفات المهاجرين = بيانات حساسة جداً
    → تشفير الحقول: nationalId, passportNumber, emergencyContact
    → RLS: كل موظف لا يرى إلا ملفات محافظته
    → الملحق العمالي: يرى فقط عمال دولته المُعيَّن إليها
    → سجل تدقيق (audit log) لكل عملية فتح / تعديل / طباعة
```

### 8.2 وثيقة الإيفاد السيادية
```
→ تُولَّد من بيانات العامل الكاملة + طابع زمني + معرف المُصدِر
→ SHA-256 يُحسب على JSON مُرتَّب (deterministic) لكل الحقول
→ رمز QR يحمل رابط: https://verify.mol.gov.ye/d/{sha256_hash}
→ الطباعة: خلفية الشعار الجمهوري المائية + بيانات التوثيق
→ لا يمكن إصدار وثيقتين لنفس العامل لنفس العقد
```

### 8.3 الشكاوى الحرجة (🚨 Trafficking Alert)
```
→ شكوى نوع 'trafficking_suspected' تُفعّل تلقائياً:
   1. إشعار فوري لرئيس قطاع العمل (push notification)
   2. إشعار للملحق العمالي في الدولة المعنية
   3. تصعيد تلقائي لوزارة الخارجية (بريد إلكتروني)
   4. تعيين أقصى أولوية urgency_level = 'critical'
   5. لا تُغلق إلا بموافقة رئيس القطاع شخصياً
```

---

## 9. 📊 مؤشرات الأداء الرئيسية (KPIs) المطلوب قياسها

```
┌────────────────────────────────────────────────────────────┐
│                  لوحة قياس الأداء الوطني                   │
├─────────────────────────────┬──────────────────────────────┤
│ المؤشر                      │ الهدف                         │
├─────────────────────────────┼──────────────────────────────┤
│ نسبة المهاجرين الموثقين     │ ≥ 60% بحلول 2028             │
│ متوسط وقت إصدار وثيقة إيفاد │ ≤ 2 يوم عمل                  │
│ متوسط الاستجابة للشكوى      │ ≤ 72 ساعة (حرج ≤ 4 ساعات)    │
│ نسبة الشكاوى المحلولة       │ ≥ 85%                         │
│ مكاتب استقدام بتقييم أخضر   │ ≥ 70%                         │
│ انتهاء تأشيرات قبل الإشعار  │ 100% تُنبَّه قبل 60 يوم        │
│ بطاقات العائدين المُدمَجين  │ ≥ 50% يعودون لسوق العمل       │
└─────────────────────────────┴──────────────────────────────┘
```

---

## 10. 🚀 خطة التنفيذ المقترحة للمطوّر (Implementation Roadmap)

```
المرحلة 1 — الأساس (الأسبوع 1-2)         الأولوية: 🔴 حرجة
─────────────────────────────────────────
  ☐ إنشاء نماذج البيانات TypeScript (migrant-worker.ts, recruitment-office.ts)
  ☐ تشغيل migration قاعدة البيانات في Supabase
  ☐ إعداد طبقة الخدمات (migrantWorkerService.ts)
  ☐ إضافة المسارات الجديدة في routes.tsx

المرحلة 2 — الوظائف الأساسية (الأسبوع 3-4)  الأولوية: 🔴 حرجة
─────────────────────────────────────────
  ☐ صفحة تسجيل العامل قبل السفر (MigrantWorkerRegister.tsx)
  ☐ قائمة العمال المهاجرين (MigrantWorkerManagement.tsx)
  ☐ ملف العامل التفصيلي (MigrantWorkerProfile.tsx)
  ☐ إدارة مكاتب الاستقدام (RecruitmentOfficeManagement.tsx)

المرحلة 3 — التوثيق السيادي (الأسبوع 5)    الأولوية: 🟠 عالية
─────────────────────────────────────────
  ☐ خوارزمية SHA-256 وتوليد QR (sovereignCrypto.ts)
  ☐ عارض وثيقة الإيفاد والطباعة (DispatchDocumentViewer.tsx)
  ☐ صفحة التحقق العام من الوثيقة (PublicDocumentVerify.tsx)

المرحلة 4 — إدارة الشكاوى (الأسبوع 6)      الأولوية: 🟠 عالية
─────────────────────────────────────────
  ☐ لوحة إدارة الشكاوى (MigrantComplaintsBoard.tsx)
  ☐ نظام الإشعارات والتصعيد التلقائي
  ☐ بروتوكول شكاوى الاتجار بالبشر

المرحلة 5 — لوحة الإحصاء والتقارير (الأسبوع 7)
─────────────────────────────────────────
  ☐ لوحة الإحصاء الوطنية (MigrantStatsDashboard.tsx)
  ☐ تقارير Excel/PDF للعمالة المهاجرة
  ☐ خريطة توزيع المهاجرين حسب الدول

المرحلة 6 — اختبار وإطلاق (الأسبوع 8)
─────────────────────────────────────────
  ☐ اختبارات وحدة (Unit Tests) للخدمات الجديدة
  ☐ اختبار RLS وصلاحيات الأدوار
  ☐ اختبار توليد وثيقة الإيفاد والـ QR
  ☐ مراجعة أمنية نهائية قبل الإطلاق
```

---

## 11. 📚 المراجع القانونية والتشريعية المرتبطة

| المرجع | الأحكام المرتبطة بهذه الوحدة |
|:---|:---|
| **قانون العمل اليمني رقم 5 / 1995م** | المواد: 3، 6، 50، 55، 57، 109 |
| **قرار جمهوري رقم 57 / 1997م** | لائحة تنظيم إيفاد العمالة لخارج الجمهورية — الإطار التشغيلي الكامل |
| **قانون النقابات رقم 35 / 2002م** | المواد: 4، 15، 36 — دور النقابات في حماية المهاجرين |
| **اتفاقية ILO رقم C97** | حماية العمال المهاجرين من التمييز (مُصادق عليها) |
| **اتفاقية ILO رقم C189** | حماية العمالة المنزلية (مُوصى بالمصادقة) |
| **الوثيقة الاستراتيجية الموحدة لقطاع العمل — 2026** | الأهداف الاستراتيجية لتطوير منظومة العمالة المهاجرة |

---

*وثيقة المتطلبات معتمدة ومُراجَعة بالتنسيق مع الإطار الاستراتيجي لتنظيم المهن وتطوير سوق العمل (NOAS–UnionSphere Integration Framework)*

---
**نسخة الوثيقة**: 1.0.0 | **آخر تحديث**: أغسطس 2026 | **المراجع التالية**: بعد كل مرحلة تنفيذ
