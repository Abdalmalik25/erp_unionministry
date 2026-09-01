/**
 * LaborRecordsManager — مكوّن config-driven لإدارة سجلات قطاع شؤون العمل
 * يولّد: جدول + بحث + فلاتر + نموذج ديناميكي + إحصاءات + تصدير CSV
 * من التكوين في laborRecordsConfig.ts — أي سجل جديد يُضاف بالتكوين فقط.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, Eye, Edit2, Trash2, RefreshCw, ChevronRight, ChevronLeft,
  X, Loader2, Download, CheckCircle, Info,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import { useConfirm } from '../ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import type { RecordConfig, FieldDef } from '../../utils/laborRecordsConfig';
import { getBadgeColor } from '../../utils/laborRecordsConfig';
import { useGovernorates } from '../../hooks/useReferenceData';

const PAGE_SIZE = 10;

interface LaborRecordsManagerProps {
  config: RecordConfig;
}

interface RecordRow {
  id: string;
  [key: string]: any;
}

function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) return '-';
  if (type === 'date') {
    if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
    return String(value);
  }
  if (type === 'boolean') return value ? 'نعم' : 'لا';
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('ar-EG') : String(value);
  }
  return String(value);
}

function buildEmptyForm(config: RecordConfig): Record<string, any> {
  const form: Record<string, any> = {};
  for (const f of config.fields) {
    form[f.name] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : '';
  }
  return form;
}

export function LaborRecordsManager({ config }: LaborRecordsManagerProps) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<RecordRow | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RecordRow | null>(null);
  const [form, setForm] = useState<Record<string, any>>(() => buildEmptyForm(config));
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const { governorates, isLoading: govLoading } = useGovernorates();

  const baseUrl = `/api/${config.resource}`;

  const isGovernorate = (name: string) => name === 'governorate' || name.includes('governorate');

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    for (const [k, v] of Object.entries(activeFilters)) {
      if (v) params.set(k, v);
    }
    return params.toString();
  }, [searchQuery, activeFilters]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}?${queryParams}`);
      if (r.ok) {
        const d = await r.json();
        setRecords(d.data || []);
      } else {
        toast.error('فشل تحميل البيانات');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    }
    setLoading(false);
  }, [baseUrl, queryParams]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/labor-records/stats');
      if (r.ok) {
        const d = await r.json();
        setStats(d?.data ?? d);
      }
    } catch { /* stats اختيارية */ }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const resetForm = useCallback(() => {
    setForm(buildEmptyForm(config));
    setEditItem(null);
  }, [config]);

  const handleSave = async () => {
    // تحقق الحقول المطلوبة
    for (const f of config.fields) {
      if (f.required) {
        const v = form[f.name];
        if (v === '' || v === null || v === undefined) {
          toast.error(`الحقل المطلوب مفقود: ${f.label}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem ? `${baseUrl}/${editItem.id}` : baseUrl;
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        toast.success(editItem ? 'تم التحديث بنجاح' : 'تم الإضافة بنجاح');
        logAudit({
          action: editItem ? 'update' : 'create',
          resource: config.table,
          resourceId: editItem?.id,
          details: form[config.displayField] || '',
        });
        setShowForm(false);
        resetForm();
        fetchRecords();
        fetchStats();
      } else {
        const err = await r.json().catch(() => ({ error: 'خطأ غير معروف' }));
        toast.error(err.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.',
      confirmLabel: 'نعم، حذف',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const r = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
      if (r.ok) {
        toast.success('تم الحذف بنجاح');
        logAudit({ action: 'delete', resource: config.table, resourceId: id, details: 'delete' });
        fetchRecords();
        fetchStats();
      } else {
        toast.error('فشل الحذف');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    }
  };

  // تصدير CSV
  const handleExport = () => {
    if (records.length === 0) { toast.info('لا توجد بيانات للتصدير'); return; }
    const headers = ['id', ...config.columns.map(c => c.key)];
    const csv = [
      headers.join(','),
      ...records.map(row => headers.map(h => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(',')),
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.resource}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const paginated = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // --- حقل نموذج ديناميكي ---
  const renderField = (field: FieldDef) => {
    const value = form[field.name];
    const base = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring';
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value ?? ''}
            onChange={e => setForm({ ...form, [field.name]: e.target.value })}
            rows={3}
            className={`${base} resize-none`}
            placeholder={field.placeholder}
          />
        );
      case 'select':
        return (
          <select
            value={value ?? ''}
            onChange={e => setForm({ ...form, [field.name]: e.target.value })}
            className={base}
          >
            <option value="">— اختر —</option>
            {(isGovernorate(field.name) ? (govLoading ? field.options ?? [] : governorates) : (field.options ?? [])).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={value ?? 0}
            onChange={e => setForm({ ...form, [field.name]: e.target.value === '' ? 0 : Number(e.target.value) })}
            className={base}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value ?? ''}
            onChange={e => setForm({ ...form, [field.name]: e.target.value })}
            className={base}
          />
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => setForm({ ...form, [field.name]: e.target.checked })}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">{field.label}</span>
          </label>
        );
      case 'email':
        return (
          <input
            type="email"
            dir="ltr"
            value={value ?? ''}
            onChange={e => setForm({ ...form, [field.name]: e.target.value })}
            className={`${base} text-left`}
            placeholder={field.placeholder || 'name@example.com'}
          />
        );
      case 'phone':
        return (
          <input
            type="tel"
            dir="ltr"
            value={value ?? ''}
            onChange={e => setForm({ ...form, [field.name]: e.target.value })}
            className={`${base} text-left`}
            placeholder={field.placeholder || '+967...'}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={e => setForm({ ...form, [field.name]: e.target.value })}
            className={base}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // عند فتح النموذج للتعديل: تعبئة القيم الحالية
  const openEdit = (row: RecordRow) => {
    const nextForm: Record<string, any> = buildEmptyForm(config);
    for (const f of config.fields) {
      if (row[f.name] !== undefined) nextForm[f.name] = row[f.name];
    }
    setForm(nextForm);
    setEditItem(row);
    setShowForm(true);
  };

  const Icon = config.icon;

  return (
    <div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 border border-border text-foreground px-4 py-2 rounded-lg text-sm hover:bg-accent/50 font-medium transition-colors">
              <Download className="w-4 h-4" /> تصدير CSV
            </button>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90 font-medium"
            >
              <Plus className="w-4 h-4" /> إضافة جديد
            </button>
          </div>
        }
      />

      {/* بطاقة إحصائية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي {config.title}</p>
            <p className="text-xl font-bold text-heading">{stats?.[config.table] ?? records.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">السجلات المعروضة</p>
            <p className="text-xl font-bold text-heading">{records.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">حالة البحث</p>
            <p className="text-xl font-bold text-heading">{searchQuery ? 'نشط' : 'عام'}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">حقول النموذج</p>
            <p className="text-xl font-bold text-heading">{config.fields.length}</p>
          </div>
        </div>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/25"
          />
        </div>
        {config.filters.map(f => (
          <select
            key={f.key}
            value={activeFilters[f.key] || ''}
            onChange={e => {
              setActiveFilters(prev => ({ ...prev, [f.key]: e.target.value }));
              setCurrentPage(1);
            }}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/25"
          >
            <option value="">{f.label}: الكل</option>
            {(isGovernorate(f.key) ? (govLoading ? f.options : governorates) : f.options).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <button
          onClick={() => { fetchRecords(); }}
          className="p-2 border border-border rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* الجدول */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>
      ) : records.length === 0 ? (
        <EmptyState title="لا توجد سجلات" description="لم يتم العثور على بيانات" />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">#</th>
                {config.columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-right font-semibold text-muted-foreground">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((row, idx) => (
                <tr key={row.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {(currentPage - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  {config.columns.map(col => {
                    const raw = row[col.key];
                    const badge = col.type === 'badge';
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-xs ${badge ? '' : 'text-foreground'}`}
                      >
                        {badge ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(String(raw ?? ''))}`}>
                            {formatValue(raw, 'text')}
                          </span>
                        ) : (
                          <span className={col.type === 'number' ? 'font-mono' : ''}>
                            {formatValue(raw, col.type)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelected(row); setShowDetail(true); }}
                        className="p-1.5 text-primary-bright hover:bg-info/10 rounded-lg transition-colors"
                        title="عرض"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 text-success-dark hover:bg-success/10 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ترقيم الصفحات */}
      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, records.length)}–{Math.min(currentPage * PAGE_SIZE, records.length)} من {records.length} سجل
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-card border border-border disabled:opacity-40 text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors border ${p === currentPage ? 'bg-primary text-white border-primary' : 'bg-card hover:bg-accent/50 text-muted-foreground border-border'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-card border border-border disabled:opacity-40 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- نافذة التفاصيل --- */}
      {showDetail && selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-card rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">تفاصيل السجل</h3>
              <button onClick={() => setShowDetail(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {config.columns.map(col => (
                <div key={col.key} className="flex justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">{col.label}:</span>
                  <span className="font-medium text-heading text-left">
                    {col.type === 'badge' ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(String(selected[col.key] ?? ''))}`}>
                        {formatValue(selected[col.key], 'text')}
                      </span>
                    ) : formatValue(selected[col.key], col.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- نافذة النموذج --- */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">
                {editItem ? `تعديل: ${form[config.displayField] || ''}` : `إضافة جديد — ${config.title}`}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.fields.map(field => (
                <div key={field.name} className={field.colSpan === 2 ? 'md:col-span-2' : ''}>
                  {field.type !== 'boolean' && (
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      {field.label} {field.required && <span className="text-error">*</span>}
                    </label>
                  )}
                  {renderField(field)}
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-border">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent/50 text-muted-foreground transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 font-medium flex items-center gap-2 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editItem ? 'تحديث' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}