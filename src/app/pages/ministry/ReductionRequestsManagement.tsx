/**
 * ReductionRequestsManagement — إدارة طلبات تخفيض العمالة
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, RefreshCw, CheckCircle, ChevronRight, ChevronLeft, X, Clock, ChevronDown, FileText, AlertTriangle, Loader2, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
type ReductionStatus = 'مسودة' | 'قيد المراجعة' | 'تمت الموافقة النهائية' | 'مرفوض' | 'قيد التنفيذ' | 'مكتمل';
interface ReductionRequest {
    id: string;
    request_number: string;
    enterprise_id: string;
    enterprise_name: string;
    occupation_id?: string;
    occupation_name_ar?: string;
    current_worker_count: number;
    requested_reduction_count: number;
    justification: string;
    status: ReductionStatus;
    submitted_by?: string;
    submitted_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
const STATUS_CONFIG: Record<ReductionStatus, {
    label: string;
    color: string;
    icon: React.ElementType;
}> = {
    'مسودة': { label: 'مسودة', color: 'bg-gray-100 text-gray-700', icon: FileText },
    'قيد المراجعة': { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    'تمت الموافقة النهائية': { label: 'تمت الموافقة', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    'مرفوض': { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: X },
    'قيد التنفيذ': { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700', icon: AlertTriangle },
    'مكتمل': { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
};
const VALID_TRANSITIONS: Record<string, string[]> = {
    'مسودة': ['قيد المراجعة'],
    'قيد المراجعة': ['تمت الموافقة النهائية', 'مرفوض'],
    'تمت الموافقة النهائية': ['قيد التنفيذ'],
    'قيد التنفيذ': ['مكتمل'],
};
const PAGE_SIZE = 10;
export default function ReductionRequestsManagement() {
    const [requests, setRequests] = useState<ReductionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedRequest, setSelectedRequest] = useState<ReductionRequest | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<ReductionRequest | null>(null);
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [form, setForm] = useState({ enterprise_name: '', occupation_name_ar: '', current_worker_count: 0, requested_reduction_count: 0, justification: '', notes: '' });
    const { confirm, dialog: confirmDialog } = useConfirm();
    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter)
                params.set('status', statusFilter);
            const r = await fetch(`/api/reduction-requests?${params}`);
            if (r.ok) {
                const d = await r.json();
                setRequests(d.data || []);
            }
            else {
                toast.error('فشل تحميل الطلبات');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بالخادم');
        }
        setLoading(false);
    }, [statusFilter]);
    useEffect(() => { fetchRequests(); }, [fetchRequests]);
    const filtered = useMemo(() => {
        if (!searchQuery)
            return requests;
        const q = searchQuery.toLowerCase();
        return requests.filter(r => r.request_number?.toLowerCase().includes(q) ||
            r.enterprise_name?.toLowerCase().includes(q) ||
            r.occupation_name_ar?.includes(q) ||
            r.justification?.includes(q));
    }, [requests, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const handleSave = async () => {
        if (!form.enterprise_name.trim()) {
            toast.error('اسم المؤسسة مطلوب');
            return;
        }
        if (!form.justification.trim()) {
            toast.error('المبرر مطلوب');
            return;
        }
        if (form.requested_reduction_count < 1) {
            toast.error('التخفيض المطلوب يجب أن يكون أكبر من صفر');
            return;
        }
        setSaving(true);
        try {
            const method = editItem ? 'PUT' : 'POST';
            const url = editItem ? `/api/reduction-requests/${editItem.id}` : '/api/reduction-requests';
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث الطلب بنجاح' : 'تم إنشاء الطلب بنجاح');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'reduction_request', resourceId: editItem?.id, details: form.enterprise_name });
                setShowForm(false);
                setEditItem(null);
                fetchRequests();
            }
            else {
                const err = await r.json().catch(() => ({ error: 'خطأ غير معروف' }));
                toast.error(err.error || 'حدث خطأ أثناء الحفظ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بالخادم');
        }
        setSaving(false);
    };
    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع.', confirmLabel: 'نعم، حذف', variant: 'danger' });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/reduction-requests/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم الحذف بنجاح');
                logAudit({ action: 'delete', resource: 'reduction_request', resourceId: id, details: 'reduction request' });
                fetchRequests();
            }
            else {
                toast.error('فشل الحذف');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const r = await fetch(`/api/reduction-requests/${id}/status`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
            });
            if (r.ok) {
                toast.success('تم تحديث الحالة بنجاح');
                logAudit({ action: 'update', resource: 'reduction_request', resourceId: id, details: `status → ${newStatus}` });
                fetchRequests();
            }
            else {
                toast.error('فشل تحديث الحالة');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="طلبات تخفيض العمالة" subtitle="إدارة طلبات تخفيض عدد العمال في المنشآت" actions={<button onClick={() => { setEditItem(null); setForm({ enterprise_name: '', occupation_name_ar: '', current_worker_count: 0, requested_reduction_count: 0, justification: '', notes: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 font-medium">
            <Plus className="w-4 h-4"/> طلب جديد
          </button>}/>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input type="text" placeholder="بحث في الطلبات..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/25"/>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/25">
          <option value="">جميع الحالات</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s as ReductionStatus].label}</option>)}
        </select>
        <button onClick={fetchRequests} className="p-2 border border-border rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors"><RefreshCw className="w-4 h-4"/></button>
      </div>

      {loading ? (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin"/>
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>) : filtered.length === 0 ? (<EmptyState title="لا توجد طلبات" description="لم يتم العثور على طلبات تخفيض عمالة"/>) : (<div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">#</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">رقم الطلب</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المؤسسة</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المسمى الوظيفي</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">العمال</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">التخفيض</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الحالة</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((req, idx) => {
                const transitions = VALID_TRANSITIONS[req.status] || [];
                return (<tr key={req.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-heading text-xs">{req.request_number}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{req.enterprise_name}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{req.occupation_name_ar || '-'}</td>
                    <td className="px-4 py-3 text-center text-foreground text-xs">{req.current_worker_count}</td>
                    <td className="px-4 py-3 text-center font-semibold text-error text-xs">{req.requested_reduction_count}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[req.status]?.color || 'bg-gray-100'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedRequest(req); setShowDetail(true); }} className="p-1.5 text-primary-bright hover:bg-info/10 rounded-lg transition-colors" title="عرض"><Eye className="w-4 h-4"/></button>
                        <button onClick={() => { setEditItem(req); setForm({ enterprise_name: req.enterprise_name, occupation_name_ar: req.occupation_name_ar || '', current_worker_count: req.current_worker_count, requested_reduction_count: req.requested_reduction_count, justification: req.justification, notes: req.notes || '' }); setShowForm(true); }} className="p-1.5 text-success-dark hover:bg-success/10 rounded-lg transition-colors" title="تعديل"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(req.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف"><Trash2 className="w-4 h-4"/></button>
                        {transitions.length > 0 && (<div className="relative group">
                            <button className="p-1.5 text-primary-bright hover:bg-info/10 rounded-lg transition-colors"><ChevronDown className="w-4 h-4"/></button>
                            <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10 hidden group-hover:block min-w-[160px]">
                              {transitions.map(t => (<button key={t} onClick={() => handleStatusChange(req.id, t)} className="block w-full text-right px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors">{t}</button>))}
                            </div>
                          </div>)}
                      </div>
                    </td>
                  </tr>);
            })}
            </tbody>
          </table>
        </div>)}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (<div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} طلب
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-card border border-border disabled:opacity-40 text-muted-foreground"><ChevronRight className="w-4 h-4"/></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setCurrentPage(p)} className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors border ${p === currentPage ? 'bg-primary text-white border-primary' : 'bg-card hover:bg-accent/50 text-muted-foreground border-border'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-card border border-border disabled:opacity-40 text-muted-foreground"><ChevronLeft className="w-4 h-4"/></button>
          </div>
        </div>)}

      {/* Detail Modal */}
      {showDetail && selectedRequest && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
          <div className="bg-card rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">تفاصيل الطلب</h3>
              <button onClick={() => setShowDetail(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">رقم الطلب:</span><span className="font-medium text-heading">{selectedRequest.request_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">المؤسسة:</span><span className="text-foreground">{selectedRequest.enterprise_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">المسمى الوظيفي:</span><span className="text-foreground">{selectedRequest.occupation_name_ar || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">العمال الحاليون:</span><span className="text-foreground">{selectedRequest.current_worker_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">التخفيض المطلوب:</span><span className="text-error font-bold">{selectedRequest.requested_reduction_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الحالة:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedRequest.status]?.color}`}>{selectedRequest.status}</span>
              </div>
              <div><span className="text-muted-foreground">المبرر:</span><p className="mt-1 text-foreground">{selectedRequest.justification}</p></div>
              {selectedRequest.rejection_reason && <div><span className="text-muted-foreground">سبب الرفض:</span><p className="mt-1 text-error">{selectedRequest.rejection_reason}</p></div>}
              {selectedRequest.notes && <div><span className="text-muted-foreground">ملاحظات:</span><p className="mt-1 text-foreground">{selectedRequest.notes}</p></div>}
            </div>
          </div>
        </div>)}

      {/* Form Modal */}
      {showForm && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل الطلب' : 'طلب جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">المؤسسة <span className="text-error">*</span></label>
                <input value={form.enterprise_name} onChange={e => setForm({ ...form, enterprise_name: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring" placeholder="اسم المؤسسة"/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">المسمى الوظيفي</label>
                <input value={form.occupation_name_ar} onChange={e => setForm({ ...form, occupation_name_ar: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring" placeholder="المسمى الوظيفي (اختياري)"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">العمال الحاليون</label>
                  <input type="number" value={form.current_worker_count} onChange={e => setForm({ ...form, current_worker_count: parseInt(e.target.value) || 0 })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring" min={0}/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">التخفيض المطلوب <span className="text-error">*</span></label>
                  <input type="number" value={form.requested_reduction_count} onChange={e => setForm({ ...form, requested_reduction_count: parseInt(e.target.value) || 0 })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring" min={1}/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">المبرر <span className="text-error">*</span></label>
                <textarea value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring resize-none" placeholder="مبرر التخفيض..."/>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring resize-none" placeholder="ملاحظات إضافية..."/>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent/50 text-muted-foreground transition-colors">إلغاء</button>
                <button onClick={handleSave} disabled={saving || !form.enterprise_name || !form.justification} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 font-medium flex items-center gap-2 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                  {editItem ? 'تحديث' : 'إنشاء'}
                </button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
