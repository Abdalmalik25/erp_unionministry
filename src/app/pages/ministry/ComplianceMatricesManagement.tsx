/**
 * ComplianceMatricesManagement — إدارة مصفوفات الامتثال
 * DB: compliance_matrices (enterprise_id, occupation_id, occupation_type, article_number, article_title, compliance_status, notes, checked_at, checked_by)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, Eye, Edit2, Trash2, RefreshCw, X, Download, Shield,
  CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface ComplianceMatrix {
  id: string;
  enterprise_id: string;
  enterprise_name?: string;
  occupation_id: string;
  occupation_type: string;
  article_number: string;
  article_title: string;
  compliance_status: string;
  notes: string;
  checked_at: string;
  checked_by: string;
  created_at: string;
}

interface Entity {
  entity_id: string;
  name_ar: string;
}

const COMPLIANCE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: 'ملتزم', color: 'text-success', bg: 'bg-success/15' },
  non_compliant: { label: 'غير ملتزم', color: 'text-error', bg: 'bg-error/15' },
  under_review: { label: 'قيد المراجعة', color: 'text-warning', bg: 'bg-warning/15' },
  partially_compliant: { label: 'ملتزم جزئياً', color: 'text-info', bg: 'bg-info/15' },
};

export function ComplianceMatricesManagement() {
  const [matrices, setMatrices] = useState<ComplianceMatrix[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ComplianceMatrix | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ComplianceMatrix | null>(null);
  const [form, setForm] = useState<Partial<ComplianceMatrix>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rMat, rEnt] = await Promise.all([fetch('/api/compliance-matrices'), fetch('/api/entities')]);
      if (rMat.ok) { const d = await rMat.json(); setMatrices(d.data || []); }
      if (rEnt.ok) { const d = await rEnt.json(); setEntities(d.data || d || []); }
      logAudit({ action: 'view', resource: 'compliance_matrices' });
    } catch { toast.error('خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.enterprise_id) { toast.error('المنشأة مطلوبة'); return; }
    try {
      const endpoint = editItem ? `/api/compliance-matrices/${editItem.id}` : '/api/compliance-matrices';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowForm(false); setEditItem(null); fetchData(); }
      else { const e = await r.json(); toast.error(e.error || 'خطأ'); }
    } catch { toast.error('خطأ'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try { const r = await fetch(`/api/compliance-matrices/${id}`, { method: 'DELETE' }); if (r.ok) { toast.success('تم الحذف'); fetchData(); } else { toast.error('خطأ'); } } catch { toast.error('خطأ'); }
  };

  const openAdd = () => { setEditItem(null); setForm({}); setShowForm(true); };
  const openEdit = (item: ComplianceMatrix) => { setEditItem(item); setForm(item); setShowForm(true); };

  const filtered = useMemo(() => matrices.filter(m => {
    const matchSearch = !searchQuery || m.enterprise_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.article_number?.includes(searchQuery) || m.article_title?.toLowerCase().includes(searchQuery.toLowerCase()) || m.checked_by?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || m.compliance_status === filterStatus;
    return matchSearch && matchStatus;
  }), [matrices, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total: matrices.length,
    compliant: matrices.filter(m => m.compliance_status === 'compliant').length,
    nonCompliant: matrices.filter(m => m.compliance_status === 'non_compliant').length,
    underReview: matrices.filter(m => m.compliance_status === 'under_review').length,
  }), [matrices]);

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="مصفوفات الامتثال" subtitle="تتبع الامتثال للمواد القانونية للمنشآت"
        breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'مصفوفات الامتثال' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { exportReportToExcel({ title: 'مصفوفات الامتثال', reportType: 'statistics', data: filtered, columns: [{ key: 'enterprise_name', label: 'المنشأة' }, { key: 'article_number', label: 'المادة' }, { key: 'compliance_status', label: 'الحالة' }, { key: 'checked_by', label: 'الفاحص' }] }); toast.success('تم التصدير'); }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground"><Download className="w-4 h-4" />تصدير</button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"><Plus className="w-4 h-4" />إضافة</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي', value: stats.total, color: 'text-heading', icon: Shield },
          { label: 'ملتزم', value: stats.compliant, color: 'text-success', icon: CheckCircle },
          { label: 'غير ملتزم', value: stats.nonCompliant, color: 'text-error', icon: AlertTriangle },
          { label: 'قيد المراجعة', value: stats.underReview, color: 'text-warning', icon: Clock },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالمنشأة أو المادة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-border rounded-lg text-sm">
            <option value="all">جميع الحالات</option>
            <option value="compliant">ملتزم</option><option value="non_compliant">غير ملتزم</option><option value="under_review">قيد المراجعة</option><option value="partially_compliant">ملتزم جزئياً</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد بيانات" icon={<Shield className="w-14 h-14" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المنشأة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">رقم المادة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">عنوان المادة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">نوع النشاط</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">حالة الامتثال</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">الفاحص</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(m => {
                  const cs = COMPLIANCE_MAP[m.compliance_status] || COMPLIANCE_MAP.under_review;
                  return (
                    <tr key={m.id} className="hover:bg-accent transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-heading">{m.enterprise_name || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-heading">{m.article_number || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{m.article_title || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{m.occupation_type || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cs.bg} ${cs.color}`}>{cs.label}</span></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{m.checked_by || '—'}</td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => setSelectedItem(m)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                        <button onClick={() => openEdit(m)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">تفاصيل الامتثال</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'المنشأة', value: selectedItem.enterprise_name },
                { label: 'رقم المادة', value: selectedItem.article_number },
                { label: 'عنوان المادة', value: selectedItem.article_title },
                { label: 'نوع النشاط', value: selectedItem.occupation_type },
                { label: 'حالة الامتثال', value: COMPLIANCE_MAP[selectedItem.compliance_status]?.label },
                { label: 'الفاحص', value: selectedItem.checked_by },
                { label: 'تاريخ الفحص', value: selectedItem.checked_at },
                { label: 'ملاحظات', value: selectedItem.notes },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل' : 'إضافة'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">المنشأة *</label>
                <select value={form.enterprise_id || ''} onChange={e => setForm({ ...form, enterprise_id: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                  <option value="">اختر المنشأة</option>
                  {entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.name_ar}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">رقم المادة</label><input value={form.article_number || ''} onChange={e => setForm({ ...form, article_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">عنوان المادة</label><input value={form.article_title || ''} onChange={e => setForm({ ...form, article_title: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">نوع النشاط</label><input value={form.occupation_type || ''} onChange={e => setForm({ ...form, occupation_type: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">حالة الامتثال</label>
                  <select value={form.compliance_status || ''} onChange={e => setForm({ ...form, compliance_status: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                    <option value="">اختر</option><option value="compliant">ملتزم</option><option value="non_compliant">غير ملتزم</option><option value="under_review">قيد المراجعة</option><option value="partially_compliant">ملتزم جزئياً</option>
                  </select></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">الفاحص</label><input value={form.checked_by || ''} onChange={e => setForm({ ...form, checked_by: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div><label className="block text-sm font-semibold mb-1">تاريخ الفحص</label><input type="date" value={form.checked_at || ''} onChange={e => setForm({ ...form, checked_at: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div><label className="block text-sm font-semibold mb-1">ملاحظات</label><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">إلغاء</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90">{editItem ? 'تحديث' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
