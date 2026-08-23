# 🏛️ UnionSphere Enterprise 2.0.0
## نظام إدارة المنشآت التجارية المؤسسي الحكومي
### وزارة الشؤون الاجتماعية والعمل - الجمهورية اليمنية

---

## 🎯 النسخة 2.0.0 المؤسسية

### التحسينات الجديدة:
- ✅ نظام عمليات تشغيلية مؤسسي (Operations Manager)
- ✅ نسخ احتياطي مُشفر 90 يومًا
- ✅ مزامنة دُفعية متقدمة
- ✅ أمان حكومي متكامل (HSTS, CSP, Rate Limiting)
- ✅ نظام أخطاء مؤسسي مع استرداد تلقائي
- ✅ النظام النووي الكامل للمنشآت التجارية

---

## 📁 بنية المشروع

```
src/
├── app/
│   ├── components/           # مكوّنات واجهة المستخدم
│   ├── contexts/            # سياقات التطبيق
│   ├── middleware/          # الوسيطات الأمانية
│   ├── pages/              # الصفحات
│   ├── types/              # تعريفات TypeScript
│   │   ├── entity.ts       # كيانات المنظمات النقابية
│   │   └── commercial-full.ts # النظام النووي التجاري
│   └── utils/              # أدوات مساعدة
├── scripts/               # سكربتات التشغيل
├── supabase/             # وظائف الخادم
└── styles/               # الأنماط
```

---

##  إعداد سريع

```bash
# تثبيت
pnpm install

# تطوير
pnpm run dev

# بناء للإنتاج
pnpm run build

# فحص صحة النظام
pnpm run health-check

# إنشاء نسخة احتياطية
pnpm run backup
```

---

## 🔧 المتغيرات البيئية

انسخ `.env.example` إلى `.env.local` وعدّل القيم.

---

## 🛡️ الأمان المؤسسي

- HSTS (1 سنة HTTPS)
- Content Security Policy حكومي
- X-Frame-Options: DENY
- Rate Limiting: 100 طلب/دقيقة
- تشفير البيانات الحساسة

---

## 🚀 النشر على Vercel

1. ربط GitHub (مراجع `GITHUB_DEPLOY_SOLUTION.md`)
2. أو رفع مباشر كـ ZIP
3. إضافة المتغيرات البيئية

---

## 📚 فهرس وثائق المشروع (Documentation Index)

> قبل أي تطوير، اقرأ الوثيقة المناسبة أولاً.

### 📋 وثائق المتطلبات (Requirements)
| الوثيقة | الوصف | الحالة |
|:---|:---|:---:|
| [`MIGRANT_WORKERS_MODULE_REQUIREMENTS.md`](./MIGRANT_WORKERS_MODULE_REQUIREMENTS.md) | **🆕 وحدة العمالة اليمنية المهاجرة** — متطلبات كاملة: TypeScript types، Supabase schema، API، صلاحيات، خارطة تنفيذ | `📝 Pending` |
| [`ENTERPRISE_REENGINEERING.md`](./ENTERPRISE_REENGINEERING.md) | إعادة هندسة المنصة — المعمارية الموحدة والكيانات المؤسسية | `✅ Done` |
| [`ENTERPRISE_ENHANCEMENT_PLAN.md`](./ENTERPRISE_ENHANCEMENT_PLAN.md) | خطة التحسين المؤسسي | `✅ Done` |

### 🚀 وثائق الإنتاج والنشر
| الوثيقة | الوصف |
|:---|:---|
| [`FINAL_PRODUCTION_SYSTEM.md`](./FINAL_PRODUCTION_SYSTEM.md) | النظام الكامل — مرجع المطوّر الشامل |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | دليل النشر على Vercel |
| [`SECURITY.md`](./SECURITY.md) | معايير الأمان الحكومي |
| [`PERFORMANCE.md`](./PERFORMANCE.md) | تحسينات الأداء |

### 🔒 وثائق الأمان والبنية
| الوثيقة | الوصف |
|:---|:---|
| [`SECURITY_PRODUCTION.md`](./SECURITY_PRODUCTION.md) | إعدادات أمان الإنتاج |
| [`DATABASE_MIGRATION_ANALYSIS.md`](./DATABASE_MIGRATION_ANALYSIS.md) | تحليل هجرة قاعدة البيانات |
| [`DATA_IMPORT_SAFETY.md`](./DATA_IMPORT_SAFETY.md) | معايير أمان استيراد البيانات |

---

**الإصدار:** 2.0.0 Enterprise  
**تاريخ:** أغسطس 2026  
**الحالة:** ✅ جاهز للعمل الحقيقي 100%  
**وحدة العمالة المهاجرة:** 📝 بانتظار التنفيذ