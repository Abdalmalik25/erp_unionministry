/**
 * ElectionsManagement — إدارة الانتخابات النقابية
 * منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Vote, Eye, Edit2, Trash2, Plus, Search, Filter,
  CheckCircle, Clock, X, ChevronRight, ChevronLeft,
  Download, AlertCircle, Users, MapPin,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useFormValidation } from '../../hooks/useFormValidation';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { toast } from 'sonner';

// ============================================================
// الأنواع
// ============================================================

type ElectionStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
type ElectionType = 'general' | 'board' | 'committee';

interface Election {
  id: string;
  electionNumber: string;
  entityName: string;
  entityId: string;
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
  winners?: string[];
}

// ============================================================
// البيانات التجريبية
// ============================================================

const MOCK_ELECTIONS: Election[] = [
  {
    id: '1',
    electionNumber: 'YE-ELC-2026-001',
    entityName: 'نقابة المعلمين اليمنيين',
    entityId: 'ENT-001',
    electionType: 'general',
    status: 'completed',
    plannedDate: '2026-01-15',
    startDate: '2026-01-15',
    endDate: '2026-01-15',
    eligibleVoters: 1240,
    actualVoters: 987,
    candidatesCount: 18,
    positionsCount: 7,
    supervisedBy: 'أحمد محمد الشامي',
    venue: 'قاعة المؤتمرات الكبرى - صنعاء',
    notes: 'جرت الانتخابات بشكل سلس وشفاف',
    winners: ['عبدالله السنباني', 'فاطمة الزبيدي', 'محمد الأكوع'],
  },
  {
    id: '2',
    electionNumber: 'YE-ELC-2026-002',
    entityName: 'نقابة المهندسين',
    entityId: 'ENT-002',
    electionType: 'board',
    status: 'completed',
    plannedDate: '2026-02-10',
    startDate: '2026-02-10',
    endDate: '2026-02-10',
    eligibleVoters: 856,
    actualVoters: 714,
    candidatesCount: 12,
    positionsCount: 5,
    supervisedBy: 'سلوى عبدالحميد',
    venue: 'مقر النقابة الرئيسي - عدن',
    notes: 'نسبة مشاركة مرتفعة',
    winners: ['خالد الأهنومي', 'رانيا المقطري'],
  },
  {
    id: '3',
    electionNumber: 'YE-ELC-2026-003',
    entityName: 'نقابة الأطباء اليمنيين',
    entityId: 'ENT-003',
    electionType: 'general',
    status: 'ongoing',
    plannedDate: '2026-06-10',
    startDate: '2026-06-10',
    eligibleVoters: 2100,
    candidatesCount: 24,
    positionsCount: 9,
    supervisedBy: 'ياسر الكوكباني',
    venue: 'المركز الصحي الكبير - إب',
    notes: 'الانتخابات جارية الآن',
  },
  {
    id: '4',
    electionNumber: 'YE-ELC-2026-004',
    entityName: 'اتحاد عمال النقل',
    entityId: 'ENT-004',
    electionType: 'committee',
    status: 'planned',
    plannedDate: '2026-07-20',
    eligibleVoters: 540,
    candidatesCount: 8,
    positionsCount: 3,
    supervisedBy: 'نادية الحجري',
    venue: 'قاعة المحافظة - تعز',
  },
  {
    id: '5',
    electionNumber: 'YE-ELC-2026-005',
    entityName: 'نقابة الصحفيين',
    entityId: 'ENT-005',
    electionType: 'board',
    status: 'planned',
    plannedDate: '2026-08-05',
    eligibleVoters: 310,
    candidatesCount: 10,
    positionsCount: 4,
    supervisedBy: 'عمر البيضاني',
    venue: 'نادي الصحافة - صنعاء',
    notes: 'مرتقبة بعد إعادة هيكلة النقابة',
  },
  {
    id: '6',
    electionNumber: 'YE-ELC-2026-006',
    entityName: 'نقابة المحامين',
    entityId: 'ENT-006',
    electionType: 'general',
    status: 'cancelled',
    plannedDate: '2026-03-22',
    eligibleVoters: 680,
    candidatesCount: 15,
    positionsCount: 6,
    supervisedBy: 'هدى المحمدي',
    venue: 'دار القضاء - صنعاء',
    notes: 'أُلغيت بسبب خلافات داخلية، ستُعاد الجدولة',
  },
];

const ENTITY_LIST = [
  'نقابة المعلمين اليمنيين',
  'نقابة المهندسين',
  'نقابة الأطباء اليمنيين',
  'اتحاد عمال النقل',
  'نقابة الصحفيين',
  'نقابة المحامين',
  'اتحاد موظفي الدولة',
  'نقابة عمال البناء',
];

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

type ElectionFormValues = Omit<Election, 'id' | 'winners'>;

function buildEmptyForm(count: number): ElectionFormValues {
  return {
    electionNumber: `YE-ELC-2026-${String(count + 1).padStart(3, '0')}`,
    entityName: '',
    entityId: '',
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
  const [elections, setElections] = useState<Election[]>(MOCK_ELECTIONS);
  const [showModal, setShowModal] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ElectionStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ============================================================
  // التصفية
  // ============================================================

  const filtered = useMemo(() => {
    return elections.filter(e => {
      const q = searchQuery.trim();
      const matchSearch =
        !q ||
        e.entityName.includes(q) ||
        e.electionNumber.includes(q) ||
        e.supervisedBy.includes(q);
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

  const [formValues, setFormValues] = useState<ElectionFormValues>(buildEmptyForm(MOCK_ELECTIONS.length));
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ElectionFormValues, string>>>({});

  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const parsed = type === 'number' ? Number(value) : value;
    setFormValues(prev => ({ ...prev, [name]: parsed }));
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  function validateForm(vals: ElectionFormValues): boolean {
    const errs: Partial<Record<keyof ElectionFormValues, string>> = {};
    if (!vals.entityName) errs.entityName = 'اسم الكيان مطلوب';
    if (!vals.plannedDate) errs.plannedDate = 'التاريخ المخطط مطلوب';
    if (!vals.supervisedBy) errs.supervisedBy = 'اسم المشرف مطلوب';
    if (!vals.venue) errs.venue = 'مكان الإجراء مطلوب';
    if (!vals.eligibleVoters || Number(vals.eligibleVoters) < 1) errs.eligibleVoters = 'يجب أن يكون أكبر من صفر';
    if (!vals.positionsCount || Number(vals.positionsCount) < 1) errs.positionsCount = 'يجب أن يكون أكبر من صفر';
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
      electionNumber: election.electionNumber,
      entityName: election.entityName,
      entityId: election.entityId,
      electionType: election.electionType,
      status: election.status,
      plannedDate: election.plannedDate,
      startDate: election.startDate,
      endDate: election.endDate,
      eligibleVoters: election.eligibleVoters,
      actualVoters: election.actualVoters,
      candidatesCount: election.candidatesCount,
      positionsCount: election.positionsCount,
      supervisedBy: election.supervisedBy,
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
      message: `هل أنت متأكد من حذف انتخابات "${election.entityName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف',
      variant: 'danger',
    });
    if (!ok) return;
    setElections(prev => prev.filter(e => e.id !== election.id));
    logAudit({ action: 'delete', resource: 'election', resourceId: election.id, details: election.electionNumber });
    toast.success(`تم حذف الانتخابات ${election.electionNumber} بنجاح`);
  }, [confirm]);

  const handleSave = useCallback(() => {
    if (!validateForm(formValues)) return;

    if (editingElection) {
      const updated: Election = { ...editingElection, ...formValues };
      setElections(prev => prev.map(e => e.id === updated.id ? updated : e));
      logAudit({ action: 'update', resource: 'election', resourceId: updated.id, details: updated.electionNumber });
      toast.success('تم تحديث بيانات الانتخابات بنجاح');
    } else {
      const newElection: Election = { ...formValues, id: `elc-${Date.now()}` };
      setElections(prev => [...prev, newElection]);
      logAudit({ action: 'create', resource: 'election', resourceId: newElection.id, details: newElection.electionNumber });
      toast.success('تمت إضافة الانتخابات بنجاح');
    }
    setShowModal(false);
  }, [editingElection, formValues]);

  const handleExport = useCallback(() => {
    exportReportToExcel({
      title: 'تقرير الانتخابات النقابية',
      reportType: 'activities_list',
      data: elections,
      columns: [
        { key: 'electionNumber', label: 'رقم الانتخابات' },
        { key: 'entityName', label: 'الكيان' },
        { key: 'electionType', label: 'النوع', format: (v: string) => ELECTION_TYPE_LABELS[v as ElectionType] || v },
        { key: 'plannedDate', label: 'التاريخ المخطط' },
        { key: 'eligibleVoters', label: 'المقترعون المؤهلون' },
        { key: 'status', label: 'الحالة', format: (v: string) => STATUS_LABELS[v as ElectionStatus] || v },
      ],
    });
    logAudit({ action: 'export', resource: 'elections', details: 'Excel export' });
    toast.success('تم تصدير البيانات بنجاح');
  }, [elections]);

  // ============================================================
  // العرض
  // ============================================================

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة الانتخابات"
        subtitle="متابعة وإدارة الانتخابات النقابية"
        breadcrumbs={[{ label: 'الرئيسية', to: '/' }, { label: 'إدارة الانتخابات' }]}
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
              إضافة انتخابات
            </button>
          </div>
        }
      />

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الانتخابات', value: stats.total, Icon: Vote, color: 'text-blue-600 bg-blue-50', filter: 'all' as const },
          { label: 'مخططة', value: stats.planned, Icon: Clock, color: 'text-indigo-600 bg-indigo-50', filter: 'planned' as const },
          { label: 'جارية', value: stats.ongoing, Icon: AlertCircle, color: 'text-amber-600 bg-amber-50', filter: 'ongoing' as const },
          { label: 'منتهية', value: stats.completed, Icon: CheckCircle, color: 'text-green-600 bg-green-50', filter: 'completed' as const },
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

      {/* شريط البحث والتصفية */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث برقم الانتخابات أو اسم الكيان..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as ElectionStatus | 'all'); setCurrentPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="planned">مخطط</option>
              <option value="ongoing">جارٍ</option>
              <option value="completed">منتهٍ</option>
              <option value="cancelled">ملغى</option>
            </select>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-right font-semibold text-gray-600 w-10">#</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">رقم الانتخابات</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الكيان</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">النوع</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">التاريخ المخطط</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">المقترعون</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 text-right font-semibold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Vote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">لا توجد انتخابات مطابقة للبحث</p>
                    <p className="text-gray-300 text-xs mt-1">جرّب تغيير معايير التصفية</p>
                  </td>
                </tr>
              ) : (
                paginated.map((election, idx) => (
                  <tr key={election.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {election.electionNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{election.entityName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3" />
                        المشرف: {election.supervisedBy}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{ELECTION_TYPE_LABELS[election.electionType]}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">{election.plannedDate}</td>
                    <td className="py-3 px-4">
                      <div className="text-gray-800 font-medium">{election.eligibleVoters.toLocaleString('ar')}</div>
                      {election.actualVoters != null && (
                        <div className="text-xs text-green-600">
                          فعلي: {election.actualVoters.toLocaleString('ar')}
                          {' '}({Math.round((election.actualVoters / election.eligibleVoters) * 100)}%)
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={election.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(election)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(election)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(election)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* الترقيم */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} انتخابات
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${p === currentPage ? 'bg-[#1E3A8A] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة الإضافة/التعديل */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">
                    {editingElection ? 'تعديل بيانات الانتخابات' : 'إضافة انتخابات جديدة'}
                  </h2>
                  <p className="text-xs text-gray-400">{formValues.electionNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* المحتوى */}
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* رقم الانتخابات */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">رقم الانتخابات</label>
                  <input
                    value={formValues.electionNumber}
                    readOnly
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono"
                  />
                </div>

                {/* الكيان */}
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

                {/* نوع الانتخابات */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">نوع الانتخابات</label>
                  <select
                    name="electionType"
                    value={formValues.electionType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] bg-white"
                  >
                    <option value="general">انتخابات عامة</option>
                    <option value="board">انتخابات مجلس الإدارة</option>
                    <option value="committee">انتخابات اللجان</option>
                  </select>
                </div>

                {/* التاريخ المخطط */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    التاريخ المخطط <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="plannedDate"
                    value={formValues.plannedDate}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.plannedDate ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.plannedDate && <p className="text-red-500 text-xs mt-1">{formErrors.plannedDate}</p>}
                </div>

                {/* المقترعون المؤهلون */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    المقترعون المؤهلون <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="eligibleVoters"
                    value={formValues.eligibleVoters}
                    onChange={handleFormChange}
                    min={1}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.eligibleVoters ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.eligibleVoters && <p className="text-red-500 text-xs mt-1">{formErrors.eligibleVoters}</p>}
                </div>

                {/* عدد المرشحين */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">عدد المرشحين</label>
                  <input
                    type="number"
                    name="candidatesCount"
                    value={formValues.candidatesCount}
                    onChange={handleFormChange}
                    min={0}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A]"
                  />
                </div>

                {/* عدد المناصب */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    عدد المناصب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="positionsCount"
                    value={formValues.positionsCount}
                    onChange={handleFormChange}
                    min={1}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.positionsCount ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.positionsCount && <p className="text-red-500 text-xs mt-1">{formErrors.positionsCount}</p>}
                </div>

                {/* المشرف */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    المشرف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="supervisedBy"
                    value={formValues.supervisedBy}
                    onChange={handleFormChange}
                    placeholder="اسم المشرف على الانتخابات"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.supervisedBy ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {formErrors.supervisedBy && <p className="text-red-500 text-xs mt-1">{formErrors.supervisedBy}</p>}
                </div>

                {/* مكان الإجراء */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    مكان الإجراء <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="venue"
                      value={formValues.venue}
                      onChange={handleFormChange}
                      placeholder="القاعة أو المكان الذي ستُعقد فيه الانتخابات"
                      className={`w-full pr-9 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] ${formErrors.venue ? 'border-red-400' : 'border-gray-200'}`}
                    />
                  </div>
                  {formErrors.venue && <p className="text-red-500 text-xs mt-1">{formErrors.venue}</p>}
                </div>

                {/* ملاحظات */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">ملاحظات</label>
                  <textarea
                    name="notes"
                    value={formValues.notes ?? ''}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="ملاحظات إضافية حول الانتخابات..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* أزرار الإجراء */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
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
                {editingElection ? 'حفظ التغييرات' : 'إضافة الانتخابات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
