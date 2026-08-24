/**
 * EvaluationCertificatesManagement — إدارة شهادات التقييم
 * المنظومة الوطنية للعمل النقابي | وزارة الشؤون الاجتماعية والعمل
 *
 * Integrates:
 *   - Profession linkage (profession_id) + standard version + assessed_against_standards
 *   - Hybrid extensible custom fields (custom_data JSONB described by custom_field_definitions)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Edit2, Trash2, Plus, RefreshCw, X, Settings,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import DynamicFieldRenderer from '../../components/DynamicFieldRenderer';
import CustomFieldManager from '../../components/CustomFieldManager';
import { validateFieldValues } from '../../utils/dynamicFieldValidation';

interface EvaluationCertificate {
  id: string;
  entity_id: string;
  entity_name: string;
  certificate_number: string;
  certificate_name: string;
  certificate_type: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  issuing_authority: string;
  validity_period: string;
  overall_score: number;
  labor_law_compliance: number;
  safety_compliance: number;
  training_compliance: number;
  yemenization_compliance: number;
  certified_occupations: string;
  evaluation_summary: string;
  issued_by: string;
  approved_by: string;
  report_url: string;
  notes: string;
  profession_id?: string;
  profession_name?: string;
  standard_version?: string;
  assessed_against_standards?: boolean;
  custom_data?: Record<string, any>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  valid: { label: 'صالحة', color: 'bg-green-100 text-green-700' },
  conditional: { label: 'شرطية', color: 'bg-yellow-100 text-yellow-700' },
  revoked: { label: 'ملغاة', color: 'bg-red-100 text-red-700' },
};

const CERT_TYPES = [
  { value: 'evaluation', label: 'شهادة تقييم' },
  { value: 'compliance', label: 'شهادة امتثال' },
  { value: 'accreditation', label: 'شهادة اعتماد' },
  { value: 'quality', label: 'شهادة جودة' },
];

const PAGE_SIZE = 10;

type TabKey = 'basic' | 'compliance' | 'custom';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: 'المعلومات الأساسية' },
  { key: 'compliance', label: 'درجات الامتثال' },
  { key: 'custom', label: 'حقول مخصصة' },
];

const emptyForm = {
  entity_id: '', entity_name: '', certificate_number: '', certificate_name: '',
  certificate_type: 'evaluation', issue_date: '', expiry_date: '', status: 'valid',
  issuing_authority: '', validity_period: '', overall_score: 0, labor_law_compliance: 0,
  safety_compliance: 0, training_compliance: 0, yemenization_compliance: 0,
  certified_occupations: '', evaluation_summary: '', issued_by: '', approved_by: '',
  report_url: '', notes: '',
  profession_id: '', standard_version: 'v1.0', assessed_against_standards: false, custom_data: {},
};

function ComplianceBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? 'bg-green-500' : value > 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium text-heading">{value}%</span></div>
      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export default function EvaluationCertificatesManagement() {
  const [certificates, setCertificates] = useState<EvaluationCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<EvaluationCertificate | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabKey>('basic');
  const [form, setForm] = useState<any>(emptyForm);
  const [professions, setProfessions] = useState<any[]>([]);
  const [fieldDefs, setFieldDefs] = useState<any[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/evaluation-certificates?${params}`);
      if (r.ok) {
        const d = await r.json();
        const rows: EvaluationCertificate[] = d.certificates || d.data || [];
        const profMap = new Map(professions.map(p => [p.id, p.name_ar]));
        setCertificates(rows.map(c => ({ ...c, profession_name: c.profession_id ? profMap.get(c.profession_id) || '—' : '—' })));
      } else { toast.error('فشل تحميل البيانات'); }
    } catch { toast.error('خطأ في الاتصال بالخادم'); }
    setLoading(false);
  }, [statusFilter, professions]);

  const loadProfessions = useCallback(async () => {
    try {
      const r = await fetch('/api/professions?last_level=true&limit=500');
      if (r.ok) { const d = await r.json(); setProfessions(d.data || d.professions || []); }
    } catch { /* non-fatal */ }
  }, []);

  const loadFieldDefs = useCallback(async () => {
    try {
      const r = await fetch('/api/custom-field-definitions?entity_type=evaluation_certificates&active=true');
      if (r.ok) { const d = await r.json(); setFieldDefs(d.data || []); }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadProfessions(); loadFieldDefs(); }, [loadProfessions, loadFieldDefs]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!searchQuery) return certificates;
    const q = searchQuery.toLowerCase();
    return certificates.filter(c =>
      c.entity_name?.toLowerCase().includes(q) || c.certificate_number?.toLowerCase().includes(q) || c.certificate_name?.toLowerCase().includes(q) || c.profession_name?.toLowerCase().includes(q)
    );
  }, [certificates, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: certificates.length,
    valid: certificates.filter(c => c.status === 'valid').length,
    conditional: certificates.filter(c => c.status === 'conditional').length,
    revoked: certificates.filter(c => c.status === 'revoked').length,
  }), [certificates]);

  const calcOverall = useCallback((f: typeof emptyForm) => {
    const scores = [f.labor_law_compliance, f.safety_compliance, f.training_compliance, f.yemenization_compliance].filter(s => s > 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, []);

  const updateForm = (field: string, value: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [field]: value };
      next.overall_score = calcOverall(next);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.entity_name || !form.certificate_number) {
      toast.error('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    if (fieldDefs.length) {
      const cv = validateFieldValues(fieldDefs, form.custom_data || {});
      if (!cv.valid) {
        setFieldErrors(cv.errors);
        setSelectedTab('custom');
        toast.error('بعض الحقول المخصصة غير صالحة');
        return;
      }
      setFieldErrors({});
      form.custom_data = cv.normalized;
    }
    if (form.assessed_against_standards && !form.profession_id) {
      toast.error('لا يمكن اعتماد مقابل معايير دون ربط المهنة');
      return;
    }
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem ? `/api/evaluation-certificates/${editItem.id}` : '/api/evaluation-certificates';
      const payload = {
        ...form,
        profession_id: form.profession_id || null,
        assessed_against_standards: !!form.assessed_against_standards,
        custom_data: form.custom_data || {},
      };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) {
        toast.success(editItem ? 'تم تحديث الشهادة' : 'تم إنشاء الشهادة');
        logAudit({ action: editItem ? 'update' : 'create', resource: 'evaluation_certificate', details: payload });
        setShowForm(false); setEditItem(null); fetchData();
      } else {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error || 'حدث خطأ');
      }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف هذه الشهادة؟', confirmLabel: 'نعم', variant: 'danger' });
    if (!ok) return;
    try {
      const r = await fetch(`/api/evaluation-certificates/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'evaluation_certificate', details: { id } }); fetchData(); }
      else { toast.error('فشل الحذف'); }
    } catch { toast.error('خطأ'); }
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setFieldErrors({}); setSelectedTab('basic'); setShowForm(true); };
  const openEdit = (item: EvaluationCertificate) => {
    setEditItem(item);
    setForm({ ...emptyForm, ...item, custom_data: item.custom_data || {} });
    setFieldErrors({});
    setSelectedTab('basic'); setShowForm(true);
  };

  const handleExport = () => {
    const reportable = fieldDefs.filter(d => d.reportable !== false);
    const extraCols = reportable.map(d => ({ key: `cf_${d.field_key}`, label: d.label }));
    const rows = filtered.map(c => {
      const row: any = { ...c };
      for (const def of reportable) row[`cf_${def.field_key}`] = c.custom_data?.[def.field_key] ?? '';
      return row;
    });
    exportReportToExcel({
      title: 'شهادات التقييم',
      reportType: 'compliance',
      data: rows,
      columns: [
        { key: 'entity_name', label: 'المنشأة' },
        { key: 'certificate_number', label: 'الرقم' },
        { key: 'certificate_name', label: 'الاسم' },
        { key: 'profession_name', label: 'المهنة' },
        { key: 'status', label: 'الحالة' },
        ...extraCols,
      ],
    });
  };

  const isExpired = (date: string) => date && new Date(date) < new Date();

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة شهادات التقييم" subtitle="شهادات تقييم المنشآت والامتثال لمعايير المهنة" />
      {confirmDialog}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الشهادات', value: stats.total, color: 'bg-card text-heading' },
          { label: 'صالحة', value: stats.valid, color: 'bg-green-50 text-green-700' },
          { label: 'شرطية', value: stats.conditional, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'ملغاة', value: stats.revoked, color: 'bg-red-50 text-red-700' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-80">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث بالمنشأة أو رقم الشهادة أو المهنة..." className="w-full pr-9 pl-3 py-2 rounded-lg border bg-background text-foreground" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="py-2 px-3 rounded-lg border bg-background">
          <option value="">كل الحالات</option>
          <option value="valid">صالحة</option>
          <option value="conditional">شرطية</option>
          <option value="revoked">ملغاة</option>
        </select>
        <button onClick={() => fetchData()} className="flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-muted"><RefreshCw className="h-4 w-4" /> تحديث</button>
        <PermissionGate permission="evaluation_certificate:create">
          <button onClick={openCreate} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> شهادة جديدة</button>
        </PermissionGate>
        <button onClick={handleExport} className="flex items-center gap-1 px-3 py-2 rounded-lg border">تصدير</button>
      </div>

      <div className="rounded-xl border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-right p-3">المنشأة</th>
                <th className="text-right p-3">رقم الشهادة</th>
                <th className="text-right p-3">المهنة</th>
                <th className="text-right p-3">النوع</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">الصلاحية</th>
                <th className="text-right p-3">الدرجة</th>
                <th className="text-right p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">جارٍ التحميل...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد شهادات</td></tr>
              ) : paginated.map(c => {
                const sc = STATUS_CONFIG[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.entity_name}</td>
                    <td className="p-3">{c.certificate_number}</td>
                    <td className="p-3">{c.profession_name}</td>
                    <td className="p-3">{(CERT_TYPES.find(t => t.value === c.certificate_type) || {}).label || c.certificate_type}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${sc.color}`}>{sc.label}</span></td>
                    <td className="p-3">{c.expiry_date ? (<span className={isExpired(c.expiry_date) ? 'text-red-600' : 'text-green-600'}>{c.expiry_date}</span>) : '—'}</td>
                    <td className="p-3">{c.overall_score}%</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-muted"><Edit2 className="h-4 w-4" /></button>
                      <PermissionGate permission="evaluation_certificate:delete">
                        <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </PermissionGate>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-3 border-t text-sm">
          <span className="text-muted-foreground">صفحة {currentPage} من {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-40">السابق</button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-40">التالي</button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-2xl my-8 rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">{editItem ? 'تعديل شهادة' : 'شهادة تقييم جديدة'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex gap-1 p-3 border-b">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setSelectedTab(t.key)} className={`px-4 py-2 rounded-lg text-sm ${selectedTab === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{t.label}</button>
              ))}
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="اسم المنشأة *" value={form.entity_name} onChange={v => updateForm('entity_name', v)} />
                  <Field label="رقم الشهادة *" value={form.certificate_number} onChange={v => updateForm('certificate_number', v)} />
                  <Field label="اسم الشهادة" value={form.certificate_name} onChange={v => updateForm('certificate_name', v)} />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">نوع الشهادة</label>
                    <select value={form.certificate_type} onChange={e => updateForm('certificate_type', e.target.value)} className="w-full py-2 px-3 rounded-lg border bg-background">
                      {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <Field label="تاريخ الإصدار" type="date" value={form.issue_date} onChange={v => updateForm('issue_date', v)} />
                  <Field label="تاريخ الانتهاء" type="date" value={form.expiry_date} onChange={v => updateForm('expiry_date', v)} />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">الحالة</label>
                    <select value={form.status} onChange={e => updateForm('status', e.target.value)} className="w-full py-2 px-3 rounded-lg border bg-background">
                      <option value="valid">صالحة</option>
                      <option value="conditional">شرطية</option>
                      <option value="revoked">ملغاة</option>
                    </select>
                  </div>
                  <Field label="جهة الإصدار" value={form.issuing_authority} onChange={v => updateForm('issuing_authority', v)} />
                  <Field label="مدة الصلاحية" value={form.validity_period} onChange={v => updateForm('validity_period', v)} />
                  <Field label="المُصدر" value={form.issued_by} onChange={v => updateForm('issued_by', v)} />
                  <Field label="المعتمد" value={form.approved_by} onChange={v => updateForm('approved_by', v)} />
                  <Field label="رابط التقرير" value={form.report_url} onChange={v => updateForm('report_url', v)} />
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-muted-foreground">ملخص التقييم</label>
                    <textarea value={form.evaluation_summary} onChange={e => updateForm('evaluation_summary', e.target.value)} className="w-full py-2 px-3 rounded-lg border bg-background min-h-[70px]" />
                  </div>

                  <div className="space-y-1 md:col-span-2 border-t pt-3">
                    <label className="text-xs font-medium text-heading">ربط المهنة والمعايير</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs text-muted-foreground">المهنة</label>
                        <select value={form.profession_id} onChange={e => updateForm('profession_id', e.target.value)} className="w-full py-2 px-3 rounded-lg border bg-background">
                          <option value="">— غير محددة —</option>
                          {professions.map(p => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
                        </select>
                      </div>
                      <Field label="إصدار المعيار" value={form.standard_version} onChange={v => updateForm('standard_version', v)} />
                    </div>
                    <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!form.assessed_against_standards} disabled={!form.profession_id} onChange={e => updateForm('assessed_against_standards', e.target.checked)} className="h-4 w-4" />
                      <span>مُقيّمة ومطابقة للمعايير {!form.profession_id && <span className="text-xs text-muted-foreground">(يلزم ربط المهنة)</span>}</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedTab === 'compliance' && (
                <div className="space-y-4">
                  <ComplianceBar label="الامتثال لقانون العمل" value={form.labor_law_compliance} />
                  <SliderField label="قانون العمل (%)" value={form.labor_law_compliance} onChange={v => updateForm('labor_law_compliance', v)} />
                  <SliderField label="السلامة والصحة (%)" value={form.safety_compliance} onChange={v => updateForm('safety_compliance', v)} />
                  <SliderField label="التدريب (%)" value={form.training_compliance} onChange={v => updateForm('training_compliance', v)} />
                  <SliderField label="التيمنة / التوطين (%)" value={form.yemenization_compliance} onChange={v => updateForm('yemenization_compliance', v)} />
                  <div className="p-3 rounded-lg bg-muted/40 text-sm">الدرجة الإجمالية المحسوبة: <span className="font-bold">{form.overall_score}%</span></div>
                  <Field label="المهن المعتمدة" value={form.certified_occupations} onChange={v => updateForm('certified_occupations', v)} />
                </div>
              )}

              {selectedTab === 'custom' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الحقول المخصصة المُعرّفة ({fieldDefs.length})</span>
                    <button onClick={() => setShowManager(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-sm"><Settings className="h-3.5 w-3.5" /> إدارة الحقول</button>
                  </div>
                  {fieldDefs.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">لا توجد حقول مخصصة. استخدم "إدارة الحقول" لإضافة حقول جديدة بسهولة.</div>
                  ) : (
                    <DynamicFieldRenderer
                      definitions={fieldDefs}
                      values={form.custom_data}
                      errors={fieldErrors}
                      onChange={(key, value) => updateForm('custom_data', { ...form.custom_data, [key]: value })}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border">إلغاء</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">حفظ</button>
            </div>
          </div>
        </div>
      )}

      <CustomFieldManager
        entityType="evaluation_certificates"
        open={showManager}
        onClose={() => setShowManager(false)}
        onChanged={() => { loadFieldDefs(); }}
      />
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: any) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full py-2 px-3 rounded-lg border bg-background" />
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}%</span></div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}


