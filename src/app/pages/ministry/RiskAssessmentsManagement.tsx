/**
 * RiskAssessmentsManagement — إدارة تقييمات المخاطر
 * DB: risk_assessments (entity_id, risk_type, risk_description, likelihood, impact, risk_score, risk_level, mitigation_plan, responsible_person, review_date, status)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, Eye, Edit2, Trash2, RefreshCw, X, Download, AlertTriangle,
  Shield, TrendingUp, BarChart3,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface RiskAssessment {
  id: string;
  entity_id: string;
  entity_name?: string;
  risk_type: string;
  risk_description: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  mitigation_plan: string;
  responsible_person: string;
  review_date: string;
  status: string;
  created_at: string;
}

interface Entity {
  entity_id: string;
  name_ar: string;
  name_en?: string;
}

const RISK_LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'منخفض', color: 'text-success', bg: 'bg-success/15' },
  medium: { label: 'متوسط', color: 'text-warning', bg: 'bg-warning/15' },
  high: { label: 'عالي', color: 'text-error', bg: 'bg-error/15' },
  critical: { label: 'حرج', color: 'text-error', bg: 'bg-error/25' },
};

export function RiskAssessmentsManagement() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedItem, setSelectedItem] = useState<RiskAssessment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RiskAssessment | null>(null);
  const [form, setForm] = useState<Partial<RiskAssessment>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rAssess, rEntities] = await Promise.all([
        fetch('/api/risk-assessments'),
        fetch('/api/entities'),
      ]);
      if (rAssess.ok) { const d = await rAssess.json(); setAssessments(d.data || []); }
      if (rEntities.ok) { const d = await rEntities.json(); setEntities(d.data || d || []); }
      logAudit({ action: 'view', resource: 'risk_assessments' });
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.risk_type?.trim()) { toast.error('نوع المخاطرة مطلوب'); return; }
    const likelihood = form.likelihood || 1;
    const impact = form.impact || 1;
    const score = likelihood * impact;
    let level = 'low';
    if (score >= 16) level = 'critical';
    else if (score >= 12) level = 'high';
    else if (score >= 6) level = 'medium';
    try {
      const endpoint = editItem ? `/api/risk-assessments/${editItem.id}` : '/api/risk-assessments';
      const method = editItem ? 'PUT' : 'POST';
      const body = { ...form, risk_score: score, risk_level: level };
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowForm(false); setEditItem(null); fetchData(); }
      else { const e = await r.json(); toast.error(e.error || 'حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف هذا التقييم؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try {
      const r = await fetch(`/api/risk-assessments/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); fetchData(); }
      else { toast.error('خطأ'); }
    } catch { toast.error('خطأ'); }
  };

  const openAdd = () => { setEditItem(null); setForm({ likelihood: 1, impact: 1, status: 'active' }); setShowForm(true); };
  const openEdit = (item: RiskAssessment) => { setEditItem(item); setForm(item); setShowForm(true); };

  const filtered = useMemo(() => {
    return assessments.filter(a => {
      const matchSearch = !searchQuery || a.risk_description?.toLowerCase().includes(searchQuery.toLowerCase()) || a.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.responsible_person?.toLowerCase().includes(searchQuery.toLowerCase()) || a.risk_type?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLevel = filterLevel === 'all' || a.risk_level === filterLevel;
      return matchSearch && matchLevel;
    });
  }, [assessments, searchQuery, filterLevel]);

  const stats = useMemo(() => ({
    total: assessments.length,
    critical: assessments.filter(a => a.risk_level === 'critical').length,
    high: assessments.filter(a => a.risk_level === 'high').length,
    low: assessments.filter(a => a.risk_level === 'low').length,
  }), [assessments]);

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader
        title="تقييم المخاطر" subtitle="إدارة وتقييم مخاطر المنشآت"
        breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'تقييم المخاطر' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { exportReportToExcel({ title: 'تقييم المخاطر', reportType: 'statistics', data: filtered, columns: [{ key: 'entity_name', label: 'المنشأة' }, { key: 'risk_type', label: 'النوع' }, { key: 'risk_level', label: 'المستوى' }, { key: 'status', label: 'الحالة' }] }); toast.success('تم التصدير'); }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"><Download className="w-4 h-4" />تصدير</button>
            <PermissionGate permission="risk:create">
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"><Plus className="w-4 h-4" />تقييم جديد</button>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي التقييمات', value: stats.total, color: 'text-heading', icon: BarChart3 },
          { label: 'مخاطر حرجة', value: stats.critical, color: 'text-error', icon: AlertTriangle },
          { label: 'مخاطر عالية', value: stats.high, color: 'text-warning', icon: TrendingUp },
          { label: 'مخاطر منخفضة', value: stats.low, color: 'text-success', icon: Shield },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالوصف أو المنشأة أو المسؤول..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-2.5 border border-border rounded-lg text-sm">
            <option value="all">جميع المستويات</option>
            <option value="low">منخفض</option><option value="medium">متوسط</option><option value="high">عالي</option><option value="critical">حرج</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد تقييمات" description="لم يتم العثور على تقييمات مخاطر" icon={<AlertTriangle className="w-14 h-14" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المنشأة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">نوع المخاطرة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">مستوى الخطورة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">الاحتمال</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">التأثير</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المسؤول</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(a => {
                  const rl = RISK_LEVELS[a.risk_level] || RISK_LEVELS.low;
                  return (
                    <tr key={a.id} className="hover:bg-accent transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-heading">{a.entity_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.risk_type}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rl.bg} ${rl.color}`}>{rl.label}</span></td>
                      <td className="px-4 py-3 text-sm text-center font-mono">{a.likelihood}/5</td>
                      <td className="px-4 py-3 text-sm text-center font-mono">{a.impact}/5</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.responsible_person || '—'}</td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => setSelectedItem(a)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                        <PermissionGate permission="risk:edit">
                          <button onClick={() => openEdit(a)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                        </PermissionGate>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
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
              <h3 className="text-lg font-bold text-heading">تفاصيل تقييم المخاطر</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'المنشأة', value: selectedItem.entity_name },
                { label: 'نوع المخاطرة', value: selectedItem.risk_type },
                { label: 'الوصف', value: selectedItem.risk_description },
                { label: 'مستوى الخطورة', value: RISK_LEVELS[selectedItem.risk_level]?.label },
                { label: 'الاحتمال', value: `${selectedItem.likelihood}/5` },
                { label: 'التأثير', value: `${selectedItem.impact}/5` },
                { label: 'النتيجة', value: `${selectedItem.risk_score}` },
                { label: 'خطة التخفيف', value: selectedItem.mitigation_plan },
                { label: 'المسؤول', value: selectedItem.responsible_person },
                { label: 'تاريخ المراجعة', value: selectedItem.review_date },
                { label: 'الحالة', value: selectedItem.status },
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
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل التقييم' : 'تقييم مخاطر جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">المنشأة</label>
                <select value={form.entity_id || ''} onChange={e => setForm({ ...form, entity_id: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                  <option value="">اختر المنشأة</option>
                  {entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.name_ar}</option>)}
                </select></div>
              <div><label className="block text-sm font-semibold mb-1">نوع المخاطرة *</label>
                <input value={form.risk_type || ''} onChange={e => setForm({ ...form, risk_type: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" placeholder="قانونية، مالية، تشغيلية، أمنية..." /></div>
              <div><label className="block text-sm font-semibold mb-1">وصف المخاطرة</label>
                <textarea value={form.risk_description || ''} onChange={e => setForm({ ...form, risk_description: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">الاحتمال (1-5)</label>
                  <input type="number" min={1} max={5} value={form.likelihood || 1} onChange={e => setForm({ ...form, likelihood: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">التأثير (1-5)</label>
                  <input type="number" min={1} max={5} value={form.impact || 1} onChange={e => setForm({ ...form, impact: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">خطة التخفيف</label>
                <textarea value={form.mitigation_plan || ''} onChange={e => setForm({ ...form, mitigation_plan: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">المسؤول</label>
                  <input value={form.responsible_person || ''} onChange={e => setForm({ ...form, responsible_person: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">تاريخ المراجعة</label>
                  <input type="date" value={form.review_date || ''} onChange={e => setForm({ ...form, review_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">الحالة</label>
                <select value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                  <option value="active">نشط</option><option value="resolved">محسوس</option><option value="closed">مغلق</option><option value="deferred">مؤجل</option>
                </select></div>
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
