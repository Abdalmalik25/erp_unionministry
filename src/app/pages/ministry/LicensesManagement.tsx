/**
* LicensesManagement — إدارة التراخيص
* منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
*/
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, RefreshCw, X, ChevronRight, ChevronLeft, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
interface License {
    id: string;
    license_number: string;
    entity_id: string;
    entity_name: string;
    license_type: string;
    license_name: string;
    issue_date: string;
    expiry_date: string;
    issuing_authority: string;
    status: string;
    renewal_status: string;
    renewal_date: string;
    issuing_decision: string;
    file_url: string;
    notes: string;
}
const STATUS_CONFIG: Record<string, {
    label: string;
    color: string;
}> = {
    valid: { label: 'سارية', color: 'bg-green-100 text-green-700' },
    expired: { label: 'منتهية', color: 'bg-red-100 text-red-700' },
    suspended: { label: 'معلقة', color: 'bg-yellow-100 text-yellow-700' },
    revoked: { label: 'ملغاة', color: 'bg-gray-100 text-gray-600' },
    pending_renewal: { label: 'بانتظار التجديد', color: 'bg-blue-100 text-blue-700' },
};
const LICENSE_TYPES = [
    { value: 'commercial', label: 'تجاري' },
    { value: 'industrial', label: 'صناعي' },
    { value: 'professional', label: 'مهني' },
    { value: 'labor', label: 'عمالة' },
    { value: 'construction', label: 'بناء' },
    { value: 'transport', label: 'نقل' },
    { value: 'other', label: 'أخرى' },
];
const RENEWAL_STATUSES = [
    { value: 'not_required', label: 'غير مطلوب' },
    { value: 'pending', label: 'قيد الطلب' },
    { value: 'approved', label: 'تمت الموافقة' },
    { value: 'rejected', label: 'مرفوض' },
];
const PAGE_SIZE = 10;
const emptyForm = {
    license_number: '', entity_id: '', entity_name: '', license_type: 'commercial',
    license_name: '', issue_date: '', expiry_date: '', issuing_authority: '',
    status: 'valid', renewal_status: 'not_required', renewal_date: '',
    issuing_decision: '', file_url: '', notes: '',
};
export default function LicensesManagement() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<License | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { confirm, dialog: confirmDialog } = useConfirm();
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter)
                params.set('status', statusFilter);
            if (typeFilter)
                params.set('license_type', typeFilter);
            const r = await fetch(`/api/licenses?${params}`);
            if (r.ok) {
                const d = await r.json();
                setLicenses(d.licenses || d.data || []);
            }
            else {
                toast.error('فشل تحميل البيانات');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بالخادم');
        }
        setLoading(false);
    }, [statusFilter, typeFilter]);
    useEffect(() => { fetchData(); }, [fetchData]);
    const filtered = useMemo(() => {
        if (!searchQuery)
            return licenses;
        const q = searchQuery.toLowerCase();
        return licenses.filter(l => l.entity_name?.toLowerCase().includes(q) || l.license_number?.toLowerCase().includes(q) || l.license_name?.toLowerCase().includes(q));
    }, [licenses, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: licenses.length,
        valid: licenses.filter(l => l.status === 'valid').length,
        expired: licenses.filter(l => l.status === 'expired').length,
        pending: licenses.filter(l => l.status === 'pending_renewal' || l.renewal_status === 'pending').length,
    }), [licenses]);
    const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
    const handleSave = async () => {
        if (!form.entity_name || !form.license_number) {
            toast.error('يرجى تعبئة الحقول المطلوبة');
            return;
        }
        try {
            const method = editItem ? 'PUT' : 'POST';
            const url = editItem ? `/api/licenses/${editItem.id}` : '/api/licenses';
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث الترخيص' : 'تم إنشاء الترخيص');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'license', details: form });
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
        const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف هذا الترخيص؟', confirmLabel: 'نعم', variant: 'danger' });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم الحذف');
                logAudit({ action: 'delete', resource: 'license', details: { id } });
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
    const openEdit = (item: License) => { setEditItem(item); setForm({ ...emptyForm, ...item }); setShowForm(true); };
    const isExpired = (date: string) => date && new Date(date) < new Date();
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="إدارة التراخيص" subtitle="متابعة وإدارة تراخيص المنشآت" actions={<button onClick={() => { exportReportToExcel({ title: 'التراخيص', reportType: 'statistics', data: licenses, columns: [{ key: 'license_number', label: 'رقم الترخيص' }, { key: 'enterprise_name', label: 'المنشأة' }, { key: 'license_type', label: 'النوع' }, { key: 'issue_date', label: 'تاريخ الإصدار' }, { key: 'expiry_date', label: 'تاريخ الانتهاء' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'licenses', details: { count: licenses.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"><Download size={16}/>تصدير</button>}/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-heading">{stats.total}</div>
          <div className="text-xs text-muted-foreground">إجمالي التراخيص</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
          <div className="text-xs text-muted-foreground">سارية</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          <div className="text-xs text-muted-foreground">منتهية</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">بانتظار التجديد</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input type="text" placeholder="بحث بالاسم أو رقم الترخيص..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm bg-card text-heading"/>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع الأنواع</option>
          {LICENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={fetchData} className="p-2 border border-border rounded-lg hover:bg-accent"><RefreshCw className="w-4 h-4"/></button>
        <PermissionGate permission="licenses:create">
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
            <Plus className="w-4 h-4"/> ترخيص جديد
          </button>
        </PermissionGate>
      </div>

      {loading ? (<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/></div>) : filtered.length === 0 ? (<div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">لا توجد تراخيص مسجلة</div>) : (<>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">رقم الترخيص</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المنشأة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">النوع</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">تاريخ الانتهاء</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">التجديد</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(lic => (<tr key={lic.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium text-heading">{lic.license_number}</td>
                    <td className="px-4 py-3 text-heading">{lic.entity_name}</td>
                    <td className="px-4 py-3 text-xs">{LICENSE_TYPES.find(t => t.value === lic.license_type)?.label || lic.license_type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[lic.status]?.color || ''}`}>
                        {STATUS_CONFIG[lic.status]?.label || lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={isExpired(lic.expiry_date) && lic.status !== 'expired' ? 'text-red-600 font-medium' : ''}>
                        {lic.expiry_date || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{RENEWAL_STATUSES.find(r => r.value === lic.renewal_status)?.label || lic.renewal_status}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <PermissionGate permission="licenses:edit">
                          <button onClick={() => openEdit(lic)} className="p-1.5 hover:bg-accent rounded" title="تعديل"><Edit2 className="w-4 h-4"/></button>
                        </PermissionGate>
                        <PermissionGate permission="licenses:delete">
                          <button onClick={() => handleDelete(lic.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive" title="حذف"><Trash2 className="w-4 h-4"/></button>
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
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل الترخيص' : 'ترخيص جديد'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">اسم المنشأة *</label>
                  <input value={form.entity_name} onChange={e => updateForm('entity_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">رقم الترخيص *</label>
                  <input value={form.license_number} onChange={e => updateForm('license_number', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card font-mono"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">اسم الترخيص</label>
                  <input value={form.license_name} onChange={e => updateForm('license_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">نوع الترخيص</label>
                  <select value={form.license_type} onChange={e => updateForm('license_type', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                    {LICENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">تاريخ الإصدار</label>
                  <input type="date" value={form.issue_date} onChange={e => updateForm('issue_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">تاريخ الانتهاء</label>
                  <input type="date" value={form.expiry_date} onChange={e => updateForm('expiry_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">الجهة المصدرة</label>
                  <input value={form.issuing_authority} onChange={e => updateForm('issuing_authority', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">حالة الترخيص</label>
                  <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                    {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">حالة التجديد</label>
                  <select value={form.renewal_status} onChange={e => updateForm('renewal_status', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                    {RENEWAL_STATUSES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">تاريخ التجديد</label>
                  <input type="date" value={form.renewal_date} onChange={e => updateForm('renewal_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-heading">قرار الإصدار</label>
                <textarea value={form.issuing_decision} onChange={e => updateForm('issuing_decision', e.target.value)} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
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
