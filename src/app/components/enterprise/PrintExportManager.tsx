/**
 * PrintExportManager — نظام الطباعة والتصدير الرسمي
 * قوالب مؤسسية حكومية جاهزة للطباعة والتصدير
 */

import { useRef, useCallback } from 'react';
import { Printer, Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================
// أنواع البيانات
// ============================================================

export type ReportType =
  | 'entity_card'        // بطاقة الكيان
  | 'entity_detail'      // تقرير تفصيلي للكيان
  | 'members_list'       // قائمة الأعضاء
  | 'activities_list'    // قائمة الأنشطة
  | 'violations_list'    // قائمة المخالفات
  | 'statistics'         // تقرير إحصائي
  | 'compliance'         // تقرير الامتثال
  | 'license_certificate'// شهادة ترخيص
  | 'membership_certificate' // شهادة عضوية
  | 'inspection_report'  // تقرير تفتيش
  | 'financial_summary'; // ملخص مالي

export interface ReportColumn {
  key: string;
  label: string;
  width?: number;
  format?: (val: any) => string;
}

export interface PrintExportOptions {
  title: string;
  subtitle?: string;
  reportType: ReportType;
  data: any[];
  columns?: ReportColumn[];
  entity?: any;           // للتقارير المرتبطة بكيان واحد
  dateFrom?: string;
  dateTo?: string;
  showGovernmentHeader?: boolean;
  showSignatureBlock?: boolean;
  showQrCode?: boolean;
  showPageNumbers?: boolean;
  orientation?: 'portrait' | 'landscape';
  footerText?: string;
}

// ============================================================
// ترويسة الحكومة (مشتركة لجميع القوالب)
// ============================================================

const MINISTRY_NAME = 'وزارة الشؤون الاجتماعية والعمل';
const REPUBLIC_NAME = 'الجمهورية اليمنية';
const DEVELOPER = 'ديناميك لخدمات البرمجيات';
const PLATFORM = 'منصة إدارة المنظمات النقابية';

function GovernmentHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b-2 border-[#1E3A8A] pb-3 mb-4 ${compact ? 'text-xs' : ''}`}>
      {/* يسار - شعار */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 border-2 border-[#1E3A8A] rounded-full flex items-center justify-center bg-[#EFF6FF]">
          <svg viewBox="0 0 60 60" className="w-10 h-10">
            <circle cx="30" cy="30" r="28" fill="none" stroke="#1E3A8A" strokeWidth="2"/>
            <path d="M30 10 L30 50 M15 25 L45 25 M15 35 L45 35" stroke="#1E3A8A" strokeWidth="1.5" fill="none"/>
            <circle cx="30" cy="20" r="5" fill="#1E3A8A"/>
            <path d="M20 50 Q30 42 40 50" stroke="#1E3A8A" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
        <span className="text-[10px] text-[#1E3A8A] font-bold">UnionSphere</span>
      </div>

      {/* وسط - البيانات الرسمية */}
      <div className="text-center flex-1 mx-4">
        <p className="text-[#1E3A8A] font-bold text-sm">{REPUBLIC_NAME}</p>
        <p className="text-gray-700 font-semibold text-base mt-0.5">{MINISTRY_NAME}</p>
        <p className="text-[#1E3A8A] text-xs mt-0.5">{PLATFORM}</p>
      </div>

      {/* يمين - معلومات إضافية */}
      <div className="flex flex-col items-center gap-1 text-[10px] text-gray-500">
        <div className="w-14 h-14 border border-gray-300 rounded flex items-center justify-center bg-gray-50">
          <div className="grid grid-cols-5 gap-px">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-gray-700' : 'bg-white'}`} />
            ))}
          </div>
        </div>
        <span>رمز QR للتحقق</span>
      </div>
    </div>
  );
}

function GovernmentFooter({ page, total }: { page?: number; total?: number }) {
  return (
    <div className="border-t border-gray-300 pt-2 mt-4 flex items-center justify-between text-[10px] text-gray-400">
      <span>طُبع من منصة UnionSphere — {DEVELOPER}</span>
      <span>التاريخ: {new Date().toLocaleDateString('ar-YE')}</span>
      {page && total && <span>صفحة {page} من {total}</span>}
    </div>
  );
}

function SignatureBlock() {
  return (
    <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs text-gray-700">
      <div>
        <div className="border-b border-gray-400 mb-1 h-10"></div>
        <p className="font-semibold">مسؤول البيانات</p>
        <p className="text-gray-400">الاسم / التوقيع / التاريخ</p>
      </div>
      <div>
        <div className="border-b border-gray-400 mb-1 h-10"></div>
        <p className="font-semibold">رئيس القسم</p>
        <p className="text-gray-400">الاسم / التوقيع / التاريخ</p>
      </div>
      <div>
        <div className="border-b border-gray-400 mb-1 h-10"></div>
        <p className="font-semibold">مدير الإدارة</p>
        <p className="text-gray-400">الاسم / التوقيع / التاريخ</p>
      </div>
    </div>
  );
}

// ============================================================
// مكوّن بطاقة الكيان
// ============================================================

function EntityCard({ entity }: { entity: any }) {
  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-700',
    dissolved: 'bg-red-100 text-red-800',
    under_review: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="border-2 border-[#1E3A8A] rounded-xl p-5 bg-white max-w-2xl mx-auto">
      <GovernmentHeader />
      <div className="text-center mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">بطاقة تعريف الكيان</p>
        <h2 className="text-xl font-bold text-[#1E3A8A] mt-1">{entity?.nameAr || entity?.name_ar || '—'}</h2>
        {(entity?.nameEn || entity?.name_en) && (
          <p className="text-sm text-gray-500">{entity?.nameEn || entity?.name_en}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border-t pt-3">
        {[
          ['رقم التسجيل', entity?.registrationNumber || entity?.registration_number],
          ['الرمز الموحد', entity?.unifiedCode || entity?.unified_code],
          ['نوع الكيان', entity?.entityType || entity?.entity_type],
          ['الشكل القانوني', entity?.legalForm || entity?.legal_form],
          ['التصنيف', entity?.classification],
          ['القطاع', entity?.sector],
          ['المحافظة', entity?.address?.governorate || entity?.governorate],
          ['المدينة', entity?.address?.city || entity?.city],
          ['تاريخ التأسيس', entity?.establishmentDate || entity?.establishment_date],
          ['تاريخ التسجيل', entity?.registrationDate || entity?.registration_date],
          ['عدد الأعضاء', entity?.memberCount?.toLocaleString() || entity?.member_count],
          ['عدد الفروع', entity?.branchCount || entity?.branch_count],
          ['الرئيس', entity?.president?.fullName || entity?.president_name],
          ['هاتف الرئيس', entity?.president?.phone || entity?.president_phone],
          ['البريد الإلكتروني', entity?.contactInfo?.email || entity?.email],
          ['الهاتف', entity?.contactInfo?.phone || entity?.phone],
        ].map(([label, value]) => value ? (
          <div key={String(label)} className="flex gap-2">
            <span className="font-semibold text-gray-600 min-w-[100px]">{label}:</span>
            <span className="text-gray-800">{String(value)}</span>
          </div>
        ) : null)}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-600">الحالة:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[entity?.status] || 'bg-gray-100 text-gray-700'}`}>
          {entity?.status === 'active' ? 'نشط' : entity?.status === 'suspended' ? 'معلق' : entity?.status || '—'}
        </span>
        <span className="text-sm font-semibold text-gray-600 mr-4">الامتثال:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${entity?.complianceStatus === 'compliant' || entity?.compliance_status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {entity?.complianceStatus === 'compliant' || entity?.compliance_status === 'compliant' ? 'ملتزم' : 'غير ملتزم'}
        </span>
      </div>

      <GovernmentFooter />
    </div>
  );
}

// ============================================================
// مكوّن تقرير قائمة البيانات
// ============================================================

function DataListReport({ options }: { options: PrintExportOptions }) {
  const { title, subtitle, data, columns = [], dateFrom, dateTo } = options;

  return (
    <div className="bg-white p-6 text-sm">
      <GovernmentHeader />

      {/* عنوان التقرير */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold text-[#1E3A8A]">{title}</h1>
        {subtitle && <p className="text-gray-600 text-xs mt-1">{subtitle}</p>}
        {(dateFrom || dateTo) && (
          <p className="text-gray-500 text-xs mt-1">
            الفترة: {dateFrom || '—'} إلى {dateTo || '—'}
          </p>
        )}
        <div className="flex justify-center gap-6 mt-2 text-xs text-gray-500">
          <span>إجمالي السجلات: <strong className="text-gray-700">{data.length}</strong></span>
          <span>تاريخ الطباعة: <strong className="text-gray-700">{new Date().toLocaleDateString('ar-YE')}</strong></span>
        </div>
      </div>

      {/* الجدول */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#1E3A8A] text-white">
            <th className="border border-[#1E3A8A] px-2 py-2 text-center w-8">#</th>
            {columns.map(col => (
              <th key={col.key} className="border border-[#1E3A8A] px-2 py-2 text-right">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EFF6FF]'}>
              <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-500">{i + 1}</td>
              {columns.map(col => (
                <td key={col.key} className="border border-gray-200 px-2 py-1.5 text-gray-800">
                  {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold">
            <td colSpan={columns.length + 1} className="border border-gray-200 px-2 py-2 text-left text-gray-600">
              المجموع: {data.length} سجل
            </td>
          </tr>
        </tfoot>
      </table>

      {options.showSignatureBlock && <SignatureBlock />}
      <GovernmentFooter />
    </div>
  );
}

// ============================================================
// مكوّن شهادة الترخيص
// ============================================================

function LicenseCertificate({ entity }: { entity: any }) {
  return (
    <div className="border-4 border-double border-[#1E3A8A] rounded-2xl p-8 bg-white max-w-2xl mx-auto text-center relative overflow-hidden">
      {/* خلفية مائية */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <span className="text-[120px] font-black text-[#1E3A8A] rotate-[-30deg] select-none">رسمي</span>
      </div>

      <GovernmentHeader />

      <div className="my-6">
        <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-3">شهادة تسجيل وترخيص</p>
        <div className="w-20 h-1 bg-[#1E3A8A] mx-auto mb-6 rounded"></div>

        <p className="text-gray-700 text-sm leading-relaxed">
          تشهد <strong>وزارة الشؤون الاجتماعية والعمل</strong> بأن الكيان المؤسسي:
        </p>

        <h2 className="text-2xl font-black text-[#1E3A8A] my-4">
          {entity?.nameAr || entity?.name_ar || '—'}
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 border border-[#1E3A8A] rounded-lg p-4 mb-4 text-right">
          <div><span className="font-semibold">رقم التسجيل:</span> {entity?.registrationNumber || entity?.registration_number || '—'}</div>
          <div><span className="font-semibold">رقم الترخيص:</span> {entity?.licenseNumber || entity?.license_number || '—'}</div>
          <div><span className="font-semibold">تاريخ التسجيل:</span> {entity?.registrationDate || entity?.registration_date || '—'}</div>
          <div><span className="font-semibold">تاريخ التجديد:</span> {entity?.nextRenewalDate || entity?.next_renewal_date || '—'}</div>
          <div><span className="font-semibold">نوع الكيان:</span> {entity?.entityType || entity?.entity_type || '—'}</div>
          <div><span className="font-semibold">المقر الرئيسي:</span> {entity?.address?.governorate || entity?.governorate || '—'}</div>
        </div>

        <p className="text-gray-600 text-xs leading-relaxed">
          مُسجَّل رسمياً ومرخَّص بموجب القوانين واللوائح المعمول بها، ويحق له مزاولة نشاطه وفق أحكام هذا الترخيص.
        </p>
      </div>

      <SignatureBlock />
      <GovernmentFooter />
    </div>
  );
}

// ============================================================
// مكوّن شهادة العضوية
// ============================================================

function MembershipCertificate({ member, entity }: { member: any; entity?: any }) {
  return (
    <div className="border-4 border-double border-[#166534] rounded-2xl p-8 bg-white max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <span className="text-[100px] font-black text-[#166534] rotate-[-30deg] select-none">عضو</span>
      </div>

      <GovernmentHeader />

      <div className="my-6">
        <p className="text-xs tracking-[0.3em] text-gray-500 mb-3">شهادة عضوية</p>
        <div className="w-16 h-1 bg-[#166534] mx-auto mb-6 rounded"></div>

        <p className="text-gray-700 text-sm">يشهد بأن السيد/السيدة:</p>
        <h2 className="text-2xl font-black text-[#166534] my-3">{member?.fullName || member?.full_name || '—'}</h2>

        <div className="text-sm text-gray-700 border border-[#166534] rounded-lg p-4 mb-4 text-right space-y-1.5">
          <div><span className="font-semibold">الرقم الوطني:</span> {member?.nationalId || member?.national_id || '—'}</div>
          <div><span className="font-semibold">رقم العضوية:</span> {member?.memberNumber || member?.member_number || '—'}</div>
          <div><span className="font-semibold">المهنة:</span> {member?.profession || '—'}</div>
          <div><span className="font-semibold">تاريخ الانضمام:</span> {member?.joinDate || member?.join_date || '—'}</div>
          {entity && <div><span className="font-semibold">الكيان المنتسب:</span> {entity?.nameAr || entity?.name_ar || '—'}</div>}
        </div>

        <p className="text-gray-600 text-xs">عضو نشط ومسجل وفق القوانين واللوائح المعمول بها.</p>
      </div>

      <SignatureBlock />
      <GovernmentFooter />
    </div>
  );
}

// ============================================================
// مكوّن تقرير الامتثال والمخاطر
// ============================================================

function ComplianceReport({ options }: { options: PrintExportOptions }) {
  const { title, data, dateFrom, dateTo } = options;

  const summary = {
    total: data.length,
    compliant: data.filter(d => d.complianceStatus === 'compliant' || d.compliance_status === 'compliant').length,
    nonCompliant: data.filter(d => d.complianceStatus === 'non_compliant' || d.compliance_status === 'non_compliant').length,
    highRisk: data.filter(d => ['high', 'critical'].includes(d.riskLevel || d.risk_level || '')).length,
    expiredLicense: data.filter(d => (d.licenseStatus || d.license_status) === 'expired').length,
  };

  return (
    <div className="bg-white p-6 text-sm">
      <GovernmentHeader />

      <div className="text-center mb-5">
        <h1 className="text-lg font-bold text-[#1E3A8A]">{title}</h1>
        {(dateFrom || dateTo) && (
          <p className="text-gray-500 text-xs mt-1">الفترة: {dateFrom} — {dateTo}</p>
        )}
      </div>

      {/* ملخص إحصائي */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'إجمالي الكيانات', value: summary.total, color: 'bg-blue-50 border-blue-300 text-blue-800' },
          { label: 'ملتزمة', value: summary.compliant, color: 'bg-green-50 border-green-300 text-green-800' },
          { label: 'غير ملتزمة', value: summary.nonCompliant, color: 'bg-red-50 border-red-300 text-red-800' },
          { label: 'مخاطر عالية', value: summary.highRisk, color: 'bg-orange-50 border-orange-300 text-orange-800' },
          { label: 'تراخيص منتهية', value: summary.expiredLicense, color: 'bg-yellow-50 border-yellow-300 text-yellow-800' },
        ].map(item => (
          <div key={item.label} className={`border rounded-lg p-3 text-center ${item.color}`}>
            <p className="text-2xl font-black">{item.value}</p>
            <p className="text-xs mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* معدل الامتثال */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold text-gray-700">معدل الامتثال العام</span>
          <span className="font-bold text-[#1E3A8A]">
            {summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1E3A8A] rounded-full"
            style={{ width: `${summary.total > 0 ? (summary.compliant / summary.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* تفاصيل الجدول */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#1E3A8A] text-white">
            {['#', 'اسم الكيان', 'رقم التسجيل', 'الحالة', 'الامتثال', 'المخاطر', 'تاريخ التجديد'].map(h => (
              <th key={h} className="border border-[#1E3A8A] px-2 py-2 text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const risk = row.riskLevel || row.risk_level;
            const riskColor = risk === 'critical' ? 'text-red-700 font-bold' : risk === 'high' ? 'text-orange-600' : risk === 'medium' ? 'text-yellow-600' : 'text-green-600';
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-200 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-gray-200 px-2 py-1.5 font-medium">{row.nameAr || row.name_ar || '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5 font-mono">{row.registrationNumber || row.registration_number || '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5">{row.status || '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5">{row.complianceStatus || row.compliance_status || '—'}</td>
                <td className={`border border-gray-200 px-2 py-1.5 ${riskColor}`}>{risk || '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5">{row.nextRenewalDate || row.next_renewal_date || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {options.showSignatureBlock && <SignatureBlock />}
      <GovernmentFooter />
    </div>
  );
}

// ============================================================
// مكوّن تقرير مالي
// ============================================================

function FinancialSummaryReport({ options }: { options: PrintExportOptions }) {
  const { title, data, dateFrom, dateTo } = options;

  const totalBudget = data.reduce((s, r) => s + (Number(r.annualBudget || r.annual_budget) || 0), 0);
  const totalRevenue = data.reduce((s, r) => s + (Number(r.financialIndicators?.revenue || r.revenue) || 0), 0);
  const totalExpenses = data.reduce((s, r) => s + (Number(r.financialIndicators?.expenses || r.expenses) || 0), 0);

  const fmt = (n: number) => n.toLocaleString('ar-YE', { minimumFractionDigits: 0 });

  return (
    <div className="bg-white p-6 text-sm">
      <GovernmentHeader />
      <div className="text-center mb-5">
        <h1 className="text-lg font-bold text-[#1E3A8A]">{title}</h1>
        {(dateFrom || dateTo) && <p className="text-gray-500 text-xs mt-1">الفترة: {dateFrom} — {dateTo}</p>}
      </div>

      {/* ملخص مالي كلي */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي الميزانيات', value: fmt(totalBudget) + ' ر.ي', color: 'border-blue-400 bg-blue-50 text-blue-800' },
          { label: 'إجمالي الإيرادات', value: fmt(totalRevenue) + ' ر.ي', color: 'border-green-400 bg-green-50 text-green-800' },
          { label: 'إجمالي المصروفات', value: fmt(totalExpenses) + ' ر.ي', color: 'border-red-400 bg-red-50 text-red-800' },
        ].map(item => (
          <div key={item.label} className={`border-2 rounded-xl p-4 text-center ${item.color}`}>
            <p className="text-xl font-black">{item.value}</p>
            <p className="text-xs mt-1 font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#1E3A8A] text-white">
            {['#', 'الكيان', 'الميزانية السنوية', 'الإيرادات', 'المصروفات', 'الفائض/العجز'].map(h => (
              <th key={h} className="border border-[#1E3A8A] px-2 py-2 text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const budget = Number(row.annualBudget || row.annual_budget) || 0;
            const revenue = Number(row.financialIndicators?.revenue || row.revenue) || 0;
            const expenses = Number(row.financialIndicators?.expenses || row.expenses) || 0;
            const surplus = revenue - expenses;
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-200 px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-gray-200 px-2 py-1.5 font-medium">{row.nameAr || row.name_ar || '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5">{budget ? fmt(budget) : '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5">{revenue ? fmt(revenue) : '—'}</td>
                <td className="border border-gray-200 px-2 py-1.5">{expenses ? fmt(expenses) : '—'}</td>
                <td className={`border border-gray-200 px-2 py-1.5 font-semibold ${surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {surplus ? fmt(Math.abs(surplus)) + (surplus >= 0 ? ' فائض' : ' عجز') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#EFF6FF] font-bold text-[#1E3A8A]">
            <td colSpan={2} className="border border-gray-300 px-2 py-2">المجموع الكلي</td>
            <td className="border border-gray-300 px-2 py-2">{fmt(totalBudget)}</td>
            <td className="border border-gray-300 px-2 py-2">{fmt(totalRevenue)}</td>
            <td className="border border-gray-300 px-2 py-2">{fmt(totalExpenses)}</td>
            <td className={`border border-gray-300 px-2 py-2 ${totalRevenue - totalExpenses >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {fmt(Math.abs(totalRevenue - totalExpenses))} {totalRevenue - totalExpenses >= 0 ? 'فائض' : 'عجز'}
            </td>
          </tr>
        </tfoot>
      </table>

      {options.showSignatureBlock && <SignatureBlock />}
      <GovernmentFooter />
    </div>
  );
}

// ============================================================
// دوال التصدير إلى Excel و PDF
// ============================================================

export function exportReportToExcel(options: PrintExportOptions) {
  const { title, data, columns = [], dateFrom, dateTo } = options;

  const meta = [
    [REPUBLIC_NAME],
    [MINISTRY_NAME],
    [title],
    [`الفترة: ${dateFrom || '—'} إلى ${dateTo || '—'}`],
    [`تاريخ الطباعة: ${new Date().toLocaleDateString('ar-YE')}`],
    [],
    ['#', ...columns.map(c => c.label)],
  ];

  const rows = data.map((row, i) => [
    i + 1,
    ...columns.map(col => (col.format ? col.format(row[col.key]) : row[col.key] ?? '')),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...meta, ...rows]);

  // تنسيق عرض الأعمدة
  ws['!cols'] = [{ wch: 5 }, ...columns.map(c => ({ wch: c.width || 20 }))];

  // دمج خلايا العنوان
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: columns.length } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');

  // ورقة البيانات الوصفية
  const metaWs = XLSX.utils.aoa_to_sheet([
    ['المنصة', PLATFORM],
    ['المطور', DEVELOPER],
    ['نوع التقرير', title],
    ['تاريخ الإنشاء', new Date().toISOString()],
    ['إجمالي السجلات', data.length],
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'بيانات_وصفية');

  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportReportToPDF(options: PrintExportOptions) {
  const { title, data, columns = [], dateFrom, dateTo, orientation = 'landscape' } = options;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;

  // ترويسة PDF
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(REPUBLIC_NAME, pw / 2, 12, { align: 'center' });
  doc.setFontSize(13);
  doc.text(MINISTRY_NAME, pw / 2, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(title, pw / 2, 30, { align: 'center' });

  if (dateFrom || dateTo) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`الفترة: ${dateFrom || '—'} — ${dateTo || '—'}`, pw / 2, 37, { align: 'center' });
  }

  doc.setFontSize(9);
  doc.text(`تاريخ الطباعة: ${new Date().toLocaleDateString('ar-YE')}`, 14, 37);
  doc.text(`إجمالي السجلات: ${data.length}`, pw - 14, 37, { align: 'right' });

  // فاصل
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(14, 40, pw - 14, 40);

  // الجدول
  const tableColumns = columns.map(c => ({ header: c.label, dataKey: c.key }));
  const tableRows = data.map((row, i) => ({
    '#': i + 1,
    ...Object.fromEntries(
      columns.map(col => [col.key, col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')])
    ),
  }));

  autoTable(doc, {
    startY: 44,
    head: [['#', ...tableColumns.map(c => c.header)]],
    body: tableRows.map(r => ['#', ...columns.map(c => r[c.key] ?? '—').map(String)].map((v, i) => i === 0 ? String(r['#']) : v)),
    styles: { font: 'helvetica', fontSize: 8, halign: 'right', cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: 14, right: 14 },
    didDrawPage: (d) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${DEVELOPER} — ${PLATFORM}`, 14, doc.internal.pageSize.height - 8);
      doc.text(`صفحة ${d.pageNumber} من ${pageCount}`, pw - 14, doc.internal.pageSize.height - 8, { align: 'right' });
    },
  });

  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ============================================================
// مكوّن نافذة الطباعة
// ============================================================

interface PrintPreviewModalProps {
  options: PrintExportOptions;
  onClose: () => void;
}

export function PrintPreviewModal({ options, onClose }: PrintPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8"/>
        <title>${options.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: white; color: #111; font-size: 12px; }
          @page { size: A4; margin: 15mm 12mm; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #e5e7eb; padding: 4px 8px; text-align: right; }
          thead tr { background-color: #1E3A8A !important; color: white !important; }
          .bg-blue-50 { background-color: #eff6ff; }
          .bg-green-50 { background-color: #f0fdf4; }
          .bg-red-50 { background-color: #fef2f2; }
          .bg-orange-50 { background-color: #fff7ed; }
          .bg-yellow-50 { background-color: #fefce8; }
          .text-green-800 { color: #166534; }
          .text-red-800 { color: #991b1b; }
          .text-blue-800 { color: #1e40af; }
          .text-orange-800 { color: #9a3412; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }, [options.title]);

  const renderContent = () => {
    switch (options.reportType) {
      case 'entity_card':
        return <EntityCard entity={options.entity || options.data[0]} />;
      case 'license_certificate':
        return <LicenseCertificate entity={options.entity || options.data[0]} />;
      case 'membership_certificate':
        return <MembershipCertificate member={options.data[0]} entity={options.entity} />;
      case 'compliance':
        return <ComplianceReport options={options} />;
      case 'financial_summary':
        return <FinancialSummaryReport options={options} />;
      default:
        return <DataListReport options={options} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" dir="rtl">
      {/* شريط الأدوات */}
      <div className="bg-[#1E3A8A] text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          <span className="font-semibold">{options.title} — معاينة الطباعة</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-[#1E3A8A] rounded-lg text-sm font-semibold hover:bg-blue-50"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button
            onClick={() => exportReportToExcel(options)}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => exportReportToPDF(options)}
            className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-blue-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* معاينة الوثيقة */}
      <div className="flex-1 overflow-auto bg-gray-300 p-6">
        <div
          ref={printRef}
          className="bg-white shadow-2xl rounded-lg mx-auto min-h-[297mm]"
          style={{ width: options.orientation === 'landscape' ? '297mm' : '210mm', padding: '15mm' }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Hook مساعد لاستخدام النظام
// ============================================================

export function usePrintExport() {
  const print = useCallback((options: PrintExportOptions) => {
    const div = document.createElement('div');
    div.style.display = 'none';
    document.body.appendChild(div);

    const cleanup = () => {
      document.body.removeChild(div);
    };

    return { cleanup, exportToExcel: () => exportReportToExcel(options), exportToPDF: () => exportReportToPDF(options) };
  }, []);

  return { print, exportToExcel: exportReportToExcel, exportToPDF: exportReportToPDF };
}

// ============================================================
// أعمدة جاهزة للقوالب المختلفة
// ============================================================

export const UNION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'registrationNumber', label: 'رقم التسجيل', width: 15 },
  { key: 'nameAr', label: 'الاسم العربي', width: 30 },
  { key: 'entityType', label: 'نوع الكيان', width: 12 },
  { key: 'classification', label: 'التصنيف', width: 12 },
  { key: 'governorate', label: 'المحافظة', width: 12 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'memberCount', label: 'عدد الأعضاء', width: 12 },
  { key: 'complianceStatus', label: 'الامتثال', width: 12 },
  { key: 'nextRenewalDate', label: 'تجديد الترخيص', width: 14 },
];

export const MEMBER_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'nationalId', label: 'الرقم الوطني', width: 14 },
  { key: 'fullName', label: 'الاسم الكامل', width: 25 },
  { key: 'gender', label: 'الجنس', width: 8, format: v => v === 'male' ? 'ذكر' : 'أنثى' },
  { key: 'profession', label: 'المهنة', width: 18 },
  { key: 'governorate', label: 'المحافظة', width: 12 },
  { key: 'joinDate', label: 'تاريخ الانضمام', width: 14 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'phone', label: 'الهاتف', width: 14 },
];

export const ACTIVITY_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'activityNumber', label: 'رقم النشاط', width: 12 },
  { key: 'activityName', label: 'اسم النشاط', width: 28 },
  { key: 'activityType', label: 'النوع', width: 14 },
  { key: 'startDate', label: 'تاريخ البدء', width: 14 },
  { key: 'location', label: 'المكان', width: 16 },
  { key: 'actualParticipants', label: 'المشاركون', width: 12 },
  { key: 'status', label: 'الحالة', width: 12 },
];

export const VIOLATION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'violationNumber', label: 'رقم المخالفة', width: 14 },
  { key: 'violationType', label: 'نوع المخالفة', width: 22 },
  { key: 'severity', label: 'الخطورة', width: 12 },
  { key: 'detectedDate', label: 'تاريخ الاكتشاف', width: 14 },
  { key: 'status', label: 'الحالة', width: 12 },
  { key: 'penaltyAmount', label: 'قيمة الغرامة', width: 14 },
];
