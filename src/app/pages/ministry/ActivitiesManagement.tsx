/**
 * ActivitiesManagement — إدارة الأنشطة والفعاليات
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Activity, Plus, X, Download, Users, DollarSign, Calendar, MapPin, LayoutGrid, List, BookOpen, Mic, Briefcase, Heart, Dumbbell, Globe, Star, BarChart2, Loader2, Eye, Edit2, Trash2, Clock, CheckCircle, Search, Filter, ChevronRight, ChevronLeft, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PermissionGate } from '../../hooks/usePermissions';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { toast } from 'sonner';
// ============================================================
// الأنواع
// ============================================================
type ActivityStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
type ActivityType = 'training' | 'conference' | 'seminar' | 'workshop' | 'election' | 'meeting' | 'cultural' | 'sports' | 'charity' | 'awareness' | 'other';
interface ActivityItem {
    id: string;
    activityNumber: string;
    activityName: string;
    activityType: ActivityType;
    entityName: string;
    entityId: string;
    status: ActivityStatus;
    startDate: string;
    endDate: string;
    location: string;
    description: string;
    plannedParticipants: number;
    actualParticipants?: number;
    beneficiariesCount?: number;
    budget: number;
    actualCost?: number;
    fundingSource: string;
    responsible: string;
}
interface EntityOption {
    entity_id: string;
    entity_name: string;
}
const ACTIVITY_TYPE_CONFIG: Record<ActivityType, {
    label: string;
    icon: React.ElementType;
    color: string;
}> = {
    training: { label: 'تدريب', icon: BookOpen, color: 'text-primary-bright bg-info/10' },
    conference: { label: 'مؤتمر', icon: Mic, color: 'text-gold-dark bg-gold/10' },
    seminar: { label: 'ندوة', icon: Star, color: 'text-primary-dark bg-primary/10' },
    workshop: { label: 'ورشة عمل', icon: Briefcase, color: 'text-warning bg-warning/10' },
    election: { label: 'انتخابات', icon: BarChart2, color: 'text-error bg-error/10' },
    meeting: { label: 'اجتماع', icon: Users, color: 'text-muted-foreground bg-muted' },
    cultural: { label: 'ثقافي', icon: Globe, color: 'text-success-dark bg-success/10' },
    sports: { label: 'رياضي', icon: Dumbbell, color: 'text-success-dark bg-success/10' },
    charity: { label: 'خيري', icon: Heart, color: 'text-gold-dark bg-gold/10' },
    awareness: { label: 'توعوي', icon: Activity, color: 'text-warning-dark bg-warning/10' },
    other: { label: 'أخرى', icon: Activity, color: 'text-muted-foreground bg-muted' },
};
const STATUS_LABELS: Record<ActivityStatus, string> = {
    planned: 'مخطط',
    ongoing: 'جارٍ',
    completed: 'منتهٍ',
    cancelled: 'ملغى',
};
const PAGE_SIZE = 6;
// ============================================================
// نموذج فارغ
// ============================================================
type ActivityFormValues = Omit<ActivityItem, 'id'>;
function buildEmptyActivityForm(): ActivityFormValues {
    return {
        activityNumber: `ACT-${Date.now()}`,
        activityName: '',
        activityType: 'training',
        entityName: '',
        entityId: '',
        status: 'planned',
        startDate: '',
        endDate: '',
        location: '',
        description: '',
        plannedParticipants: 0,
        budget: 0,
        fundingSource: '',
        responsible: '',
    };
}
type ModalTab = 'basic' | 'details' | 'stats';
// ============================================================
// المكوّن الرئيسي
// ============================================================
export default function ActivitiesManagement() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [entities, setEntities] = useState<EntityOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<ModalTab>('basic');
    const { confirm, dialog: confirmDialog } = useConfirm();
    const API = '/api';
    const fetchActivities = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/activities`);
            if (!res.ok)
                throw new Error('فشل تحميل الأنشطة');
            const raw = await res.json();
            const list = Array.isArray(raw) ? raw : (raw.data || []);
            const mapped: ActivityItem[] = list.map((r: Record<string, unknown>) => ({
                id: r.id as string,
                activityNumber: r.activity_number as string,
                activityName: r.activity_name as string,
                activityType: r.activity_type as ActivityType,
                entityName: (r.entity_name as string) || '',
                entityId: r.entity_id as string,
                status: r.status as ActivityStatus,
                startDate: r.start_date as string,
                endDate: (r.end_date as string) || '',
                location: (r.location as string) || '',
                description: (r.description as string) || '',
                plannedParticipants: (r.planned_participants as number) || 0,
                actualParticipants: (r.actual_participants as number) || undefined,
                beneficiariesCount: undefined,
                budget: (r.budget as number) || 0,
                actualCost: (r.actual_cost as number) || undefined,
                fundingSource: (r.funding_source as string) || '',
                responsible: (r.responsible as string) || '',
            }));
            setActivities(mapped);
        }
        catch (err) {
            console.error(err);
            toast.error('فشل تحميل الأنشطة');
        }
        finally {
            setLoading(false);
        }
    }, []);
    const fetchEntities = useCallback(async () => {
        try {
            const res = await fetch(`${API}/entities`);
            if (!res.ok)
                return;
            const data = await res.json();
            const list = (data.data || data.entities || data || []).map((e: Record<string, unknown>) => ({
                entity_id: e.entity_id || e.id,
                entity_name: e.entity_name || e.nameAr || e.name,
            }));
            setEntities(list);
        } catch {
            console.warn('[Activities] failed to fetch entities — non-critical');
        }
    }, []);
    useEffect(() => {
        fetchActivities();
        fetchEntities();
    }, [fetchActivities, fetchEntities]);
    // ============================================================
    // التصفية
    // ============================================================
    const filtered = useMemo(() => {
        return activities.filter(a => {
            const q = searchQuery.trim();
            const matchSearch = !q ||
                a.activityName.includes(q) ||
                a.activityNumber.includes(q) ||
                a.entityName.includes(q) ||
                a.responsible.includes(q);
            const matchType = typeFilter === 'all' || a.activityType === typeFilter;
            const matchStatus = statusFilter === 'all' || a.status === statusFilter;
            return matchSearch && matchType && matchStatus;
        });
    }, [activities, searchQuery, typeFilter, statusFilter]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: activities.length,
        planned: activities.filter(a => a.status === 'planned').length,
        ongoing: activities.filter(a => a.status === 'ongoing').length,
        completed: activities.filter(a => a.status === 'completed').length,
    }), [activities]);
    // ============================================================
    // حالة النموذج
    // ============================================================
    const [formValues, setFormValues] = useState<ActivityFormValues>(buildEmptyActivityForm());
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ActivityFormValues, string>>>({});
    const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const parsed = type === 'number' ? Number(value) : value;
        setFormValues(prev => ({ ...prev, [name]: parsed }));
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }, []);
    function validateActivityForm(vals: ActivityFormValues): boolean {
        const errs: Partial<Record<keyof ActivityFormValues, string>> = {};
        if (!vals.activityName)
            errs.activityName = 'اسم النشاط مطلوب';
        if (!vals.entityId)
            errs.entityId = 'النقابة أو المنظمة مطلوب';
        if (!vals.startDate)
            errs.startDate = 'تاريخ البداية مطلوب';
        if (!vals.endDate)
            errs.endDate = 'تاريخ النهاية مطلوب';
        if (!vals.location)
            errs.location = 'الموقع مطلوب';
        if (!vals.responsible)
            errs.responsible = 'المسؤول مطلوب';
        if (!vals.plannedParticipants || Number(vals.plannedParticipants) < 1)
            errs.plannedParticipants = 'عدد المشاركين يجب أن يكون أكبر من صفر';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    }
    // ============================================================
    // الإجراءات
    // ============================================================
    const openAdd = useCallback(() => {
        setFormValues(buildEmptyActivityForm());
        setFormErrors({});
        setEditingActivity(null);
        setActiveTab('basic');
        setShowModal(true);
    }, []);
    const openEdit = useCallback((activity: ActivityItem) => {
        setFormValues({ ...activity });
        setFormErrors({});
        setEditingActivity(activity);
        setActiveTab('basic');
        setShowModal(true);
    }, []);
    const handleDelete = useCallback(async (activity: ActivityItem) => {
        const ok = await confirm({
            title: 'حذف النشاط',
            message: `هل أنت متأكد من حذف نشاط "${activity.activityName}"؟ لا يمكن التراجع.`,
            confirmLabel: 'حذف',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            const res = await fetch(`${API}/activities/${activity.id}`, { method: 'DELETE' });
            if (!res.ok)
                throw new Error('فشل الحذف');
            setActivities(prev => prev.filter(a => a.id !== activity.id));
            logAudit({ action: 'delete', resource: 'activity', resourceId: activity.id, details: activity.activityNumber });
            toast.success(`تم حذف النشاط "${activity.activityName}" بنجاح`);
        }
        catch {
            toast.error('حدث خطأ أثناء حذف النشاط');
        }
    }, [confirm]);
    const handleSave = useCallback(async () => {
        if (!validateActivityForm(formValues)) {
            setActiveTab('basic');
            return;
        }
        setSaving(true);
        try {
            if (editingActivity) {
                const res = await fetch(`${API}/activities/${editingActivity.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activity_name: formValues.activityName,
                        activity_type: formValues.activityType,
                        entity_id: formValues.entityId,
                        status: formValues.status,
                        start_date: formValues.startDate,
                        end_date: formValues.endDate,
                        location: formValues.location,
                        description: formValues.description,
                        planned_participants: formValues.plannedParticipants,
                        actual_participants: formValues.actualParticipants,
                        budget: formValues.budget,
                        actual_cost: formValues.actualCost,
                    }),
                });
                if (!res.ok)
                    throw new Error('فشل التحديث');
                setActivities(prev => prev.map(a => a.id === editingActivity.id ? {
                    ...a,
                    ...formValues,
                    entityName: entities.find(e => e.entity_id === formValues.entityId)?.entity_name || a.entityName,
                } : a));
                logAudit({ action: 'update', resource: 'activity', resourceId: editingActivity.id, details: editingActivity.activityNumber });
                toast.success('تم تحديث بيانات النشاط بنجاح');
            }
            else {
                const res = await fetch(`${API}/activities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activity_name: formValues.activityName,
                        activity_type: formValues.activityType,
                        entity_id: formValues.entityId,
                        status: formValues.status,
                        start_date: formValues.startDate,
                        end_date: formValues.endDate,
                        location: formValues.location,
                        description: formValues.description,
                        planned_participants: formValues.plannedParticipants,
                        budget: formValues.budget,
                    }),
                });
                if (!res.ok)
                    throw new Error('فشل الإضافة');
                toast.success('تمت إضافة النشاط بنجاح');
                fetchActivities();
                logAudit({ action: 'create', resource: 'activity', details: formValues.activityName });
            }
            setShowModal(false);
        }
        catch {
            toast.error('حدث خطأ أثناء حفظ النشاط');
        }
        finally {
            setSaving(false);
        }
    }, [editingActivity, formValues, entities, fetchActivities]);
    const handleExport = useCallback(() => {
        exportReportToExcel({
            title: 'تقرير الأنشطة والفعاليات',
            reportType: 'activities_list',
            data: activities,
            columns: [
                { key: 'activityNumber', label: 'رقم النشاط' },
                { key: 'activityName', label: 'اسم النشاط' },
                { key: 'activityType', label: 'النوع', format: (v: string) => ACTIVITY_TYPE_CONFIG[v as ActivityType]?.label || v },
                { key: 'entityName', label: 'النقابة أو المنظمة' },
                { key: 'startDate', label: 'تاريخ البداية' },
                { key: 'endDate', label: 'تاريخ النهاية' },
                { key: 'plannedParticipants', label: 'المشاركون المخططون' },
                { key: 'status', label: 'الحالة', format: (v: string) => STATUS_LABELS[v as ActivityStatus] || v },
            ],
        });
        logAudit({ action: 'export', resource: 'activities', details: 'Excel export' });
        toast.success('تم تصدير البيانات بنجاح');
    }, [activities]);
    // ============================================================
    // المكوّنات الفرعية
    // ============================================================
    function ActivityCard({ activity }: {
        activity: ActivityItem;
    }) {
        const cfg = ACTIVITY_TYPE_CONFIG[activity.activityType];
        const Icon = cfg.icon;
        return (<div className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
            <Icon className="w-5 h-5"/>
          </div>
          <StatusBadge status={activity.status}/>
        </div>
        <h3 className="font-semibold text-heading text-sm leading-snug mb-1 line-clamp-2">{activity.activityName}</h3>
        <p className="text-xs text-muted-foreground mb-3">{activity.entityName}</p>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0"/>
            <span>{activity.startDate} — {activity.endDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0"/>
            <span className="truncate">{activity.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 flex-shrink-0"/>
            <span>{activity.plannedParticipants.toLocaleString('ar')} مشارك مخطط</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5 flex-shrink-0"/>
            <span>{activity.budget.toLocaleString('ar')} ريال</span>
          </div>
        </div>
        <div className="flex items-center gap-1 pt-3 border-t border-border">
          <button onClick={() => openEdit(activity)} className="p-1.5 text-primary-bright hover:bg-info/10 rounded-lg transition-colors" title="عرض">
            <Eye className="w-4 h-4"/>
          </button>
          <PermissionGate permission="activities:edit">
            <button onClick={() => openEdit(activity)} className="p-1.5 text-success-dark hover:bg-success/10 rounded-lg transition-colors" title="تعديل">
              <Edit2 className="w-4 h-4"/>
            </button>
          </PermissionGate>
          <PermissionGate permission="activities:delete">
            <button onClick={() => handleDelete(activity)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
              <Trash2 className="w-4 h-4"/>
            </button>
          </PermissionGate>
        </div>
      </div>);
    }
    // ============================================================
    // العرض الرئيسي
    // ============================================================
    return (<div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة الأنشطة والفعاليات" subtitle="متابعة وإدارة الأنشطة" breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'الأنشطة والفعاليات' }]} actions={<div className="flex items-center gap-2">
            <PermissionGate permission="activities:export">
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors">
                <Download className="w-4 h-4"/>
                تصدير Excel
              </button>
            </PermissionGate>
            <PermissionGate permission="activities:create">
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Plus className="w-4 h-4"/>
                إضافة نشاط
              </button>
            </PermissionGate>
          </div>}/>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
            { label: 'إجمالي الأنشطة', value: stats.total, Icon: Activity, color: 'text-primary-bright bg-info/10', filter: 'all' as const },
            { label: 'مخططة', value: stats.planned, Icon: Clock, color: 'text-primary-dark bg-primary/10', filter: 'planned' as const },
            { label: 'جارٍ', value: stats.ongoing, Icon: BarChart2, color: 'text-warning bg-warning/10', filter: 'ongoing' as const },
            { label: 'منتهٍ', value: stats.completed, Icon: CheckCircle, color: 'text-success-dark bg-success/10', filter: 'completed' as const },
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

      {/* شريط التحكم */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" placeholder="البحث باسم النشاط أو النقابة أو المنظمة..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"/>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground"/>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as ActivityType | 'all'); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring bg-input-background">
              <option value="all">جميع الأنواع</option>
              {Object.entries(ACTIVITY_TYPE_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ActivityStatus | 'all'); setCurrentPage(1); }} className="text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring bg-input-background">
              <option value="all">جميع الحالات</option>
              <option value="planned">مخطط</option>
              <option value="ongoing">جارٍ</option>
              <option value="completed">منتهٍ</option>
              <option value="cancelled">ملغى</option>
            </select>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-accent/50 text-muted-foreground'}`} title="عرض شبكي">
                <LayoutGrid className="w-4 h-4"/>
              </button>
              <button onClick={() => setViewMode('table')} className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'hover:bg-accent/50 text-muted-foreground'}`} title="عرض جدولي">
                <List className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* حالة التحميل */}
      {loading && (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin"/>
          <p className="text-muted-foreground font-medium">جاري تحميل البيانات...</p>
        </div>)}

      {/* العرض الشبكي */}
      {!loading && viewMode === 'grid' && (<>
          {paginated.length === 0 ? (<div className="bg-card rounded-xl border border-border shadow-sm py-16 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3"/>
              <p className="text-muted-foreground font-medium">لا توجد أنشطة مطابقة للبحث</p>
            </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map(activity => (<ActivityCard key={activity.id} activity={activity}/>))}
            </div>)}
        </>)}

      {/* العرض الجدولي */}
      {!loading && viewMode === 'table' && (<div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground w-10">#</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النشاط</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النوع</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">النقابة أو المنظمة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الفترة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">المشاركون</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الميزانية</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الحالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 ? (<tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2"/>
                      <p className="text-muted-foreground">لا توجد أنشطة مطابقة</p>
                    </td>
                  </tr>) : paginated.map((activity, idx) => {
                const cfg = ACTIVITY_TYPE_CONFIG[activity.activityType];
                const Icon = cfg.icon;
                return (<tr key={activity.id} className="hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-heading text-xs">{activity.activityName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{activity.activityNumber}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3"/>
                          {cfg.label}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{activity.entityName}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        <div>{activity.startDate}</div>
                        <div>{activity.endDate}</div>
                      </td>
                      <td className="py-3 px-4 text-foreground text-xs">
                        {activity.plannedParticipants.toLocaleString('ar')}
                        {activity.actualParticipants != null && (<span className="text-success-dark block">فعلي: {activity.actualParticipants.toLocaleString('ar')}</span>)}
                      </td>
                      <td className="py-3 px-4 text-foreground text-xs">
                        {activity.budget.toLocaleString('ar')}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={activity.status}/></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(activity)} className="p-1.5 text-primary-bright hover:bg-info/10 rounded-lg transition-colors"><Eye className="w-4 h-4"/></button>
                          <PermissionGate permission="activities:edit">
                            <button onClick={() => openEdit(activity)} className="p-1.5 text-success-dark hover:bg-success/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                          </PermissionGate>
                          <PermissionGate permission="activities:delete">
                            <button onClick={() => handleDelete(activity)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* الترقيم */}
      {!loading && filtered.length > 0 && (<div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} نشاط
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-card border border-border disabled:opacity-40 text-muted-foreground">
              <ChevronRight className="w-4 h-4"/>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setCurrentPage(p)} className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors border ${p === currentPage ? 'bg-primary text-white border-primary' : 'bg-card hover:bg-accent/50 text-muted-foreground border-border'}`}>
                {p}
              </button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-card border border-border disabled:opacity-40 text-muted-foreground">
              <ChevronLeft className="w-4 h-4"/>
            </button>
          </div>
        </div>)}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-info/15 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-info-dark"/>
                </div>
                <div>
                  <h2 className="font-bold text-heading">
                    {editingActivity ? 'تعديل بيانات النشاط' : 'إضافة نشاط جديد'}
                  </h2>
                  <p className="text-xs text-muted-foreground">{formValues.activityNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* تبويبات النموذج */}
            <div className="flex border-b border-border px-6">
              {[
                { key: 'basic' as ModalTab, label: 'البيانات الأساسية' },
                { key: 'details' as ModalTab, label: 'التفاصيل' },
                { key: 'stats' as ModalTab, label: 'الإحصائيات' },
            ].map(tab => (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                </button>))}
            </div>

            {/* محتوى النموذج */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* التبويب الأول: البيانات الأساسية */}
              {activeTab === 'basic' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      اسم النشاط <span className="text-error">*</span>
                    </label>
                    <input type="text" name="activityName" value={formValues.activityName} onChange={handleFormChange} placeholder="أدخل اسم النشاط أو الفعالية" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring ${formErrors.activityName ? 'border-error' : 'border-border'}`}/>
                    {formErrors.activityName && <p className="text-error text-xs mt-1">{formErrors.activityName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">نوع النشاط</label>
                    <select name="activityType" value={formValues.activityType} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring bg-input-background">
                      {Object.entries(ACTIVITY_TYPE_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      النقابة أو المنظمة <span className="text-error">*</span>
                    </label>
                    <select name="entityId" value={formValues.entityId} onChange={e => {
                    const eid = e.target.value;
                    const ent = entities.find(en => en.entity_id === eid);
                    setFormValues(prev => ({ ...prev, entityId: eid, entityName: ent?.entity_name || '' }));
                    setFormErrors(prev => ({ ...prev, entityId: undefined, entityName: undefined }));
                }} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring bg-input-background ${formErrors.entityId || formErrors.entityName ? 'border-error' : 'border-border'}`}>
                      <option value="">اختر النقابة أو المنظمة...</option>
                      {entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.entity_name}</option>)}
                    </select>
                    {(formErrors.entityId || formErrors.entityName) && <p className="text-error text-xs mt-1">{formErrors.entityId || formErrors.entityName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      تاريخ البداية <span className="text-error">*</span>
                    </label>
                    <input type="date" name="startDate" value={formValues.startDate} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring ${formErrors.startDate ? 'border-error' : 'border-border'}`}/>
                    {formErrors.startDate && <p className="text-error text-xs mt-1">{formErrors.startDate}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      تاريخ النهاية <span className="text-error">*</span>
                    </label>
                    <input type="date" name="endDate" value={formValues.endDate} onChange={handleFormChange} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring ${formErrors.endDate ? 'border-error' : 'border-border'}`}/>
                    {formErrors.endDate && <p className="text-error text-xs mt-1">{formErrors.endDate}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      الموقع / المكان <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                      <input type="text" name="location" value={formValues.location} onChange={handleFormChange} placeholder="اسم المكان أو القاعة" className={`w-full pr-9 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring ${formErrors.location ? 'border-error' : 'border-border'}`}/>
                    </div>
                    {formErrors.location && <p className="text-error text-xs mt-1">{formErrors.location}</p>}
                  </div>
                </div>)}

              {/* التبويب الثاني: التفاصيل */}
              {activeTab === 'details' && (<div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">وصف النشاط</label>
                    <textarea name="description" value={formValues.description} onChange={handleFormChange} rows={4} placeholder="وصف تفصيلي للنشاط وأهدافه..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring resize-none"/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        المسؤول <span className="text-error">*</span>
                      </label>
                      <input type="text" name="responsible" value={formValues.responsible} onChange={handleFormChange} placeholder="اسم المسؤول عن تنظيم النشاط" className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring ${formErrors.responsible ? 'border-error' : 'border-border'}`}/>
                      {formErrors.responsible && <p className="text-error text-xs mt-1">{formErrors.responsible}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">مصدر التمويل</label>
                      <input type="text" name="fundingSource" value={formValues.fundingSource} onChange={handleFormChange} placeholder="مثال: ميزانية النقابة، منظمة دولية..." className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">الميزانية المخططة (ريال)</label>
                      <input type="number" name="budget" value={formValues.budget} onChange={handleFormChange} min={0} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">الحالة</label>
                      <select name="status" value={formValues.status} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring bg-input-background">
                        <option value="planned">مخطط</option>
                        <option value="ongoing">جارٍ</option>
                        <option value="completed">منتهٍ</option>
                        <option value="cancelled">ملغى</option>
                      </select>
                    </div>
                  </div>
                </div>)}

              {/* التبويب الثالث: الإحصائيات */}
              {activeTab === 'stats' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      المشاركون المخططون <span className="text-error">*</span>
                    </label>
                    <input type="number" name="plannedParticipants" value={formValues.plannedParticipants} onChange={handleFormChange} min={1} className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring ${formErrors.plannedParticipants ? 'border-error' : 'border-border'}`}/>
                    {formErrors.plannedParticipants && <p className="text-error text-xs mt-1">{formErrors.plannedParticipants}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">المشاركون الفعليون</label>
                    <input type="number" name="actualParticipants" value={formValues.actualParticipants ?? ''} onChange={handleFormChange} min={0} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">عدد المستفيدين</label>
                    <input type="number" name="beneficiariesCount" value={formValues.beneficiariesCount ?? ''} onChange={handleFormChange} min={0} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">التكلفة الفعلية (ريال)</label>
                    <input type="number" name="actualCost" value={formValues.actualCost ?? ''} onChange={handleFormChange} min={0} className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"/>
                  </div>
                  {formValues.budget > 0 && formValues.actualCost != null && (<div className="sm:col-span-2 bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">نسبة الإنفاق</p>
                      <div className="w-full h-2 bg-border rounded-full">
                        <div className={`h-2 rounded-full ${(formValues.actualCost / formValues.budget) > 1 ? 'bg-error' : 'bg-success'}`} style={{ width: `${Math.min(100, (formValues.actualCost / formValues.budget) * 100)}%` }}/>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        {Math.round((formValues.actualCost / formValues.budget) * 100)}% من الميزانية
                      </p>
                    </div>)}
                </div>)}
            </div>

            {/* أزرار الإجراء */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="flex gap-2">
                {activeTab !== 'basic' && (<button onClick={() => setActiveTab(activeTab === 'stats' ? 'details' : 'basic')} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors">
                    السابق
                  </button>)}
                {activeTab !== 'stats' && (<button onClick={() => setActiveTab(activeTab === 'basic' ? 'details' : 'stats')} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors">
                    التالي
                  </button>)}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent/50 text-muted-foreground transition-colors">
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                  {editingActivity ? 'حفظ التغييرات' : 'إضافة النشاط'}
                </button>
              </div>
            </div>
          </div>
        </div>)}

      {confirmDialog}
    </div>);
}
