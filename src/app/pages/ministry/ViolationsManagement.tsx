/**
 * ViolationsManagement — إدارة المخالفات والعقوبات
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { AlertTriangle, Eye, Edit2, Trash2, Plus, Search, Filter, CheckCircle, X, ChevronRight, ChevronLeft, Download, ShieldAlert, Clock, ChevronUp, RefreshCw, DollarSign, Scale, FileText, Calendar, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { useDebounce } from '../../hooks/useDebounce';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { toast } from 'sonner';
const API_BASE = '/api';
// ============================================================
// الأنواع
// ============================================================
type ViolationStatus = 'open' | 'under_review' | 'resolved' | 'closed' | 'appealed';
type ViolationSeverity = 'minor' | 'moderate' | 'major' | 'critical';
interface Violation {
    id: string;
    entity_id: string;
    violation_number: string;
    entity_name?: string;
    violation_type: string;
    severity: ViolationSeverity;
    status: ViolationStatus;
    detected_date: string;
    description?: string;
    decision?: string;
    penalty_amount?: number;
    resolved_date?: string;
    resolution_notes?: string;
    legal_basis?: string;
    [key: string]: any;
}
// ============================================================
// قوائم المرجعية الرسمية لأنواع المخالفات
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
const SEVERITY_CONFIG: Record<ViolationSeverity, {
    label: string;
    color: string;
    bg: string;
    border: string;
}> = {
    minor: { label: 'بسيطة', color: 'text-warning-dark', bg: 'bg-warning/10', border: 'border-warning/15' },
    moderate: { label: 'متوسطة', color: 'text-warning-dark', bg: 'bg-warning/10', border: 'border-warning/15' },
    major: { label: 'كبيرة', color: 'text-error-dark', bg: 'bg-error/10', border: 'border-error/15' },
    critical: { label: 'حرجة', color: 'text-error-dark', bg: 'bg-error/15', border: 'border-error' },
};
const STATUS_WORKFLOW: Record<ViolationStatus, ViolationStatus[]> = {
    open: ['under_review'],
    under_review: ['resolved', 'closed'],
    resolved: ['closed'],
    closed: [],
    appealed: ['under_review', 'closed'],
};
const STATUS_LABELS: Record<ViolationStatus, string> = {
    open: 'مفتوحة',
    under_review: 'قيد المراجعة',
    resolved: 'محلولة',
    closed: 'مغلقة',
    appealed: 'مستأنفة',
};
const PAGE_SIZE = 20;
// ============================================================
// نموذج إضافة مخالفة
// ============================================================
interface ViolationFormValues {
    entity_id: string;
    violationType: string;
    severity: ViolationSeverity;
    detectedDate: string;
    description: string;
    legalBasis: string;
    penaltyAmount: number;
}
function buildEmptyViolationForm(): ViolationFormValues {
    return {
        entity_id: '',
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
    const [violations, setViolations] = useState<Violation[]>([]);
    const [entities, setEntities] = useState<Array<{
        entity_id: string;
        entity_name: string;
    }>>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [workflowTarget, setWorkflowTarget] = useState<Violation | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 350);
    const [statusFilter, setStatusFilter] = useState<ViolationStatus | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<ViolationSeverity | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { confirm, dialog: confirmDialog } = useConfirm();
    // تحميل البيانات من API
    useEffect(() => {
        const controller = new AbortController();
        const fetchViolations = async () => {
            setLoading(true);
            try {
                const headers: Record<string, string> = {};
                const token = localStorage.getItem('auth_token');
                if (token) headers['Authorization'] = `Bearer ${token}`;
                
                const [vRes, eRes] = await Promise.all([
                    fetch(`${API_BASE}/violations?limit=200`, { signal: controller.signal, headers }).then(r => r.json()),
                    fetch(`${API_BASE}/entities?limit=100`, { signal: controller.signal, headers }).then(r => r.json()),
                ]);
                
                setViolations(vRes?.data || []);
                if (eRes?.data && Array.isArray(eRes.data)) {
                    setEntities(eRes.data.map((e: any) => ({ entity_id: e.entity_id, entity_name: e.name_ar })));
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('خطأ في تحميل المخالفات:', error);
                    setViolations([]);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchViolations();
        return () => controller.abort();
    }, []);
    // ============================================================
    // التصفية
    // ============================================================
    const filtered = useMemo(() => {
        return violations.filter(v => {
            const q = debouncedSearch.trim();
            const matchSearch = !q ||
                (v.entity_name || '').includes(q) ||
                (v.violation_number || '').includes(q) ||
                (v.violation_type || '').includes(q);
            const matchStatus = statusFilter === 'all' || v.status === statusFilter;
            const matchSeverity = severityFilter === 'all' || v.severity === severityFilter;
            return matchSearch && matchStatus && matchSeverity;
        });
    }, [violations, debouncedSearch, statusFilter, severityFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: violations.length,
        open: violations.filter(v => v.status === 'open').length,
        under_review: violations.filter(v => v.status === 'under_review').length,
        resolved: violations.filter(v => v.status === 'resolved').length,
        totalFines: violations.reduce((sum, v) => sum + (v.penalty_amount ?? 0), 0),
    }), [violations]);
    // ============================================================
    // نموذج الإضافة/التعديل
    // ============================================================
    const [formValues, setFormValues] = useState<ViolationFormValues>(buildEmptyViolationForm);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ViolationFormValues, string>>>({});
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const parsed = type === 'number' ? Number(value) : value;
        setFormValues(prev => ({ ...prev, [name]: parsed }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }, []);
    function validateViolationForm(vals: ViolationFormValues): boolean {
        const errs: Partial<Record<keyof ViolationFormValues, string>> = {};
        if (!vals.entity_id)
            errs.entity_id = 'المنشأة مطلوب';
        if (!vals.detectedDate)
            errs.detectedDate = 'تاريخ الاكتشاف مطلوب';
        if (!vals.description)
            errs.description = 'وصف المخالفة مطلوب';
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
    const handleWorkflowChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            entity_id: violation.entity_id ?? '',
            violationType: violation.violation_type,
            severity: violation.severity,
            detectedDate: violation.detected_date,
            description: violation.description ?? '',
            legalBasis: violation.legal_basis ?? '',
            penaltyAmount: violation.penalty_amount ?? 0,
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
        if (!ok)
            return;
        try {
            const headers: Record<string, string> = {};
            const token = localStorage.getItem('auth_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
            if (csrfMatch) headers['x-csrf-token'] = csrfMatch[1];
            
            await fetch(`${API_BASE}/violations/${violation.id}`, { method: 'DELETE', headers });
            setViolations(prev => prev.filter(v => v.id !== violation.id));
            logAudit({ action: 'delete', resource: 'violation', resourceId: violation.id, details: violation.violationNumber });
            toast.success(`تم حذف المخالفة ${violation.violationNumber} بنجاح`);
        }
        catch (error) {
            console.error('خطأ في حذف المخالفة:', error);
            toast.error('حدث خطأ أثناء حذف المخالفة');
        }
    }, [confirm]);
    const handleSave = useCallback(async () => {
        if (!validateViolationForm(formValues))
            return;
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('auth_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
            if (csrfMatch) headers['x-csrf-token'] = csrfMatch[1];

            if (editingViolation) {
                const body = {
                    entity_id: formValues.entity_id,
                    violation_type: formValues.violationType,
                    severity: formValues.severity,
                    detected_date: formValues.detectedDate,
                    description: formValues.description,
                    legal_basis: formValues.legalBasis,
                    penalty_amount: formValues.penaltyAmount,
                };
                const res = await fetch(`${API_BASE}/violations/${editingViolation.id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(body),
                });
                const result = await res.json();
                if (result?.violation) {
                    setViolations(prev => prev.map(v => v.id === editingViolation.id ? result.violation : v));
                    logAudit({ action: 'update', resource: 'violation', resourceId: editingViolation.id, details: editingViolation.violation_number });
                    toast.success('تم تحديث بيانات المخالفة بنجاح');
                }
            }
            else {
                const body = {
                    entity_id: formValues.entity_id,
                    violation_type: formValues.violationType,
                    severity: formValues.severity,
                    detected_date: formValues.detectedDate,
                    description: formValues.description,
                    legal_basis: formValues.legalBasis,
                    penalty_amount: formValues.penaltyAmount,
                };
                const res = await fetch(`${API_BASE}/violations`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                });
                const result = await res.json();
                if (result?.violation) {
                    setViolations(prev => [...prev, result.violation]);
                    logAudit({ action: 'create', resource: 'violation', resourceId: result.violation.id, details: result.violation.violation_number });
                    toast.success('تمت إضافة المخالفة بنجاح');
                }
            }
            setShowAddModal(false);
        }
        catch (error) {
            console.error('خطأ في حفظ المخالفة:', error);
            toast.error('حدث خطأ أثناء حفظ المخالفة');
        }
    }, [editingViolation, formValues]);
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
            resolutionNotes: violation.resolution_notes ?? '',
            resolvedDate: '',
        });
        setWorkflowErrors({});
        setShowWorkflowModal(true);
    }, []);
    const handleWorkflowSave = useCallback(async () => {
        if (!workflowTarget)
            return;
        const errs: Partial<Record<keyof WorkflowFormValues, string>> = {};
        if (['resolved', 'closed'].includes(workflowValues.newStatus) && !workflowValues.decision) {
            errs.decision = 'القرار مطلوب عند الإغلاق';
        }
        if (Object.keys(errs).length > 0) {
            setWorkflowErrors(errs);
            return;
        }
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('auth_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
            if (csrfMatch) headers['x-csrf-token'] = csrfMatch[1];

            const res = await fetch(`${API_BASE}/violations/${workflowTarget.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    status: workflowValues.newStatus,
                    decision: workflowValues.decision || undefined,
                    resolution_notes: workflowValues.resolutionNotes || undefined,
                    resolved_date: workflowValues.resolvedDate || undefined,
                }),
            });
            const result = await res.json();
            if (result?.violation) {
                setViolations(prev => prev.map(v => v.id === workflowTarget.id ? result.violation : v));
                logAudit({
                    action: 'update',
                    resource: 'violation',
                    resourceId: workflowTarget.id,
                    details: `Status changed to ${workflowValues.newStatus} for ${workflowTarget.violationNumber}`,
                });
                toast.success(`تم تغيير حالة المخالفة إلى "${STATUS_LABELS[workflowValues.newStatus]}"`);
            }
            setShowWorkflowModal(false);
        }
        catch (error) {
            console.error('خطأ في تغيير الحالة:', error);
            toast.error('حدث خطأ أثناء تغيير الحالة');
        }
    }, [workflowTarget, workflowValues]);
    const handleExport = useCallback(() => {
        exportReportToExcel({
            title: 'تقرير المخالفات والعقوبات',
            reportType: 'violations_list',
            data: violations,
            columns: [
                { key: 'violation_number', label: 'رقم المخالفة' },
                { key: 'entity_name', label: 'المنشأة' },
                { key: 'violation_type', label: 'نوع المخالفة' },
                { key: 'severity', label: 'الخطورة', format: (v: string) => SEVERITY_CONFIG[v as ViolationSeverity]?.label || v },
                { key: 'detected_date', label: 'تاريخ الاكتشاف' },
                { key: 'penalty_amount', label: 'الغرامة (ريال)' },
                { key: 'status', label: 'الحالة', format: (v: string) => STATUS_LABELS[v as ViolationStatus] || v },
            ],
        });
        logAudit({ action: 'export', resource: 'violations', details: 'Excel export' });
        toast.success('تم تصدير البيانات بنجاح');
    }, [violations]);
    // ============================================================
    // العرض
    // ============================================================
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة المخالفات والعقوبات" subtitle="توثيق ومتابعة المخالفات وفق الأنظمة المعمول بها" breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'المخالفات والعقوبات' }]} actions={<div className="flex items-center gap-2">
            <PermissionGate permission="violations:export">
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                <Download className="w-4 h-4"/>
                تصدير Excel
              </button>
            </PermissionGate>
            <PermissionGate permission="violations:create">
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Plus className="w-4 h-4"/>
                إضافة مخالفة
              </button>
            </PermissionGate>
          </div>}/>

      {loading && (<div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <TableSkeleton rows={5} columns={6} />
          <p className="text-center text-muted-foreground font-medium mt-4" aria-live="polite">جاري تحميل البيانات...</p>
        </div>)}

      {/* تنبيه قانوني */}
      <div className="flex items-start gap-3 bg-warning/10 border border-warning/15 rounded-xl px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"/>
        <p className="text-sm text-warning-dark font-medium">
          يجب توثيق جميع المخالفات وفق الأنظمة المعمول بها — يُعدّ هذا السجل وثيقة قانونية رسمية
        </p>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
            { label: 'إجمالي المخالفات', value: stats.total, Icon: ShieldAlert, color: 'text-primary-bright bg-primary-bright/10', filter: 'all' as const, isFilter: true },
            { label: 'مفتوحة', value: stats.open, Icon: AlertTriangle, color: 'text-error bg-error/10', filter: 'open' as const, isFilter: true },
            { label: 'قيد المراجعة', value: stats.under_review, Icon: Clock, color: 'text-warning bg-warning/10', filter: 'under_review' as const, isFilter: true },
            { label: 'محلولة', value: stats.resolved, Icon: CheckCircle, color: 'text-success bg-success/10', filter: 'resolved' as const, isFilter: true },
        ].map(stat => (<button key={stat.label} onClick={() => { setStatusFilter(stat.filter); setCurrentPage(1); }} className={`bg-card rounded-xl border p-4 shadow-sm text-right transition-all hover:shadow-md ${statusFilter === stat.filter ? 'border-primary ring-1 ring-ring/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.Icon className="w-4 h-4"/>
              </div>
              <span className="text-2xl font-bold text-heading">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </button>))}
        {/* بطاقة الغرامات */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-right">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-success bg-success/10">
              <DollarSign className="w-4 h-4"/>
            </div>
            <span className="text-lg font-bold text-heading text-left">{stats.totalFines.toLocaleString('ar')}</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">الغرامات المحصّلة (ريال)</p>
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
        ].map(tab => (<button key={tab.key} onClick={() => { setSeverityFilter(tab.key); setCurrentPage(1); }} className={`px-4 py-1.5 text-sm rounded-lg border font-medium transition-colors ${severityFilter === tab.key
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
            {tab.label}
          </button>))}
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {filtered.length === 0 ? 'لا توجد نتائج مطابقة للبحث' : `تم العثور على ${filtered.length} نتيجة مطابقة`}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
            <input type="text" id="violations-search" aria-label="البحث في المخالفات" aria-describedby="violations-search-desc" placeholder="البحث برقم المخالفة أو اسم المنشأة أو النوع..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
            <span id="violations-search-desc" className="sr-only">اكتب للبحث في المخالفات مع تأخير 350 مللي ثانية</span>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground"/>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ViolationStatus | 'all'); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
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
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">رقم المخالفة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المنشأة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">نوع المخالفة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الخطورة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">تاريخ الاكتشاف</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الغرامة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (<tr>
                  <td colSpan={9} className="py-8">
                    <EmptyState
                      title={violations.length === 0 ? 'لا توجد مخالفات مسجلة' : 'لا توجد نتائج مطابقة للبحث'}
                      description={violations.length === 0 ? 'ابدأ بإضافة مخالفة جديدة عبر زر إضافة مخالفة' : 'جرّب تغيير كلمات البحث أو الفلاتر'}
                      icon={<ShieldAlert className="w-full h-full" />}
                      action={violations.length === 0 ? (
                        <PermissionGate permission="violations:create">
                          <button onClick={openAdd} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">
                            إضافة مخالفة
                          </button>
                        </PermissionGate>
                      ) : undefined}
                    />
                  </td>
                </tr>) : (paginated.map((violation, idx) => {
            const sev = SEVERITY_CONFIG[violation.severity];
            const isExpanded = expandedId === violation.id;
            return (<>
                      <tr key={violation.id} className={`hover:bg-accent/50 transition-colors border-b ${isExpanded ? 'border-primary-bright/15 bg-primary-bright/5' : 'border-border'}`}>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                            {violation.violation_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-heading text-xs">{violation.entity_name}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs max-w-[180px]">
                          <span className="line-clamp-1">{violation.violation_type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${sev.color} ${sev.bg} ${sev.border}`}>
                            {sev.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{violation.detected_date}</td>
                        <td className="py-3 px-4 text-foreground text-xs font-medium">
                          {violation.penalty_amount != null ? `${violation.penalty_amount.toLocaleString('ar')} ر.ي` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={violation.status}/>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setExpandedId(isExpanded ? null : violation.id)} className="p-1.5 text-primary-bright hover:bg-primary-bright/10 rounded-lg transition-colors" title="عرض التفاصيل">
                              {isExpanded ? <ChevronUp className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                            <PermissionGate permission="violations:edit">
                              <button onClick={() => openEdit(violation)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors" title="تعديل">
                                <Edit2 className="w-4 h-4"/>
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="violations:resolve">
                              <button onClick={() => openWorkflow(violation)} disabled={STATUS_WORKFLOW[violation.status].length === 0} className="p-1.5 text-warning hover:bg-warning/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="تغيير الحالة">
                                <RefreshCw className="w-4 h-4"/>
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="violations:delete">
                              <button onClick={() => handleDelete(violation)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                      {/* لوحة التفاصيل القابلة للتوسع */}
                      {isExpanded && (<tr key={`${violation.id}-details`}>
                          <td colSpan={9} className="px-4 pb-4 bg-primary-bright/5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                              {violation.description && (<div className="bg-card rounded-lg p-3 border border-primary-bright/15">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5"/>
                                    وصف المخالفة
                                  </p>
                                  <p className="text-sm text-foreground leading-relaxed">{violation.description}</p>
                                </div>)}
                              {violation.legal_basis && (<div className="bg-card rounded-lg p-3 border border-primary-bright/15">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                    <Scale className="w-3.5 h-3.5"/>
                                    الأساس القانوني
                                  </p>
                                  <p className="text-sm text-foreground">{violation.legal_basis}</p>
                                </div>)}
                              {violation.decision && (<div className="bg-card rounded-lg p-3 border border-primary-bright/15">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5"/>
                                    القرار
                                  </p>
                                  <p className="text-sm text-foreground">{violation.decision}</p>
                                </div>)}
                              {violation.resolution_notes && (<div className="bg-card rounded-lg p-3 border border-primary-bright/15">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">ملاحظات الحل</p>
                                  <p className="text-sm text-foreground">{violation.resolution_notes}</p>
                                </div>)}
                              {violation.resolved_date && (<div className="bg-card rounded-lg p-3 border border-primary-bright/15">
                                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5"/>
                                    تاريخ الحل
                                  </p>
                                  <p className="text-sm text-foreground font-mono">{violation.resolved_date}</p>
                                </div>)}
                            </div>
                          </td>
                        </tr>)}
                    </>);
        }))}
            </tbody>
          </table>
        </div>

        {/* الترقيم */}
        {filtered.length > 0 && (<div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} مخالفة
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground">
                <ChevronRight className="w-4 h-4"/>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setCurrentPage(p)} className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-primary text-white' : 'hover:bg-accent text-muted-foreground'}`}>
                  {p}
                </button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground">
                <ChevronLeft className="w-4 h-4"/>
              </button>
            </div>
          </div>)}
      </div>

      {/* ====================================================
            نافذة إضافة/تعديل المخالفة
        ==================================================== */}
      {showAddModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-error/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-error"/>
                </div>
                <h2 className="font-bold text-heading">
                  {editingViolation ? 'تعديل بيانات المخالفة' : 'تسجيل مخالفة جديدة'}
                </h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* المنشأة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المنشأة <span className="text-error">*</span>
                  </label>
                  <select name="entity_id" value={formValues.entity_id} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.entity_id ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر المنشأة...</option>
                    {entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.entity_name}</option>)}
                  </select>
                  {formErrors.entity_id && <p className="text-error text-xs mt-1">{formErrors.entity_id}</p>}
                </div>

                {/* نوع المخالفة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">نوع المخالفة</label>
                  <select name="violationType" value={formValues.violationType} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
                    {VIOLATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* الخطورة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">درجة الخطورة</label>
                  <select name="severity" value={formValues.severity} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
                    <option value="minor">بسيطة</option>
                    <option value="moderate">متوسطة</option>
                    <option value="major">كبيرة</option>
                    <option value="critical">حرجة</option>
                  </select>
                </div>

                {/* تاريخ الاكتشاف */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    تاريخ الاكتشاف <span className="text-error">*</span>
                  </label>
                  <input type="date" name="detectedDate" value={formValues.detectedDate} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.detectedDate ? 'border-error' : 'border-border'}`}/>
                  {formErrors.detectedDate && <p className="text-error text-xs mt-1">{formErrors.detectedDate}</p>}
                </div>

                {/* الأساس القانوني */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الأساس القانوني</label>
                  <input type="text" name="legalBasis" value={formValues.legalBasis} onChange={handleFormChange} placeholder="مثال: المادة 42 من نظام النقابات" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* مبلغ الغرامة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">مبلغ الغرامة (ريال)</label>
                  <input type="number" name="penaltyAmount" value={formValues.penaltyAmount} onChange={handleFormChange} min={0} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* وصف المخالفة */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    وصف المخالفة <span className="text-error">*</span>
                  </label>
                  <textarea name="description" value={formValues.description} onChange={handleFormChange} rows={4} placeholder="وصف تفصيلي للمخالفة وملابساتها..." className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none ${formErrors.description ? 'border-error' : 'border-border'}`}/>
                  {formErrors.description && <p className="text-error text-xs mt-1">{formErrors.description}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                {editingViolation ? 'حفظ التغييرات' : 'تسجيل المخالفة'}
              </button>
            </div>
          </div>
        </div>)}

      {/* ====================================================
            نافذة سير العمل / تغيير الحالة
        ==================================================== */}
      {showWorkflowModal && workflowTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-warning"/>
                </div>
                <div>
                  <h2 className="font-bold text-heading">تغيير حالة المخالفة</h2>
                  <p className="text-xs text-muted-foreground">{workflowTarget.violation_number} — {workflowTarget.entity_name}</p>
                </div>
              </div>
              <button onClick={() => setShowWorkflowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* الحالة الجديدة */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">الحالة الجديدة</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_WORKFLOW[workflowTarget.status].map(s => (<button key={s} onClick={() => setWorkflowValues(prev => ({ ...prev, newStatus: s }))} className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${workflowValues.newStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
                      {STATUS_LABELS[s]}
                    </button>))}
                </div>
              </div>

              {/* القرار — مطلوب عند الإغلاق */}
              {['resolved', 'closed'].includes(workflowValues.newStatus) && (<div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    القرار <span className="text-error">*</span>
                  </label>
                  <textarea name="decision" value={workflowValues.decision} onChange={handleWorkflowChange} rows={3} placeholder="قرار الوزارة بشأن هذه المخالفة..." className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none ${workflowErrors.decision ? 'border-error' : 'border-border'}`}/>
                  {workflowErrors.decision && <p className="text-error text-xs mt-1">{workflowErrors.decision}</p>}
                </div>)}

              {/* ملاحظات الحل */}
              {['resolved', 'closed'].includes(workflowValues.newStatus) && (<div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">ملاحظات الحل</label>
                  <textarea name="resolutionNotes" value={workflowValues.resolutionNotes} onChange={handleWorkflowChange} rows={2} placeholder="ملاحظات إضافية حول آلية الحل..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"/>
                </div>)}

              {/* تاريخ الحل */}
              {['resolved', 'closed'].includes(workflowValues.newStatus) && (<div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">تاريخ الحل</label>
                  <input type="date" name="resolvedDate" value={workflowValues.resolvedDate} onChange={handleWorkflowChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>)}

              {/* معلومات الانتقال */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg p-3">
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0"/>
                <span>
                  سيتم تغيير الحالة من{' '}
                  <strong>"{STATUS_LABELS[workflowTarget.status]}"</strong>
                  {' '}إلى{' '}
                  <strong>"{STATUS_LABELS[workflowValues.newStatus]}"</strong>
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowWorkflowModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button onClick={handleWorkflowSave} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                تأكيد التغيير
              </button>
            </div>
          </div>
        </div>)}

      {confirmDialog}
    </div>);
}
