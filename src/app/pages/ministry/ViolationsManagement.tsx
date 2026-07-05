/**
 * ViolationsManagement — إدارة المخالفات والعقوبات
 * منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Eye, Edit2, Trash2, Plus, Search, Filter,
  CheckCircle, X, ChevronRight, ChevronLeft,
  Download, ShieldAlert, Clock, ChevronDown, ChevronUp,
  RefreshCw, DollarSign, Scale, FileText, Calendar,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { toast } from 'sonner';

// ============================================================
// الأنواع
// ============================================================

type ViolationStatus = 'open' | 'under_review' | 'resolved' | 'closed' | 'appealed';
type ViolationSeverity = 'minor' | 'moderate' | 'major' | 'critical';

interface Violation {
  id: string;
  violationNumber: string;
  entityName: string;
  violationType: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  detectedDate: string;
  description?: string;
  decision?: string;
  penaltyAmount?: number;
  resolvedDate?: string;
  resolutionNotes?: string;
  legalBasis?: string;
}

// ============================================================
// البيانات التجريبية
// ============================================================

const VIOLATION_TYPES = [
  'عدم تقديم التقرير السنوي',
  'مخالفة لوائح الانتخابات',
  'تأخر في تجديد الترخيص',
  'عدم الإفصاح عن البيانات المالية',
  'مخالفة قرارات الجمعية العمومية',
  'عدم الاستجابة للمراسلات الرسمية',
  'ممارسة نشاط غير مرخص',
];

const MOCK_VIOLATIONS: Violation[] = [
  {
    id: '1',
    violationNumber: 'VIO-2026-001',
    entityName: 'نقابة عمال البناء',
    violationType: 'عدم تقديم التقرير السنوي',
    severity: 'major',
    status: 'open',
    detectedDate: '2026-01-10',
    description: 'لم تقدم النقابة تقريرها السنوي للعام 2025 حتى تاريخ الاكتشاف رغم مرور المهلة القانونية',
    legalBasis: 'المادة 42 من نظام النقابات المهنية',
    penaltyAmount: 50000,
  },
  {
    id: '2',
    violationNumber: 'VIO-2026-002',
    entityName: 'نقابة الصحفيين',
    violationType: 'مخالفة لوائح الانتخابات',
    severity: 'critical',
    status: 'under_review',
    detectedDate: '2026-02-15',
    description: 'أُجريت انتخابات مجلس الإدارة دون اتباع الإجراءات القانونية المنصوص عليها',
    legalBasis: 'المادة 18 من لائحة الانتخابات النقابية',
    penaltyAmount: 200000,
  },
  {
    id: '3',
    violationNumber: 'VIO-2026-003',
    entityName: 'اتحاد موظفي الدولة',
    violationType: 'تأخر في تجديد الترخيص',
    severity: 'minor',
    status: 'resolved',
    detectedDate: '2026-01-25',
    description: 'تأخر الاتحاد في تجديد ترخيص عمله لمدة ثلاثة أشهر',
    legalBasis: 'المادة 7 من نظام الترخيص',
    penaltyAmount: 20000,
    resolvedDate: '2026-03-01',
    decision: 'تم إصدار تحذير رسمي والزام الاتحاد بتجديد الترخيص فوراً',
    resolutionNotes: 'التزم الاتحاد بقرار الوزارة وسدد الغرامة ورخص عمله',
  },
  {
    id: '4',
    violationNumber: 'VIO-2026-004',
    entityName: 'نقابة المحامين',
    violationType: 'عدم الإفصاح عن البيانات المالية',
    severity: 'major',
    status: 'appealed',
    detectedDate: '2026-03-05',
    description: 'رفضت النقابة تقديم كشوف الحسابات المالية السنوية للوزارة رغم المطالبة الرسمية',
    legalBasis: 'المادة 55 من نظام الشفافية المالية للنقابات',
    penaltyAmount: 150000,
  },
  {
    id: '5',
    violationNumber: 'VIO-2026-005',
    entityName: 'نقابة عمال النقل',
    violationType: 'مخالفة قرارات الجمعية العمومية',
    severity: 'moderate',
    status: 'closed',
    detectedDate: '2026-02-28',
    description: 'تجاوز مجلس الإدارة صلاحياته وأقر إنفاق مالياً لم تعتمده الجمعية العمومية',
    legalBasis: 'المادة 31 من نظام النقابات المهنية',
    penaltyAmount: 75000,
    resolvedDate: '2026-04-20',
    decision: 'إلزام النقابة بعقد اجتماع طارئ للجمعية العمومية وإعادة الأموال المنفقة',
    resolutionNotes: 'تم التنفيذ الكامل لقرار الوزارة وأُغلق الملف',
  },
  {
    id: '6',
    violationNumber: 'VIO-2026-006',
    entityName: 'نقابة المعلمين اليمنيين',
    violationType: 'عدم الاستجابة للمراسلات الرسمية',
    severity: 'minor',
    status: 'open',
    detectedDate: '2026-04-10',
    description: 'لم تستجب النقابة لثلاث مراسلات رسمية متتالية خلال فترة شهرين',
    legalBasis: 'المادة 60 من اللائحة التنظيمية',
    penaltyAmount: 10000,
  },
  {
    id: '7',
    violationNumber: 'VIO-2026-007',
    entityName: 'نقابة المهندسين',
    violationType: 'ممارسة نشاط غير مرخص',
    severity: 'critical',
    status: 'under_review',
    detectedDate: '2026-05-01',
    description: 'مارست النقابة أنشطة استثمارية تجارية خارج نطاق غرضها القانوني دون الحصول على تصاريح مسبقة',
    legalBasis: 'المادة 12 و13 من نظام النقابات المهنية',
    penaltyAmount: 500000,
  },
];

// ============================================================
// الثوابت
// ============================================================

const ENTITY_LIST = [
  'نقابة المعلمين اليمنيين',
  'نقابة المهندسين',
  'نقابة الأطباء اليمنيين',
  'اتحاد عمال النقل',
  'نقابة الصحفيين',
  'نقابة المحامين',
  'اتحاد موظفي الدولة',
  'نقابة عمال البناء',
];

const SEVERITY_CONFIG: Record<ViolationSeverity, { label: string; color: string; bg: string; border: string }> = {
  minor:    { label: 'بسيطة',  color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  moderate: { label: 'متوسطة', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  major:    { label: 'كبيرة',  color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
  critical: { label: 'حرجة',   color: 'text-red-900',    bg: 'bg-red-100',    border: 'border-red-400' },
};

const STATUS_WORKFLOW: Record<ViolationStatus, ViolationStatus[]> = {
  open:         ['under_review'],
  under_review: ['resolved', 'closed'],
  resolved:     ['closed'],
  closed:       [],
  appealed:     ['under_review', 'closed'],
};

const STATUS_LABELS: Record<ViolationStatus, string> = {
  open: 'مفتوحة',
  under_review: 'قيد المراجعة',
  resolved: 'محلولة',
  closed: 'مغلقة',
  appealed: 'مستأنفة',
};

const PAGE_SIZE = 5;

// ============================================================
// نموذج إضافة مخالفة
// ============================================================

interface ViolationFormValues {
  entityName: string;
  violationType: string;
  severity: ViolationSeverity;
  detectedDate: string;
  description: string;
  legalBasis: string;
  penaltyAmount: number;
}

function buildEmptyViolationForm(): ViolationFormValues {
  return {
    entityName: '',
    violationType: VIOLATION_TYPES[0],
    severity: 'minor',
    detectedDate: '',
    description: '',
    legalBasis: '',
    penaltyAmount: 0,
  };
}

// نموذج تغيير الحالة
interface WorkflowFormValues {
  newStatus: ViolationStatus;
  decision: string;
  resolutionNotes: string;
  resolvedDate: string;
}

// ============================================================
// المكوّن الرئيسي
// ============================================================

export default function ViolationsManagement() {
  const [violations, setViolations] = useState<Violation[]>(MOCK_VIOLATIONS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowTarget, setWorkflowTarget] = useState<Violation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ViolationStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ViolationSeverity | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ============================================================
  // التصفية
  // ============================================================

  const filtered = useMemo(() => {
    return violations.filter(v => {
      const q = searchQuery.trim();
      const matchSearch =
        !q ||
        v.entityName.includes(q) ||
        v.violationNumber.includes(q) ||
        v.violationType.includes(q);
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchSeverity = severityFilter === 'all' || v.severity === severityFilter;
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [violations, searchQuery, statusFilter, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: violations.length,
    open: violations.filter(v => v.status === 'open').length,
    under_review: violations.filter(v => v.status === 'under_review').length,
    resolved: violations.filter(v => v.status === 'resolved').length,
    totalFines: violations.reduce((sum, v) => sum + (v.penaltyAmount ?? 0), 0),
  }), [violations]);

  // ============================================================
  // نموذج الإضافة/التعديل
  // ============================================================

  const [formValues, setFormValues] = useState<ViolationFormValues>(buildEmptyViolationForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ViolationFormValues, string>>>({});

  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const parsed = type === 'number' ? Number(value) : value;
    setFormValues(prev => ({ ...prev, [name]: parsed }));
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  function validateViolationForm(vals: ViolationFormValues): boolean {
    const errs: Partial<Record<keyof ViolationFormValues, string>> = {};
    if (!vals.entityName) errs.entityName = 'اسم الكيان مطلوب';
    if (!vals.detectedDate) errs.detectedDate = 'تاريخ الاكتشاف مطلوب';
    if (!vals.description) errs.description = 'وصف المخالفة مطلوب';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ============================================================
  // نموذج سير العمل
  // ============================================================

  const [workflowValues, setWorkflowValues] = useState<WorkflowFormValues>({
    newStatus: 'under_review',
    decision: '',
    resolutionNotes: '',
    resolvedDate: '',
  });
  const [workflowErrors, setWorkflowErrors] = useState<Partial<Record<keyof WorkflowFormValues, string>>>({});

  const handleWorkflowChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setWorkflowValues(prev => ({ ...prev, [name]: value }));
    setWorkflowErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  // ============================================================
  // الإجراءات
  // ============================================================

  const openAdd = useCallback(() => {
    setFormValues(buildEmptyViolationForm());
    setFormErrors({});
    setEditingViolation(null);
    setShowAddModal(true);
  }, []);

  const openEdit = useCallback((violation: Violation) => {
    setFormValues({
      entityName: violation.entityName,
      violationType: violation.violationType,
      severity: violation.severity,
      detectedDate: violation.detectedDate,
      description: violation.description ?? '',
      legalBasis: violation.legalBasis ?? '',
      penaltyAmount: violation.penaltyAmount ?? 0,
    });
    setFormErrors({});
    setEditingViolation(violation);
    setShowAddModal(true);
  }, []);

  const handleDelete = useCallback(async (violation: Violation) => {
    const ok = await confirm({
      title: 'حذف المخالفة',
      message: `هل أنت متأكد من حذف مخالفة "${violation.violationNumber}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    setViolations(prev => prev.filter(v => v.id !== violation.id));
    logAudit({ action: 'delete', resource: 'violation', resourceId: violation.id, details: violation.violationNumber });
    toast.success(`تم حذف المخالفة ${violation.violationNumber} بنجاح`);
  }, [confirm]);

  const handleSave = useCallback(() => {
    if (!validateViolationForm(formValues)) return;
    const count = violations.length;
    if (editingViolation) {
      const updated: Violation = {
        ...editingViolation,
        ...formValues,
      };
      setViolations(prev => prev.map(v => v.id === updated.id ? updated : v));
      logAudit({ action: 'update', resource: 'violation', resourceId: updated.id, details: updated.violationNumber });
      toast.success('تم تحديث بيانات المخالفة بنجاح');
    } else {
      const newViolation: Violation = {
        ...formValues,
        id: `vio-${Date.now()}`,
        violationNumber: `VIO-2026-${String(count + 1).padStart(3, '0')}`,
        status: 'open',
      };
      setViolations(prev => [...prev, newViolation]);
      logAudit({ action: 'create', resource: 'violation', resourceId: newViolation.id, details: newViolation.violationNumber });
      toast.success('تمت إضافة المخالفة بنجاح');
    }
    setShowAddModal(false);
  }, [editingViolation, formValues, violations.length]);

  const openWorkflow = useCallback((violation: Violation) => {
    const nextStatuses = STATUS_WORKFLOW[violation.status];
    if (nextStatuses.length === 0) {
      toast.info('لا يمكن تغيير حالة هذه المخالفة');
      return;
    }
    setWorkflowTarget(violation);
    setWorkflowValues({
      newStatus: nextStatuses[0],
      decision: violation.decision ?? '',
      resolutionNotes: violation.resolutionNotes ?? '',
      resolvedDate: '',
    });
    setWorkflowErrors({});
    setShowWorkflowModal(true);
  }, []);

  const handleWorkflowSave = useCallback(() => {
    if (!workflowTarget) return;
    const errs: Partial<Record<keyof WorkflowFormValues, string>> = {};
    if (['resolved', 'closed'].includes(workflowValues.newStatus) && !workflowValues.decision) {
      errs.decision = 'القرار مطلوب عند الإغلاق';
    }
    if (Object.keys(errs).length > 0) { setWorkflowErrors(errs); return; }

    const updated: Violation = {
      ...workflowTarget,
      status: workflowValues.newStatus,
      decision: workflowValues.decision || workflowTarget.decision,
      resolutionNotes: workflowValues.resolutionNotes || workflowTarget.resolutionNotes,
      resolvedDate: workflowValues.resolvedDate || workflowTarget.resolvedDate,
    };
    setViolations(prev => prev.map(v => v.id === updated.id ? updated : v));
    logAudit({
      action: 'update',
      resource: 'violation',
      resourceId: updated.id,
      details: `Status changed to ${workflowValues.newStatus} for ${updated.violationNumber}`,
    });
    toast.success(`تم تغيير حالة المخالفة إلى "${STATUS_LABELS[workflowValues.newStatus]}"`);
    setShowWorkflowModal(false);
  }, [workflowTarget, workflowValues]);

  const handleExport = useCallback(() => {
    exportReportToExcel({
      title: 'تقرير المخالفات والعقوبات',
      reportType: 'violations_list',
      data: violations,
      columns: [
        { key: 'violationNumber', label: 'رقم المخالفة' },
        { key: 'entityName', label: 'الكيان' },
        { key: 'violationType', label: 'نوع المخالفة' },
        { key: 'severity', label: 'الخطورة', format: (v: string) => SEVERITY_CONFIG[v as ViolationSeverity]?.label || v },
        { key: 'detectedDate', label: 'تاريخ الاكتشاف' },
        { key: 'penaltyAmount', label: 'الغرامة (ريال)' },
        { key: 'status', label: 'الحالة', format: (v: string) => STATUS_LABELS[v as ViolationStatus] || v },
      ],
    });
    logAudit({ action: 'export', resource: 'violations', details: 'Excel export' });
    toast.success('تم تصدير البيانات بنجاح');
  }, [violations]);

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة المخالفات والعقوبات"
        subtitle="توثيق ومتابعة المخالفات النقابية وفق الأنظمة المعمول بها"
        breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'المخالفات والعقوبات' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير Excel
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              إضافة مخالفة
            </button>
          </div>
        }
      />

      {/* تنبيه قانوني */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium">
          يجب توثيق جميع المخالفات وفق الأنظمة المعمول بها — يُعدّ هذا السجل وثيقة قانونية رسمية
        </p>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'إجمالي المخالفات', value: stats.total, Icon: ShieldAlert, color: 'text-blue-600 bg-blue-50', filter: 'all' as const, isFilter: true },
          { label: 'مفتوحة', value: stats.open, Icon: AlertTriangle, color: 'text-red-600 bg-red-50', filter: 'open' as const, isFilter: true },
          { label: 'قيد المراجعة', value: stats.under_review, Icon: Clock, color: 'text-amber-600 bg-amber-50', filter: 'under_review' as const, isFilter: true },
          { label: 'محلولة', value: stats.resolved, Icon: CheckCircle, color: 'text-green-600 bg-green-50', filter: 'resolved' as const, isFilter: true },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => { setStatusFilter(stat.filter); setCurrentPage(1); }}
            className={`bg-white rounded-xl border p-4 shadow-sm text-right transition-all hover:shadow-md ${statusFilter === stat.filter ? 'border-[#1E3A8A] ring-1 ring-[#1E3A8A]/20' : 'border-gray-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.Icon className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
          </button>
        ))}
        {/* بطاقة الغرامات */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-right">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 bg-emerald-50">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-gray-800 text-left">{stats.totalFines.toLocaleString('ar')}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">الغرامات المحصّلة (ريال)</p>
        </div>
      </div>

      {/* تبويبات الخطورة */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all' as const, label: 'الكل' },
          { key: 'minor' as const, label: 'بسيطة' },
          { key: 'moderate' as const, label: 'متوسطة' },
          { key: 'major' as const, label: 'كبيرة' },
          { key: 'critical' as const, label: 'حرجة' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setSeverityFilter(tab.key); setCurrentPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-lg border font-medium transition-colors ${severityFilter === tab.key
              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث برقم المخالفة أو اسم الكيان أو النوع..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as ViolationStatus | 'all'); setCurrentPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="open">مفتوحة</option>
              <option value="under_review">قيد المراجعة</option>
              <option value="resolved">محلولة</option>
              <option value="closed">مغلقة</option>
              <option value="appealed">مستأنفة</option>
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-right font-semibold text-gray-600 w-10">#</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">رقم المخالفة</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الكيان</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">نوع المخالفة</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الخطورة</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">تاريخ الاكتشاف</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الغرامة</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <ShieldAlert className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">لا توجد مخالفات مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                paginated.map((violation, idx) => {
                  const sev = SEVERITY_CONFIG[violation.severity];
                  const isExpanded = expandedId === violation.id;
                  return (
                    <>
                      <tr
                        key={violation.id}
                        className={`hover:bg-gray-50/50 transition-colors border-b ${isExpanded ? 'border-blue-100 bg-blue-50/30' : 'border-gray-50'}`}
                      >
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {violation.violationNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800 text-xs">{violation.entityName}</td>
                        <td className="py-3 px-4 text-gray-600 text-xs max-w-[180px]">
                          <span className="line-clamp-1">{violation.violationType}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${sev.color} ${sev.bg} ${sev.border}`}>
                            {sev.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs">{violation.detectedDate}</td>
                        <td className="py-3 px-4 text-gray-700 text-xs font-medium">
                          {violation.penaltyAmount != null ? `${violation.penaltyAmount.toLocaleString('ar')} ر.ي` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={violation.status} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : violation.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="عرض التفاصيل"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => openEdit(violation)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openWorkflow(violation)}
                              disabled={STATUS_WORKFLOW[violation.status].length === 0}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="تغيير الحالة"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(violation)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* لوحة التفاصيل القابلة للتوسع */}
                      {isExpanded && (
                        <tr key={`${violation.id}-details`}>
                          <td colSpan={9} className="px-4 pb-4 bg-blue-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                              {violation.description && (
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    وصف المخالفة
                                  </p>
                                  <p className="text-sm text-gray-700 leading-relaxed">{violation.description}</p>
                                </div>
                              )}
                              {violation.legalBasis && (
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <Scale className="w-3.5 h-3.5" />
                                    الأساس القانوني
                                  </p>
                                  <p className="text-sm text-gray-700">{violation.legalBasis}</p>
                                </div>
                              )}
                              {violation.decision && (
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    القرار
                                  </p>
                                  <p className="text-sm text-gray-700">{violation.decision}</p>
                                </div>
                              )}
                              {violation.resolutionNotes && (
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-1">ملاحظات الحل</p>
                                  <p className="text-sm text-gray-700">{violation.resolutionNotes}</p>
                                </div>
                              )}
                              {violation.resolvedDate && (
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                  <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    تاريخ الحل
                                  </p>
                                  <p className="text-sm text-gray-700 font-mono">{violation.resolvedDate}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* الترقيم */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} مخالفة
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-[#1E3A8A] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================
          نافذة إضافة/تعديل المخالفة
      ==================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="font-bold text-gray-800">
                  {editingViolation ? 'تعديل بيانات المخالفة' : 'تسجيل مخالفة جديدة'}
                </h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* الكيان */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    الكيان <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="entityName"
                    value={formValues.entityName}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white ${formErrors.entityName ? 'border-red-400' : 'border-gray-200'}`}
                  >
                    <option value="">اختر الكيان...</option>
                    {ENTITY_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {formErrors.entityName && <p className="text-red-500 text-xs mt-1">{formErrors.entityName}</p>}
                </div>

                {/* نوع المخالفة */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">نوع المخالفة</label>
                  <select
                    name="violationType"
                    value={formValues.violationType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
                  >
                    {VIOLATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* الخطورة */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">درجة الخطورة</label>
                  <select
                    name="severity"
                    value={formValues.severity}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
                  >
                    <option value="minor">بسيطة</option>
                    <option value="moderate">متوسطة</option>
                    <option value="major">كبيرة</option>
                    <option value="critical">حرجة</option>
                  </select>
                </div>

                {/* تاريخ الاكتشاف */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    تاريخ الاكتشاف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="detectedDate"
                    value={formValues.detectedDate}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.detectedDate ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.detectedDate && <p className="text-red-500 text-xs mt-1">{formErrors.detectedDate}</p>}
                </div>

                {/* الأساس القانوني */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">الأساس القانوني</label>
                  <input
                    type="text"
                    name="legalBasis"
                    value={formValues.legalBasis}
                    onChange={handleFormChange}
                    placeholder="مثال: المادة 42 من نظام النقابات"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>

                {/* مبلغ الغرامة */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">مبلغ الغرامة (ريال)</label>
                  <input
                    type="number"
                    name="penaltyAmount"
                    value={formValues.penaltyAmount}
                    onChange={handleFormChange}
                    min={0}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>

                {/* وصف المخالفة */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    وصف المخالفة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formValues.description}
                    onChange={handleFormChange}
                    rows={4}
                    placeholder="وصف تفصيلي للمخالفة وملابساتها..."
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] resize-none ${formErrors.description ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {editingViolation ? 'حفظ التغييرات' : 'تسجيل المخالفة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          نافذة سير العمل / تغيير الحالة
      ==================================================== */}
      {showWorkflowModal && workflowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">تغيير حالة المخالفة</h2>
                  <p className="text-xs text-gray-400">{workflowTarget.violationNumber} — {workflowTarget.entityName}</p>
                </div>
              </div>
              <button onClick={() => setShowWorkflowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* الحالة الجديدة */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">الحالة الجديدة</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_WORKFLOW[workflowTarget.status].map(s => (
                    <button
                      key={s}
                      onClick={() => setWorkflowValues(prev => ({ ...prev, newStatus: s }))}
                      className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${workflowValues.newStatus === s
                        ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* القرار — مطلوب عند الإغلاق */}
              {['resolved', 'closed'].includes(workflowValues.newStatus) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    القرار <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="decision"
                    value={workflowValues.decision}
                    onChange={handleWorkflowChange}
                    rows={3}
                    placeholder="قرار الوزارة بشأن هذه المخالفة..."
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] resize-none ${workflowErrors.decision ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {workflowErrors.decision && <p className="text-red-500 text-xs mt-1">{workflowErrors.decision}</p>}
                </div>
              )}

              {/* ملاحظات الحل */}
              {['resolved', 'closed'].includes(workflowValues.newStatus) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">ملاحظات الحل</label>
                  <textarea
                    name="resolutionNotes"
                    value={workflowValues.resolutionNotes}
                    onChange={handleWorkflowChange}
                    rows={2}
                    placeholder="ملاحظات إضافية حول آلية الحل..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] resize-none"
                  />
                </div>
              )}

              {/* تاريخ الحل */}
              {['resolved', 'closed'].includes(workflowValues.newStatus) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">تاريخ الحل</label>
                  <input
                    type="date"
                    name="resolvedDate"
                    value={workflowValues.resolvedDate}
                    onChange={handleWorkflowChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>
              )}

              {/* معلومات الانتقال */}
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  سيتم تغيير الحالة من{' '}
                  <strong>"{STATUS_LABELS[workflowTarget.status]}"</strong>
                  {' '}إلى{' '}
                  <strong>"{STATUS_LABELS[workflowValues.newStatus]}"</strong>
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowWorkflowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleWorkflowSave}
                className="px-5 py-2 text-sm bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد التغيير
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
