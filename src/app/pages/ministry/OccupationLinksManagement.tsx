/**
 * OccupationLinksManagement — إدارة روابط المهن بالمنشآت
 * DB: enterprise_occupation_links
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, RefreshCw, X, Download, Link2, Users, ChevronRight, ChevronLeft, CheckCircle, XCircle, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
interface OccupationLink {
    id: string;
    enterprise_id: string;
    occupation_id: string;
    enterprise_name: string;
    occupation_code: string;
    occupation_name_ar: string;
    isco_code: string;
    department: string;
    allocated_headcount: number;
    yemeni_headcount: number;
    expatriate_headcount: number;
    salary_scale: string;
    contract_types: string;
    yemenization_policy: string;
    link_status: string;
    compliance_score: number;
    labor_law_compliant: boolean;
    salary_compliant: boolean;
    osh_compliant: boolean;
    medical_checks_done: boolean;
    yemenization_compliant: boolean;
    created_at: string;
}
interface Entity {
    entity_id: string;
    name_ar: string;
    name_en?: string;
}
interface Profession {
    id: string;
    name_ar: string;
    isco_code: string;
    sector: string;
}
const STATUS_CONFIG: Record<string, {
    label: string;
    color: string;
    bg: string;
}> = {
    active: { label: 'نشط', color: 'text-green-700', bg: 'bg-green-100' },
    inactive: { label: 'غير نشط', color: 'text-gray-600', bg: 'bg-gray-100' },
    suspended: { label: 'معلق', color: 'text-red-700', bg: 'bg-red-100' },
};
type TabKey = 'basic' | 'headcount' | 'compliance';
const TABS: {
    key: TabKey;
    label: string;
}[] = [
    { key: 'basic', label: 'المعلومات الأساسية' },
    { key: 'headcount', label: 'التعيينات والرواتب' },
    { key: 'compliance', label: 'الامتثال' },
];
const PAGE_SIZE = 10;
const emptyForm: Partial<OccupationLink> = {
    enterprise_id: '',
    occupation_id: '',
    enterprise_name: '',
    occupation_code: '',
    occupation_name_ar: '',
    isco_code: '',
    department: '',
    allocated_headcount: 1,
    yemeni_headcount: 0,
    expatriate_headcount: 0,
    salary_scale: '',
    contract_types: '',
    yemenization_policy: '',
    link_status: 'active',
    compliance_score: 0,
    labor_law_compliant: false,
    salary_compliant: false,
    osh_compliant: false,
    medical_checks_done: false,
    yemenization_compliant: false,
};
export function OccupationLinksManagement() {
    const [links, setLinks] = useState<OccupationLink[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [professions, setProfessions] = useState<Profession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItem, setSelectedItem] = useState<OccupationLink | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<OccupationLink | null>(null);
    const [selectedTab, setSelectedTab] = useState<TabKey>('basic');
    const [form, setForm] = useState<Partial<OccupationLink>>({ ...emptyForm });
    const { confirm, dialog: confirmDialog } = useConfirm();
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery)
                params.set('search', searchQuery);
            if (filterStatus)
                params.set('link_status', filterStatus);
            if (filterEntity)
                params.set('enterprise_id', filterEntity);
            params.set('limit', '200');
            const [rLinks, rEntities, rProfessions] = await Promise.all([
                fetch(`/api/enterprise-occupation-links?${params.toString()}`),
                fetch('/api/entities?limit=100'),
                fetch('/api/professions?last_level=true&limit=500'),
            ]);
            if (rLinks.ok) {
                const d = await rLinks.json();
                setLinks(d.data || []);
            }
            if (rEntities.ok) {
                const d = await rEntities.json();
                setEntities(d.data || d || []);
            }
            if (rProfessions.ok) {
                const d = await rProfessions.json();
                setProfessions(d.data || d.professions || d || []);
            }
            logAudit({ action: 'view', resource: 'enterprise_occupation_links' });
        }
        catch {
            toast.error('خطأ في تحميل البيانات');
        }
        finally {
            setLoading(false);
        }
    }, [searchQuery, filterStatus, filterEntity]);
    useEffect(() => { fetchData(); }, [fetchData]);
    const filtered = useMemo(() => links, [links]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const stats = useMemo(() => ({
        total: links.length,
        active: links.filter(l => l.link_status === 'active').length,
        suspended: links.filter(l => l.link_status === 'suspended').length,
        avgCompliance: links.length > 0
            ? Math.round(links.reduce((sum, l) => sum + (l.compliance_score || 0), 0) / links.length)
            : 0,
    }), [links]);
    const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
    const handleSave = async () => {
        if (!form.enterprise_id || !form.occupation_id) {
            toast.error('يرجى اختيار المنشأة والمهنة');
            return;
        }
        try {
            const method = editItem ? 'PUT' : 'POST';
            const url = editItem ? `/api/enterprise-occupation-links/${editItem.id}` : '/api/enterprise-occupation-links';
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث الرابط' : 'تم إنشاء الرابط');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'enterprise_occupation_links', details: form });
                setShowForm(false);
                setEditItem(null);
                fetchData();
            }
            else {
                const e = await r.json();
                toast.error(e.error || 'حدث خطأ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف هذا الرابط؟ لا يمكن التراجع عن هذا الإجراء.',
            confirmLabel: 'نعم، حذف',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/enterprise-occupation-links/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم الحذف');
                logAudit({ action: 'delete', resource: 'enterprise_occupation_links', details: { id } });
                fetchData();
            }
            else {
                toast.error('فشل الحذف');
            }
        }
        catch {
            toast.error('خطأ');
        }
    };
    const openCreate = () => {
        setEditItem(null);
        setForm({ ...emptyForm });
        setSelectedTab('basic');
        setShowForm(true);
    };
    const openEdit = (item: OccupationLink) => {
        setEditItem(item);
        setForm({ ...emptyForm, ...item });
        setSelectedTab('basic');
        setShowForm(true);
    };
    const handleEntityChange = (entityId: string) => {
        const entity = entities.find(e => e.entity_id === entityId);
        setForm(prev => ({
            ...prev,
            enterprise_id: entityId,
            enterprise_name: entity?.name_ar || '',
        }));
    };
    const handleProfessionChange = (professionId: string) => {
        const prof = professions.find(p => p.id === professionId);
        setForm(prev => ({
            ...prev,
            occupation_id: professionId,
            occupation_name_ar: prof?.name_ar || '',
            occupation_code: prof?.isco_code || '',
            isco_code: prof?.isco_code || '',
        }));
    };
    const getComplianceColor = (score: number) => {
        if (score >= 80)
            return 'text-green-700 bg-green-100';
        if (score >= 50)
            return 'text-yellow-700 bg-yellow-100';
        return 'text-red-700 bg-red-100';
    };
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}

      <PageHeader title="تسكين المهن بالمنشآت وتوطين الوظائف (اليمننة 80%)" subtitle="تسكين المهن المعتمدة في الهياكل الوظيفية للشركات ومتابعة نسب توطين الوظائف والامتثال للقانون" breadcrumbs={[{ label: 'الرئيسية', to: '/ministry' }, { label: 'تسكين وتوطين المهن' }]} actions={<div className="flex items-center gap-2">
            <button onClick={() => {
                exportReportToExcel({
                    title: 'روابط المهن بالمنشآت',
                    reportType: 'statistics',
                    data: filtered,
                    columns: [
                        { key: 'enterprise_name', label: 'المنشأة' },
                        { key: 'occupation_name_ar', label: 'المهنة' },
                        { key: 'occupation_code', label: 'الكود' },
                        { key: 'yemeni_headcount', label: 'اليمنيون' },
                        { key: 'expatriate_headcount', label: 'الأجانب' },
                        { key: 'link_status', label: 'الحالة' },
                        { key: 'compliance_score', label: 'الامتثال' },
                    ],
                });
                logAudit({ action: 'export', resource: 'enterprise_occupation_links', details: { count: filtered.length } });
                toast.success('تم التصدير');
            }} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors">
              <Download className="w-4 h-4"/>
              تصدير
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
              <Plus className="w-4 h-4"/>
              رابط جديد
            </button>
          </div>}/>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-heading">{stats.total}</div>
          <div className="text-xs text-muted-foreground">إجمالي الروابط</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-muted-foreground">روابط نشطة</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
          <div className="text-xs text-muted-foreground">روابط معلقة</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className={`text-2xl font-bold ${stats.avgCompliance >= 80 ? 'text-green-600' : stats.avgCompliance >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.avgCompliance}%
          </div>
          <div className="text-xs text-muted-foreground">متوسط الامتثال</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input type="text" placeholder="بحث بالمنشأة أو المهنة أو الكود..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm bg-card text-heading"/>
        </div>
        <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع المنشآت</option>
          {entities.map(e => (<option key={e.entity_id} value={e.entity_id}>{e.name_ar}</option>))}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="suspended">معلق</option>
        </select>
        <button onClick={fetchData} className="p-2 border border-border rounded-lg hover:bg-accent">
          <RefreshCw className="w-4 h-4"/>
        </button>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
          <Plus className="w-4 h-4"/> رابط جديد
        </button>
      </div>

      {/* Table */}
      {loading ? (<div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
        </div>) : filtered.length === 0 ? (<EmptyState title="لا توجد روابط" description="لم يتم العثور على روابط مهن بالمنشآت" icon={<Link2 className="w-14 h-14"/>}/>) : (<>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المنشأة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">المهنة</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">الكود</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">اليمنيون</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الأجانب</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الحالة</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">الامتثال</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(link => {
                const statusCfg = STATUS_CONFIG[link.link_status] || STATUS_CONFIG.active;
                return (<tr key={link.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-heading">{link.enterprise_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-heading">{link.occupation_name_ar || '—'}</div>
                        {link.department && (<div className="text-xs text-muted-foreground mt-0.5">{link.department}</div>)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{link.occupation_code || link.isco_code || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-700">
                          <Users className="w-3.5 h-3.5"/>
                          {link.yemeni_headcount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                          <Users className="w-3.5 h-3.5"/>
                          {link.expatriate_headcount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${getComplianceColor(link.compliance_score)}`}>
                          {link.compliance_score}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedItem(link)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg" title="عرض التفاصيل">
                            <Eye className="w-4 h-4"/>
                          </button>
                          <button onClick={() => openEdit(link)} className="p-1.5 text-muted-foreground hover:bg-accent rounded-lg" title="تعديل">
                            <Edit2 className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleDelete(link.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg" title="حذف">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (<div className="flex items-center justify-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent">
                <ChevronRight className="w-4 h-4"/>
              </button>
              <span className="text-sm text-muted-foreground">
                صفحة {currentPage} من {totalPages}
              </span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent">
                <ChevronLeft className="w-4 h-4"/>
              </button>
            </div>)}
        </>)}

      {/* Detail Modal */}
      {selectedItem && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">تفاصيل الرابط</h3>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-muted rounded-lg">
                <X size={20}/>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'المنشأة', value: selectedItem.enterprise_name },
                { label: 'المهنة', value: selectedItem.occupation_name_ar },
                { label: 'كود المهنة', value: selectedItem.occupation_code || selectedItem.isco_code },
                { label: 'القسم', value: selectedItem.department },
                { label: 'التعيين الكلي', value: selectedItem.allocated_headcount },
                { label: 'اليمنيون', value: selectedItem.yemeni_headcount },
                { label: 'الأجانب', value: selectedItem.expatriate_headcount },
                { label: 'مقياس الراتب', value: selectedItem.salary_scale },
                { label: 'أنواع العقود', value: selectedItem.contract_types },
                { label: 'سياسة التوطين', value: selectedItem.yemenization_policy },
                { label: 'الحالة', value: STATUS_CONFIG[selectedItem.link_status]?.label || selectedItem.link_status },
                { label: 'درجة الامتثال', value: `${selectedItem.compliance_score}%` },
            ].map(item => (<div key={item.label} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                </div>))}

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">فحوصات الامتثال</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                { label: 'متوافق مع قانون العمل', value: selectedItem.labor_law_compliant },
                { label: 'متوافق مع الرواتب', value: selectedItem.salary_compliant },
                { label: 'متوافق مع السلامة', value: selectedItem.osh_compliant },
                { label: 'الفحوصات الطبية', value: selectedItem.medical_checks_done },
                { label: 'متوافق مع التوطين', value: selectedItem.yemenization_compliant },
            ].map(check => (<div key={check.label} className="flex items-center gap-2">
                      {check.value ? (<CheckCircle className="w-4 h-4 text-green-600"/>) : (<XCircle className="w-4 h-4 text-red-500"/>)}
                      <span className="text-xs text-heading">{check.label}</span>
                    </div>))}
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {/* Add/Edit Modal */}
      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">
                {editItem ? 'تعديل الرابط' : 'رابط مهنة بالمنشأة جديد'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg">
                <X size={20}/>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border px-6 pt-3">
              {TABS.map(tab => (<button key={tab.key} onClick={() => setSelectedTab(tab.key)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${selectedTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-heading'}`}>
                  {tab.label}
                </button>))}
            </div>

            <div className="p-6">
              {/* Tab: Basic Info */}
              {selectedTab === 'basic' && (<div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">المنشأة *</label>
                    <select value={form.enterprise_id || ''} onChange={e => handleEntityChange(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                      <option value="">اختر المنشأة</option>
                      {entities.map(e => (<option key={e.entity_id} value={e.entity_id}>{e.name_ar}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">المهنة *</label>
                    <select value={form.occupation_id || ''} onChange={e => handleProfessionChange(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                      <option value="">اختر المهنة</option>
                      {professions.map(p => (<option key={p.id} value={p.id}>{p.name_ar} ({p.isco_code})</option>))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-heading">كود المهنة</label>
                      <input value={form.occupation_code || ''} onChange={e => updateForm('occupation_code', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card font-mono" placeholder="ISCO-08 code"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-heading">القسم</label>
                      <input value={form.department || ''} onChange={e => updateForm('department', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="القسم أو الإدارة"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">الحالة</label>
                    <select value={form.link_status || 'active'} onChange={e => updateForm('link_status', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="suspended">معلق</option>
                    </select>
                  </div>
                </div>)}

              {/* Tab: Headcount */}
              {selectedTab === 'headcount' && (<div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-heading">التعيين الكلي</label>
                      <input type="number" min={1} value={form.allocated_headcount || 1} onChange={e => updateForm('allocated_headcount', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-heading">اليمنيون</label>
                      <input type="number" min={0} value={form.yemeni_headcount || 0} onChange={e => updateForm('yemeni_headcount', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-heading">الأجانب</label>
                      <input type="number" min={0} value={form.expatriate_headcount || 0} onChange={e => updateForm('expatriate_headcount', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">مقياس الراتب</label>
                    <input value={form.salary_scale || ''} onChange={e => updateForm('salary_scale', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="مثلاً: 250,000 - 400,000 ر.ي"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">أنواع العقود</label>
                    <input value={form.contract_types || ''} onChange={e => updateForm('contract_types', e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="مثلاً: دائم، مؤقت، بحاجة"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">سياسة التوطين</label>
                    <textarea value={form.yemenization_policy || ''} onChange={e => updateForm('yemenization_policy', e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="تفاصيل سياسة توطين اليمنيين..."/>
                  </div>
                </div>)}

              {/* Tab: Compliance */}
              {selectedTab === 'compliance' && (<div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-heading">درجة الامتثال (%)</label>
                    <input type="number" min={0} max={100} value={form.compliance_score || 0} onChange={e => updateForm('compliance_score', Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"/>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-heading">فحوصات الامتثال</p>
                    {[
                    { field: 'labor_law_compliant', label: 'متوافق مع قانون العمل' },
                    { field: 'salary_compliant', label: 'متوافق مع معايير الرواتب' },
                    { field: 'osh_compliant', label: 'متوافق مع معايير السلامة المهنية' },
                    { field: 'medical_checks_done', label: 'تم إجراء الفحوصات الطبية' },
                    { field: 'yemenization_compliant', label: 'متوافق مع سياسة التوطين' },
                ].map(check => (<label key={check.field} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                        <input type="checkbox" checked={!!(form as any)[check.field]} onChange={e => updateForm(check.field, e.target.checked)} className="w-4 h-4 rounded border-border"/>
                        <span className="text-sm text-heading">{check.label}</span>
                      </label>))}
                  </div>
                </div>)}
            </div>

            <div className="flex gap-3 justify-end px-6 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent">
                إلغاء
              </button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90">
                {editItem ? 'تحديث' : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>)}
    </div>);
}
