# نظام التصميم الموحّد — دليل المطور

> **نظام التصميم المؤسسي**  
> منصة وزارة الشؤون الاجتماعية والعمل — إدارة المنظمات النقابية

---

## 1. هيكل الملفات

```
src/app/components/ui/
├── designSystem.ts        ← الثوابت، الألوان، الأنماط، وظائف المساعدة (مصدر الحقيقة)
├── index.ts               ← نقطة دخول موحّدة لاستيراد كل المكوّنات
├── Button.tsx             ← أزرار (primary, secondary, success, danger, gold, outline, ghost)
├── Input.tsx              ← حقول إدخال + Textarea + Select
├── Card.tsx               ← Card, StatsCard, AdvancedCard, TieredCard
├── Modal.tsx              ← نافذة منبثقة قياسية
├── ConfirmDialog.tsx      ← تأكيد الإجراءات الحرجة + useConfirm hook
├── StatusBadge.tsx        ← شارة الحالة (مرتبطة بـ designSystem)
├── EmptyState.tsx         ← حالة الفراغ الموحّدة
├── FilterBar.tsx          ← شريط البحث والتصفية الموحّد
├── ActionButtons.tsx      ← أزرار العرض/تعديل/حذف/تصدير (موحّدة)
├── PageHeader.tsx         ← ترويسة الصفحات مع Breadcrumbs
├── Toast.tsx              ← إشعارات + useToast + toast()
├── LoadingSkeleton.tsx    ← هياكل تحميل (Skeleton و TableSkeleton و...)
├── PageTransition.tsx     ← أنيميشن انتقال الصفحات
└── SplashScreen.tsx       ← شاشة البداية
```

---

## 2. طريقة الاستخدام

### الاستيراد الموحّد عبر النقطة الواحدة
```ts
import {
  Button,
  Card,
  StatusBadge,
  EmptyState,
  FilterBar,
  ActionButtons,
  PageHeader,
  Modal,
  toast,
} from '@/components/ui';
```

### الاستيراد المباشر (مسموح أيضاً)
```ts
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
```

---

## 3. المكوّنات المركزية

### StatusBadge
```tsx
<StatusBadge status="approved" showDot />      // معتمد — أخضر
<StatusBadge status="ongoing" />               // جارٍ — أزرق
<StatusBadge status="resolved" />              // محلول — أخضر
```

**كيف يعمل؟** يستخدم `STATUS_STYLES` من `designSystem.ts`. إذا أردت إضافة حالة جديدة:
1. أضف المفتاح والقيمة إلى `STATUS_STYLES`.
2. أضف الترجمة إلى دالة `translateStatus`.

### EmptyState
```tsx
<EmptyState
  title="لا توجد بيانات"
  description="لم يتم العثور على سجلات مطابقة لبحثك"
  action={<Button onClick={resetFilters}>إعادة ضبط</Button>}
/>
```

### FilterBar
```tsx
<FilterBar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="ابحث..."
  filters={[
    { key: 'status', label: 'جميع الحالات', type: 'select',
      options: [{value:'open',label:'مفتوح'},{value:'resolved',label:'محلول'}] },
  ]}
  filterValues={{ status }}
  onFilterChange={(k,v)=>setStatus(v)}
  actions={<Button icon={<Plus/>}>إضافة</Button>}
/>
```

### ActionButtons
```tsx
<ActionButtons
  actions={[
    { type: 'view', onClick: openView },
    { type: 'edit', onClick: openEdit },
    { type: 'delete', onClick: confirmDelete },
  ]}
/>
```

---

## 4. دمج المكوّنات في الشاشات (ترابط وتكامل)

كل شاشة إدارة تستخدام نفس النمط التالي لضمان الاتساق:

| العنصر في الشاشة | المكوّن الموحّد المستخدم |
|------------------|------------------------|
| شريط الترويسة | `PageHeader` |
| إحصائيات KPI | `StatsCard` أو بطاقات stat موحّدة |
| شريط البحث والتصفية | `FilterBar` |
| الجدول أو الشبكة | `table` + `StatusBadge` + `ActionButtons` |
| الحالة الفارغة | `EmptyState` |
| هياكل التحميل | `TableSkeleton` / `DashboardSkeleton` / `FormSkeleton` |
| النوافذ المنبثقة | `Modal` أو `ConfirmDialog` |
| الإشعارات | `toast.success / .error / .warning` |
| عمليات الحذف/التحذير | `useConfirm` |

---

## 5. الألوان والـ Tokens

| Token | القيمة |
|-------|--------|
| primary | `#1E3A8A` (لون الوزارة) |
| gold | `#C9A84C` (للتميز) |
| success | `#059669` |
| warning | `#D97706` |
| error | `#DC2626` |

استخدامها: `bg-primary`, `text-gold`, `border-error/20` (يعتمد على تعريفات Tailwind في `src/styles/index.css`).

---

## 6. إرشادات كتابة شاشة جديدة

1. استخرج البيانات المنطقية في `useState`/`useMemo`.
2. استخدم `PageHeader` للترويسة مع breadcrumbs.
3. استخدم `FilterBar` موحّد في أعلى القائمة.
4. ضع الجدول في `Card` أو `div.bg-white.rounded-xl`.
5. أنشئ أعمدة الحالة بـ `<StatusBadge status={row.status} />`.
6. أنشئ عمود الإجراءات بـ `<ActionButtons ... />` أو `<ActionButtons>` اليدوي.
7. استبدل الحالة الفارغة `paginated.length === 0` بـ `<EmptyState />`.
8. استخدم `LoadingSkeleton`/`TableSkeleton` أثناء التحميل (`loading ? ... : ...`).
9. أغلق النافذة بالكامل بـ `confirm` عند الحذف.
10. أرفق `logAudit` لكل إجراء تعديل / حذف / إنشاء.

---

## 7. الاختبار

```bash
# فحص الأنواع
pnpm typecheck          # أو: npx tsc --noEmit

# بناء الإنتاج
pnpm build

# التحقق من البيئة
pnpm dev
```

---

## 8. الرموز الدلالية والحالات (إصدار الهوية 2026)

> طبّق في 2026-08: تحويل شارات الحالات وأزرار الإجراءات من ألوان لوحة خام
> (emerald/gray/blue…) إلى **رموز دلالية متكيّفة مع الوضعين**:
> `bg-success/10` · `text-warning-dark` · `border-error/40` …
> — أي قيمة تلوين في نظام الحالات تمر عبر `--color-*` فتضيء صحيحة
> في الليل والنهار دون لمس إضافي.

| الحالة | دلالة | الأصناف |
|--------|-------|---------|
| active / approved / completed | نجاح | `bg-success/10 text-success dark:text-success-light` |
| suspended / pending / medium | تحذير | `bg-warning/10 text-warning-dark dark:text-warning-light` |
| dissolved / rejected / expired | خطأ | `bg-error/10 text-error-dark dark:text-error-light` |
| under_review / submitted / ongoing | معلومات | `bg-info/10 text-info-dark dark:text-info-light` |
| planned / postponed / appealed | أساسي | `bg-primary/10 text-primary-bright dark:text-primary-light` |
| draft / archived / closed | محايد | `bg-muted text-muted-foreground` |

**قاعدة إمكانية الوصول:** كل `StatusBadge` تعرض **نقطة لونية افتراضياً** +
نصاً دلالياً — لا يُعتمد على اللون وحده. أزرار `ActionButtons` تحمل
`aria-label` وعناوين قياسية من `ACTION_LABELS` (عرض/تعديل/حذف…) ومناطق
لمس ≥ 36px (sm) أو 44px (md).

### أماكن الرموز الدلالية المرجعية
- `designSystem.ts` ← `STATUS_STYLES` · `ACTION_BUTTON_STYLES` · `ACTION_LABELS`
- `src/styles/index.css` ← `--color-*` (مصدر الحقيقة للعرض بضوء/ظلام)</tool_call>