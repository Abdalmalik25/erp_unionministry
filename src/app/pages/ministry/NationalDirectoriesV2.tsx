/**
 * NationalDirectoriesV2.tsx — إدارة متقدمة للأدلة الوطنية
 * تكامل End-to-End مع السجلات القائمة:
 * - ربط المهن بالعاملين والمنشآت
 * - ربط المحافظات بالأشخاص والكيانات القانونية
 * - ربط أنواع العقود بالعقود
 * - إدارة الإصدارات والاعتماد
 * - فحص الاستخدام قبل التعطيل
 * - نشر التغييرات على السجلات المرتبطة
 *
 * المعايير المطبقة:
 * - ISCO-08 (تصنيف المهن الدولي)
 * - ISIC Rev.4 (التصنيف الصناعي الدولي)
 * - القانون اليمني (قانون العمل 15/1995، قانون النقابات 35/2002)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers, Briefcase, Building2, Scale, Landmark, MapPin, FileText, Shield,
  ChevronDown, ChevronLeft, ChevronRight, Plus, Edit, Trash2, RefreshCw,
  Search, Filter, Download, Upload, CheckCircle, XCircle, AlertTriangle,
  GitBranch, History, Database, Link2, ExternalLink, Eye, EyeOff, MoreHorizontal
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'sonner';

import {
  DirectoryEntry,
  DirectoryType,
  DirectoryStats,
  LinkedRecord,
  DirectoryVersion,
  DirectoryChangeLog,
  listDirectory,
  getDirectoryEntry,
  createDirectoryEntry,
  updateDirectoryEntry,
  deactivateDirectoryEntry,
  reactivateDirectoryEntry,
  getRelatedRecords,
  checkDirectoryUsage,
  propagateDirectoryChange,
  getDirectoryVersions,
  createDirectoryVersion,
  approveDirectoryVersion,
  getDirectoryChangeLog,
  getDirectoryStats,
  getGovernoratesWithDistricts,
  getOccupationsTree,
  getActivitiesTree,
  exportDirectory,
  importDirectory } from '../../services/nationalDirectoriesService';

// ==================== الأنواع المحلية ====================

interface DirectoryTab {
  type: DirectoryType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

interface UsageCheck {
  is_used: boolean;
  usage_count: number;
  usage_by_type: Record<string, number>;
  blocking_records: LinkedRecord[];
}

interface VersionForm {
  changes_summary: string;
  change_reasons: string[];
  effective_from: string;
}

// ==================== الثوابت ====================

const DIRECTORY_TABS: DirectoryTab[] = [
  {
    type: 'occupation',
    label: 'المهن',
    icon: Briefcase,
    description: 'تصنيف المهن ISCO-08',
    color: 'bg-blue-500' },
  {
    type: 'activity',
    label: 'الأنشطة الاقتصادية',
    icon: Layers,
    description: 'التصنيف الصناعي ISIC-4',
    color: 'bg-green-500' },
  {
    type: 'establishment',
    label: 'أحجام المنشآت',
    icon: Building2,
    description: 'تصنيف المنشآت حسب الحجم',
    color: 'bg-purple-500' },
  {
    type: 'legal_form',
    label: 'الأشكال القانونية',
    icon: Scale,
    description: 'الأنواع القانونية للمنشآت',
    color: 'bg-orange-500' },
  {
    type: 'ownership',
    label: 'أنواع التملك',
    icon: Landmark,
    description: 'الملكية الحكومية والخاصة',
    color: 'bg-teal-500' },
  {
    type: 'governorate',
    label: 'المحافظات',
    icon: MapPin,
    description: 'التقسيم الإداري اليمني',
    color: 'bg-red-500' },
  {
    type: 'contract_type',
    label: 'أنواع العقود',
    icon: FileText,
    description: 'عقود العمل اليمنية',
    color: 'bg-indigo-500' },
  {
    type: 'economic_sector',
    label: 'القطاعات الاقتصادية',
    icon: Database,
    description: 'القطاعات حسب ISIC',
    color: 'bg-pink-500' },
];

const PAGE_SIZE = 20;

// ==================== المكون الرئيسي ====================

export function NationalDirectoriesV2() {
  // ==================== الحالة ====================
  const [activeType, setActiveType] = useState<DirectoryType>('occupation');
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [stats, setStats] = useState<Record<DirectoryType, DirectoryStats>>({} as any);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // نافذة التعديل
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    parent_code: '',
    level: 1,
    sort_order: 0 });
  const [saving, setSaving] = useState(false);

  // نافذة التفاصيل والربط
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);
  const [relatedRecords, setRelatedRecords] = useState<LinkedRecord[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  // نافذة الإصدارات
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versions, setVersions] = useState<DirectoryVersion[]>([]);
  const [changeLog, setChangeLog] = useState<DirectoryChangeLog[]>([]);
  const [versionForm, setVersionForm] = useState<VersionForm>({
    changes_summary: '',
    change_reasons: [],
    effective_from: new Date().toISOString().split('T')[0] });

  // فحص الاستخدام
  const [usageCheck, setUsageCheck] = useState<UsageCheck | null>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);

  // فلترة
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<'code' | 'name_ar' | 'sort_order'>('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ==================== التحميل ====================

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listDirectory(activeType, {
        is_active: showInactive ? undefined : true,
        search: searchTerm || undefined,
        page: currentPage,
        page_size: PAGE_SIZE,
        sort_by: sortBy,
        sort_dir: sortDir,
        include_relations: true });
      setEntries(result.data);
      setTotalCount(result.total);
    } catch (err) {
      toast.error('فشل في تحميل الأدلة الوطنية');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeType, showInactive, searchTerm, currentPage, sortBy, sortDir]);

  const loadStats = useCallback(async () => {
    try {
      const allStats = await getDirectoryStats();
      const map: Record<string, DirectoryStats> = {};
      for (const s of allStats) {
        map[s.directory_type] = s;
      }
      setStats(map as any);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    loadStats();
  }, [loadEntries, loadStats]);

  // ==================== الإجراءات ====================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenCreate = () => {
    setEditingEntry(null);
    setFormData({
      code: '',
      name_ar: '',
      name_en: '',
      parent_code: '',
      level: 1,
      sort_order: entries.length });
    setShowModal(true);
  };

  const handleOpenEdit = (entry: DirectoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      code: entry.code,
      name_ar: entry.name_ar,
      name_en: entry.name_en || '',
      parent_code: entry.parent_code || '',
      level: entry.level,
      sort_order: entry.sort_order });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name_ar.trim()) {
      toast.error('الرمز والاسم العربي مطلوبان');
      return;
    }
    setSaving(true);
    try {
      if (editingEntry) {
        await updateDirectoryEntry(activeType, editingEntry.code, {
          code: formData.code.trim(),
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || undefined,
          parent_code: formData.parent_code.trim() || undefined,
          level: formData.level,
          sort_order: formData.sort_order });
        toast.success('تم تحديث الدليل بنجاح');
      } else {
        await createDirectoryEntry(activeType, {
          code: formData.code.trim(),
          name_ar: formData.name_ar.trim(),
          name_en: formData.name_en.trim() || undefined,
          parent_code: formData.parent_code.trim() || undefined,
          level: formData.level,
          sort_order: formData.sort_order });
        toast.success('تم إنشاء الدليل بنجاح');
      }
      setShowModal(false);
      loadEntries();
      loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'فشل في حفظ الدليل');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (entry: DirectoryEntry) => {
    // فحص الاستخدام أولاً
    setLoadingRelations(true);
    try {
      const usage = await checkDirectoryUsage(activeType, entry.code);
      setUsageCheck(usage);
      setShowUsageModal(true);
      setSelectedEntry(entry);
    } catch (err) {
      toast.error('فشل في فحص الاستخدام');
    } finally {
      setLoadingRelations(false);
    }
  };

  const confirmDeactivate = async (reason: string) => {
    if (!selectedEntry) return;
    try {
      await deactivateDirectoryEntry(activeType, selectedEntry.code, reason);
      toast.success('تم تعطيل الدليل بنجاح');
      setShowUsageModal(false);
      loadEntries();
      loadStats();
    } catch (err) {
      toast.error('فشل في تعطيل الدليل');
    }
  };

  const handleReactivate = async (entry: DirectoryEntry) => {
    try {
      await reactivateDirectoryEntry(activeType, entry.code);
      toast.success('تم إعادة تفعيل الدليل بنجاح');
      loadEntries();
      loadStats();
    } catch (err) {
      toast.error('فشل في إعادة التفعيل');
    }
  };

  const handleViewDetails = async (entry: DirectoryEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
    setLoadingRelations(true);
    try {
      const related = await getRelatedRecords(activeType, entry.code);
      setRelatedRecords(related);
    } catch (err) {
      console.error('Failed to load related', err);
    } finally {
      setLoadingRelations(false);
    }
  };

  const handlePropagate = async () => {
    if (!selectedEntry) return;
    try {
      const result = await propagateDirectoryChange(activeType, selectedEntry.code, {
        cascade_update: true });
      toast.success(
        `تم نشر التغييرات على ${result.affected_count} سجل`
      );
    } catch (err) {
      toast.error('فشل في نشر التغييرات');
    }
  };

  // ==================== الإصدارات ====================

  const handleViewVersions = async () => {
    setShowVersionModal(true);
    try {
      const [v, log] = await Promise.all([
        getDirectoryVersions(activeType),
        getDirectoryChangeLog(activeType, { limit: 50 }),
      ]);
      setVersions(v);
      setChangeLog(log);
    } catch (err) {
      console.error('Failed to load versions', err);
    }
  };

  const handleCreateVersion = async () => {
    if (!versionForm.changes_summary.trim()) {
      toast.error('ملخص التغييرات مطلوب');
      return;
    }
    try {
      await createDirectoryVersion(activeType, {
        changes_summary: versionForm.changes_summary,
        change_reasons: versionForm.change_reasons,
        effective_from: versionForm.effective_from });
      toast.success('تم إنشاء الإصدار بنجاح');
      handleViewVersions();
    } catch (err) {
      toast.error('فشل في إنشاء الإصدار');
    }
  };

  const handleApproveVersion = async (versionId: string) => {
    try {
      await approveDirectoryVersion(activeType, versionId);
      toast.success('تم اعتماد الإصدار بنجاح');
      handleViewVersions();
    } catch (err) {
      toast.error('فشل في اعتماد الإصدار');
    }
  };

  // ==================== التصدير/الاستيراد ====================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExport = async () => {
    try {
      const blob = await exportDirectory(activeType, { format: 'json', includeInactive: showInactive });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeType}-directory-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير الدليل بنجاح');
    } catch (err) {
      toast.error('فشل في التصدير');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleImport = async (file: File) => {
    try {
      const result = await importDirectory(activeType, file, { dryRun: true, onConflict: 'skip' });
      toast.success(
        `سيتم استيراد ${result.imported} سجل (تحديث: ${result.updated})`
      );
    } catch (err) {
      toast.error('فشل في الاستيراد');
    }
  };

  // ==================== الحسابات ====================

  const filteredEntries = useMemo(() => {
    return entries;
  }, [entries]);

  const stat = stats[activeType];
  const activeTab = DIRECTORY_TABS.find(t => t.type === activeType);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ==================== العرض ====================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="الأدلة الوطنية"
        subtitle={`إدارة السجلات المعيارية — ${activeTab?.description || ''}`}
       
      />

      <div className="max-w-[1600px] mx-auto px-4 pb-8">
        {/* التبويبات */}
        <div className="flex flex-wrap gap-2 mb-6">
          {DIRECTORY_TABS.map(tab => {
            const TabIcon = tab.icon;
            const tabStat = stats[tab.type as DirectoryType];
            return (
              <button
                key={tab.type}
                onClick={() => { setActiveType(tab.type); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  activeType === tab.type
                    ? `${tab.color} text-white border-transparent shadow`
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
                {tabStat && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeType === tab.type
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {tabStat.active}/{tabStat.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* الإحصاءات */}
        {stat && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-1">إجمالي السجلات</div>
              <div className="text-2xl font-bold">{stat.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-1">النشطة</div>
              <div className="text-2xl font-bold text-green-600">{stat.active}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-1">السجلات المرتبطة</div>
              <div className="text-2xl font-bold text-blue-600">{stat.referenced_count || 0}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-1">آخر تحديث</div>
              <div className="text-sm font-medium">
                {stat.last_change_at
                  ? new Date(stat.last_change_at).toLocaleDateString('ar-YE')
                  : '—'}
              </div>
            </div>
          </div>
        )}

        {/* البحث والفلترة */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالرمز أو الاسم..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => { setShowInactive(e.target.checked); setCurrentPage(1); }}
                className="rounded"
              />
              عرض غير النشطة
            </label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <option value="sort_order">الترتيب</option>
              <option value="code">الرمز</option>
              <option value="name_ar">الاسم</option>
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button
              onClick={loadEntries}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* الجدول */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Layers className="w-12 h-12 mb-4 opacity-50" />
              <p>لا توجد سجلات</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الرمز</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الاسم العربي</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الاسم الإنجليزي</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">المستوى</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الحالة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredEntries.map(entry => (
                    <tr key={entry.code} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-3 font-mono text-sm">{entry.code}</td>
                      <td className="px-4 py-3 font-medium">{entry.name_ar}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{entry.name_en || '—'}</td>
                      <td className="px-4 py-3 text-center">{entry.level}</td>
                      <td className="px-4 py-3">
                        {entry.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" /> نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500 text-sm">
                            <XCircle className="w-4 h-4" /> غير نشط
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(entry)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-600"
                            title="عرض التفاصيل والربط"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {entry.is_active ? (
                            <button
                              onClick={() => handleDeactivate(entry)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-red-500"
                              title="تعطيل"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(entry)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-green-600"
                              title="إعادة تفعيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* الترقيم */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500">
                    عرض {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} من {totalCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border disabled:opacity-50"
                    >
                      السابق
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded border ${
                            currentPage === page ? 'bg-blue-500 text-white border-blue-500' : ''
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded border disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* نافذة التعديل */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEntry ? 'تعديل الدليل' : 'إضافة دليل جديد'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الرمز *</label>
            <input
              type="text"
              value={formData.code}
              onChange={e => setFormData(f => ({ ...f, code: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border"
              placeholder="مثال: ISCO-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الاسم العربي *</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={e => setFormData(f => ({ ...f, name_ar: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border"
              placeholder="مثال: المديرون"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الإنجليزي</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={e => setFormData(f => ({ ...f, name_en: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border"
              placeholder="Managers"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الرمز الأب</label>
              <input
                type="text"
                value={formData.parent_code}
                onChange={e => setFormData(f => ({ ...f, parent_code: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المستوى</label>
              <input
                type="number"
                value={formData.level}
                onChange={e => setFormData(f => ({ ...f, level: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 rounded-lg border"
                min={1}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ترتيب الفرز</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={e => setFormData(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-lg border"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border">
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      </Modal>

      {/* نافذة التفاصيل والربط */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="تفاصيل الدليل والسجلات المرتبطة"
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">الرمز:</span> <strong>{selectedEntry.code}</strong></div>
                <div><span className="text-gray-500">الحالة:</span> {selectedEntry.is_active ? 'نشط' : 'غير نشط'}</div>
                <div><span className="text-gray-500">الاسم:</span> {selectedEntry.name_ar}</div>
                <div><span className="text-gray-500">الاسم الإنجليزي:</span> {selectedEntry.name_en || '—'}</div>
                <div><span className="text-gray-500">المستوى:</span> {selectedEntry.level}</div>
                <div><span className="text-gray-500">الترتيب:</span> {selectedEntry.sort_order}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  السجلات المرتبطة ({relatedRecords.length})
                </h3>
                <button
                  onClick={handlePropagate}
                  className="px-3 py-1 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  نشر التغييرات
                </button>
              </div>

              {loadingRelations ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : relatedRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد سجلات مرتبطة
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-right px-3 py-2">النوع</th>
                        <th className="text-right px-3 py-2">المعرف</th>
                        <th className="text-right px-3 py-2">العلاقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relatedRecords.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{r.entity_type}</td>
                          <td className="px-3 py-2 font-mono">{r.display_name}</td>
                          <td className="px-3 py-2">{r.relationship_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* نافذة فحص الاستخدام */}
      <Modal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        title="فحص استخدام الدليل"
        size="md"
      >
        {usageCheck && (
          <div className="space-y-4">
            {usageCheck.is_used ? (
              <>
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span>هذا الدليل مستخدم في {usageCheck.usage_count} سجل. لا يمكن تعطيله.</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(usageCheck.usage_by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{type}</span>
                      <span className="text-red-600 font-bold">{count} سجل</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>هذا الدليل غير مستخدم. يمكنك تعطيله بأمان.</span>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">سبب التعطيل</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border"
                    rows={3}
                    placeholder="أدخل سبب التعطيل..."
                    id="deactivate-reason"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={() => setShowUsageModal(false)} className="px-4 py-2 rounded-lg border">
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      const reason = (document.getElementById('deactivate-reason') as HTMLTextAreaElement)?.value || 'تعطيل بدون سبب';
                      confirmDeactivate(reason);
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white"
                  >
                    تأكيد التعطيل
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* نافذة الإصدارات */}
      <Modal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        title="إدارة الإصدارات وسجل التغييرات"
        size="xl"
      >
        <div className="space-y-6">
          {/* إنشاء إصدار جديد */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-medium mb-3">إنشاء إصدار جديد</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">ملخص التغييرات *</label>
                <textarea
                  value={versionForm.changes_summary}
                  onChange={e => setVersionForm(f => ({ ...f, changes_summary: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                  rows={2}
                  placeholder="وصف التغييرات..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1">تاريخ السريان</label>
                <input
                  type="date"
                  value={versionForm.effective_from}
                  onChange={e => setVersionForm(f => ({ ...f, effective_from: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border"
                />
              </div>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white"
              >
                إنشاء إصدار
              </button>
            </div>
          </div>

          {/* الإصدارات */}
          <div>
            <h3 className="font-medium mb-3">الإصدارات ({versions.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {versions.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <div className="font-medium">الإصدار {v.version_number}</div>
                    <div className="text-sm text-gray-500">{v.changes_summary}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.is_current && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">حالي</span>
                    )}
                    {!v.approved_at && (
                      <button
                        onClick={() => handleApproveVersion(v.id)}
                        className="text-sm px-3 py-1 rounded-lg bg-blue-100 text-blue-700"
                      >
                        اعتماد
                      </button>
                    )}
                    {v.approved_at && (
                      <span className="text-xs text-gray-500">معتمد</span>
                    )}
                  </div>
                </div>
              ))}
              {versions.length === 0 && (
                <div className="text-center py-4 text-gray-500">لا توجد إصدارات</div>
              )}
            </div>
          </div>

          {/* سجل التغييرات */}
          <div>
            <h3 className="font-medium mb-3">سجل التغييرات ({changeLog.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {changeLog.map(log => (
                <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.change_type}</span>
                    <span className="text-gray-500">{new Date(log.changed_at).toLocaleString('ar-YE')}</span>
                  </div>
                  <div className="text-gray-600 mt-1">
                    {log.field_changed && <span>الحقل: {log.field_changed}</span>}
                    {log.change_reason && <span> — السبب: {log.change_reason}</span>}
                  </div>
                </div>
              ))}
              {changeLog.length === 0 && (
                <div className="text-center py-4 text-gray-500">لا توجد تغييرات</div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default NationalDirectoriesV2;
