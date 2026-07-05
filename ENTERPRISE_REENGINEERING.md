# 🏛️ Enterprise Re-Engineering Plan
## منصة إدارة الكيانات المؤسسية - وزارة الشؤون الاجتماعية والعمل

---

## 📋 ملخص تنفيذي

تحويل المنصة من نظام إدارة نقابات تقليدي إلى **نظام ERP حكومي ذكي** موحد يعتمد على:
- **Organizational Entity Engine** - محرك الكيانات المؤسسية الموحد
- **Dynamic Classification System** - نظام تصنيف ديناميكي
- **Hierarchical Tree Architecture** - هيكل شجري متعدد المستويات
- **Smart Workflow Automation** - أتمتة ذكية لسير العمل
- **AI-Powered Analytics** - تحليلات مدعومة بالذكاء الاصطناعي

**الدومين:** `dynamicgsye.com`  
**منصة النشر:** Vercel  
**الجاهزية:** Production Ready

---

## 🎯 التحول الأساسي

### من:
```
❌ منظمة (منفصلة)
❌ نقابة (منفصلة)
❌ نماذج ثابتة
❌ إدارة يدوية
❌ بيانات غير مترابطة
```

### إلى:
```
✅ كيان مؤسسي موحد (Organizational Entity)
✅ تصنيف ديناميكي ذكي
✅ نماذج متكيفة
✅ سير عمل آلي
✅ بيانات مترابطة في الوقت الفعلي
```

---

## 📊 الهيكل الجديد الموحد

### Entity Model (النموذج الموحد)

```typescript
interface OrganizationalEntity {
  // المعرفات الأساسية
  entityId: string;                    // UUID
  unifiedCode: string;                 // رمز موحد وطني
  registrationNumber: string;          // رقم التسجيل
  parentEntityId?: string;             // الكيان الأب (للهيكل الشجري)
  
  // التصنيف الذكي
  entityType: EntityType;              // نقابة | منظمة | اتحاد | فرع | لجنة
  classification: Classification;      // عمالية | مهنية | أصحاب أعمال | خيرية
  sector: Sector;                      // القطاع الاقتصادي
  activityType: ActivityType[];        // نوع النشاط
  
  // المستوى التنظيمي
  governanceLevel: GovernanceLevel;    // وطني | إقليمي | محافظة | مديرية
  geographicScope: GeographicScope;    // النطاق الجغرافي
  organizationalLevel: number;         // المستوى في الشجرة (1-10)
  
  // المعلومات القانونية
  legalForm: LegalForm;                // الشكل القانوني
  licenseNumber: string;               // رقم الترخيص
  licenseStatus: LicenseStatus;        // حالة الترخيص
  establishmentDate: Date;             // تاريخ التأسيس
  registrationDate: Date;              // تاريخ التسجيل
  
  // الحالة والامتثال
  status: EntityStatus;                // نشط | متوقف | معلق | ملغى
  complianceStatus: ComplianceStatus;  // ملتزم | مخالف | تحت المراجعة
  riskLevel: RiskLevel;                // منخفض | متوسط | عالي | حرج
  
  // المعلومات المؤسسية
  nameAr: string;
  nameEn: string;
  description: string;
  mission?: string;
  vision?: string;
  
  // معلومات الاتصال
  contactInfo: ContactInfo;
  address: Address;
  geoLocation?: GeoLocation;
  
  // القيادة والإدارة
  president: LeadershipInfo;
  vicePresident?: LeadershipInfo;
  secretary?: LeadershipInfo;
  treasurer?: LeadershipInfo;
  boardMembers?: BoardMember[];
  
  // الإحصائيات
  memberCount: number;
  branchCount: number;
  committeeCount: number;
  workforceStatistics?: WorkforceStats;
  
  // المؤشرات المالية
  financialIndicators?: FinancialIndicators;
  annualBudget?: number;
  
  // التفتيش والمراجعة
  lastInspectionDate?: Date;
  nextInspectionDate?: Date;
  lastAuditDate?: Date;
  inspectionScore?: number;
  
  // التجديد والترخيص
  nextRenewalDate: Date;
  renewalStatus: RenewalStatus;
  
  // الوثائق الرسمية
  documents: OfficialDocument[];
  licenses: License[];
  
  // الهوية الرقمية
  digitalIdentity: DigitalIdentity;
  qrCode: string;
  digitalSignature?: string;
  
  // التكاملات الخارجية
  taxReference?: string;
  socialInsuranceRef?: string;
  commercialRegisterRef?: string;
  
  // الذكاء الاصطناعي
  aiClassificationScore?: number;
  aiRiskAssessment?: AIRiskAssessment;
  aiRecommendations?: string[];
  
  // التدقيق
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
  metadata: Record<string, any>;
}
```

---

## 🌳 الهيكل الشجري الهرمي

```
الجمهورية اليمنية
└── وزارة الشؤون الاجتماعية والعمل
    ├── الاتحاد العام لنقابات العمال
    │   ├── اتحاد نقابات القطاع الصناعي
    │   │   ├── نقابة عمال البناء
    │   │   │   ├── فرع صنعاء
    │   │   │   ├── فرع عدن
    │   │   │   └── فرع تعز
    │   │   └── نقابة عمال المصانع
    │   └── اتحاد نقابات القطاع الخدمي
    ├── الاتحاد العام للنقابات المهنية
    │   ├── نقابة المهندسين
    │   │   ├── لجنة المهندسين المدنيين
    │   │   ├── لجنة مهندسي الكهرباء
    │   │   └── فرع حضرموت
    │   ├── نقابة الأطباء
    │   └── نقابة المحامين
    └── نقابات أصحاب الأعمال
        ├── نقابة أصحاب المقاولات
        └── نقابة التجار
```

---

## 🗄️ قاعدة البيانات الجديدة

### الجداول الرئيسية:

#### 1. `organizational_entities` (الكيانات المؤسسية)
```sql
CREATE TABLE organizational_entities (
  entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_code VARCHAR(50) UNIQUE NOT NULL,
  registration_number VARCHAR(100) UNIQUE NOT NULL,
  parent_entity_id UUID REFERENCES organizational_entities(entity_id),
  
  -- التصنيف
  entity_type VARCHAR(50) NOT NULL,
  classification VARCHAR(50) NOT NULL,
  sector VARCHAR(100),
  activity_types JSONB,
  
  -- المستوى التنظيمي
  governance_level VARCHAR(50),
  geographic_scope VARCHAR(100),
  organizational_level INT DEFAULT 1,
  hierarchy_path LTREE, -- للبحث الشجري السريع
  
  -- القانوني
  legal_form VARCHAR(50),
  license_number VARCHAR(100),
  license_status VARCHAR(50),
  establishment_date DATE,
  registration_date DATE NOT NULL,
  
  -- الحالة
  status VARCHAR(50) DEFAULT 'active',
  compliance_status VARCHAR(50) DEFAULT 'compliant',
  risk_level VARCHAR(50) DEFAULT 'low',
  
  -- المعلومات
  name_ar VARCHAR(500) NOT NULL,
  name_en VARCHAR(500),
  description TEXT,
  mission TEXT,
  vision TEXT,
  
  -- الاتصال
  contact_info JSONB,
  address JSONB,
  geo_location GEOGRAPHY(POINT),
  
  -- القيادة
  leadership JSONB,
  board_members JSONB,
  
  -- الإحصائيات
  member_count INT DEFAULT 0,
  branch_count INT DEFAULT 0,
  committee_count INT DEFAULT 0,
  workforce_statistics JSONB,
  financial_indicators JSONB,
  
  -- التفتيش
  last_inspection_date DATE,
  next_inspection_date DATE,
  inspection_score DECIMAL(5,2),
  
  -- التجديد
  next_renewal_date DATE NOT NULL,
  renewal_status VARCHAR(50),
  
  -- الهوية الرقمية
  qr_code TEXT,
  digital_signature TEXT,
  
  -- التكاملات
  tax_reference VARCHAR(100),
  social_insurance_ref VARCHAR(100),
  commercial_register_ref VARCHAR(100),
  
  -- الذكاء الاصطناعي
  ai_classification_score DECIMAL(5,2),
  ai_risk_assessment JSONB,
  ai_recommendations JSONB,
  
  -- التدقيق
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  version INT DEFAULT 1,
  metadata JSONB,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- الفهارس
  CONSTRAINT valid_hierarchy CHECK (entity_id != parent_entity_id),
  CONSTRAINT valid_level CHECK (organizational_level >= 1 AND organizational_level <= 10)
);

-- الفهارس للأداء
CREATE INDEX idx_entities_parent ON organizational_entities(parent_entity_id);
CREATE INDEX idx_entities_type ON organizational_entities(entity_type);
CREATE INDEX idx_entities_status ON organizational_entities(status);
CREATE INDEX idx_entities_classification ON organizational_entities(classification);
CREATE INDEX idx_entities_hierarchy_path ON organizational_entities USING GIST(hierarchy_path);
CREATE INDEX idx_entities_geo_location ON organizational_entities USING GIST(geo_location);
CREATE INDEX idx_entities_unified_code ON organizational_entities(unified_code);
CREATE INDEX idx_entities_search ON organizational_entities USING GIN(
  to_tsvector('arabic', name_ar || ' ' || COALESCE(description, ''))
);
```

#### 2. `entity_relationships` (العلاقات بين الكيانات)
```sql
CREATE TABLE entity_relationships (
  relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID REFERENCES organizational_entities(entity_id),
  target_entity_id UUID REFERENCES organizational_entities(entity_id),
  relationship_type VARCHAR(50) NOT NULL, -- parent, branch, partner, affiliated
  relationship_level INT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `dynamic_entity_fields` (الحقول الديناميكية)
```sql
CREATE TABLE dynamic_entity_fields (
  field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES organizational_entities(entity_id),
  field_name VARCHAR(100) NOT NULL,
  field_value JSONB,
  field_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 المكونات الجديدة

### 1. Entity Tree View (العرض الشجري)
```typescript
<EntityTreeView
  rootEntityId={rootId}
  expandLevel={2}
  showActions={true}
  draggable={true}
  onNodeClick={handleNodeClick}
  onDragDrop={handleReorganize}
/>
```

### 2. Dynamic Entity Form (النموذج الديناميكي)
```typescript
<DynamicEntityForm
  entityType={selectedType}
  classification={selectedClassification}
  mode="create" // or "edit"
  onSubmit={handleSubmit}
/>
```

### 3. Enterprise Dashboard (لوحة التحكم)
```typescript
<EnterpriseDashboard
  kpis={kpiData}
  viewMode="grid" // tree, kanban, map, graph
  filters={activeFilters}
/>
```

---

## 🚀 خطة التنفيذ (5 مراحل)

### المرحلة 1: البنية التحتية (Phase 1)
- ✅ إعداد قاعدة البيانات الجديدة
- ✅ إنشاء النماذج الموحدة
- ✅ إعداد API الجديد
- ✅ نظام الصلاحيات المتقدم

### المرحلة 2: الواجهات الأساسية (Phase 2)
- ✅ Entity Management Dashboard
- ✅ Tree View Component
- ✅ Dynamic Forms Engine
- ✅ Advanced Filters

### المرحلة 3: الذكاء والتحليلات (Phase 3)
- ✅ AI Classification
- ✅ Risk Assessment
- ✅ Analytics Dashboard
- ✅ Predictive Reports

### المرحلة 4: التكاملات (Phase 4)
- ✅ External APIs Integration
- ✅ Realtime Updates
- ✅ Notifications System
- ✅ Document Management

### المرحلة 5: الإنتاج والنشر (Phase 5)
- ✅ Performance Optimization
- ✅ Security Hardening
- ✅ Vercel Deployment
- ✅ Domain Configuration (dynamicgsye.com)

---

## 🎯 المخرجات النهائية

1. ✅ منصة ERP حكومية كاملة
2. ✅ نظام كيانات موحد ذكي
3. ✅ واجهات احترافية Enterprise-grade
4. ✅ قاعدة بيانات محسّنة
5. ✅ تحليلات ذكية
6. ✅ جاهزة للنشر على dynamicgsye.com
7. ✅ Production Ready

---

**ابدأ التنفيذ الآن >>**
