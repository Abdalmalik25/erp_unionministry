import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { Building2, Users, AlertTriangle, FileText, Clock, TrendingUp, TrendingDown, Download, RefreshCw, BarChart3, Briefcase, ShieldCheck, ShieldAlert, ChevronLeft, FileSearch, Calendar, } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from 'recharts';
import { useOffline } from '../../contexts/OfflineContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { toast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import YemenMap from '../../components/maps/YemenMap';
import { BRAND } from '../../branding';
import { EntityTypeLabels } from '../../types/entity';
const QUICK_ACTIONS: Array<{
    label: string;
    icon: React.ElementType;
    to: string;
    color: string;
    perm?: string;
}> = [
    { label: 'إضافة كيان', icon: Building2, to: '/ministry/unions', color: 'bg-primary hover:bg-primary-dark', perm: 'entities:create' },
    { label: 'إضافة عضو', icon: Users, to: '/ministry/members', color: 'bg-success hover:bg-success-dark', perm: 'members:create' },
    { label: 'تسجيل مخالفة', icon: AlertTriangle, to: '/ministry/violations', color: 'bg-error hover:bg-error-dark', perm: 'violations:create' },
    { label: 'إنشاء تقرير', icon: BarChart3, to: '/ministry/reports', color: 'bg-gold hover:bg-gold-dark', perm: 'reports:generate' },
    { label: 'رفع وثيقة', icon: FileText, to: '/ministry/documents', color: 'bg-warning hover:bg-warning-dark', perm: 'documents:upload' },
    { label: 'الخدمات', icon: Briefcase, to: '/ministry/services', color: 'bg-teal hover:bg-teal-dark', perm: 'services:view' },
];
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
interface DashboardStats {
    entities: {
        total: number;
        active: number;
    };
    members: {
        total: number;
    };
    professions: {
        total: number;
    };
    alerts: {
        total: number;
        unresolved: number;
    };
    dispatches: {
        total: number;
        active: number;
    };
    reductions: {
        total: number;
        pending: number;
    };
    evaluations: {
        total: number;
        valid: number;
    };
    services: {
        total: number;
    };
    openViolations: {
        total: number;
    };
    overdueInspections: {
        total: number;
    };
    highRisk: {
        total: number;
    };
    compliant: {
        total: number;
    };
}
interface TimeSeriesData {
    monthly: Array<{
        month: string;
        entities: number;
        members: number;
        violations: number;
    }>;
    byType: Array<{
        type: string;
        count: number;
    }>;
    byGovernorate: Array<{
        governorate: string;
        count: number;
    }>;
}
interface Entity {
    entity_id: string;
    name_ar: string;
    entity_type: string;
    governorate: string;
    status: string;
    member_count: number;
}
interface ServiceRequest {
    id: string;
    service_type: string;
    entity_name: string;
    status: string;
    created_at: string;
}
function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, trend, to, alert }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    to?: string;
    alert?: boolean;
}) {
    const inner = (<div className={`bg-card rounded-xl border shadow-sm p-5 hover:shadow-md transition-all group cursor-pointer ${alert ? 'border-error/30 bg-error/5' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`}/>
        </div>
        {trend !== undefined && (<span className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-success' : 'text-error'}`}>
            {trend.isPositive ? <TrendingUp className="w-3.5 h-3.5"/> : <TrendingDown className="w-3.5 h-3.5"/>}
            {Math.abs(trend.value)}%
          </span>)}
      </div>
      <p className="text-2xl font-black text-heading">{typeof value === 'number' ? value.toLocaleString('ar-YE') : value}</p>
      <p className="text-sm font-semibold text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {to && <p className="text-xs text-primary mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">عرض التفاصيل ←</p>}
    </div>);
    return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}
export function DashboardNewEnhanced() {
    const { isOnline, pendingActions, syncAll } = useOffline();
    const { user } = useAuth();
    const { can, meta } = usePermissions();
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
    const [recentEntities, setRecentEntities] = useState<Entity[]>([]);
    const [pendingRequests, setPendingRequests] = useState<ServiceRequest[]>([]);
    const complianceRate = useMemo(() => {
        if (!stats?.entities?.total)
            return 0;
        return Math.round(((stats.compliant?.total || 0) / stats.entities.total) * 100);
    }, [stats]);
    const dynamicAlerts = useMemo(() => {
        if (!stats)
            return [];
        const alerts: Array<{
            id: number;
            type: string;
            icon: any;
            text: string;
            link: string;
        }> = [];
        const unresolved = stats.alerts?.unresolved || 0;
        const openV = stats.openViolations?.total || 0;
        const overdue = stats.overdueInspections?.total || 0;
        const highR = stats.highRisk?.total || 0;
        if (unresolved > 0)
            alerts.push({ id: 1, type: 'danger', icon: ShieldAlert, text: `${unresolved} تنبيه امتثال غير محلول`, link: '/ministry/compliance-alerts' });
        if (openV > 0)
            alerts.push({ id: 2, type: 'danger', icon: AlertTriangle, text: `${openV} مخالفة مفتوحة تحتاج معالجة`, link: '/ministry/violations' });
        if (overdue > 0)
            alerts.push({ id: 3, type: 'warning', icon: Clock, text: `${overdue} تفتيش متأخر عن موعده`, link: '/ministry/inspections' });
        if (highR > 0)
            alerts.push({ id: 4, type: 'warning', icon: ShieldAlert, text: `${highR} كيان عالي المخاطر`, link: '/ministry/risk-assessments' });
        const pendingReductions = stats.reductions?.pending || 0;
        if (pendingReductions > 0)
            alerts.push({ id: 5, type: 'info', icon: Users, text: `${pendingReductions} طلب تخفيض قيد المراجعة`, link: '/ministry/reduction-requests' });
        if (alerts.length === 0)
            alerts.push({ id: 1, type: 'info', icon: ShieldCheck, text: 'لا توجد تنبيهات حالياً — الجميع ملتزم', link: '/ministry' });
        return alerts;
    }, [stats]);
    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [statsRes, entitiesRes, requestsRes, tsRes] = await Promise.all([
                fetch(`/api/dashboard/enhanced-stats?period=${period}`),
                fetch('/api/entities?limit=5'),
                fetch('/api/service-requests?limit=5'),
                fetch('/api/dashboard/time-series'),
            ]);
            if (statsRes.ok)
                setStats(await statsRes.json());
            if (entitiesRes.ok) {
                const d = await entitiesRes.json();
                setRecentEntities(Array.isArray(d) ? d.slice(0, 5) : (d.data || []).slice(0, 5));
            }
            if (requestsRes.ok) {
                const d = await requestsRes.json();
                const requests = Array.isArray(d) ? d : d.data || d.requests || [];
                setPendingRequests(requests.filter((r: ServiceRequest) => r.status !== 'completed' && r.status !== 'closed').slice(0, 5));
            }
            if (tsRes.ok)
                setTimeSeries(await tsRes.json());
        }
        catch (error) {
            console.error('[Dashboard] Error:', error);
            toast.error('تعذر تحميل بيانات لوحة التحكم');
        }
        finally {
            setIsLoading(false);
        }
    }, [period]);
    useEffect(() => { loadDashboardData(); }, [loadDashboardData]);
    const handleSync = useCallback(async () => {
        if (!isOnline) {
            toast.warning('بدون اتصال بالإنترنت');
            return;
        }
        await syncAll();
    }, [isOnline, syncAll]);
    const monthlyChartData = useMemo(() => {
        if (!timeSeries?.monthly)
            return [];
        return [...timeSeries.monthly].reverse().map(m => ({
            ...m,
            month: m.month.slice(5),
        }));
    }, [timeSeries]);
    const entityTypesChartData = useMemo(() => {
        if (!timeSeries?.byType)
            return [];
        return timeSeries.byType.map(t => ({ name: (EntityTypeLabels as Record<string, string>)[t.type] || t.type, value: t.count }));
    }, [timeSeries]);
    return (<div className="space-y-5" dir="rtl">
      {/* Hero - ترحيب شخصي + حالة النظام */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary via-primary to-teal shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]"/>
        <div className="relative p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">أهلاً، {user?.name || 'مرحباً'}</h1>
              {user?.role && (<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur border border-white/20">
                  {meta(user.role)?.label || user.role}
                </span>)}
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${isOnline ? 'bg-white/15 border-white/20' : 'bg-warning/20 border-warning/30'}`}>
                {isOnline ? '● متصل' : '○ أوفلاين'}
              </span>
              {pendingActions > 0 && (<span className="text-xs font-bold px-2 py-1 rounded-full bg-warning text-white">{pendingActions} إجراء معلق</span>)}
            </div>
            <p className="text-sm font-medium text-white/85">
              {BRAND.systemName} · {BRAND.ministry}
            </p>
            <p className="text-xs text-white/70">
              {new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-xl bg-white/10 backdrop-blur border border-white/15 p-1">
              {(['month', 'quarter', 'year'] as const).map(p => (<button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-white text-primary shadow' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                  {p === 'month' ? 'شهري' : p === 'quarter' ? 'ربع سنوي' : 'سنوي'}
                </button>))}
            </div>
            <button onClick={handleSync} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white text-primary rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 shadow" disabled={!isOnline || isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}/> مزامنة
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {dynamicAlerts.length > 0 && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dynamicAlerts.map(a => {
                const Icon = a.icon;
                const s = { danger: 'bg-error/5 border-error/20 text-error', warning: 'bg-warning/5 border-warning/20 text-warning-dark', info: 'bg-primary/5 border-primary/20 text-primary' }[a.type] || '';
                return (<Link key={a.id} to={a.link} className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl text-sm font-medium hover:shadow-sm transition-all ${s}`}>
                <Icon className="w-4 h-4 shrink-0"/><span className="flex-1">{a.text}</span><ChevronLeft className="w-4 h-4 opacity-60 shrink-0"/>
              </Link>);
            })}
        </div>)}

      {/* KPIs Row 1 - Core */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (<div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
            <div className="w-11 h-11 bg-muted rounded-xl mb-3"/>
            <div className="h-6 bg-muted rounded w-1/2 mb-2"/>
            <div className="h-3 bg-muted rounded w-3/4"/>
          </div>)) : (<>
            <KpiCard label="إجمالي المنشآت والنقابات" value={stats?.entities?.total ?? '—'} sub={`${stats?.entities?.active ?? 0} نشط`} icon={Building2} iconBg="bg-primary/10" iconColor="text-primary" to="/ministry/commercial"/>
            <KpiCard label="إجمالي القوى العاملة" value={stats?.members?.total ?? '—'} sub="في كافة القطاعات" icon={Users} iconBg="bg-success/10" iconColor="text-success" to="/ministry/members"/>
            <KpiCard label="المنشآت عالية المخاطر" value={stats?.highRisk?.total ?? 0} sub="تحتاج تفتيشاً عاجلاً" icon={ShieldAlert} iconBg="bg-error/10" iconColor="text-error" alert={(stats?.highRisk?.total ?? 0) > 0} to="/ministry/risk-assessments"/>
            <KpiCard label="معدل الامتثال العام" value={`${complianceRate}%`} sub={`${stats?.compliant?.total ?? 0} من ${stats?.entities?.total ?? 0}`} icon={ShieldCheck} iconBg="bg-success/10" iconColor="text-success"/>
          </>)}
      </div>

      {/* KPIs Row 2 - Operational */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (<div key={`s2-${i}`} className="bg-card rounded-xl border border-border p-5 animate-pulse">
            <div className="w-11 h-11 bg-muted rounded-xl mb-3"/>
            <div className="h-6 bg-muted rounded w-1/2 mb-2"/>
            <div className="h-3 bg-muted rounded w-3/4"/>
          </div>)) : (<>
            <KpiCard label="المخالفات المفتوحة" value={stats?.openViolations?.total ?? 0} sub="تحتاج معالجة" icon={AlertTriangle} iconBg="bg-error/10" iconColor="text-error" alert={(stats?.openViolations?.total ?? 0) > 0} to="/ministry/violations"/>
            <KpiCard label="التفتيشات المتأخرة" value={stats?.overdueInspections?.total ?? 0} sub="أطول من المدة المحددة" icon={Calendar} iconBg="bg-warning/10" iconColor="text-warning" alert={(stats?.overdueInspections?.total ?? 0) > 0} to="/ministry/inspections"/>
            <KpiCard label="الإرساليات النشطة" value={stats?.dispatches?.active ?? '—'} sub={`${stats?.dispatches?.total ?? 0} إجمالي`} icon={Briefcase} iconBg="bg-primary/10" iconColor="text-primary" to="/ministry/dispatches"/>
            <KpiCard label="الطلبات المعلقة" value={stats?.alerts?.unresolved ?? '—'} sub="تنبيهات امتثال" icon={Clock} iconBg="bg-gold/10" iconColor="text-gold" to="/ministry/compliance-alerts"/>
          </>)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-heading text-sm">منحنى النمو والامتثال الشهري</h3>
            <button onClick={() => exportReportToExcel({ title: 'منحنى النمو الشهري', reportType: 'statistics', data: monthlyChartData, columns: [{ key: 'month', label: 'الشهر' }, { key: 'entities', label: 'المنشآت والنقابات' }, { key: 'members', label: 'العمال' }, { key: 'violations', label: 'المخالفات' }] })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Download className="w-3.5 h-3.5"/> تصدير
            </button>
          </div>
          {monthlyChartData.length > 0 ? (<ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/>
                <XAxis dataKey="month" tick={{ fontSize: 11 }}/>
                <YAxis tick={{ fontSize: 11 }}/>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }}/>
                <Line type="monotone" dataKey="entities" name="المنشآت والنقابات" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }}/>
                <Line type="monotone" dataKey="members" name="العمالة المسجلة" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }}/>
                <Line type="monotone" dataKey="violations" name="المخالفات" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }}/>
              </LineChart>
            </ResponsiveContainer>) : (<div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">لا توجد بيانات كافية للعرض</div>)}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-bold text-heading text-sm mb-4">توزيع المنشآت والنقابات حسب النوع</h3>
          {entityTypesChartData.length > 0 ? (<ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={entityTypesChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={30} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {entityTypesChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>) : (<div className="h-[170px] flex items-center justify-center text-sm text-muted-foreground">لا توجد بيانات</div>)}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-heading text-sm">أحدث المنشآت والنقابات المسجلة</h3>
            <Link to="/ministry/commercial" className="text-xs text-primary font-semibold hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-2.5">
            {recentEntities.length > 0 ? recentEntities.map(e => (<div key={e.entity_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-heading truncate">{e.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{(EntityTypeLabels as Record<string, string>)[e.entity_type] || e.entity_type} · {e.governorate}</p>
                </div>
                <StatusBadge status={e.status}/>
              </div>)) : <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات بعد</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-heading text-sm">الطلبات المعلقة</h3>
            <Link to="/ministry/services" className="text-xs text-primary font-semibold hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-2.5">
            {pendingRequests.length > 0 ? pendingRequests.map(r => {
            const bg = r.status === 'pending' ? 'bg-error/5 border-error/10' : r.status === 'in_progress' ? 'bg-warning/5 border-warning/10' : 'bg-muted border-border';
            const dot = r.status === 'pending' ? 'bg-error' : r.status === 'in_progress' ? 'bg-warning' : 'bg-gray-300';
            return (<div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${bg}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-heading truncate">{r.service_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.entity_name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-error/10 text-error' : r.status === 'in_progress' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                    {r.status === 'pending' ? 'معلق' : r.status === 'in_progress' ? 'جاري' : 'مكتمل'}
                  </span>
                </div>);
        }) : <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات معلقة</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-heading text-sm">الإجراءات السريعة</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">حسب صلاحيتك</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.filter(a => !a.perm || can(a.perm)).map(a => (<Link key={a.label} to={a.to} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-white text-xs font-semibold text-center hover:scale-105 hover:shadow-md transition-all ${a.color}`}>
                <a.icon className="w-5 h-5"/>{a.label}
              </Link>))}
            {QUICK_ACTIONS.filter(a => !a.perm || can(a.perm)).length === 0 && (<p className="col-span-2 text-xs text-muted-foreground text-center py-3">لا توجد إجراءات متاحة لدورك الحالي</p>)}
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <Link to="/ministry/audit" className="flex items-center justify-center gap-2 w-full py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
              <FileSearch className="w-3.5 h-3.5"/> سجل التدقيق الكامل
            </Link>
          </div>
        </div>
      </div>

      {/* Compliance Indicator */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-heading text-sm">مؤشر الامتثال والمخاطر</h3>
          <Link to="/ministry/compliance-alerts" className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
            <BarChart3 className="w-3.5 h-3.5"/> تقرير مفصّل
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'ملتزم', count: stats?.compliant?.total ?? 0, total: stats?.entities?.total ?? 1, color: 'bg-success', textColor: 'text-success', bg: 'bg-success/5' },
            { label: 'محذّر', count: stats?.alerts?.unresolved ?? 0, total: stats?.alerts?.total ?? 1, color: 'bg-warning', textColor: 'text-warning', bg: 'bg-warning/5' },
            { label: 'مخالف', count: stats?.openViolations?.total ?? 0, total: Math.max(stats?.openViolations?.total ?? 0, 1), color: 'bg-error', textColor: 'text-error', bg: 'bg-error/5' },
            { label: 'عالي المخاطر', count: stats?.highRisk?.total ?? 0, total: stats?.entities?.total ?? 1, color: 'bg-error', textColor: 'text-error', bg: 'bg-error/10' },
        ].map(item => {
            const pct = Math.round((item.count / (item.total || 1)) * 100);
            return (<div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-black ${item.textColor}`}>{item.count}</p>
                <p className={`text-sm font-semibold ${item.textColor} mb-2`}>{item.label}</p>
                <div className="h-1.5 bg-white/60 rounded-full"><div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}/></div>
                <p className="text-xs text-muted-foreground mt-1">{pct}%</p>
              </div>);
        })}
        </div>
      </div>

      {/* Governorate Map */}
      {timeSeries?.byGovernorate && timeSeries.byGovernorate.length > 0 && (<YemenMap data={timeSeries.byGovernorate}/>)}
    </div>);
}
