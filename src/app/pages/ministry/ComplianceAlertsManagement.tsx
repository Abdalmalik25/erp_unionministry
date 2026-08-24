/**
 * ComplianceAlertsManagement — إدارة تنبيهات الامتثال
 * المنظومة الوطنية للعمل النقابي | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Eye, Trash2, Plus, RefreshCw, CheckCircle, X, Clock, AlertTriangle, Bell, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import {} from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
interface ComplianceAlert {
    id: string;
    enterprise_id: string;
    enterprise_name: string;
    alert_type: string;
    severity: string;
    title: string;
    description?: string;
    source_table?: string;
    source_id?: string;
    due_date?: string;
    is_acknowledged: boolean;
    is_resolved: boolean;
    resolution_notes?: string;
    resolved_at?: string;
    created_at: string;
}
const SEVERITY_CONFIG: Record<string, {
    label: string;
    color: string;
    icon: any;
}> = {
    info: { label: 'معلومات', color: 'bg-blue-100 text-blue-700', icon: Bell },
    warning: { label: 'تحذير', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
    critical: { label: 'حرج', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};
const ALERT_TYPES = [
    { value: 'inspection_due', label: 'تفتيش مطلوب' },
    { value: 'certificate_expiring', label: 'شهادة تنتهي صلاحيتها' },
    { value: 'compliance_violation', label: 'مخالفة امتثال' },
    { value: 'worker_dispatch_overdue', label: 'إرسالية متأخرة' },
    { value: 'reduction_request_pending', label: 'طلب تخفيض معلق' },
    { value: 'evaluation_overdue', label: 'تقييم متأخر' },
    { value: 'manual', label: 'يدوي' },
];
export default function ComplianceAlertsManagement() {
    const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [resolvedFilter, setResolvedFilter] = useState('');
    const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<ComplianceAlert | null>(null);
    const [form, setForm] = useState({ enterprise_id: '', enterprise_name: '', alert_type: 'manual', severity: 'warning', title: '', description: '', due_date: '' });
    const { confirm, dialog: confirmDialog } = useConfirm();
    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (severityFilter)
                params.set('severity', severityFilter);
            if (resolvedFilter)
                params.set('is_resolved', resolvedFilter);
            const r = await fetch(`/api/compliance-alerts?${params}`);
            if (r.ok) {
                const d = await r.json();
                setAlerts(d.data || []);
            }
        }
        catch { /* empty */ }
        setLoading(false);
    }, [severityFilter, resolvedFilter]);
    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
    const filtered = useMemo(() => {
        if (!searchQuery)
            return alerts;
        const q = searchQuery.toLowerCase();
        return alerts.filter(a => a.title?.toLowerCase().includes(q) ||
            a.enterprise_name?.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q));
    }, [alerts, searchQuery]);
    const stats = useMemo(() => ({
        total: alerts.length,
        unresolved: alerts.filter(a => !a.is_resolved).length,
        critical: alerts.filter(a => a.severity === 'critical' && !a.is_resolved).length,
        unacknowledged: alerts.filter(a => !a.is_acknowledged && !a.is_resolved).length,
    }), [alerts]);
    const handleSave = async () => {
        try {
            const method = editItem ? 'PUT' : 'POST';
            const url = editItem ? `/api/compliance-alerts/${editItem.id}` : '/api/compliance-alerts';
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث التنبيه' : 'تم إنشاء التنبيه');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'compliance_alert', details: form });
                setShowForm(false);
                setEditItem(null);
                fetchAlerts();
            }
            else {
                toast.error('حدث خطأ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    const handleResolve = async (id: string) => {
        try {
            const r = await fetch(`/api/compliance-alerts/${id}/resolve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            if (r.ok) {
                toast.success('تم حل التنبيه');
                logAudit({ action: 'update', resource: 'compliance_alert', details: { id } });
                fetchAlerts();
            }
        }
        catch {
            toast.error('خطأ');
        }
    };
    const handleAcknowledge = async (id: string) => {
        try {
            const r = await fetch(`/api/compliance-alerts/${id}/acknowledge`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            if (r.ok) {
                toast.success('تم الاطلاع على التنبيه');
                fetchAlerts();
            }
        }
        catch {
            toast.error('خطأ');
        }
    };
    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف هذا التنبيه؟', confirmLabel: 'نعم', variant: 'danger' });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/compliance-alerts/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم الحذف');
                logAudit({ action: 'delete', resource: 'compliance_alert', details: { id } });
                fetchAlerts();
            }
        }
        catch {
            toast.error('خطأ');
        }
    };
    const handleExport = () => {
        exportReportToExcel({
            title: 'تنبيهات الامتثال', reportType: 'statistics', data: alerts,
            columns: [
                { key: 'title', label: 'العنوان' }, { key: 'enterprise_name', label: 'المنشأة' },
                { key: 'alert_type', label: 'النوع' }, { key: 'severity', label: 'الشدة' },
                { key: 'due_date', label: 'تاريخ الاستحقاق' }, { key: 'is_resolved', label: 'الحالة' },
            ],
        });
        logAudit({ action: 'export', resource: 'compliance_alerts', details: { count: alerts.length } });
        toast.success('تم التصدير');
    };
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="تنبيهات الامتثال" subtitle="مراقبة وإدارة تنبيهات الامتثال للمنشآت" actions={<button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"><Download size={16}/>تصدير</button>}/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500">إجمالي التنبيهات</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.unresolved}</div>
          <div className="text-xs text-gray-500">غير محلولة</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-xs text-gray-500"> حرجة</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.unacknowledged}</div>
          <div className="text-xs text-gray-500">لم تُاطلع عليها</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="بحث في التنبيهات..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"/>
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">جميع الأهميات</option>
          <option value="info">معلومات</option>
          <option value="warning">تحذير</option>
          <option value="critical">حرج</option>
        </select>
        <select value={resolvedFilter} onChange={e => setResolvedFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">الكل</option>
          <option value="true">محلول</option>
          <option value="false">غير محلول</option>
        </select>
        <button onClick={fetchAlerts} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button>
        <PermissionGate permission="compliance:create">
          <button onClick={() => { setEditItem(null); setForm({ enterprise_id: '', enterprise_name: '', alert_type: 'manual', severity: 'warning', title: '', description: '', due_date: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4"/> تنبيه جديد
          </button>
        </PermissionGate>
      </div>

      {loading ? (<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>) : filtered.length === 0 ? (<EmptyState title="لا توجد تنبيهات" description="لم يتم العثور على تنبيهات امتثال"/>) : (<div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">العنوان</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المؤسسة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">النوع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الأهمية</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(alert => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
                const typeLabel = ALERT_TYPES.find(t => t.value === alert.alert_type)?.label || alert.alert_type;
                return (<tr key={alert.id} className={`hover:bg-gray-50 ${alert.is_resolved ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{alert.title}</div>
                      {alert.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{alert.description}</div>}
                    </td>
                    <td className="px-4 py-3">{alert.enterprise_name}</td>
                    <td className="px-4 py-3 text-xs">{typeLabel}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sev.color}`}>{sev.label}</span></td>
                    <td className="px-4 py-3 text-center">
                      {alert.is_resolved ? (<span className="inline-flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5"/> محلول</span>) : alert.is_acknowledged ? (<span className="inline-flex items-center gap-1 text-yellow-600 text-xs"><Clock className="w-3.5 h-3.5"/> تمت المراجعة</span>) : (<span className="inline-flex items-center gap-1 text-red-600 text-xs"><AlertTriangle className="w-3.5 h-3.5"/> جديد</span>)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedAlert(alert)} className="p-1.5 hover:bg-gray-100 rounded" title="عرض"><Eye className="w-4 h-4"/></button>
                        {!alert.is_acknowledged && <button onClick={() => handleAcknowledge(alert.id)} className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600" title="تم الاطلاع"><Bell className="w-4 h-4"/></button>}
                        {!alert.is_resolved && <button onClick={() => handleResolve(alert.id)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="حل"><CheckCircle className="w-4 h-4"/></button>}
                        <PermissionGate permission="compliance:delete">
                          <button onClick={() => handleDelete(alert.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="حذف"><Trash2 className="w-4 h-4"/></button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>);
            })}
            </tbody>
          </table>
        </div>)}

      {/* Detail Modal */}
      {selectedAlert && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAlert(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تفاصيل التنبيه</h3>
              <button onClick={() => setSelectedAlert(null)}><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">العنوان:</span><span className="font-medium">{selectedAlert.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المؤسسة:</span><span>{selectedAlert.enterprise_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">النوع:</span><span>{ALERT_TYPES.find(t => t.value === selectedAlert.alert_type)?.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الأهمية:</span><span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_CONFIG[selectedAlert.severity]?.color}`}>{SEVERITY_CONFIG[selectedAlert.severity]?.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span>{selectedAlert.is_resolved ? 'محلول' : selectedAlert.is_acknowledged ? 'تمت المراجعة' : 'جديد'}</span></div>
              {selectedAlert.description && <div><span className="text-gray-500">الوصف:</span><p className="mt-1">{selectedAlert.description}</p></div>}
              {selectedAlert.due_date && <div className="flex justify-between"><span className="text-gray-500">تاريخ الاستحقاق:</span><span>{selectedAlert.due_date}</span></div>}
              {selectedAlert.resolution_notes && <div><span className="text-gray-500">ملاحظات الحل:</span><p className="mt-1">{selectedAlert.resolution_notes}</p></div>}
              <div className="flex justify-between"><span className="text-gray-500">أنشئ في:</span><span>{new Date(selectedAlert.created_at).toLocaleDateString('ar-YE')}</span></div>
            </div>
          </div>
        </div>)}

      {/* Form Modal */}
      {showForm && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editItem ? 'تعديل التنبيه' : 'تنبيه جديد'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">المؤسسة *</label><input value={form.enterprise_name} onChange={e => setForm({ ...form, enterprise_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div><label className="block text-sm font-medium mb-1">العنوان *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">النوع</label><select value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">الأهمية</label><select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="info">معلومات</option><option value="warning">تحذير</option><option value="critical">حرج</option></select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">الوصف</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div><label className="block text-sm font-medium mb-1">تاريخ الاستحقاق</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">إلغاء</button>
                <button onClick={handleSave} disabled={!form.enterprise_name || !form.title} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{editItem ? 'تحديث' : 'إنشاء'}</button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
