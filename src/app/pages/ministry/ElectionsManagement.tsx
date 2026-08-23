/**
 * ElectionsManagement — إدارة الانتخابات النقابية
 * منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Vote, Plus, X, Download, AlertCircle, Users, MapPin, Clock, CheckCircle, ChevronRight, ChevronLeft, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { FilterBar } from '../../components/ui/FilterBar';
import { ActionButtons } from '../../components/ui/ActionButtons';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import {} from '../../hooks/useFormValidation';
import { logAudit } from '../../utils/security';
import { PermissionGate, usePermissions } from '../../hooks/usePermissions';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { toast } from 'sonner';
import { useApi } from '../../hooks/useApi';
// ============================================================
// الأنواع
// ============================================================
type ElectionStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
type ElectionType = 'general' | 'board' | 'committee';
interface Election {
    id: string;
    entity_id: string;
    election_number: string;
    entity_name?: string;
    election_type: ElectionType;
    status: ElectionStatus;
    planned_date: string;
    start_date?: string;
    end_date?: string;
    eligible_voters: number;
    actual_voters?: number;
    candidates_count: number;
    positions_count: number;
    supervised_by: string;
    venue: string;
    notes?: string;
    winners?: string[];
    [key: string]: any;
}
const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
    general: 'انتخابات عامة',
    board: 'انتخابات مجلس الإدارة',
    committee: 'انتخابات اللجان',
};
const STATUS_LABELS: Record<ElectionStatus, string> = {
    planned: 'مخطط',
    ongoing: 'جارٍ',
    completed: 'منتهٍ',
    cancelled: 'ملغى',
};
const PAGE_SIZE = 5;
// ============================================================
// بيانات النموذج الفارغة
// ============================================================
type ElectionFormValues = {
    electionNumber: string;
    entity_id: string;
    electionType: ElectionType;
    status: ElectionStatus;
    plannedDate: string;
    startDate?: string;
    endDate?: string;
    eligibleVoters: number;
    actualVoters?: number;
    candidatesCount: number;
    positionsCount: number;
    supervisedBy: string;
    venue: string;
    notes?: string;
    [key: string]: any;
};
function buildEmptyForm(count: number): ElectionFormValues {
    return {
        electionNumber: `YE-ELC-2026-${String(count + 1).padStart(3, '0')}`,
        entity_id: '',
        electionType: 'general',
        status: 'planned',
        plannedDate: '',
        eligibleVoters: 0,
        candidatesCount: 0,
        positionsCount: 0,
        supervisedBy: '',
        venue: '',
        notes: '',
    };
}
// ============================================================
// المكوّن الرئيسي
// ============================================================
export default function ElectionsManagement() {
    const [elections, setElections] = useState<Election[]>([]);
    const [entities, setEntities] = useState<Array<{
        entity_id: string;
        entity_name: string;
    }>>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingElection, setEditingElection] = useState<Election | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ElectionStatus | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const { confirm, dialog: confirmDialog } = useConfirm();
    const api = useApi();
    const { can } = usePermissions();
    // تحميل البيانات من API
    useEffect(() => {
        const fetchElections = async () => {
            setLoading(true);
            try {
                const [eRes, entRes] = await Promise.all([
                    api.execute('/elections'),
                    api.execute('/entities'),
                ]);
                if (eRes?.data) {
                    setElections(eRes.data);
                }
                else {
                    setElections([]);
                }
                if (entRes?.data) {
                    setEntities(entRes.data);
                }
            }
            catch (error) {
                console.error('خطأ في تحميل الانتخابات:', error);
                setElections([]);
            }
            finally {
                setLoading(false);
            }
        };
        fetchElections();
    }, [api]);
    // ============================================================
    // التصفية
    // ============================================================
    const filtered = useMemo(() => {
        return elections.filter(e => {
            const q = searchQuery.trim();
            const matchSearch = !q ||
                (e.entity_name || '').includes(q) ||
                (e.election_number || '').includes(q) ||
                (e.supervised_by || '').includes(q);
            const matchStatus = statusFilter === 'all' || e.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [elections, searchQuery, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: elections.length,
        planned: elections.filter(e => e.status === 'planned').length,
        ongoing: elections.filter(e => e.status === 'ongoing').length,
        completed: elections.filter(e => e.status === 'completed').length,
    }), [elections]);
    // ============================================================
    // حالة النموذج
    // ============================================================
    const [formValues, setFormValues] = useState<ElectionFormValues>(buildEmptyForm(0));
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ElectionFormValues, string>>>({});
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const parsed = type === 'number' ? Number(value) : value;
        setFormValues(prev => ({ ...prev, [name]: parsed }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }, []);
    function validateForm(vals: ElectionFormValues): boolean {
        const errs: Partial<Record<keyof ElectionFormValues, string>> = {};
        if (!vals.entity_id)
            errs.entity_id = 'النقابة أو المنظمة مطلوب';
        if (!vals.plannedDate)
            errs.plannedDate = 'التاريخ المخطط مطلوب';
        if (!vals.supervisedBy)
            errs.supervisedBy = 'اسم المشرف مطلوب';
        if (!vals.venue)
            errs.venue = 'مكان الإجراء مطلوب';
        if (!vals.eligibleVoters || Number(vals.eligibleVoters) < 1)
            errs.eligibleVoters = 'يجب أن يكون أكبر من صفر';
        if (!vals.positionsCount || Number(vals.positionsCount) < 1)
            errs.positionsCount = 'يجب أن يكون أكبر من صفر';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    }
    // ============================================================
    // الإجراءات
    // ============================================================
    const openAdd = useCallback(() => {
        const empty = buildEmptyForm(elections.length);
        setFormValues(empty);
        setFormErrors({});
        setEditingElection(null);
        setShowModal(true);
    }, [elections.length]);
    const openEdit = useCallback((election: Election) => {
        setFormValues({
            electionNumber: election.election_number,
            entity_id: election.entity_id ?? '',
            electionType: election.election_type,
            status: election.status,
            plannedDate: election.planned_date,
            startDate: election.start_date,
            endDate: election.end_date,
            eligibleVoters: election.eligible_voters,
            actualVoters: election.actual_voters,
            candidatesCount: election.candidates_count,
            positionsCount: election.positions_count,
            supervisedBy: election.supervised_by,
            venue: election.venue,
            notes: election.notes,
        });
        setFormErrors({});
        setEditingElection(election);
        setShowModal(true);
    }, []);
    const handleDelete = useCallback(async (election: Election) => {
        const ok = await confirm({
            title: 'حذف الانتخابات',
            message: `هل أنت متأكد من حذف انتخابات "${election.entity_name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
            confirmLabel: 'حذف',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            await api.execute(`/elections/${election.id}`, { method: 'DELETE' });
            setElections(prev => prev.filter(e => e.id !== election.id));
            logAudit({ action: 'delete', resource: 'election', resourceId: election.id, details: election.electionNumber });
            toast.success(`تم حذف الانتخابات ${election.electionNumber} بنجاح`);
        }
        catch (error) {
            console.error('خطأ في حذف الانتخابات:', error);
            toast.error('حدث خطأ أثناء حذف الانتخابات');
        }
    }, [confirm, api]);
    const handleSave = useCallback(async () => {
        if (!validateForm(formValues))
            return;
        try {
            if (editingElection) {
                const body = {
                    entity_id: formValues.entity_id,
                    election_number: formValues.electionNumber,
                    election_type: formValues.electionType,
                    status: formValues.status,
                    planned_date: formValues.plannedDate,
                    start_date: formValues.startDate,
                    end_date: formValues.endDate,
                    eligible_voters: formValues.eligibleVoters,
                    actual_voters: formValues.actualVoters,
                    candidates_count: formValues.candidatesCount,
                    positions_count: formValues.positionsCount,
                    supervised_by: formValues.supervisedBy,
                    venue: formValues.venue,
                    notes: formValues.notes,
                };
                const result = await api.execute(`/elections/${editingElection.id}`, {
                    method: 'PUT',
                    body: body as unknown as Record<string, unknown>,
                });
                if (result?.election) {
                    setElections(prev => prev.map(e => e.id === editingElection.id ? result.election : e));
                    logAudit({ action: 'update', resource: 'election', resourceId: editingElection.id, details: editingElection.election_number });
                    toast.success('تم تحديث بيانات الانتخابات بنجاح');
                }
            }
            else {
                const body = {
                    entity_id: formValues.entity_id,
                    election_number: formValues.electionNumber,
                    election_type: formValues.electionType,
                    status: formValues.status,
                    planned_date: formValues.plannedDate,
                    start_date: formValues.startDate,
                    end_date: formValues.endDate,
                    eligible_voters: formValues.eligibleVoters,
                    actual_voters: formValues.actualVoters,
                    candidates_count: formValues.candidatesCount,
                    positions_count: formValues.positionsCount,
                    supervised_by: formValues.supervisedBy,
                    venue: formValues.venue,
                    notes: formValues.notes,
                };
                const result = await api.execute('/elections', {
                    method: 'POST',
                    body: body as unknown as Record<string, unknown>,
                });
                if (result?.election) {
                    setElections(prev => [...prev, result.election]);
                    logAudit({ action: 'create', resource: 'election', resourceId: result.election.id, details: result.election.election_number });
                    toast.success('تمت إضافة الانتخابات بنجاح');
                }
            }
            setShowModal(false);
        }
        catch (error) {
            console.error('خطأ في حفظ الانتخابات:', error);
            toast.error('حدث خطأ أثناء حفظ الانتخابات');
        }
    }, [editingElection, formValues, api]);
    const handleExport = useCallback(() => {
        exportReportToExcel({
            title: 'تقرير الانتخابات النقابية',
            reportType: 'activities_list',
            data: elections,
            columns: [
                { key: 'election_number', label: 'رقم الانتخابات' },
                { key: 'entity_name', label: 'النقابة أو المنظمة' },
                { key: 'election_type', label: 'النوع', format: (v: string) => ELECTION_TYPE_LABELS[v as ElectionType] || v },
                { key: 'planned_date', label: 'التاريخ المخطط' },
                { key: 'eligible_voters', label: 'المقترعون المؤهلون' },
                { key: 'status', label: 'الحالة', format: (v: string) => STATUS_LABELS[v as ElectionStatus] || v },
            ],
        });
        logAudit({ action: 'export', resource: 'elections', details: 'Excel export' });
        toast.success('تم تصدير البيانات بنجاح');
    }, [elections]);
    // ============================================================
    // العرض
    // ============================================================
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة الانتخابات" subtitle="متابعة وإدارة الانتخابات النقابية" breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'إدارة الانتخابات' }]} actions={<div className="flex items-center gap-2">
            <PermissionGate permission="elections:export">
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                <Download className="w-4 h-4"/>
                تصدير Excel
              </button>
            </PermissionGate>
            <PermissionGate permission="elections:create">
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Plus className="w-4 h-4"/>
                إضافة انتخابات
              </button>
            </PermissionGate>
          </div>}/>

      {loading && (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"/>
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>)}

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'إجمالي الانتخابات', value: stats.total, Icon: Vote, color: 'text-primary-bright bg-primary-bright/10', filter: 'all' as const },
            { label: 'مخططة', value: stats.planned, Icon: Clock, color: 'text-primary bg-primary/10', filter: 'planned' as const },
            { label: 'جارية', value: stats.ongoing, Icon: AlertCircle, color: 'text-warning bg-warning/10', filter: 'ongoing' as const },
            { label: 'منتهية', value: stats.completed, Icon: CheckCircle, color: 'text-success bg-success/10', filter: 'completed' as const },
        ].map(stat => (<button key={stat.label} onClick={() => { setStatusFilter(stat.filter); setCurrentPage(1); }} className={`bg-card rounded-xl border p-4 shadow-sm text-right transition-all hover:shadow-md ${statusFilter === stat.filter ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.Icon className="w-4 h-4"/>
              </div>
              <span className="text-2xl font-bold text-heading">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </button>))}
      </div>

      {/* شريط البحث والتصفية الموحّد */}
      <FilterBar searchValue={searchQuery} onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} searchPlaceholder="البحث برقم الانتخابات أو اسم النقابة أو المنظمة..." filters={[
            {
                key: 'status',
                label: 'جميع الحالات',
                type: 'select',
                options: [
                    { value: 'planned', label: 'مخطط' },
                    { value: 'ongoing', label: 'جارٍ' },
                    { value: 'completed', label: 'منتهٍ' },
                    { value: 'cancelled', label: 'ملغى' },
                ],
            },
        ]} filterValues={{ status: statusFilter === 'all' ? '' : statusFilter }} onFilterChange={(key, value) => {
            if (key === 'status') {
                setStatusFilter((value || 'all') as ElectionStatus | 'all');
                setCurrentPage(1);
            }
        }}/>

      {/* الجدول */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">رقم الانتخابات</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النقابة أو المنظمة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النوع</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">التاريخ المخطط</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المقترعون</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 ? (<tr>
                  <td colSpan={8}>
                    <EmptyState title="لا توجد انتخابات" description="لا توجد انتخابات مطابقة لمعايير البحث أو التصفية" icon={<Vote className="w-14 h-14"/>}/>
                  </td>
                </tr>) : (paginated.map((election, idx) => (<tr key={election.id} className="hover:bg-accent/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-primary-bright/10 text-primary px-2 py-0.5 rounded">
                        {election.election_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-heading">{election.entity_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3"/>
                        المشرف: {election.supervised_by}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{ELECTION_TYPE_LABELS[election.election_type]}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{election.planned_date}</td>
                    <td className="py-3 px-4">
                      <div className="text-heading font-medium">{election.eligible_voters.toLocaleString('ar')}</div>
                      {election.actual_voters != null && (<div className="text-xs text-success">
                          فعلي: {election.actual_voters.toLocaleString('ar')}
                          {' '}({Math.round((election.actual_voters / election.eligible_voters) * 100)}%)
                        </div>)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={election.status}/>
                    </td>
                    <td className="py-3 px-4">
                      <ActionButtons actions={[
                { type: 'view', onClick: () => openEdit(election) },
                ...(can('elections:edit') ? [{ type: 'edit' as const, onClick: () => openEdit(election) }] : []),
                ...(can('elections:delete') ? [{ type: 'delete' as const, onClick: () => handleDelete(election) }] : []),
            ]}/>
                    </td>
                  </tr>)))}
            </tbody>
          </table>
        </div>

        {/* الترقيم */}
        {filtered.length > 0 && (<div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} انتخابات
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground">
                <ChevronRight className="w-4 h-4"/>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setCurrentPage(p)} className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-primary text-white' : 'hover:bg-accent text-muted-foreground'}`}>
                  {p}
                </button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground">
                <ChevronLeft className="w-4 h-4"/>
              </button>
            </div>
          </div>)}
      </div>

      {/* نافذة الإضافة/التعديل */}
      {showModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-bright/15 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-primary"/>
                </div>
                <div>
                  <h2 className="font-bold text-heading">
                    {editingElection ? 'تعديل بيانات الانتخابات' : 'إضافة انتخابات جديدة'}
                  </h2>
                  <p className="text-xs text-muted-foreground">{formValues.electionNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* المحتوى */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* رقم الانتخابات */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">رقم الانتخابات</label>
                  <input value={formValues.electionNumber} readOnly className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted text-muted-foreground font-mono"/>
                </div>

                {/* النقابة أو المنظمة */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    النقابة أو المنظمة <span className="text-error">*</span>
                  </label>
                  <select name="entity_id" value={formValues.entity_id} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring bg-card ${formErrors.entity_id ? 'border-error' : 'border-border'}`}>
                    <option value="">اختر النقابة أو المنظمة...</option>
                    {entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.entity_name}</option>)}
                  </select>
                  {formErrors.entity_id && <p className="text-error text-xs mt-1">{formErrors.entity_id}</p>}
                </div>

                {/* نوع الانتخابات */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">نوع الانتخابات</label>
                  <select name="electionType" value={formValues.electionType} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring bg-card">
                    <option value="general">انتخابات عامة</option>
                    <option value="board">انتخابات مجلس الإدارة</option>
                    <option value="committee">انتخابات اللجان</option>
                  </select>
                </div>

                {/* التاريخ المخطط */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    التاريخ المخطط <span className="text-error">*</span>
                  </label>
                  <input type="date" name="plannedDate" value={formValues.plannedDate} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring ${formErrors.plannedDate ? 'border-error' : 'border-border'}`}/>
                  {formErrors.plannedDate && <p className="text-error text-xs mt-1">{formErrors.plannedDate}</p>}
                </div>

                {/* المقترعون المؤهلون */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المقترعون المؤهلون <span className="text-error">*</span>
                  </label>
                  <input type="number" name="eligibleVoters" value={formValues.eligibleVoters} onChange={handleFormChange} min={1} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring ${formErrors.eligibleVoters ? 'border-error' : 'border-border'}`}/>
                  {formErrors.eligibleVoters && <p className="text-error text-xs mt-1">{formErrors.eligibleVoters}</p>}
                </div>

                {/* عدد المرشحين */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">عدد المرشحين</label>
                  <input type="number" name="candidatesCount" value={formValues.candidatesCount} onChange={handleFormChange} min={0} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"/>
                </div>

                {/* عدد المناصب */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    عدد المناصب <span className="text-error">*</span>
                  </label>
                  <input type="number" name="positionsCount" value={formValues.positionsCount} onChange={handleFormChange} min={1} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring ${formErrors.positionsCount ? 'border-error' : 'border-border'}`}/>
                  {formErrors.positionsCount && <p className="text-error text-xs mt-1">{formErrors.positionsCount}</p>}
                </div>

                {/* المشرف */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    المشرف <span className="text-error">*</span>
                  </label>
                  <input type="text" name="supervisedBy" value={formValues.supervisedBy} onChange={handleFormChange} placeholder="اسم المشرف على الانتخابات" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring ${formErrors.supervisedBy ? 'border-error' : 'border-border'}`}/>
                  {formErrors.supervisedBy && <p className="text-error text-xs mt-1">{formErrors.supervisedBy}</p>}
                </div>

                {/* مكان الإجراء */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    مكان الإجراء <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                    <input type="text" name="venue" value={formValues.venue} onChange={handleFormChange} placeholder="القاعة أو المكان الذي ستُعقد فيه الانتخابات" className={`w-full pr-9 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring ${formErrors.venue ? 'border-error' : 'border-border'}`}/>
                  </div>
                  {formErrors.venue && <p className="text-error text-xs mt-1">{formErrors.venue}</p>}
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">ملاحظات</label>
                  <textarea name="notes" value={formValues.notes ?? ''} onChange={handleFormChange} rows={3} placeholder="ملاحظات إضافية حول الانتخابات..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring resize-none"/>
                </div>
              </div>
            </div>

            {/* أزرار الإجراء */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                {editingElection ? 'حفظ التغييرات' : 'إضافة الانتخابات'}
              </button>
            </div>
          </div>
        </div>)}

      {confirmDialog}
    </div>);
}
