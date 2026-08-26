/**
 * ProfessionsManagement — منظومة تحليل وتوصيف وتخصيص المهن المؤسسية
 * ISCO-08 & ASCO Standard Classification | وزارة الشؤون الاجتماعية والعمل - قطاع العمل
 * إدارة دورة العمل المؤسسية للمهن (توصيف معياري 360°، بنك المعلومات القانونية، وتخصيص متعدد للمنشآت N:M)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search, Edit2, Trash2, Plus, RefreshCw, Briefcase, X,
  ChevronRight, ChevronLeft, Download, ShieldCheck,
  Award, GraduationCap, DollarSign, Layers,
  Building2, Users, FileText, CheckCircle2, SlidersHorizontal,
  FolderTree, Sparkles, Stethoscope, HardHat,
  CheckSquare, Square, BookOpen,
  Scale, Save
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { analyzeProfession } from '../../utils/professionsAnalysis';
import {
  LEGAL_KNOWLEDGE_BANK,
  TOP_30_YEMEN_OCCUPATIONS,
  StandardOccupationData,
} from '../../data/professionsKnowledgeBank';

interface Profession {
  id: string;
  name_ar: string;
  name_en?: string;
  code?: string;
  isco_code: string;
  major_group_code?: string;
  major_group_name?: string;
  sub_major_group?: string;
  minor_group?: string;
  unit_group?: string;
  sector: string;
  family?: string;
  level: number;
  status: string;
  description_ar?: string;
  description_en?: string;
  scope?: string;
  work_environment?: string;
  education_level?: string;
  training_hours?: number;
  hazard_level?: string;
  min_salary?: number;
  max_salary?: number;
  salary_min?: number;
  salary_max?: number;
  career_path?: any;
  keywords?: string;
}

interface MajorGroup {
  code: string;
  name: string;
  count: number;
  leaf_count: number;
}

interface CommercialEstablishment {
  id: string;
  establishment_id?: string;
  unified_code?: string;
  name_ar: string;
  commercial_register_number?: string;
  sector?: string;
  governorate?: string;
}

interface EnterpriseOccupationLink {
  id: string;
  enterprise_id: string;
  enterprise_name: string;
  cr_number?: string;
  occupation_name_ar: string;
  isco_code: string;
  department?: string;
  allocated_headcount: number;
  yemeni_headcount: number;
  expatriate_headcount: number;
  salary_scale?: string;
  yemenization_policy?: string;
  compliance_score?: number;
  link_status: string;
  governorate?: string;
  created_at?: string;
}

interface Occupation360Dossier {
  profession: Profession;
  hazard_profile?: any;
  allocations: EnterpriseOccupationLink[];
  stats: {
    total_allocated_establishments: number;
    total_quota_headcount: number;
    total_yemeni_quota: number;
    total_expatriate_quota: number;
    active_deployed_workers: number;
  };
}

const SECTORS: Record<string, string> = {
  agriculture: 'الزراعة والصيد',
  mining: 'التعدين واستخراج النفط والغاز',
  manufacturing: 'الصناعات التحويلية والغذائية',
  electricity: 'الطاقة والكهرباء والطاقة المتجددة',
  construction: 'التشييد والبناء والمقاولات',
  wholesale: 'تجارة الجملة والتجزئة',
  trade: 'الأنشطة التجارية والتمويل',
  transport: 'النقل والخدمات اللوجستية والموانئ',
  hospitality: 'الفنادق والمطاعم والسياحة',
  it: 'الاتصالات وتكنولوجيا المعلومات والبرمجيات',
  technology: 'التقنية والذكاء الاصطناعي',
  finance: 'الأنشطة المالية والمصرفية والتأمين',
  real_estate: 'العقارات والخدمات الإدارية',
  education: 'التعليم والتدريب المهني',
  health: 'الرعاية الصحية والطب والصيدلة',
  healthcare: 'الرعاية الصحية والتمريض',
  public_admin: 'الإدارة العامة والرقابة والسلامة المهنية',
  services: 'الخدمات العامة والموارد البشرية',
  tourism: 'السياحة والضيافة',
  other: 'قطاعات أخرى',
};

const HAZARD_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  low: { label: 'منخفضة الخطورة', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', icon: '🟢' },
  medium: { label: 'متوسطة الخطورة', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', icon: '🟡' },
  high: { label: 'عالية الخطورة', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', icon: '🔴' },
  extreme: { label: 'شديدة الخطورة (مهن خطرة)', bg: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 font-bold', text: 'text-red-900 dark:text-red-300', icon: '⛔' },
};

const MAJOR_GROUPS_DEF: Record<string, { title: string; color: string }> = {
  '1': { title: 'المديرون وكبار المسؤولين', color: 'from-blue-600 to-indigo-700' },
  '2': { title: 'الاختصاصيون والمهنيون', color: 'from-emerald-600 to-teal-700' },
  '3': { title: 'الفنيون والمساعدون الاختصاصيون', color: 'from-cyan-600 to-blue-700' },
  '4': { title: 'الكتبة والمساعدون الإداريون', color: 'from-purple-600 to-indigo-700' },
  '5': { title: 'عمال الخدمات ومندوبو المبيعات', color: 'from-amber-600 to-orange-700' },
  '6': { title: 'العمال المهرة في الزراعة والإنتاج الحيواني', color: 'from-lime-600 to-green-700' },
  '7': { title: 'الحرفيون وعمال المهن اليدوية والإنشائية', color: 'from-stone-600 to-zinc-700' },
  '8': { title: 'مشغلو المصانع والآلات ومجمعو المنتجات', color: 'from-slate-600 to-gray-700' },
  '9': { title: 'المهن الأولية والعمالة العادية', color: 'from-neutral-600 to-stone-700' },
  '0': { title: 'العاملون في القوات المسلحة والأمن', color: 'from-red-600 to-rose-700' },
};

const PAGE_SIZE = 12;

export default function ProfessionsManagement() {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [majorGroups, setMajorGroups] = useState<MajorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMajorGroup, setSelectedMajorGroup] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Default to last-level executive professions only (المستوى الأخير ISCO-08)
  const [onlyLastLevel, setOnlyLastLevel] = useState<boolean>(true);

  // 360° Studio Modal State
  const [activeAnalysisItem, setActiveAnalysisItem] = useState<Profession | null>(null);
  const [activeDossier, setActiveDossier] = useState<Occupation360Dossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<'desc' | 'competencies' | 'safety' | 'career' | 'legal' | 'allocations' | 'analysis'>('desc');

  // In-Place Edit Mode in Studio
  const [isEditingProfession, setIsEditingProfession] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profession>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Knowledge Bank Modal State
  const [knowledgeBankOpen, setKnowledgeBankOpen] = useState(false);
  const [kbTab, setKbTab] = useState<'top30' | 'laws'>('top30');
  const [kbSearch, setKbSearch] = useState('');
  const [kbLawCategory, setKbLawCategory] = useState<string>('all');

  // Add New Profession Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name_ar: '',
    name_en: '',
    isco_code: '',
    sector: 'other',
    level: 4,
    status: 'معتمد',
    hazard_level: 'low',
    education_level: '',
    description_ar: '',
  });

  // Multi-Establishment Batch Allocation Modal State
  const [activeAllocationItem, setActiveAllocationItem] = useState<Profession | null>(null);
  const [establishments, setEstablishments] = useState<CommercialEstablishment[]>([]);
  const [estSearch, setEstSearch] = useState('');
  const [selectedEstIds, setSelectedEstIds] = useState<string[]>([]);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    allocated_headcount: 5,
    yemeni_headcount: 4,
    expatriate_headcount: 1,
    department: 'الشؤون الفنية والتشغيلية',
    salary_scale: 'الدرجة الرابعة - سلم الكادر المتخصص',
    yemenization_policy: 'إلزامية توطين بنسبة 80% وفق قانون العمل',
  });

  const { confirm, dialog: confirmDialog } = useConfirm();

  // Fetch Major Groups
  const fetchMajorGroups = useCallback(async () => {
    try {
      const r = await fetch('/api/professions/major-groups');
      if (r.ok) {
        const j = await r.json();
        setMajorGroups(j.data || []);
      }
    } catch {
      // fallback
    }
  }, []);

  // Fetch Establishments for Allocation
  const fetchEstablishments = useCallback(async () => {
    try {
      const r = await fetch('/api/commercial?limit=100');
      if (r.ok) {
        const j = await r.json();
        setEstablishments(j.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Professions
  const fetchProfessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (selectedMajorGroup) params.set('major_group', selectedMajorGroup);
      if (sectorFilter) params.set('sector', sectorFilter);
      if (onlyLastLevel) params.set('last_level', 'true');

      const r = await fetch(`/api/professions?${params.toString()}`);
      if (r.ok) {
        const d = await r.json();
        setProfessions(d.data || d.professions || []);
        setTotalCount(d.total || (d.data || []).length);
      } else {
        toast.error('فشل تحميل قائمة المهن');
      }
    } catch {
      toast.error('خطأ في الاتصال بقاعدة البيانات');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedMajorGroup, sectorFilter, onlyLastLevel]);

  useEffect(() => {
    fetchMajorGroups();
    fetchEstablishments();
  }, [fetchMajorGroups, fetchEstablishments]);

  // Debounce البحث لتقليل طلبات الشبكة غير الضرورية وتحسين الأداء
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchProfessions();
  }, [fetchProfessions]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch 360° Dossier when opening studio
  const handleOpenStudio = async (prof: Profession | StandardOccupationData, defaultTab: typeof activeStudioTab = 'desc') => {
    const profObj: Profession = {
      id: (prof as any).id || (prof as StandardOccupationData).isco_code,
      name_ar: prof.name_ar,
      name_en: prof.name_en,
      isco_code: prof.isco_code,
      sector: prof.sector,
      level: prof.level || 4,
      status: 'معتمد',
      hazard_level: prof.hazard_level || 'low',
      description_ar: prof.description_ar,
      education_level: (prof as any).education_level,
      training_hours: (prof as any).training_hours,
      min_salary: (prof as any).min_salary || (prof as any).salary_min,
      max_salary: (prof as any).max_salary || (prof as any).salary_max,
      salary_min: (prof as any).salary_min || (prof as any).min_salary,
      salary_max: (prof as any).salary_max || (prof as any).max_salary,
    };

    setActiveAnalysisItem(profObj);
    setIsEditingProfession(false);
    setEditForm(profObj);
    setActiveStudioTab(defaultTab);
    setDossierLoading(true);

    try {
      const r = await fetch(`/api/professions/${profObj.id}/360-dossier`);
      if (r.ok) {
        const data = await r.json();
        setActiveDossier(data);
      } else {
        setActiveDossier({
          profession: profObj,
          allocations: [],
          stats: {
            total_allocated_establishments: 0,
            total_quota_headcount: 0,
            total_yemeni_quota: 0,
            total_expatriate_quota: 0,
            active_deployed_workers: 0,
          },
        });
      }
    } catch {
      toast.error('خطأ في تحميل ملف التوصيف الشامل');
    } finally {
      setDossierLoading(false);
    }
  };

  // Save In-Place Edit of Profession
  const handleSaveProfessionEdit = async () => {
    if (!activeAnalysisItem) return;
    setSavingEdit(true);
    try {
      const r = await fetch(`/api/professions/${activeAnalysisItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (r.ok) {
        toast.success('تم حفظ وتحديث بيانات بطاقة التوصيف المهني بنجاح');
        logAudit({
          action: 'update',
          resource: 'professions',
          details: `تعديل بطاقة الوصف للمهنة ${editForm.name_ar} (${editForm.isco_code})`,
        });
        setIsEditingProfession(false);
        setActiveAnalysisItem((prev) => ({ ...prev!, ...editForm }));
        fetchProfessions();
      } else {
        toast.error('فشل حفظ التعديلات');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setSavingEdit(false);
    }
  };

  // Create New Profession (إضافة فعلية عبر الـAPI)
  const handleCreateProfession = async () => {
    if (!addForm.name_ar.trim()) {
      toast.error('الاسم المعرب للمهنة مطلوب');
      return;
    }
    if (!addForm.isco_code.trim()) {
      toast.error('الرمز المعياري ISCO مطلوب');
      return;
    }
    setSavingAdd(true);
    try {
      const r = await fetch('/api/professions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          isco_code: addForm.isco_code.trim(),
          name_ar: addForm.name_ar.trim(),
          name_en: addForm.name_en?.trim() || undefined,
          training_hours: addForm.level ? addForm.level * 10 : 40,
        }),
      });

      if (r.ok) {
        toast.success('تمت إضافة المهنة المعيارية إلى السجل الوطني بنجاح');
        logAudit({
          action: 'create',
          resource: 'professions',
          details: `إضافة مهنة معيارية ${addForm.name_ar} (${addForm.isco_code})`,
        });
        setShowAddModal(false);
        setAddForm({
          name_ar: '',
          name_en: '',
          isco_code: '',
          sector: 'other',
          level: 4,
          status: 'معتمد',
          hazard_level: 'low',
          education_level: '',
          description_ar: '',
        });
        fetchProfessions();
      } else {
        const err = await r.json();
        toast.error(err.error || 'فشل إضافة المهنة');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setSavingAdd(false);
    }
  };

  // Delete Profession (حذف فعلي ناعم عبر الـAPI)
  const handleDeleteProfession = async (prof: Profession) => {
    const ok = await confirm({
      title: 'حذف المهنة المعيارية',
      message: `هل أنت متأكد من حذف المهنة «${prof.name_ar}» (${prof.isco_code})؟ سيتم حذفها ناعماً ويمكن استرجاعها عبر الإدارة الشاملة.`,
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const r = await fetch(`/api/professions/${prof.id}`, { method: 'DELETE' });
      if (r.ok) {
        toast.success('تم حذف المهنة بنجاح');
        logAudit({
          action: 'delete',
          resource: 'professions',
          details: `حذف المهنة ${prof.name_ar} (${prof.isco_code})`,
        });
        fetchProfessions();
      } else {
        const err = await r.json();
        toast.error(err.error || 'فشل حذف المهنة');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    }
  };

  // Open Multi-Establishment Batch Allocation Modal
  const handleOpenAllocation = (prof: Profession | StandardOccupationData) => {
    const profObj: Profession = {
      id: (prof as any).id || (prof as StandardOccupationData).isco_code,
      name_ar: prof.name_ar,
      name_en: prof.name_en,
      isco_code: prof.isco_code,
      sector: prof.sector,
      level: prof.level || 4,
      status: 'معتمد',
    };
    setActiveAllocationItem(profObj);
    setSelectedEstIds([]);
    setEstSearch('');
  };

  // Toggle Establishment Selection for Batch Allocation
  const toggleEstSelection = (estId: string) => {
    setSelectedEstIds((prev) =>
      prev.includes(estId) ? prev.filter((id) => id !== estId) : [...prev, estId]
    );
  };

  // تحليل التوصيف المؤسسي للمهنة (محرك analyzeProfession) — يُحسب عند فتح الاستوديو
  const professionAnalysis = useMemo(() => {
    if (!activeAnalysisItem) return null;
    return analyzeProfession(activeAnalysisItem);
  }, [activeAnalysisItem]);

  // Filtered Establishments in modal
  const filteredEstablishments = useMemo(() => {
    if (!estSearch.trim()) return establishments;
    const q = estSearch.toLowerCase();
    return establishments.filter(
      (e) =>
        e.name_ar.toLowerCase().includes(q) ||
        (e.commercial_register_number && e.commercial_register_number.includes(q)) ||
        (e.unified_code && e.unified_code.includes(q)) ||
        (e.governorate && e.governorate.toLowerCase().includes(q))
    );
  }, [establishments, estSearch]);

  // Execute Batch Allocation
  const handleSaveBatchAllocation = async () => {
    if (!activeAllocationItem) return;
    if (selectedEstIds.length === 0) {
      toast.warning('يرجى اختيار منشأة واحدة على الأقل للتخصيص والتسكين');
      return;
    }

    setSavingAllocation(true);
    try {
      const res = await fetch(`/api/professions/${activeAllocationItem.id}/batch-allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_ids: selectedEstIds,
          allocation_details: allocationForm,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'تم اعتماد وتسكين المهنة في المنشآت المحددة بنجاح');
        logAudit({
          action: 'create',
          resource: 'enterprise_occupation_links',
          details: `تخصيص المهنة المعيارية ${activeAllocationItem.name_ar} (${activeAllocationItem.isco_code}) في ${selectedEstIds.length} منشأة تجارية`,
        });
        setActiveAllocationItem(null);
        if (activeAnalysisItem?.id === activeAllocationItem.id) {
          handleOpenStudio(activeAllocationItem, 'allocations');
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'فشل حفظ التخصيص');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setSavingAllocation(false);
    }
  };

  // Delete Allocation Link
  const handleDeleteAllocation = async (linkId: string, estName: string) => {
    const ok = await confirm({
      title: 'إلغاء تسكين المهنة في المنشأة',
      message: `هل أنت متأكد من رغبتك في إلغاء تخصيص هذه المهنة لمنشأة «${estName}»؟ لن يتم حذف بيانات العمال الحاليين.`,
      variant: 'danger',
    });

    if (!ok) return;

    try {
      const r = await fetch(`/api/enterprise-occupation-links/${linkId}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        toast.success('تم إلغاء التسكين بنجاح');
        if (activeAnalysisItem) {
          handleOpenStudio(activeAnalysisItem, 'allocations');
        }
      } else {
        toast.error('فشل إلغاء التخصيص');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    }
  };

  // Filtered Top 30 in Knowledge Bank
  const filteredTop30 = useMemo(() => {
    if (!kbSearch.trim()) return TOP_30_YEMEN_OCCUPATIONS;
    const q = kbSearch.toLowerCase();
    return TOP_30_YEMEN_OCCUPATIONS.filter(
      (o) =>
        o.name_ar.toLowerCase().includes(q) ||
        o.name_en.toLowerCase().includes(q) ||
        o.isco_code.includes(q) ||
        (SECTORS[o.sector] && SECTORS[o.sector].toLowerCase().includes(q))
    );
  }, [kbSearch]);

  // Filtered Laws in Knowledge Bank
  const filteredLaws = useMemo(() => {
    return LEGAL_KNOWLEDGE_BANK.filter((law) => {
      const matchCat = kbLawCategory === 'all' || law.compliance_category === kbLawCategory;
      const matchSearch =
        !kbSearch.trim() ||
        law.title.includes(kbSearch) ||
        law.content.includes(kbSearch) ||
        law.article_number.includes(kbSearch);
      return matchCat && matchSearch;
    });
  }, [kbLawCategory, kbSearch]);

  // Export Professions to Excel
  const handleExportExcel = () => {
    const data = professions.map((p) => ({
      'رمز ISCO': p.isco_code || p.code,
      'المسمى المهني (عربي)': p.name_ar,
      'المسمى المهني (إنجليزي)': p.name_en || '',
      'القطاع': SECTORS[p.sector] || p.sector,
      'المستوى المهني': p.level,
      'تصنيف الخطورة': HAZARD_CONFIG[p.hazard_level || 'low']?.label || 'منخفضة الخطورة',
      'المؤهل التعليمي': p.education_level || '',
      'الراتب الأدنى': p.salary_min || p.min_salary || '',
      'الراتب الأعلى': p.salary_max || p.max_salary || '',
    }));
    exportReportToExcel({
      title: 'سجل المهن المعياري ISCO-08',
      reportType: 'statistics',
      data,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-right" dir="rtl">
      {confirmDialog}

      {/* Header */}
      <PageHeader
        title="استوديو تحليل وتوصيف وتخصيص المهن (ISCO-08)"
        subtitle="النموذج المعياري الموحد لتصنيف وتوصيف المهن، الجدارات، معايير السلامة OSH، وحوكمة التسكين المتعدد في المنشآت التجارية (N:M)"
        breadcrumbs={[
          { label: 'لوحة القيادة', to: '/ministry' },
          { label: 'استوديو المهن والتوصيف الوظيفي' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus size={16} /> إضافة مهنة جديدة
            </button>
            <button
              onClick={() => setKnowledgeBankOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-xs font-bold hover:from-amber-600 hover:to-amber-700 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <BookOpen size={16} /> بنك المعلومات المعيارية والقانونية
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Download size={15} /> تصدير السجل (Excel)
            </button>
            <button
              onClick={() => fetchProfessions()}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث
            </button>
          </div>
        }
      />

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 flex items-center justify-center">
            <Briefcase size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">إجمالي المهن المعيارية</p>
            <h3 className="text-xl font-black text-heading mt-0.5">{totalCount.toLocaleString()}</h3>
            <p className="text-[11px] text-blue-600 font-medium">تصنيف دولي ISCO-08</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center">
            <Award size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">المهن التنفيذية (المستوى النهائي)</p>
            <h3 className="text-xl font-black text-heading mt-0.5">3,607</h3>
            <p className="text-[11px] text-emerald-600 font-medium">جاهزة للتسكين الفوري</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 flex items-center justify-center">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">المنشآت المشمولة بالتسكين</p>
            <h3 className="text-xl font-black text-heading mt-0.5">5,152</h3>
            <p className="text-[11px] text-purple-600 font-medium">علاقة متعدد لمتعدد (N:M)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">معايير السلامة واليمننة</p>
            <h3 className="text-xl font-black text-heading mt-0.5">100%</h3>
            <p className="text-[11px] text-amber-600 font-medium">مطابقة لقانون العمل 5/1995</p>
          </div>
        </div>
      </div>

      {/* Major Groups Quick Selector */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-heading">
            <Layers size={17} className="text-primary" />
            <span>المجموعات المهنية الرئيسية (ISCO-08 Major Groups)</span>
          </div>
          {selectedMajorGroup && (
            <button
              onClick={() => setSelectedMajorGroup('')}
              className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <X size={14} /> إلغاء تصفية المجموعة
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {Object.entries(MAJOR_GROUPS_DEF).map(([code, def]) => {
            const mg = majorGroups.find((g) => g.code === code);
            const isSelected = selectedMajorGroup === code;
            return (
              <button
                key={code}
                onClick={() => {
                  setSelectedMajorGroup(isSelected ? '' : code);
                  setCurrentPage(1);
                }}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-muted/40 hover:bg-muted border-border text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {code}
                  </span>
                  <span className={`text-[11px] font-bold ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                    {mg ? `${mg.leaf_count || mg.count} مهنة` : '—'}
                  </span>
                </div>
                <h4 className="text-xs font-bold mt-2 leading-snug line-clamp-2">{def.title}</h4>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ابحث باسم المهنة المعيارية، الرمز الدولي ISCO، أو الكلمات المفتاحية..."
            className="w-full pl-4 pr-10 py-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium text-heading placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Sector Filter */}
        <div className="w-full md:w-64">
          <select
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs font-bold text-heading focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">جميع القطاعات والأنشطة الاقتصادية</option>
            {Object.entries(SECTORS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Last Level Toggle */}
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border border-border">
          <button
            onClick={() => setOnlyLastLevel(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              onlyLastLevel
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            المهن التنفيذية (المستوى 4)
          </button>
          <button
            onClick={() => setOnlyLastLevel(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !onlyLastLevel
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            كافة المستويات
          </button>
        </div>
      </div>

      {/* Professions Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-muted-foreground">جاري تحميل وتصنيف المهن المعتمدة من قاعدة البيانات...</p>
          </div>
        ) : professions.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h4 className="text-base font-bold text-heading">لا توجد مهن مطابقة للبحث</h4>
            <p className="text-xs text-muted-foreground mt-1">يرجى تعديل معايير البحث أو اختيار مجموعة أخرى</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/70 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">رمز ISCO</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">المسمى المهني المعتمد</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">القطاع الاقتصادي</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">المستوى</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">مستوى الخطورة</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">المؤهل الأدنى</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">الإجراءات المؤسسية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professions.map((prof) => {
                  const hazard = HAZARD_CONFIG[prof.hazard_level || 'low'] || HAZARD_CONFIG.low;
                  const isLeaf = (prof.level && prof.level >= 4) || (prof.isco_code && prof.isco_code.length >= 4);

                  return (
                    <tr key={prof.id} className="hover:bg-accent/40 transition-colors">
                      {/* ISCO Code */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-primary">
                        {prof.isco_code || prof.code}
                      </td>

                      {/* Title */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-heading text-sm">{prof.name_ar}</div>
                        {prof.name_en && (
                          <div className="text-[11px] text-muted-foreground font-sans mt-0.5">{prof.name_en}</div>
                        )}
                      </td>

                      {/* Sector */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-muted text-foreground font-medium">
                          {SECTORS[prof.sector] || prof.sector || 'قطاع مهني عام'}
                        </span>
                      </td>

                      {/* Level */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                          isLeaf ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {isLeaf ? 'المستوى 4 (تنفيذي)' : `المستوى ${prof.level || 1}`}
                        </span>
                      </td>

                      {/* Hazard */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border ${hazard.bg}`}>
                          <span>{hazard.icon}</span> {hazard.label}
                        </span>
                      </td>

                      {/* Education */}
                      <td className="px-5 py-4 text-center text-xs text-muted-foreground font-medium">
                        {prof.education_level || 'دبلوم مهني / بكالوريوس'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenStudio(prof, 'desc')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="عرض وتعديل بطاقة الوصف والتحليل الشامل 360°"
                          >
                            <FileText size={14} /> بطاقة الوصف 360°
                          </button>

                          <button
                            onClick={() => handleOpenAllocation(prof)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl text-xs font-bold transition-all cursor-pointer dark:bg-emerald-950/40 dark:text-emerald-300"
                            title="تخصيص وتسكين المهنة في منشآت متعددة"
                          >
                            <Building2 size={14} /> تخصيص لمنشآت
                          </button>

                          <button
                            onClick={() => handleDeleteProfession(prof)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer dark:bg-rose-950/40 dark:text-rose-300"
                            title="حذف المهنة من السجل المعياري"
                          >
                            <Trash2 size={14} /> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            صفحة <strong className="text-foreground">{currentPage}</strong> من <strong className="text-foreground">{totalPages}</strong> (إجمالي {totalCount.toLocaleString()} مهنة)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: بطاقة التوصيف والتحليل الشامل 360° مع إمكانية التعديل المباشر       */}
      {/* ========================================================================= */}
      {activeAnalysisItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-5xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 p-2.5">
                  <Briefcase size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/15 text-primary rounded-md">
                      ISCO-08: {activeAnalysisItem.isco_code || activeAnalysisItem.code}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full font-bold">
                      معتمد رسمياً في السجل الوطني
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded-full font-semibold">
                      {SECTORS[activeAnalysisItem.sector] || activeAnalysisItem.sector || 'قطاع عام'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-heading mt-1">{activeAnalysisItem.name_ar}</h3>
                  {activeAnalysisItem.name_en && (
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">{activeAnalysisItem.name_en}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingProfession(!isEditingProfession)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isEditingProfession
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-card hover:bg-muted text-foreground border border-border'
                  }`}
                >
                  <Edit2 size={14} /> {isEditingProfession ? 'إلغاء التعديل' : 'تعديل تفاصيل المهنة'}
                </button>
                <button
                  onClick={() => setActiveAnalysisItem(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* In-Place Edit Panel Banner */}
            {isEditingProfession && (
              <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal size={15} /> أنت الآن في وضع التعديل الفوري لبطاقة المهنة. يمكنك تعديل أي حقل وحفظه مباشرة.
                </span>
                <button
                  onClick={handleSaveProfessionEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} /> {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات في السجل'}
                </button>
              </div>
            )}

            {/* Studio Navigation Tabs */}
            <div className="px-6 border-b border-border bg-muted/30 flex items-center gap-2 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setActiveStudioTab('desc')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'desc'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText size={15} /> بطاقة الهوية والتوصيف
              </button>
              <button
                onClick={() => setActiveStudioTab('competencies')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'competencies'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap size={15} /> المهام والجدارات
              </button>
              <button
                onClick={() => setActiveStudioTab('safety')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'safety'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <HardHat size={15} /> السلامة والمخاطر OSH
              </button>
              <button
                onClick={() => setActiveStudioTab('career')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'career'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <DollarSign size={15} /> سلم الأجور والمسار المهني
              </button>
              <button
                onClick={() => setActiveStudioTab('legal')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'legal'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck size={15} /> حوكمة التوطين والامتثال
              </button>
              <button
                onClick={() => setActiveStudioTab('analysis')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'analysis'
                    ? 'border-primary text-primary bg-primary/5 font-black'
                    : 'border-transparent text-indigo-600 dark:text-indigo-400 hover:text-foreground'
                }`}
              >
                <SlidersHorizontal size={15} /> التحليل المؤسسي ({professionAnalysis ? `${professionAnalysis.maturityScore}%` : '—'})
              </button>
              <button
                onClick={() => setActiveStudioTab('allocations')}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeStudioTab === 'allocations'
                    ? 'border-primary text-primary bg-primary/5 font-black'
                    : 'border-transparent text-emerald-700 dark:text-emerald-400 hover:text-foreground'
                }`}
              >
                <Building2 size={15} /> المنشآت المخصصة ({activeDossier?.stats.total_allocated_establishments || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
              {dossierLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-semibold text-muted-foreground">جاري استرجاع بيانات التوصيف والمنشآت المخصصة...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: Description & Identity */}
                  {activeStudioTab === 'desc' && (
                    <div className="space-y-4">
                      {isEditingProfession ? (
                        <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-3">
                          <label className="block text-xs font-bold text-foreground">الغرض الأساسي والوصف العام للمهنة *</label>
                          <textarea
                            rows={3}
                            value={editForm.description_ar || ''}
                            onChange={(e) => setEditForm({ ...editForm, description_ar: e.target.value })}
                            className="w-full p-3 bg-card border border-border rounded-xl text-xs font-medium text-heading"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/40 rounded-2xl border border-border">
                          <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-2">
                            <Sparkles size={16} /> الغرض الأساسي للوظيفة (Job Purpose)
                          </h4>
                          <p className="text-xs leading-relaxed text-foreground">
                            {activeAnalysisItem.description_ar ||
                              `القيام بالأعمال والمسؤوليات التخصصية المرتبطة بمهنة «${activeAnalysisItem.name_ar}» وتطبيق أفضل الممارسات الفنية والإدارية وإجراءات الجودة والسلامة المعتمدة لدى المنشأة وفقاً للوائح والقوانين المنظمة لسوق العمل في الجمهورية اليمنية.`}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <Layers size={16} className="text-blue-600" /> التصنيف الهيكلي الدولي (ISCO-08)
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">المجموعة الرئيسية:</span>
                              <strong className="text-heading">
                                {MAJOR_GROUPS_DEF[activeAnalysisItem.isco_code?.charAt(0)]?.title || 'مجموعة مهنية معتمدة'}
                              </strong>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">المستوى التنفيذي:</span>
                              <strong className="text-emerald-600">المستوى 4 (مهنة تنفيذية وتخصصية)</strong>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span className="text-muted-foreground">الرمز المعياري:</span>
                              <strong className="font-mono text-primary font-bold">{activeAnalysisItem.isco_code}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <SlidersHorizontal size={16} className="text-indigo-600" /> بيئة العمل ونطاق المسؤولية
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">بيئة العمل الرئيسية:</span>
                              <strong className="text-heading">{activeAnalysisItem.work_environment || 'ميداني / مكتبي وفني مختلط'}</strong>
                            </div>
                            <div className="flex justify-between py-1.5 border-b border-border/50">
                              <span className="text-muted-foreground">نطاق الإشراف:</span>
                              <strong className="text-heading">إشراف فني على العمليات والفرق التنفيذية</strong>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span className="text-muted-foreground">ساعات التدريب المطلوبة:</span>
                              <strong className="text-primary font-bold">{activeAnalysisItem.training_hours || 40} ساعة تدريب معتمد</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Competencies & Duties */}
                  {activeStudioTab === 'competencies' && (
                    <div className="space-y-5">
                      <div className="p-4.5 bg-card border border-border rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                          <FileText size={16} className="text-blue-600" /> قائمة المهام والواجبات الرئيسية (Core Duties)
                        </h4>
                        <ul className="space-y-2.5 text-xs text-foreground">
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>تنفيذ الخطط التشغيلية والبرامج اليومية الموكلة بدقة متناهية وطبقاً للمواصفات المعتمدة.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>مراجعة وتقييم سير العمل ومعالجة الانحرافات الفنية فور حدوثها بالتنسيق مع المشرف المباشر.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>إعداد التقارير الدورية حول معدلات الإنجاز ومستوى مطابقة الجودة واحتياجات بيئة العمل.</span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>الالتزام الصارم بضوابط السلامة والصحة المهنية وتطبيق لوائح العمل المنظمة للمنشأة.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <Award size={16} className="text-amber-600" /> الجدارات الفنية التخصصية (Hard Skills)
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">التشغيل التخصصي المتقدم</span>
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">فحص ومعايرة المعدات</span>
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">إدارة الجودة والمطابقة</span>
                            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">استخدام الأنظمة الرقمية</span>
                          </div>
                        </div>

                        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <Users size={16} className="text-indigo-600" /> الجدارات السلوكية والقيادية (Soft Skills)
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold">حل المشكلات واتخاذ القرار</span>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold">العمل الجماعي والتعاون</span>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold">الانضباط وإدارة الوقت</span>
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold">التواصل الفعال والتوجيه</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: OSH & Safety */}
                  {activeStudioTab === 'safety' && (
                    <div className="space-y-5">
                      <div className={`p-4.5 rounded-2xl border ${HAZARD_CONFIG[activeAnalysisItem.hazard_level || 'low']?.bg || 'bg-muted'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <HardHat size={24} />
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider">تصنيف الخطورة المهنية (Occupational Hazard Level)</p>
                              <p className="text-base font-black mt-0.5">
                                {HAZARD_CONFIG[activeAnalysisItem.hazard_level || 'low']?.label || 'مهنة آمنة اعتيادية'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 bg-white/80 dark:bg-black/40 rounded-xl">
                            قانون العمل اليمني رقم (5) لعام 1995
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <HardHat size={16} className="text-amber-600" /> معدات الوقاية الشخصية الإلزامية (Mandatory PPE)
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-muted border border-border flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-emerald-600" /> خوذة حماية معتمدة
                            </div>
                            <div className="p-2 rounded-lg bg-muted border border-border flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-emerald-600" /> نظارات وقاية للعينين
                            </div>
                            <div className="p-2 rounded-lg bg-muted border border-border flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-emerald-600" /> أحذية أمان معزولة (Safety Shoes)
                            </div>
                            <div className="p-2 rounded-lg bg-muted border border-border flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-emerald-600" /> قفازات عمل تخصصية
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <Stethoscope size={16} className="text-rose-600" /> الفحوصات الطبية الدورية الإلزامية
                          </h4>
                          <ul className="space-y-2 text-xs text-foreground">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-rose-600 shrink-0" />
                              <span>فحص طبي ابتدائي شامل عند مباشرة العمل.</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-rose-600 shrink-0" />
                              <span>فحص دوري سنوي لوظائف الرئتين والسمع والبصر.</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-rose-600 shrink-0" />
                              <span>تأمين صحي إلزامي ضد إصابات العمل والأمراض المهنية.</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Career & Salary */}
                  {activeStudioTab === 'career' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4.5 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                            <DollarSign size={16} /> النطاق الاسترشادي للرواتب في سوق العمل اليمني
                          </h4>
                          <div className="p-4 bg-muted/50 rounded-xl border border-border text-center">
                            <p className="text-xs text-muted-foreground">المدى المقترح للأجر الشهري الأساسي</p>
                            <p className="text-2xl font-black text-heading mt-1">
                              {(activeAnalysisItem.salary_min || activeAnalysisItem.min_salary) && (activeAnalysisItem.salary_max || activeAnalysisItem.max_salary)
                                ? `${(activeAnalysisItem.salary_min || activeAnalysisItem.min_salary)?.toLocaleString()} - ${(activeAnalysisItem.salary_max || activeAnalysisItem.max_salary)?.toLocaleString()} ر.ي`
                                : '180,000 - 450,000 ر.ي'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">يحدد وفق المؤهل والخبرة وسلّم درجات المنشأة</p>
                          </div>
                        </div>

                        <div className="p-4.5 bg-card border border-border rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-indigo-600 flex items-center gap-2">
                            <FolderTree size={16} /> المسار الوظيفي وفرص الترقية (Career Path)
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-muted border border-border">
                              <span className="text-muted-foreground">المستوى السابق: </span>
                              <strong className="text-foreground">مساعد فني / متدرب مبتدئ في المجال</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 font-bold text-primary">
                              <span>المستوى الحالي: </span>
                              <span>{activeAnalysisItem.name_ar} (ممارس تنفيذي معتمد)</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-muted border border-border">
                              <span className="text-muted-foreground">المستوى التالي للترقية: </span>
                              <strong className="text-foreground">أخصائي أول / رئيس قسم / مشرف فني معتمد</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Legal & Yemenization */}
                  {activeStudioTab === 'legal' && (
                    <div className="space-y-4">
                      <div className="p-4.5 bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 rounded-2xl">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <ShieldCheck size={18} className="text-emerald-700 dark:text-emerald-400" /> المرجعية التشريعية وقانون العمل اليمني
                        </h4>
                        <p className="text-xs mt-1 leading-relaxed">
                          هذه المهنة معتمدة ومصنفة وفق المادتين (11) و(113) من قانون العمل اليمني رقم (5) لعام 1995 واللائحة التنظيمية لتصنيف المهن الصادرة عن وزارة الشؤون الاجتماعية والعمل.
                        </p>
                      </div>

                      <div className="space-y-2.5 text-xs text-foreground">
                        <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between">
                          <span>ساعات العمل القانونية القصوى</span>
                          <strong className="text-heading">8 ساعات يومياً / 48 ساعة أسبوعياً</strong>
                        </div>
                        <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between">
                          <span>إلزامية عقد العمل المكتوب والمصدق</span>
                          <strong className="text-emerald-600 font-bold">إلزامي وموثق في المنظومة</strong>
                        </div>
                        <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between">
                          <span>نسبة اليمننة المستهدفة في كوتة المنشآت</span>
                          <strong className="text-emerald-600 font-bold">80% كحد أدنى للمهن العامة</strong>
                        </div>
                        <div className="p-3 bg-card border border-border rounded-xl flex items-center justify-between">
                          <span>التأمين الاجتماعي الإلزامي</span>
                          <strong className="text-emerald-600 font-bold">إلزامي عبر التأمينات والمعاشات</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5b: التحليل المؤسسي للمهنة (Profession Analysis Engine) */}
                  {activeStudioTab === 'analysis' && professionAnalysis && (
                    <div className="space-y-5">
                      {/* Score Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-center">
                          <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">نضج التوصيف</p>
                          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-200 mt-1">{professionAnalysis.maturityScore}%</p>
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">الدرجة: {professionAnalysis.maturityGrade}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-center">
                          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">اكتمال البيانات</p>
                          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-200 mt-1">{professionAnalysis.completenessScore}%</p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">من الحقول الأساسية</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800 text-center">
                          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">الامتثال القانوني</p>
                          <p className="text-2xl font-black text-amber-700 dark:text-amber-200 mt-1">{professionAnalysis.legalCompliance.complianceRate}%</p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">{professionAnalysis.legalCompliance.isCompliant ? 'ممتثل' : 'يحتاج مراجع'}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 border border-rose-200 dark:border-rose-800 text-center">
                          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">جاهزية السلامة</p>
                          <p className="text-2xl font-black text-rose-700 dark:text-rose-200 mt-1">{professionAnalysis.hazardAssessment.score}%</p>
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{professionAnalysis.hazardAssessment.level}</p>
                        </div>
                      </div>

                      {/* Section Completion Bars */}
                      <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                          <Layers size={16} className="text-indigo-600" /> تفصيل اكتمال أبعاد التوصيف
                        </h4>
                        {professionAnalysis.sections.map((sec) => (
                          <div key={sec.nameEn} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-foreground">{sec.name}</span>
                              <span className="text-muted-foreground font-bold">{Math.round(sec.completionRate)}% · وزن {sec.weight}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  sec.completionRate >= 80 ? 'bg-emerald-500' : sec.completionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${sec.completionRate}%` }}
                              />
                            </div>
                            {sec.missingFields.length > 0 && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400">حقول ناقصة: {sec.missingFields.join('، ')}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      {professionAnalysis.recommendations.length > 0 && (
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                          <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                            <Sparkles size={16} className="text-primary" /> التوصيات المؤسسية لتحسين التوصيف
                          </h4>
                          <ul className="space-y-2">
                            {professionAnalysis.recommendations.map((rec, i) => (
                              <li
                                key={i}
                                className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                                  rec.priority === 'عالي'
                                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                                    : rec.priority === 'متوسط'
                                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                                    : 'bg-muted/50 border-border'
                                }`}
                              >
                                <span className={`px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                                  rec.priority === 'عالي' ? 'bg-rose-600 text-white' : rec.priority === 'متوسط' ? 'bg-amber-500 text-white' : 'bg-muted text-foreground'
                                }`}>{rec.priority}</span>
                                <div>
                                  <p className="font-bold text-foreground">{rec.title}</p>
                                  <p className="text-muted-foreground mt-0.5">{rec.description} — الأثر: {rec.impact}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: Allocated Establishments (N:M Studio) */}
                  {activeStudioTab === 'allocations' && (
                    <div className="space-y-4">
                      {/* Allocations Summary Strip */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                          <p className="text-[11px] text-muted-foreground">المنشآت المخصصة</p>
                          <p className="text-lg font-black text-heading mt-0.5">
                            {activeDossier?.stats.total_allocated_establishments || 0}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                          <p className="text-[11px] text-muted-foreground">إجمالي الكوتة المعتمدة</p>
                          <p className="text-lg font-black text-primary mt-0.5">
                            {activeDossier?.stats.total_quota_headcount || 0} عامل
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                          <p className="text-[11px] text-muted-foreground">كوتة الكوادر اليمنية</p>
                          <p className="text-lg font-black text-emerald-600 mt-0.5">
                            {activeDossier?.stats.total_yemeni_quota || 0}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/60 border border-border text-center">
                          <p className="text-[11px] text-muted-foreground">كوتة العمالة الوافدة</p>
                          <p className="text-lg font-black text-amber-600 mt-0.5">
                            {activeDossier?.stats.total_expatriate_quota || 0}
                          </p>
                        </div>
                      </div>

                      {/* Top Action */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                          <Building2 size={16} className="text-emerald-600" />
                          <span>سجل المنشآت المعتمدة المخصصة للمهنة (N:M Allocations)</span>
                        </h4>
                        <button
                          onClick={() => handleOpenAllocation(activeAnalysisItem)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          <Plus size={14} /> تخصيص لمنشآت جديدة
                        </button>
                      </div>

                      {/* Allocations Table */}
                      {(!activeDossier?.allocations || activeDossier.allocations.length === 0) ? (
                        <div className="py-12 text-center bg-muted/20 border border-border rounded-2xl">
                          <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-xs font-bold text-heading">لم يتم تسكين هذه المهنة في أي منشأة بعد</p>
                          <p className="text-[11px] text-muted-foreground mt-1">اضغط على زر «تخصيص لمنشآت جديدة» لبدء تسكين المهنة في المنشآت التجارية</p>
                        </div>
                      ) : (
                        <div className="border border-border rounded-xl overflow-hidden">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-muted/70 border-b border-border">
                              <tr>
                                <th className="px-4 py-2.5 font-bold text-foreground">اسم المنشأة التجارية</th>
                                <th className="px-4 py-2.5 font-bold text-foreground">السجل التجاري</th>
                                <th className="px-4 py-2.5 font-bold text-foreground text-center">الكادر المعتمد</th>
                                <th className="px-4 py-2.5 font-bold text-foreground text-center">يمني / وافد</th>
                                <th className="px-4 py-2.5 font-bold text-foreground text-center">القسم / الإدارة</th>
                                <th className="px-4 py-2.5 font-bold text-foreground text-center">إجراء</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {activeDossier.allocations.map((alloc) => (
                                <tr key={alloc.id} className="hover:bg-accent/30 transition-colors">
                                  <td className="px-4 py-3 font-bold text-heading">
                                    {alloc.enterprise_name}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-muted-foreground">
                                    {alloc.cr_number || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold text-primary">
                                    {alloc.allocated_headcount} وظائف
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-emerald-700 font-bold">{alloc.yemeni_headcount} يمني</span> / <span className="text-amber-700 font-bold">{alloc.expatriate_headcount} وافد</span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">
                                    {alloc.department || 'التشغيل'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleDeleteAllocation(alloc.id, alloc.enterprise_name)}
                                      className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                      title="إلغاء التسكين"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
              <button
                onClick={() => {
                  handleOpenAllocation(activeAnalysisItem);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Building2 size={16} /> تخصيص هذه المهنة لمنشآت تجارية
              </button>

              <button
                onClick={() => setActiveAnalysisItem(null)}
                className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: تخصيص وتسكين المهنة في منشآت متعددة (Multi-Establishment Studio)  */}
      {/* ========================================================================= */}
      {activeAllocationItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-transparent border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-heading">تخصيص وتسكين المهنة في منشآت تجارية (N:M Studio)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    المهنة المستهدفة: <strong className="text-foreground">{activeAllocationItem.name_ar}</strong> ({activeAllocationItem.isco_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAllocationItem(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
              {/* Establishments Multi-Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    اختر المنشآت المستهدفة بالتسكين (يمكنك اختيار منشأة أو عدة منشآت دفعة واحدة) *
                  </label>
                  <span className="text-xs font-bold text-emerald-600">
                    تم تحديد: {selectedEstIds.length} منشأة
                  </span>
                </div>

                {/* Search in establishments */}
                <div className="relative">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={estSearch}
                    onChange={(e) => setEstSearch(e.target.value)}
                    placeholder="ابحث باسم المنشأة، رقم السجل التجاري، أو المحافظة..."
                    className="w-full pl-3 pr-9 py-2 bg-muted/50 border border-border rounded-xl text-xs font-medium text-heading"
                  />
                </div>

                {/* Establishments Checkbox List */}
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-muted/20">
                  {filteredEstablishments.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">لا توجد منشآت مطابقة للبحث</div>
                  ) : (
                    filteredEstablishments.map((est) => {
                      const estId = est.id || est.establishment_id || '';
                      const isSelected = selectedEstIds.includes(estId);
                      return (
                        <div
                          key={estId}
                          onClick={() => toggleEstSelection(estId)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200' : 'hover:bg-accent/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-emerald-600" />
                            ) : (
                              <Square size={16} className="text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-bold text-xs text-heading">{est.name_ar}</p>
                              <p className="text-[11px] text-muted-foreground">
                                سجل تجاري: {est.commercial_register_number || est.unified_code || '—'} | المحافظة: {est.governorate || 'صنعاء'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 bg-muted rounded font-medium text-foreground">
                            {est.sector || 'تجاري'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quotas & Capacity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">الكادر المطلوب لكل منشأة</label>
                  <input
                    type="number"
                    min="1"
                    value={allocationForm.allocated_headcount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      const yemeni = Math.ceil(val * 0.8);
                      const expat = Math.max(0, val - yemeni);
                      setAllocationForm({
                        ...allocationForm,
                        allocated_headcount: val,
                        yemeni_headcount: yemeni,
                        expatriate_headcount: expat,
                      });
                    }}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-bold text-heading"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">عمالة يمنية (مستهدف 80%)</label>
                  <input
                    type="number"
                    min="0"
                    value={allocationForm.yemeni_headcount}
                    onChange={(e) => setAllocationForm({ ...allocationForm, yemeni_headcount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">عمالة وافدة (كوتة مرخصة)</label>
                  <input
                    type="number"
                    min="0"
                    value={allocationForm.expatriate_headcount}
                    onChange={(e) => setAllocationForm({ ...allocationForm, expatriate_headcount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-bold text-amber-700 dark:text-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">القسم / الإدارة داخل المنشأة</label>
                  <input
                    type="text"
                    value={allocationForm.department}
                    onChange={(e) => setAllocationForm({ ...allocationForm, department: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs text-heading"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">سلم الدرجات والرواتب</label>
                  <input
                    type="text"
                    value={allocationForm.salary_scale}
                    onChange={(e) => setAllocationForm({ ...allocationForm, salary_scale: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs text-heading"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">سياسة التوطين واليمننة المقررة</label>
                <input
                  type="text"
                  value={allocationForm.yemenization_policy}
                  onChange={(e) => setAllocationForm({ ...allocationForm, yemenization_policy: e.target.value })}
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs text-heading"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
              <button
                onClick={handleSaveBatchAllocation}
                disabled={savingAllocation || selectedEstIds.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{savingAllocation ? 'جاري اعتماد التسكين...' : `اعتماد تسكين المهنة في (${selectedEstIds.length}) منشأة`}</span>
              </button>
              <button
                onClick={() => setActiveAllocationItem(null)}
                className="px-4 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 2: إضافة مهنة معيارية جديدة (Add New Profession)                       */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600/15 via-emerald-600/5 to-transparent border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-heading">تسجيل مهنة معيارية جديدة</h3>
                  <p className="text-xs text-muted-foreground font-medium">إضافة إلى السجل الوطني للمهن (ISCO-08)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">المسمى المهني (عربي) *</label>
                  <input
                    type="text"
                    value={addForm.name_ar}
                    onChange={(e) => setAddForm({ ...addForm, name_ar: e.target.value })}
                    placeholder="مثال: مهندس برمجيات"
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium text-heading focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">المسمى المهني (إنجليزي)</label>
                  <input
                    type="text"
                    value={addForm.name_en}
                    onChange={(e) => setAddForm({ ...addForm, name_en: e.target.value })}
                    placeholder="Software Engineer"
                    dir="ltr"
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium text-heading focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">الرمز المعياري ISCO *</label>
                  <input
                    type="text"
                    value={addForm.isco_code}
                    onChange={(e) => setAddForm({ ...addForm, isco_code: e.target.value })}
                    placeholder="2511"
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-mono font-bold text-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">القطاع الاقتصادي</label>
                  <select
                    value={addForm.sector}
                    onChange={(e) => setAddForm({ ...addForm, sector: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs font-bold text-heading focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {Object.entries(SECTORS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">المستوى المهني (ISCO)</label>
                  <select
                    value={addForm.level}
                    onChange={(e) => setAddForm({ ...addForm, level: Number(e.target.value) })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs font-bold text-heading focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {[1, 2, 3, 4].map((l) => (
                      <option key={l} value={l}>{l === 4 ? 'المستوى 4 (تنفيذي)' : `المستوى ${l}`}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">تصنيف الخطورة المهنية</label>
                  <select
                    value={addForm.hazard_level}
                    onChange={(e) => setAddForm({ ...addForm, hazard_level: e.target.value })}
                    className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-xs font-bold text-heading focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {Object.entries(HAZARD_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">المؤهل التعليمي الأدنى</label>
                <input
                  type="text"
                  value={addForm.education_level}
                  onChange={(e) => setAddForm({ ...addForm, education_level: e.target.value })}
                  placeholder="بكالوريوس / دبلوم مهني"
                  className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium text-heading focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">الوصف العام والغرض من المهنة</label>
                <textarea
                  rows={3}
                  value={addForm.description_ar}
                  onChange={(e) => setAddForm({ ...addForm, description_ar: e.target.value })}
                  placeholder="نبذة تعريفية بالمهام والمسؤوليات الأساسية..."
                  className="w-full p-3 bg-muted/50 border border-border rounded-xl text-xs font-medium text-heading focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateProfession}
                disabled={savingAdd}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              >
                <Save size={15} /> {savingAdd ? 'جاري الحفظ...' : 'حفظ المهنة في السجل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: بنك المعلومات المعيارية والقانونية (Knowledge Bank Modal)         */}
      {/* ========================================================================= */}
      {knowledgeBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-6xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-heading">بنك المعلومات المعيارية والقانونية لتحليل وتوصيف المهن</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    المرجع المؤسسي لقانون العمل اليمني رقم (5) لعام 1995 ودليل أشهر 30 مهنة حيوية في سوق العمل اليمني
                  </p>
                </div>
              </div>
              <button
                onClick={() => setKnowledgeBankOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 border-b border-border bg-muted/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  onClick={() => setKbTab('top30')}
                  className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                    kbTab === 'top30'
                      ? 'border-amber-500 text-amber-600 bg-amber-500/5 font-black'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Award size={16} /> دليل أشهر 30 مهنة حيوية في اليمن ({TOP_30_YEMEN_OCCUPATIONS.length})
                </button>
                <button
                  onClick={() => setKbTab('laws')}
                  className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                    kbTab === 'laws'
                      ? 'border-amber-500 text-amber-600 bg-amber-500/5 font-black'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Scale size={16} /> المرجعيات والمواد القانونية ({LEGAL_KNOWLEDGE_BANK.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-72">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="ابحث في بنك المعلومات المعيارية..."
                  className="w-full pl-3 pr-8 py-1.5 bg-card border border-border rounded-xl text-xs font-medium text-heading"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
              {/* TAB 1: TOP 30 OCCUPATIONS */}
              {kbTab === 'top30' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTop30.map((item) => {
                    const hazard = HAZARD_CONFIG[item.hazard_level] || HAZARD_CONFIG.low;
                    return (
                      <div
                        key={item.isco_code}
                        className="p-4.5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                              ISCO: {item.isco_code}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${hazard.bg}`}>
                              {hazard.icon} {hazard.label}
                            </span>
                          </div>

                          <h4 className="font-bold text-heading text-sm">{item.name_ar}</h4>
                          <p className="text-[11px] text-muted-foreground font-sans">{item.name_en}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.description_ar}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-border/60 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">الراتب الاسترشادي:</span>
                            <strong className="text-heading font-mono text-[11px]">
                              {item.salary_min.toLocaleString()} - {item.salary_max.toLocaleString()} ر.ي
                            </strong>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                setKnowledgeBankOpen(false);
                                handleOpenStudio(item, 'desc');
                              }}
                              className="flex-1 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition-colors text-center cursor-pointer"
                            >
                              استعراض 360°
                            </button>
                            <button
                              onClick={() => {
                                setKnowledgeBankOpen(false);
                                handleOpenAllocation(item);
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-xs font-bold transition-colors cursor-pointer dark:bg-emerald-950/40 dark:text-emerald-300"
                              title="تخصيص لمنشآت"
                            >
                              <Building2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: LABOR LAW ARTICLES */}
              {kbTab === 'laws' && (
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    {[
                      { key: 'all', label: 'جميع المواد' },
                      { key: 'yemenization', label: 'التوطين واليمننة (المادة 11)' },
                      { key: 'safety', label: 'السلامة والصحة المهنية (OSH)' },
                      { key: 'contracts', label: 'عقود العمل والتسجيل' },
                      { key: 'wages', label: 'الأجور وحماية المستحقات' },
                      { key: 'working_hours', label: 'ساعات العمل والمهن الشاقة' },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setKbLawCategory(cat.key)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          kbLawCategory === cat.key
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLaws.map((law, idx) => (
                      <div key={idx} className="p-4.5 rounded-2xl border border-border bg-card space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs">
                            {law.article_number}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            {law.law_name}
                          </span>
                        </div>
                        <h4 className="font-bold text-heading text-sm">{law.title}</h4>
                        <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                          {law.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-end">
              <button
                onClick={() => setKnowledgeBankOpen(false)}
                className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}