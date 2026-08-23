/**
 * FeePaymentsManagement — إدارة سجلات الدفع والرسوم
 * منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Eye, Edit2, Trash2, Plus, RefreshCw, DollarSign, X,
  CheckCircle, Clock, CreditCard, Banknote, FileText, Download,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface FeePayment {
  id: string;
  entity_id?: string;
  member_id?: string;
  service_id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  receipt_number?: string;
  payment_date: string;
  status: string;
  description?: string;
  notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: 'فشل', color: 'bg-red-100 text-red-700', icon: X },
  refunded: { label: 'مسترد', color: 'bg-purple-100 text-purple-700', icon: DollarSign },
};

const METHOD_CONFIG: Record<string, { label: string; icon: any }> = {
  cash: { label: 'نقدي', icon: Banknote },
  bank_transfer: { label: 'تحويل بنكي', icon: CreditCard },
  check: { label: 'شيك', icon: FileText },
  card: { label: 'بطاقة', icon: CreditCard },
  online: { label: 'إلكتروني', icon: CreditCard },
};

export default function FeePaymentsManagement() {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<FeePayment | null>(null);
  const [form, setForm] = useState({ entity_id: '', amount: 0, currency: 'YER', payment_method: 'cash', receipt_number: '', payment_date: new Date().toISOString().slice(0, 10), status: 'pending', description: '', notes: '' });
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/fee-payments?${params}`);
      if (r.ok) { const d = await r.json(); setPayments(d.payments || []); }
    } catch { /* empty */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = useMemo(() => {
    if (!searchQuery) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(p =>
      p.receipt_number?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  const stats = useMemo(() => ({
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    totalAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  }), [payments]);

  const handleSave = async () => {
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem ? `/api/fee-payments/${editItem.id}` : '/api/fee-payments';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      if (r.ok) {
        toast.success(editItem ? 'تم تحديث السجل' : 'تم إنشاء السجل');
        logAudit({ action: editItem ? 'update' : 'create', resource: 'fee_payment', details: form });
        setShowForm(false); setEditItem(null); fetchPayments();
      } else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف سجل الدفع؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try {
      const r = await fetch(`/api/fee-payments/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'fee_payment', details: { id } }); fetchPayments(); }
    } catch { toast.error('خطأ'); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="سجلات الدفع والرسوم" subtitle="إدارة مدفوعات الرسوم والخدمات"
        actions={<button onClick={() => { exportReportToExcel({ title: 'سجلات الدفع', reportType: 'statistics', data: payments, columns: [{ key: 'receipt_number', label: 'رقم الإيصال' }, { key: 'amount', label: 'المبلغ' }, { key: 'currency', label: 'العملة' }, { key: 'payment_method', label: 'الطريقة' }, { key: 'payment_date', label: 'التاريخ' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'fee_payments', details: { count: payments.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"><Download size={16} />تصدير</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500">إجمالي السجلات</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-gray-500">مكتمل</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-500">معلق</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-500">إجمالي المحصل (ر.ي)</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="بحث بالرقم أو الوصف..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={fetchPayments} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={() => { setEditItem(null); setForm({ entity_id: '', amount: 0, currency: 'YER', payment_method: 'cash', receipt_number: '', payment_date: new Date().toISOString().slice(0, 10), status: 'pending', description: '', notes: '' }); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> سجل جديد
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="لا توجد سجلات" description="لم يتم العثور على سجلات دفع" />
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الإيصال</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">طريقة الدفع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الوصف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                const mc = METHOD_CONFIG[p.payment_method] || METHOD_CONFIG.cash;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.receipt_number || '-'}</td>
                    <td className="px-4 py-3 font-bold">{Number(p.amount).toLocaleString()} {p.currency}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1 text-xs"><mc.icon className="w-3.5 h-3.5" />{mc.label}</span></td>
                    <td className="px-4 py-3 text-xs">{p.payment_date}</td>
                    <td className="px-4 py-3 text-xs line-clamp-1">{p.description || '-'}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedPayment(p)} className="p-1.5 hover:bg-gray-100 rounded" title="عرض"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => { setEditItem(p); setForm({ entity_id: p.entity_id || '', amount: p.amount, currency: p.currency, payment_method: p.payment_method, receipt_number: p.receipt_number || '', payment_date: p.payment_date, status: p.status, description: p.description || '', notes: p.notes || '' }); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تفاصيل الدفع</h3>
              <button onClick={() => setSelectedPayment(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">رقم الإيصال:</span><span className="font-mono">{selectedPayment.receipt_number || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المبلغ:</span><span className="font-bold text-lg">{Number(selectedPayment.amount).toLocaleString()} {selectedPayment.currency}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">طريقة الدفع:</span><span>{METHOD_CONFIG[selectedPayment.payment_method]?.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">التاريخ:</span><span>{selectedPayment.payment_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[selectedPayment.status]?.color}`}>{STATUS_CONFIG[selectedPayment.status]?.label}</span></div>
              {selectedPayment.description && <div><span className="text-gray-500">الوصف:</span><p className="mt-1">{selectedPayment.description}</p></div>}
              {selectedPayment.notes && <div><span className="text-gray-500">ملاحظات:</span><p className="mt-1">{selectedPayment.notes}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editItem ? 'تعديل الدفع' : 'دفع جديد'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">المبلغ *</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">العملة</label><select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="YER">ريال يمني</option><option value="USD">دولار</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">طريقة الدفع</label><select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{Object.entries(METHOD_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">الحالة</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">رقم الإيصال</label><input value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">التاريخ</label><input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">الوصف</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">إلغاء</button>
                <button onClick={handleSave} disabled={!form.amount} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{editItem ? 'تحديث' : 'إنشاء'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
