/**
 * DocumentsManagement — إدارة الوثائق والمستندات
 * دورة مستندية كاملة: مسودة → مراجعة → اعتماد/رفض
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FileText, Upload, CheckCircle, XCircle, Clock, Send, Search, Plus, Eye, Edit2, Trash2, Download, Archive, FolderOpen, Settings, } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useApi } from '../../hooks/useApi';
import DynamicFieldRenderer from '../../components/DynamicFieldRenderer';
import CustomFieldManager from '../../components/CustomFieldManager';
import { useCustomFields } from '../../hooks/useCustomFields';
import { validateFieldValues } from '../../utils/dynamicFieldValidation';
// ============================================================
// البيانات
// ============================================================
interface Document {
    id: string;
    docNumber: string;
    name: string;
    type: string;
    entityName: string;
    issueDate: string;
    expiryDate?: string;
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
    reviewer?: string;
    approvalDate?: string;
    rejectionReason?: string;
    description?: string;
    fileSize?: string;
    tags?: string[];
    custom_data?: Record<string, any>;
}
const INITIAL_DOCS: Document[] = [
    { id: '1', docNumber: 'DOC-2026-001', name: 'محضر اجتماع الهيئة الإدارية', type: 'محضر اجتماع', entityName: 'نقابة المهندسين اليمنية', issueDate: '2026-04-15', status: 'approved', reviewer: 'أحمد محمد الوزاري', approvalDate: '2026-04-20', fileSize: '1.2 MB', tags: ['محاضر', '2026'] },
    { id: '2', docNumber: 'DOC-2026-002', name: 'التقرير المالي السنوي 2025', type: 'تقرير مالي', entityName: 'نقابة الأطباء اليمنيين', issueDate: '2026-03-10', status: 'under_review', reviewer: 'فاطمة علي البرعي', fileSize: '3.8 MB', tags: ['مالي', '2025'] },
    { id: '3', docNumber: 'DOC-2026-003', name: 'اللائحة الداخلية المعدلة', type: 'لائحة داخلية', entityName: 'نقابة المعلمين', issueDate: '2026-04-28', status: 'draft', fileSize: '0.9 MB', tags: ['لوائح'] },
    { id: '4', docNumber: 'DOC-2026-004', name: 'عقد شراكة مع مركز التدريب', type: 'عقد', entityName: 'نقابة المهندسين اليمنية', issueDate: '2026-04-01', status: 'rejected', reviewer: 'خالد حسن القحطاني', rejectionReason: 'بحاجة إلى توضيح بنود الصلاحيات وتعديل المادة السابعة', fileSize: '2.1 MB' },
    { id: '5', docNumber: 'DOC-2026-005', name: 'طلب اعتماد برنامج تدريبي', type: 'طلب', entityName: 'اتحاد التجار اليمنيين', issueDate: '2026-05-10', status: 'submitted', fileSize: '0.5 MB', tags: ['تدريب'] },
    { id: '6', docNumber: 'DOC-2026-006', name: 'نظام الانتخابات الداخلية', type: 'لائحة داخلية', entityName: 'نقابة الصحفيين', issueDate: '2026-02-20', status: 'approved', reviewer: 'محمد الشميري', approvalDate: '2026-03-05', fileSize: '1.7 MB', tags: ['انتخابات', 'لوائح'] },
    { id: '7', docNumber: 'DOC-2026-007', name: 'تقرير الأنشطة الربع سنوي', type: 'تقرير', entityName: 'نقابة عمال البناء', issueDate: '2026-06-01', status: 'draft', fileSize: '1.1 MB', tags: ['أنشطة'] },
];
const DOC_TYPES = ['محضر اجتماع', 'تقرير مالي', 'تقرير', 'لائحة داخلية', 'عقد', 'طلب', 'شهادة', 'قرار', 'أخرى'];
const STATUS_TABS = [
    { key: 'all', label: 'الكل', icon: FolderOpen },
    { key: 'draft', label: 'مسودات', icon: FileText },
    { key: 'submitted', label: 'مقدّمة', icon: Send },
    { key: 'under_review', label: 'قيد المراجعة', icon: Clock },
    { key: 'approved', label: 'معتمدة', icon: CheckCircle },
    { key: 'rejected', label: 'مرفوضة', icon: XCircle },
];
// ============================================================
// المكوّن
// ============================================================
export function DocumentsManagement() {
    const [docs, setDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [reviewingDoc, setReviewingDoc] = useState<Document | null>(null);
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
    const [reviewNotes, setReviewNotes] = useState('');
    const [detailDoc, setDetailDoc] = useState<Document | null>(null);
    const [form, setForm] = useState({ name: '', type: 'محضر اجتماع', entityName: '', issueDate: '', description: '' });
    const { definitions: cfDefs, load: loadCf } = useCustomFields('documents');
    const [customData, setCustomData] = useState<Record<string, any>>({});
    const [showCfManager, setShowCfManager] = useState(false);
    const [cfErrors, setCfErrors] = useState<Record<string, string>>({});
    const fileRef = useRef<HTMLInputElement>(null);
    const { confirm, dialog: confirmDialog } = useConfirm();
    const api = useApi();
    // تحميل البيانات من API
    useEffect(() => {
        const fetchDocs = async () => {
            setLoading(true);
            try {
                const result = await api.execute('/documents');
                if (result?.data) {
                    setDocs(result.data);
                }
                else {
                    setDocs(INITIAL_DOCS);
                }
            }
            catch (error) {
                console.error('خطأ في تحميل الوثائق:', error);
                setDocs(INITIAL_DOCS);
            }
            finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, [api]);
    // حساب الإحصائيات
    const stats = useMemo(() => ({
        total: docs.length,
        approved: docs.filter(d => d.status === 'approved').length,
        under_review: docs.filter(d => d.status === 'under_review' || d.status === 'submitted').length,
        draft: docs.filter(d => d.status === 'draft').length,
        rejected: docs.filter(d => d.status === 'rejected').length,
    }), [docs]);
    // تصفية الوثائق
    const filtered = useMemo(() => {
        let result = docs;
        if (statusFilter !== 'all')
            result = result.filter(d => d.status === statusFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(d => d.name.toLowerCase().includes(q) ||
                d.docNumber.toLowerCase().includes(q) ||
                d.entityName.toLowerCase().includes(q) ||
                d.type.toLowerCase().includes(q));
        }
        return result;
    }, [docs, statusFilter, searchQuery]);
    // فتح نموذج الإضافة/التعديل
    const openModal = useCallback((doc?: Document) => {
        if (doc) {
            setEditingDoc(doc);
            setForm({ name: doc.name, type: doc.type, entityName: doc.entityName, issueDate: doc.issueDate, description: doc.description || '' });
            setCustomData(doc.custom_data || {});
        }
        else {
            setEditingDoc(null);
            setForm({ name: '', type: 'محضر اجتماع', entityName: '', issueDate: new Date().toISOString().slice(0, 10), description: '' });
        }
        setShowModal(true);
    }, []);
    // حفظ الوثيقة
    const handleSave = useCallback(async () => {
        if (!form.name.trim() || !form.entityName.trim() || !form.issueDate) {
            toast.error('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        if (cfDefs.length) {
            const cv = validateFieldValues(cfDefs, customData);
            if (!cv.valid) {
                setCfErrors(cv.errors);
                toast.error('بعض الحقول المخصصة للوثيقة غير صالحة');
                return;
            }
            setCustomData(cv.normalized);
        }
        try {
            if (editingDoc) {
                const result = await api.execute(`/documents/${editingDoc.id}`, {
                    method: 'PUT',
                    body: { ...form, custom_data: customData },
                });
                if (result?.document) {
                    setDocs(prev => prev.map(d => d.id === editingDoc.id ? result.document : d));
                    logAudit({ action: 'update', resource: 'document', resourceId: editingDoc.id });
                    toast.success('تم تحديث الوثيقة بنجاح');
                }
            }
            else {
                const result = await api.execute('/documents', {
                    method: 'POST',
                    body: { ...form, custom_data: customData },
                });
                if (result?.document) {
                    setDocs(prev => [...prev, result.document]);
                    logAudit({ action: 'create', resource: 'document', resourceId: result.document.id });
                    toast.success('تمت إضافة الوثيقة بنجاح');
                }
            }
            setShowModal(false);
        }
        catch (error) {
            console.error('خطأ في حفظ الوثيقة:', error);
            toast.error('حدث خطأ أثناء حفظ الوثيقة');
        }
    }, [form, editingDoc, api]);
    // تصدير الوثائق مع الحقول المخصصة القابلة للتقرير
    const handleExportDocs = useCallback(() => {
        const reportable = cfDefs.filter(d => d.reportable !== false);
        const extraCols = reportable.map(d => ({ key: `cf_${d.field_key}`, label: d.label }));
        const rows = docs.map(d => {
            const row: any = { ...d };
            for (const def of reportable)
                row[`cf_${def.field_key}`] = d.custom_data?.[def.field_key] ?? '';
            return row;
        });
        exportReportToExcel({
            title: 'تقرير الوثائق',
            reportType: 'members_list',
            data: rows,
            columns: [
                { key: 'docNumber', label: 'رقم الوثيقة' },
                { key: 'name', label: 'الاسم' },
                { key: 'type', label: 'النوع' },
                { key: 'entityName', label: 'النقابة أو المنظمة' },
                { key: 'status', label: 'الحالة' },
                ...extraCols,
            ],
        });
        toast.success('تم تصدير التقرير');
    }, [docs, cfDefs]);
    // إرسال للمراجعة
    const handleSubmitForReview = useCallback(async (doc: Document) => {
        try {
            const result = await api.execute(`/documents/${doc.id}`, {
                method: 'PUT',
                body: { status: 'submitted' },
            });
            if (result?.document) {
                setDocs(prev => prev.map(d => d.id === doc.id ? result.document : d));
                logAudit({ action: 'update', resource: 'document', resourceId: doc.id, details: { action: 'submit_for_review' } });
                toast.success('تم إرسال الوثيقة للمراجعة');
            }
        }
        catch (error) {
            console.error('خطأ في إرسال الوثيقة:', error);
            toast.error('حدث خطأ أثناء إرسال الوثيقة');
        }
    }, [api]);
    // اعتماد أو رفض
    const handleReviewSubmit = useCallback(async () => {
        if (!reviewingDoc)
            return;
        if (reviewAction === 'reject' && !reviewNotes.trim()) {
            toast.error('يرجى كتابة سبب الرفض');
            return;
        }
        const updatedStatus = reviewAction === 'approve' ? 'approved' : 'rejected';
        try {
            const result = await api.execute(`/documents/${reviewingDoc.id}`, {
                method: 'PUT',
                body: {
                    status: updatedStatus,
                    rejectionReason: reviewAction === 'reject' ? reviewNotes : undefined,
                },
            });
            if (result?.document) {
                setDocs(prev => prev.map(d => d.id === reviewingDoc.id ? result.document : d));
                logAudit({ action: 'update', resource: 'document', resourceId: reviewingDoc.id, details: { reviewAction } });
                toast.success(reviewAction === 'approve' ? 'تمت الموافقة على الوثيقة' : 'تم رفض الوثيقة مع ذكر السبب');
            }
            setReviewingDoc(null);
            setReviewNotes('');
        }
        catch (error) {
            console.error('خطأ في مراجعة الوثيقة:', error);
            toast.error('حدث خطأ أثناء مراجعة الوثيقة');
        }
    }, [reviewingDoc, reviewAction, reviewNotes, api]);
    // حذف
    const handleDelete = useCallback(async (doc: Document) => {
        const confirmed = await confirm({
            title: 'حذف الوثيقة',
            message: `هل أنت متأكد من حذف "${doc.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            confirmLabel: 'حذف الوثيقة',
            variant: 'danger',
        });
        if (!confirmed)
            return;
        try {
            await api.execute(`/documents/${doc.id}`, { method: 'DELETE' });
            setDocs(prev => prev.filter(d => d.id !== doc.id));
            logAudit({ action: 'delete', resource: 'document', resourceId: doc.id });
            toast.success('تم حذف الوثيقة');
        }
        catch (error) {
            console.error('خطأ في حذف الوثيقة:', error);
            toast.error('حدث خطأ أثناء حذف الوثيقة');
        }
    }, [confirm, api]);
    // أرشفة
    const handleArchive = useCallback(async (doc: Document) => {
        const confirmed = await confirm({
            title: 'أرشفة الوثيقة',
            message: `سيتم أرشفة "${doc.name}" ولن تظهر في القوائم الرئيسية.`,
            confirmLabel: 'أرشفة',
            variant: 'warning',
        });
        if (!confirmed)
            return;
        try {
            const result = await api.execute(`/documents/${doc.id}`, {
                method: 'PUT',
                body: { status: 'archived' },
            });
            if (result?.document) {
                setDocs(prev => prev.map(d => d.id === doc.id ? result.document : d));
                toast.success('تمت أرشفة الوثيقة');
            }
        }
        catch (error) {
            console.error('خطأ في أرشفة الوثيقة:', error);
            toast.error('حدث خطأ أثناء أرشفة الوثيقة');
        }
    }, [confirm, api]);
    const statusIcon = (s: string) => {
        if (s === 'approved')
            return <CheckCircle className="w-4 h-4 text-success"/>;
        if (s === 'rejected')
            return <XCircle className="w-4 h-4 text-error"/>;
        if (s === 'under_review' || s === 'submitted')
            return <Clock className="w-4 h-4 text-primary-bright"/>;
        return <FileText className="w-4 h-4 text-muted-foreground"/>;
    };
    return (<div className="space-y-5" dir="rtl">
      <PageHeader title="إدارة الوثائق" subtitle="مستودع مركزي للوثائق مع دورة مستندية كاملة" breadcrumbs={[{ label: 'الوزارة' }, { label: 'الوثائق' }]} actions={<>
            <button onClick={handleExportDocs} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-xl text-muted-foreground hover:bg-accent transition-colors">
              <Download className="w-4 h-4"/> تصدير
            </button>
            <PermissionGate permission="documents:upload">
              <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-sm">
                <Plus className="w-4 h-4"/> إضافة وثيقة
              </button>
            </PermissionGate>
          </>}/>

      {loading && (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"/>
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>)}

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
            { label: 'الإجمالي', value: stats.total, color: 'text-heading', bg: 'bg-muted border-border' },
            { label: 'معتمدة', value: stats.approved, color: 'text-success-dark', bg: 'bg-success/10 border-success/30' },
            { label: 'قيد المراجعة', value: stats.under_review, color: 'text-primary-bright', bg: 'bg-primary-bright/10 border-primary-bright/30' },
            { label: 'مسودات', value: stats.draft, color: 'text-muted-foreground', bg: 'bg-muted border-border' },
            { label: 'مرفوضة', value: stats.rejected, color: 'text-error', bg: 'bg-error/10 border-error/30' },
        ].map(s => (<div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</p>
          </div>))}
      </div>

      {/* الفلاتر */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" placeholder="بحث بالاسم أو الرقم أو النوع..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-9 pl-4 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring focus:border-transparent"/>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_TABS.map(t => (<button key={t.key} onClick={() => setStatusFilter(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === t.key ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                <t.icon className="w-3.5 h-3.5"/>
                {t.label}
              </button>))}
          </div>
        </div>
      </div>

      {/* قائمة الوثائق */}
      {filtered.length === 0 ? (<div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3"/>
          <p className="text-muted-foreground font-medium">لا توجد وثائق مطابقة للبحث</p>
          <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="mt-3 text-sm text-primary hover:underline">مسح الفلاتر</button>
        </div>) : (<div className="space-y-3">
          {filtered.map(doc => (<div key={doc.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-border transition-all p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-bright/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  {statusIcon(doc.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-heading">{doc.name}</h3>
                    <StatusBadge status={doc.status}/>
                    {doc.tags?.map(tag => (<span key={tag} className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full">{tag}</span>))}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span>رقم: <strong className="text-foreground font-mono">{doc.docNumber}</strong></span>
                    <span>النوع: <strong className="text-foreground">{doc.type}</strong></span>
                    <span>النقابة أو المنظمة: <strong className="text-foreground">{doc.entityName}</strong></span>
                    <span>التاريخ: <strong className="text-foreground">{doc.issueDate}</strong></span>
                    {doc.fileSize && <span>الحجم: <strong className="text-foreground">{doc.fileSize}</strong></span>}
                  </div>

                  {/* معلومات إضافية حسب الحالة */}
                  {doc.status === 'approved' && (<div className="mt-2 flex items-center gap-2 text-xs text-success-dark bg-success/10 px-3 py-1.5 rounded-lg border border-success/30 w-fit">
                      <CheckCircle className="w-3.5 h-3.5"/>
                      معتمد من: <strong>{doc.reviewer}</strong> في {doc.approvalDate}
                    </div>)}
                  {doc.status === 'rejected' && doc.rejectionReason && (<div className="mt-2 flex items-start gap-2 text-xs text-error bg-error/10 px-3 py-1.5 rounded-lg border border-error/30">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/>
                      <span>سبب الرفض: {doc.rejectionReason}</span>
                    </div>)}
                  {doc.status === 'under_review' && (<div className="mt-2 flex items-center gap-2 text-xs text-primary-bright bg-primary-bright/10 px-3 py-1.5 rounded-lg border border-primary-bright/30 w-fit">
                      <Clock className="w-3.5 h-3.5"/>
                      تحت مراجعة: <strong>{doc.reviewer}</strong>
                    </div>)}
                </div>

                {/* الأزرار */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setDetailDoc(doc)} className="p-1.5 text-primary-bright hover:bg-primary-bright/10 rounded-lg transition-colors" title="عرض">
                    <Eye className="w-4 h-4"/>
                  </button>
                  {(doc.status === 'draft' || doc.status === 'rejected') && (<button onClick={() => openModal(doc)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors" title="تعديل">
                      <Edit2 className="w-4 h-4"/>
                    </button>)}
                  {doc.status === 'draft' && (<button onClick={() => handleSubmitForReview(doc)} className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                      <Send className="w-3.5 h-3.5"/> إرسال
                    </button>)}
                  {(doc.status === 'submitted' || doc.status === 'under_review') && (<>
                      <PermissionGate permission="documents:approve">
                        <button onClick={() => { setReviewingDoc(doc); setReviewAction('approve'); setReviewNotes(''); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:bg-success-dark transition-colors">
                          <CheckCircle className="w-3.5 h-3.5"/> اعتماد
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="documents:reject">
                        <button onClick={() => { setReviewingDoc(doc); setReviewAction('reject'); setReviewNotes(''); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-error text-white text-xs font-semibold rounded-lg hover:bg-error-dark transition-colors">
                          <XCircle className="w-3.5 h-3.5"/> رفض
                        </button>
                      </PermissionGate>
                    </>)}
                  {doc.status === 'approved' && (<button onClick={() => handleArchive(doc)} className="p-1.5 text-muted-foreground hover:bg-accent rounded-lg transition-colors" title="أرشفة">
                      <Archive className="w-4 h-4"/>
                    </button>)}
                  <button onClick={() => handleDelete(doc)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>))}
        </div>)}

      {/* نافذة التفاصيل */}
      {detailDoc && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-heading">{detailDoc.name}</h2>
              <button onClick={() => setDetailDoc(null)} className="p-1 text-muted-foreground hover:text-heading rounded"><XCircle className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                { label: 'رقم الوثيقة', value: detailDoc.docNumber },
                { label: 'النوع', value: detailDoc.type },
                { label: 'النقابة أو المنظمة', value: detailDoc.entityName },
                { label: 'تاريخ الإصدار', value: detailDoc.issueDate },
                { label: 'تاريخ الإصدار', value: detailDoc.issueDate },
                { label: 'المراجع', value: detailDoc.reviewer },
            ].map(item => (<div key={item.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                  </div>))}
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">الحالة</p>
                <div className="mt-1"><StatusBadge status={detailDoc.status}/></div>
              </div>
              {detailDoc.description && (<div><p className="text-sm font-semibold text-heading mb-1">الوصف</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{detailDoc.description}</p></div>)}
              {detailDoc.reviewer && (<div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">المراجع</p>
                  <p className="text-sm font-semibold text-heading mt-1">{detailDoc.reviewer}</p>
                </div>)}
              {detailDoc.rejectionReason && (<div className="bg-error/5 rounded-lg p-3 border border-error/20">
                  <p className="text-xs text-error font-semibold">سبب الرفض</p>
                  <p className="text-sm text-error mt-1">{detailDoc.rejectionReason}</p>
                </div>)}
            </div>
          </div>
        </div>)}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-heading">{editingDoc ? 'تعديل الوثيقة' : 'إضافة وثيقة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-muted-foreground rounded">
                <XCircle className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">اسم الوثيقة <span className="text-error">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring focus:border-transparent" placeholder="أدخل اسم الوثيقة"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">نوع الوثيقة</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring">
                    {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">تاريخ الوثيقة <span className="text-error">*</span></label>
                  <input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">النقابة أو المنظمة المقدِّم <span className="text-error">*</span></label>
                <input value={form.entityName} onChange={e => setForm(p => ({ ...p, entityName: e.target.value }))} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring" placeholder="اسم النقابة أو المنظمة"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">الوصف</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring resize-none" placeholder="وصف مختصر للوثيقة..."/>
              </div>

              {cfDefs.length > 0 && (<div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">حقول مخصصة</span>
                    <button type="button" onClick={() => setShowCfManager(true)} className="flex items-center gap-1 text-xs px-2 py-1 border border-border rounded-lg hover:bg-accent">
                      <Settings className="w-3.5 h-3.5"/> إدارة الحقول
                    </button>
                  </div>
                  <DynamicFieldRenderer definitions={cfDefs} values={customData} errors={cfErrors} onChange={(k, v) => setCustomData(prev => ({ ...prev, [k]: v }))}/>
                </div>)}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">الملف</label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1"/>
                  <p className="text-sm text-muted-foreground">انقر لاختيار ملف أو اسحبه هنا</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, Word, Excel — حتى 10 MB</p>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx"/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-xl font-semibold hover:bg-accent transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors">
                {editingDoc ? 'حفظ التعديلات' : 'إضافة الوثيقة'}
              </button>
            </div>
          </div>
        </div>)}

      <CustomFieldManager entityType="documents" open={showCfManager} onClose={() => setShowCfManager(false)} onChanged={() => loadCf()}/>

      {/* نافذة الاعتماد / الرفض */}
      {reviewingDoc && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className={`bg-card rounded-2xl shadow-2xl w-full max-w-md border-t-4 ${reviewAction === 'approve' ? 'border-success' : 'border-error'}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-heading">
                {reviewAction === 'approve' ? '✅ اعتماد الوثيقة' : '❌ رفض الوثيقة'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setReviewAction('approve')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${reviewAction === 'approve' ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>اعتماد</button>
                <button onClick={() => setReviewAction('reject')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${reviewAction === 'reject' ? 'bg-error text-white' : 'bg-muted text-muted-foreground'}`}>رفض</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-muted rounded-xl text-sm">
                <p className="font-semibold text-heading">{reviewingDoc.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{reviewingDoc.docNumber} · {reviewingDoc.entityName}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  {reviewAction === 'approve' ? 'ملاحظات الاعتماد (اختياري)' : 'سبب الرفض *'}
                </label>
                <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring resize-none" placeholder={reviewAction === 'approve' ? 'أي ملاحظات على الوثيقة...' : 'اذكر سبب الرفض بوضوح...'}/>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setReviewingDoc(null)} className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-xl font-semibold hover:bg-accent transition-colors">
                إلغاء
              </button>
              <button onClick={handleReviewSubmit} className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-colors ${reviewAction === 'approve' ? 'bg-success hover:bg-success-dark' : 'bg-error hover:bg-error-dark'}`}>
                {reviewAction === 'approve' ? 'تأكيد الاعتماد' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>)}

      {confirmDialog}
    </div>);
}
