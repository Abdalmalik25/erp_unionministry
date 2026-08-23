/**
 * RolesGallery — معرض الأدوار: بطاقات تفاعلية لجميع أدوار منظومة العمل
 * مع روابط سريعة وأيقونة الدخول للتكوين المركزي
 */
import { useNavigate } from 'react-router';
import { ArrowUpRight, ChevronLeft } from 'lucide-react';
import { findRoleByKey, ROLE_ACCENT_COLORS } from '../../utils/nationalDirectoriesConfig';

const ROLE_ORDER = [
  'employer', 'worker', 'job_seeker', 'registration_office',
  'union', 'ministry_staff', 'decision_maker', 'inspector', 'trainer',
];

export default function RolesGallery() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">منظومة العمل — معرض الأدوار</h1>
        <p className="text-slate-500 mt-1">الأدوار التسعة وفق المنظومة الوطنية — اختر دورك للوصول لمساحته</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ROLE_ORDER.map(key => {
          const role = findRoleByKey(key);
          if (!role) return null;
          const RoleIcon = role.icon;
          const borderColor = ROLE_ACCENT_COLORS[key] || 'bg-slate-50 border-slate-200';

          return (
            <div
              key={role.key}
              className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className={`flex items-center gap-3 p-4 border-b rounded-t-xl ${borderColor}`}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-white/80 shadow-sm">
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900 text-lg">{role.nameAr}</h2>
                  <p className="text-xs text-muted-foreground">{role.nameEn}</p>
                </div>
                <button
                  onClick={() => navigate(`/ministry/roles/${role.key}`)}
                  className="p-2 text-primary-bright hover:text-primary"
                  title="لوحة الدور"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4">
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">{role.description}</p>

                {role.focusAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {role.focusAreas.map(area => (
                      <span
                        key={area}
                        className="px-2.5 py-1 bg-accent/40 text-foreground text-xs rounded-full font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                )}

                {role.quickLinks.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                    {role.quickLinks.map(link => {
                      const LinkIcon = link.icon;
                      return (
                        <button
                          key={link.label}
                          onClick={() => navigate(link.path)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors text-right"
                        >
                          <span className="p-1.5 bg-secondary rounded-lg">
                            <LinkIcon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 text-right">
                            <span className="block text-sm font-semibold text-foreground">{link.label}</span>
                            <span className="block text-xs text-muted-foreground">{link.description}</span>
                          </span>
                          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}