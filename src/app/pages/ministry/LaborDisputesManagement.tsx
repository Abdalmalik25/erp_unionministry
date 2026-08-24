/**
 * LaborDisputesManagement — إدارة النزاعات العمالية
 * المنظومة الوطنية للعمل النقابي | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit2, Trash2, CheckCircle,
  X, ChevronRight, ChevronLeft, Scale,
  DollarSign, User, Building2, Download, Eye, Printer, ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useApi } from '../../hooks/useApi';

// ============================================================
// الأنواع
// ============================================================

type DisputeStatus = 'قيد النظر' | 'تم التسوية ودياً' | 'محال للقضاء العمالي';

interface LaborDispute {
  id: string;
  entity_id: string;
  entity_name: string;
  dispute_number: string;
  dispute_type: string;
  worker_name: string;
  employer_name: string;
  description: string;
  filing_date: string;
  status: DisputeStatus;
  resolution_date?: string;
  resolution_details?: string;
  compensation_amount?: number;
  legal_representation?: string;
  notes?: string;
}

interface Entity {
  id: string;
  name: string;
}

// ============================================================
// الثوابت
// ============================================================

const DISPUTE_TYPES = [
  'أجور ومستحقات مالية متأخرة',
  'فصل تعسفي وإنهاء عقد غير مبرر',
  'تعويض عن إصابات العمل والأمراض المهنية',
  'بدل إجازات ومكافأة نهاية الخدمة',
  'ساعات عمل إضافية وعطل رسمية',
  'تأمين صحي واشتراكات التأمينات الاجتماعية',
  'إخلال ببنود عقد العمل واللائحة الداخلية',
  'نزاع عمالي جماعي وظروف بيئة العمل',
];

const STATUS_CONFIG: Record<DisputeStatus, { label: string; color: string; bg: string; border: string }> = {
  'قيد النظر':            { label: 'قيد النظر',            color: 'text-info',       bg: 'bg-info/10',    border: 'border-info/20' },
  'تم التسوية ودياً':    { label: 'تم التسوية ودياً',    color: 'text-success',    bg: 'bg-success/10', border: 'border-success/20' },
  'محال للقضاء العمالي': { label: 'محال للقضاء العمالي', color: 'text-error',      bg: 'bg-error/10',   border: 'border-error/20' },
};

const PAGE_SIZE = 10;

// ============================================================
// النموذج
// ============================================================

interface FormValues {
  entity_id: string;
  dispute_number: string;
  dispute_type: string;
  worker_name: string;
  employer_name: string;
  description: string;
  filing_date: string;
  status: DisputeStatus;
  resolution_date: string;
  resolution_details: string;
  compensation_amount: number;
  legal_representation: string;
  notes: string;
}

function buildEmptyForm(): FormValues {
  return {
    entity_id: '',
    dispute_number: '',
    dispute_type: DISPUTE_TYPES[0],
    worker_name: '',
    employer_name: '',
    description: '',
    filing_date: '',
    status: 'قيد النظر',
    resolution_date: '',
    resolution_details: '',
    compensation_amount: 0,
    legal_representation: '',
    notes: '',
  };
}

// ============================================================
// المكوّن الرئيسي
// ============================================================

export default function LaborDisputesManagement() {
  const [disputes, setDisputes] = useState<LaborDispute[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewingDispute, setViewingDispute] = useState<LaborDispute | null>(null);
  const [editing, setEditing] = useState<LaborDispute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [formValues, setFormValues] = useState<FormValues>(buildEmptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const { confirm, dialog: confirmDialog } = useConfirm();
  const api = useApi();

  // تحميل البيانات
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [disputesResult, entitiesResult] = await Promise.allSettled([
          api.execute('/labor-disputes'),
          api.execute('/entities'),
        ]);
        if (disputesResult.status === 'fulfilled' && disputesResult.value?.data) {
          setDisputes(disputesResult.value.data);
        }
        if (entitiesResult.status === 'fulfilled' && entitiesResult.value?.data) {
          setEntities(entitiesResult.value.data);
        }
      } catch {
        toast.error('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [api]);

  // التصفية
  const filtered = useMemo(() => {
    return disputes.filter(d => {
      const q = searchQuery.trim();
      const matchSearch = !q || d.worker_name.includes(q) || d.employer_name.includes(q) || d.dispute_number.includes(q);
      const matchEntity = entityFilter === 'all' || d.entity_id === entityFilter;
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchSearch && matchEntity && matchStatus;
    });
  }, [disputes, searchQuery, entityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: disputes.length,
    pending: disputes.filter(d => d.status === 'قيد النظر').length,
    settled: disputes.filter(d => d.status === 'تم التسوية ودياً').length,
    court: disputes.filter(d => d.status === 'محال للقضاء العمالي').length,
    totalCompensation: disputes.reduce((sum, d) => sum + (d.compensation_amount ?? 0), 0),
  }), [disputes]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const parsed = type === 'number' ? Number(value) : value;
    setFormValues(prev => ({ ...prev, [name]: parsed }));
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  function validate(): boolean {
    const errs: Partial<Record<keyof FormValues, string>> = {};
    if (!formValues.entity_id) errs.entity_id = 'المنشأة مطلوب';
    if (!formValues.worker_name.trim()) errs.worker_name = 'اسم العامل مطلوب';
    if (!formValues.employer_name.trim()) errs.employer_name = 'اسم صاحب العمل مطلوب';
    if (!formValues.filing_date) errs.filing_date = 'تاريخ التقديم مطلوب';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const openAdd = useCallback(() => {
    setFormValues(buildEmptyForm());
    setFormErrors({});
    setEditing(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((dispute: LaborDispute) => {
    setFormValues({
      entity_id: dispute.entity_id,
      dispute_number: dispute.dispute_number,
      dispute_type: dispute.dispute_type,
      worker_name: dispute.worker_name,
      employer_name: dispute.employer_name,
      description: dispute.description,
      filing_date: dispute.filing_date,
      status: dispute.status,
      resolution_date: dispute.resolution_date ?? '',
      resolution_details: dispute.resolution_details ?? '',
      compensation_amount: dispute.compensation_amount ?? 0,
      legal_representation: dispute.legal_representation ?? '',
      notes: dispute.notes ?? '',
    });
    setFormErrors({});
    setEditing(dispute);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    try {
      if (editing) {
        await api.execute(`/labor-disputes/${editing.id}`, {
          method: 'PUT',
          body: formValues as unknown as Record<string, unknown>,
        });
        setDisputes(prev => prev.map(d => d.id === editing.id ? {
          ...d,
          ...formValues,
          entity_name: entities.find(e => e.id === formValues.entity_id)?.name ?? d.entity_name,
        } : d));
        logAudit({ action: 'update', resource: 'labor_dispute', resourceId: editing.id, details: formValues.dispute_number });
        toast.success('تم تحديث بيانات النزاع بنجاح');
      } else {
        const result = await api.execute('/labor-disputes', {
          method: 'POST',
          body: formValues as unknown as Record<string, unknown>,
        });
        if (result?.data) {
          setDisputes(prev => [...prev, result.data]);
        }
        logAudit({ action: 'create', resource: 'labor_dispute', resourceId: result?.data?.id ?? '', details: formValues.dispute_number });
        toast.success('تم تسجيل النزاع بنجاح');
      }
      setShowModal(false);
    } catch {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    }
  }, [editing, formValues, api, entities]);

  const handleDelete = useCallback(async (dispute: LaborDispute) => {
    const ok = await confirm({
      title: 'حذف النزاع',
      message: `هل أنت متأكد من حذف النزاع "${dispute.dispute_number}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.execute(`/labor-disputes/${dispute.id}`, { method: 'DELETE' });
      setDisputes(prev => prev.filter(d => d.id !== dispute.id));
      logAudit({ action: 'delete', resource: 'labor_dispute', resourceId: dispute.id, details: dispute.dispute_number });
      toast.success('تم حذف النزاع بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء حذف النزاع');
    }
  }, [confirm, api]);

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة النزاعات العمالية"
        subtitle="توثيق ومتابعة النزاعات العمالية والمسارات القانونية"
        breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'النزاعات العمالية' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { exportReportToExcel({ title: 'النزاعات العمالية', reportType: 'statistics', data: disputes, columns: [{ key: 'dispute_number', label: 'رقم النزاع' }, { key: 'worker_name', label: 'العامل' }, { key: 'employer_name', label: 'صاحب العمل' }, { key: 'dispute_type', label: 'النوع' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'labor_disputes', details: { count: disputes.length } }); toast.success('تم التصدير'); }}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <Download className="w-4 h-4" />تصدير
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              تسجيل نزاع جديد
            </button>
          </div>
        }
      />

      {loading && (
        <div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>
      )}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'إجمالي النزاعات', value: stats.total, color: 'text-primary bg-primary/10' },
          { label: 'قيد النظر', value: stats.pending, color: 'text-info bg-info/10' },
          { label: 'تم التسوية', value: stats.settled, color: 'text-success bg-success/10' },
          { label: 'محال للقضاء', value: stats.court, color: 'text-error bg-error/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Scale className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold text-heading">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>
        ))}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-success bg-success/10">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-heading">{stats.totalCompensation.toLocaleString('ar')}</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">إجمالي التعويضات (ريال)</p>
        </div>
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث باسم العامل أو صاحب العمل أو رقم النزاع..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={entityFilter}
              onChange={e => { setEntityFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
            >
              <option value="all">جميع المنشآت</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
            >
              <option value="all">جميع الحالات</option>
              <option value="قيد النظر">قيد النظر</option>
              <option value="تم التسوية ودياً">تم التسوية ودياً</option>
              <option value="محال للقضاء العمالي">محال للقضاء العمالي</option>
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      {!loading && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">رقم النزاع</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النوع</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">العامل</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">صاحب العمل</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">تاريخ التقديم</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">لا توجد نزاعات عمالية مسجلة</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((dispute, idx) => {
                    const stCfg = STATUS_CONFIG[dispute.status];
                    return (
                      <tr key={dispute.id} className="hover:bg-accent/50 transition-colors border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                            {dispute.dispute_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs max-w-[150px]">
                          <span className="line-clamp-1">{dispute.dispute_type}</span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="font-medium text-heading">{dispute.worker_name}</span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="text-muted-foreground">{dispute.employer_name}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{dispute.filing_date}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${stCfg.color} ${stCfg.bg} ${stCfg.border}`}>
                            {stCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingDispute(dispute)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                              title="معاينة وطباعة محضر النزاع والتسوية"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(dispute)}
                              className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(dispute)}
                              className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* الترقيم */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} نزاع
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-primary text-white' : 'hover:bg-accent text-muted-foreground'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-warning" />
                </div>
                <h2 className="font-bold text-heading">
                  {editing ? 'تعديل بيانات النزاع' : 'تسجيل نزاع جديد'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* المنشأة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المنشأة <span className="text-error">*</span>
                  </label>
                  <select
                    name="entity_id"
                    value={formValues.entity_id}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.entity_id ? 'border-error' : 'border-border'}`}
                  >
                    <option value="">اختر المنشأة...</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  {formErrors.entity_id && <p className="text-error text-xs mt-1">{formErrors.entity_id}</p>}
                </div>

                {/* رقم النزاع */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">رقم النزاع</label>
                  <input
                    type="text"
                    name="dispute_number"
                    value={formValues.dispute_number}
                    onChange={handleFormChange}
                    placeholder=" رقم تلقائي"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>

                {/* نوع النزاع */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">نوع النزاع</label>
                  <select
                    name="dispute_type"
                    value={formValues.dispute_type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
                  >
                    {DISPUTE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* حالة النزاع */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الحالة</label>
                  <select
                    name="status"
                    value={formValues.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card"
                  >
                    <option value="قيد النظر">قيد النظر</option>
                    <option value="تم التسوية ودياً">تم التسوية ودياً</option>
                    <option value="محال للقضاء العمالي">محال للقضاء العمالي</option>
                  </select>
                </div>

                {/* اسم العامل */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    اسم العامل <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="worker_name"
                    value={formValues.worker_name}
                    onChange={handleFormChange}
                    placeholder="اسم العامل"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.worker_name ? 'border-error' : 'border-border'}`}
                  />
                  {formErrors.worker_name && <p className="text-error text-xs mt-1">{formErrors.worker_name}</p>}
                </div>

                {/* صاحب العمل */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    صاحب العمل <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="employer_name"
                    value={formValues.employer_name}
                    onChange={handleFormChange}
                    placeholder="اسم صاحب العمل"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.employer_name ? 'border-error' : 'border-border'}`}
                  />
                  {formErrors.employer_name && <p className="text-error text-xs mt-1">{formErrors.employer_name}</p>}
                </div>

                {/* تاريخ التقديم */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    تاريخ التقديم <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    name="filing_date"
                    value={formValues.filing_date}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.filing_date ? 'border-error' : 'border-border'}`}
                  />
                  {formErrors.filing_date && <p className="text-error text-xs mt-1">{formErrors.filing_date}</p>}
                </div>

                {/* تاريخ التسوية */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">تاريخ التسوية</label>
                  <input
                    type="date"
                    name="resolution_date"
                    value={formValues.resolution_date}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>

                {/* مبلغ التعويض */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">مبلغ التعويض (ريال)</label>
                  <input
                    type="number"
                    name="compensation_amount"
                    value={formValues.compensation_amount}
                    onChange={handleFormChange}
                    min={0}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>

                {/* التمثيل القانوني */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">التمثيل القانوني</label>
                  <input
                    type="text"
                    name="legal_representation"
                    value={formValues.legal_representation}
                    onChange={handleFormChange}
                    placeholder="اسم المحامي أو مكتب المحاماة"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                  />
                </div>

                {/* وصف النزاع */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">وصف النزاع</label>
                  <textarea
                    name="description"
                    value={formValues.description}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="تفاصيل النزاع..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
                  />
                </div>

                {/* تفاصيل التسوية */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">تفاصيل التسوية</label>
                  <textarea
                    name="resolution_details"
                    value={formValues.resolution_details}
                    onChange={handleFormChange}
                    rows={2}
                    placeholder="تفاصيل تسوية النزاع إن وجدت..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
                  />
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">ملاحظات</label>
                  <textarea
                    name="notes"
                    value={formValues.notes}
                    onChange={handleFormChange}
                    rows={2}
                    placeholder="ملاحظات إضافية..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {editing ? 'حفظ التغييرات' : 'تسجيل النزاع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة وطباعة محضر النزاع والتسوية الرسمية */}
      {viewingDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-4xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <Scale size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-heading">ملف النزاع ومحضر الصلح والتسوية العمالية</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    رقم القيد: <strong className="font-mono text-primary font-bold">{viewingDispute.dispute_number}</strong> | المرجع: قانون العمل اليمني رقم (5) لعام 1995
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                  <Printer size={15} /> طباعة المحضر
                </button>
                <button
                  onClick={() => setViewingDispute(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
              {/* Government Header */}
              <div className="p-4 bg-muted/40 border border-border rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 border border-primary/20 rounded-xl flex items-center justify-center p-1 bg-white shadow-sm">
                    <BrandLogo size={52} rounded="lg" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-primary">الجمهورية اليمنية — وزارة الشؤون الاجتماعية والعمل</h4>
                    <p className="text-xs font-black text-heading mt-0.5">قطاع العمل — الإدارة العامة لعلاقات العمل وتفتيش السلامة</p>
                    <p className="text-[11px] text-muted-foreground">محضر جلسة توفيق وتسوية نزاع عمالي قانوني</p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs text-muted-foreground">
                  <p>تاريخ القيد: <strong>{viewingDispute.filing_date}</strong></p>
                  <p>الحالة: <strong className="text-primary">{viewingDispute.status}</strong></p>
                </div>
              </div>

              {/* Parties Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <User size={16} /> الطرف الأول (العامل الشاكي)
                  </div>
                  <h4 className="text-base font-bold text-heading">{viewingDispute.worker_name}</h4>
                  <p className="text-xs text-muted-foreground">التمثيل القانوني: {viewingDispute.legal_representation || 'أصيل عن نفسه'}</p>
                </div>

                <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <Building2 size={16} /> الطرف الثاني (صاحب العمل / المنشأة)
                  </div>
                  <h4 className="text-base font-bold text-heading">{viewingDispute.employer_name}</h4>
                  <p className="text-xs text-muted-foreground">المنشأة التابع: {viewingDispute.entity_name || 'منشأة مسجلة'}</p>
                </div>
              </div>

              {/* Dispute Type & Subject */}
              <div className="p-4.5 bg-card border border-border rounded-2xl space-y-2">
                <span className="text-xs font-bold text-muted-foreground">موضوع وطبيعة النزاع العمالي:</span>
                <h4 className="text-sm font-black text-heading">{viewingDispute.dispute_type}</h4>
                <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                  {viewingDispute.description || 'لا يوجد تفصيل إضافي مدون للوقائع.'}
                </p>
              </div>

              {/* Settlement / Resolution Details */}
              {viewingDispute.status === 'تم التسوية ودياً' && (
                <div className="p-4.5 bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-700 dark:text-emerald-400" />
                      <span>بنود اتفاقية الصلح الودي الملزمة (المادة 128 من قانون العمل)</span>
                    </h4>
                    {viewingDispute.resolution_date && (
                      <span className="text-xs font-mono font-bold">تاريخ الإبرام: {viewingDispute.resolution_date}</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">
                    {viewingDispute.resolution_details || 'تم التراضي والصلح الودي التام بين الطرفين وإبراء الذمة واستلام كافة المستحقات المقررة نظاماً.'}
                  </p>
                  {viewingDispute.compensation_amount && viewingDispute.compensation_amount > 0 && (
                    <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
                      <span className="text-xs font-bold">مبلغ التسوية والتعويض المالي المتفق عليه:</span>
                      <strong className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                        {viewingDispute.compensation_amount.toLocaleString()} ريال يمني
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* Signatures Box */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-center text-xs">
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-8">
                  <p className="font-bold text-heading">توقيع الطرف الأول (العامل)</p>
                  <p className="text-muted-foreground font-medium">..................................</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-8">
                  <p className="font-bold text-heading">توقيع الطرف الثاني (صاحب العمل)</p>
                  <p className="text-muted-foreground font-medium">..................................</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-8">
                  <p className="font-bold text-primary">اعتماد الباحث القانوني والموثق</p>
                  <p className="text-muted-foreground font-medium">ختم مكتب علاقات العمل الرسمي</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-end">
              <button
                onClick={() => setViewingDispute(null)}
                className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
