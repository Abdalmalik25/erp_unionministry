/**
 * BoardMembersManagement — إدارة أعضاء المجالس
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { Plus, Search, Filter, Edit2, Trash2, CheckCircle, X, ChevronRight, ChevronLeft, Users, Calendar, Mail, Phone, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useApi } from '../../hooks/useApi';
// ============================================================
// الأنواع
// ============================================================
type BoardPosition = 'رئيس' | 'نائب رئيس' | 'أمين عام' | 'أمين صندوق' | 'عضو';
interface BoardMember {
    id: string;
    entity_id: string;
    entity_name: string;
    member_name: string;
    position: BoardPosition;
    appointment_date: string;
    term_start: string;
    term_end: string;
    status: 'نشط' | 'منتهي' | 'معلق';
    phone?: string;
    email?: string;
    notes?: string;
}
interface Entity {
    id: string;
    name: string;
}
// ============================================================
// الثوابت
// ============================================================
const POSITIONS: BoardPosition[] = ['رئيس', 'نائب رئيس', 'أمين عام', 'أمين صندوق', 'عضو'];
const POSITION_COLORS: Record<BoardPosition, string> = {
    'رئيس': 'bg-primary/10 text-primary border-primary/20',
    'نائب رئيس': 'bg-info/10 text-info border-info/20',
    'أمين عام': 'bg-warning/10 text-warning-dark border-warning/20',
    'أمين صندوق': 'bg-success/10 text-success border-success/20',
    'عضو': 'bg-muted text-muted-foreground border-border',
};
const STATUS_CONFIG: Record<string, {
    label: string;
    color: string;
}> = {
    'نشط': { label: 'نشط', color: 'bg-success/10 text-success border-success/20' },
    'منتهي': { label: 'منتهي', color: 'bg-error/10 text-error border-error/20' },
    'معلق': { label: 'معلق', color: 'bg-warning/10 text-warning-dark border-warning/20' },
};
const PAGE_SIZE = 10;
// ============================================================
// النموذج
// ============================================================
interface FormValues {
    entity_id: string;
    member_name: string;
    position: BoardPosition;
    appointment_date: string;
    term_start: string;
    term_end: string;
    status: 'نشط' | 'منتهي' | 'معلق';
    phone: string;
    email: string;
    notes: string;
}
function buildEmptyForm(): FormValues {
    return {
        entity_id: '',
        member_name: '',
        position: 'عضو',
        appointment_date: '',
        term_start: '',
        term_end: '',
        status: 'نشط',
        phone: '',
        email: '',
        notes: '',
    };
}
// ============================================================
// المكوّن الرئيسي
// ============================================================
export default function BoardMembersManagement() {
    const [members, setMembers] = useState<BoardMember[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<BoardMember | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [entityFilter, setEntityFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState<string>('all');
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
                const [membersResult, entitiesResult] = await Promise.allSettled([
                    api.execute('/board-members'),
                    api.execute('/entities'),
                ]);
                if (membersResult.status === 'fulfilled' && membersResult.value?.data) {
                    setMembers(membersResult.value.data);
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
        return members.filter(m => {
            const q = debouncedSearch.trim();
            const matchSearch = !q || m.member_name.includes(q) || m.entity_name.includes(q);
            const matchEntity = entityFilter === 'all' || m.entity_id === entityFilter;
            const matchPosition = positionFilter === 'all' || m.position === positionFilter;
            return matchSearch && matchEntity && matchPosition;
        });
    }, [members, debouncedSearch, entityFilter, positionFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: members.length,
        active: members.filter(m => m.status === 'نشط').length,
        expired: members.filter(m => m.status === 'منتهي').length,
        pending: members.filter(m => m.status === 'معلق').length,
    }), [members]);
    // التحقق من النموذج
    function validate(): boolean {
        const errs: Partial<Record<keyof FormValues, string>> = {};
        if (!formValues.entity_id)
            errs.entity_id = 'النقابة أو المنظمة مطلوب';
        if (!formValues.member_name.trim())
            errs.member_name = 'اسم العضو مطلوب';
        if (!formValues.appointment_date)
            errs.appointment_date = 'تاريخ التعيين مطلوب';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    }
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }, []);
    const openAdd = useCallback(() => {
        setFormValues(buildEmptyForm());
        setFormErrors({});
        setEditing(null);
        setShowModal(true);
    }, []);
    const openEdit = useCallback((member: BoardMember) => {
        setFormValues({
            entity_id: member.entity_id,
            member_name: member.member_name,
            position: member.position,
            appointment_date: member.appointment_date,
            term_start: member.term_start,
            term_end: member.term_end,
            status: member.status,
            phone: member.phone ?? '',
            email: member.email ?? '',
            notes: member.notes ?? '',
        });
        setFormErrors({});
        setEditing(member);
        setShowModal(true);
    }, []);
    const handleSave = useCallback(async () => {
        if (!validate())
            return;
        try {
            if (editing) {
                await api.execute(`/board-members/${editing.id}`, {
                    method: 'PUT',
                    body: formValues as unknown as Record<string, unknown>,
                });
                setMembers(prev => prev.map(m => m.id === editing.id ? { ...m, ...formValues, entity_name: entities.find(e => e.id === formValues.entity_id)?.name ?? m.entity_name } as BoardMember : m));
                logAudit({ action: 'update', resource: 'board_member', resourceId: editing.id, details: formValues.member_name });
                toast.success('تم تحديث بيانات العضو بنجاح');
            }
            else {
                const result = await api.execute('/board-members', {
                    method: 'POST',
                    body: formValues as unknown as Record<string, unknown>,
                });
                if (result?.board_member) {
                    setMembers(prev => [...prev, result.board_member]);
                }
                logAudit({ action: 'create', resource: 'board_member', resourceId: result?.board_member?.id ?? '', details: formValues.member_name });
                toast.success('تمت إضافة العضو بنجاح');
            }
            setShowModal(false);
        }
        catch {
            toast.error('حدث خطأ أثناء حفظ البيانات');
        }
    }, [editing, formValues, api, entities, validate]);
    const handleDelete = useCallback(async (member: BoardMember) => {
        const ok = await confirm({
            title: 'حذف عضو المجلس',
            message: `هل أنت متأكد من حذف "${member.member_name}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
            confirmLabel: 'حذف',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            await api.execute(`/board-members/${member.id}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(m => m.id !== member.id));
            logAudit({ action: 'delete', resource: 'board_member', resourceId: member.id, details: member.member_name });
            toast.success('تم حذف العضو بنجاح');
        }
        catch {
            toast.error('حدث خطأ أثناء حذف العضو');
        }
    }, [confirm, api]);
    // ============================================================
    // العرض
    // ============================================================
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="مجالس وهيئات الإدارة النقابية والمؤسسية" subtitle="سجل أعضاء مجالس الإدارة والهيئات التنفيذية للنقابات والاتحادات والمنشآت" breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'مجالس وهيئات الإدارة' }]} actions={<div className="flex items-center gap-2">
            <PermissionGate permission="board:export">
              <button onClick={() => { exportReportToExcel({ title: 'مجالس وهيئات الإدارة', reportType: 'statistics', data: members, columns: [{ key: 'full_name', label: 'الاسم' }, { key: 'position', label: 'المنصب' }, { key: 'entity_name', label: 'الجهة / النقابة' }, { key: 'start_date', label: 'تاريخ البداية' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'board_members', details: { count: members.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                <Download className="w-4 h-4"/>تصدير
              </button>
            </PermissionGate>
            <PermissionGate permission="board:create">
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Plus className="w-4 h-4"/>
                إضافة عضو
              </button>
            </PermissionGate>
          </div>}/>

      {loading && (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"/>
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>)}

      {/* إحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'إجمالي الأعضاء', value: stats.total, color: 'text-primary bg-primary/10' },
            { label: 'نشطون', value: stats.active, color: 'text-success bg-success/10' },
            { label: 'منتهيون', value: stats.expired, color: 'text-error bg-error/10' },
            { label: 'معلقون', value: stats.pending, color: 'text-warning bg-warning/10' },
        ].map(stat => (<div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Users className="w-4 h-4"/>
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
            <input type="text" placeholder="البحث باسم العضو أو النقابة أو المنظمة..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground"/>
            <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
              <option value="all">جميع النقابات والمنظمات</option>
              {entities.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
            </select>
            <select value={positionFilter} onChange={e => { setPositionFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
              <option value="all">جميع المناصب</option>
              {POSITIONS.map(p => (<option key={p} value={p}>{p}</option>))}
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
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النقابة أو المنظمة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">اسم العضو</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المنصب</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">تاريخ التعيين</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الفترة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (<tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3"/>
                      <p className="text-muted-foreground font-medium">لا توجد بيانات أعضاء مجالس</p>
                    </td>
                  </tr>) : (paginated.map((member, idx) => (<tr key={member.id} className="hover:bg-accent/50 transition-colors border-b border-border">
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-heading text-xs">{member.entity_name}</td>
                      <td className="py-3 px-4 text-xs">
                        <div>
                          <p className="font-medium text-heading">{member.member_name}</p>
                          {member.phone && (<p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3"/> {member.phone}
                            </p>)}
                          {member.email && (<p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3"/> {member.email}
                            </p>)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${POSITION_COLORS[member.position]}`}>
                          {member.position}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{member.appointment_date}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {member.term_start && member.term_end ? (<span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3"/>
                            {member.term_start} — {member.term_end}
                          </span>) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${STATUS_CONFIG[member.status]?.color ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <PermissionGate permission="board:edit">
                            <button onClick={() => openEdit(member)} className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors" title="تعديل">
                              <Edit2 className="w-4 h-4"/>
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="board:delete">
                            <button onClick={() => handleDelete(member)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>)))}
              </tbody>
            </table>
          </div>

          {/* الترقيم */}
          {filtered.length > 0 && (<div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} عضو
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
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary"/>
                </div>
                <h2 className="font-bold text-heading">
                  {editing ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* النقابة أو المنظمة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    النقابة أو المنظمة <span className="text-error">*</span>
                  </label>
                  <select name="entity_id" value={formValues.entity_id} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card ${formErrors.entity_id ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر النقابة أو المنظمة...</option>
                    {entities.map(e => (<option key={e.id} value={e.id}>{e.name}</option>))}
                  </select>
                  {formErrors.entity_id && <p className="text-error text-xs mt-1">{formErrors.entity_id}</p>}
                </div>

                {/* اسم العضو */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    اسم العضو <span className="text-error">*</span>
                  </label>
                  <input type="text" name="member_name" value={formValues.member_name} onChange={handleFormChange} placeholder="الاسم الكامل" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.member_name ? 'border-error' : 'border-border'}`}/>
                  {formErrors.member_name && <p className="text-error text-xs mt-1">{formErrors.member_name}</p>}
                </div>

                {/* المنصب */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">المنصب</label>
                  <select name="position" value={formValues.position} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
                    {POSITIONS.map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>

                {/* الحالة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الحالة</label>
                  <select name="status" value={formValues.status} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary bg-card">
                    <option value="نشط">نشط</option>
                    <option value="منتهي">منتهي</option>
                    <option value="معلق">معلق</option>
                  </select>
                </div>

                {/* تاريخ التعيين */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    تاريخ التعيين <span className="text-error">*</span>
                  </label>
                  <input type="date" name="appointment_date" value={formValues.appointment_date} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary ${formErrors.appointment_date ? 'border-error' : 'border-border'}`}/>
                  {formErrors.appointment_date && <p className="text-error text-xs mt-1">{formErrors.appointment_date}</p>}
                </div>

                {/* بداية الفتر */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">بداية الفترة</label>
                  <input type="date" name="term_start" value={formValues.term_start} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* نهاية الفترة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">نهاية الفترة</label>
                  <input type="date" name="term_end" value={formValues.term_end} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* الهاتف */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">الهاتف</label>
                  <input type="text" name="phone" value={formValues.phone} onChange={handleFormChange} placeholder="رقم الهاتف" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
                </div>

                {/* البريد الإلكتروني */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">البريد الإلكتروني</label>
                  <input type="email" name="email" value={formValues.email} onChange={handleFormChange} placeholder="example@email.com" className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"/>
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
                {editing ? 'حفظ التغييرات' : 'إضافة العضو'}
              </button>
            </div>
          </div>
        </div>)}

      {confirmDialog}
    </div>);
}
