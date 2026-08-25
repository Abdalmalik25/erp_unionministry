/**
* ExpatriateLicensesManagement — إدارة تراخيص الأجانب
* المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
*/
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, CheckCircle, X, ChevronRight, ChevronLeft, Globe, AlertTriangle, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useApi } from '../../hooks/useApi';
// ============================================================
// الأنواع
// ============================================================
type LicenseStatus = 'نشط' | 'منتهي' | 'ملغي';
interface ExpatriateLicense {
    id: string;
    entity_id: string;
    entity_name: string;
    license_number: string;
    worker_name: string;
    nationality: string;
    passport_number: string;
    occupation: string;
    issue_date: string;
    expiry_date: string;
    status: LicenseStatus;
    sponsor_name: string;
    work_permit_number: string;
    notes?: string;
}
interface Entity {
    id: string;
    name: string;
}
// ============================================================
// الثوابت
// ============================================================
const STATUS_CONFIG: Record<LicenseStatus, {
    label: string;
    color: string;
    bg: string;
    border: string;
}> = {
    'نشط': { label: 'نشط', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    'منتهي': { label: 'منتهي', color: 'text-error', bg: 'bg-error/10', border: 'border-error/20' },
    'ملغي': { label: 'ملغي', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
};
const PAGE_SIZE = 10;
// ============================================================
// النموذج
// ============================================================
interface FormValues {
    entity_id: string;
    license_number: string;
    worker_name: string;
    nationality: string;
    passport_number: string;
    occupation: string;
    issue_date: string;
    expiry_date: string;
    status: LicenseStatus;
    sponsor_name: string;
    work_permit_number: string;
    notes: string;
}
function buildEmptyForm(): FormValues {
    return {
        entity_id: '',
        license_number: '',
        worker_name: '',
        nationality: '',
        passport_number: '',
        occupation: '',
        issue_date: '',
        expiry_date: '',
        status: 'نشط',
        sponsor_name: '',
        work_permit_number: '',
        notes: '',
    };
}
// ============================================================
// المكوّن الرئيسي
// ============================================================
export default function ExpatriateLicensesManagement() {
    const [licenses, setLicenses] = useState<ExpatriateLicense[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ExpatriateLicense | null>(null);
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
                const [licensesResult, entitiesResult] = await Promise.allSettled([
                    api.execute('/expatriate-licenses'),
                    api.execute('/entities'),
                ]);
                if (licensesResult.status === 'fulfilled' && licensesResult.value?.data) {
                    setLicenses(licensesResult.value.data);
                }
                if (entitiesResult.status === 'fulfilled' && entitiesResult.value?.data) {
                    setEntities(entitiesResult.value.data);
                }
            }
            catch {
                toast.error('حدث خطأ أثناء تحميل البيانات');
            }
            finally {
                setLoading(false);
            }
        };
        load();
    }, [api]);
    // التصفية
    const filtered = useMemo(() => {
        return licenses.filter(l => {
            const q = searchQuery.trim();
            const matchSearch = !q || l.worker_name.includes(q) || l.license_number.includes(q) || l.nationality.includes(q);
            const matchEntity = entityFilter === 'all' || l.entity_id === entityFilter;
            const matchStatus = statusFilter === 'all' || l.status === statusFilter;
            return matchSearch && matchEntity && matchStatus;
        });
    }, [licenses, searchQuery, entityFilter, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: licenses.length,
        active: licenses.filter(l => l.status === 'نشط').length,
        expired: licenses.filter(l => l.status === 'منتهي').length,
        cancelled: licenses.filter(l => l.status === 'ملغي').length,
    }), [licenses]);
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }, []);
    function validate(): boolean {
        const errs: Partial<Record<keyof FormValues, string>> = {};
        if (!formValues.entity_id)
            errs.entity_id = 'المنشأة مطلوب';
        if (!formValues.worker_name.trim())
            errs.worker_name = 'اسم العامل مطلوب';
        if (!formValues.license_number.trim())
            errs.license_number = 'رقم الترخيص مطلوب';
        if (!formValues.issue_date)
            errs.issue_date = 'تاريخ الإصدار مطلوب';
        if (!formValues.expiry_date)
            errs.expiry_date = 'تاريخ الانتهاء مطلوب';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    }
    const openAdd = useCallback(() => {
        setFormValues(buildEmptyForm());
        setFormErrors({});
        setEditing(null);
        setShowModal(true);
    }, []);
    const openEdit = useCallback((license: ExpatriateLicense) => {
        setFormValues({
            entity_id: license.entity_id,
            license_number: license.license_number,
            worker_name: license.worker_name,
            nationality: license.nationality,
            passport_number: license.passport_number,
            occupation: license.occupation,
            issue_date: license.issue_date,
            expiry_date: license.expiry_date,
            status: license.status,
            sponsor_name: license.sponsor_name,
            work_permit_number: license.work_permit_number,
            notes: license.notes ?? '',
        });
        setFormErrors({});
        setEditing(license);
        setShowModal(true);
    }, []);
    const handleSave = useCallback(async () => {
        if (!validate())
            return;
        try {
            if (editing) {
                await api.execute(`/expatriate-licenses/${editing.id}`, {
                    method: 'PUT',
                    body: formValues as unknown as Record<string, unknown>,
                });
                setLicenses(prev => prev.map(l => l.id === editing.id ? {
                    ...l,
                    ...formValues,
                    entity_name: entities.find(e => e.id === formValues.entity_id)?.name ?? l.entity_name,
                } : l));
                logAudit({ action: 'update', resource: 'expatriate_license', resourceId: editing.id, details: formValues.license_number });
                toast.success('تم تحديث بيانات الترخيص بنجاح');
            }
            else {
                const result = await api.execute('/expatriate-licenses', {
                    method: 'POST',
                    body: formValues as unknown as Record<string, unknown>,
                });
                if (result?.data) {
                    setLicenses(prev => [...prev, result.data]);
                }
                logAudit({ action: 'create', resource: 'expatriate_license', resourceId: result?.data?.id ?? '', details: formValues.license_number });
                toast.success('تم تسجيل الترخيص بنجاح');
            }
            setShowModal(false);
        }
        catch {
            toast.error('حدث خطأ أثناء حفظ البيانات');
        }
    }, [editing, formValues, api, entities]);
    const handleDelete = useCallback(async (license: ExpatriateLicense) => {
        const ok = await confirm({
            title: 'حذف الترخيص',
            message: `هل أنت متأكد من حذف ترخيص "${license.license_number}" للعامل "${license.worker_name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
            confirmLabel: 'حذف',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            await api.execute(`/expatriate-licenses/${license.id}`, { method: 'DELETE' });
            setLicenses(prev => prev.filter(l => l.id !== license.id));
            logAudit({ action: 'delete', resource: 'expatriate_license', resourceId: license.id, details: license.license_number });
            toast.success('تم حذف الترخيص بنجاح');
        }
        catch {
            toast.error('حدث خطأ أثناء حذف الترخيص');
        }
    }, [confirm, api]);
    // ============================================================
    // العرض
    // ============================================================
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة تراخيص الأجانب" subtitle="إدارة تراخيص العمل والإقامة للعمالة الوافدة" breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'تراخيص الأجانب' }]} actions={<div className="flex items-center gap-2">
            <button onClick={() => { exportReportToExcel({ title: 'تراخيص الأجانب', reportType: 'statistics', data: licenses, columns: [{ key: 'license_number', label: 'رقم الترخيص' }, { key: 'worker_name', label: 'العامل' }, { key: 'employer_name', label: 'صاحب العمل' }, { key: 'license_type', label: 'النوع' }, { key: 'expiry_date', label: 'تاريخ الانتهاء' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'expatriate_licenses', details: { count: licenses.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <Download className="w-4 h-4"/>تصدير
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
              <Plus className="w-4 h-4"/>
              إضافة ترخيص
            </button>
          </div>}/>

      {loading && (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"/>
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>)}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'إجمالي التراخيص', value: stats.total, color: 'text-primary bg-primary/10' },
            { label: 'نشطة', value: stats.active, color: 'text-success bg-success/10' },
            { label: 'منتهية', value: stats.expired, color: 'text-error bg-error/10' },
            { label: 'ملغية', value: stats.cancelled, color: 'text-muted-foreground bg-muted' },
        ].map(stat => (<div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Globe className="w-4 h-4"/>
              </div>
              <span className="text-2xl font-bold text-heading">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </div>))}
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" placeholder="البحث باسم العامل أو رقم الترخيص أو الجنسية..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground"/>
            <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
              <option value="all">جميع المنشآت</option>
              {entities.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
              <option value="all">جميع الحالات</option>
              <option value="نشط">نشط</option>
              <option value="منتهي">منتهي</option>
              <option value="ملغي">ملغي</option>
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      {!loading && (<div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">رقم الترخيص</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">اسم العامل</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الجنسية</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المهنة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الكفيل</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">تاريخ الانتهاء</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (<tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3"/>
                      <p className="text-muted-foreground font-medium">لا توجد تراخيص أجانب مسجلة</p>
                    </td>
                  </tr>) : (paginated.map((license, idx) => {
                const stCfg = STATUS_CONFIG[license.status];
                const isExpiringSoon = new Date(license.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && license.status === 'نشط';
                return (<tr key={license.id} className="hover:bg-accent/50 transition-colors border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-muted text-foreground px-2 py-0.5 rounded">
                            {license.license_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>
                            <p className="font-medium text-heading">{license.worker_name}</p>
                            <p className="text-muted-foreground font-mono text-[10px] mt-0.5">
                              جواز: {license.passport_number}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3"/>
                            {license.nationality}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{license.occupation}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="text-muted-foreground">{license.sponsor_name}</span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="flex items-center gap-1">
                            {isExpiringSoon && (<AlertTriangle className="w-3 h-3 text-warning"/>)}
                            <span className={`font-mono ${isExpiringSoon ? 'text-warning-dark font-semibold' : 'text-muted-foreground'}`}>
                              {license.expiry_date}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${stCfg.color} ${stCfg.bg} ${stCfg.border}`}>
                            {stCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(license)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors" title="تعديل">
                              <Edit2 className="w-4 h-4"/>
                            </button>
                            <button onClick={() => handleDelete(license)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </td>
                      </tr>);
            }))}
              </tbody>
            </table>
          </div>

          {/* الترقيم */}
          {filtered.length > 0 && (<div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} ترخيص
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground">
                  <ChevronRight className="w-4 h-4"/>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setCurrentPage(p)} className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-primary text-white' : 'hover:bg-accent text-muted-foreground'}`}>
                    {p}
                  </button>))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 text-muted-foreground">
                  <ChevronLeft className="w-4 h-4"/>
                </button>
              </div>
            </div>)}
        </div>)}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-info/15 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-info"/>
                </div>
                <h2 className="font-bold text-heading">
                  {editing ? 'تعديل بيانات الترخيص' : 'إضافة ترخيص جديد'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* المنشأة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المنشأة <span className="text-error">*</span>
                  </label>
                  <select name="entity_id" value={formValues.entity_id} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.entity_id ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر المنشأة...</option>
                    {entities.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
                  </select>
                  {formErrors.entity_id && <p className="text-error text-xs mt-1">{formErrors.entity_id}</p>}
                </div>

                {/* رقم الترخيص */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    رقم الترخيص <span className="text-error">*</span>
                  </label>
                  <input type="text" name="license_number" value={formValues.license_number} onChange={handleFormChange} placeholder="رقم الترخيص" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.license_number ? 'border-error' : 'border-border'}`}/>
                  {formErrors.license_number && <p className="text-error text-xs mt-1">{formErrors.license_number}</p>}
                </div>

                {/* اسم العامل */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    اسم العامل <span className="text-error">*</span>
                  </label>
                  <input type="text" name="worker_name" value={formValues.worker_name} onChange={handleFormChange} placeholder="الاسم الكامل" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.worker_name ? 'border-error' : 'border-border'}`}/>
                  {formErrors.worker_name && <p className="text-error text-xs mt-1">{formErrors.worker_name}</p>}
                </div>

                {/* الجنسية */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الجنسية</label>
                  <input type="text" name="nationality" value={formValues.nationality} onChange={handleFormChange} placeholder="الجنسية" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* رقم الجواز */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">رقم جواز السفر</label>
                  <input type="text" name="passport_number" value={formValues.passport_number} onChange={handleFormChange} placeholder="رقم الجواز" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* المهنة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">المهنة</label>
                  <input type="text" name="occupation" value={formValues.occupation} onChange={handleFormChange} placeholder="المهنة" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* الكفيل */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">اسم الكفيل</label>
                  <input type="text" name="sponsor_name" value={formValues.sponsor_name} onChange={handleFormChange} placeholder="اسم الكفيل" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* رقم تصريح العمل */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">رقم تصريح العمل</label>
                  <input type="text" name="work_permit_number" value={formValues.work_permit_number} onChange={handleFormChange} placeholder="رقم تصريح العمل" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* تاريخ الإصدار */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    تاريخ الإصدار <span className="text-error">*</span>
                  </label>
                  <input type="date" name="issue_date" value={formValues.issue_date} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.issue_date ? 'border-error' : 'border-border'}`}/>
                  {formErrors.issue_date && <p className="text-error text-xs mt-1">{formErrors.issue_date}</p>}
                </div>

                {/* تاريخ الانتهاء */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    تاريخ الانتهاء <span className="text-error">*</span>
                  </label>
                  <input type="date" name="expiry_date" value={formValues.expiry_date} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.expiry_date ? 'border-error' : 'border-border'}`}/>
                  {formErrors.expiry_date && <p className="text-error text-xs mt-1">{formErrors.expiry_date}</p>}
                </div>

                {/* الحالة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الحالة</label>
                  <select name="status" value={formValues.status} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
                    <option value="نشط">نشط</option>
                    <option value="منتهي">منتهي</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">ملاحظات</label>
                  <textarea name="notes" value={formValues.notes} onChange={handleFormChange} rows={3} placeholder="ملاحظات إضافية..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"/>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                {editing ? 'حفظ التغييرات' : 'إضافة الترخيص'}
              </button>
            </div>
          </div>
        </div>)}

      {confirmDialog}
    </div>);
}
