/**
 * Organization Activities Management - إدارة أنشطة النقابة
 * CRUD كامل مع تصدير وبروفايل تفصيلي
 */

import { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, Search, Download, Edit, Trash2, Eye, X, Calendar, MapPin } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface ActivityItem {
  activity_id: string;
  activity_name: string;
  activity_type: string;
  description: string;
  objectives: string;
  outcomes: string;
  start_date: string;
  end_date: string;
  location: string;
  responsible: string;
  participants_count: number;
  male_participants: number;
  female_participants: number;
  funding_source: string;
  total_budget: number;
  actual_cost: number;
  status: string;
  entity_id: string;
  created_at: string;
}

const STATUS_MAP: Record<string, string> = { completed: 'مكتمل', in_progress: 'جاري', planned: 'مخطط', cancelled: 'ملغي' };
const STATUS_COLORS: Record<string, string> = { completed: 'bg-success/15 text-success-dark', in_progress: 'bg-info/15 text-info-dark', planned: 'bg-warning/15 text-warning-dark', cancelled: 'bg-muted text-heading' };
const TYPE_MAP: Record<string, string> = { training: 'تدريب', workshop: 'ورشة', meeting: 'اجتماع', social: 'اجتماعي', charity: 'خيري' };

export function OrganizationActivitiesManagement() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<ActivityItem | null>(null);
  const [formData, setFormData] = useState<Partial<ActivityItem>>({});

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/activities');
      if (r.ok) {
        const data = await r.json();
        setActivities(Array.isArray(data) ? data : data.data || []);
        logAudit({ action: 'view', resource: 'organization_activities' });
      }
    } catch { toast.error('خطأ في تحميل الأنشطة'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النشاط؟')) return;
    try {
      const r = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'activity', details: { id } }); fetchActivities(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleSave = async () => {
    if (!formData.activity_name?.trim()) { toast.error('اسم النشاط مطلوب'); return; }
    try {
      const endpoint = editItem ? `/api/activities/${editItem.activity_id}` : '/api/activities';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowAddModal(false); setEditItem(null); fetchActivities(); }
      else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleOpenEdit = (item: ActivityItem) => {
    setEditItem(item);
    setFormData({ activity_name: item.activity_name, activity_type: item.activity_type, description: item.description, objectives: item.objectives, start_date: item.start_date, end_date: item.end_date, location: item.location, responsible: item.responsible, participants_count: item.participants_count, total_budget: item.total_budget, status: item.status });
    setShowAddModal(true);
  };

  const handleExport = () => {
    exportReportToExcel({
      title: 'إدارة أنشطة المنظمة', reportType: 'statistics', data: filteredActivities,
      columns: [
        { key: 'activity_name', label: 'اسم النشاط' }, { key: 'activity_type', label: 'النوع' },
        { key: 'start_date', label: 'تاريخ البدء' }, { key: 'location', label: 'الموقع' },
        { key: 'participants_count', label: 'المشاركون' }, { key: 'status', label: 'الحالة' },
      ],
    });
    toast.success('تم التصدير');
  };

  const filteredActivities = activities.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || a.activity_name?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'الكل' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: activities.length,
    completed: activities.filter(a => a.status === 'completed').length,
    upcoming: activities.filter(a => a.status === 'planned' || a.status === 'in_progress').length,
    totalParticipants: activities.reduce((sum, a) => sum + (a.participants_count || 0), 0),
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-bright to-primary-dark rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" />إدارة الأنشطة</h1>
            <p className="text-blue-100 mt-1">متابعة وإدارة أنشطة المنظمة — {activities.length} نشاط</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"><Download size={16} />تصدير</button>
            <button onClick={() => { setEditItem(null); setFormData({}); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-white/90 font-semibold text-sm"><Plus size={18} />إضافة نشاط</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأنشطة', value: stats.total, color: 'text-primary' },
          { label: 'نشاط مكتمل', value: stats.completed, color: 'text-success' },
          { label: 'أنشطة قادمة/جارية', value: stats.upcoming, color: 'text-warning' },
          { label: 'إجمالي المشاركين', value: stats.totalParticipants, color: 'text-gold' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالاسم أو الموقع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع الحالات</option>
            <option value="completed">مكتمل</option><option value="in_progress">جاري</option><option value="planned">مخطط</option><option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold">اسم النشاط</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">تاريخ البدء</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الموقع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">المشاركون</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-muted-foreground">جاري التحميل...</span></div></td></tr>
              ) : filteredActivities.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">لا توجد بيانات</td></tr>
              ) : filteredActivities.map(a => (
                <tr key={a.activity_id} className="hover:bg-accent transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-heading">{a.activity_name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{TYPE_MAP[a.activity_type] || a.activity_type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1"><Calendar size={13} />{a.start_date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1"><MapPin size={13} />{a.location || '—'}</td>
                  <td className="px-4 py-3 text-sm text-heading font-bold">{a.participants_count || 0}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[a.status] || 'bg-muted text-heading'}`}>{STATUS_MAP[a.status] || a.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedActivity(a)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => handleOpenEdit(a)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(a.activity_id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-muted border-t border-border text-sm text-muted-foreground">عرض {filteredActivities.length} من {activities.length} نشاط</div>
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedActivity(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{selectedActivity.activity_name}</h3>
              <button onClick={() => setSelectedActivity(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedActivity.status] || 'bg-muted text-heading'}`}>{STATUS_MAP[selectedActivity.status]}</span>
                <span className="text-sm text-muted-foreground">{TYPE_MAP[selectedActivity.activity_type] || selectedActivity.activity_type}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'تاريخ البدء', value: selectedActivity.start_date },
                  { label: 'تاريخ الانتهاء', value: selectedActivity.end_date },
                  { label: 'الموقع', value: selectedActivity.location },
                  { label: 'المسؤول', value: selectedActivity.responsible },
                  { label: 'المشاركون', value: selectedActivity.participants_count },
                  { label: 'الميزانية', value: selectedActivity.total_budget ? `${selectedActivity.total_budget.toLocaleString('ar-YE')} ريال` : '—' },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
              {selectedActivity.description && (
                <div><p className="text-sm font-semibold text-heading mb-1">الوصف</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedActivity.description}</p></div>
              )}
              {selectedActivity.objectives && (
                <div><p className="text-sm font-semibold text-heading mb-1">الأهداف</p><p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedActivity.objectives}</p></div>
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
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل نشاط' : 'إضافة نشاط جديد'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">اسم النشاط *</label><input value={formData.activity_name || ''} onChange={e => setFormData({ ...formData, activity_name: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">النوع</label><select value={formData.activity_type || ''} onChange={e => setFormData({ ...formData, activity_type: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="training">تدريب</option><option value="workshop">ورشة</option><option value="meeting">اجتماع</option><option value="social">اجتماعي</option><option value="charity">خيري</option></select></div>
                <div><label className="block text-sm font-semibold mb-1">الحالة</label><select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="planned">مخطط</option><option value="in_progress">جاري</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">تاريخ البدء</label><input type="date" value={formData.start_date || ''} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">تاريخ الانتهاء</label><input type="date" value={formData.end_date || ''} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">الموقع</label><input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">المسؤول</label><input value={formData.responsible || ''} onChange={e => setFormData({ ...formData, responsible: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">عدد المشاركين</label><input type="number" value={formData.participants_count || ''} onChange={e => setFormData({ ...formData, participants_count: parseInt(e.target.value) || 0 })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">الميزانية</label><input type="number" value={formData.total_budget || ''} onChange={e => setFormData({ ...formData, total_budget: parseInt(e.target.value) || 0 })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">الوصف</label><textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={2} /></div>
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
