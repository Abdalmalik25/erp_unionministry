# 🚀 دليل النشر على GitHub - UnionSphere Enterprise

## خطوات النشر على GitHub

### 1. تهيئة المستودع
```bash
# تهيئة git
git init

# إضافة جميع الملفات
git add .

# Commit أولي
git commit -m "feat: UnionSphere Enterprise 2.0.0 - Complete operational system upgrade"
```

### 2. ربط المستودع بالريموت
```bash
# إضافة الريموت (استبدل باسم المستودع الخاص بك)
git remote add origin https://github.com/dynamicyemen24-hash/unionministry.git

# أو إذا كان المستودع موجود
git remote set-url origin https://github.com/dynamicyemen24-hash/unionministry.git
```

### 3. رفع الملفات
```bash
# رفع إلى الفرع الرئيسي
git push -u origin main

# أو إذا كان هناك فرع مختلف
git push -u origin master
```

### 4. إعداد GitHub Actions (موجود مسبقاً)
الملف `.github/workflows/deploy.yml` مُعدّ مسبقاً وسيُنشر تلقائياً عند كل push إلى main.

---

## 📋 الملفات الجاهزة للرفع

### ملفات النظام المؤسسي الجديدة:
- `src/app/utils/operations.ts` ✅
- `src/app/utils/backup.ts` ✅
- `src/app/utils/sync.ts` ✅
- `src/app/utils/error-handler.ts` ✅
- `src/app/middleware/security.middleware.ts` ✅
- `src/app/types/commercial-full.ts` ✅

### ملفات الوثائق:
- `OPERATIONAL_WORKFLOW.md` ✅
- `ENTERPRISE_UPGRADE_SUMMARY.md` ✅
- `README_UNIONSPHERE.md` ✅

### ملفات الإعداد:
- `vercel.json` ✅
- `.env.example` ✅
- `package.json` ✅

---

## 🎯 ما بعد الرفع

### 1. ربط Vercel
- انتقل إلى https://vercel.com
- استورد المستودع من GitHub
- أضف المتغيرات البيئية من `.env.example`

### 2. إعداد Supabase
- أنشئ مشروعاً جديداً أو استخدم موجود
- أنشئ جداول الكيانات التجارية من `schema.sql`

### 3. اختبار النظام
```bash
pnpm run build
pnpm run preview
```

---

## 📞 الدعم
- البريد: support@unionsphere.gov.ye
- الطوارئ: +967 1 234 567

**تم الانتهاء من جميع التحسينات المؤسسية - النظام جاهز 100% للنشر!**