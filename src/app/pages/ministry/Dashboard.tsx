/**
 * Ministry Dashboard — لوحة تحكم الوزارة
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Building2, Users, AlertTriangle, FileText, Clock,
  TrendingUp, TrendingDown, ShieldCheck, ShieldAlert,
  ChevronLeft, BarChart3, RefreshCw, Vote, Activity,
  Briefcase, FileSearch, Download,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

const MONTHLY_TREND = [
  { month: 'يناير', unions: 71, activities: 12 },
  { month: 'فبراير', unions: 73, activities: 15 },
  { month: 'مارس',  unions: 74, activities: 18 },
  { month: 'أبريل', unions: 75, activities: 14 },
  { month: 'مايو',  unions: 77, activities: 20 },
  { month: 'يونيو', unions: 78, activities: 22 },
];

const TYPE_PIE = [
  { name: 'مهنية', value: 32, color: '#1E3A8A' },
  { name: 'عمالية', value: 26, color: '#2563EB' },
  { name: 'أصحاب أعمال', value: 12, color: '#60A5FA' },
  { name: 'اجتماعية', value: 5,  color: '#93C5FD' },
  { name: 'أخرى',     value: 3,  color: '#BFDBFE' },
];

const GOV_BAR = [
  { name: 'صنعاء', count: 29 },
  { name: 'عدن',   count: 18 },
  { name: 'تعز',   count: 14 },
  { name: 'حضرموت', count: 8 },
  { name: 'إب',    count: 5  },
  { name: 'أخرى',  count: 4  },
];

const RECENT_UNIONS = [
  { id: 1, name: 'نقابة مهندسي البرمجيات', type: 'مهنية', governorate: 'صنعاء', status: 'active' },
  { id: 2, name: 'نقابة عمال البلاستيك',   type: 'عمالية', governorate: 'عدن',  status: 'active' },
  { id: 3, name: 'اتحاد أصحاب المطاعم',   type: 'أصحاب أعمال', governorate: 'تعز', status: 'under_review' },
  { id: 4, name: 'نقابة الصيادلة اليمنيين', type: 'مهنية', governorate: 'صنعاء', status: 'active' },
];

const PENDING_REQUESTS = [
  { id: 1, type: 'تجديد ترخيص', entity: 'نقابة المعلمين',     daysWaiting: 12, priority: 'high' },
  { id: 2, type: 'اعتماد قيادة', entity: 'نقابة عمال البناء', daysWaiting: 8,  priority: 'medium' },
  { id: 3, type: 'تغيير بيانات', entity: 'اتحاد التجار',      daysWaiting: 5,  priority: 'low' },
  { id: 4, type: 'شهادة قيد',    entity: 'نقابة الأطباء',     daysWaiting: 3,  priority: 'low' },
];

const ALERTS = [
  { id: 1, type: 'danger',  icon: ShieldAlert, text: '3 نقابات تراخيصها منتهية منذ أكثر من شهر', link: '/ministry/violations' },
  { id: 2, type: 'warning', icon: Clock,       text: '7 كيانات موعد تجديد ترخيصها خلال 30 يوماً', link: '/ministry/unions' },
  { id: 3, type: 'info',    icon: Vote,        text: '2 انتخابات مقررة هذا الشهر تحتاج إشراف', link: '/ministry/elections' },
  { id: 4, type: 'warning', icon: FileText,    text: '5 وثائق قيد المراجعة لأكثر من أسبوع', link: '/ministry/documents' },
];

const QUICK_ACTIONS = [
  { label: 'إضافة نقابة',  icon: Building2,     to: '/ministry/unions',      color: 'bg-[#1E3A8A] hover:bg-blue-800' },
  { label: 'إضافة عضو',    icon: Users,          to: '/ministry/members',     color: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'تسجيل مخالفة', icon: AlertTriangle,  to: '/ministry/violations',  color: 'bg-red-600 hover:bg-red-700' },
  { label: 'إنشاء تقرير',  icon: BarChart3,      to: '/ministry/reports',     color: 'bg-purple-600 hover:bg-purple-700' },
  { label: 'رفع وثيقة',    icon: FileText,       to: '/ministry/documents',   color: 'bg-amber-600 hover:bg-amber-700' },
  { label: 'الخدمات',      icon: Briefcase,      to: '/ministry/services',    color: 'bg-teal-600 hover:bg-teal-700' },
];

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, trend, to }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: { value: number };
  to?: string;
}) {
  const inner = (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? <TrendingUp className="w-3.5 h-3.5"/> : <TrendingDown className="w-3.5 h-3.5"/>}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-800">{typeof value === 'number' ? value.toLocaleString('ar-YE') : value}</p>
      <p className="text-sm font-semibold text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {to && <p className="text-xs text-[#1E3A8A] mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">عرض التفاصيل →</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

export function Dashboard() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const complianceRate = useMemo(() => Math.round((62 / 78) * 100), []);

  return (
    <div className="space-y-5" dir="rtl">

      {/* ترويسة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {(['month','quarter','year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${period === p ? 'bg-[#1E3A8A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {p === 'month' ? 'شهري' : p === 'quarter' ? 'ربع سنوي' : 'سنوي'}
            </button>
          ))}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>
      </div>

      {/* تنبيهات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALERTS.map(a => {
          const Icon = a.icon;
          const s = { danger: 'bg-red-50 border-red-200 text-red-700', warning: 'bg-amber-50 border-amber-200 text-amber-700', info: 'bg-blue-50 border-blue-200 text-blue-700' }[a.type] || '';
          return (
            <Link key={a.id} to={a.link} className={`flex items-center gap-3 px-4 py-2.5 border rounded-xl text-sm font-medium hover:shadow-sm transition-all ${s}`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{a.text}</span>
              <ChevronLeft className="w-4 h-4 opacity-60 shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="إجمالي الكيانات"  value={78}    sub="نقابة واتحاد ومنظمة" icon={Building2}     iconBg="bg-blue-50"    iconColor="text-[#1E3A8A]" trend={{ value: 2.6 }} to="/ministry/unions" />
        <KpiCard label="إجمالي الأعضاء"   value={15240} sub="في جميع الكيانات"    icon={Users}          iconBg="bg-emerald-50" iconColor="text-emerald-600" trend={{ value: 1.2 }} to="/ministry/members" />
        <KpiCard label="طلبات معلقة"       value={24}    sub="تحتاج معالجة فورية"  icon={Clock}          iconBg="bg-amber-50"   iconColor="text-amber-600"  trend={{ value: -8 }}  to="/ministry/services" />
        <KpiCard label="مخالفات مفتوحة"   value={7}     sub="بما فيها 2 حرجة"     icon={AlertTriangle}  iconBg="bg-red-50"     iconColor="text-red-600"    trend={{ value: 3 }}   to="/ministry/violations" />
      </div>

      {/* KPIs Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="معدل الامتثال"       value={`${complianceRate}%`} sub="62 كيان ملتزم من 78"    icon={ShieldCheck} iconBg="bg-green-50"  iconColor="text-green-600" />
        <KpiCard label="انتخابات هذا العام"  value={14}  sub="8 منتهية · 2 جارية"   icon={Vote}     iconBg="bg-indigo-50" iconColor="text-indigo-600" to="/ministry/elections" />
        <KpiCard label="أنشطة هذا الشهر"    value={22}  sub="1,240 مستفيد"          icon={Activity} iconBg="bg-purple-50" iconColor="text-purple-600" to="/ministry/activities" />
        <KpiCard label="وثائق قيد المراجعة" value={11}  sub="5 منتظرة أكثر من أسبوع" icon={FileText} iconBg="bg-orange-50" iconColor="text-orange-600" to="/ministry/documents" />
      </div>

      {/* المخططات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">منحنى النمو الشهري</h3>
            <button onClick={() => exportReportToExcel({ title: 'منحنى النمو', reportType: 'statistics', data: MONTHLY_TREND, columns: [{ key: 'month', label: 'الشهر' }, { key: 'unions', label: 'الكيانات' }, { key: 'activities', label: 'الأنشطة' }] })}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <Download className="w-3.5 h-3.5" /> تصدير
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MONTHLY_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="unions" name="الكيانات" stroke="#1E3A8A" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="activities" name="الأنشطة" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4">توزيع الكيانات حسب النوع</h3>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={TYPE_PIE} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={30}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {TYPE_PIE.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v} كيان`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {TYPE_PIE.map(t => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ background: t.color }} />
                  <span className="text-gray-600">{t.name}</span>
                </div>
                <span className="font-bold text-gray-700">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* التوزيع الجغرافي */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">التوزيع الجغرافي للكيانات</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={GOV_BAR} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
              <Tooltip />
              <Bar dataKey="count" name="عدد الكيانات" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-2.5">
            {GOV_BAR.map((g, i) => (
              <div key={g.name} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-14 shrink-0">{g.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-full bg-[#1E3A8A] rounded-full" style={{ width: `${(g.count / 29) * 100}%`, opacity: 1 - i * 0.12 }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-5 text-center">{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* الصف السفلي */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">آخر الكيانات المسجلة</h3>
            <Link to="/ministry/unions" className="text-xs text-[#1E3A8A] font-semibold hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-2.5">
            {RECENT_UNIONS.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.type} · {u.governorate}</p>
                </div>
                <StatusBadge status={u.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">الطلبات المعلقة</h3>
            <Link to="/ministry/services" className="text-xs text-[#1E3A8A] font-semibold hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-2.5">
            {PENDING_REQUESTS.map(r => {
              const bg = r.priority === 'high' ? 'bg-red-50 border-red-100' : r.priority === 'medium' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100';
              const dot = r.priority === 'high' ? 'bg-red-500' : r.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-300';
              return (
                <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${bg}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.type}</p>
                    <p className="text-xs text-gray-500 truncate">{r.entity}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-500 shrink-0">{r.daysWaiting}ي</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 text-sm mb-4">الإجراءات السريعة</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(a => (
              <Link key={a.label} to={a.to}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-white text-xs font-semibold text-center hover:scale-105 hover:shadow-md transition-all ${a.color}`}>
                <a.icon className="w-5 h-5" />
                {a.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Link to="/ministry/audit"
              className="flex items-center justify-center gap-2 w-full py-1.5 text-xs font-semibold text-gray-500 hover:text-[#1E3A8A] transition-colors">
              <FileSearch className="w-3.5 h-3.5" /> سجل التدقيق الكامل
            </Link>
          </div>
        </div>

      </div>

      {/* مؤشر الامتثال */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">مؤشر الامتثال والمخاطر</h3>
          <Link to="/ministry/reports" className="flex items-center gap-1.5 text-xs text-[#1E3A8A] font-semibold hover:underline">
            <BarChart3 className="w-3.5 h-3.5" /> تقرير مفصّل
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'ملتزم', count: 62, total: 78, color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50' },
            { label: 'محذّر',  count: 8,  total: 78, color: 'bg-amber-500', textColor: 'text-amber-700',  bg: 'bg-amber-50' },
            { label: 'مخالف', count: 5,  total: 78, color: 'bg-red-500',   textColor: 'text-red-700',    bg: 'bg-red-50' },
            { label: 'معاقب', count: 3,  total: 78, color: 'bg-red-700',   textColor: 'text-red-900',    bg: 'bg-red-100' },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center`}>
              <p className={`text-3xl font-black ${item.textColor}`}>{item.count}</p>
              <p className={`text-sm font-semibold ${item.textColor} mb-2`}>{item.label}</p>
              <div className="h-1.5 bg-white/60 rounded-full">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.count / item.total) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round((item.count / item.total) * 100)}%</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
