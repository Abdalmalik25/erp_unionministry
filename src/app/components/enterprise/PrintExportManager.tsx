/**
 * PrintExportManager — نظام الطباعة والتصدير الرسمي
 * قوالب مؤسسية حكومية جاهزة للطباعة والتصدير
 */

import { useRef, useCallback } from 'react';
import { Printer, FileSpreadsheet, FileText, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BRAND } from '../../branding';
import { BrandLogo } from '../ui/BrandLogo';
import { getOfficialIdentity, useBranding } from '../../hooks/useBranding';

// ============================================================
// أنواع البيانات
// ============================================================

export type ReportType =
  | 'entity_card'        // بطاقة المنشأة
  | 'entity_detail'      // تقرير تفصيلي للكيان
  | 'members_list'       // قائمة الأعضاء
  | 'activities_list'    // قائمة الأنشطة
  | 'violations_list'    // قائمة المخالفات
  | 'statistics'         // تقرير إحصائي
  | 'compliance'         // تقرير الامتثال
  | 'license_certificate'// شهادة ترخيص
  | 'membership_certificate' // شهادة عضوية
  | 'inspection_report'  // تقرير تفتيش
  | 'financial_summary'  // ملخص مالي
  | 'risk_assessment'    // تقرير تقييم المخاطر
  | 'maturity_assessment'; // تقرير النضج المؤسسي

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
// ترويسة الحكومة (مشتركة لجميع القوالب) — الهوية من إعدادات النظام
// ============================================================

function GovernmentHeader({ compact = false }: { compact?: boolean }) {
  const identity = useBranding();
  return (
    <div className={`flex items-center justify-between border-b-2 border-primary pb-3 mb-4 ${compact ? 'text-xs' : ''}`}>
      {/* يسار - شعار الجمهورية الرسمي */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-16 h-16 border border-primary/30 rounded-xl flex items-center justify-center p-1 bg-white shadow-sm">
          <BrandLogo size={56} rounded="lg" />
        </div>
        <span className="text-[10px] text-primary font-bold">{BRAND.systemShort}</span>
      </div>

      {/* وسط - البيانات الرسمية */}
      <div className="text-center flex-1 mx-4">
        <p className="text-primary font-bold text-sm tracking-wide">{identity.countryAr}</p>
        <p className="text-foreground font-bold text-base mt-0.5">{identity.ministryNameAr}</p>
        <p className="text-primary text-xs font-semibold mt-0.5">{identity.systemNameAr}</p>
      </div>

      {/* يمين - رمز التحقق الأمني */}
      <div className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
        <div className="w-14 h-14 border border-border rounded-lg flex items-center justify-center bg-muted p-1">
          <div className="grid grid-cols-5 gap-px">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-primary-dark' : 'bg-white'}`} />
            ))}
          </div>
        </div>
        <span className="font-mono text-[9px]">وثيقة رسمية معتمدة</span>
      </div>
    </div>
  );
}

function GovernmentFooter({ page, total }: { page?: number; total?: number }) {
  const identity = useBranding();
  return (
    <div className="border-t border-border pt-2 mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
      <span>{identity.countryAr} — {identity.ministryNameAr} — قطاع العمل</span>
      <span>تاريخ الإصدار: {new Date().toLocaleDateString('ar-YE')}</span>
      {page && total && <span>صفحة {page} من {total}</span>}
    </div>
  );
}

function SignatureBlock() {
  return (
    <div className="mt-8 grid grid-cols-3 gap-8 text-center text-xs text-foreground">
      <div>
        <div className="border-b border-border mb-1 h-10"></div>
        <p className="font-semibold">مسؤول البيانات</p>
        <p className="text-muted-foreground">الاسم / التوقيع / التاريخ</p>
      </div>
      <div>
        <div className="border-b border-border mb-1 h-10"></div>
        <p className="font-semibold">رئيس القسم</p>
        <p className="text-muted-foreground">الاسم / التوقيع / التاريخ</p>
      </div>
      <div>
        <div className="border-b border-border mb-1 h-10"></div>
        <p className="font-semibold">مدير الإدارة</p>
        <p className="text-muted-foreground">الاسم / التوقيع / التاريخ</p>
      </div>
    </div>
  );
}

// ============================================================
// مكوّن بطاقة المنشأة
// ============================================================

function EntityCard({ entity }: { entity: any }) {
  const statusColor: Record<string, string> = {
    active: 'bg-success/15 text-success-dark',
    suspended: 'bg-warning/15 text-warning-dark',
    inactive: 'bg-muted text-foreground',
    dissolved: 'bg-error/15 text-error',
    under_review: 'bg-info/15 text-info-dark',
  };

  return (
    <div className="border-2 border-primary rounded-xl p-5 bg-card max-w-2xl mx-auto">
      <GovernmentHeader />
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">بطاقة تعريف المنشأة</p>
        <h2 className="text-xl font-bold text-primary mt-1">{entity?.nameAr || entity?.name_ar || '—'}</h2>
        {(entity?.nameEn || entity?.name_en) && (
          <p className="text-sm text-muted-foreground">{entity?.nameEn || entity?.name_en}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border-t pt-3">
        {[
          ['رقم التسجيل', entity?.registrationNumber || entity?.registration_number],
          ['الرمز الموحد', entity?.unifiedCode || entity?.unified_code],
          ['نوع المنشأة', entity?.entityType || entity?.entity_type],
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
            <span className="font-semibold text-muted-foreground min-w-[100px]">{label}:</span>
            <span className="text-heading">{String(value)}</span>
          </div>
        ) : null)}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">الحالة:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[entity?.status] || 'bg-muted text-foreground'}`}>
          {entity?.status === 'active' ? 'نشط' : entity?.status === 'suspended' ? 'معلق' : entity?.status || '—'}
        </span>
        <span className="text-sm font-semibold text-muted-foreground mr-4">الامتثال:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${entity?.complianceStatus === 'compliant' || entity?.compliance_status === 'compliant' ? 'bg-success/15 text-success-dark' : 'bg-error/15 text-error'}`}>
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
    <div className="bg-card p-6 text-sm">
      <GovernmentHeader />

      {/* عنوان التقرير */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
        {(dateFrom || dateTo) && (
          <p className="text-muted-foreground text-xs mt-1">
            الفترة: {dateFrom || '—'} إلى {dateTo || '—'}
          </p>
        )}
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <span>إجمالي السجلات: <strong className="text-foreground">{data.length}</strong></span>
          <span>تاريخ الطباعة: <strong className="text-foreground">{new Date().toLocaleDateString('ar-YE')}</strong></span>
        </div>
      </div>

      {/* الجدول */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary text-white">
            <th className="border border-primary px-2 py-2 text-center w-8">#</th>
            {columns.map(col => (
              <th key={col.key} className="border border-primary px-2 py-2 text-right">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-info/10'}>
              <td className="border border-border px-2 py-1.5 text-center text-muted-foreground">{i + 1}</td>
              {columns.map(col => (
                <td key={col.key} className="border border-border px-2 py-1.5 text-heading">
                  {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted font-semibold">
            <td colSpan={columns.length + 1} className="border border-border px-2 py-2 text-left text-muted-foreground">
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
  const identity = useBranding();
  return (
    <div className="border-4 border-double border-primary rounded-2xl p-8 bg-card max-w-2xl mx-auto text-center relative overflow-hidden">
      {/* خلفية مائية */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <span className="text-[120px] font-black text-primary rotate-[-30deg] select-none">رسمي</span>
      </div>

      <GovernmentHeader />

      <div className="my-6">
        <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-3">شهادة تسجيل وترخيص</p>
        <div className="w-20 h-1 bg-primary mx-auto mb-6 rounded"></div>

        <p className="text-foreground text-sm leading-relaxed">
          تشهد <strong>{identity.ministryNameAr}</strong> بأن المنشأة المؤسسي:
        </p>

        <h2 className="text-2xl font-black text-primary my-4">
          {entity?.nameAr || entity?.name_ar || '—'}
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm text-foreground border border-primary rounded-lg p-4 mb-4 text-right">
          <div><span className="font-semibold">رقم التسجيل:</span> {entity?.registrationNumber || entity?.registration_number || '—'}</div>
          <div><span className="font-semibold">رقم الترخيص:</span> {entity?.licenseNumber || entity?.license_number || '—'}</div>
          <div><span className="font-semibold">تاريخ التسجيل:</span> {entity?.registrationDate || entity?.registration_date || '—'}</div>
          <div><span className="font-semibold">تاريخ التجديد:</span> {entity?.nextRenewalDate || entity?.next_renewal_date || '—'}</div>
          <div><span className="font-semibold">نوع المنشأة:</span> {entity?.entityType || entity?.entity_type || '—'}</div>
          <div><span className="font-semibold">المقر الرئيسي:</span> {entity?.address?.governorate || entity?.governorate || '—'}</div>
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
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
    <div className="border-4 border-double border-success-dark rounded-2xl p-8 bg-card max-w-xl mx-auto text-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <span className="text-[100px] font-black text-success-dark rotate-[-30deg] select-none">عضو</span>
      </div>

      <GovernmentHeader />

      <div className="my-6">
        <p className="text-xs tracking-[0.3em] text-muted-foreground mb-3">شهادة عضوية</p>
        <div className="w-16 h-1 bg-success-dark mx-auto mb-6 rounded"></div>

        <p className="text-foreground text-sm">يشهد بأن السيد/السيدة:</p>
        <h2 className="text-2xl font-black text-success-dark my-3">{member?.fullName || member?.full_name || '—'}</h2>

        <div className="text-sm text-foreground border border-success-dark rounded-lg p-4 mb-4 text-right space-y-1.5">
          <div><span className="font-semibold">الرقم الوطني:</span> {member?.nationalId || member?.national_id || '—'}</div>
          <div><span className="font-semibold">رقم العضوية:</span> {member?.memberNumber || member?.member_number || '—'}</div>
          <div><span className="font-semibold">المهنة:</span> {member?.profession || '—'}</div>
          <div><span className="font-semibold">تاريخ الانضمام:</span> {member?.joinDate || member?.join_date || '—'}</div>
          {entity && <div><span className="font-semibold">المنشأة المنتسب:</span> {entity?.nameAr || entity?.name_ar || '—'}</div>}
        </div>

        <p className="text-muted-foreground text-xs">عضو نشط ومسجل وفق القوانين واللوائح المعمول بها.</p>
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
    <div className="bg-card p-6 text-sm">
      <GovernmentHeader />

      <div className="text-center mb-5">
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {(dateFrom || dateTo) && (
          <p className="text-muted-foreground text-xs mt-1">الفترة: {dateFrom} — {dateTo}</p>
        )}
      </div>

      {/* ملخص إحصائي */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'إجمالي المنشآت', value: summary.total, color: 'bg-info/10 border-info/25 text-info-dark' },
          { label: 'ملتزمة', value: summary.compliant, color: 'bg-success/10 border-success/25 text-success-dark' },
          { label: 'غير ملتزمة', value: summary.nonCompliant, color: 'bg-error/10 border-error/25 text-error' },
          { label: 'مخاطر عالية', value: summary.highRisk, color: 'bg-warning/10 border-warning/25 text-warning-dark' },
          { label: 'تراخيص منتهية', value: summary.expiredLicense, color: 'bg-warning/10 border-warning/25 text-warning-dark' },
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
          <span className="font-semibold text-foreground">معدل الامتثال العام</span>
          <span className="font-bold text-primary">
            {summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${summary.total > 0 ? (summary.compliant / summary.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* تفاصيل الجدول */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary text-white">
            {['#', 'اسم المنشأة', 'رقم التسجيل', 'الحالة', 'الامتثال', 'المخاطر', 'تاريخ التجديد'].map(h => (
              <th key={h} className="border border-primary px-2 py-2 text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const risk = row.riskLevel || row.risk_level;
            const riskColor = risk === 'critical' ? 'text-error font-bold' : risk === 'high' ? 'text-warning-dark' : risk === 'medium' ? 'text-warning-dark' : 'text-success-dark';
            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted'}>
                <td className="border border-border px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-border px-2 py-1.5 font-medium">{row.nameAr || row.name_ar || '—'}</td>
                <td className="border border-border px-2 py-1.5 font-mono">{row.registrationNumber || row.registration_number || '—'}</td>
                <td className="border border-border px-2 py-1.5">{row.status || '—'}</td>
                <td className="border border-border px-2 py-1.5">{row.complianceStatus || row.compliance_status || '—'}</td>
                <td className={`border border-border px-2 py-1.5 ${riskColor}`}>{risk || '—'}</td>
                <td className="border border-border px-2 py-1.5">{row.nextRenewalDate || row.next_renewal_date || '—'}</td>
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
    <div className="bg-card p-6 text-sm">
      <GovernmentHeader />
      <div className="text-center mb-5">
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {(dateFrom || dateTo) && <p className="text-muted-foreground text-xs mt-1">الفترة: {dateFrom} — {dateTo}</p>}
      </div>

      {/* ملخص مالي كلي */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي الميزانيات', value: fmt(totalBudget) + ' ر.ي', color: 'border-info/40 bg-info/10 text-info-dark' },
          { label: 'إجمالي الإيرادات', value: fmt(totalRevenue) + ' ر.ي', color: 'border-success/40 bg-success/10 text-success-dark' },
          { label: 'إجمالي المصروفات', value: fmt(totalExpenses) + ' ر.ي', color: 'border-error/40 bg-error/10 text-error' },
        ].map(item => (
          <div key={item.label} className={`border-2 rounded-xl p-4 text-center ${item.color}`}>
            <p className="text-xl font-black">{item.value}</p>
            <p className="text-xs mt-1 font-medium">{item.label}</p>
          </div>
        ))}
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary text-white">
            {['#', 'المنشأة', 'الميزانية السنوية', 'الإيرادات', 'المصروفات', 'الفائض/العجز'].map(h => (
              <th key={h} className="border border-primary px-2 py-2 text-right">{h}</th>
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
              <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted'}>
                <td className="border border-border px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-border px-2 py-1.5 font-medium">{row.nameAr || row.name_ar || '—'}</td>
                <td className="border border-border px-2 py-1.5">{budget ? fmt(budget) : '—'}</td>
                <td className="border border-border px-2 py-1.5">{revenue ? fmt(revenue) : '—'}</td>
                <td className="border border-border px-2 py-1.5">{expenses ? fmt(expenses) : '—'}</td>
                <td className={`border border-border px-2 py-1.5 font-semibold ${surplus >= 0 ? 'text-success-dark' : 'text-error'}`}>
                  {surplus ? fmt(Math.abs(surplus)) + (surplus >= 0 ? ' فائض' : ' عجز') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-info/10 font-bold text-primary">
            <td colSpan={2} className="border border-border px-2 py-2">المجموع الكلي</td>
            <td className="border border-border px-2 py-2">{fmt(totalBudget)}</td>
            <td className="border border-border px-2 py-2">{fmt(totalRevenue)}</td>
            <td className="border border-border px-2 py-2">{fmt(totalExpenses)}</td>
            <td className={`border border-border px-2 py-2 ${totalRevenue - totalExpenses >= 0 ? 'text-success-dark' : 'text-error'}`}>
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

export async function exportReportToExcel(options: PrintExportOptions) {
  const { title, data, columns = [], dateFrom, dateTo } = options;
  const identity = await getOfficialIdentity();

  const meta = [
    [identity.countryAr],
    [identity.ministryNameAr],
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
    ['المنصة', identity.systemNameAr],
    ['الجهة', identity.ministryNameAr],
    ['نوع التقرير', title],
    ['تاريخ الإنشاء', new Date().toISOString()],
    ['إجمالي السجلات', data.length],
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'بيانات_وصفية');

  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function exportReportToPDF(options: PrintExportOptions) {
  const { title, data, columns = [], dateFrom, dateTo, orientation = 'landscape' } = options;
  const identity = await getOfficialIdentity();

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;

  // Watermark - diagonal
  doc.setFontSize(40);
  doc.setTextColor(230, 235, 245);
  doc.saveGraphicsState();
  doc.text(identity.ministryNameAr, pw / 2, ph / 2, { angle: 45, align: 'center' });
  doc.restoreGraphicsState();

  // ترويسة PDF
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(identity.countryAr, pw / 2, 12, { align: 'center' });
  doc.setFontSize(13);
  doc.text(identity.ministryNameAr, pw / 2, 20, { align: 'center' });
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
    body: tableRows.map(r => ['#', ...columns.map(c => (r as Record<string, any>)[c.key] ?? '—').map(String)].map((v, i) => i === 0 ? String((r as Record<string, any>)['#']) : v)),
    styles: { font: 'helvetica', fontSize: 8, halign: 'right', cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    margin: { left: 14, right: 14 },
    didDrawPage: (d) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${identity.ministryNameAr} — ${identity.systemNameAr}`, 14, doc.internal.pageSize.height - 8);
      doc.text(`صفحة ${d.pageNumber} من ${pageCount}`, pw - 14, doc.internal.pageSize.height - 8, { align: 'right' });
    },
  });

  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ============================================================
// تصدير شهادة رسمية (ترخيص / عضوية)
// ============================================================

export async function exportCertificatePDF(opts: {
  type: 'license' | 'membership' | 'compliance';
  entityName: string;
  entityNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  details?: Record<string, string>;
}) {
  const { type, entityName, entityNumber, issueDate, expiryDate, details } = opts;
  const identity = await getOfficialIdentity();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;

  // Border frame
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pw - 20, ph - 20);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pw - 28, ph - 28);

  // Header
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(identity.countryAr, pw / 2, 28, { align: 'center' });
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(identity.ministryNameAr, pw / 2, 38, { align: 'center' });

  // Divider
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.3);
  doc.line(30, 44, pw - 30, 44);

  // Certificate title
  const titles: Record<string, string> = {
    license: 'شهادة ترخيص',
    membership: 'شهادة عضوية',
    compliance: 'شهادة امتثال',
  };
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  doc.text(titles[type] || 'شهادة رسمية', pw / 2, 58, { align: 'center' });

  // Decorative line under title
  doc.setLineWidth(0.8);
  doc.line(pw / 2 - 30, 62, pw / 2 + 30, 62);

  // Body
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const lines = [
    `تشهد ${identity.ministryNameAr}`,
    `بأن الجهة / ${entityName}`,
    entityNumber ? `الرقم: ${entityNumber}` : null,
    issueDate ? `تاريخ الإصدار: ${issueDate}` : null,
    expiryDate ? `تاريخ الانتهاء: ${expiryDate}` : null,
    '',
    type === 'license' ? `حاصلة على ترخيص بموجب ${identity.legalBasis}` : '',
    type === 'membership' ? 'عضو مسجل في النقابة بموجب اللائحة التنفيذية' : '',
    type === 'compliance' ? 'ممتثلة لجميع أحكام قوانين العمل والأنظمة الصادرة بمقتضاها' : '',
  ].filter(Boolean);

  let y = 72;
  for (const line of lines) {
    if (line) doc.text(line, pw / 2, y, { align: 'center' });
    y += 8;
  }

  // Details section
  if (details) {
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    for (const [key, val] of Object.entries(details)) {
      doc.text(`${key}: ${val}`, pw / 2, y, { align: 'center' });
      y += 6;
    }
  }

  // QR code placeholder
  doc.setDrawColor(30, 58, 138);
  doc.rect(pw - 50, ph - 60, 30, 30);
  doc.setFontSize(7);
  doc.text('QR', pw - 35, ph - 45, { align: 'center' });

  // Signature line
  doc.setLineWidth(0.3);
  doc.line(30, ph - 40, 80, ph - 40);
  doc.setFontSize(9);
  doc.text('توقيع المسؤول المختص', 55, ph - 36, { align: 'center' });

  // Official stamp placeholder
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.3);
  doc.circle(pw / 2, ph - 50, 15);
  doc.setFontSize(7);
  doc.text('الختم الرسمي', pw / 2, ph - 48, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`${identity.ministryNameAr} — ${identity.systemNameAr}`, 14, ph - 12);
  doc.text(`تاريخ الطباعة: ${new Date().toLocaleDateString('ar-YE')}`, pw - 14, ph - 12, { align: 'right' });

  // Watermark
  doc.setFontSize(35);
  doc.setTextColor(240, 242, 248);
  doc.text(identity.ministryNameAr, pw / 2, ph / 2, { angle: 45, align: 'center' });

  doc.save(`${titles[type]}_${entityName}_${new Date().toISOString().slice(0, 10)}.pdf`);
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

function EntityDetailReport({ options }: { options: PrintExportOptions }) {
  const { data, title } = options;
  const entity = options.entity || data[0];
  if (!entity) return <DataListReport options={options} />;

  const fmt = (v: any) => v ?? '—';

  return (
    <div className="bg-card p-6 text-sm">
      <GovernmentHeader />
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold text-primary">{title || 'تقرير تفصيلي للكيان'}</h1>
        <h2 className="text-base font-semibold text-heading mt-1">{fmt(entity.name_ar || entity.nameAr)}</h2>
      </div>

      <div className="space-y-4">
        <section>
          <h3 className="text-xs font-bold text-primary border-b border-border pb-1 mb-2">المعلومات الأساسية</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            {[
              ['رقم التسجيل', entity.registration_number || entity.registrationNumber],
              ['الرمز الموحد', entity.unified_code || entity.unifiedCode],
              ['نوع المنشأة', entity.entity_type || entity.entityType],
              ['الشكل القانوني', entity.legal_form || entity.legalForm],
              ['التصنيف', entity.classification],
              ['القطاع', entity.sector],
              ['الحالة', entity.status],
              ['حالة الامتثال', entity.compliance_status || entity.complianceStatus],
            ].map(([l, v]) => v ? (
              <div key={String(l)} className="flex gap-1">
                <span className="font-semibold text-muted-foreground">{l}:</span>
                <span className="text-heading">{String(v)}</span>
              </div>
            ) : null)}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-primary border-b border-border pb-1 mb-2">العنوان ومعلومات الاتصال</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            {[
              ['المحافظة', entity.governorate],
              ['المدينة', entity.city],
              ['العنوان', entity.address || entity.street],
              ['هاتف', entity.phone],
              ['جوال', entity.mobile],
              ['بريد إلكتروني', entity.email],
              ['الموقع', entity.website],
            ].map(([l, v]) => v ? (
              <div key={String(l)} className="flex gap-1">
                <span className="font-semibold text-muted-foreground">{l}:</span>
                <span className="text-heading">{String(v)}</span>
              </div>
            ) : null)}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-primary border-b border-border pb-1 mb-2">الإدارة والقيادة</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            {[
              ['الرئيس', entity.president_name],
              ['هاتف الرئيس', entity.president_phone],
              ['نائب الرئيس', entity.vp_name],
              ['السكرتير', entity.secretary_name],
              ['أمين الخزينة', entity.treasurer_name],
            ].map(([l, v]) => v ? (
              <div key={String(l)} className="flex gap-1">
                <span className="font-semibold text-muted-foreground">{l}:</span>
                <span className="text-heading">{String(v)}</span>
              </div>
            ) : null)}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-primary border-b border-border pb-1 mb-2">الإحصائيات</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { l: 'عدد الأعضاء', v: entity.member_count, c: 'text-primary' },
              { l: 'عدد الفروع', v: entity.branch_count, c: 'text-info' },
              { l: 'الموظفين', v: entity.employee_count, c: 'text-success' },
              { l: 'الميزانية السنوية', v: entity.annual_budget, c: 'text-gold', suffix: ' ر.ي' },
            ].map(s => (
              <div key={s.l} className="text-center border border-border rounded-lg p-2">
                <p className={`text-lg font-black ${s.c}`}>{s.v != null ? Number(s.v).toLocaleString('ar-YE') + (s.suffix || '') : '—'}</p>
                <p className="text-[10px] text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {options.showSignatureBlock && <SignatureBlock />}
      <GovernmentFooter />
    </div>
  );
}

function InspectionDetailReport({ options }: { options: PrintExportOptions }) {
  const { data, title } = options;
  const inspection = options.entity || data[0];
  if (!inspection) return <DataListReport options={options} />;

  return (
    <div className="bg-card p-6 text-sm">
      <GovernmentHeader />
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold text-primary">{title || 'تقرير تفتيش'}</h1>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs border border-border rounded-lg p-4 mb-4">
        {[
          ['رقم الفحص', inspection.inspection_number],
          ['نوع الفحص', inspection.inspection_type],
          ['اسم المفتش', inspection.inspector_name],
          ['تاريخ الفحص', inspection.inspection_date],
          ['تاريخ الانتهاء', inspection.completion_date],
          ['حالة الامتثال', inspection.compliance_status],
          ['التقييم الكلي', inspection.overall_score],
          ['الحالة', inspection.status],
          ['ملاحظات', inspection.notes],
          ['الإجراءات التصحيحية', inspection.corrective_actions],
        ].map(([l, v]) => v ? (
          <div key={String(l)} className="flex gap-1">
            <span className="font-semibold text-muted-foreground">{l}:</span>
            <span className="text-heading">{String(v)}</span>
          </div>
        ) : null)}
      </div>

      {options.showSignatureBlock && <SignatureBlock />}
      <GovernmentFooter />
    </div>
  );
}

const renderContent = () => {
    switch (options.reportType) {
      case 'entity_card':
        return <EntityCard entity={options.entity || options.data[0]} />;
      case 'entity_detail':
        return <EntityDetailReport options={options} />;
      case 'license_certificate':
        return <LicenseCertificate entity={options.entity || options.data[0]} />;
      case 'membership_certificate':
        return <MembershipCertificate member={options.data[0]} entity={options.entity} />;
      case 'compliance':
        return <ComplianceReport options={options} />;
      case 'financial_summary':
        return <FinancialSummaryReport options={options} />;
      case 'inspection_report':
        return <InspectionDetailReport options={options} />;
      default:
        return <DataListReport options={options} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col" dir="rtl">
      {/* شريط الأدوات */}
      <div className="bg-primary text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          <span className="font-semibold">{options.title} — معاينة الطباعة</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 bg-card text-primary rounded-lg text-sm font-semibold hover:bg-info/10"
          >
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button
            onClick={() => exportReportToExcel(options)}
            className="flex items-center gap-2 px-4 py-1.5 bg-success text-white rounded-lg text-sm font-semibold hover:bg-success-dark"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => exportReportToPDF(options)}
            className="flex items-center gap-2 px-4 py-1.5 bg-error text-white rounded-lg text-sm font-semibold hover:bg-error"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-primary-dark rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* معاينة الوثيقة */}
      <div className="flex-1 overflow-auto bg-border p-6">
        <div
          ref={printRef}
          className="bg-card shadow-2xl rounded-lg mx-auto min-h-[297mm]"
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
  { key: 'registration_number', label: 'رقم التسجيل', width: 15 },
  { key: 'name_ar', label: 'الاسم العربي', width: 30 },
  { key: 'entity_type', label: 'نوع المنشأة', width: 12 },
  { key: 'classification', label: 'التصنيف', width: 12 },
  { key: 'governorate', label: 'المحافظة', width: 12 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'member_count', label: 'عدد الأعضاء', width: 12 },
  { key: 'compliance_status', label: 'الامتثال', width: 12 },
  { key: 'next_renewal_date', label: 'تجديد الترخيص', width: 14 },
];

export const MEMBER_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'national_id', label: 'الرقم الوطني', width: 14 },
  { key: 'full_name', label: 'الاسم الكامل', width: 25 },
  { key: 'gender', label: 'الجنس', width: 8, format: v => v === 'male' ? 'ذكر' : v === 'female' ? 'أنثى' : v || '—' },
  { key: 'profession', label: 'المهنة', width: 18 },
  { key: 'governorate', label: 'المحافظة', width: 12 },
  { key: 'join_date', label: 'تاريخ الانضمام', width: 14 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'phone', label: 'الهاتف', width: 14 },
];

export const ACTIVITY_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'activity_number', label: 'رقم النشاط', width: 12 },
  { key: 'activity_name', label: 'اسم النشاط', width: 28 },
  { key: 'activity_type', label: 'النوع', width: 14 },
  { key: 'start_date', label: 'تاريخ البدء', width: 14 },
  { key: 'location', label: 'المكان', width: 16 },
  { key: 'actual_participants', label: 'المشاركون', width: 12 },
  { key: 'status', label: 'الحالة', width: 12 },
];

export const VIOLATION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'violation_number', label: 'رقم المخالفة', width: 14 },
  { key: 'violation_type', label: 'نوع المخالفة', width: 22 },
  { key: 'severity', label: 'الخطورة', width: 12 },
  { key: 'detected_date', label: 'تاريخ الاكتشاف', width: 14 },
  { key: 'status', label: 'الحالة', width: 12 },
  { key: 'penalty_amount', label: 'قيمة الغرامة', width: 14 },
];

export const PROFESSION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'code', label: 'الكود', width: 10 },
  { key: 'name_ar', label: 'الاسم العربي', width: 28 },
  { key: 'name_en', label: 'الاسم الإنجليزي', width: 28 },
  { key: 'isco_code', label: 'كود ISCO', width: 10 },
  { key: 'major_group_name', label: 'المجموعة الرئيسية', width: 20 },
  { key: 'sector', label: 'القطاع', width: 16 },
  { key: 'hazard_level', label: 'مستوى الخطورة', width: 14 },
];

export const INSPECTION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'inspection_number', label: 'رقم الفحص', width: 14 },
  { key: 'inspection_type', label: 'نوع الفحص', width: 14 },
  { key: 'inspector_name', label: 'اسم المفتش', width: 18 },
  { key: 'overall_score', label: 'التقييم', width: 10 },
  { key: 'compliance_status', label: 'حالة الامتثال', width: 14 },
  { key: 'inspection_date', label: 'تاريخ الفحص', width: 14 },
  { key: 'status', label: 'الحالة', width: 10 },
];

export const RISK_ASSESSMENT_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'entity_name', label: 'المنشأة', width: 22 },
  { key: 'risk_type', label: 'نوع المخاطرة', width: 16 },
  { key: 'risk_level', label: 'مستوى الخطورة', width: 14 },
  { key: 'likelihood', label: 'الاحتمال', width: 10 },
  { key: 'impact', label: 'التأثير', width: 10 },
  { key: 'risk_score', label: 'النتيجة', width: 10 },
  { key: 'responsible_person', label: 'المسؤول', width: 18 },
  { key: 'status', label: 'الحالة', width: 10 },
];

export const COMPLIANCE_MATRIX_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'enterprise_name', label: 'المنشأة', width: 22 },
  { key: 'occupation_type', label: 'نوع النشاط', width: 16 },
  { key: 'article_number', label: 'رقم المادة', width: 12 },
  { key: 'article_title', label: 'عنوان المادة', width: 22 },
  { key: 'compliance_status', label: 'حالة الامتثال', width: 14 },
  { key: 'checked_by', label: 'الفاحص', width: 16 },
  { key: 'checked_at', label: 'تاريخ الفحص', width: 14 },
];

export const MATURITY_ASSESSMENT_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'entity_name', label: 'المنشأة', width: 22 },
  { key: 'overall_score', label: 'التقييم الكلي', width: 12 },
  { key: 'grade', label: 'التقدير', width: 14 },
  { key: 'identity_score', label: 'الهوية', width: 10 },
  { key: 'description_score', label: 'الوصف', width: 10 },
  { key: 'tasks_score', label: 'المهام', width: 10 },
  { key: 'competencies_score', label: 'الكفاءات', width: 10 },
  { key: 'safety_score', label: 'السلامة', width: 10 },
  { key: 'assessment_date', label: 'تاريخ التقييم', width: 14 },
];

export const LEGAL_REFERENCE_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'law_name_ar', label: 'الاسم', width: 28 },
  { key: 'law_number', label: 'الرقم', width: 12 },
  { key: 'law_year', label: 'السنة', width: 8 },
  { key: 'law_type', label: 'النوع', width: 12 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'summary', label: 'الملخص', width: 30 },
];

export const DISPATCH_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'dispatch_number', label: 'رقم الإرسالية', width: 14 },
  { key: 'entity_name', label: 'المنشأة', width: 22 },
  { key: 'worker_name', label: 'اسم العامل', width: 18 },
  { key: 'destination_country', label: 'بلد الوجهة', width: 16 },
  { key: 'status', label: 'الحالة', width: 12 },
  { key: 'dispatch_date', label: 'تاريخ الإرسال', width: 14 },
];

export const TRAINING_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'training_name', label: 'اسم التدريب', width: 24 },
  { key: 'training_type', label: 'النوع', width: 14 },
  { key: 'employee_name', label: 'اسم الموظف', width: 18 },
  { key: 'training_provider', label: 'جهة التدريب', width: 18 },
  { key: 'duration_hours', label: 'المدة (ساعة)', width: 10 },
  { key: 'status', label: 'الحالة', width: 10 },
];

export const LICENSE_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'license_number', label: 'رقم الترخيص', width: 14 },
  { key: 'license_type', label: 'النوع', width: 16 },
  { key: 'entity_name', label: 'المنشأة', width: 22 },
  { key: 'issue_date', label: 'تاريخ الإصدار', width: 14 },
  { key: 'expiry_date', label: 'تاريخ الانتهاء', width: 14 },
  { key: 'status', label: 'الحالة', width: 10 },
];

export const EVALUATION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'certificate_number', label: 'رقم الشهادة', width: 14 },
  { key: 'enterprise_name', label: 'المنشأة', width: 22 },
  { key: 'overall_score', label: 'التقييم', width: 10 },
  { key: 'labor_law_compliance', label: 'قانون العمل', width: 12 },
  { key: 'safety_compliance', label: 'السلامة', width: 10 },
  { key: 'status', label: 'الحالة', width: 10 },
];

export const ENTITY_DETAIL_COLUMNS: ReportColumn[] = [
  { key: 'name_ar', label: 'الاسم', width: 25 },
  { key: 'entity_type', label: 'النوع', width: 15 },
  { key: 'unified_code', label: 'الكود الموحد', width: 15 },
  { key: 'governorate', label: 'المحافظة', width: 12 },
  { key: 'status', label: 'الحالة', width: 10 },
  { key: 'risk_level', label: 'مستوى المخاطر', width: 12 },
  { key: 'compliance_status', label: 'حالة الامتثال', width: 12 },
];

export const RISK_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'name_ar', label: 'المنشأة', width: 25 },
  { key: 'ai_risk_score', label: 'الدرجة', width: 10 },
  { key: 'risk_level', label: 'المستوى', width: 12 },
  { key: 'open_violations', label: 'المخالفات المفتوحة', width: 12 },
  { key: 'overdue_inspections', label: 'التفتيشات المتأخرة', width: 12 },
  { key: 'unresolved_alerts', label: 'التنبيهات غير المحلولة', width: 12 },
  { key: 'last_inspection', label: 'آخر تفتيش', width: 12 },
];
