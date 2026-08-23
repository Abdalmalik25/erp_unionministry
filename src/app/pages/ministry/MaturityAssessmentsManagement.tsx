/**
 * MaturityAssessmentsManagement — إدارة تقييمات النضج
 * DB: maturity_assessments (entity_id, overall_score, grade, identity_score, description_score, tasks_score, competencies_score, safety_score, career_score, governance_score, missing_count, red_flags, recommendations, assessment_date, assessed_by)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Plus, Eye, Edit2, Trash2, RefreshCw, X, Download, TrendingUp,
  Award, BarChart3, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface MaturityAssessment {
  id: string;
  entity_id: string;
  entity_name?: string;
  overall_score: number;
  grade: string;
  identity_score: number;
  description_score: number;
  tasks_score: number;
  competencies_score: number;
  safety_score: number;
  career_score: number;
  governance_score: number;
  missing_count: number;
  red_flags: number;
  recommendations: string;
  assessment_date: string;
  assessed_by: string;
  created_at: string;
}

interface Entity {
  entity_id: string;
  name_ar: string;
}

const GRADE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'ممتاز', color: 'text-success', bg: 'bg-success/15' },
  B: { label: 'جيد جداً', color: 'text-info', bg: 'bg-info/15' },
  C: { label: 'جيد', color: 'text-warning', bg: 'bg-warning/15' },
  D: { label: 'مقبول', color: 'text-warning', bg: 'bg-warning/15' },
  F: { label: 'ضعيف', color: 'text-error', bg: 'bg-error/15' },
};

const DOMAIN_LABELS: Record<string, string> = {
  identity_score: 'الهوية',
  description_score: 'الوصف',
  tasks_score: 'المهام',
  competencies_score: 'الكفاءات',
  safety_score: 'السلامة',
  career_score: 'المسار المهني',
  governance_score: 'الحوكمة',
};

export function MaturityAssessmentsManagement() {
  const [assessments, setAssessments] = useState<MaturityAssessment[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MaturityAssessment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MaturityAssessment | null>(null);
  const [form, setForm] = useState<Partial<MaturityAssessment>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rMat, rEnt] = await Promise.all([fetch('/api/maturity-assessments'), fetch('/api/entities')]);
      if (rMat.ok) { const d = await rMat.json(); setAssessments(d.data || []); }
      if (rEnt.ok) { const d = await rEnt.json(); setEntities(d.data || d || []); }
      logAudit({ action: 'view', resource: 'maturity_assessments' });
    } catch { toast.error('خطأ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const endpoint = editItem ? `/api/maturity-assessments/${editItem.id}` : '/api/maturity-assessments';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowForm(false); setEditItem(null); fetchData(); }
      else { const e = await r.json(); toast.error(e.error || 'خطأ'); }
    } catch { toast.error('خطأ'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try { const r = await fetch(`/api/maturity-assessments/${id}`, { method: 'DELETE' }); if (r.ok) { toast.success('تم الحذف'); fetchData(); } else { toast.error('خطأ'); } } catch { toast.error('خطأ'); }
  };

  const openAdd = () => { setEditItem(null); setForm({}); setShowForm(true); };
  const openEdit = (item: MaturityAssessment) => { setEditItem(item); setForm(item); setShowForm(true); };

  const filtered = useMemo(() => assessments.filter(a =>
    !searchQuery || a.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.grade?.toLowerCase().includes(searchQuery.toLowerCase()) || a.assessed_by?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [assessments, searchQuery]);

  const stats = useMemo(() => ({
    total: assessments.length,
    avgScore: assessments.length ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_score || 0), 0) / assessments.length) : 0,
    gradeA: assessments.filter(a => a.grade === 'A').length,
    withRedFlags: assessments.filter(a => (a.red_flags || 0) > 0).length,
  }), [assessments]);

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="مؤشرات النضج المؤسسي والامتثال" subtitle="قياس وتقييم النضج التشغيلي والامتثال القانوني للمنشآت والنقابات"
        breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'مؤشرات النضج المؤسسي' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { exportReportToExcel({ title: 'تقييم النضج', reportType: 'statistics', data: filtered, columns: [{ key: 'entity_name', label: 'المنشأة' }, { key: 'overall_score', label: 'النتيجة' }, { key: 'grade', label: 'التقدير' }, { key: 'red_flags', label: 'التحذيرات' }, { key: 'assessed_by', label: 'المقيّم' }] }); toast.success('تم التصدير'); }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground"><Download className="w-4 h-4" />تصدير</button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"><Plus className="w-4 h-4" />تقييم جديد</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي التقييمات', value: stats.total, color: 'text-heading', icon: BarChart3 },
          { label: 'متوسط النتيجة', value: stats.avgScore, color: 'text-primary', icon: TrendingUp },
          { label: 'تقدير A', value: stats.gradeA, color: 'text-success', icon: Award },
          { label: 'تحذيرات حمراء', value: stats.withRedFlags, color: 'text-error', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="بحث بالمنشأة أو التقدير أو المقيّم..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="لا توجد تقييمات" icon={<TrendingUp className="w-14 h-14" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المنشأة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">النتيجة</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">التقدير</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">التحذيرات</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">المقيّم</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(a => {
                  const gv = GRADE_MAP[a.grade] || GRADE_MAP.D;
                  return (
                    <tr key={a.id} className="hover:bg-accent transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-heading">{a.entity_name || '—'}</td>
                      <td className="px-4 py-3 text-sm font-bold text-heading">{a.overall_score || 0}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${gv.bg} ${gv.color}`}>{gv.label} ({a.grade})</span></td>
                      <td className="px-4 py-3 text-sm text-center">
                        {(a.red_flags || 0) > 0 ? <span className="text-error font-semibold">{a.red_flags}</span> : <span className="text-success">0</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.assessed_by || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.assessment_date || '—'}</td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        <button onClick={() => setSelectedItem(a)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                        <button onClick={() => openEdit(a)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
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
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">تفاصيل تقييم النضج</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-primary/5 rounded-xl p-6 text-center">
                <p className="text-5xl font-black text-primary">{selectedItem.overall_score || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">النتيجة الإجمالية</p>
                <div className="mt-3">
                  {(() => { const gv = GRADE_MAP[selectedItem.grade] || GRADE_MAP.D; return <span className={`px-4 py-2 rounded-full text-sm font-bold ${gv.bg} ${gv.color}`}>{gv.label} ({selectedItem.grade})</span>; })()}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-heading">{(selectedItem as any)[key] || 0}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">التحذيرات الحمراء</p>
                  <p className="text-lg font-bold text-error">{selectedItem.red_flags || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">النقاط المفقودة</p>
                  <p className="text-lg font-bold text-warning">{selectedItem.missing_count || 0}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">التوصيات</p>
                <p className="text-sm font-semibold text-heading mt-1">{selectedItem.recommendations || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">المقيّم</p>
                  <p className="text-sm font-semibold text-heading mt-1">{selectedItem.assessed_by || '—'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="text-sm font-semibold text-heading mt-1">{selectedItem.assessment_date || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل' : 'تقييم جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">المنشأة</label>
                <select value={form.entity_id || ''} onChange={e => setForm({ ...form, entity_id: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                  <option value="">اختر المنشأة</option>
                  {entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.name_ar}</option>)}
                </select></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-semibold mb-1">النتيجة الإجمالية</label><input type="number" min={0} value={form.overall_score || ''} onChange={e => setForm({ ...form, overall_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">التقدير</label>
                  <select value={form.grade || ''} onChange={e => setForm({ ...form, grade: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm">
                    <option value="">اختر</option><option value="A">A - ممتاز</option><option value="B">B - جيد جداً</option><option value="C">C - جيد</option><option value="D">D - مقبول</option><option value="F">F - ضعيف</option>
                  </select></div>
                <div><label className="block text-sm font-semibold mb-1">التحذيرات</label><input type="number" min={0} value={form.red_flags || 0} onChange={e => setForm({ ...form, red_flags: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">الهوية</label><input type="number" min={0} max={10} value={form.identity_score || 0} onChange={e => setForm({ ...form, identity_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">الوصف</label><input type="number" min={0} max={10} value={form.description_score || 0} onChange={e => setForm({ ...form, description_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">المهام</label><input type="number" min={0} max={10} value={form.tasks_score || 0} onChange={e => setForm({ ...form, tasks_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">الكفاءات</label><input type="number" min={0} max={10} value={form.competencies_score || 0} onChange={e => setForm({ ...form, competencies_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">السلامة</label><input type="number" min={0} max={10} value={form.safety_score || 0} onChange={e => setForm({ ...form, safety_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">المسار</label><input type="number" min={0} max={10} value={form.career_score || 0} onChange={e => setForm({ ...form, career_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">الحوكمة</label><input type="number" min={0} max={10} value={form.governance_score || 0} onChange={e => setForm({ ...form, governance_score: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">النقاط المفقودة</label><input type="number" min={0} value={form.missing_count || 0} onChange={e => setForm({ ...form, missing_count: +e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div><label className="block text-sm font-semibold mb-1">التوصيات</label><textarea value={form.recommendations || ''} onChange={e => setForm({ ...form, recommendations: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">المقيّم</label><input value={form.assessed_by || ''} onChange={e => setForm({ ...form, assessed_by: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">التاريخ</label><input type="date" value={form.assessment_date || ''} onChange={e => setForm({ ...form, assessment_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
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
