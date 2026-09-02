/**
* TrainingRecordsManagement — إدارة سجلات التدريب
* المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
*/
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, RefreshCw, X, ChevronRight, ChevronLeft, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { analyzeTraining } from '../../utils/trainingExpertLogic';
interface TrainingRecord {
    id: string;
    entity_id: string;
    entity_name: string;
    training_name: string;
    training_type: string;
    provider: string;
    start_date: string;
    end_date: string;
    duration_hours: number;
    participants_count: number;
    status: string;
    cost: number;
    location: string;
    trainer_name: string;
    trainer_qualification: string;
    training_materials: string;
    assessment_method: string;
    pass_rate: number;
    certification_issued: boolean;
    notes: string;
}
const STATUS_CONFIG: Record<string, {
    label: string;
    color: string;
}> = {
    in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
    pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};
const TRAINING_TYPES = [
    { value: 'safety', label: 'سلامة وصحة مهنية' },
    { value: 'technical', label: 'فني' },
    { value: 'management', label: 'إدارة' },
    { value: 'leadership', label: 'قيادة' },
    { value: 'compliance', label: 'امتثال قانوني' },
    { value: 'induction', label: 'تأهيل أولي' },
    { value: 'professional', label: 'تطوير مهني' },
    { value: 'other', label: 'أخرى' },
];
const ASSESSMENT_METHODS = [
    { value: 'written', label: 'اختبار كتابي' },
    { value: 'practical', label: 'اختبار عملي' },
    { value: 'oral', label: 'اختبار شفهي' },
    { value: 'project', label: 'مشروع تطبيقي' },
    { value: 'attendance', label: 'حسب الحضور' },
];
const PAGE_SIZE = 10;
const emptyForm = {
    entity_id: '', entity_name: '', training_name: '', training_type: 'safety',
    provider: '', start_date: '', end_date: '', duration_hours: 0, participants_count: 0,
    status: 'pending', cost: 0, location: '', trainer_name: '', trainer_qualification: '',
    training_materials: '', assessment_method: '', pass_rate: 0, certification_issued: false, notes: '',
};
export default function TrainingRecordsManagement() {
    const [records, setRecords] = useState<TrainingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<TrainingRecord | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { confirm, dialog: confirmDialog } = useConfirm();
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter)
                params.set('status', statusFilter);
            const r = await fetch(`/api/training-records?${params}`);
            if (r.ok) {
                const d = await r.json();
                setRecords(d.records || d.data || []);
            }
            else {
                toast.error('فشل تحميل البيانات');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بالخادم');
        }
        setLoading(false);
    }, [statusFilter]);
    useEffect(() => { fetchData(); }, [fetchData]);
    const filtered = useMemo(() => {
        if (!searchQuery)
            return records;
        const q = searchQuery.toLowerCase();
        return records.filter(r => r.entity_name?.toLowerCase().includes(q) || r.training_name?.toLowerCase().includes(q) || r.trainer_name?.toLowerCase().includes(q));
    }, [records, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: records.length,
        inProgress: records.filter(r => r.status === 'in_progress').length,
        completed: records.filter(r => r.status === 'completed').length,
        totalParticipants: records.reduce((sum, r) => sum + (r.participants_count || 0), 0),
    }), [records]);
    const updateForm = (field: string, value: string | number | boolean) => setForm(prev => ({ ...prev, [field]: value }));
    const handleSave = async () => {
        if (!form.entity_name || !form.training_name) {
            toast.error('يرجى تعبئة الحقول المطلوبة');
            return;
        }
        try {
            const method = editItem ? 'PUT' : 'POST';
            const url = editItem ? `/api/training-records/${editItem.id}` : '/api/training-records';
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث السجل' : 'تم إنشاء السجل');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'training_record', details: form });
                setShowForm(false);
                setEditItem(null);
                fetchData();
            }
            else {
                toast.error('حدث خطأ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف سجل التدريب؟', confirmLabel: 'نعم', variant: 'danger' });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/training-records/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم الحذف');
                logAudit({ action: 'delete', resource: 'training_record', details: { id } });
                fetchData();
            }
            else {
                toast.error('فشل الحذف');
            }
        }
        catch {
            toast.error('خطأ');
        }
    };
    const openCreate = () => { setEditItem(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (item: TrainingRecord) => { setEditItem(item); setForm({ ...emptyForm, ...item }); setShowForm(true); };
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="إدارة سجلات التدريب" subtitle="متابعة وإدارة البرامج التدريبية للمنشآت" actions={<PermissionGate permission="training:export"><button onClick={() => { exportReportToExcel({ title: 'سجلات التدريب', reportType: 'statistics', data: records, columns: [{ key: 'program_name', label: 'البرنامج' }, { key: 'enterprise_name', label: 'المنشأة' }, { key: 'trainer_name', label: 'المدرب' }, { key: 'start_date', label: 'التاريخ' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'training_records', details: { count: records.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"><Download size={16}/>تصدير</button></PermissionGate>}/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-heading">{stats.total}</div>
          <div className="text-xs text-muted-foreground">إجمالي السجلات</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-muted-foreground">قيد التنفيذ</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">مكتمل</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.totalParticipants}</div>
          <div className="text-xs text-muted-foreground">إجمالي المشاركين</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input type="text" placeholder="بحث بالاسم أو المدرب..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm bg-card text-heading"/>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <button onClick={fetchData} className="p-2 border border-border rounded-lg hover:bg-accent"><RefreshCw className="w-4 h-4"/></button>
        <PermissionGate permission="training:create">
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
            <Plus className="w-4 h-4"/> سجل جديد
          </button>
        </PermissionGate>
      </div>

      {loading ? (<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/></div>) : filtered.length === 0 ? (<div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">لا توجد سجلات تدريب مسجلة</div>) : (<>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المنشأة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">اسم التدريب</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">النوع</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المدرب</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">التاريخ</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">المشاركون</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">التقييم الخبير</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(rec => (<tr key={rec.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-heading">{rec.entity_name}</td>
                    <td className="px-4 py-3 font-medium text-heading">{rec.training_name}</td>
                    <td className="px-4 py-3 text-xs">{TRAINING_TYPES.find(t => t.value === rec.training_type)?.label || rec.training_type}</td>
                    <td className="px-4 py-3 text-xs">{rec.trainer_name || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{rec.start_date || '—'}{rec.end_date ? ` - ${rec.end_date}` : ''}</td>
                    <td className="px-4 py-3 text-center text-heading">{rec.participants_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[rec.status]?.color || ''}`}>
                        {STATUS_CONFIG[rec.status]?.label || rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const ex = analyzeTraining(rec);
                        return ex.issue ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ex.badge}`} title={ex.drivers.join('؛ ') || ex.recommendedAction}>
                            {ex.issue === 'overshoot_in_progress' ? 'تجاوز الجدول' : ex.issue === 'pending_overdue' ? 'لم يبدأ' : ex.issue === 'certification_missing' ? 'دون شهادات' : ex.issue === 'no_participants' ? 'دون مشاركين' : 'دون نتيجة'}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">سليم</span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <PermissionGate permission="training:edit">
                          <button onClick={() => openEdit(rec)} className="p-1.5 hover:bg-accent rounded" title="تعديل"><Edit2 className="w-4 h-4"/></button>
                        </PermissionGate>
                        <PermissionGate permission="training:delete">
                          <button onClick={() => handleDelete(rec.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive" title="حذف"><Trash2 className="w-4 h-4"/></button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (<div className="flex items-center justify-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent"><ChevronRight className="w-4 h-4"/></button>
              <span className="text-sm text-muted-foreground">صفحة {currentPage} من {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent"><ChevronLeft className="w-4 h-4"/></button>
            </div>)}
        </>)}

      {showForm && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل السجل' : 'سجل تدريب جديد'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">اسم المنشأة *</label>
                  <input value={form.entity_name} onChange={e => updateForm('entity_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">اسم التدريب *</label>
                  <input value={form.training_name} onChange={e => updateForm('training_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">نوع التدريب</label>
                  <select value={form.training_type} onChange={e => updateForm('training_type', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                    {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">الجهة المقدمة</label>
                  <input value={form.provider} onChange={e => updateForm('provider', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">تاريخ البدء</label>
                  <input type="date" value={form.start_date} onChange={e => updateForm('start_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">تاريخ الانتهاء</label>
                  <input type="date" value={form.end_date} onChange={e => updateForm('end_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">المدة (ساعات)</label>
                  <input type="number" value={form.duration_hours} onChange={e => updateForm('duration_hours', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">عدد المشاركين</label>
                  <input type="number" value={form.participants_count} onChange={e => updateForm('participants_count', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">التكلفة</label>
                  <input type="number" value={form.cost} onChange={e => updateForm('cost', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">المكان</label>
                  <input value={form.location} onChange={e => updateForm('location', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">الحالة</label>
                  <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                    {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">اسم المدرب</label>
                  <input value={form.trainer_name} onChange={e => updateForm('trainer_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">مؤهل المدرب</label>
                  <input value={form.trainer_qualification} onChange={e => updateForm('trainer_qualification', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">طريقة التقييم</label>
                  <select value={form.assessment_method} onChange={e => updateForm('assessment_method', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                    <option value="">—</option>
                    {ASSESSMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">نسبة النجاح (%)</label>
                  <input type="number" min={0} max={100} value={form.pass_rate} onChange={e => updateForm('pass_rate', Math.min(100, Math.max(0, Number(e.target.value))))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-heading">المواد التدريبية</label>
                <textarea value={form.training_materials} onChange={e => updateForm('training_materials', e.target.value)} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.certification_issued} onChange={e => updateForm('certification_issued', e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary"/>
                <label className="text-sm font-medium text-heading">صدر شهادة للمشاركين</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-heading">ملاحظات</label>
                <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent">إلغاء</button>
                <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">{editItem ? 'تحديث' : 'إنشاء'}</button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
