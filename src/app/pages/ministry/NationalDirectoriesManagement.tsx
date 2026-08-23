/**
 * NationalDirectoriesManagement — إدارة السجلات المعيارية والتراميز والأكواد الوطنية
 * إدارة كاملة (إضافة/تعديل/تعطيل/تفعيل) للأدلة الخمسة:
 * المهن (ISCO-08) | الأنشطة الاقتصادية (ISIC-4) | أحجام المنشآت | الأشكال القانونية | أنواع التملك
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, RefreshCw, Edit, Trash2, RotateCcw, Layers, Briefcase, Building2, Scale, Landmark, Save, X, Download, ChevronRight, ChevronLeft, Upload } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface DirectoryEntry {
    directory_type: string;
    code: string;
    name_ar: string;
    name_en?: string | null;
    parent_code?: string | null;
    level: number;
    sort_order: number;
    is_active?: boolean;
}

const DIRECTORY_TABS = [
    { type: 'occupation', label: 'المهن (ISCO-08)', icon: Briefcase },
    { type: 'activity', label: 'الأنشطة الاقتصادية (ISIC-4)', icon: Layers },
    { type: 'establishment', label: 'أحجام المنشآت', icon: Building2 },
    { type: 'legal_form', label: 'الأشكال القانونية', icon: Scale },
    { type: 'ownership', label: 'أنواع التملك', icon: Landmark },
];

const TYPE_LABELS: Record<string, string> = {
    occupation: 'المهن',
    activity: 'الأنشطة الاقتصادية',
    establishment: 'أحجام المنشآت',
    legal_form: 'الأشكال القانونية',
    ownership: 'أنواع التملك',
};

interface FormState {
    directory_type: string;
    code: string;
    name_ar: string;
    name_en: string;
    parent_code: string;
    level: number;
    sort_order: number;
}

const EMPTY_FORM: FormState = {
    directory_type: 'occupation',
    code: '',
    name_ar: '',
    name_en: '',
    parent_code: '',
    level: 1,
    sort_order: 0,
};

const PAGE_SIZE = 25;

export function NationalDirectoriesManagement() {
    const [activeType, setActiveType] = useState('occupation');
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [stats, setStats] = useState<Record<string, { total: number; active: number }>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingKey, setEditingKey] = useState<{ type: string; code: string } | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const { confirm, dialog: confirmDialog } = useConfirm();

    // جلب المدخلات (شاملة غير النشطة للإدارة)
    const loadEntries = useCallback(async () => {
        setLoading(true);
        try {
            // نجلب كل الأنواع دفعة واحدة ثم نرشح محلياً (الـ API يعيد النشطة فقط؛
            // للإدارة نحتاج الكل — نستخدم stats + قائمة نشطة، وغير النشطة تظهر عبر الإحصاءات)
            const r = await fetch('/api/national-directories?include_inactive=true');
            if (r.ok) {
                const d = await r.json();
                setEntries(d.data || []);
            }
            const rs = await fetch('/api/national-directories/stats');
            if (rs.ok) {
                const ds = await rs.json();
                const map: Record<string, { total: number; active: number }> = {};
                (ds.data || []).forEach((s: any) => { map[s.directory_type] = { total: s.total, active: s.active }; });
                setStats(map);
            }
        } catch {
            toast.error('خطأ في تحميل الأدلة الوطنية');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadEntries(); }, [loadEntries]);

    // إعادة ضبط الصفحة عند تغيير الدليل أو البحث
    useEffect(() => { setCurrentPage(1); }, [activeType, searchTerm]);

    const filtered = useMemo(() => {
        return entries.filter(e => {
            if (e.directory_type !== activeType) return false;
            const q = searchTerm.trim();
            if (!q) return true;
            return e.code.includes(q) || e.name_ar.includes(q) || (e.name_en || '').toLowerCase().includes(q.toLowerCase());
        });
    }, [entries, activeType, searchTerm]);

    // بناء الشجرة الهرمية (المستوى 1 ← المستوى 2) للعرض المتسلسل
    const hierarchical = useMemo(() => {
        const byParent = new Map<string, DirectoryEntry[]>();
        filtered.forEach(e => {
            const key = e.parent_code || '__root__';
            if (!byParent.has(key)) byParent.set(key, []);
            byParent.get(key)!.push(e);
        });
        return byParent;
    }, [filtered]);

    const openCreate = () => {
        setEditingKey(null);
        setForm({ ...EMPTY_FORM, directory_type: activeType });
        setShowModal(true);
    };

    const openEdit = (e: DirectoryEntry) => {
        setEditingKey({ type: e.directory_type, code: e.code });
        setForm({
            directory_type: e.directory_type,
            code: e.code,
            name_ar: e.name_ar,
            name_en: e.name_en || '',
            parent_code: e.parent_code || '',
            level: e.level || 1,
            sort_order: e.sort_order || 0,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.name_ar.trim()) {
            toast.error('الرمز والاسم العربي مطلوبان');
            return;
        }
        setSaving(true);
        try {
            let r: Response;
            if (editingKey) {
                r = await fetch(`/api/national-directories/${editingKey.type}/${encodeURIComponent(editingKey.code)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name_ar: form.name_ar,
                        name_en: form.name_en,
                        parent_code: form.parent_code,
                        level: form.level,
                        sort_order: form.sort_order,
                    }),
                });
            } else {
                r = await fetch('/api/national-directories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
            }
            const data = await r.json().catch(() => ({}));
            if (r.ok) {
                toast.success(editingKey ? 'تم تحديث المدخل بنجاح' : 'تمت إضافة المدخل بنجاح');
                logAudit({
                    action: editingKey ? 'update' : 'create',
                    resource: 'national_directory',
                    details: { type: form.directory_type, code: form.code },
                });
                setShowModal(false);
                loadEntries();
            } else {
                toast.error(data.error || 'حدث خطأ أثناء الحفظ');
            }
        } catch {
            toast.error('خطأ في الاتصال بالخادم');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (e: DirectoryEntry) => {
        const ok = await confirm({
            title: 'تأكيد تعطيل المدخل',
            message: `هل أنت متأكد من تعطيل المدخل (${e.code} — ${e.name_ar})؟ يمكن استعادةه لاحقاً بإعادة التفعيل.`,
            confirmLabel: 'نعم، تعطيل',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            const r = await fetch(`/api/national-directories/${e.directory_type}/${encodeURIComponent(e.code)}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success(`تم تعطيل المدخل ${e.code}`);
                logAudit({ action: 'delete', resource: 'national_directory', details: { type: e.directory_type, code: e.code } });
                loadEntries();
            } else {
                toast.error('فشل تعطيل المدخل');
            }
        } catch {
            toast.error('خطأ في الاتصال');
        }
    };

    const handleReactivate = async (entry: { type: string; code: string; name_ar: string }) => {
        try {
            const r = await fetch(`/api/national-directories/${entry.type}/${encodeURIComponent(entry.code)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name_ar: entry.name_ar, is_active: true }),
            });
            if (r.ok) {
                toast.success(`تم تفعيل المدخل ${entry.code}`);
                loadEntries();
            } else {
                toast.error('فشل تفعيل المدخل');
            }
        } catch {
            toast.error('خطأ في الاتصال');
        }
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const inactiveCount = (stats[activeType]?.total || 0) - (stats[activeType]?.active || 0);

    // تصدير عام لأي سجل (JSON)
    const handleRegistryExport = async () => {
        try {
            const r = await fetch(`/api/registry/export?table=national_directories`);
            if (!r.ok) { toast.error('فشل التصدير العام'); return; }
            const d = await r.json();
            const blob = new Blob([JSON.stringify(d.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `national_directories_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success(`تم تصدير ${d.count} سجل عام`);
            logAudit({ action: 'export', resource: 'registry', details: { table: 'national_directories', count: d.count } });
        } catch { toast.error('خطأ في التصدير العام'); }
    };

    // استيراد عام لأي سجل (JSON)
    const handleRegistryImport = async () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const rows = Array.isArray(parsed) ? parsed : (parsed.data || []);
                if (rows.length === 0) { toast.warning('لا توجد بيانات في الملف'); return; }
                const r = await fetch('/api/registry/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table: 'national_directories', rows }),
                });
                const d = await r.json();
                if (r.ok) {
                    toast.success(`تم استيراد ${d.imported} من ${d.total} سجل`);
                    logAudit({ action: 'import', resource: 'registry', details: { table: 'national_directories', imported: d.imported } });
                    loadEntries();
                } else { toast.error(d.error || 'فشل الاستيراد'); }
            } catch { toast.error('ملف JSON غير صالح'); }
        };
        input.click();
    };
    const handleExport = () => {
        if (filtered.length === 0) {
            toast.warning('لا توجد بيانات للتصدير');
            return;
        }
        exportReportToExcel({
            title: `دليل_${TYPE_LABELS[activeType]}`,
            reportType: 'statistics',
            data: filtered,
            columns: [
                { key: 'code', label: 'الرمز / الكود' },
                { key: 'name_ar', label: 'الاسم العربي' },
                { key: 'name_en', label: 'الاسم الإنجليزي' },
                { key: 'parent_code', label: 'الرمز الأب' },
                { key: 'level', label: 'المستوى الهرمي' },
                { key: 'sort_order', label: 'الترتيب العرضي' },
                { key: 'is_active', label: 'الحالة', format: (v: any) => (v === false ? 'معطل' : 'نشط') },
            ],
        });
        toast.success('تم تصدير الدليل إلى Excel بنجاح');
        logAudit({ action: 'export', resource: 'national_directory', details: { type: activeType, count: filtered.length } });
    };

    return (
        <div className="space-y-6" dir="rtl">
            <PageHeader
                title="السجلات المعيارية والتراميز والأكواد الوطنية"
                subtitle="إدارة أدلة التصنيف الوطنية الموحدة: المهن ISCO-08، الأنشطة ISIC-4، أحجام المنشآت، الأشكال القانونية، وأنواع التملك — مع إضافة وتعديل كامل"
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={handleExport} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm">
                            <Download size={16} /> Excel
                        </button>
                        <button onClick={handleRegistryExport} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm" title="تصدير عام JSON">
                            <Download size={16} /> تصدير JSON
                        </button>
                        <button onClick={handleRegistryImport} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm" title="استيراد عام JSON">
                            <Upload size={16} /> استيراد
                        </button>
                        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
                            <Plus size={16} /> إضافة مدخل جديد
                        </button>
                    </div>
                }
            />

            {/* بطاقات الإحصاءات */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {DIRECTORY_TABS.map(t => (
                    <button
                        key={t.type}
                        onClick={() => setActiveType(t.type)}
                        className={`bg-card border rounded-2xl p-4 text-right transition-all ${activeType === t.type ? 'border-primary ring-1 ring-primary/30 shadow-md' : 'border-border hover:border-primary/40 shadow-sm'}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">{t.label}</p>
                                <p className="text-xl font-black text-heading mt-1">{stats[t.type]?.active ?? '—'}</p>
                                <p className="text-[10px] text-muted-foreground">مدخل نشط</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <t.icon size={20} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* شريط البحث */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={`بحث في ${TYPE_LABELS[activeType]} بالرمز أو الاسم...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-heading focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <button onClick={loadEntries} className="flex items-center gap-2 px-3.5 py-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors text-xs font-bold">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث
                    </button>
                    {inactiveCount > 0 && (
                        <span className="text-xs px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                            {inactiveCount} مدخل معطل في هذا الدليل
                        </span>
                    )}
                </div>
            </div>

            {/* جدول المدخلات */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm font-semibold text-muted-foreground">جاري تحميل الأدلة الوطنية...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-14 text-center">
                        <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                        <h4 className="text-base font-bold text-heading">لا توجد مدخلات مطابقة</h4>
                        <p className="text-xs text-muted-foreground mt-1">أضف مدخلاً جديداً أو عدّل شرط البحث</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-muted/70 border-b border-border">
                                <tr>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground">الرمز / الكود</th>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground">الاسم العربي</th>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground">الاسم الإنجليزي</th>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">المستوى</th>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">الترتيب</th>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">الأبناء</th>
                                    <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">العمليات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginated.map((e) => (
                                    <tr key={`${e.directory_type}-${e.code}`} className="hover:bg-accent/40 transition-colors">
                                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-primary">{e.code}</td>
                                        <td className="px-5 py-3.5 font-bold text-heading text-sm">{e.name_ar}</td>
                                        <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono" dir="ltr">{e.name_en || '—'}</td>
                                        <td className="px-5 py-3.5 text-center text-xs font-bold text-foreground">{e.level}</td>
                                        <td className="px-5 py-3.5 text-center text-xs text-muted-foreground font-mono">{e.sort_order}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            {(hierarchical.get(e.code) || []).length > 0 ? (
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                                                    {(hierarchical.get(e.code) || []).length}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground text-[10px]">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => openEdit(e)}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="تعديل المدخل"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                {e.is_active === false ? (
                                                    <button
                                                        onClick={() => handleReactivate({ type: e.directory_type, code: e.code, name_ar: e.name_ar })}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="إعادة تفعيل المدخل"
                                                    >
                                                        <RotateCcw size={15} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeactivate(e)}
                                                        className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="تعطيل المدخل"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* شريط الترقيم */}
                        <div className="px-5 py-3 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                عرض {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} من {filtered.length} مدخل
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors">
                                    <ChevronRight size={15} />
                                </button>
                                <span className="px-2 font-bold text-foreground">{currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 transition-colors">
                                    <ChevronLeft size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {confirmDialog}

            {/* نافذة الإضافة/التعديل */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title={editingKey ? `تعديل المدخل (${TYPE_LABELS[editingKey.type]} — ${editingKey.code})` : 'إضافة مدخل جديد للأدلة الوطنية'}
                    size="md"
                    footer={
                        <>
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                                <X size={13} className="inline ml-1" /> إلغاء
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                            >
                                <Save size={13} className="inline ml-1" /> {saving ? 'جاري الحفظ...' : editingKey ? 'حفظ التعديلات' : 'إضافة المدخل'}
                            </button>
                        </>
                    }
                >
                    <div className="grid grid-cols-2 gap-4 text-right">
                        {!editingKey && (
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-foreground mb-1">الدليل المعياري *</label>
                                <select
                                    value={form.directory_type}
                                    onChange={(e) => setForm({ ...form, directory_type: e.target.value })}
                                    className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-semibold"
                                >
                                    {DIRECTORY_TABS.map(t => (
                                        <option key={t.type} value={t.type}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">
                                الرمز / الكود * {editingKey && <span className="text-muted-foreground font-normal">(ثابت)</span>}
                            </label>
                            <input
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                disabled={!!editingKey}
                                placeholder="مثال: ISCO-21 أو G"
                                dir="ltr"
                                className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono disabled:opacity-60"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">الترتيب العرضي</label>
                            <input
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-foreground mb-1">الاسم العربي *</label>
                            <input
                                value={form.name_ar}
                                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                                placeholder="المسمى العربي الرسمي للمدخل"
                                className="w-full p-2.5 border border-border rounded-xl bg-card text-sm text-heading"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-foreground mb-1">الاسم الإنجليزي</label>
                            <input
                                value={form.name_en}
                                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                                placeholder="Official English Name"
                                dir="ltr"
                                className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">الرمز الأب (اختياري)</label>
                            <input
                                value={form.parent_code}
                                onChange={(e) => setForm({ ...form, parent_code: e.target.value })}
                                placeholder="للتصنيف الهرمي"
                                dir="ltr"
                                className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">المستوى الهرمي</label>
                            <input
                                type="number"
                                min={1}
                                value={form.level}
                                onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                                className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono"
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default NationalDirectoriesManagement;
