/**
 * DispatchesManagement — إدارة إرساليات العمال
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit2, Trash2, RefreshCw, CheckCircle, X, Clock, Send, ArrowLeftRight, FileText, Calendar, MapPin, Users, ChevronRight, ChevronLeft, AlertTriangle, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {} from '../../components/ui/EmptyState';
import {} from '../../components/ui/FilterBar';
import {} from '../../components/ui/ActionButtons';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
// ============================================================
// الأنواع
// ============================================================
type DispatchStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'suspended';
interface Dispatch {
    id: string;
    dispatchNumber: string;
    sendingEntity: string;
    receivingEntity: string;
    workerName: string;
    workerId?: string;
    dispatchDate: string;
    expectedReturnDate?: string;
    actualReturnDate?: string;
    status: DispatchStatus;
    purpose?: string;
    notes?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
}
// ============================================================
// قوائم حية تُجلب من السجلات الرسمية عبر الخادم
// ============================================================
// ============================================================
// الثوابت
// ============================================================
const STATUS_WORKFLOW: Record<DispatchStatus, DispatchStatus[]> = {
    draft: ['pending_approval', 'cancelled'],
    pending_approval: ['approved', 'cancelled'],
    approved: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'suspended'],
    completed: [],
    cancelled: [],
    suspended: ['in_progress', 'cancelled'],
};
const STATUS_LABELS: Record<DispatchStatus, string> = {
    draft: 'مسودة',
    pending_approval: 'قيد الموافقة',
    approved: 'تمت الموافقة',
    in_progress: 'جاري التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    suspended: 'معلق',
};
const STATUS_ICONS: Record<DispatchStatus, React.ElementType> = {
    draft: FileText,
    pending_approval: Clock,
    approved: CheckCircle,
    in_progress: Send,
    completed: CheckCircle,
    cancelled: X,
    suspended: AlertTriangle,
};
const PAGE_SIZE = 8;
// ============================================================
// نموذج إضافة إرسالية
// ============================================================
interface DispatchFormValues {
    sendingEntity: string;
    receivingEntity: string;
    workerName: string;
    dispatchDate: string;
    expectedReturnDate: string;
    purpose: string;
    notes: string;
    location: string;
}
function buildEmptyDispatchForm(): DispatchFormValues {
    return {
        sendingEntity: '',
        receivingEntity: '',
        workerName: '',
        dispatchDate: '',
        expectedReturnDate: '',
        purpose: '',
        notes: '',
        location: '',
    };
}
// نموذج تغيير الحالة
interface WorkflowFormValues {
    newStatus: DispatchStatus;
    notes: string;
    resolvedDate: string;
}
// ============================================================
// دالة جلب البيانات
// ============================================================
async function fetchDispatches(): Promise<Dispatch[]> {
    const response = await fetch('/api/dispatches');
    if (!response.ok)
        throw new Error('فشل في جلب بيانات الإرساليات');
    const data = await response.json();
    return data.data ?? data ?? [];
}
async function fetchDispatchStatus(id: string, status: DispatchStatus, notes?: string): Promise<Dispatch> {
    const response = await fetch(`/api/dispatches/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
    });
    if (!response.ok)
        throw new Error('فشل في تحديث حالة الإرسالية');
    const data = await response.json();
    return data.dispatch ?? data;
}
async function createDispatch(values: DispatchFormValues): Promise<Dispatch> {
    const response = await fetch('/api/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });
    if (!response.ok)
        throw new Error('فشل في إنشاء الإرسالية');
    const data = await response.json();
    return data.dispatch ?? data;
}
async function updateDispatch(id: string, values: Partial<DispatchFormValues>): Promise<Dispatch> {
    const response = await fetch(`/api/dispatches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });
    if (!response.ok)
        throw new Error('فشل في تحديث الإرسالية');
    const data = await response.json();
    return data.dispatch ?? data;
}
async function deleteDispatch(id: string): Promise<void> {
    const response = await fetch(`/api/dispatches/${id}`, { method: 'DELETE' });
    if (!response.ok)
        throw new Error('فشل في حذف الإرسالية');
}
async function fetchEntityNames(): Promise<string[]> {
    try {
        const response = await fetch('/api/entities?limit=200');
        if (!response.ok) return [];
        const data = await response.json();
        const rows = data.data ?? [];
        return rows.map((r: any) => r.name_ar).filter(Boolean);
    }
    catch {
        return [];
    }
}
async function fetchMemberNames(): Promise<string[]> {
    try {
        const response = await fetch('/api/members?limit=500');
        if (!response.ok) return [];
        const data = await response.json();
        const rows = data.data ?? [];
        return rows.map((r: any) => r.full_name).filter(Boolean);
    }
    catch {
        return [];
    }
}
// ============================================================
// المكوّن الرئيسي
// ============================================================
export default function DispatchesManagement() {
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [entityOptions, setEntityOptions] = useState<string[]>([]);
    const [workerOptions, setWorkerOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDispatch, setEditingDispatch] = useState<Dispatch | null>(null);
    const [detailDispatch, setDetailDispatch] = useState<Dispatch | null>(null);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [workflowTarget, setWorkflowTarget] = useState<Dispatch | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { confirm, dialog: confirmDialog } = useConfirm();
    // تحميل البيانات من API
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await fetchDispatches();
                setDispatches(data);
            }
            catch (error) {
                console.error('خطأ في تحميل الإرساليات:', error);
                toast.error('تعذر تحميل الإرساليات من الخادم');
            }
            finally {
                setLoading(false);
            }
        };
        loadData();
        fetchEntityNames().then(setEntityOptions);
        fetchMemberNames().then(setWorkerOptions);
    }, []);
    // ============================================================
    // التصفية
    // ============================================================
    const filtered = useMemo(() => {
        return dispatches.filter(d => {
            const q = searchQuery.trim();
            const matchSearch = !q ||
                d.dispatchNumber.includes(q) ||
                d.sendingEntity.includes(q) ||
                d.receivingEntity.includes(q) ||
                d.workerName.includes(q) ||
                (d.purpose && d.purpose.includes(q));
            const matchStatus = statusFilter === 'all' || d.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [dispatches, searchQuery, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: dispatches.length,
        draft: dispatches.filter(d => d.status === 'draft').length,
        pending_approval: dispatches.filter(d => d.status === 'pending_approval').length,
        in_progress: dispatches.filter(d => d.status === 'in_progress').length,
        completed: dispatches.filter(d => d.status === 'completed').length,
        cancelled: dispatches.filter(d => d.status === 'cancelled').length,
        suspended: dispatches.filter(d => d.status === 'suspended').length,
    }), [dispatches]);
    // ============================================================
    // نموذج الإضافة/التعديل
    // ============================================================
    const [formValues, setFormValues] = useState<DispatchFormValues>(buildEmptyDispatchForm);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof DispatchFormValues, string>>>({});
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }, []);
    function validateDispatchForm(vals: DispatchFormValues): boolean {
        const errs: Partial<Record<keyof DispatchFormValues, string>> = {};
        if (!vals.sendingEntity)
            errs.sendingEntity = 'المؤسسة المرسلة مطلوبة';
        if (!vals.receivingEntity)
            errs.receivingEntity = 'المؤسسة المستقبلة مطلوبة';
        if (vals.sendingEntity === vals.receivingEntity && vals.sendingEntity) {
            errs.receivingEntity = 'يجب أن تكون المؤسستان مختلفتين';
        }
        if (!vals.workerName)
            errs.workerName = 'اسم العامل مطلوب';
        if (!vals.dispatchDate)
            errs.dispatchDate = 'تاريخ الإرسالة مطلوب';
        if (!vals.purpose)
            errs.purpose = 'الغرض من الإرسالية مطلوب';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    }
    // ============================================================
    // نموذج سير العمل
    // ============================================================
    const [workflowValues, setWorkflowValues] = useState<WorkflowFormValues>({
        newStatus: 'pending_approval',
        notes: '',
        resolvedDate: '',
    });
    const handleWorkflowChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setWorkflowValues(prev => ({ ...prev, [name]: value }));
    }, []);
    // ============================================================
    // الإجراءات
    // ============================================================
    const openAdd = useCallback(() => {
        setFormValues(buildEmptyDispatchForm());
        setFormErrors({});
        setEditingDispatch(null);
        setShowAddModal(true);
    }, []);
    const openEdit = useCallback((dispatch: Dispatch) => {
        setFormValues({
            sendingEntity: dispatch.sendingEntity,
            receivingEntity: dispatch.receivingEntity,
            workerName: dispatch.workerName,
            dispatchDate: dispatch.dispatchDate,
            expectedReturnDate: dispatch.expectedReturnDate ?? '',
            purpose: dispatch.purpose ?? '',
            notes: dispatch.notes ?? '',
            location: dispatch.location ?? '',
        });
        setFormErrors({});
        setEditingDispatch(dispatch);
        setShowAddModal(true);
    }, []);
    const handleDelete = useCallback(async (dispatch: Dispatch) => {
        const ok = await confirm({
            title: 'حذف الإرسالية',
            message: `هل أنت متأكد من حذف إرسالية "${dispatch.dispatchNumber}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
            confirmLabel: 'حذف',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            await deleteDispatch(dispatch.id);
            setDispatches(prev => prev.filter(d => d.id !== dispatch.id));
            logAudit({ action: 'delete', resource: 'dispatch', resourceId: dispatch.id, details: dispatch.dispatchNumber });
            toast.success(`تم حذف الإرسالية ${dispatch.dispatchNumber} بنجاح`);
        }
        catch (error) {
            console.error('خطأ في حذف الإرسالية:', error);
            toast.error('حدث خطأ أثناء حذف الإرسالية');
        }
    }, [confirm]);
    const handleSave = useCallback(async () => {
        if (!validateDispatchForm(formValues))
            return;
        try {
            if (editingDispatch) {
                const result = await updateDispatch(editingDispatch.id, formValues);
                setDispatches(prev => prev.map(d => d.id === editingDispatch.id ? result : d));
                logAudit({ action: 'update', resource: 'dispatch', resourceId: editingDispatch.id, details: editingDispatch.dispatchNumber });
                toast.success('تم تحديث بيانات الإرسالية بنجاح');
            }
            else {
                const result = await createDispatch(formValues);
                setDispatches(prev => [...prev, result]);
                logAudit({ action: 'create', resource: 'dispatch', resourceId: result.id, details: result.dispatchNumber });
                toast.success('تمت إضافة الإرسالية بنجاح');
            }
            setShowAddModal(false);
        }
        catch (error) {
            console.error('خطأ في حفظ الإرسالية:', error);
            toast.error('حدث خطأ أثناء حفظ الإرسالية');
        }
    }, [editingDispatch, formValues]);
    const openWorkflow = useCallback((dispatch: Dispatch) => {
        const nextStatuses = STATUS_WORKFLOW[dispatch.status];
        if (nextStatuses.length === 0) {
            toast.info('لا يمكن تغيير حالة هذه الإرسالية');
            return;
        }
        setWorkflowTarget(dispatch);
        setWorkflowValues({
            newStatus: nextStatuses[0],
            notes: '',
            resolvedDate: '',
        });
        setShowWorkflowModal(true);
    }, []);
    const handleWorkflowSave = useCallback(async () => {
        if (!workflowTarget)
            return;
        try {
            const result = await fetchDispatchStatus(workflowTarget.id, workflowValues.newStatus, workflowValues.notes || undefined);
            setDispatches(prev => prev.map(d => d.id === workflowTarget.id ? result : d));
            logAudit({
                action: 'update',
                resource: 'dispatch',
                resourceId: workflowTarget.id,
                details: `Status changed to ${workflowValues.newStatus} for ${workflowTarget.dispatchNumber}`,
            });
            toast.success(`تم تغيير حالة الإرسالية إلى "${STATUS_LABELS[workflowValues.newStatus]}"`);
            setShowWorkflowModal(false);
        }
        catch (error) {
            console.error('خطأ في تغيير الحالة:', error);
            toast.error('حدث خطأ أثناء تغيير الحالة');
        }
    }, [workflowTarget, workflowValues]);
    const handleRefresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchDispatches();
            setDispatches(data);
            toast.success('تم تحديث البيانات');
        }
        catch (error) {
            console.error('خطأ في تحديث البيانات:', error);
            toast.error('حدث خطأ أثناء تحديث البيانات');
        }
        finally {
            setLoading(false);
        }
    }, []);
    // ============================================================
    // العرض
    // ============================================================
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="إرساليات وتوجيه العمالة" subtitle="متابعة وإصدار تصاريح حركة وإرساليات العمالة بين الشركات والمنشآت المسجّلة" breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'إرساليات وتوجيه العمالة' }]} actions={<div className="flex items-center gap-2">
            <button onClick={() => { exportReportToExcel({ title: 'إرساليات وتوجيه العمالة', reportType: 'statistics', data: dispatches, columns: [{ key: 'worker_name', label: 'اسم العامل' }, { key: 'origin_entity', label: 'المنشأة المصدر' }, { key: 'destination_entity', label: 'المنشأة المستقبلة' }, { key: 'dispatch_date', label: 'التاريخ' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'dispatches', details: { count: dispatches.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <Download className="w-4 h-4"/>تصدير
            </button>
            <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
              تحديث
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
              <Plus className="w-4 h-4"/>
              إضافة إرسالية
            </button>
          </div>}/>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'إجمالي الإرساليات', value: stats.total, Icon: Send, color: 'text-primary-bright bg-primary-bright/10', filter: 'all' as const },
            { label: 'قيد الموافقة', value: stats.pending_approval, Icon: Clock, color: 'text-warning bg-warning/10', filter: 'pending_approval' as const },
            { label: 'جارية التنفيذ', value: stats.in_progress, Icon: ArrowLeftRight, color: 'text-info bg-info/10', filter: 'in_progress' as const },
            { label: 'مكتملة', value: stats.completed, Icon: CheckCircle, color: 'text-success bg-success/10', filter: 'completed' as const },
        ].map(stat => (<button key={stat.label} onClick={() => { setStatusFilter(stat.filter); setCurrentPage(1); }} className={`bg-card rounded-xl border p-4 shadow-sm text-right transition-all hover:shadow-md ${statusFilter === stat.filter ? 'border-primary ring-1 ring-ring/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.Icon className="w-4 h-4"/>
              </div>
              <span className="text-2xl font-bold text-heading">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </button>))}
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" placeholder="البحث برقم الإرسالية أو اسم العامل أو الجهة..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground"/>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as DispatchStatus | 'all'); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
              <option value="all">جميع الحالات</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* تبويبات الحالة */}
      <div className="flex flex-wrap items-center gap-2">
        {[
            { key: 'all' as const, label: 'الكل' },
            { key: 'draft' as const, label: 'مسودة' },
            { key: 'pending_approval' as const, label: 'قيد الموافقة' },
            { key: 'approved' as const, label: 'تمت الموافقة' },
            { key: 'in_progress' as const, label: 'جاري التنفيذ' },
            { key: 'completed' as const, label: 'مكتمل' },
            { key: 'cancelled' as const, label: 'ملغي' },
            { key: 'suspended' as const, label: 'معلق' },
        ].map(tab => (<button key={tab.key} onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }} className={`px-4 py-1.5 text-sm rounded-lg border font-medium transition-colors ${statusFilter === tab.key
                ? 'bg-primary text-white border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}>
            {tab.label}
          </button>))}
      </div>

      {/* الجدول */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (<div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin"/>
            <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
          </div>) : (<>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">رقم الإرسالية</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المؤسسة المرسلة</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المؤسسة المستقبلة</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">العامل</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">تاريخ الإرسالة</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                    <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (<tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Send className="w-12 h-12 text-muted-foreground mx-auto mb-3"/>
                        <p className="text-muted-foreground font-medium">لا توجد إرساليات مطابقة للبحث</p>
                      </td>
                    </tr>) : (paginated.map((dispatch, idx) => {
                return (<tr key={dispatch.id} className="hover:bg-accent/50 transition-colors border-b border-border">
                          <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                            {(currentPage - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                              {dispatch.dispatchNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-heading text-xs">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
                              {dispatch.sendingEntity}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-heading text-xs">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-success flex-shrink-0"/>
                              {dispatch.receivingEntity}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
                              {dispatch.workerName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
                              {dispatch.dispatchDate}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={dispatch.status}/>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDetailDispatch(dispatch)} className="p-1.5 text-primary-bright hover:bg-primary-bright/10 rounded-lg transition-colors" title="عرض التفاصيل">
                                <Eye className="w-4 h-4"/>
                              </button>
                              <button onClick={() => openEdit(dispatch)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors" title="تعديل">
                                <Edit2 className="w-4 h-4"/>
                              </button>
                              <button onClick={() => openWorkflow(dispatch)} disabled={STATUS_WORKFLOW[dispatch.status].length === 0} className="p-1.5 text-warning hover:bg-warning/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="تغيير الحالة">
                                <RefreshCw className="w-4 h-4"/>
                              </button>
                              <button onClick={() => handleDelete(dispatch)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </div>
                          </td>
                        </tr>);
            }))}
                </tbody>
              </table>
            </div>

            {/* الترقيم */}
            {filtered.length > 0 && (<div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} إرسالية
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
          </>)}
      </div>

      {/* ====================================================
            نافذة عرض التفاصيل
        ==================================================== */}
      {detailDispatch && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-bright/15 flex items-center justify-center">
                  <Send className="w-5 h-5 text-primary-bright"/>
                </div>
                <div>
                  <h2 className="font-bold text-heading">تفاصيل الإرسالية</h2>
                  <p className="text-xs text-muted-foreground">{detailDispatch.dispatchNumber}</p>
                </div>
              </div>
              <button onClick={() => setDetailDispatch(null)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5"/>
                    رقم الإرسالية
                  </p>
                  <p className="text-sm text-heading font-mono">{detailDispatch.dispatchNumber}</p>
                </div>

                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    {(() => { const Icon = STATUS_ICONS[detailDispatch.status]; return <Icon className="w-3.5 h-3.5"/>; })()}
                    الحالة
                  </p>
                  <StatusBadge status={detailDispatch.status}/>
                </div>

                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5"/>
                    المؤسسة المرسلة
                  </p>
                  <p className="text-sm text-heading">{detailDispatch.sendingEntity}</p>
                </div>

                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-success"/>
                    المؤسسة المستقبلة
                  </p>
                  <p className="text-sm text-heading">{detailDispatch.receivingEntity}</p>
                </div>

                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5"/>
                    العامل
                  </p>
                  <p className="text-sm text-heading">{detailDispatch.workerName}</p>
                  {detailDispatch.workerId && (<p className="text-xs text-muted-foreground mt-0.5">رقم الموظف: {detailDispatch.workerId}</p>)}
                </div>

                <div className="bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5"/>
                    تاريخ الإرسالة
                  </p>
                  <p className="text-sm text-heading font-mono">{detailDispatch.dispatchDate}</p>
                </div>

                {detailDispatch.expectedReturnDate && (<div className="bg-card rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-warning"/>
                      تاريخ العودة المتوقع
                    </p>
                    <p className="text-sm text-heading font-mono">{detailDispatch.expectedReturnDate}</p>
                  </div>)}

                {detailDispatch.actualReturnDate && (<div className="bg-card rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-success"/>
                      تاريخ العودة الفعلي
                    </p>
                    <p className="text-sm text-heading font-mono">{detailDispatch.actualReturnDate}</p>
                  </div>)}

                {detailDispatch.location && (<div className="bg-card rounded-lg p-3 border border-border sm:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5"/>
                      الموقع
                    </p>
                    <p className="text-sm text-heading">{detailDispatch.location}</p>
                  </div>)}

                {detailDispatch.purpose && (<div className="bg-card rounded-lg p-3 border border-border sm:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <Send className="w-3.5 h-3.5"/>
                      الغرض من الإرسالية
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{detailDispatch.purpose}</p>
                  </div>)}

                {detailDispatch.notes && (<div className="bg-card rounded-lg p-3 border border-border sm:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">ملاحظات</p>
                    <p className="text-sm text-foreground leading-relaxed">{detailDispatch.notes}</p>
                  </div>)}

                <div className="bg-muted/50 rounded-lg p-3 border border-border sm:col-span-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>تاريخ الإنشاء: {new Date(detailDispatch.createdAt).toLocaleDateString('ar')}</span>
                    <span>آخر تحديث: {new Date(detailDispatch.updatedAt).toLocaleDateString('ar')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setDetailDispatch(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* ====================================================
            نافذة إضافة/تعديل الإرسالية
        ==================================================== */}
      {showAddModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-bright/15 flex items-center justify-center">
                  <Send className="w-5 h-5 text-primary-bright"/>
                </div>
                <h2 className="font-bold text-heading">
                  {editingDispatch ? 'تعديل بيانات الإرسالية' : 'إضافة إرسالية جديدة'}
                </h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* المؤسسة المرسلة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المؤسسة المرسلة <span className="text-error">*</span>
                  </label>
                  <select name="sendingEntity" value={formValues.sendingEntity} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.sendingEntity ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر المؤسسة المرسلة...</option>
                    {entityOptions.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {formErrors.sendingEntity && <p className="text-error text-xs mt-1">{formErrors.sendingEntity}</p>}
                </div>

                {/* المؤسسة المستقبلة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المؤسسة المستقبلة <span className="text-error">*</span>
                  </label>
                  <select name="receivingEntity" value={formValues.receivingEntity} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.receivingEntity ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر المؤسسة المستقبلة...</option>
                    {entityOptions.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {formErrors.receivingEntity && <p className="text-error text-xs mt-1">{formErrors.receivingEntity}</p>}
                </div>

                {/* اسم العامل */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    اسم العامل <span className="text-error">*</span>
                  </label>
                  <select name="workerName" value={formValues.workerName} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.workerName ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر العامل...</option>
                    {workerOptions.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {formErrors.workerName && <p className="text-error text-xs mt-1">{formErrors.workerName}</p>}
                </div>

                {/* الموقع */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الموقع</label>
                  <input type="text" name="location" value={formValues.location} onChange={handleFormChange} placeholder="مثال: صنعاء - المطار" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* تاريخ الإرسالة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    تاريخ الإرسالة <span className="text-error">*</span>
                  </label>
                  <input type="date" name="dispatchDate" value={formValues.dispatchDate} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.dispatchDate ? 'border-error' : 'border-border'}`}/>
                  {formErrors.dispatchDate && <p className="text-error text-xs mt-1">{formErrors.dispatchDate}</p>}
                </div>

                {/* تاريخ العودة المتوقع */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">تاريخ العودة المتوقع</label>
                  <input type="date" name="expectedReturnDate" value={formValues.expectedReturnDate} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* الغرض من الإرسالية */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    الغرض من الإرسالية <span className="text-error">*</span>
                  </label>
                  <textarea name="purpose" value={formValues.purpose} onChange={handleFormChange} rows={3} placeholder="وصف الغرض من إرسالية العامل..." className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none ${formErrors.purpose ? 'border-error' : 'border-border'}`}/>
                  {formErrors.purpose && <p className="text-error text-xs mt-1">{formErrors.purpose}</p>}
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">ملاحظات</label>
                  <textarea name="notes" value={formValues.notes} onChange={handleFormChange} rows={2} placeholder="أي ملاحظات إضافية..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"/>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                {editingDispatch ? 'حفظ التغييرات' : 'تسجيل الإرسالية'}
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
                  <h2 className="font-bold text-heading">تغيير حالة الإرسالية</h2>
                  <p className="text-xs text-muted-foreground">{workflowTarget.dispatchNumber} — {workflowTarget.workerName}</p>
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

              {/* ملاحظات */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">ملاحظات تغيير الحالة</label>
                <textarea name="notes" value={workflowValues.notes} onChange={handleWorkflowChange} rows={3} placeholder="أي ملاحظات حول تغيير الحالة..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"/>
              </div>

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
