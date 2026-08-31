# Deployment Runbook — Yemen National Labor Platform
## دليل النشر والتشغيل — الإصدار 2.4.0

> **آخر تحديث:** 2026-08-30
> **الاستخدام:** عند نشر نسخة جديدة، استعادة نسخة سابقة، تشخيص أعطال في الإنتاج
> **المستوى المطلوب:** DevOps / SRE / Lead Engineer

---

## 📑 جدول المحتويات

1. [المتطلبات الأساسية](#المتطلبات-الأساسية)
2. [النشر على Staging](#النشر-على-staging)
3. [النشر على Production](#النشر-على-production)
4. [التحقق بعد النشر](#التحقق-بعد-النشر)
5. [التراجع (Rollback)](#التراجع-rollback)
6. [تشخيص الأعطال](#تشخيص-الأعطال)
7. [الصيانة الدورية](#الصيانة-الدورية)
8. [الطوارئ](#الطوارئ)

---

## المتطلبات الأساسية

### الأدوات المطلوبة

```bash
node --version    # ≥ 20.0.0
pnpm --version    # ≥ 8.15.9
psql --version    # ≥ 16.0
vercel --version  # ≥ 32.0
```

### الوصول المطلوب

| الخدمة | الحساب | الصلاحية |
|--------|--------|----------|
| GitHub | `union-ministry-bot` | Repository Write |
| Vercel | `unionsphere-deploy` | Project Owner |
| Neon | `ops@yemen-labour.gov` | Admin |
| Sentry | `platform-team` | Issue Owner |
| Slack | `#national-labor-ops` | Post |

### متغيرات البيئة الإلزامية

```bash
# Critical
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ char secret>
SESSION_SECRET=<32+ char secret>
BACKUP_KEY=<64 hex chars>
NODE_ENV=production
CORS_ORIGIN=https://unionsphere.vercel.app
ENABLE_AUTH=true

# Optional but recommended
SENTRY_DSN=https://...@sentry.io/...
TELEMETRY_FLUSH_URL=/api/telemetry/errors
```

---

## النشر على Staging

### الخطوة 1: التحقق من البوابات

```bash
# تشغيل بوابات الجاهزية محلياً
node scripts/validate-env.mjs
node scripts/check-server-syntax.mjs
pnpm type-check
pnpm lint
pnpm test
```

**النجاح المتوقع:**
```
✅ READY for deployment
🔴 Critical: 0
🟡 Warnings: 0
✅ Tests: 40/40 passed
```

### الخطوة 2: تطبيق Migrations

```bash
# نسخة احتياطية قبل أي تغيير
node scripts/backup-db.mjs

# فحص الـ migrations المعلقة
ls -la supabase/migrations/*.sql | tail -5

# تطبيق الـ migrations بالترتيب الزمني
for f in supabase/migrations/2026*.sql; do
  echo "Applying $f..."
  node scripts/apply-migration.mjs "$f"
done
```

### الخطوة 3: النشر

```bash
git checkout develop
git pull origin develop
git merge --no-ff feature/your-branch
git push origin develop

# Vercel سيقوم بـ auto-deploy على staging
# أو يدوياً:
vercel deploy --prod=false --yes
```

### الخطوة 4: Smoke Tests

```bash
# انتظر 30 ثانية للنشر
sleep 30

# تشغيل E2E smoke tests
node scripts/e2e-smoke-test.mjs https://staging.unionsphere.vercel.app
```

**النجاح المتوقع:**
```
🔬 E2E Smoke Tests Complete
✅ Passed: 25/25
❌ Failed: 0
🎉 All smoke tests passed — system is healthy
```

---

## النشر على Production

### ⚠️ قبل النشر

- [ ] تم اختبار النسخة على Staging بنجاح لمدة ≥ 24 ساعة
- [ ] لا توجد أخطاء open في `client_error_log` (last_seen > 24h)
- [ ] تم إجراء code review وموافقة ≥ 2 مراجعين
- [ ] تم تحديث CHANGELOG.md
- [ ] لا توجد migrations غير مطبقة في staging

### الإجراء

```bash
# 1. تأكيد الفرع
git checkout main && git pull origin main

# 2. Merge من staging
git merge --no-ff develop -m "release: v2.4.0"

# 3. Tag النسخة
git tag -a v2.4.0 -m "Production release v2.4.0"
git push origin main --tags

# 4. النشر عبر GitHub Actions
# اذهب إلى: Actions → Deploy to Production → Run workflow
# - environment: production
# - skip_tests: false

# 5. مراقبة
watch -n 5 'curl -s https://unionsphere.vercel.app/api/health | jq .'
```

---

## التحقق بعد النشر

### قائمة الفحوصات

| الفحص | الأمر | النتيجة المتوقعة |
|-------|-------|------------------|
| Health | `curl /api/health` | `200 OK` + `status: healthy` |
| Auth | `curl -X POST /api/auth/login` | `401` للبيانات الخاطئة |
| Directories | `curl /api/national-occupations` | `200 OK` مع array |
| Security headers | `curl -I /` | HSTS, CSP, X-Frame-Options |
| Frontend | `curl /` | HTML بدون 404 |
| Smoke tests | `node scripts/e2e-smoke-test.mjs` | 25/25 passed |
| Lighthouse | `pnpm run perf:check` | score ≥ 90 |

### مراقبة في أول 15 دقيقة

```bash
# 1. Health endpoint كل 30 ثانية
for i in {1..30}; do
  curl -s -o /dev/null -w "%{http_code} " https://unionsphere.vercel.app/api/health
  sleep 30
done

# 2. تتبع الأخطاء الفورية
psql $DATABASE_URL -c "SELECT severity, COUNT(*) FROM client_error_log
                       WHERE last_seen > NOW() - INTERVAL '5 minutes'
                       GROUP BY severity;"

# 3. التحقق من Performance Vitals
psql $DATABASE_URL -c "SELECT metric_name, AVG(metric_value), metric_rating
                       FROM client_vitals_log
                       WHERE received_at > NOW() - INTERVAL '5 minutes'
                       GROUP BY metric_name, metric_rating;"
```

---

## التراجع (Rollback)

### تراجع سريع عبر Vercel

```bash
# 1. اذهب إلى Vercel Dashboard
# 2. Deployments → اختر النسخة السابقة
# 3. "Promote to Production"
```

### تراجع عبر Git

```bash
# 1. حدد آخر commit ناجح
git log --oneline -10

# 2. ارجع وحرر Tag
git revert <bad-commit-sha>
git push origin main

# أو hard reset (حذر):
git reset --hard v2.3.9
git push --force origin main
```

### تراجع قاعدة البيانات

```bash
# 1. إيقاف التطبيق لتفادي الكتابة
vercel env pull .env.production
# Set MAINTENANCE_MODE=true in Vercel

# 2. استعادة النسخة الاحتياطية
node scripts/restore-db.mjs --confirm backups/backup-YYYYMMDDTHHMMSS.enc

# 3. إعادة التطبيق
# Remove MAINTENANCE_MODE
```

**⚠️ تحذير:** استعادة قاعدة البيانات ستفقد أي بيانات أُنشئت منذ آخر backup. للأمان، خذ backup جديد قبل الاستعادة.

---

## تشخيص الأعطال

### الأعراض → الأسباب → الحلول

| العرض | السبب المحتمل | التشخيص | الحل |
|-------|--------------|---------|------|
| 500 errors | DB connection lost | `psql $DATABASE_URL -c "SELECT 1"` | تحقق من Neon dashboard |
| Slow responses | Cache miss | `curl /api/metrics` | راجع cache hit rate |
| Login failures | JWT secret rotated | اعرض stack trace | تأكد من `JWT_SECRET` في Vercel |
| CORS errors | CORS_ORIGIN wrong | Network tab في المتصفح | حدّث CORS_ORIGIN |
| 429 rate limit | Bot/abuse | اعرض `/api/metrics` | راجع rate-limit config |
| Empty dashboards | Failed migration | `psql -c "\dt"` | طبّق migrations المعلقة |

### سجلات يجب مراقبتها

```bash
# Vercel logs
vercel logs --production --follow

# Server logs (إذا كان deployed on VPS)
pm2 logs unionsphere --lines 200

# Database slow queries
psql $DATABASE_URL -c "SELECT query, calls, mean_exec_time
                       FROM pg_stat_statements
                       ORDER BY mean_exec_time DESC
                       LIMIT 20;"

# Client errors
psql $DATABASE_URL -c "SELECT severity, message, count, last_seen
                       FROM client_error_log
                       WHERE last_seen > NOW() - INTERVAL '1 hour'
                       ORDER BY last_seen DESC;"
```

---

## الصيانة الدورية

### يومية (automated via GitHub Actions)

- ✅ النسخ الاحتياطي: 03:00 AM UTC
- ✅ تنظيف السجلات > 30 يوم
- ✅ تجديد rate-limit counters
- ✅ تحديث `client_vitals_log` aggregates

### أسبوعية

- [ ] مراجعة `client_error_log` للـ fatal errors
- [ ] فحص أداء Web Vitals (p95, p99)
- [ ] تحديث dependencies ثانوية (`pnpm update --interactive`)
- [ ] مراجعة disk space في Neon

### شهرية

- [ ] تدوير `JWT_SECRET` (كل 90 يوم)
- [ ] تدوير `BACKUP_KEY` (كل 180 يوم)
- [ ] اختبار disaster recovery (نسخة احتياطية + استعادة)
- [ ] مراجعة security advisories
- [ ] تحديث dependencies رئيسية

---

## الطوارئ

### في حالة تعطل كامل

```bash
# 1. اعرض الحالة الحالية
vercel status
psql $DATABASE_URL -c "SELECT NOW();"

# 2. تحقق من الـ health
curl -v https://unionsphere.vercel.app/api/health

# 3. اعرض السجلات
vercel logs --production --since 5m

# 4. أنشئ incident في Slack
# @oncall — "#national-labor-ops" — "Production down — investigating"

# 5. فعّل maintenance mode إذا لزم
vercel env add MAINTENANCE_MODE true production
```

### في حالة تسرب بيانات

1. **فوراً:** أوقف التطبيق (`MAINTENANCE_MODE=true`)
2. **خلال 30 دقيقة:** غيّر جميع الأسرار (`JWT_SECRET`, `BACKUP_KEY`, `DATABASE_URL`)
3. **خلال ساعة:** أبلغ فريق الأمان والمستخدمين
4. **خلال 24 ساعة:** راجع access logs وحدد النطاق
5. **خلال أسبوع:** انشر post-mortem

### في حالة خطأ في Migration

```bash
# 1. اعرض migrations المطبقة
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY version;"

# 2. اعرض ما فشل
node scripts/check-db-drift.mjs

# 3. استعد من الـ backup
node scripts/backup-db.mjs  # نسخة جديدة أولاً
node scripts/restore-db.mjs --confirm backups/backup-XXX.enc
```

---

## معلومات الاتصال

| الدور | الشخص | رقم الطوارئ | التوفر |
|-------|-------|------------|--------|
| Lead Engineer | أحمد المريسي | +967-XXX-XXXX | 24/7 |
| DevOps | سامي العولقي | +967-XXX-XXXX | 24/7 |
| Security | فاطمة الحميري | +967-XXX-XXXX | أيام العمل |
| Product Owner | د. خالد | +967-XXX-XXXX | أيام العمل |

---

## المسارات المهمة

| الخدمة | الرابط |
|--------|--------|
| Production | https://unionsphere.vercel.app |
| Staging | https://staging.unionsphere.vercel.app |
| GitHub | https://github.com/your-org/unionministry1 |
| Vercel | https://vercel.com/dashboard |
| Neon | https://console.neon.tech |
| Sentry | https://sentry.io/organizations/yemen-labor |
| Status Page | https://status.yemen-labour.gov |

---

**📝 ملاحظة أخيرة:** قبل أي عملية نشر، اقرأ هذا المستند كاملاً. في حالة الشك، اختر **التراجع** على **المخاطرة**.
