# 🏛️ UnionSphere Enterprise 2.0.0
## نظام إدارة الكيانات المؤسسية الحكومية
### وزارة الشؤون الاجتماعية والعمل - الجمهورية اليمنية

---

## 🚀 البدء السريع

```bash
# 1. استنساخ المشروع
git clone https://github.com/dynamicyemen24-hash/unionministry.git
cd unionministry

# 2. تثبيت الاعتمادات
pnpm install

# 3. إعداد المتغيرات
cp .env.example .env.local
# تعديل .env.local بالقيم الخاصة بك

# 4. تشغيل في وضع التطوير
pnpm run dev

# 5. بناء للإنتاج
pnpm run build
```

---

## 📁 بنية المشروع

```
src/
├── app/
│   ├── components/           # مكوّنات واجهة المستخدم
│   ├── contexts/            # سياقات التطبيق
│   ├── middleware/          # الوسيطات
│   │   └── security.middleware.ts  # الأمان المؤسسي
│   ├── pages/              # الصفحات
│   ├── types/              # تعريفات TypeScript
│   │   ├── entity.ts       # كيانات المنظمات
│   │   ├── commercial.ts   # المنشآت التجارية
│   │   └── commercial-full.ts # النظام النووي
│   └── utils/              # أدوات مساعدة
│       ├── operations.ts    # النظام التشغيلي
│       ├── backup.ts       # النسخ الاحتياطي
│       ├── sync.ts         # المزامنة
│       ├── security.ts     # الأمان
│       └── error-handler.ts # الأخطاء
├── styles/                 # الأنماط
└── main.tsx               # نقطة الدخول
```

---

## ⚙️ المتغيرات البيئية

### Frontend (.env)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_NAME="UnionSphere Enterprise"
VITE_APP_VERSION="2.0.0"
```

### Backend (Vercel Environment)
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ENCRYPTION_KEY=backup-encryption-key
JWT_SECRET_KEY=your_jwt_secret
```

---

## 🛠️ السكربتات المتاحة

```bash
pnpm run dev          # تطوير
pnpm run build        # بناء
pnpm run preview      # معاينة
pnpm run test         # اختبارات
pnpm run type-check   # فحص TypeScript
pnpm run health-check # فحص الصحة
pnpm run backup       # نسخة احتياطية
pnpm run cleanup      # تنظيف
```

---

## 🔒 الأمان المؤسسي

- ✅ Security Headers (HSTS, CSP, X-Frame-Options)
- ✅ Rate Limiting (100 طلب/دقيقة)
- ✅ تشفير النسخ الاحتياطية
- ✅ Audit Logging شامل
- ✅ Session Management
- ✅ CSRF Protection

---

## 📊 المؤشرات الحالية

| المكوّن | الحالة |
|--------|--------|
| الأمان | ✅ مكتمل |
| النسخ الاحتياطي | ✅ مكتمل |
| المزامنة | ✅ مكتمل |
| التقارير | ✅ مكتمل |
| دورة الحياة | ✅ مكتمل |
| الوثائق | ✅ مكتمل |
| النشر | ✅ جاهز |

---

## 🤝 الدعم الفني

- البريد: support@unionsphere.gov.ye
- الطوارئ: +967 1 234 567

---

**صُنع بحب في اليمن 🇾🇪**
**July 2026 - الإصدارة 2.0.0**