/**
 * LegalReferencesManagement — إدارة التشريعات والقوانين
 * DB tables: legal_references (id, law_name_ar, law_name_en, law_number, law_year, effective_date, status, summary)
 *           law_articles (id, legal_reference_id, article_number, title, content, scope, penalties, related_articles, weight)
 *           ilo_conventions (id, convention_number, title_ar, title_en, ratification_date, status, key_provisions, summary)
 *           international_standards (id, standard_code, standard_name, organization, description, version, issue_date, status, scope, key_requirements)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Search, Plus, Eye, Edit2, Trash2, RefreshCw, X, Download, Scale,
  BookOpen, Globe, FileText,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

type TabKey = 'legal' | 'articles' | 'ilo' | 'intl';

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'legal', label: 'التشريعات', icon: Scale },
  { key: 'articles', label: 'المقالات القانونية', icon: BookOpen },
  { key: 'ilo', label: 'اتفاقيات ILO', icon: Globe },
  { key: 'intl', label: 'المعايير الدولية', icon: FileText },
];

export function LegalReferencesManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('legal');
  const [legalRefs, setLegalRefs] = useState<any[]>([]);
  const [lawArticles, setLawArticles] = useState<any[]>([]);
  const [iloConventions, setIloConventions] = useState<any[]>([]);
  const [intlStandards, setIntlStandards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/legal-references');
      if (r.ok) {
        const data = await r.json();
        setLegalRefs(data.legal_references || []);
        setLawArticles(data.law_articles || []);
        setIloConventions(data.ilo_conventions || []);
        setIntlStandards(data.international_standards || []);
      }
      logAudit({ action: 'view', resource: 'legal_references' });
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const tableMap: Record<TabKey, string> = { legal: 'legal_references', articles: 'law_articles', ilo: 'ilo_conventions', intl: 'international_standards' };
    const table = tableMap[activeTab];
    const idCol = table === 'law_articles' ? 'id' : table === 'ilo_conventions' ? 'id' : table === 'international_standards' ? 'id' : 'id';
    const endpoint = editItem ? `/api/legal-references/${editItem[idCol]}` : '/api/legal-references';
    const method = editItem ? 'PUT' : 'POST';
    const body = { ...form, _table: table };
    try {
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowForm(false); setEditItem(null); setForm({}); fetchData(); }
      else { const e = await r.json(); toast.error(e.error || 'حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: string, table: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try {
      const r = await fetch(`/api/legal-references/${id}?table=${table}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); fetchData(); }
      else { toast.error('خطأ'); }
    } catch { toast.error('خطأ'); }
  };

  const openEdit = (item: any, type: string) => {
    setEditItem(item);
    const tableMap: Record<string, string> = { legal: 'legal_references', articles: 'law_articles', ilo: 'ilo_conventions', intl: 'international_standards' };
    setForm({ ...item, _table: tableMap[type] });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditItem(null);
    const tableMap: Record<TabKey, string> = { legal: 'legal_references', articles: 'law_articles', ilo: 'ilo_conventions', intl: 'international_standards' };
    setForm({ _table: tableMap[activeTab] });
    setShowForm(true);
  };

  const filteredLegal = legalRefs.filter(r => !searchQuery || r.law_name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) || r.law_number?.includes(searchQuery));
  const filteredArticles = lawArticles.filter(a => !searchQuery || a.title?.toLowerCase().includes(searchQuery.toLowerCase()) || a.article_number?.includes(searchQuery));
  const filteredIlo = iloConventions.filter(c => !searchQuery || c.title_ar?.toLowerCase().includes(searchQuery.toLowerCase()) || c.convention_number?.includes(searchQuery));
  const filteredIntl = intlStandards.filter(s => !searchQuery || s.standard_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.standard_code?.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentData = activeTab === 'legal' ? filteredLegal : activeTab === 'articles' ? filteredArticles : activeTab === 'ilo' ? filteredIlo : filteredIntl;

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader
        title="التشريعات والقوانين" subtitle="إدارة قوانين العمل واتفاقيات ILO والمعايير الدولية"
        breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'التشريعات' }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { exportReportToExcel({ title: 'التشريعات', reportType: 'statistics', data: currentData, columns: [{ key: 'law_name_ar', label: 'العنوان' }, { key: 'law_number', label: 'الرقم' }, { key: 'status', label: 'الحالة' }] }); toast.success('تم التصدير'); }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <Download className="w-4 h-4" />تصدير
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"><Plus className="w-4 h-4" />إضافة</button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="bg-card rounded-xl shadow-sm p-2 border border-border flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:bg-accent'}`}>
              <Icon className="w-4 h-4" />{tab.label}
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {tab.key === 'legal' ? legalRefs.length : tab.key === 'articles' ? lawArticles.length : tab.key === 'ilo' ? iloConventions.length : intlStandards.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">جاري التحميل...</p></div>
        ) : currentData.length === 0 ? (
          <EmptyState title="لا توجد بيانات" icon={<Scale className="w-14 h-14" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  {activeTab === 'legal' && (<><th className="px-4 py-3 text-right text-xs font-semibold">اسم القانون</th><th className="px-4 py-3 text-right text-xs font-semibold">الرقم</th><th className="px-4 py-3 text-right text-xs font-semibold">السنة</th><th className="px-4 py-3 text-right text-xs font-semibold">تاريخ النفاذ</th><th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th><th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th></>)}
                  {activeTab === 'articles' && (<><th className="px-4 py-3 text-right text-xs font-semibold">رقم المادة</th><th className="px-4 py-3 text-right text-xs font-semibold">العنوان</th><th className="px-4 py-3 text-right text-xs font-semibold">النطاق</th><th className="px-4 py-3 text-right text-xs font-semibold">الوزن</th><th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th></>)}
                  {activeTab === 'ilo' && (<><th className="px-4 py-3 text-right text-xs font-semibold">الرقم</th><th className="px-4 py-3 text-right text-xs font-semibold">العنوان (عربي)</th><th className="px-4 py-3 text-right text-xs font-semibold">العنوان (إنجليزي)</th><th className="px-4 py-3 text-right text-xs font-semibold">تاريخ التصديق</th><th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th><th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th></>)}
                  {activeTab === 'intl' && (<><th className="px-4 py-3 text-right text-xs font-semibold">الكود</th><th className="px-4 py-3 text-right text-xs font-semibold">الاسم</th><th className="px-4 py-3 text-right text-xs font-semibold">الجهة</th><th className="px-4 py-3 text-right text-xs font-semibold">الإصدار</th><th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th><th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th></>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeTab === 'legal' && filteredLegal.map(r => (
                  <tr key={r.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-heading">{r.law_name_ar}</td>
                    <td className="px-4 py-3 text-sm font-mono text-heading">{r.law_number}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.law_year}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.effective_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-sm">{r.status}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setSelectedItem(r)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => openEdit(r, 'legal')} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(r.id, 'legal_references')} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
                {activeTab === 'articles' && filteredArticles.map(a => (
                  <tr key={a.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-heading">{a.article_number}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-heading">{a.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.scope}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.weight}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setSelectedItem(a)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => openEdit(a, 'articles')} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(a.id, 'law_articles')} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
                {activeTab === 'ilo' && filteredIlo.map(c => (
                  <tr key={c.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-heading">{c.convention_number}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-heading">{c.title_ar}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.title_en}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.ratification_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-sm">{c.status}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setSelectedItem(c)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => openEdit(c, 'ilo')} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(c.id, 'ilo_conventions')} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
                {activeTab === 'intl' && filteredIntl.map(s => (
                  <tr key={s.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-heading">{s.standard_code}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-heading">{s.standard_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.organization}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.version}</td>
                    <td className="px-4 py-3 text-sm">{s.status}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setSelectedItem(s)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => openEdit(s, 'intl')} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(s.id, 'international_standards')} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 bg-muted border-t border-border text-sm text-muted-foreground">عرض {currentData.length} سجل</div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{selectedItem.law_name_ar || selectedItem.title || selectedItem.title_ar || selectedItem.standard_name}</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(selectedItem).filter(([k]) => !['_type', '_table', 'created_at', 'updated_at'].includes(k)).map(([k, v]) => (
                <div key={k} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="text-sm font-semibold text-heading mt-1">{String(v || '—')}</p>
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
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل' : 'إضافة جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              {activeTab === 'legal' && (<>
                <div><label className="block text-sm font-semibold mb-1">اسم القانون (عربي) *</label><input value={form.law_name_ar || ''} onChange={e => setForm({ ...form, law_name_ar: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">اسم القانون (إنجليزي)</label><input value={form.law_name_en || ''} onChange={e => setForm({ ...form, law_name_en: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-semibold mb-1">رقم القانون</label><input value={form.law_number || ''} onChange={e => setForm({ ...form, law_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                  <div><label className="block text-sm font-semibold mb-1">سنة الإصدار</label><input type="number" value={form.law_year || ''} onChange={e => setForm({ ...form, law_year: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                </div>
                <div><label className="block text-sm font-semibold mb-1">تاريخ النفاذ</label><input type="date" value={form.effective_date || ''} onChange={e => setForm({ ...form, effective_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">الحالة</label><select value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="active">نشط</option><option value="suspended">معلق</option><option value="replaced">ملغي</option></select></div>
                <div><label className="block text-sm font-semibold mb-1">الملخص</label><textarea value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              </>)}
              {activeTab === 'articles' && (<>
                <div><label className="block text-sm font-semibold mb-1">رقم المادة *</label><input value={form.article_number || ''} onChange={e => setForm({ ...form, article_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">عنوان المادة *</label><input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">نص المادة</label><textarea value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={4} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-semibold mb-1">النطاق</label><input value={form.scope || ''} onChange={e => setForm({ ...form, scope: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                  <div><label className="block text-sm font-semibold mb-1">الوزن</label><input type="number" min={0} max={10} value={form.weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                </div>
                <div><label className="block text-sm font-semibold mb-1">العقوبات</label><textarea value={form.penalties || ''} onChange={e => setForm({ ...form, penalties: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={2} /></div>
              </>)}
              {activeTab === 'ilo' && (<>
                <div><label className="block text-sm font-semibold mb-1">رقم الاتفاقية *</label><input value={form.convention_number || ''} onChange={e => setForm({ ...form, convention_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">العنوان (عربي) *</label><input value={form.title_ar || ''} onChange={e => setForm({ ...form, title_ar: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">العنوان (إنجليزي)</label><input value={form.title_en || ''} onChange={e => setForm({ ...form, title_en: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">تاريخ التصديق</label><input type="date" value={form.ratification_date || ''} onChange={e => setForm({ ...form, ratification_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">الحالة</label><select value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="ratified">معتمدة</option><option value="pending">قيد المراجعة</option></select></div>
                <div><label className="block text-sm font-semibold mb-1">الملخص</label><textarea value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              </>)}
              {activeTab === 'intl' && (<>
                <div><label className="block text-sm font-semibold mb-1">الكود *</label><input value={form.standard_code || ''} onChange={e => setForm({ ...form, standard_code: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" placeholder="ISO 45001" /></div>
                <div><label className="block text-sm font-semibold mb-1">الاسم *</label><input value={form.standard_name || ''} onChange={e => setForm({ ...form, standard_name: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-semibold mb-1">الجهة</label><input value={form.organization || ''} onChange={e => setForm({ ...form, organization: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                  <div><label className="block text-sm font-semibold mb-1">الإصدار</label><input value={form.version || ''} onChange={e => setForm({ ...form, version: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                </div>
                <div><label className="block text-sm font-semibold mb-1">تاريخ الإصدار</label><input type="date" value={form.issue_date || ''} onChange={e => setForm({ ...form, issue_date: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">النطاق</label><input value={form.scope || ''} onChange={e => setForm({ ...form, scope: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">الوصف</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
              </>)}
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
