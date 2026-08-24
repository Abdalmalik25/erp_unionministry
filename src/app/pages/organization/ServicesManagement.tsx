/**
 * Organization Services Management - إدارة الخدمات
 * CRUD كامل مع تصدير وبروفايل تفصيلي
 */

import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Plus, Search, Download, Edit, Trash2, Eye, X } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { fetchList } from '../../utils/api';

interface ServiceRequest {
  id: string;
  service_type: string;
  entity_name: string;
  entity_id: string;
  status: string;
  priority: string;
  description: string;
  notes: string;
  tracking_number: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
}

const STATUS_MAP: Record<string, string> = { pending: 'معلق', in_progress: 'جاري المعالجة', completed: 'مكتمل', rejected: 'مرفوض', cancelled: 'ملغي' };
const STATUS_COLORS: Record<string, string> = { pending: 'bg-warning/15 text-warning-dark', in_progress: 'bg-info/15 text-info-dark', completed: 'bg-success/15 text-success-dark', rejected: 'bg-error/15 text-error', cancelled: 'bg-muted text-heading' };
const PRIORITY_MAP: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const PRIORITY_COLORS: Record<string, string> = { low: 'bg-muted text-heading', medium: 'bg-info/15 text-info-dark', high: 'bg-warning/15 text-warning-dark', urgent: 'bg-error/15 text-error' };

export function OrganizationServicesManagement() {
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<ServiceRequest | null>(null);
  const [formData, setFormData] = useState<Partial<ServiceRequest>>({});

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      setServices(await fetchList('/api/service-requests', undefined, ['requests']));
      logAudit({ action: 'view', resource: 'organization_services' });
    } catch { toast.error('خطأ في تحميل الطلبات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const r = await fetch(`/api/service-requests/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'service_request', details: { id } }); fetchServices(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleSave = async () => {
    if (!formData.service_type?.trim()) { toast.error('نوع الخدمة مطلوب'); return; }
    try {
      const endpoint = editItem ? `/api/service-requests/${editItem.id}` : '/api/service-requests';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowAddModal(false); setEditItem(null); fetchServices(); }
      else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleOpenEdit = (item: ServiceRequest) => {
    setEditItem(item);
    setFormData({ service_type: item.service_type, status: item.status, priority: item.priority, description: item.description, notes: item.notes, assigned_to: item.assigned_to });
    setShowAddModal(true);
  };

  const handleExport = () => {
    exportReportToExcel({
      title: 'إدارة خدمات المنظمة', reportType: 'statistics', data: filteredServices,
      columns: [
        { key: 'tracking_number', label: 'رقم التتبع' }, { key: 'service_type', label: 'نوع الخدمة' },
        { key: 'entity_name', label: 'النقابة أو المنظمة' }, { key: 'status', label: 'الحالة' },
        { key: 'priority', label: 'الأولوية' }, { key: 'created_at', label: 'تاريخ الإنشاء' },
      ],
    });
    toast.success('تم التصدير');
  };

  const filteredServices = services.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || s.service_type?.toLowerCase().includes(q) || s.entity_name?.toLowerCase().includes(q) || s.tracking_number?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'الكل' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: services.length,
    pending: services.filter(s => s.status === 'pending').length,
    inProgress: services.filter(s => s.status === 'in_progress').length,
    completed: services.filter(s => s.status === 'completed').length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-bright to-primary-dark rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck className="h-6 w-6" />إدارة الخدمات</h1>
            <p className="text-blue-100 mt-1">طلب ومتابعة الخدمات — {services.length} طلب</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"><Download size={16} />تصدير</button>
            <button onClick={() => { setEditItem(null); setFormData({}); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-white/90 font-semibold text-sm"><Plus size={18} />طلب خدمة</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الطلبات', value: stats.total, color: 'text-primary' },
          { label: 'معلقة', value: stats.pending, color: 'text-warning' },
          { label: 'جاري المعالجة', value: stats.inProgress, color: 'text-info' },
          { label: 'مكتملة', value: stats.completed, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بنوع الخدمة أو النقابة أو المنظمة أو رقم التتبع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع الحالات</option>
            <option value="pending">معلق</option><option value="in_progress">جاري</option><option value="completed">مكتمل</option><option value="rejected">مرفوض</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold">رقم التتبع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">نوع الخدمة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">النقابة أو المنظمة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الأولوية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-muted-foreground">جاري التحميل...</span></div></td></tr>
              ) : filteredServices.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">لا توجد طلبات</td></tr>
              ) : filteredServices.map(s => (
                <tr key={s.id} className="hover:bg-accent transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-heading">{s.tracking_number || s.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading">{s.service_type}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.entity_name || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[s.priority] || 'bg-muted text-heading'}`}>{PRIORITY_MAP[s.priority] || s.priority || '—'}</span></td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[s.status] || 'bg-muted text-heading'}`}>{STATUS_MAP[s.status] || s.status}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{s.created_at ? new Date(s.created_at).toLocaleDateString('ar-YE') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedService(s)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => handleOpenEdit(s)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-muted border-t border-border text-sm text-muted-foreground">عرض {filteredServices.length} من {services.length} طلب</div>
      </div>

      {/* Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedService(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{selectedService.service_type}</h3>
              <button onClick={() => setSelectedService(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedService.status]}`}>{STATUS_MAP[selectedService.status]}</span>
                {selectedService.priority && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[selectedService.priority]}`}>{PRIORITY_MAP[selectedService.priority]}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'رقم التتبع', value: selectedService.tracking_number },
                  { label: 'النقابة أو المنظمة', value: selectedService.entity_name },
                  { label: 'المسؤول', value: selectedService.assigned_to },
                  { label: 'تاريخ الإنشاء', value: selectedService.created_at ? new Date(selectedService.created_at).toLocaleDateString('ar-YE') : '—' },
                  { label: 'تاريخ الإكمال', value: selectedService.completed_at ? new Date(selectedService.completed_at).toLocaleDateString('ar-YE') : '—' },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
              {selectedService.description && (
                <div><p className="text-sm font-semibold text-heading mb-1">الوصف</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedService.description}</p></div>
              )}
              {selectedService.notes && (
                <div><p className="text-sm font-semibold text-heading mb-1">ملاحظات</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedService.notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل طلب' : 'طلب خدمة جديد'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">نوع الخدمة *</label><input value={formData.service_type || ''} onChange={e => setFormData({ ...formData, service_type: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">الحالة</label><select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="pending">معلق</option><option value="in_progress">جاري</option><option value="completed">مكتمل</option><option value="rejected">مرفوض</option></select></div>
                <div><label className="block text-sm font-semibold mb-1">الأولوية</label><select value={formData.priority || ''} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">الوصف</label><textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              <div><label className="block text-sm font-semibold mb-1">ملاحظات</label><textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={2} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">إلغاء</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark">{editItem ? 'تحديث' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
