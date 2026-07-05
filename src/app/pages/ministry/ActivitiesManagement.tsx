/**
 * ActivitiesManagement — إدارة الأنشطة والفعاليات
 * منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Activity, Eye, Edit2, Trash2, Plus, Search, Filter,
  CheckCircle, Clock, X, ChevronRight, ChevronLeft,
  Download, Users, DollarSign, Calendar, MapPin,
  LayoutGrid, List, BookOpen, Mic, Briefcase, Heart,
  Dumbbell, Globe, Star, BarChart2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { toast } from 'sonner';

// ============================================================
// الأنواع
// ============================================================

type ActivityStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
type ActivityType =
  | 'training'
  | 'conference'
  | 'seminar'
  | 'workshop'
  | 'election'
  | 'meeting'
  | 'cultural'
  | 'sports'
  | 'charity'
  | 'awareness'
  | 'other';

interface ActivityItem {
  id: string;
  activityNumber: string;
  activityName: string;
  activityType: ActivityType;
  entityName: string;
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

// ============================================================
// البيانات التجريبية
// ============================================================

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    activityNumber: 'ACT-2026-001',
    activityName: 'دورة تدريبية في مهارات القيادة النقابية',
    activityType: 'training',
    entityName: 'نقابة المعلمين اليمنيين',
    status: 'completed',
    startDate: '2026-01-20',
    endDate: '2026-01-25',
    location: 'فندق موفنبيك - صنعاء',
    description: 'دورة تدريبية متخصصة لتطوير مهارات القيادة والتفاوض للقيادات النقابية',
    plannedParticipants: 40,
    actualParticipants: 38,
    beneficiariesCount: 38,
    budget: 500000,
    actualCost: 480000,
    fundingSource: 'ميزانية النقابة',
    responsible: 'خالد الأهنومي',
  },
  {
    id: '2',
    activityNumber: 'ACT-2026-002',
    activityName: 'مؤتمر العمل النقابي السنوي',
    activityType: 'conference',
    entityName: 'الاتحاد العام للنقابات',
    status: 'completed',
    startDate: '2026-02-15',
    endDate: '2026-02-17',
    location: 'قاعة المؤتمرات الدولية - صنعاء',
    description: 'المؤتمر السنوي لمناقشة قضايا العمل النقابي وسبل التطوير',
    plannedParticipants: 200,
    actualParticipants: 185,
    beneficiariesCount: 185,
    budget: 2000000,
    actualCost: 1950000,
    fundingSource: 'الاتحاد الدولي للنقابات',
    responsible: 'عبدالله السنباني',
  },
  {
    id: '3',
    activityNumber: 'ACT-2026-003',
    activityName: 'ورشة عمل حقوق العامل',
    activityType: 'workshop',
    entityName: 'اتحاد عمال النقل',
    status: 'ongoing',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    location: 'مقر الاتحاد - تعز',
    description: 'ورشة عمل تفاعلية حول حقوق العمال وفق قانون العمل اليمني',
    plannedParticipants: 60,
    budget: 300000,
    fundingSource: 'منظمة العمل الدولية',
    responsible: 'نادية الحجري',
  },
  {
    id: '4',
    activityNumber: 'ACT-2026-004',
    activityName: 'حملة توعية بسلامة العمل',
    activityType: 'awareness',
    entityName: 'نقابة المهندسين',
    status: 'ongoing',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    location: 'مواقع العمل - عدن',
    description: 'حملة توعوية شاملة بمعايير السلامة والصحة المهنية في قطاع البناء',
    plannedParticipants: 500,
    actualParticipants: 320,
    beneficiariesCount: 320,
    budget: 150000,
    actualCost: 95000,
    fundingSource: 'ميزانية النقابة',
    responsible: 'ياسر الكوكباني',
  },
  {
    id: '5',
    activityNumber: 'ACT-2026-005',
    activityName: 'ندوة حول التشريعات العمالية الجديدة',
    activityType: 'seminar',
    entityName: 'نقابة المحامين',
    status: 'planned',
    startDate: '2026-07-10',
    endDate: '2026-07-10',
    location: 'قاعة دار القضاء - صنعاء',
    description: 'ندوة قانونية متخصصة لمناقشة آخر التعديلات على قانون العمل',
    plannedParticipants: 80,
    budget: 100000,
    fundingSource: 'وزارة الشؤون الاجتماعية',
    responsible: 'هدى المحمدي',
  },
  {
    id: '6',
    activityNumber: 'ACT-2026-006',
    activityName: 'البطولة الرياضية السنوية للعمال',
    activityType: 'sports',
    entityName: 'الاتحاد العام للنقابات',
    status: 'planned',
    startDate: '2026-08-15',
    endDate: '2026-08-20',
    location: 'ملعب الثورة - صنعاء',
    description: 'بطولة رياضية تجمع أعضاء النقابات المختلفة لتعزيز الروح الجماعية',
    plannedParticipants: 300,
    budget: 800000,
    fundingSource: 'رعاية مؤسسات خاصة',
    responsible: 'فاطمة الزبيدي',
  },
  {
    id: '7',
    activityNumber: 'ACT-2026-007',
    activityName: 'فعالية خيرية لدعم الأسر المتضررة',
    activityType: 'charity',
    entityName: 'نقابة الأطباء اليمنيين',
    status: 'completed',
    startDate: '2026-03-05',
    endDate: '2026-03-05',
    location: 'مجمع عيادات ابن سينا - إب',
    description: 'تقديم خدمات طبية مجانية وتوزيع مساعدات على الأسر المحتاجة',
    plannedParticipants: 150,
    actualParticipants: 210,
    beneficiariesCount: 420,
    budget: 400000,
    actualCost: 390000,
    fundingSource: 'تبرعات أعضاء النقابة',
    responsible: 'محمد الأكوع',
  },
  {
    id: '8',
    activityNumber: 'ACT-2026-008',
    activityName: 'اجتماع مجلس إدارة النقابة الربعي',
    activityType: 'meeting',
    entityName: 'نقابة الصحفيين',
    status: 'cancelled',
    startDate: '2026-04-20',
    endDate: '2026-04-20',
    location: 'مقر النقابة - صنعاء',
    description: 'اجتماع دوري لمراجعة أداء النقابة ومناقشة الخطط المستقبلية',
    plannedParticipants: 15,
    budget: 20000,
    fundingSource: 'ميزانية النقابة',
    responsible: 'عمر البيضاني',
  },
];

// ============================================================
// الثوابت
// ============================================================

const ENTITY_LIST = [
  'نقابة المعلمين اليمنيين',
  'نقابة المهندسين',
  'نقابة الأطباء اليمنيين',
  'اتحاد عمال النقل',
  'نقابة الصحفيين',
  'نقابة المحامين',
  'اتحاد موظفي الدولة',
  'الاتحاد العام للنقابات',
];

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ElementType; color: string }> = {
  training:   { label: 'تدريب',       icon: BookOpen,  color: 'text-blue-600 bg-blue-50' },
  conference: { label: 'مؤتمر',       icon: Mic,       color: 'text-purple-600 bg-purple-50' },
  seminar:    { label: 'ندوة',        icon: Star,      color: 'text-indigo-600 bg-indigo-50' },
  workshop:   { label: 'ورشة عمل',   icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  election:   { label: 'انتخابات',   icon: BarChart2, color: 'text-red-600 bg-red-50' },
  meeting:    { label: 'اجتماع',     icon: Users,     color: 'text-gray-600 bg-gray-50' },
  cultural:   { label: 'ثقافي',      icon: Globe,     color: 'text-teal-600 bg-teal-50' },
  sports:     { label: 'رياضي',      icon: Dumbbell,  color: 'text-green-600 bg-green-50' },
  charity:    { label: 'خيري',       icon: Heart,     color: 'text-pink-600 bg-pink-50' },
  awareness:  { label: 'توعوي',      icon: Activity,  color: 'text-orange-600 bg-orange-50' },
  other:      { label: 'أخرى',       icon: Activity,  color: 'text-gray-600 bg-gray-100' },
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

function buildEmptyActivityForm(count: number): ActivityFormValues {
  return {
    activityNumber: `ACT-2026-${String(count + 1).padStart(3, '0')}`,
    activityName: '',
    activityType: 'training',
    entityName: '',
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
  const [activities, setActivities] = useState<ActivityItem[]>(MOCK_ACTIVITIES);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ============================================================
  // التصفية
  // ============================================================

  const filtered = useMemo(() => {
    return activities.filter(a => {
      const q = searchQuery.trim();
      const matchSearch =
        !q ||
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

  const [formValues, setFormValues] = useState<ActivityFormValues>(buildEmptyActivityForm(MOCK_ACTIVITIES.length));
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ActivityFormValues, string>>>({});

  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const parsed = type === 'number' ? Number(value) : value;
    setFormValues(prev => ({ ...prev, [name]: parsed }));
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  function validateActivityForm(vals: ActivityFormValues): boolean {
    const errs: Partial<Record<keyof ActivityFormValues, string>> = {};
    if (!vals.activityName) errs.activityName = 'اسم النشاط مطلوب';
    if (!vals.entityName) errs.entityName = 'اسم الكيان مطلوب';
    if (!vals.startDate) errs.startDate = 'تاريخ البداية مطلوب';
    if (!vals.endDate) errs.endDate = 'تاريخ النهاية مطلوب';
    if (!vals.location) errs.location = 'الموقع مطلوب';
    if (!vals.responsible) errs.responsible = 'المسؤول مطلوب';
    if (!vals.plannedParticipants || Number(vals.plannedParticipants) < 1) errs.plannedParticipants = 'عدد المشاركين يجب أن يكون أكبر من صفر';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ============================================================
  // الإجراءات
  // ============================================================

  const openAdd = useCallback(() => {
    const empty = buildEmptyActivityForm(activities.length);
    setFormValues(empty);
    setFormErrors({});
    setEditingActivity(null);
    setActiveTab('basic');
    setShowModal(true);
  }, [activities.length]);

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
    if (!ok) return;
    setActivities(prev => prev.filter(a => a.id !== activity.id));
    logAudit({ action: 'delete', resource: 'activity', resourceId: activity.id, details: activity.activityNumber });
    toast.success(`تم حذف النشاط "${activity.activityName}" بنجاح`);
  }, [confirm]);

  const handleSave = useCallback(() => {
    if (!validateActivityForm(formValues)) {
      setActiveTab('basic');
      return;
    }
    if (editingActivity) {
      const updated: ActivityItem = { ...editingActivity, ...formValues };
      setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
      logAudit({ action: 'update', resource: 'activity', resourceId: updated.id, details: updated.activityNumber });
      toast.success('تم تحديث بيانات النشاط بنجاح');
    } else {
      const newActivity: ActivityItem = { ...formValues, id: `act-${Date.now()}` };
      setActivities(prev => [...prev, newActivity]);
      logAudit({ action: 'create', resource: 'activity', resourceId: newActivity.id, details: newActivity.activityNumber });
      toast.success('تمت إضافة النشاط بنجاح');
    }
    setShowModal(false);
  }, [editingActivity, formValues]);

  const handleExport = useCallback(() => {
    exportReportToExcel({
      title: 'تقرير الأنشطة والفعاليات',
      reportType: 'activities_list',
      data: activities,
      columns: [
        { key: 'activityNumber', label: 'رقم النشاط' },
        { key: 'activityName', label: 'اسم النشاط' },
        { key: 'activityType', label: 'النوع', format: (v: string) => ACTIVITY_TYPE_CONFIG[v as ActivityType]?.label || v },
        { key: 'entityName', label: 'الكيان' },
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

  function ActivityCard({ activity }: { activity: ActivityItem }) {
    const cfg = ACTIVITY_TYPE_CONFIG[activity.activityType];
    const Icon = cfg.icon;
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <StatusBadge status={activity.status} />
        </div>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">{activity.activityName}</h3>
        <p className="text-xs text-gray-400 mb-3">{activity.entityName}</p>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{activity.startDate} — {activity.endDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{activity.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{activity.plannedParticipants.toLocaleString('ar')} مشارك مخطط</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{activity.budget.toLocaleString('ar')} ريال</span>
          </div>
        </div>
        <div className="flex items-center gap-1 pt-3 border-t border-gray-50">
          <button onClick={() => openEdit(activity)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(activity)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="تعديل">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(activity)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // العرض الرئيسي
  // ============================================================

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة الأنشطة والفعاليات"
        subtitle="متابعة وإدارة الأنشطة النقابية"
        breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'الأنشطة والفعاليات' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              تصدير Excel
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              إضافة نشاط
            </button>
          </div>
        }
      />

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأنشطة', value: stats.total, Icon: Activity, color: 'text-blue-600 bg-blue-50', filter: 'all' as const },
          { label: 'مخططة', value: stats.planned, Icon: Clock, color: 'text-indigo-600 bg-indigo-50', filter: 'planned' as const },
          { label: 'جارٍ', value: stats.ongoing, Icon: BarChart2, color: 'text-amber-600 bg-amber-50', filter: 'ongoing' as const },
          { label: 'منتهٍ', value: stats.completed, Icon: CheckCircle, color: 'text-green-600 bg-green-50', filter: 'completed' as const },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => { setStatusFilter(stat.filter); setCurrentPage(1); }}
            className={`bg-white rounded-xl border p-4 shadow-sm text-right transition-all hover:shadow-md ${statusFilter === stat.filter ? 'border-[#1E3A8A] ring-1 ring-[#1E3A8A]/20' : 'border-gray-100'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.Icon className="w-4 h-4" />
              </div>
              <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* شريط التحكم */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث باسم النشاط أو الكيان..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value as ActivityType | 'all'); setCurrentPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
            >
              <option value="all">جميع الأنواع</option>
              {Object.entries(ACTIVITY_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as ActivityStatus | 'all'); setCurrentPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="planned">مخطط</option>
              <option value="ongoing">جارٍ</option>
              <option value="completed">منتهٍ</option>
              <option value="cancelled">ملغى</option>
            </select>
            {/* أزرار تبديل العرض */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#1E3A8A] text-white' : 'hover:bg-gray-50 text-gray-500'}`}
                title="عرض شبكي"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-[#1E3A8A] text-white' : 'hover:bg-gray-50 text-gray-500'}`}
                title="عرض جدولي"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* العرض الشبكي */}
      {viewMode === 'grid' && (
        <>
          {paginated.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
              <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">لا توجد أنشطة مطابقة للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map(activity => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </>
      )}

      {/* العرض الجدولي */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-right font-semibold text-gray-600 w-10">#</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">النشاط</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">النوع</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">الكيان</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">الفترة</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">المشاركون</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">الميزانية</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">الحالة</th>
                  <th className="py-3 px-4 text-right font-semibold text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Activity className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400">لا توجد أنشطة مطابقة</p>
                    </td>
                  </tr>
                ) : paginated.map((activity, idx) => {
                  const cfg = ACTIVITY_TYPE_CONFIG[activity.activityType];
                  const Icon = cfg.icon;
                  return (
                    <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800 text-xs">{activity.activityName}</p>
                        <p className="text-xs text-gray-400 font-mono">{activity.activityNumber}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{activity.entityName}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                        <div>{activity.startDate}</div>
                        <div>{activity.endDate}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs">
                        {activity.plannedParticipants.toLocaleString('ar')}
                        {activity.actualParticipants != null && (
                          <span className="text-green-600 block">فعلي: {activity.actualParticipants.toLocaleString('ar')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs">
                        {activity.budget.toLocaleString('ar')}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={activity.status} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(activity)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(activity)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(activity)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* الترقيم */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} نشاط
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-40 text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors border ${p === currentPage ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-40 text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">
                    {editingActivity ? 'تعديل بيانات النشاط' : 'إضافة نشاط جديد'}
                  </h2>
                  <p className="text-xs text-gray-400">{formValues.activityNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* تبويبات النموذج */}
            <div className="flex border-b border-gray-100 px-6">
              {[
                { key: 'basic' as ModalTab, label: 'البيانات الأساسية' },
                { key: 'details' as ModalTab, label: 'التفاصيل' },
                { key: 'stats' as ModalTab, label: 'الإحصائيات' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* محتوى النموذج */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* التبويب الأول: البيانات الأساسية */}
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      اسم النشاط <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="activityName"
                      value={formValues.activityName}
                      onChange={handleFormChange}
                      placeholder="أدخل اسم النشاط أو الفعالية"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.activityName ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {formErrors.activityName && <p className="text-red-500 text-xs mt-1">{formErrors.activityName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">نوع النشاط</label>
                    <select
                      name="activityType"
                      value={formValues.activityType}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
                    >
                      {Object.entries(ACTIVITY_TYPE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      الكيان <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="entityName"
                      value={formValues.entityName}
                      onChange={handleFormChange}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white ${formErrors.entityName ? 'border-red-400' : 'border-gray-200'}`}
                    >
                      <option value="">اختر الكيان...</option>
                      {ENTITY_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    {formErrors.entityName && <p className="text-red-500 text-xs mt-1">{formErrors.entityName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      تاريخ البداية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formValues.startDate}
                      onChange={handleFormChange}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.startDate ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {formErrors.startDate && <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      تاريخ النهاية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formValues.endDate}
                      onChange={handleFormChange}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.endDate ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {formErrors.endDate && <p className="text-red-500 text-xs mt-1">{formErrors.endDate}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      الموقع / المكان <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="location"
                        value={formValues.location}
                        onChange={handleFormChange}
                        placeholder="اسم المكان أو القاعة"
                        className={`w-full pr-9 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.location ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    {formErrors.location && <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>}
                  </div>
                </div>
              )}

              {/* التبويب الثاني: التفاصيل */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">وصف النشاط</label>
                    <textarea
                      name="description"
                      value={formValues.description}
                      onChange={handleFormChange}
                      rows={4}
                      placeholder="وصف تفصيلي للنشاط وأهدافه..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        المسؤول <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="responsible"
                        value={formValues.responsible}
                        onChange={handleFormChange}
                        placeholder="اسم المسؤول عن تنظيم النشاط"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.responsible ? 'border-red-400' : 'border-gray-200'}`}
                      />
                      {formErrors.responsible && <p className="text-red-500 text-xs mt-1">{formErrors.responsible}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">مصدر التمويل</label>
                      <input
                        type="text"
                        name="fundingSource"
                        value={formValues.fundingSource}
                        onChange={handleFormChange}
                        placeholder="مثال: ميزانية النقابة، منظمة دولية..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">الميزانية المخططة (ريال)</label>
                      <input
                        type="number"
                        name="budget"
                        value={formValues.budget}
                        onChange={handleFormChange}
                        min={0}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">الحالة</label>
                      <select
                        name="status"
                        value={formValues.status}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
                      >
                        <option value="planned">مخطط</option>
                        <option value="ongoing">جارٍ</option>
                        <option value="completed">منتهٍ</option>
                        <option value="cancelled">ملغى</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* التبويب الثالث: الإحصائيات */}
              {activeTab === 'stats' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      المشاركون المخططون <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="plannedParticipants"
                      value={formValues.plannedParticipants}
                      onChange={handleFormChange}
                      min={1}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.plannedParticipants ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {formErrors.plannedParticipants && <p className="text-red-500 text-xs mt-1">{formErrors.plannedParticipants}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">المشاركون الفعليون</label>
                    <input
                      type="number"
                      name="actualParticipants"
                      value={formValues.actualParticipants ?? ''}
                      onChange={handleFormChange}
                      min={0}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">عدد المستفيدين</label>
                    <input
                      type="number"
                      name="beneficiariesCount"
                      value={formValues.beneficiariesCount ?? ''}
                      onChange={handleFormChange}
                      min={0}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">التكلفة الفعلية (ريال)</label>
                    <input
                      type="number"
                      name="actualCost"
                      value={formValues.actualCost ?? ''}
                      onChange={handleFormChange}
                      min={0}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                    />
                  </div>
                  {formValues.budget > 0 && formValues.actualCost != null && (
                    <div className="sm:col-span-2 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">نسبة الإنفاق</p>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-2 rounded-full ${(formValues.actualCost / formValues.budget) > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (formValues.actualCost / formValues.budget) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        {Math.round((formValues.actualCost / formValues.budget) * 100)}% من الميزانية
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* أزرار الإجراء */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex gap-2">
                {activeTab !== 'basic' && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'stats' ? 'details' : 'basic')}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    السابق
                  </button>
                )}
                {activeTab !== 'stats' && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'basic' ? 'details' : 'stats')}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    التالي
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 text-sm bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition-colors font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {editingActivity ? 'حفظ التغييرات' : 'إضافة النشاط'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
