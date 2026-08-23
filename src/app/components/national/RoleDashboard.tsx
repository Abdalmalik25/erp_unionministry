/**
 * RoleDashboard — لوحة الدور الذكية
 * تعرض مساحة العمل الكاملة لدور واحد من أدوار منظومة العمل التسعة:
 * مؤشرات حية من السجلات، روابط سريعة، مجالات التركيز، والترابط مع بقية الأدوار
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Users, Building2, FileText, ShieldCheck, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { findRoleByKey, LABOR_ROLES, ROLE_ACCENT_COLORS } from '../../utils/nationalDirectoriesConfig';

interface RoleStats {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
}

const FALLBACK_STATS: Record<string, RoleStats[]> = {
    employer: [
        { label: 'منشآت مسجلة', value: 5152, icon: Building2, color: 'text-blue-600' },
        { label: 'طلبات تقليص', value: 0, icon: TrendingUp, color: 'text-indigo-600' },
        { label: 'تراخيص وافدة', value: 0, icon: FileText, color: 'text-teal-600' },
        { label: 'إصابات عمل', value: 0, icon: ShieldCheck, color: 'text-rose-600' },
    ],
    worker: [
        { label: 'ملفات عمال', value: 12599, icon: Users, color: 'text-green-600' },
        { label: 'شهادات لياقة', value: 0, icon: FileText, color: 'text-emerald-600' },
        { label: 'شهادات خبرة', value: 0, icon: FileText, color: 'text-teal-600' },
        { label: 'نزاعات نشطة', value: 0, icon: ShieldCheck, color: 'text-amber-600' },
    ],
    job_seeker: [
        { label: 'مهن موصفة', value: 0, icon: Activity, color: 'text-amber-600' },
        { label: 'برامج تدريب', value: 0, icon: Users, color: 'text-blue-600' },
        { label: 'شهادات كفاءة', value: 0, icon: FileText, color: 'text-emerald-600' },
    ],
    registration_office: [
        { label: 'منشآت مقيدة', value: 5152, icon: Building2, color: 'text-teal-600' },
        { label: 'عمال مقيدون', value: 12599, icon: Users, color: 'text-green-600' },
        { label: 'عمالة غير منتظمة', value: 0, icon: Activity, color: 'text-amber-600' },
    ],
    union: [
        { label: 'نقابات واتحادات', value: 0, icon: Users, color: 'text-purple-600' },
        { label: 'أعضاء نقابيون', value: 0, icon: Users, color: 'text-indigo-600' },
        { label: 'دورات انتخابية', value: 0, icon: Activity, color: 'text-violet-600' },
        { label: 'أنشطة نقابية', value: 0, icon: FileText, color: 'text-fuchsia-600' },
    ],
    ministry_staff: [
        { label: 'موظفو الوزارة', value: 0, icon: Users, color: 'text-indigo-600' },
        { label: 'مكاتب الوزارة', value: 0, icon: Building2, color: 'text-blue-600' },
        { label: 'مراجع قانونية', value: 0, icon: FileText, color: 'text-slate-600' },
    ],
    decision_maker: [
        { label: 'كيانات إجمالاً', value: 5152, icon: Building2, color: 'text-rose-600' },
        { label: 'تنبيهات امتثال', value: 0, icon: ShieldCheck, color: 'text-red-600' },
        { label: 'تقييمات مخاطر', value: 0, icon: TrendingUp, color: 'text-orange-600' },
        { label: 'مخالفات', value: 0, icon: FileText, color: 'text-rose-600' },
    ],
    inspector: [
        { label: 'محاضر تفتيش', value: 0, icon: ClipboardIcon, color: 'text-cyan-600' },
        { label: 'معايير تفتيش', value: 0, icon: FileText, color: 'text-sky-600' },
        { label: 'مخالفات مفتوحة', value: 0, icon: ShieldCheck, color: 'text-red-600' },
    ],
    trainer: [
        { label: 'برامج تدريبية', value: 0, icon: Users, color: 'text-emerald-600' },
        { label: 'شهادات كفاءة', value: 0, icon: FileText, color: 'text-teal-600' },
    ],
};

function ClipboardIcon(props: any) {
    return <Activity {...props} />;
}

export default function RoleDashboard() {
    const { roleKey = '' } = useParams();
    const navigate = useNavigate();
    const role = findRoleByKey(roleKey);
    const [stats, setStats] = useState<RoleStats[]>([]);
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        if (!role) return;
        setLoading(true);
        try {
            // جلب المؤشرات الحية من السجلات المرتبطة بالدور
            const endpoints: Record<string, string[]> = {
                employer: ['/api/commercial?limit=1', '/api/reduction-requests?limit=1', '/api/expatriate-licenses?limit=1', '/api/labor-records/work-injuries?limit=1'],
                worker: ['/api/worker-profiles?limit=1', '/api/labor-records/health-fitness-certificates?limit=1', '/api/labor-records/experience-certificates?limit=1', '/api/labor-disputes?limit=1'],
                job_seeker: ['/api/professions?limit=1', '/api/training-records?limit=1', '/api/evaluation-certificates?limit=1'],
                registration_office: ['/api/commercial?limit=1', '/api/worker-profiles?limit=1', '/api/labor-records/irregular-workers?limit=1'],
                union: ['/api/entities?limit=1', '/api/members?limit=1', '/api/elections?limit=1', '/api/activities?limit=1'],
                ministry_staff: ['/api/labor-records/ministry-employees?limit=1', '/api/labor-records/ministry-offices?limit=1', '/api/legal-references?limit=1'],
                decision_maker: ['/api/commercial?limit=1', '/api/compliance-alerts?limit=1', '/api/risk-assessments?limit=1', '/api/violations?limit=1'],
                inspector: ['/api/inspections?limit=1', '/api/labor-records/inspection-criteria?limit=1', '/api/violations?limit=1'],
                trainer: ['/api/training-records?limit=1', '/api/evaluation-certificates?limit=1'],
            };
            const urls = endpoints[role.key] || [];
            const fallback = FALLBACK_STATS[role.key] || [];
            const results = await Promise.allSettled(urls.map(u => fetch(u).then(r => (r.ok ? r.json() : null))));
            const enriched = fallback.map((fb, i) => {
                const res = results[i];
                let value = fb.value;
                if (res && res.status === 'fulfilled' && res.value) {
                    const d = res.value;
                    value = d.total ?? d.count ?? (Array.isArray(d.data) ? d.data.length : fb.value);
                }
                return { ...fb, value };
            });
            setStats(enriched);
        }
        catch {
            setStats(FALLBACK_STATS[role.key] || []);
        }
        finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => { loadStats(); }, [loadStats]);

    if (!role) {
        return (
            <div dir="rtl" className="p-8 text-center">
                <h1 className="text-xl font-bold text-slate-900">الدور غير موجود</h1>
                <button onClick={() => navigate('/ministry/roles')} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
                    العودة لمعرض الأدوار
                </button>
            </div>
        );
    }

    const RoleIcon = role.icon;
    const accent = ROLE_ACCENT_COLORS[role.key] || 'bg-slate-50 border-slate-200';

    return (
        <div dir="rtl" className="space-y-6 p-6 bg-slate-50 min-h-screen">
            {/* رأس لوحة الدور */}
            <div className={`rounded-2xl border p-6 ${accent}`}>
                <div className="flex items-center gap-4 flex-wrap">
                    <button onClick={() => navigate('/ministry/roles')} className="p-2 rounded-lg bg-white/70 hover:bg-white transition-colors" title="عودة للمعرض">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
                        <RoleIcon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <h1 className="text-2xl font-black text-slate-900">{role.nameAr}</h1>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-xs font-bold shadow-sm hover:bg-muted transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        تحديث المؤشرات
                    </button>
                </div>

                {/* مجالات التركيز */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {role.focusAreas.map(area => (
                        <span key={area} className="px-3 py-1 bg-white/80 text-foreground text-xs font-bold rounded-full shadow-sm">
                            {area}
                        </span>
                    ))}
                </div>
            </div>

            {/* بطاقات المؤشرات الحية */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(loading ? FALLBACK_STATS[role.key] || [] : stats).map(s => (
                    <div key={s.label} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                                <p className={`text-2xl font-black mt-1 ${s.color}`}>{loading ? '…' : s.value.toLocaleString('ar-YE')}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                                <s.icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* الروابط السريعة */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <h2 className="text-sm font-bold text-heading mb-4">مسارات العمل السريعة</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {role.quickLinks.map(link => {
                        const LinkIcon = link.icon;
                        return (
                            <button
                                key={link.label}
                                onClick={() => navigate(link.path)}
                                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/40 transition-all text-right"
                            >
                                <span className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                                    <LinkIcon className="w-5 h-5 text-primary" />
                                </span>
                                <span className="flex-1">
                                    <span className="block text-sm font-bold text-heading">{link.label}</span>
                                    <span className="block text-xs text-muted-foreground">{link.description}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* الترابط الذكي: الأدوار ذات الصلة */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <h2 className="text-sm font-bold text-heading mb-4">ترابط المنظومة — انتقل إلى دور آخر</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
                    {LABOR_ROLES.filter(r => r.key !== role.key).map(r => {
                        const RIcon = r.icon;
                        return (
                            <button
                                key={r.key}
                                onClick={() => navigate(`/ministry/roles/${r.key}`)}
                                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:bg-accent/50 transition-all"
                                title={r.description}
                            >
                                <RIcon className="w-5 h-5 text-primary" />
                                <span className="text-[11px] font-bold text-foreground text-center leading-tight">{r.nameAr}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}