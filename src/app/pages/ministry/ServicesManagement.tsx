import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, RefreshCw, Download, Eye, Trash2 } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { FilterBar } from '../../components/ui/FilterBar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { toast } from 'sonner';
import { logAudit } from '../../utils/security';
import { fetchList } from '../../utils/api';
import { PermissionGate } from '../../hooks/usePermissions';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface ServiceRequest {
  id: string;
  request_number: string;
  service_name: string;
  service_code: string;
  entity_name: string;
  unified_code: string;
  status: string;
  submission_date: string;
  expected_date?: string;
  completion_date?: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
}

interface Service {
  id: string;
  service_code: string;
  service_name: string;
  category?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلق', in_progress: 'قيد الإنجاز', processing: 'قيد الإنجاز',
  completed: 'منجز', rejected: 'مرفوض', cancelled: 'ملغي', approved: 'موافق',
};

export function ServicesManagement() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [requests_, services_] = await Promise.all([
        fetchList<ServiceRequest>('/api/service-requests'),
        fetchList<Service>('/api/services'),
      ]);
      setRequests(requests_);
      setServices(services_);
      logAudit({ action: 'view', resource: 'service_requests' });
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = requests.filter(r => {
    const matchStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q || r.request_number?.toLowerCase().includes(q) || r.service_name?.toLowerCase().includes(q) || r.entity_name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    completed: requests.filter(r => r.status === 'completed').length,
    processing: requests.filter(r => r.status === 'in_progress' || r.status === 'processing').length,
    pending: requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const statusTabs = [
    { key: 'all', label: 'الكل' },
    { key: 'pending', label: 'معلقة' },
    { key: 'in_progress', label: 'قيد الإنجاز' },
    { key: 'completed', label: 'منجزة' },
    { key: 'rejected', label: 'مرفوضة' },
  ];

  const [detailReq, setDetailReq] = useState<ServiceRequest | null>(null);
  const [newReq, setNewReq] = useState({ service_id: '', entity_id: '', request_number: '', notes: '' });

  const handleCreate = async () => {
    if (!newReq.service_id || !newReq.entity_id) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    try {
      const r = await fetch('/api/service-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReq, status: 'pending', submission_date: new Date().toISOString().split('T')[0] }),
      });
      if (r.ok) { toast.success('تم إنشاء الطلب بنجاح'); logAudit({ action: 'create', resource: 'service_request' }); setShowAddModal(false); fetchData(); setNewReq({ service_id: '', entity_id: '', request_number: '', notes: '' }); }
      else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const r = await fetch(`/api/service-requests/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'service_request', details: { id } }); fetchData(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleExport = () => {
    exportReportToExcel({
      title: 'إدارة الخدمات والطلبات', reportType: 'statistics', data: filtered,
      columns: [
        { key: 'request_number', label: 'رقم الطلب' }, { key: 'service_name', label: 'الخدمة' },
        { key: 'entity_name', label: 'النقابة أو منظمة' }, { key: 'submission_date', label: 'التاريخ' },
        { key: 'status', label: 'الحالة' },
      ],
    });
    logAudit({ action: 'export', resource: 'service_requests', details: { count: filtered.length } });
    toast.success('تم التصدير بنجاح');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة الخدمات والطلبات" subtitle={`متابعة وإدارة طلبات الخدمات (${services.length} خدمة)`}
        actions={<><Button variant="outline" onClick={handleExport} icon={<Download size={18} />}>تصدير</Button>
        <Button variant="outline" onClick={() => setShowServicesModal(true)} icon={<Briefcase size={18} />}>قائمة الخدمات</Button>
        <PermissionGate permission="services:request">
          <Button onClick={() => setShowAddModal(true)} icon={<Plus size={18} />}>طلب جديد</Button>
        </PermissionGate></>} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[{ l: 'إجمالي الطلبات', v: stats.total, c: 'text-heading' }, { l: 'منجزة', v: stats.completed, c: 'text-success' }, { l: 'قيد الإنجاز', v: stats.processing, c: 'text-primary' }, { l: 'معلقة', v: stats.pending, c: 'text-warning' }, { l: 'مرفوضة', v: stats.rejected, c: 'text-error' }].map(s => (
          <div key={s.l} className="bg-card rounded-xl shadow-sm p-4 border border-border">
            <p className="text-sm text-muted-foreground">{s.l}</p>
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map(tab => (
            <button key={tab.key} onClick={() => setSelectedStatus(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedStatus === tab.key ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-accent'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <FilterBar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="البحث برقم الطلب أو الخدمة أو النقابة أو منظمة..." />

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">رقم الطلب</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الخدمة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">النقابة أو منظمة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">التاريخ</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الحالة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="لا توجد طلبات" description="لا توجد طلبات مطابقة" icon={<Briefcase className="w-14 h-14" />} /></td></tr>
              ) : filtered.map(req => (
                <tr key={req.id} className="hover:bg-accent transition-colors">
                  <td className="px-6 py-4 text-sm text-heading font-mono">{req.request_number}</td>
                  <td className="px-6 py-4 text-sm text-heading font-semibold">{req.service_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{req.entity_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{req.submission_date}</td>
                  <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailReq(req)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg" title="عرض"><Eye size={16} /></button>
                      <button onClick={() => handleDelete(req.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg" title="حذف"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="طلب خدمة جديد" size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">الخدمة</label>
              <select value={newReq.service_id} onChange={e => setNewReq({ ...newReq, service_id: e.target.value })}
                className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                <option value="">اختر الخدمة</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.service_name} ({s.service_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">رقم الطلب</label>
              <Input value={newReq.request_number} onChange={e => setNewReq({ ...newReq, request_number: e.target.value })} placeholder="اختياري - يتم التوليد تلقائياً" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">ملاحظات</label>
              <textarea value={newReq.notes} onChange={e => setNewReq({ ...newReq, notes: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
              <Button onClick={handleCreate}>إنشاء الطلب</Button>
            </div>
          </div>
        </Modal>
      )}

      {detailReq && (
        <Modal isOpen={!!detailReq} onClose={() => setDetailReq(null)} title={detailReq.service_name || 'تفاصيل الطلب'} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'رقم الطلب', value: detailReq.request_number },
                { label: 'الخدمة', value: detailReq.service_name },
                { label: 'النقابة أو منظمة', value: detailReq.entity_name },
                { label: 'رقم الموحد', value: detailReq.unified_code },
                { label: 'تاريخ التقديم', value: detailReq.submission_date },
                { label: 'التاريخ المتوقع', value: detailReq.expected_date },
                { label: 'تاريخ الإنجاز', value: detailReq.completion_date },
                { label: 'الحالة', value: STATUS_LABELS[detailReq.status] || detailReq.status },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                </div>
              ))}
            </div>
            {detailReq.notes && (
              <div><p className="text-sm font-semibold text-heading mb-1">ملاحظات</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{detailReq.notes}</p></div>
            )}
            {detailReq.rejection_reason && (
              <div><p className="text-sm font-semibold text-error mb-1">سبب الرفض</p><p className="text-sm text-error bg-error/5 rounded-lg p-3">{detailReq.rejection_reason}</p></div>
            )}
          </div>
        </Modal>
      )}

      {showServicesModal && (
        <Modal isOpen={showServicesModal} onClose={() => setShowServicesModal(false)} title="قائمة الخدمات المتاحة" size="lg">
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="p-4 bg-muted rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-heading">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">الرمز: {s.service_code}</p>
                  </div>
                  {s.category && <span className="px-3 py-1 bg-gold/15 text-gold-dark rounded-full text-xs font-semibold">{s.category}</span>}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
