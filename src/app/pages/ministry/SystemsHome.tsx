/**
 * SystemsHome — الصفحة الرئيسية للقطاع: لوحة عرض الأنظمة الوطنية
 * واجهة هبوط موحّدة للوزارة تعرض الأنظمة المتاحة للمستخدم حسب دوره
 * وصلاحيته فقط، بأسلوب مؤسسي رفيع وخالٍ من الأرقام الافتراضية.
 */
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { BRAND } from '../../branding';
import { SystemsBoard } from '../../components/layouts/SystemsBoard';
import { ROLE_DISPLAY } from '../../roles';

export default function SystemsHome() {
  const { user } = useAuth();
  const { roleLabel: roleAlias } = usePermissions();

  const currentRole =
    (user?.role && ROLE_DISPLAY[user.role as keyof typeof ROLE_DISPLAY]) ||
    roleAlias ||
    'مستخدم القطاع';

  return (
    <div className="space-y-6" dir="rtl">
      {/* البطاقة الرسمية التعريفية */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-l from-primary via-primary to-primary-dark p-6 sm:p-8 shadow-md">
        <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-gold/10 blur-2xl" aria-hidden />
        <div className="absolute -right-8 -bottom-12 w-56 h-56 rounded-full bg-teal/10 blur-2xl" aria-hidden />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src={BRAND.emblemUrl}
            alt={`شعار ${BRAND.country}`}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-gold/40 bg-white/95 object-contain p-1 shadow-md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold tracking-wide text-gold-light/90">
              {BRAND.country} — {BRAND.ministry}
            </p>
            <h1 className="text-lg sm:text-2xl font-black text-white mt-1">
              {BRAND.systemName}
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
              {BRAND.tagline}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-center">
            <p className="text-[10px] text-white/70 font-bold">حسابك الحالي</p>
            <p className="text-sm font-black text-gold-light">{currentRole}</p>
          </div>
        </div>
      </header>

      <SystemsBoard />
    </div>
  );
}