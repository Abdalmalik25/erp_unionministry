# دليل النشر والتشغيل 🚀

## منصة UnionSphere - الإصدار الإنتاجي

---

## 📋 قائمة التحقق قبل النشر

### ✅ المتطلبات الأساسية
- [ ] Node.js 18+ مثبت
- [ ] pnpm مثبت
- [ ] حساب Supabase نشط
- [ ] نطاق (Domain) للمنصة
- [ ] شهادة SSL

---

## 🔧 إعداد البيئة الإنتاجية

### 1. إعداد Supabase

#### أ. إنشاء المشروع
1. سجل دخول إلى [Supabase](https://supabase.com)
2. أنشئ مشروع جديد
3. انسخ:
   - `Project URL`
   - `Anon (public) key`
   - `Service Role key`

#### ب. تفعيل Authentication
```sql
-- في SQL Editor بـ Supabase
-- تفعيل Email Authentication
```

#### ج. إنشاء مستخدم تجريبي
```bash
# استخدم Supabase Dashboard
# Authentication > Users > Add User

البريد: admin@ministry.gov.ye
كلمة المرور: [كلمة مرور قوية]
Metadata:
{
  "name": "مدير النظام",
  "role": "وكيل الوزارة",
  "userType": "ministry"
}
```

### 2. إعداد Edge Functions

#### رفع Edge Functions إلى Supabase
```bash
# تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref <your-project-ref>

# نشر Edge Functions
supabase functions deploy server
```

### 3. إضافة البيانات الأولية

#### أ. استدعاء endpoint البيانات الأولية
```bash
curl -X POST \
  https://<project-id>.supabase.co/functions/v1/make-server-c73879ee/init-data \
  -H "Authorization: Bearer <anon-key>"
```

#### ب. أو استخدام Postman/Insomnia
```
POST https://<project-id>.supabase.co/functions/v1/make-server-c73879ee/init-data
Headers:
  Authorization: Bearer <anon-key>
```

---

## 🏗️ بناء المشروع للإنتاج

### 1. تثبيت الاعتماديات
```bash
pnpm install --frozen-lockfile
```

### 2. بناء التطبيق
```bash
pnpm build
```

### 3. معاينة البناء محلياً
```bash
pnpm preview
```

---

## 🌐 النشر على الإنتاج

### خيار 1: Vercel (موصى به)

#### أ. ربط المستودع
1. سجل دخول إلى [Vercel](https://vercel.com)
2. Import Repository
3. اختر المستودع

#### ب. إعداد المتغيرات البيئية
```env
# في Vercel Dashboard > Settings > Environment Variables

VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

#### ج. إعدادات البناء
```
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

#### د. النشر
```bash
# تلقائي عند push إلى main branch
git push origin main
```

### خيار 2: Netlify

#### أ. ربط المستودع
1. سجل دخول إلى [Netlify](https://netlify.com)
2. New site from Git
3. اختر المستودع

#### ب. Build Settings
```
Build command: pnpm build
Publish directory: dist
```

#### ج. Environment Variables
مثل Vercel

### خيار 3: خادم خاص (VPS)

#### أ. متطلبات الخادم
- Ubuntu 20.04+ أو CentOS 8+
- 2GB RAM على الأقل
- 20GB مساحة تخزين
- Nginx أو Apache

#### ب. خطوات النشر
```bash
# 1. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. تثبيت pnpm
npm install -g pnpm

# 3. استنساخ المشروع
git clone <repository-url>
cd code

# 4. تثبيت الاعتماديات
pnpm install

# 5. بناء المشروع
pnpm build

# 6. تثبيت PM2 لإدارة العملية
npm install -g pm2

# 7. تشغيل مع PM2
pm2 start "pnpm preview" --name unionsphere
pm2 save
pm2 startup
```

#### ج. إعداد Nginx
```nginx
# /etc/nginx/sites-available/unionsphere

server {
    listen 80;
    server_name unionspheregov.ye www.unionsphere.gov.ye;

    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/unionsphere /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### د. تثبيت SSL مع Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d unionsphere.gov.ye -d www.unionsphere.gov.ye
```

---

## 🔒 تأمين البيئة الإنتاجية

### 1. Supabase Row Level Security (RLS)

#### أ. تفعيل RLS على الجداول
```sql
-- في Supabase SQL Editor

-- تأمين بيانات النقابات
-- Note: استخدم Supabase Dashboard لإنشاء policies
-- أو تواصل مع فريق التطوير لإعداد RLS policies مخصصة
```

### 2. تأمين Edge Functions
```typescript
// في server/index.tsx
// تأكد من التحقق من الصلاحيات في كل endpoint

const verifyAuth = async (c: Context) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return c.json({ error: 'غير مصرح' }, 401);
  }
  // التحقق من الـ token
};
```

### 3. معدل الطلبات (Rate Limiting)
استخدم Supabase Built-in Rate Limiting أو أضف middleware:

```typescript
// مثال Rate Limiting
const rateLimit = new Map();

app.use('*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  if (rateLimit.has(ip)) {
    const { count, timestamp } = rateLimit.get(ip);
    if (now - timestamp < 60000 && count > 100) {
      return c.json({ error: 'تجاوزت الحد المسموح من الطلبات' }, 429);
    }
  }
  
  await next();
});
```

### 4. CORS
```typescript
// تأكد من تحديد Origins المسموحة
app.use("/*", cors({
  origin: ["https://unionsphere.gov.ye", "https://www.unionsphere.gov.ye"],
  // ... باقي الإعدادات
}));
```

---

## 📊 المراقبة والصيانة

### 1. Logging

#### Supabase Logs
- افتح Supabase Dashboard
- اذهب إلى Logs > Edge Functions
- راقب الأخطاء والتحذيرات

#### Application Logs (VPS)
```bash
# PM2 logs
pm2 logs unionsphere

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. مراقبة الأداء

#### أ. Vercel Analytics
```bash
# تفعيل Analytics في Vercel Dashboard
```

#### ب. Google Analytics (اختياري)
```html
<!-- أضف في index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
```

### 3. النسخ الاحتياطي

#### قاعدة البيانات
```bash
# Supabase يوفر نسخ احتياطية تلقائية
# أو استخدم:
# Dashboard > Database > Backups
```

#### الملفات
```bash
# نسخ احتياطي يومي
0 2 * * * /usr/bin/tar -czf /backup/unionsphere-$(date +\%Y\%m\%d).tar.gz /var/www/unionsphere
```

---

## 🔄 التحديثات

### نشر تحديث جديد

#### Vercel/Netlify
```bash
git add .
git commit -m "Update: [description]"
git push origin main
# التحديث تلقائي
```

#### VPS
```bash
# 1. سحب التحديثات
git pull origin main

# 2. تثبيت اعتماديات جديدة (إن وجدت)
pnpm install

# 3. إعادة البناء
pnpm build

# 4. إعادة تشغيل التطبيق
pm2 restart unionsphere
```

---

## 🆘 استكشاف الأخطاء

### مشكلة: التطبيق لا يعمل

#### التحقق من:
1. **Logs**
```bash
pm2 logs unionsphere --lines 100
```

2. **المنافذ**
```bash
sudo netstat -tulpn | grep :4173
```

3. **Nginx**
```bash
sudo nginx -t
sudo systemctl status nginx
```

### مشكلة: خطأ في الاتصال بـ Supabase

#### التحقق من:
1. Project URL صحيح
2. Anon Key صحيح
3. Edge Functions منشورة
4. Supabase Project نشط

### مشكلة: بطء التطبيق

#### الحلول:
1. تفعيل Caching في Nginx
2. استخدام CDN (Cloudflare)
3. تحسين Queries
4. تصغير Assets

---

## 📞 الدعم الفني

### للمساعدة:
- 📧 Email: tech@unionsphere.gov.ye
- 📞 الهاتف: +967 1 234567
- 💬 التذاكر: support.unionsphere.gov.ye

---

## ✅ قائمة التحقق النهائية

قبل الإطلاق الرسمي، تأكد من:

- [ ] جميع Environment Variables مضبوطة
- [ ] SSL شهادة مثبتة وتعمل
- [ ] Supabase Auth يعمل
- [ ] Edge Functions منشورة
- [ ] البيانات الأولية مضافة
- [ ] مستخدم admin تم إنشاؤه
- [ ] النسخ الاحتياطية مجدولة
- [ ] Monitoring مفعل
- [ ] RLS policies مضبوطة (إن أمكن)
- [ ] Rate Limiting مفعل
- [ ] CORS محدد بالـ Origins الصحيحة
- [ ] Error Pages مخصصة
- [ ] التطبيق تم اختباره كاملاً
- [ ] التوثيق كامل
- [ ] فريق الدعم جاهز

---

**تاريخ آخر تحديث:** مايو 2026  
**الإصدار:** 1.0.0  
**الحالة:** ✅ جاهز للنشر

---

بالتوفيق! 🎉
