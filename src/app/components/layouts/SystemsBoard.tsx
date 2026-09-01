/**
 * SystemsBoard — لوحة عرض الأنظمة الوطنية
 * عرض أنيق وموحّد للأنظمة المتاحة للمستخدم حسب دوره وصلاحيته فقط،
 * بمسمّيات قصيرة مألوفة للمستخدم النهائي مع بحث فوري وتجميع واضح.
 */
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Search, LayoutGrid, KeyRound } from 'lucide-react';
import { getSystemsByGroup, SYSTEM_GROUPS } from '../../config/systems';
import { usePermissions } from '../../hooks/usePermissions';

export function SystemsBoard() {
  const { can } = usePermissions();
  const [query, setQuery] = useState('');
  const location = useLocation();

  const grouped = useMemo(() => {
    const q = query.trim();
    return getSystemsByGroup()
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.perm && !can(item.perm)) return false;
          if (!q) return true;
          const hay = `${item.title} ${item.subtitle}`;
          return hay.includes(q);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [can, query]);

  const totalVisible = useMemo(
    () => grouped.reduce((sum, g) => sum + g.items.length, 0),
    [grouped],
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس اللوحة + البحث */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <LayoutGrid className="w-4 h-4 text-gold" />
          لوحة عرض الأنظمة
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark dark:text-gold-light border border-gold/30">
            <KeyRound className="w-3 h-3" />
            {totalVisible} نظام متاح لدورك
          </span>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن نظام…"
            aria-label="بحث في الأنظمة"
            className="w-full pr-9 pl-3 py-2 text-sm rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {query ? 'لا توجد أنظمة مطابقة لبحثك' : 'لا توجد أنظمة متاحة لدورك الحالي'}
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${group.accent} flex items-center justify-center shadow-sm`}>
                <group.icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-heading">{group.title}</h3>
                <p className="text-[11px] text-muted-foreground truncate">{group.description}</p>
              </div>
              <div className="ms-auto text-[11px] font-bold text-muted-foreground/70">
                {group.items.length}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex items-start gap-3 rounded-2xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg shadow-sm ${
                      isActive
                        ? 'border-gold/60 ring-1 ring-gold/30'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${group.accent} flex items-center justify-center shadow-sm transition-transform group-hover:scale-105`}
                    >
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-heading leading-tight">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="flex items-center gap-2 pt-2 pb-1 text-[11px] text-muted-foreground">
        <KeyRound className="w-3.5 h-3.5 text-gold" />
        تظهر الأنظمة حسب الدور والصلاحية الممنوحة لحسابك فقط — ما لا تملك صلاحية له لا يظهر لك.
      </div>
    </div>
  );
}

/** إعادة تصدير للمجموعات الرسمية لاستخدامها في القائمة الجانبية */
export { SYSTEM_GROUPS };