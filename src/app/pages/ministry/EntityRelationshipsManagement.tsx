/**
 * EntityRelationshipsManagement — إدارة علاقات الجهات
 * DB: entity_relationships (source_entity_id, target_entity_id, relationship_type, relationship_level, start_date, end_date, status, metadata)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, Eye, Edit2, Trash2, RefreshCw, X, Download, Link2,
  GitBranch, ArrowRight, Network,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface EntityRelationship {
  id: string;
  source_entity_id: string;
  source_entity_name?: string;
  target_entity_id: string;
  target_entity_name?: string;
  relationship_type: string;
  relationship_level: string;
  start_date: string;
  end_date: string;
  status: string;
  metadata: string;
  created_at: string;
}

interface Entity {
  entity_id: string;
  name_ar: string;
  name_en?: string;
}

const RELATIONSHIP_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  PARENT_OF: { label: 'اتحاد عام / منظمة أم راعية', color: 'text-blue-600', bg: 'bg-blue-100' },
  CHILD_OF: { label: 'نقابة عامة / فرع تابع', color: 'text-green-600', bg: 'bg-green-100' },
  BRANCH_OF: { label: 'لجنة نقابية / مكتب فرعي', color: 'text-purple-600', bg: 'bg-purple-100' },
  AFFILIATED_TO: { label: 'انتساب وعضوية مؤسسية', color: 'text-orange-600', bg: 'bg-orange-100' },
  REPRESENTS: { label: 'تمثيل عمالي رسمي', color: 'text-red-600', bg: 'bg-red-100' },
  MEMBER_OF: { label: 'عضوية في الاتحاد العام', color: 'text-teal-600', bg: 'bg-teal-100' },
  COVERS: { label: 'نطاق التغطية والتمثيل القطاعي', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  OPERATES_IN: { label: 'نطاق النشاط والعمل الميداني', color: 'text-pink-600', bg: 'bg-pink-100' },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشط', color: 'text-success', bg: 'bg-success/15' },
  inactive: { label: 'غير نشط', color: 'text-muted-foreground', bg: 'bg-muted' },
  pending: { label: 'قيد المراجعة', color: 'text-warning', bg: 'bg-warning/15' },
  terminated: { label: 'منتهي', color: 'text-error', bg: 'bg-error/15' },
};

export function EntityRelationshipsManagement() {
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState<EntityRelationship | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<EntityRelationship | null>(null);
  const [form, setForm] = useState<Partial<EntityRelationship>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const { confirm, dialog: confirmDialog } = useConfirm();

  const getEntityName = useCallback((id: string) => {
    const entity = entities.find(e => e.entity_id === id);
    return entity ? entity.name_ar : id;
  }, [entities]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (filterType !== 'all') params.set('relationship_type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchQuery.trim()) {
        params.set('source_entity_id', searchQuery);
        params.set('target_entity_id', searchQuery);
      }

      const [rRel, rEntities] = await Promise.all([
        fetch(`/api/entity-relationships?${params}`),
        fetch('/api/entities?limit=100'),
      ]);

      if (rRel.ok) {
        const d = await rRel.json();
        const list = (d.data || []).map((r: EntityRelationship) => ({
          ...r,
          source_entity_name: getEntityName(r.source_entity_id),
          target_entity_name: getEntityName(r.target_entity_id),
        }));
        setRelationships(list);
        setTotalPages(d.totalPages || Math.ceil((d.total || list.length) / limit) || 1);
      }

      if (rEntities.ok) {
        const d = await rEntities.json();
        setEntities(d.data || d || []);
      }

      logAudit({ action: 'view', resource: 'entity_relationships' });
    } catch {
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, searchQuery, getEntityName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.source_entity_id?.trim()) { toast.error('المنشأة المصدر مطلوبة'); return; }
    if (!form.target_entity_id?.trim()) { toast.error('المنشأة الهدف مطلوبة'); return; }
    if (!form.relationship_type?.trim()) { toast.error('نوع العلاقة مطلوب'); return; }

    try {
      const endpoint = editItem ? `/api/entity-relationships/${editItem.id}` : '/api/entity-relationships';
      const method = editItem ? 'PUT' : 'POST';
      const body = {
        source_entity_id: form.source_entity_id,
        target_entity_id: form.target_entity_id,
        relationship_type: form.relationship_type,
        relationship_level: form.relationship_level || '',
        start_date: form.start_date || '',
        end_date: form.end_date || '',
        status: form.status || 'active',
        metadata: form.metadata || '',
      };

      const r = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (r.ok) {
        toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة');
        setShowForm(false);
        setEditItem(null);
        fetchData();
      } else {
        const e = await r.json();
        toast.error(e.error || 'حدث خطأ');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذه العلاقة؟',
      confirmLabel: 'نعم',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const r = await fetch(`/api/entity-relationships/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); fetchData(); }
      else { toast.error('خطأ'); }
    } catch { toast.error('خطأ'); }
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ status: 'active', relationship_level: '' });
    setShowForm(true);
  };

  const openEdit = (item: EntityRelationship) => {
    setEditItem(item);
    setForm(item);
    setShowForm(true);
  };

  const filtered = useMemo(() => {
    return relationships.filter(r => {
      const srcName = (r.source_entity_name || '').toLowerCase();
      const tgtName = (r.target_entity_name || '').toLowerCase();
      const typeLabel = (RELATIONSHIP_TYPES[r.relationship_type]?.label || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || srcName.includes(q) || tgtName.includes(q) || typeLabel.includes(q) || r.relationship_type?.toLowerCase().includes(q);
      const matchType = filterType === 'all' || r.relationship_type === filterType;
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [relationships, searchQuery, filterType, filterStatus]);

  const stats = useMemo(() => ({
    total: relationships.length,
    active: relationships.filter(r => r.status === 'active').length,
    pending: relationships.filter(r => r.status === 'pending').length,
    inactive: relationships.filter(r => r.status === 'inactive' || r.status === 'terminated').length,
  }), [relationships]);

  const handleExport = () => {
    exportReportToExcel({
      title: 'علاقات الجهات',
      reportType: 'statistics',
      data: filtered,
      columns: [
        { key: 'source_entity_name', label: 'المنشأة المصدر' },
        { key: 'relationship_type', label: 'نوع العلاقة' },
        { key: 'target_entity_name', label: 'المنشأة الهدف' },
        { key: 'relationship_level', label: 'المستوى' },
        { key: 'status', label: 'الحالة' },
        { key: 'start_date', label: 'تاريخ البداية' },
        { key: 'end_date', label: 'تاريخ النهاية' },
      ],
    });
    toast.success('تم التصدير بنجاح');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}

      <PageHeader
        title="الهيكل والتبعيات النقابية والمؤسسية"
        subtitle="إدارة وتتبع العلاقات الهيكلية والتبعية بين الاتحادات العامة، النقابات الفرعية، واللجان العمالية"
        breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'الهيكل والتبعيات النقابية' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <Download className="w-4 h-4" />تصدير
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />علاقة جديدة
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي العلاقات', value: stats.total, color: 'text-heading', icon: Network },
          { label: 'علاقات نشطة', value: stats.active, color: 'text-success', icon: Link2 },
          { label: 'قيد المراجعة', value: stats.pending, color: 'text-warning', icon: RefreshCw },
          { label: 'غير نشطة / منتهية', value: stats.inactive, color: 'text-muted-foreground', icon: GitBranch },
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
            <input
              type="text"
              placeholder="بحث بالاسم أو نوع العلاقة..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pr-10 pl-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-border rounded-lg text-sm"
          >
            <option value="all">جميع الأنواع</option>
            {Object.entries(RELATIONSHIP_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-border rounded-lg text-sm"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="pending">قيد المراجعة</option>
            <option value="inactive">غير نشط</option>
            <option value="terminated">منتهي</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد علاقات" description="لم يتم العثور على علاقات بين الجهات" icon={<Link2 className="w-14 h-14" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المنشأة المصدر</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">نوع العلاقة</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">المنشأة الهدف</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المستوى</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">الفترة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => {
                  const rt = RELATIONSHIP_TYPES[r.relationship_type];
                  const st = STATUS_MAP[r.status] || STATUS_MAP.active;
                  return (
                    <tr key={r.id} className="hover:bg-accent transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-heading">{r.source_entity_name || r.source_entity_id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rt?.bg || 'bg-muted'} ${rt?.color || 'text-muted-foreground'}`}>
                            {rt?.label || r.relationship_type}
                          </span>
                          <ArrowRight size={14} className="text-muted-foreground rotate-180" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-heading text-left">{r.target_entity_name || r.target_entity_id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.relationship_level || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.start_date || '—'}
                        {r.end_date ? ` — ${r.end_date}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedItem(r)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                          <button onClick={() => openEdit(r)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              السابق
            </button>
            <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">تفاصيل العلاقة</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'المنشأة المصدر', value: selectedItem.source_entity_name || selectedItem.source_entity_id },
                { label: 'نوع العلاقة', value: RELATIONSHIP_TYPES[selectedItem.relationship_type]?.label || selectedItem.relationship_type },
                { label: 'المنشأة الهدف', value: selectedItem.target_entity_name || selectedItem.target_entity_id },
                { label: 'مستوى العلاقة', value: selectedItem.relationship_level },
                { label: 'الحالة', value: STATUS_MAP[selectedItem.status]?.label || selectedItem.status },
                { label: 'تاريخ البداية', value: selectedItem.start_date },
                { label: 'تاريخ النهاية', value: selectedItem.end_date },
                { label: 'بيانات إضافية', value: selectedItem.metadata },
                { label: 'تاريخ الإنشاء', value: selectedItem.created_at },
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
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل العلاقة' : 'علاقة جديدة'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">المنشأة المصدر *</label>
                <select
                  value={form.source_entity_id || ''}
                  onChange={e => setForm({ ...form, source_entity_id: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                >
                  <option value="">اختر المنشأة المصدر</option>
                  {entities.map(en => (
                    <option key={en.entity_id} value={en.entity_id}>{en.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">نوع العلاقة *</label>
                <select
                  value={form.relationship_type || ''}
                  onChange={e => setForm({ ...form, relationship_type: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                >
                  <option value="">اختر نوع العلاقة</option>
                  {Object.entries(RELATIONSHIP_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">المنشأة الهدف *</label>
                <select
                  value={form.target_entity_id || ''}
                  onChange={e => setForm({ ...form, target_entity_id: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                >
                  <option value="">اختر المنشأة الهدف</option>
                  {entities.map(en => (
                    <option key={en.entity_id} value={en.entity_id}>{en.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">مستوى العلاقة</label>
                <input
                  value={form.relationship_level || ''}
                  onChange={e => setForm({ ...form, relationship_level: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                  placeholder="مستوى 1، رئيسي، فرعي..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={form.start_date || ''}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={form.end_date || ''}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">الحالة</label>
                <select
                  value={form.status || 'active'}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                >
                  <option value="active">نشط</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="inactive">غير نشط</option>
                  <option value="terminated">منتهي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">بيانات إضافية</label>
                <textarea
                  value={form.metadata || ''}
                  onChange={e => setForm({ ...form, metadata: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"
                  rows={3}
                  placeholder="أي ملاحظات أو بيانات إضافية..."
                />
              </div>
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
