/**
 * InspectionsManagement — إدارة التفتيش الدوري
 * المنظومة الوطنية للعمل النقابي | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Eye, Edit2, Trash2, Plus, RefreshCw, ClipboardCheck, X,
  ChevronRight, ChevronLeft, Download, Printer, ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { BrandLogo } from '../../components/ui/BrandLogo';

interface Inspection {
  id: string;
  entity_id: string;
  entity_name: string;
  inspection_number: string;
  inspection_type: string;
  inspection_date: string;
  inspector_name: string;
  inspector_title: string;
  compliance_status: string;
  overall_score: number;
  labor_law_score: number;
  safety_score: number;
  training_score: number;
  yemenization_score: number;
  management_score: number;
  documentation_score: number;
  labor_law_articles: string;
  yemeni_decrees: string;
  international_standards: string;
  recommendations: string;
  strengths: string;
  weaknesses: string;
  next_inspection_date: string;
  evaluation_model: string;
  evaluation_level: string;
  report_url: string;
  notes: string;
}

const INSPECTION_TYPES = [
  { value: 'routine', label: 'روتينية' },
  { value: 'emergency', label: 'طارئة' },
  { value: 'annual', label: 'سنوية' },
  { value: 'followup', label: 'متابعة' },
];

const COMPLIANCE_CONFIG: Record<string, { label: string; color: string }> = {
  fully_compliant: { label: 'متوافق بالكامل', color: 'bg-green-100 text-green-700' },
  partially_compliant: { label: 'متوافق جزئياً', color: 'bg-yellow-100 text-yellow-700' },
  non_compliant: { label: 'غير متوافق', color: 'bg-red-100 text-red-700' },
};

const EVALUATION_LEVELS = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];

const PAGE_SIZE = 10;

type TabKey = 'basic' | 'scores' | 'legal' | 'recommendations';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'المعلومات الأساسية' },
  { key: 'scores', label: 'الدرجات' },
  { key: 'legal', label: 'الامتثال القانوني' },
  { key: 'recommendations', label: 'التوصيات' },
];

const emptyForm = {
  entity_id: '', entity_name: '', inspection_number: '', inspection_type: 'routine',
  inspection_date: '', inspector_name: '', inspector_title: '', compliance_status: 'fully_compliant',
  overall_score: 0, labor_law_score: 0, safety_score: 0, training_score: 0,
  yemenization_score: 0, management_score: 0, documentation_score: 0,
  labor_law_articles: '', yemeni_decrees: '', international_standards: '',
  recommendations: '', strengths: '', weaknesses: '', next_inspection_date: '',
  evaluation_model: '', evaluation_level: '', report_url: '', notes: '',
};

function getScoreColor(score: number) {
  if (score > 80) return 'text-green-600 bg-green-100';
  if (score > 60) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

export default function InspectionsManagement() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [viewingInspection, setViewingInspection] = useState<Inspection | null>(null);
  const [editItem, setEditItem] = useState<Inspection | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabKey>('basic');
  const [form, setForm] = useState(emptyForm);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('inspection_type', typeFilter);
      if (complianceFilter) params.set('compliance_status', complianceFilter);
      const r = await fetch(`/api/inspections?${params}`);
      if (r.ok) {
        const d = await r.json();
        setInspections(d.inspections || d.data || []);
      } else { toast.error('فشل تحميل البيانات'); }
    } catch { toast.error('خطأ في الاتصال بالخادم'); }
    setLoading(false);
  }, [typeFilter, complianceFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!searchQuery) return inspections;
    const q = searchQuery.toLowerCase();
    return inspections.filter(i =>
      i.entity_name?.toLowerCase().includes(q) || i.inspection_number?.toLowerCase().includes(q) || i.inspector_name?.toLowerCase().includes(q)
    );
  }, [inspections, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: inspections.length,
    compliant: inspections.filter(i => i.compliance_status === 'fully_compliant').length,
    partial: inspections.filter(i => i.compliance_status === 'partially_compliant').length,
    nonCompliant: inspections.filter(i => i.compliance_status === 'non_compliant').length,
  }), [inspections]);

  const calcOverallScore = useCallback((f: typeof emptyForm) => {
    const scores = [f.labor_law_score, f.safety_score, f.training_score, f.yemenization_score, f.management_score, f.documentation_score].filter(s => s > 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, []);

  const updateForm = (field: string, value: string | number) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      next.overall_score = calcOverallScore(next);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.entity_name || !form.inspection_number) {
      toast.error('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem ? `/api/inspections/${editItem.id}` : '/api/inspections';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (r.ok) {
        toast.success(editItem ? 'تم تحديث التفتيش' : 'تم إنشاء التفتيش');
        logAudit({ action: editItem ? 'update' : 'create', resource: 'inspection', details: form });
        setShowForm(false); setEditItem(null); fetchData();
      } else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف هذا التفتيش؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try {
      const r = await fetch(`/api/inspections/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'inspection', details: { id } }); fetchData(); }
      else { toast.error('فشل الحذف'); }
    } catch { toast.error('خطأ'); }
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setSelectedTab('basic'); setShowForm(true); };
  const openEdit = (item: Inspection) => { setEditItem(item); setForm({ ...emptyForm, ...item }); setSelectedTab('basic'); setShowForm(true); };

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="إدارة التفتيش الدوري" subtitle="متابعة ومراقبة عمليات التفتيش على المنشآت"
        actions={<button onClick={() => { exportReportToExcel({ title: 'التفتيشات', reportType: 'statistics', data: inspections, columns: [{ key: 'inspection_number', label: 'رقم التفتيش' }, { key: 'enterprise_name', label: 'المنشأة' }, { key: 'inspector_name', label: 'المفتتش' }, { key: 'inspection_date', label: 'التاريخ' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'inspections', details: { count: inspections.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"><Download size={16} />تصدير</button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-heading">{stats.total}</div>
          <div className="text-xs text-muted-foreground">إجمالي التفتيشات</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.compliant}</div>
          <div className="text-xs text-muted-foreground">متوافق بالكامل</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
          <div className="text-xs text-muted-foreground">متوافق جزئياً</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.nonCompliant}</div>
          <div className="text-xs text-muted-foreground">غير متوافق</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث بالاسم أو رقم التفتيش..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm bg-card text-heading" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع الأنواع</option>
          {INSPECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={complianceFilter} onChange={e => { setComplianceFilter(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع حالات الامتثال</option>
          <option value="fully_compliant">متوافق بالكامل</option>
          <option value="partially_compliant">متوافق جزئياً</option>
          <option value="non_compliant">غير متوافق</option>
        </select>
        <button onClick={fetchData} className="p-2 border border-border rounded-lg hover:bg-accent"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4" /> تفتيش جديد
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">لا توجد تفتيشات مسجلة</div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">رقم التفتيش</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المنشأة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">النوع</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">التاريخ</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الامتثال</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الدرجة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium text-heading">{item.inspection_number}</td>
                    <td className="px-4 py-3 text-heading">{item.entity_name}</td>
                    <td className="px-4 py-3 text-xs">{INSPECTION_TYPES.find(t => t.value === item.inspection_type)?.label || item.inspection_type}</td>
                    <td className="px-4 py-3 text-xs">{item.inspection_date || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${COMPLIANCE_CONFIG[item.compliance_status]?.color || ''}`}>
                        {COMPLIANCE_CONFIG[item.compliance_status]?.label || item.compliance_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(item.overall_score)}`}>
                        {item.overall_score}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewingInspection(item)} className="p-1.5 hover:bg-primary/10 rounded text-primary cursor-pointer" title="معاينة وطباعة تقرير التفتيش الرسمي"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-accent rounded cursor-pointer" title="تعديل"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive cursor-pointer" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent"><ChevronRight className="w-4 h-4" /></button>
              <span className="text-sm text-muted-foreground">صفحة {currentPage} من {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent"><ChevronLeft className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل التفتيش' : 'تفتيش جديد'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div className="flex gap-1 border border-border rounded-lg p-1 mb-4">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setSelectedTab(tab.key)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {selectedTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">اسم المنشأة *</label>
                    <input value={form.entity_name} onChange={e => updateForm('entity_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">رقم التفتيش *</label>
                    <input value={form.inspection_number} onChange={e => updateForm('inspection_number', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">نوع التفتيش</label>
                    <select value={form.inspection_type} onChange={e => updateForm('inspection_type', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                      {INSPECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">تاريخ التفتيش</label>
                    <input type="date" value={form.inspection_date} onChange={e => updateForm('inspection_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">اسم المفتش</label>
                    <input value={form.inspector_name} onChange={e => updateForm('inspector_name', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">لقب المفتش</label>
                    <input value={form.inspector_title} onChange={e => updateForm('inspector_title', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">حالة الامتثال</label>
                    <select value={form.compliance_status} onChange={e => updateForm('compliance_status', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                      <option value="fully_compliant">متوافق بالكامل</option>
                      <option value="partially_compliant">متوافق جزئياً</option>
                      <option value="non_compliant">غير متوافق</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">تاريخ التفتيش القادم</label>
                    <input type="date" value={form.next_inspection_date} onChange={e => updateForm('next_inspection_date', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">ملاحظات</label>
                  <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                </div>
              </div>
            )}

            {selectedTab === 'scores' && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 text-center mb-4">
                  <div className="text-xs text-muted-foreground mb-1">الدرجة الإجمالية (تلقائي)</div>
                  <div className={`text-3xl font-bold ${form.overall_score > 80 ? 'text-green-600' : form.overall_score > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {form.overall_score}%
                  </div>
                </div>
                {[
                  { field: 'labor_law_score', label: 'قانون العمل' },
                  { field: 'safety_score', label: 'السلامة' },
                  { field: 'training_score', label: 'التدريب' },
                  { field: 'yemenization_score', label: 'اليمنة' },
                  { field: 'management_score', label: 'الإدارة' },
                  { field: 'documentation_score', label: 'التوثيق' },
                ].map(({ field, label }) => (
                  <div key={field} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-heading">{label}</label>
                      <input type="number" min={0} max={100} value={form[field as keyof typeof form] as number}
                        onChange={e => updateForm(field, Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-20 border border-border rounded px-2 py-1 text-sm text-center bg-card" />
                    </div>
                    <input type="range" min={0} max={100} value={form[field as keyof typeof form] as number}
                      onChange={e => updateForm(field, Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary" />
                  </div>
                ))}
              </div>
            )}

            {selectedTab === 'legal' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">مواد قانون العمل</label>
                  <textarea value={form.labor_law_articles} onChange={e => updateForm('labor_law_articles', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">القرارات اليمنية</label>
                  <textarea value={form.yemeni_decrees} onChange={e => updateForm('yemeni_decrees', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">المعايير الدولية</label>
                  <textarea value={form.international_standards} onChange={e => updateForm('international_standards', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">نقاط القوة</label>
                    <textarea value={form.strengths} onChange={e => updateForm('strengths', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">نقاط الضعف</label>
                    <textarea value={form.weaknesses} onChange={e => updateForm('weaknesses', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'recommendations' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-heading">التوصيات</label>
                  <textarea value={form.recommendations} onChange={e => updateForm('recommendations', e.target.value)} rows={6} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">نموذج التقييم</label>
                    <input value={form.evaluation_model} onChange={e => updateForm('evaluation_model', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">مستوى التقييم</label>
                    <select value={form.evaluation_level} onChange={e => updateForm('evaluation_level', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                      <option value="">—</option>
                      {EVALUATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent">إلغاء</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">{editItem ? 'تحديث' : 'إنشاء'}</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة وطباعة تقرير التفتيش الميداني الرسمي */}
      {viewingInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-4xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-heading">تقرير وتوثيق محضر التفتيش الميداني</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    رقم المحضر: <strong className="font-mono text-primary font-bold">{viewingInspection.inspection_number}</strong> | المرجع: قانون العمل اليمني رقم (5) لعام 1995
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                  <Printer size={15} /> طباعة التقرير
                </button>
                <button
                  onClick={() => setViewingInspection(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
              {/* Government Header */}
              <div className="p-4 bg-muted/40 border border-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 border border-primary/20 rounded-xl flex items-center justify-center p-1 bg-white shadow-sm">
                    <BrandLogo size={52} rounded="lg" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-primary">الجمهورية اليمنية — وزارة الشؤون الاجتماعية والعمل</h4>
                    <p className="text-xs font-black text-heading mt-0.5">الإدارة العامة لتفتيش العمل والسلامة والصحة المهنية (OSH)</p>
                    <p className="text-[11px] text-muted-foreground">شهادة ومحضر تفتيش ميداني دوري معتمد</p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs text-muted-foreground">
                  <p>تاريخ التفتيش: <strong>{viewingInspection.inspection_date || '—'}</strong></p>
                  <p>المفتش المعتمد: <strong className="text-primary">{viewingInspection.inspector_name || 'مفتش معتمد'}</strong></p>
                </div>
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-card border border-border text-center">
                  <p className="text-[11px] text-muted-foreground">المنشأة الخاضعة للتفتيش</p>
                  <p className="text-sm font-black text-heading mt-0.5">{viewingInspection.entity_name}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-card border border-border text-center">
                  <p className="text-[11px] text-muted-foreground">نوع التفتيش</p>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {INSPECTION_TYPES.find(t => t.value === viewingInspection.inspection_type)?.label || viewingInspection.inspection_type}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-card border border-border text-center">
                  <p className="text-[11px] text-muted-foreground">حالة الامتثال</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    {COMPLIANCE_CONFIG[viewingInspection.compliance_status]?.label || viewingInspection.compliance_status}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-card border border-border text-center">
                  <p className="text-[11px] text-muted-foreground">الدرجة الكلية</p>
                  <p className="text-lg font-black text-primary mt-0.5">{viewingInspection.overall_score}%</p>
                </div>
              </div>

              {/* Inspection Scores Breakdown */}
              <div className="p-4.5 bg-card border border-border rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>نتائج تقييم محاور التفتيش الستة</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                    <span>قانون العمل اليمني</span>
                    <strong className="text-primary font-bold font-mono">{viewingInspection.labor_law_score}%</strong>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                    <span>السلامة المهنية (OSH)</span>
                    <strong className="text-emerald-600 font-bold font-mono">{viewingInspection.safety_score}%</strong>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                    <span>التدريب والتأهيل</span>
                    <strong className="text-indigo-600 font-bold font-mono">{viewingInspection.training_score}%</strong>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                    <span>كوتة اليمننة (80%)</span>
                    <strong className="text-emerald-600 font-bold font-mono">{viewingInspection.yemenization_score}%</strong>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                    <span>الإدارة والتنظيم</span>
                    <strong className="text-amber-600 font-bold font-mono">{viewingInspection.management_score}%</strong>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                    <span>التوثيق والسجلات</span>
                    <strong className="text-blue-600 font-bold font-mono">{viewingInspection.documentation_score}%</strong>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {viewingInspection.recommendations && (
                <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-primary">توجيهات وتوصيات فريق التفتيش:</h4>
                  <p className="text-xs text-foreground leading-relaxed">{viewingInspection.recommendations}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border text-center text-xs">
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-8">
                  <p className="font-bold text-heading">توقيع ممثل المنشأة المستلم</p>
                  <p className="text-muted-foreground font-medium">..................................</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-8">
                  <p className="font-bold text-primary">توقيع واعتماد مفتش العمل</p>
                  <p className="text-muted-foreground font-medium">ختم إدارة التفتيش الرسمي</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-end">
              <button
                onClick={() => setViewingInspection(null)}
                className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}