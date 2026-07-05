/**
 * DocumentsManagement — إدارة الوثائق والمستندات
 * دورة مستندية كاملة: مسودة → مراجعة → اعتماد/رفض
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  FileText, Upload, CheckCircle, XCircle, Clock, Send,
  Search, Plus, Eye, Edit2, Trash2, Download, Archive,
  AlertCircle, RefreshCw, FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

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
  { key: 'all',         label: 'الكل',            icon: FolderOpen },
  { key: 'draft',       label: 'مسودات',           icon: FileText },
  { key: 'submitted',   label: 'مقدّمة',           icon: Send },
  { key: 'under_review',label: 'قيد المراجعة',     icon: Clock },
  { key: 'approved',    label: 'معتمدة',            icon: CheckCircle },
  { key: 'rejected',    label: 'مرفوضة',           icon: XCircle },
];

// ============================================================
// المكوّن
// ============================================================

export function DocumentsManagement() {
  const [docs, setDocs] = useState<Document[]>(INITIAL_DOCS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<Document | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [form, setForm] = useState({ name: '', type: 'محضر اجتماع', entityName: '', issueDate: '', description: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

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
    if (statusFilter !== 'all') result = result.filter(d => d.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.docNumber.toLowerCase().includes(q) ||
        d.entityName.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [docs, statusFilter, searchQuery]);

  // فتح نموذج الإضافة/التعديل
  const openModal = useCallback((doc?: Document) => {
    if (doc) {
      setEditingDoc(doc);
      setForm({ name: doc.name, type: doc.type, entityName: doc.entityName, issueDate: doc.issueDate, description: doc.description || '' });
    } else {
      setEditingDoc(null);
      setForm({ name: '', type: 'محضر اجتماع', entityName: '', issueDate: new Date().toISOString().slice(0, 10), description: '' });
    }
    setShowModal(true);
  }, []);

  // حفظ الوثيقة
  const handleSave = useCallback(() => {
    if (!form.name.trim() || !form.entityName.trim() || !form.issueDate) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (editingDoc) {
      setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, ...form } : d));
      logAudit({ action: 'update', resource: 'document', resourceId: editingDoc.id });
      toast.success('تم تحديث الوثيقة بنجاح');
    } else {
      const newDoc: Document = {
        id: Date.now().toString(),
        docNumber: `DOC-2026-${String(docs.length + 1).padStart(3, '0')}`,
        ...form,
        status: 'draft',
        fileSize: '—',
      };
      setDocs(prev => [...prev, newDoc]);
      logAudit({ action: 'create', resource: 'document', resourceId: newDoc.id });
      toast.success('تمت إضافة الوثيقة بنجاح');
    }
    setShowModal(false);
  }, [form, editingDoc, docs.length]);

  // إرسال للمراجعة
  const handleSubmitForReview = useCallback((doc: Document) => {
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'submitted' } : d));
    logAudit({ action: 'update', resource: 'document', resourceId: doc.id, details: { action: 'submit_for_review' } });
    toast.success('تم إرسال الوثيقة للمراجعة');
  }, []);

  // اعتماد أو رفض
  const handleReviewSubmit = useCallback(() => {
    if (!reviewingDoc) return;
    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }
    const updatedStatus = reviewAction === 'approve' ? 'approved' : 'rejected';
    setDocs(prev => prev.map(d => d.id === reviewingDoc.id ? {
      ...d,
      status: updatedStatus,
      reviewer: 'المراجع الحالي',
      approvalDate: reviewAction === 'approve' ? new Date().toISOString().slice(0, 10) : undefined,
      rejectionReason: reviewAction === 'reject' ? reviewNotes : undefined,
    } : d));
    logAudit({ action: 'update', resource: 'document', resourceId: reviewingDoc.id, details: { reviewAction } });
    toast.success(reviewAction === 'approve' ? 'تمت الموافقة على الوثيقة' : 'تم رفض الوثيقة مع ذكر السبب');
    setReviewingDoc(null);
    setReviewNotes('');
  }, [reviewingDoc, reviewAction, reviewNotes]);

  // حذف
  const handleDelete = useCallback(async (doc: Document) => {
    const confirmed = await confirm({
      title: 'حذف الوثيقة',
      message: `هل أنت متأكد من حذف "${doc.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف الوثيقة',
      variant: 'danger',
    });
    if (!confirmed) return;
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    logAudit({ action: 'delete', resource: 'document', resourceId: doc.id });
    toast.success('تم حذف الوثيقة');
  }, [confirm]);

  // أرشفة
  const handleArchive = useCallback(async (doc: Document) => {
    const confirmed = await confirm({
      title: 'أرشفة الوثيقة',
      message: `سيتم أرشفة "${doc.name}" ولن تظهر في القوائم الرئيسية.`,
      confirmLabel: 'أرشفة',
      variant: 'warning',
    });
    if (!confirmed) return;
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'archived' } : d));
    toast.success('تمت أرشفة الوثيقة');
  }, [confirm]);

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s === 'rejected') return <XCircle className="w-4 h-4 text-red-600" />;
    if (s === 'under_review' || s === 'submitted') return <Clock className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="إدارة الوثائق"
        subtitle="مستودع مركزي للوثائق مع دورة مستندية كاملة"
        breadcrumbs={[{ label: 'الوزارة' }, { label: 'الوثائق' }]}
        actions={
          <>
            <button onClick={() => exportReportToExcel({ title: 'تقرير الوثائق', reportType: 'members_list', data: docs, columns: [{ key: 'docNumber', label: 'رقم الوثيقة' }, { key: 'name', label: 'الاسم' }, { key: 'type', label: 'النوع' }, { key: 'entityName', label: 'الكيان' }, { key: 'status', label: 'الحالة' }] })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> تصدير
            </button>
            <button onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> إضافة وثيقة
            </button>
          </>
        }
      />

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
          { label: 'معتمدة', value: stats.approved, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'قيد المراجعة', value: stats.under_review, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'مسودات', value: stats.draft, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
          { label: 'مرفوضة', value: stats.rejected, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="بحث بالاسم أو الرقم أو النوع..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_TABS.map(t => (
              <button key={t.key} onClick={() => setStatusFilter(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === t.key ? 'bg-[#1E3A8A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* قائمة الوثائق */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">لا توجد وثائق مطابقة للبحث</p>
          <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="mt-3 text-sm text-[#1E3A8A] hover:underline">مسح الفلاتر</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  {statusIcon(doc.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">{doc.name}</h3>
                    <StatusBadge status={doc.status} />
                    {doc.tags?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                    <span>رقم: <strong className="text-gray-700 font-mono">{doc.docNumber}</strong></span>
                    <span>النوع: <strong className="text-gray-700">{doc.type}</strong></span>
                    <span>الكيان: <strong className="text-gray-700">{doc.entityName}</strong></span>
                    <span>التاريخ: <strong className="text-gray-700">{doc.issueDate}</strong></span>
                    {doc.fileSize && <span>الحجم: <strong className="text-gray-700">{doc.fileSize}</strong></span>}
                  </div>

                  {/* معلومات إضافية حسب الحالة */}
                  {doc.status === 'approved' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 w-fit">
                      <CheckCircle className="w-3.5 h-3.5" />
                      معتمد من: <strong>{doc.reviewer}</strong> في {doc.approvalDate}
                    </div>
                  )}
                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>سبب الرفض: {doc.rejectionReason}</span>
                    </div>
                  )}
                  {doc.status === 'under_review' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 w-fit">
                      <Clock className="w-3.5 h-3.5" />
                      تحت مراجعة: <strong>{doc.reviewer}</strong>
                    </div>
                  )}
                </div>

                {/* الأزرار */}
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض">
                    <Eye className="w-4 h-4" />
                  </button>
                  {(doc.status === 'draft' || doc.status === 'rejected') && (
                    <button onClick={() => openModal(doc)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="تعديل">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {doc.status === 'draft' && (
                    <button onClick={() => handleSubmitForReview(doc)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors">
                      <Send className="w-3.5 h-3.5" /> إرسال
                    </button>
                  )}
                  {(doc.status === 'submitted' || doc.status === 'under_review') && (
                    <>
                      <button onClick={() => { setReviewingDoc(doc); setReviewAction('approve'); setReviewNotes(''); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> اعتماد
                      </button>
                      <button onClick={() => { setReviewingDoc(doc); setReviewAction('reject'); setReviewNotes(''); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> رفض
                      </button>
                    </>
                  )}
                  {doc.status === 'approved' && (
                    <button onClick={() => handleArchive(doc)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="أرشفة">
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(doc)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">{editingDoc ? 'تعديل الوثيقة' : 'إضافة وثيقة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم الوثيقة <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
                  placeholder="أدخل اسم الوثيقة" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع الوثيقة</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A]">
                    {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">تاريخ الوثيقة <span className="text-red-500">*</span></label>
                  <input type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الكيان المقدِّم <span className="text-red-500">*</span></label>
                <input value={form.entityName} onChange={e => setForm(p => ({ ...p, entityName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A]"
                  placeholder="اسم النقابة أو المنظمة" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A] resize-none"
                  placeholder="وصف مختصر للوثيقة..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">الملف</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#1E3A8A] transition-colors"
                  onClick={() => fileRef.current?.click()}>
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-sm text-gray-500">انقر لاختيار ملف أو اسحبه هنا</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, Word, Excel — حتى 10 MB</p>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-[#1E3A8A] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors">
                {editingDoc ? 'حفظ التعديلات' : 'إضافة الوثيقة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الاعتماد / الرفض */}
      {reviewingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md border-t-4 ${reviewAction === 'approve' ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">
                {reviewAction === 'approve' ? '✅ اعتماد الوثيقة' : '❌ رفض الوثيقة'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setReviewAction('approve')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${reviewAction === 'approve' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>اعتماد</button>
                <button onClick={() => setReviewAction('reject')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${reviewAction === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>رفض</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl text-sm">
                <p className="font-semibold text-gray-800">{reviewingDoc.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{reviewingDoc.docNumber} · {reviewingDoc.entityName}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {reviewAction === 'approve' ? 'ملاحظات الاعتماد (اختياري)' : 'سبب الرفض *'}
                </label>
                <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1E3A8A] resize-none"
                  placeholder={reviewAction === 'approve' ? 'أي ملاحظات على الوثيقة...' : 'اذكر سبب الرفض بوضوح...'} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setReviewingDoc(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
              <button onClick={handleReviewSubmit}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-colors ${reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {reviewAction === 'approve' ? 'تأكيد الاعتماد' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
