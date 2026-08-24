# 00 — الرؤية التنفيذية | Executive Vision
# NATIONAL YEMEN LABOR DIGITAL PLATFORM

> **الشعار:** Law First → Data Once → Workflow Everywhere → AI Assists → Human Governs → Everything Auditable

## الهدف الاستراتيجي
تحويل النظام الحالي (CRUD Government App) إلى **منصة وطنية ذكية** تدير دورة حياة العمل كاملة:
`Person → Worker → Employment → Contract → Establishment → Inspection → Violation → Correction → Dispute → Decision → Training → Career`
وبالتوازي `Union → Governance → Membership → Activities → Finance`

## المبادئ الثمانية
1. **Law First** — القانون مصدر الحقيقة الأول
2. **Data Once** — سجل وطني واحد لكل كيان
3. **Workflow Everywhere** — كل خدمة لها دورة حياة وسل
4. **Security by Default** — Zero Trust
5. **Human Governance** — القرار الحساس بشري
6. **AI Assists** — لا قرار نهائي آلي
7. **Everything Auditable** — أدلة وسجلات
8. **Change Without Rewrite** — تعديل تشريعي دون إعادة بناء

## المخرجات الملموسة
- 28 وثيقة معمارية (هذا المجلد) + 4 migrations جوهرية + 3 محركات جديدة (Regulatory/Workflow/Contract)
- RBAC/ABAC/Jurisdiction + Evidence Chain + SLA + Correspondence + OSH + Foreign Worker Lifecycle

## معيار النجاح
ليس جمال الواجهة، بل: **قابلية التتبع القانوني + وحدة البيانات + صلاحيات مؤسسية + تدقيق + تفتيش ذكي + نزاعات منظمة + عقود مهيكلة + نقابات محكومة + تاريخ محفوظ + AI مقيد**

## الحالة
- P0 Security: تمت معالجة 3 ثغرات حرجة (secret, TLS, auth enforcement)
- P1 Legal Foundation: 20260825_01_regulatory_foundation.sql جاهز
- P2 Canonical Data: 20260825_02_canonical_data_fabric.sql جاهز
- P3 Workflow/Case/SLA: 20260825_03_workflow_case_sla.sql جاهز
- P4 Contracts/OSH/Evidence: 20260825_04_contract_employment_osh.sql جاهز

> المرحلة التالية: تطبيق migrations على Neon + اختبار Regulatory Evaluate + بناء Employer OS / Worker Passport UI
