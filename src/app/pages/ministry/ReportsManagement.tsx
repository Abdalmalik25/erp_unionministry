import { useState, useMemo } from 'react';
import {
  BarChart3, Download, FileText, FileSpreadsheet,
  Printer, Calendar, Filter, RefreshCw, Shield,
  TrendingUp, Users, Building2, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  PrintPreviewModal,
  exportReportToExcel,
  exportReportToPDF,
  UNION_REPORT_COLUMNS,
  MEMBER_REPORT_COLUMNS,
  ACTIVITY_REPORT_COLUMNS,
  VIOLATION_REPORT_COLUMNS,
  type PrintExportOptions,
  type ReportType,
} from '../../components/enterprise/PrintExportManager';

// ============================================================
// بيانات تجريبية
// ============================================================

const DEMO_UNIONS = [
  { registrationNumber: 'YE-2024-001', nameAr: 'نقابة المهندسين اليمنية', entityType: 'federation', classification: 'professional', governorate: 'صنعاء', status: 'active', complianceStatus: 'compliant', riskLevel: 'low', memberCount: 1245, licenseStatus: 'valid', nextRenewalDate: '2027-01-15', annualBudget: 1500000, revenue: 1200000, expenses: 980000 },
  { registrationNumber: 'YE-2024-002', nameAr: 'نقابة عمال البناء', entityType: 'union', classification: 'labor', governorate: 'عدن', status: 'active', complianceStatus: 'compliant', riskLevel: 'low', memberCount: 2340, licenseStatus: 'valid', nextRenewalDate: '2026-09-20', annualBudget: 800000, revenue: 750000, expenses: 700000 },
  { registrationNumber: 'YE-2024-003', nameAr: 'نقابة الأطباء اليمنيين', entityType: 'federation', classification: 'professional', governorate: 'صنعاء', status: 'active', complianceStatus: 'compliant', riskLevel: 'low', memberCount: 3200, licenseStatus: 'valid', nextRenewalDate: '2027-06-10', annualBudget: 2500000, revenue: 2300000, expenses: 1800000 },
  { registrationNumber: 'YE-2024-004', nameAr: 'نقابة المعلمين', entityType: 'union', classification: 'professional', governorate: 'حضرموت', status: 'suspended', complianceStatus: 'non_compliant', riskLevel: 'high', memberCount: 5600, licenseStatus: 'expired', nextRenewalDate: '2025-09-01', annualBudget: 600000, revenue: 400000, expenses: 550000 },
  { registrationNumber: 'YE-2024-005', nameAr: 'اتحاد التجار اليمنيين', entityType: 'federation', classification: 'employers', governorate: 'تعز', status: 'active', complianceStatus: 'warned', riskLevel: 'medium', memberCount: 890, licenseStatus: 'pending_renewal', nextRenewalDate: '2026-07-05', annualBudget: 950000, revenue: 880000, expenses: 760000 },
  { registrationNumber: 'YE-2024-006', nameAr: 'نقابة الصحفيين', entityType: 'union', classification: 'professional', governorate: 'صنعاء', status: 'active', complianceStatus: 'compliant', riskLevel: 'low', memberCount: 420, licenseStatus: 'valid', nextRenewalDate: '2027-03-22', annualBudget: 400000, revenue: 380000, expenses: 310000 },
  { registrationNumber: 'YE-2024-007', nameAr: 'نقابة عمال النسيج', entityType: 'union', classification: 'labor', governorate: 'عدن', status: 'inactive', complianceStatus: 'non_compliant', riskLevel: 'critical', memberCount: 180, licenseStatus: 'revoked', nextRenewalDate: '2025-01-01', annualBudget: 120000, revenue: 60000, expenses: 150000 },
  { registrationNumber: 'YE-2024-008', nameAr: 'نقابة المحامين', entityType: 'federation', classification: 'professional', governorate: 'صنعاء', status: 'active', complianceStatus: 'compliant', riskLevel: 'low', memberCount: 760, licenseStatus: 'valid', nextRenewalDate: '2028-02-14', annualBudget: 1100000, revenue: 1050000, expenses: 870000 },
];

const DEMO_MEMBERS = [
  { nationalId: '1234567890', fullName: 'أحمد محمد الحداد', gender: 'male', profession: 'مهندس مدني', governorate: 'صنعاء', joinDate: '2020-03-15', status: 'active', phone: '711234567', memberNumber: 'M-001' },
  { nationalId: '0987654321', fullName: 'فاطمة علي الزهراء', gender: 'female', profession: 'طبيبة أسنان', governorate: 'عدن', joinDate: '2019-07-01', status: 'active', phone: '733456789', memberNumber: 'M-002' },
  { nationalId: '1122334455', fullName: 'خالد أحمد الشرجبي', gender: 'male', profession: 'محامٍ', governorate: 'تعز', joinDate: '2021-01-10', status: 'active', phone: '777890123', memberNumber: 'M-003' },
  { nationalId: '5544332211', fullName: 'مريم حسن البلحاف', gender: 'female', profession: 'معلمة', governorate: 'حضرموت', joinDate: '2018-09-05', status: 'inactive', phone: '712345678', memberNumber: 'M-004' },
  { nationalId: '9988776655', fullName: 'عمر عبدالله القحطاني', gender: 'male', profession: 'مهندس كهربائي', governorate: 'صنعاء', joinDate: '2022-04-20', status: 'active', phone: '736789012', memberNumber: 'M-005' },
];

const DEMO_ACTIVITIES = [
  { activityNumber: 'ACT-2026-001', activityName: 'ورشة التدريب على السلامة المهنية', activityType: 'workshop', startDate: '2026-03-10', location: 'قاعة المؤتمرات - صنعاء', actualParticipants: 45, status: 'completed', budget: 150000, actualCost: 138000 },
  { activityNumber: 'ACT-2026-002', activityName: 'مؤتمر اتحادات العمال السنوي', activityType: 'conference', startDate: '2026-04-15', location: 'فندق موفنبيك - عدن', actualParticipants: 120, status: 'completed', budget: 500000, actualCost: 480000 },
  { activityNumber: 'ACT-2026-003', activityName: 'انتخابات مجلس إدارة النقابة', activityType: 'election', startDate: '2026-05-20', location: 'مقر النقابة', actualParticipants: 89, status: 'ongoing', budget: 80000, actualCost: 65000 },
  { activityNumber: 'ACT-2026-004', activityName: 'دورة تطوير المهارات القيادية', activityType: 'training', startDate: '2026-06-05', location: 'مركز التدريب - تعز', actualParticipants: 32, status: 'planned', budget: 200000, actualCost: 0 },
];

const DEMO_VIOLATIONS = [
  { violationNumber: 'VIO-2026-001', violationType: 'عدم تقديم التقرير السنوي', severity: 'major', detectedDate: '2026-02-10', status: 'open', penaltyAmount: 50000 },
  { violationNumber: 'VIO-2026-002', violationType: 'مخالفة لوائح الانتخابات', severity: 'critical', detectedDate: '2026-01-20', status: 'under_review', penaltyAmount: 150000 },
  { violationNumber: 'VIO-2026-003', violationType: 'تأخر في تجديد الترخيص', severity: 'moderate', detectedDate: '2026-03-05', status: 'resolved', penaltyAmount: 20000 },
  { violationNumber: 'VIO-2026-004', violationType: 'عدم الإفصاح عن البيانات المالية', severity: 'major', detectedDate: '2026-04-12', status: 'open', penaltyAmount: 80000 },
];

// ============================================================
// إحصائيات للمخططات
// ============================================================

const GOV_DISTRIBUTION = [
  { name: 'صنعاء', value: 38 },
  { name: 'عدن', value: 22 },
  { name: 'تعز', value: 16 },
  { name: 'حضرموت', value: 13 },
  { name: 'أخرى', value: 11 },
];

const TYPE_DISTRIBUTION = [
  { name: 'مهنية', value: 42 },
  { name: 'عمالية', value: 31 },
  { name: 'أصحاب أعمال', value: 16 },
  { name: 'اجتماعية', value: 11 },
];

const MONTHLY_DATA = [
  { month: 'يناير', unions: 4, members: 120 },
  { month: 'فبراير', unions: 2, members: 85 },
  { month: 'مارس', unions: 6, members: 210 },
  { month: 'أبريل', unions: 3, members: 150 },
  { month: 'مايو', unions: 5, members: 190 },
  { month: 'يونيو', unions: 7, members: 260 },
];

const COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

// ============================================================
// أنواع التقارير المتاحة
// ============================================================

const REPORT_TEMPLATES = [
  { id: 'unions', label: 'تقرير النقابات', icon: Building2, color: 'bg-blue-50 border-blue-200 text-blue-800', reportType: 'members_list' as ReportType, data: DEMO_UNIONS, columns: UNION_REPORT_COLUMNS },
  { id: 'members', label: 'تقرير الأعضاء', icon: Users, color: 'bg-green-50 border-green-200 text-green-800', reportType: 'members_list' as ReportType, data: DEMO_MEMBERS, columns: MEMBER_REPORT_COLUMNS },
  { id: 'activities', label: 'تقرير الأنشطة', icon: Calendar, color: 'bg-purple-50 border-purple-200 text-purple-800', reportType: 'members_list' as ReportType, data: DEMO_ACTIVITIES, columns: ACTIVITY_REPORT_COLUMNS },
  { id: 'violations', label: 'تقرير المخالفات', icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-800', reportType: 'members_list' as ReportType, data: DEMO_VIOLATIONS, columns: VIOLATION_REPORT_COLUMNS },
  { id: 'compliance', label: 'تقرير الامتثال', icon: Shield, color: 'bg-yellow-50 border-yellow-200 text-yellow-800', reportType: 'compliance' as ReportType, data: DEMO_UNIONS, columns: UNION_REPORT_COLUMNS },
  { id: 'financial', label: 'التقرير المالي', icon: TrendingUp, color: 'bg-emerald-50 border-emerald-200 text-emerald-800', reportType: 'financial_summary' as ReportType, data: DEMO_UNIONS, columns: UNION_REPORT_COLUMNS },
];

// ============================================================
// المكوّن الرئيسي
// ============================================================

export function ReportsManagement() {
  const [reportType, setReportType] = useState('unions');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  const [printOptions, setPrintOptions] = useState<PrintExportOptions | null>(null);
  const [activeTab, setActiveTab] = useState<'builder' | 'charts'>('builder');
  const [govFilter, setGovFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');

  const selectedTemplate = REPORT_TEMPLATES.find(t => t.id === reportType) || REPORT_TEMPLATES[0];

  const filteredData = useMemo(() => {
    let d = selectedTemplate.data;
    if (govFilter !== 'الكل') d = d.filter((r: any) => r.governorate === govFilter);
    if (statusFilter !== 'الكل') d = d.filter((r: any) => r.status === statusFilter);
    return d;
  }, [selectedTemplate, govFilter, statusFilter]);

  const buildOptions = (): PrintExportOptions => ({
    title: selectedTemplate.label,
    subtitle: `تقرير رسمي صادر عن وزارة الشؤون الاجتماعية والعمل`,
    reportType: selectedTemplate.reportType,
    data: filteredData,
    columns: selectedTemplate.columns,
    dateFrom,
    dateTo,
    showSignatureBlock: true,
    showPageNumbers: true,
    orientation: reportType === 'financial' ? 'landscape' : 'portrait',
  });

  const handlePreviewPrint = () => setPrintOptions(buildOptions());
  const handleExportExcel = () => exportReportToExcel(buildOptions());
  const handleExportPDF = () => exportReportToPDF(buildOptions());

  const summaryStats = useMemo(() => ({
    total: DEMO_UNIONS.length,
    active: DEMO_UNIONS.filter(u => u.status === 'active').length,
    compliant: DEMO_UNIONS.filter(u => u.complianceStatus === 'compliant').length,
    highRisk: DEMO_UNIONS.filter(u => ['high', 'critical'].includes(u.riskLevel)).length,
  }), []);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير والمخرجات الرسمية</h1>
          <p className="text-sm text-gray-500 mt-1">قوالب جاهزة للطباعة والتصدير بتنسيق حكومي رسمي</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg border">
          <RefreshCw className="w-3 h-3" />
          <span>آخر تحديث: {new Date().toLocaleDateString('ar-YE')}</span>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الكيانات', value: summaryStats.total, icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'كيانات نشطة', value: summaryStats.active, icon: TrendingUp, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'ملتزمة', value: summaryStats.compliant, icon: Shield, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'مخاطر عالية', value: summaryStats.highRisk, icon: AlertTriangle, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-3 border rounded-xl p-4 ${s.color}`}>
            <s.icon className="w-8 h-8 shrink-0" />
            <div>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* اختيار نوع التقرير */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#1E3A8A]" />
          اختر نوع التقرير
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {REPORT_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setReportType(t.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                reportType === t.id
                  ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <t.icon className="w-6 h-6" />
              <span className="text-xs font-semibold text-center leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* منشئ التقرير */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        {/* تبويبات */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {[
            { id: 'builder', label: 'منشئ التقرير' },
            { id: 'charts', label: 'المخططات البيانية' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1E3A8A] text-[#1E3A8A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'builder' ? (
          <>
            {/* فلاتر */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">المحافظة</label>
                <select
                  value={govFilter}
                  onChange={e => setGovFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A8A]"
                >
                  {['الكل', 'صنعاء', 'عدن', 'تعز', 'حضرموت'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">الحالة</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E3A8A]"
                >
                  {['الكل', 'active', 'suspended', 'inactive'].map(s => (
                    <option key={s} value={s}>{s === 'الكل' ? 'الكل' : s === 'active' ? 'نشط' : s === 'suspended' ? 'معلق' : 'متوقف'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* معاينة الجدول */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  <span>إجمالي السجلات: <strong className="text-gray-800">{filteredData.length}</strong></span>
                </div>
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-sm">
                  <thead className="bg-[#1E3A8A] text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right font-semibold w-8">#</th>
                      {selectedTemplate.columns.slice(0, 6).map(col => (
                        <th key={col.key} className="px-3 py-2 text-right font-semibold">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.map((row: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                        <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                        {selectedTemplate.columns.slice(0, 6).map(col => (
                          <td key={col.key} className="px-3 py-2 text-gray-700">
                            {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* أزرار التصدير والطباعة */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePreviewPrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A8A] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                معاينة وطباعة
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                تصدير Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                تصدير PDF
              </button>
              <button
                onClick={() => {
                  const opts = buildOptions();
                  exportReportToExcel({ ...opts, reportType: 'statistics' });
                }}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                تصدير CSV
              </button>
            </div>
          </>
        ) : (
          /* تبويب المخططات */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">التسجيل الشهري الجديد</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="unions" name="نقابات جديدة" fill="#1E3A8A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="members" name="أعضاء جدد" fill="#60A5FA" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">توزيع النقابات حسب المحافظة</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={GOV_DISTRIBUTION} cx="50%" cy="50%" outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {GOV_DISTRIBUTION.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">توزيع حسب نوع التصنيف</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={TYPE_DISTRIBUTION} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="عدد الكيانات" fill="#2563EB" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-gray-700">ملخص الامتثال</h3>
              {[
                { label: 'ملتزمة', value: summaryStats.compliant, total: summaryStats.total, color: 'bg-green-500' },
                { label: 'غير ملتزمة', value: summaryStats.total - summaryStats.compliant, total: summaryStats.total, color: 'bg-red-400' },
                { label: 'نشطة', value: summaryStats.active, total: summaryStats.total, color: 'bg-blue-500' },
                { label: 'مخاطر عالية', value: summaryStats.highRisk, total: summaryStats.total, color: 'bg-orange-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-800">{item.value}/{item.total}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.value / item.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* قوالب التقارير الجاهزة */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-800 mb-4">قوالب التقارير الرسمية الجاهزة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'تقرير إحصائي شامل', desc: 'جميع الكيانات مع بيانات الامتثال والمخاطر',
              icon: BarChart3, type: 'compliance' as ReportType, data: DEMO_UNIONS, cols: UNION_REPORT_COLUMNS,
              badge: 'شهري', badgeColor: 'bg-blue-100 text-blue-700',
            },
            {
              title: 'التقرير المالي السنوي', desc: 'ملخص الميزانيات والإيرادات والمصروفات',
              icon: TrendingUp, type: 'financial_summary' as ReportType, data: DEMO_UNIONS, cols: UNION_REPORT_COLUMNS,
              badge: 'سنوي', badgeColor: 'bg-green-100 text-green-700',
            },
            {
              title: 'تقرير المخالفات والعقوبات', desc: 'قائمة المخالفات المسجلة والإجراءات المتخذة',
              icon: AlertTriangle, type: 'members_list' as ReportType, data: DEMO_VIOLATIONS, cols: VIOLATION_REPORT_COLUMNS,
              badge: 'ربع سنوي', badgeColor: 'bg-red-100 text-red-700',
            },
            {
              title: 'قائمة الأعضاء الكاملة', desc: 'سجل الأعضاء المسجلين مع بياناتهم الكاملة',
              icon: Users, type: 'members_list' as ReportType, data: DEMO_MEMBERS, cols: MEMBER_REPORT_COLUMNS,
              badge: 'عند الطلب', badgeColor: 'bg-purple-100 text-purple-700',
            },
            {
              title: 'تقرير الأنشطة والفعاليات', desc: 'الأنشطة المنجزة والمخططة مع التكاليف',
              icon: Calendar, type: 'members_list' as ReportType, data: DEMO_ACTIVITIES, cols: ACTIVITY_REPORT_COLUMNS,
              badge: 'نصف سنوي', badgeColor: 'bg-indigo-100 text-indigo-700',
            },
            {
              title: 'تقرير التراخيص المنتهية', desc: 'كيانات تحتاج تجديد ترخيصها',
              icon: Shield,
              type: 'compliance' as ReportType,
              data: DEMO_UNIONS.filter(u => ['expired', 'pending_renewal'].includes(u.licenseStatus)),
              cols: UNION_REPORT_COLUMNS,
              badge: 'فوري', badgeColor: 'bg-yellow-100 text-yellow-700',
            },
          ].map((tpl, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-[#1E3A8A] hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#EFF6FF] rounded-lg group-hover:bg-[#DBEAFE] transition-colors">
                    <tpl.icon className="w-5 h-5 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{tpl.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.desc}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${tpl.badgeColor}`}>{tpl.badge}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrintOptions({
                    title: tpl.title,
                    subtitle: tpl.desc,
                    reportType: tpl.type,
                    data: tpl.data,
                    columns: tpl.cols,
                    dateFrom, dateTo,
                    showSignatureBlock: true,
                  })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1E3A8A] text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors"
                >
                  <Printer className="w-3 h-3" /> طباعة
                </button>
                <button
                  onClick={() => exportReportToExcel({ title: tpl.title, reportType: tpl.type, data: tpl.data, columns: tpl.cols, dateFrom, dateTo })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3 h-3" /> Excel
                </button>
                <button
                  onClick={() => exportReportToPDF({ title: tpl.title, reportType: tpl.type, data: tpl.data, columns: tpl.cols, dateFrom, dateTo })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  <FileText className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* نافذة المعاينة والطباعة */}
      {printOptions && (
        <PrintPreviewModal
          options={printOptions}
          onClose={() => setPrintOptions(null)}
        />
      )}
    </div>
  );
}
