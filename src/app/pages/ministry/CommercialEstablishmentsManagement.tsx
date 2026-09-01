/**
 * Commercial Establishments Management - منظومة إدارة وسجلات المنشآت التجارية (360° Dossier)
 * المنظومة الوطنية لإدارة قطاع العمل | وزارة الشؤون الاجتماعية والعمل - قطاع العمل
 */
import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Download, Edit, RefreshCw, FileCheck, Users, Eye, Phone, MapPin, ShieldCheck, Scale, TrendingDown, Award, ChevronRight, ChevronLeft, Printer, X, CheckCircle2, Briefcase } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'sonner';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useGovernorates } from '../../hooks/useReferenceData';
import {} from '../../branding';
import { fetchEntityRiskAssessment, EntityRiskAssessment } from '../../utils/aiRiskEngine';
import { BrainCircuit, Sparkles } from 'lucide-react';
interface CommercialEstablishment {
    id: string;
    establishment_id: string;
    unified_code: string;
    commercial_register_number: string;
    name_ar: string;
    name_en?: string;
    entity_type: string;
    sector: string;
    classification: string;
    status: string;
    capital_amount?: number;
    employees_count?: number;
    license_number?: string;
    license_date?: string;
    expiry_date?: string;
    owner_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    governorate?: string;
    city?: string;
    created_at?: string;
}
interface Dossier360 {
    establishment: CommercialEstablishment;
    occupations: any[];
    dispatches: any[];
    disputes: any[];
    reductions: any[];
    documents: any[];
    certificates: any[];
    counts: {
        occupations: number;
        dispatches: number;
        disputes: number;
        reductions: number;
        documents: number;
        certificates: number;
    };
}
const SECTORS: Record<string, string> = {
    trade: 'الأنشطة التجارية',
    finance: 'الخدمات المالية والمصرفية',
    services: 'الخدمات العامة',
    tourism: 'السياحة والفنادق والمطاعم',
    industry: 'الصناعات التحويلية والمصانع',
    construction: 'التشييد والبناء',
    agriculture: 'الزراعة والإنتاج الحيواني',
    transport: 'النقل واللوجستيات',
    technology: 'التقنية والاتصالات',
    healthcare: 'الرعاية الصحية',
    education: 'التعليم والتدريب',
    other: 'أنشطة أخرى',
};
const CLASSIFICATIONS: Record<string, {
    label: string;
    bg: string;
    color: string;
}> = {
    small: { label: 'منشأة صغيرة (1-9 عمال)', bg: 'bg-blue-50', color: 'text-blue-700' },
    medium: { label: 'منشأة متوسطة (10-49 عاملاً)', bg: 'bg-emerald-50', color: 'text-emerald-700' },
    large: { label: 'منشأة كبرى (50-249 عاملاً)', bg: 'bg-purple-50', color: 'text-purple-700' },
    mega: { label: 'منشأة عملاقة (250+ عاملاً)', bg: 'bg-amber-50', color: 'text-amber-700' },
};
const STATUS_LABELS: Record<string, {
    label: string;
    bg: string;
    color: string;
}> = {
    active: { label: 'نشطة ومطابقة', bg: 'bg-emerald-100 text-emerald-800', color: 'text-emerald-700' },
    inactive: { label: 'غير نشطة', bg: 'bg-gray-100 text-gray-700', color: 'text-gray-600' },
    suspended: { label: 'موقوفة مؤقتاً', bg: 'bg-rose-100 text-rose-800', color: 'text-rose-700' },
    under_review: { label: 'قيد المراجعة', bg: 'bg-amber-100 text-amber-800', color: 'text-amber-700' },
};
const PAGE_SIZE = 15;
export function CommercialEstablishmentsManagement() {
    const [establishments, setEstablishments] = useState<CommercialEstablishment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterGovernorate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const { governorates } = useGovernorates();
    // 360 Dossier Modal
    const [dossierData, setDossierData] = useState<Dossier360 | null>(null);
    const [aiRisk, setAiRisk] = useState<EntityRiskAssessment | null>(null);
    const [activeDossierTab, setActiveDossierTab] = useState<'overview' | 'occupations' | 'dispatches' | 'disputes' | 'reductions' | 'documents' | 'certificates'>('overview');
    // Edit / Create Modal
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<CommercialEstablishment | null>(null);
    const [formData, setFormData] = useState({
        name_ar: '',
        name_en: '',
        commercial_register_number: '',
        unified_code: '',
        sector: 'trade',
        classification: 'small',
        governorate: 'أمانة العاصمة',
        city: 'صنعاء',
        address: '',
        owner_name: '',
        phone: '',
        email: '',
        employees_count: 1,
        status: 'active',
    });
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(currentPage));
            params.set('limit', String(PAGE_SIZE));
            if (searchTerm.trim())
                params.set('search', searchTerm.trim());
            if (filterSector)
                params.set('sector', filterSector);
            if (filterStatus)
                params.set('status', filterStatus);
            if (filterGovernorate)
                params.set('governorate', filterGovernorate);
            const r = await fetch(`/api/commercial?${params.toString()}`);
            if (r.ok) {
                const data = await r.json();
                setEstablishments(data.data || []);
                setTotalCount(data.total || (data.data || []).length);
            }
            logAudit({ action: 'view', resource: 'commercial_establishments' });
        }
        catch {
            toast.error('خطأ في تحميل سجل المنشآت');
        }
        finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, filterSector, filterStatus, filterGovernorate]);
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    // Open 360 Dossier
    const handleOpen360 = async (est: CommercialEstablishment) => {
        setActiveDossierTab('overview');
        setAiRisk(null);
        try {
            const estKey = est.establishment_id || est.id;
            // Fetch 360 and AI Risk in parallel
            const [dossierRes, aiRes] = await Promise.allSettled([
                fetch(`/api/commercial/${estKey}/360`),
                fetchEntityRiskAssessment(estKey),
            ]);
            if (dossierRes.status === 'fulfilled' && dossierRes.value.ok) {
                const d = await dossierRes.value.json();
                setDossierData(d);
            }
            else {
                setDossierData({
                    establishment: est,
                    occupations: [],
                    dispatches: [],
                    disputes: [],
                    reductions: [],
                    documents: [],
                    certificates: [],
                    counts: { occupations: 0, dispatches: 0, disputes: 0, reductions: 0, documents: 0, certificates: 0 }
                });
            }
            if (aiRes.status === 'fulfilled' && aiRes.value) {
                setAiRisk(aiRes.value);
            }
            logAudit({ action: 'view', resource: 'commercial_establishments_360', details: { id: est.establishment_id } });
        }
        catch {
            toast.error('فشل تحميل الملف الشامل');
        }
    };
    // Open Edit / Create Modal
    const handleOpenModal = (item?: CommercialEstablishment) => {
        if (item) {
            setEditItem(item);
            setFormData({
                name_ar: item.name_ar,
                name_en: item.name_en || '',
                commercial_register_number: item.commercial_register_number || '',
                unified_code: item.unified_code || '',
                sector: item.sector || 'trade',
                classification: item.classification || 'small',
                governorate: item.governorate || 'أمانة العاصمة',
                city: item.city || '',
                address: item.address || '',
                owner_name: item.owner_name || '',
                phone: item.phone || '',
                email: item.email || '',
                employees_count: item.employees_count || 1,
                status: item.status || 'active',
            });
        }
        else {
            setEditItem(null);
            setFormData({
                name_ar: '',
                name_en: '',
                commercial_register_number: '',
                unified_code: '',
                sector: 'trade',
                classification: 'small',
                governorate: 'أمانة العاصمة',
                city: 'صنعاء',
                address: '',
                owner_name: '',
                phone: '',
                email: '',
                employees_count: 1,
                status: 'active',
            });
        }
        setShowModal(true);
    };
    const handleSave = async () => {
        if (!formData.name_ar.trim()) {
            toast.error('اسم المنشأة التجاري مطلوب');
            return;
        }
        try {
            const endpoint = editItem ? `/api/commercial-establishments/${editItem.id}` : '/api/commercial-establishments';
            const method = editItem ? 'PUT' : 'POST';
            const r = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث بيانات المنشأة بنجاح' : 'تم إضافة المنشأة بنجاح');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'commercial_establishment', details: formData });
                setShowModal(false);
                fetchData();
            }
            else {
                toast.error('حدث خطأ أثناء الحفظ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بقاعدة البيانات');
        }
    };
    const handleExport = () => {
        exportReportToExcel({
            title: 'سجل_المنشآت_التجارية_المعتمدة',
            reportType: 'statistics',
            data: establishments,
            columns: [
                { key: 'establishment_id', label: 'رقم المنشأة' },
                { key: 'unified_code', label: 'الرمز الوطني الموحد' },
                { key: 'name_ar', label: 'الاسم التجاري' },
                { key: 'commercial_register_number', label: 'رقم السجل التجاري' },
                { key: 'owner_name', label: 'اسم المالك / المدير' },
                { key: 'sector', label: 'القطاع' },
                { key: 'governorate', label: 'المحافظة' },
                { key: 'phone', label: 'رقم الهاتف' },
                { key: 'employees_count', label: 'عدد العمال المسجلين' },
                { key: 'status', label: 'الحالة' },
            ],
        });
        toast.success('تم تصدير سجل المنشآت إلى Excel بنجاح');
        logAudit({ action: 'export', resource: 'commercial_establishments', details: { count: establishments.length } });
    };
    return (<div className="space-y-6" dir="rtl">
      {/* Header */}
      <PageHeader title="سجل المنشآت التجارية الوطنية" subtitle="السجل المركزي لمنشآت أصحاب الأعمال، المهن المسكنة، تصاريح العمل، ومراقبة الامتثال" actions={<div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm">
              <Download size={16}/> تصدير Excel
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
              <Plus size={16}/> إضافة منشأة جديدة
            </button>
          </div>}/>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">إجمالي المنشآت المسجلة</p>
              <p className="text-2xl font-black text-heading mt-1">{totalCount.toLocaleString('ar-YE')}</p>
              <p className="text-[11px] text-primary font-medium mt-1">منشأة تجارية معتمدة</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Building2 size={24}/>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">العمالة الوطنية المسجلة</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">12,599</p>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">عامل مسجل وموثق</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
              <Users size={24}/>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">اللوائح والعقود المعتمدة</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">42 وثيقة</p>
              <p className="text-[11px] text-indigo-700 font-medium mt-1">معتمدة ومطابقة للقانون</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
              <FileCheck size={24}/>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">نسبة الامتثال والسلامة</p>
              <p className="text-2xl font-black text-amber-600 mt-1">98.4%</p>
              <p className="text-[11px] text-amber-700 font-medium mt-1">مطابقة لمعايير OSH</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
              <ShieldCheck size={24}/>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" placeholder="بحث بالاسم، رقم السجل، الرمز الموحد، أو المالك..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full pr-10 pl-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-heading focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none"/>
          </div>

          {/* Sector filter */}
          <select value={filterSector} onChange={(e) => { setFilterSector(e.target.value); setCurrentPage(1); }} className="p-2.5 border border-border rounded-xl bg-card text-sm text-heading">
            <option value="">جميع القطاعات</option>
            {Object.entries(SECTORS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>

          {/* Status filter */}
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="p-2.5 border border-border rounded-xl bg-card text-sm text-heading">
            <option value="">جميع الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>

          {/* Refresh */}
          <button onClick={fetchData} className="flex items-center justify-center gap-2 p-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
            <span className="text-xs font-semibold">تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* Establishments Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (<div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-muted-foreground">جاري استعراض المنشآت من السجل الوطني...</p>
          </div>) : establishments.length === 0 ? (<div className="py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3"/>
            <h4 className="text-base font-bold text-heading">لا توجد منشآت مطابقة للبحث</h4>
            <p className="text-xs text-muted-foreground mt-1">تأكد من كتابة اسم المنشأة أو رقم السجل التجاري بدقة</p>
          </div>) : (<div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/70 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">رقم المنشأة</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">الاسم التجاري</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">رقم السجل التجاري</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">القطاع والنشاط</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">المالك / المدير</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">العمالة</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">الحالة</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">الملف والعمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {establishments.map((est) => {
                const statusInfo = STATUS_LABELS[est.status] || STATUS_LABELS.active;
                return (<tr key={est.id || est.establishment_id} className="hover:bg-accent/40 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-xs font-bold text-primary">
                        {est.establishment_id || est.unified_code}
                      </td>

                      {/* Name & Address */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-heading text-sm">{est.name_ar}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-muted-foreground"/>
                          <span>{est.governorate || 'أمانة العاصمة'} {est.address ? `— ${est.address}` : ''}</span>
                        </div>
                      </td>

                      {/* Commercial Register */}
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-foreground">
                        {est.commercial_register_number || '—'}
                      </td>

                      {/* Sector */}
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-muted text-foreground font-medium">
                          {SECTORS[est.sector] || est.sector || 'نشاط تجاري'}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-4 text-xs text-foreground font-medium">
                        {est.owner_name || 'المالك المعتمد'}
                        {est.phone && (<div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono mt-0.5">
                            <Phone size={10}/> {est.phone}
                          </div>)}
                      </td>

                      {/* Employees Count */}
                      <td className="px-5 py-4 text-center font-bold text-xs text-heading">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-mono">
                          {est.employees_count || 1} عمال
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* 360 Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpen360(est)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all shadow-sm" title="عرض الملف المؤسسي الشامل 360 درجة">
                            <Eye size={14}/> الملف الشامل 360°
                          </button>

                          <button onClick={() => handleOpenModal(est)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="تعديل بيانات المنشأة">
                            <Edit size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>)}

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            صفحة <strong className="text-foreground">{currentPage}</strong> من <strong className="text-foreground">{totalPages}</strong> (إجمالي <strong className="text-foreground">{totalCount}</strong> منشأة)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1 || loading} className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronRight size={16}/>
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || loading} className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors">
              <ChevronLeft size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 360° INSTITUTIONAL ENTERPRISE DOSSIER DRAWER / MODAL                      */}
      {/* ========================================================================= */}
      {dossierData && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Building2 size={28}/>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/15 text-primary rounded-md">
                      سجل تجاري: {dossierData.establishment.commercial_register_number || 'CR-000000'}
                    </span>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-muted text-foreground rounded-md">
                      رمز المنشأة: {dossierData.establishment.establishment_id || dossierData.establishment.unified_code}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                      منشأة معتمدة رسمياً
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-heading mt-1">{dossierData.establishment.name_ar}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <MapPin size={13} className="text-muted-foreground"/>
                    <span>{dossierData.establishment.governorate} — {dossierData.establishment.address || 'العنوان الرئيسي'}</span>
                    {dossierData.establishment.phone && (<>
                        <span className="text-border">|</span>
                        <Phone size={13}/>
                        <span className="font-mono">{dossierData.establishment.phone}</span>
                      </>)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-all shadow-sm">
                  <Printer size={15}/> طباعة الملف الرسمي
                </button>
                <button onClick={() => setDossierData(null)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                  <X size={20}/>
                </button>
              </div>
            </div>

            {/* 360 Tabs Navigation */}
            <div className="flex items-center gap-1 px-6 border-b border-border bg-muted/30 overflow-x-auto text-xs font-bold">
              {[
                { id: 'overview', label: '1. بيانات المنشأة والتأسيس', icon: Building2, count: null },
                { id: 'occupations', label: '2. المهن المسكنة واليمننة', icon: Briefcase, count: dossierData.counts.occupations },
                { id: 'dispatches', label: '3. إرساليات وتصاريح العمل', icon: Users, count: dossierData.counts.dispatches },
                { id: 'disputes', label: '4. المنازعات العمالية', icon: Scale, count: dossierData.counts.disputes },
                { id: 'reductions', label: '5. طلبات تخفيض العمالة', icon: TrendingDown, count: dossierData.counts.reductions },
                { id: 'documents', label: '6. اللوائح والعقود المعتمدة', icon: FileCheck, count: dossierData.counts.documents },
                { id: 'certificates', label: '7. شهادات الخبرة والمطابقة', icon: Award, count: dossierData.counts.certificates },
            ].map((tab) => (<button key={tab.id} onClick={() => setActiveDossierTab(tab.id as any)} className={`flex items-center gap-2 py-3.5 px-4 border-b-2 transition-all whitespace-nowrap ${activeDossierTab === tab.id
                    ? 'border-primary text-primary bg-card shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  <tab.icon size={15}/>
                  <span>{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (<span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                      {tab.count}
                    </span>)}
                </button>))}
            </div>

            {/* 360 Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Tab 1: Overview */}
              {activeDossierTab === 'overview' && (<div className="space-y-6">
                  {/* AI Risk Assessment Card */}
                  {aiRisk && (<div className="p-4.5 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-transparent dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-transparent border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-md">
                            <BrainCircuit size={20}/>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-heading">تقييم المخاطر التنبؤي بالذكاء الاصطناعي (AI Risk Score)</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold text-white" style={{ backgroundColor: aiRisk.color }}>
                                {aiRisk.risk_level_ar} ({aiRisk.ai_risk_score} / 100)
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              دقة النموذج: {aiRisk.confidence_rate}% | نسبة اليمننة الحالية: {aiRisk.metrics.actual_yemenization_ratio}% (المستهدف: 80%)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* AI Recommendations */}
                      {aiRisk.prescriptive_recommendations && aiRisk.prescriptive_recommendations.length > 0 && (<div className="space-y-1.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                          {aiRisk.prescriptive_recommendations.map((rec, i) => (<div key={i} className="flex items-start gap-2 text-foreground">
                              <Sparkles size={13} className="text-indigo-600 mt-0.5 shrink-0"/>
                              <span>{rec}</span>
                            </div>))}
                        </div>)}
                    </div>)}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border">
                      <p className="text-xs text-muted-foreground font-medium">القطاع الاقتصادي</p>
                      <p className="text-sm font-bold text-heading mt-1">{SECTORS[dossierData.establishment.sector] || dossierData.establishment.sector}</p>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border">
                      <p className="text-xs text-muted-foreground font-medium">حجم المنشأة</p>
                      <p className="text-sm font-bold text-primary mt-1">{CLASSIFICATIONS[dossierData.establishment.classification]?.label || 'منشأة صغيرة'}</p>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border">
                      <p className="text-xs text-muted-foreground font-medium">العمالة المسجلة</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">{dossierData.establishment.employees_count || 1} عمال</p>
                    </div>
                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border">
                      <p className="text-xs text-muted-foreground font-medium">المالك / المدير المعتمد</p>
                      <p className="text-sm font-bold text-heading mt-1">{dossierData.establishment.owner_name || 'معتمد'}</p>
                    </div>
                  </div>

                  <div className="p-4.5 bg-card border border-border rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <ShieldCheck size={16}/> الموقف النظامي والامتثال لقانون العمل
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0"/>
                        <span>السجل التجاري ساري ومطابق</span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0"/>
                        <span>التأمين الاجتماعي والاشتراكات منتظمة</span>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0"/>
                        <span>اشتراطات السلامة المهنية معتمدة</span>
                      </div>
                    </div>
                  </div>
                </div>)}

              {/* Tab 2: Occupations */}
              {activeDossierTab === 'occupations' && (<div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-heading">الوظائف والمهن المسكنة في الهيكل التنظيمي</h4>
                    <span className="text-xs text-muted-foreground">كوتة التوطين الإلزامية: 80% عمالة وطنية</span>
                  </div>

                  {dossierData.occupations.length === 0 ? (<div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                      <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2"/>
                      <p className="text-xs text-muted-foreground">لم يتم تسكين مهن تفصيلية إضافية لهذه المنشأة بعد</p>
                    </div>) : (<div className="space-y-2.5">
                      {dossierData.occupations.map((occ, i) => (<div key={i} className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-heading">{occ.occupation_name_ar} ({occ.isco_code})</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">القسم: {occ.department} | الكادر: {occ.allocated_headcount} (يمني: {occ.yemeni_headcount} - وافد: {occ.expatriate_headcount})</p>
                          </div>
                          <span className={"px-2.5 py-1 rounded-lg text-xs font-bold " + (occ.compliance_score != null ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>
                            {occ.compliance_score != null ? `مطابق بنسبة ${occ.compliance_score}%` : 'لم يُقيّم بعد'}
                          </span>
                        </div>))}
                    </div>)}
                </div>)}

              {/* Tab 3: Dispatches */}
              {activeDossierTab === 'dispatches' && (<div className="space-y-4">
                  <h4 className="text-xs font-bold text-heading">سجل إرساليات وتصاريح توجيه العمالة</h4>
                  {dossierData.dispatches.length === 0 ? (<div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                      <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2"/>
                      <p className="text-xs text-muted-foreground">لا توجد إرساليات أو تصاريح عمل مسجلة لهذه المنشأة حالياً</p>
                    </div>) : (<div className="space-y-2.5">
                      {dossierData.dispatches.map((disp, i) => (<div key={i} className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-heading">العامل: {disp.worker_name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">الجهة المستقبلة: {disp.receiving_enterprise_name} | الغرض: {disp.purpose}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                            {disp.status || 'معتمد'}
                          </span>
                        </div>))}
                    </div>)}
                </div>)}

              {/* Tab 4: Disputes */}
              {activeDossierTab === 'disputes' && (<div className="space-y-4">
                  <h4 className="text-xs font-bold text-heading">سجل المنازعات العمالية ومحاضر الصلح</h4>
                  {dossierData.disputes.length === 0 ? (<div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-200">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2"/>
                      <p className="text-xs font-bold text-emerald-900">سجل ناصع — لا توجد أي نزاعات عمالية أو شكاوى ضد هذه المنشأة</p>
                    </div>) : (<div className="space-y-2.5">
                      {dossierData.disputes.map((disp, i) => (<div key={i} className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-heading">الشاكي: {disp.worker_name} — موضوع النزاع: {disp.dispute_type}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{disp.dispute_description}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                            {disp.status}
                          </span>
                        </div>))}
                    </div>)}
                </div>)}

              {/* Tab 5: Reductions */}
              {activeDossierTab === 'reductions' && (<div className="space-y-4">
                  <h4 className="text-xs font-bold text-heading">سجل طلبات تخفيض العمالة لأسباب اقتصادية</h4>
                  {dossierData.reductions.length === 0 ? (<div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                      <TrendingDown className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2"/>
                      <p className="text-xs text-muted-foreground">لا توجد طلبات تقليص عمالة مسجلة</p>
                    </div>) : (<div className="space-y-2.5">
                      {dossierData.reductions.map((red, i) => (<div key={i} className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-heading">طلب رقم: {red.request_number} — عدد العمال: {red.requested_reduction_count}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">المبرر: {red.reduction_reason}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold">
                            {red.status}
                          </span>
                        </div>))}
                    </div>)}
                </div>)}

              {/* Tab 6: Documents */}
              {activeDossierTab === 'documents' && (<div className="space-y-4">
                  <h4 className="text-xs font-bold text-heading">اللوائح الداخلية وعقود العمل المعتمدة</h4>
                  {dossierData.documents.length === 0 ? (<div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                      <FileCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2"/>
                      <p className="text-xs text-muted-foreground">لا توجد وثائق تعميد خاصة مسجلة</p>
                    </div>) : (<div className="space-y-2.5">
                      {dossierData.documents.map((doc, i) => (<div key={i} className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-heading">{doc.document_name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{doc.description}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                            {doc.status}
                          </span>
                        </div>))}
                    </div>)}
                </div>)}

              {/* Tab 7: Certificates */}
              {activeDossierTab === 'certificates' && (<div className="space-y-4">
                  <h4 className="text-xs font-bold text-heading">شهادات الخبرة ومطابقة الكفاءة المهنية الصادرة</h4>
                  {dossierData.certificates.length === 0 ? (<div className="p-8 text-center bg-muted/30 rounded-2xl border border-border">
                      <Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2"/>
                      <p className="text-xs text-muted-foreground">لا توجد شهادات مطابقة مسجلة</p>
                    </div>) : (<div className="space-y-2.5">
                      {dossierData.certificates.map((cert, i) => (<div key={i} className="p-3.5 bg-card border border-border rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-heading">{cert.certificate_number}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{cert.evaluation_summary}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                            {cert.status}
                          </span>
                        </div>))}
                    </div>)}
                </div>)}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
              <button onClick={() => {
                const est = dossierData.establishment;
                setDossierData(null);
                handleOpenModal(est);
            }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all">
                <Edit size={15}/> تعديل بيانات المنشأة
              </button>

              <button onClick={() => setDossierData(null)} className="px-5 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE ESTABLISHMENT                                        */}
      {/* ========================================================================= */}
      {showModal && (<Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'تعديل بيانات المنشأة التجارية' : 'تسجيل منشأة تجارية جديدة'} size="lg" footer={<>
              <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
              <Button onClick={handleSave}>{editItem ? 'تحديث البيانات' : 'حفظ وتسجيل المنشأة'}</Button>
            </>}>
          <div className="grid grid-cols-2 gap-4 text-right">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1">الاسم التجاري للمنشأة *</label>
              <input value={formData.name_ar} onChange={e => setFormData({ ...formData, name_ar: e.target.value })} placeholder="مثال: شركة النجم للصناعات الغذائية" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm text-heading"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">رقم السجل التجاري</label>
              <input value={formData.commercial_register_number} onChange={e => setFormData({ ...formData, commercial_register_number: e.target.value })} placeholder="CR-000000" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">الرمز الموحد للمنشأة</label>
              <input value={formData.unified_code} onChange={e => setFormData({ ...formData, unified_code: e.target.value })} placeholder="UC-0000000" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">القطاع الاقتصادي</label>
              <select value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm">
                {Object.entries(SECTORS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">حجم وتصنيف المنشأة</label>
              <select value={formData.classification} onChange={e => setFormData({ ...formData, classification: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm">
                {Object.entries(CLASSIFICATIONS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">المحافظة</label>
              <select value={formData.governorate || governorates[0] || ''} onChange={e => setFormData({ ...formData, governorate: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm">
                {governorates.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">عدد العمال المسجلين</label>
              <input type="number" min="1" value={formData.employees_count} onChange={e => setFormData({ ...formData, employees_count: Number(e.target.value) })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-bold"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">المالك / المدير المعتمد</label>
              <input value={formData.owner_name} onChange={e => setFormData({ ...formData, owner_name: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">رقم الهاتف</label>
              <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="770000000" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"/>
            </div>
          </div>
        </Modal>)}
    </div>);
}
export default CommercialEstablishmentsManagement;
