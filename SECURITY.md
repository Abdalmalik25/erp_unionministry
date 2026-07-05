# دليل الأمان 🔒

## منصة UnionSphere - إرشادات الأمان وأفضل الممارسات

---

## 🛡️ نظرة عامة على الأمان

تم تصميم منصة UnionSphere مع التركيز على الأمان والحماية على جميع المستويات:
- **Frontend Security**: حماية واجهة المستخدم
- **Backend Security**: تأمين الخادم وقاعدة البيانات
- **Authentication**: نظام مصادقة قوي
- **Authorization**: صلاحيات دقيقة
- **Data Protection**: حماية البيانات الحساسة

---

## 🔐 المصادقة والصلاحيات

### 1. نظام المصادقة (Authentication)

#### Supabase Auth
```typescript
// استخدام Supabase Auth للمصادقة
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// التحقق من الجلسة
const { data: { session } } = await supabase.auth.getSession();
```

#### مزايا الأمان:
- ✅ JWT Tokens آمنة
- ✅ Session Management تلقائي
- ✅ Auto Refresh للـ Tokens
- ✅ Secure Password Hashing (bcrypt)

### 2. الصلاحيات (Authorization)

#### Protected Routes
```typescript
// حماية المسارات حسب نوع المستخدم
<ProtectedRoute requireMinistry>
  <MinistryDashboard />
</ProtectedRoute>
```

#### التحقق من الصلاحيات في API
```typescript
// في server/index.tsx
const verifyAuth = async (c: Context) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return c.json({ error: 'غير مصرح' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return c.json({ error: 'جلسة غير صالحة' }, 401);
  }

  return user;
};
```

---

## 🔍 التحقق من البيانات (Validation)

### 1. التحقق من المدخلات

#### Frontend Validation
```typescript
import { validate, unionValidationSchema } from './utils/validation';

// التحقق قبل الإرسال
const errors = validate(formData, unionValidationSchema);

if (Object.keys(errors).length > 0) {
  // عرض الأخطاء للمستخدم
  return;
}
```

#### قواعد التحقق المُطبقة:
- ✅ Required Fields
- ✅ Pattern Matching (Regex)
- ✅ Min/Max Length
- ✅ Min/Max Values
- ✅ Custom Validators
- ✅ Email Format
- ✅ Phone Format (Yemeni)
- ✅ National ID Format (Yemeni)

### 2. Sanitization

```typescript
import { sanitizeData } from './utils/validation';

// تنظيف البيانات قبل الإرسال
const cleanData = sanitizeData(formData);
```

#### عمليات التنظيف:
- إزالة المسافات الزائدة
- إزالة null/undefined
- تحويل النصوص إلى lowercase (عند الحاجة)
- إزالة HTML tags (إن وجدت)

---

## 🚫 الحماية من الهجمات الشائعة

### 1. XSS (Cross-Site Scripting)

#### الحماية المُطبقة:
```typescript
// React تقوم تلقائياً بـ Escape للـ HTML
<div>{userInput}</div> // آمن

// استخدام dangerouslySetInnerHTML فقط عند الضرورة
// وبعد Sanitization
```

#### أفضل الممارسات:
- ❌ لا تستخدم `dangerouslySetInnerHTML` إلا عند الضرورة القصوى
- ✅ استخدم مكتبة DOMPurify للـ Sanitization إذا لزم
- ✅ Validate جميع المدخلات من المستخدم

### 2. SQL Injection

#### الحماية:
```typescript
// Supabase تستخدم Prepared Statements تلقائياً
// لا حاجة لـ Manual Escaping

await kv.set(`union:${unionNumber}`, data); // آمن
```

### 3. CSRF (Cross-Site Request Forgery)

#### الحماية المُطبقة:
- ✅ SameSite Cookies
- ✅ CORS محدد بـ Origins معينة
- ✅ Token-based Authentication

```typescript
// في server/index.tsx
app.use("/*", cors({
  origin: ["https://unionsphere.gov.ye"],
  credentials: true,
}));
```

### 4. Injection Attacks

#### الحماية:
```typescript
// التحقق من جميع المدخلات
const validateYemeniNationalId = (id: string): boolean => {
  if (!/^[0-9]{11}$/.test(id)) return false;
  // المزيد من التحقق...
  return true;
};
```

---

## 🔑 إدارة كلمات المرور

### 1. قوة كلمة المرور

```typescript
export function validatePasswordStrength(password: string) {
  // الحد الأدنى 8 أحرف
  if (password.length < 8) return false;

  // يجب أن تحتوي على:
  // - حرف صغير
  // - حرف كبير
  // - رقم
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasLower && hasUpper && hasNumber;
}
```

### 2. تخزين كلمات المرور

- ✅ Supabase تستخدم bcrypt للتشفير
- ✅ Salt فريد لكل كلمة مرور
- ✅ لا يتم تخزين كلمات المرور بشكل نصي

### 3. إعادة تعيين كلمة المرور

```typescript
// استخدام Supabase Password Reset
const { data, error } = await supabase.auth.resetPasswordForEmail(
  email,
  { redirectTo: 'https://unionsphere.gov.ye/reset-password' }
);
```

---

## 📊 حماية البيانات الحساسة

### 1. تصنيف البيانات

#### بيانات عالية الحساسية:
- الأرقام الوطنية
- كلمات المرور
- المعلومات المالية

#### الحماية المُطبقة:
```typescript
// عدم عرض الرقم الوطني كاملاً
const maskNationalId = (id: string) => {
  return `***${id.slice(-4)}`;
};

// تشفير البيانات الحساسة قبل التخزين (إن لزم)
```

### 2. HTTPS Only

```nginx
# إعادة توجيه HTTP إلى HTTPS
server {
    listen 80;
    server_name unionsphere.gov.ye;
    return 301 https://$server_name$request_uri;
}
```

### 3. Secure Headers

```typescript
// في server/index.tsx
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  await next();
});
```

---

## 🚦 Rate Limiting

### تحديد معدل الطلبات

```typescript
// حماية من Brute Force Attacks
const MAX_REQUESTS = 100;
const TIME_WINDOW = 60000; // 1 دقيقة

const rateLimit = new Map<string, { count: number; timestamp: number }>();

app.use('*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();

  if (rateLimit.has(ip)) {
    const { count, timestamp } = rateLimit.get(ip)!;
    
    if (now - timestamp < TIME_WINDOW) {
      if (count > MAX_REQUESTS) {
        return c.json({ error: 'تجاوزت الحد المسموح' }, 429);
      }
      rateLimit.set(ip, { count: count + 1, timestamp });
    } else {
      rateLimit.set(ip, { count: 1, timestamp: now });
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }

  await next();
});
```

---

## 📝 Audit Logging

### تسجيل العمليات الحساسة

```typescript
// تسجيل كل عملية في سجل التدقيق
const logAudit = async (operation: {
  user: string;
  action: string;
  table: string;
  recordId: string;
  oldData?: any;
  newData?: any;
  ip: string;
}) => {
  await kv.set(`audit:${Date.now()}`, {
    ...operation,
    timestamp: new Date().toISOString(),
  });
};

// مثال الاستخدام
await logAudit({
  user: user.email,
  action: 'CREATE',
  table: 'unions',
  recordId: unionData.unionNumber,
  newData: unionData,
  ip: c.req.header('x-forwarded-for') || 'unknown',
});
```

---

## 🔧 إعدادات الأمان الموصى بها

### 1. Environment Variables

```env
# لا تشارك هذه المتغيرات أبداً
SUPABASE_SERVICE_ROLE_KEY=<keep-secret>

# استخدم .env.local للتطوير المحلي
# لا تضف .env.local إلى Git
```

### 2. Git Security

```gitignore
# .gitignore
.env
.env.local
.env.production
*.key
*.pem
secrets/
```

### 3. Dependency Security

```bash
# فحص الثغرات الأمنية بانتظام
pnpm audit

# تحديث الاعتماديات
pnpm update

# استخدام Dependabot في GitHub
```

---

## 🚨 الاستجابة للحوادث الأمنية

### 1. اكتشاف الحادثة

#### مراقبة:
- سجلات الخادم
- سجلات Supabase
- معدل الطلبات غير الطبيعي
- محاولات تسجيل دخول فاشلة متكررة

### 2. الاستجابة

1. **العزل**: عزل النظام المصاب
2. **التحليل**: تحليل السجلات لفهم الهجوم
3. **المعالجة**: إصلاح الثغرة
4. **الاستعادة**: استعادة البيانات من النسخ الاحتياطية
5. **التوثيق**: توثيق الحادثة والدروس المستفادة

### 3. الإبلاغ

```
جهات الاتصال في حالة الطوارئ:
- 📧 security@unionsphere.gov.ye
- 📞 +967 1 234567
- 🚨 خط ساخن: +967 777 111 222
```

---

## ✅ قائمة التحقق الأمنية

### قبل النشر:

- [ ] جميع Passwords آمنة وقوية
- [ ] Environment Variables محمية
- [ ] HTTPS مفعل
- [ ] CORS محدد
- [ ] Rate Limiting مفعل
- [ ] Input Validation شامل
- [ ] SQL Injection محمي
- [ ] XSS محمي
- [ ] CSRF محمي
- [ ] Secure Headers مضافة
- [ ] Audit Logging يعمل
- [ ] Backup System جاهز
- [ ] Monitoring مفعل
- [ ] Security Testing تم
- [ ] Incident Response Plan جاهز

### بشكل دوري:

- [ ] مراجعة السجلات (أسبوعياً)
- [ ] فحص الثغرات (`pnpm audit`) (شهرياً)
- [ ] تحديث الاعتماديات (شهرياً)
- [ ] مراجعة الصلاحيات (ربع سنوي)
- [ ] اختبار النسخ الاحتياطية (ربع سنوي)
- [ ] تدريب الفريق (سنوياً)
- [ ] Penetration Testing (سنوياً)

---

## 📚 مراجع إضافية

### الموارد:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---

## 📞 الإبلاغ عن ثغرة أمنية

إذا اكتشفت ثغرة أمنية:

1. **لا تنشرها علناً**
2. أرسل تفاصيل الثغرة إلى: security@unionsphere.gov.ye
3. انتظر الرد (خلال 48 ساعة)
4. تعاون مع الفريق لحل المشكلة

---

**آخر مراجعة:** مايو 2026  
**الإصدار:** 1.0.0  
**المسؤول الأمني:** فريق الأمان - وزارة الشؤون الاجتماعية والعمل

---

**الأمان هو مسؤولية الجميع** 🛡️
