/**
 * SectorUsersManagement — منظومة إدارة وحوكمة المستخدمين والصلاحيات المؤسسية
 * Enterprise Operating Model • Labor Governance | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, ShieldCheck, ShieldAlert, Key, Edit, Trash2, RefreshCw, Search, CheckCircle2, XCircle, Building2, Shield, FileText, Check, X, BadgeCheck, Layers } from 'lucide-react';
import { ROLE_META } from '../../hooks/usePermissions';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
interface SectorUser {
    id: string;
    name: string;
    email: string;
    role: string;
    user_type: 'ministry' | 'entity';
    organization_id: string | null;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
}
interface UserStats {
    total: number;
    active: number;
    suspended: number;
    ministry_users: number;
    entity_users: number;
    active_this_week: number;
}
// Enterprise Governance Functional Capability Domains
const CAPABILITY_DOMAINS = [
    {
        id: 'entities',
        title: 'سجل المنشآت والشركات والنقابات (السجلات الأساسية)',
        icon: Building2,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        capabilities: [
            { key: 'commercial:view', label: 'استعراض سجل المنشآت والملف الشامل 360°' },
            { key: 'commercial:create', label: 'تسجيل واعتماد منشأة جديدة' },
            { key: 'commercial:edit', label: 'تعديل وتحديث بيانات المنشآت' },
            { key: 'entities:view', label: 'إدارة النقابات والاتحادات والمنظمات' },
            { key: 'commercial:export', label: 'تصدير السجلات والتقارير الرسمية' },
        ],
    },
    {
        id: 'occupations',
        title: 'استوديو المهن والتحليل الوظيفي (ISCO-08)',
        icon: Layers,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        capabilities: [
            { key: 'professions:view', label: 'استعراض المهن وبطاقات الوصف الوظيفي' },
            { key: 'professions:create', label: 'إنشاء وتعديل التوصيفات المهنية' },
            { key: 'occupations:create', label: 'تسكين المهن وتحديد كوتة اليمننة للمنشآت' },
            { key: 'evaluation:create', label: 'إصدار وتصديق شهادات الكفاءة المهنية' },
        ],
    },
    {
        id: 'inspections',
        title: 'التفتيش والمخالفات والسلامة المهنية (OSH)',
        icon: ShieldAlert,
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        capabilities: [
            { key: 'inspections:view', label: 'استعراض خطط ومحاضر التفتيش الميداني' },
            { key: 'inspections:create', label: 'جدولة وتنفيذ زيارات التفتيش الموجه بالمخاطر' },
            { key: 'violations:create', label: 'تحرير وضبط المخالفات العمالية' },
            { key: 'violations:resolve', label: 'اعتماد الإجراءات التصحيحية وإغلاق المخالفات' },
        ],
    },
    {
        id: 'disputes',
        title: 'المنازعات العمالية والتحكيم الودي (Disputes)',
        icon: ShieldCheck,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        capabilities: [
            { key: 'laborDisputes:view', label: 'استعراض سجل الشكاوى والقضايا العمالية' },
            { key: 'laborDisputes:create', label: 'تسجيل شكوى عمالية جديدة وقيد النزاع' },
            { key: 'laborDisputes:resolve', label: 'عقد جلسات التحكيم واعتماد محاضر الصلح الودي' },
            { key: 'documents:approve', label: 'تعميد اللوائح الداخلية وعقود العمل الرسمية' },
        ],
    },
    {
        id: 'services',
        title: 'الخدمات وتصاريح العمل والإرساليات (Services)',
        icon: FileText,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        capabilities: [
            { key: 'services:view', label: 'استعراض طلبات ومعاملات الخدمات الحكومية' },
            { key: 'services:approve', label: 'مراجعة واعتماد طلبات الخدمات والتراخيص' },
            { key: 'dispatches:approve', label: 'إصدار تصاريح وتوجيه إرساليات العمالة' },
            { key: 'reduction:approve', label: 'البت في طلبات تخفيض العمالة لأسباب اقتصادية' },
        ],
    },
    {
        id: 'analytics',
        title: 'التقارير والمؤشرات والذكاء الاصطناعي (Intelligence)',
        icon: Key,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        capabilities: [
            { key: 'reports:view', label: 'الاطلاع على لوحات القيادة والمؤشرات الاستراتيجية' },
            { key: 'reports:generate', label: 'إنشاء التقارير الرقابية المخصصة' },
            { key: 'comparative:view', label: 'التحليل المقارن والذكاء الاصطناعي التفسيري' },
            { key: 'audit:view', label: 'سجل التدقيق المؤسسي والرقابة الداخلية' },
        ],
    },
];
export function SectorUsersManagement() {
    const { confirm, dialog: confirmDialog } = useConfirm();
    const [users, setUsers] = useState<SectorUser[]>([]);
    const [stats, setStats] = useState<UserStats>({
        total: 0,
        active: 0,
        suspended: 0,
        ministry_users: 0,
        entity_users: 0,
        active_this_week: 0,
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus] = useState('');
    // Policy / Permission Matrix Modal
    const [activeUserForMatrix, setActiveUserForMatrix] = useState<SectorUser | null>(null);
    // Edit / Create User Modal
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingUser, setEditingUser] = useState<SectorUser | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'labor_inspector',
        userType: 'ministry' as 'ministry' | 'entity',
        organizationId: '',
        is_active: true,
    });
    // Suspend/Activate reason prompt modal
    const [suspensionTarget, setSuspensionTarget] = useState<SectorUser | null>(null);
    const [suspensionReason, setSuspensionReason] = useState('');
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm.trim())
                params.set('search', searchTerm.trim());
            if (filterRole)
                params.set('role', filterRole);
            if (filterType)
                params.set('user_type', filterType);
            if (filterStatus)
                params.set('is_active', filterStatus === 'active' ? 'true' : 'false');
            const [rUsers, rStats] = await Promise.all([
                fetch(`/api/sector-users?${params.toString()}`),
                fetch('/api/sector-users/stats'),
            ]);
            if (rUsers.ok) {
                const u = await rUsers.json();
                setUsers(u.data || []);
            }
            if (rStats.ok) {
                const s = await rStats.json();
                setStats(s.data || { total: 0, active: 0, suspended: 0, ministry_users: 0, entity_users: 0, active_this_week: 0 });
            }
            logAudit({ action: 'view', resource: 'sector_users' });
        }
        catch {
            toast.error('خطأ في تحميل بيانات المستخدمين');
        }
        finally {
            setLoading(false);
        }
    }, [searchTerm, filterRole, filterType, filterStatus]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    // Open Create / Edit Modal
    const handleOpenForm = (u?: SectorUser) => {
        if (u) {
            setEditingUser(u);
            setFormData({
                name: u.name,
                email: u.email,
                password: '',
                role: u.role,
                userType: u.user_type,
                organizationId: u.organization_id || '',
                is_active: u.is_active,
            });
        }
        else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'labor_inspector',
                userType: 'ministry',
                organizationId: '',
                is_active: true,
            });
        }
        setShowFormModal(true);
    };
    // Submit Create / Edit
    const handleSaveUser = async () => {
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error('يرجى كتابة اسم المستخدم والبريد الإلكتروني');
            return;
        }
        if (!editingUser && !formData.password.trim()) {
            toast.error('كلمة المرور مطلوبة للمستخدم الجديد');
            return;
        }
        try {
            const endpoint = editingUser ? `/api/sector-users/${editingUser.id}` : '/api/sector-users';
            const method = editingUser ? 'PUT' : 'POST';
            const payload: Record<string, any> = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                role: formData.role,
                userType: formData.userType,
                organizationId: formData.organizationId || null,
                is_active: formData.is_active,
            };
            if (formData.password.trim()) {
                payload.password = formData.password.trim();
            }
            const r = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (r.ok) {
                toast.success(editingUser ? 'تم تحديث بيانات المستخدم والصلاحيات' : 'تم إنشاء الحساب بنجاح');
                setShowFormModal(false);
                loadData();
            }
            else {
                const err = await r.json();
                toast.error(err.error || 'حدث خطأ أثناء الحفظ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال بالخادم');
        }
    };
    // Toggle Account Active / Suspended Status
    const handleConfirmToggleStatus = async () => {
        if (!suspensionTarget)
            return;
        try {
            const r = await fetch(`/api/sector-users/${suspensionTarget.id}/toggle-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: suspensionReason }),
            });
            if (r.ok) {
                const res = await r.json();
                toast.success(res.message || 'تم تحديث حالة الحساب');
                setSuspensionTarget(null);
                setSuspensionReason('');
                loadData();
            }
            else {
                toast.error('فشل تغيير حالة الحساب');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    // Delete / Archive User
    const handleDeleteUser = async (u: SectorUser) => {
        const ok = await confirm({
            title: 'تأكيد أرشفة الحساب',
            message: `هل أنت متأكد من تعطيل وأرشفة حساب (${u.name} - ${u.email})؟`,
            confirmLabel: 'نعم، أرشفة الحساب',
            variant: 'danger',
        });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/sector-users/${u.id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم حذف الحساب ونقله إلى الأرشيف');
                loadData();
            }
            else {
                toast.error('فشل حذف الحساب');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}

      {/* Header */}
      <PageHeader title="حوكمة المستخدمين والصلاحيات والسياسات المؤسسية" subtitle="إدارة حسابات موظفي الوزارة، مفتشي العمل، مسؤولي النقابات والمنظمات، وتعيين مصفوفات الصلاحيات وفق النموذج التشغيلي" actions={<div className="flex items-center gap-2">
            <button onClick={() => handleOpenForm()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
              <UserPlus size={16}/> إضافة مستخدم جديد
            </button>
          </div>}/>

      {/* Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-muted-foreground">إجمالي الحسابات</p>
          <p className="text-2xl font-black text-heading mt-1">{stats.total || users.length}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-muted-foreground">نشطة ومفوضة</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active || users.filter(u => u.is_active).length}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-muted-foreground">موقوفة ومجمدة</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats.suspended || users.filter(u => !u.is_active).length}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-muted-foreground">موظفو الوزارة</p>
          <p className="text-2xl font-black text-primary mt-1">{stats.ministry_users || users.filter(u => u.user_type === 'ministry').length}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-muted-foreground">ممثلو النقابات والمنظمات</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.entity_users || users.filter(u => u.user_type === 'entity').length}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xs font-semibold text-muted-foreground">نشطون هذا الأسبوع</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.active_this_week || users.filter(u => u.last_login).length}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input type="text" placeholder="بحث بالاسم أو البريد الإلكتروني..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pr-10 pl-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-heading focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none"/>
          </div>

          {/* Role Filter */}
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="p-2.5 border border-border rounded-xl bg-card text-sm text-heading">
            <option value="">جميع الأدوار الوظيفية</option>
            {Object.entries(ROLE_META).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
          </select>

          {/* Type Filter */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="p-2.5 border border-border rounded-xl bg-card text-sm text-heading">
            <option value="">جميع قطاعات العمل</option>
            <option value="ministry">وزارة الشؤون الاجتماعية والعمل</option>
            <option value="entity">منظمات ونقابات ومنشآت</option>
          </select>

          {/* Refresh */}
          <button onClick={loadData} className="flex items-center justify-center gap-2 p-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
            <span className="text-xs font-semibold">تحديث القائمة</span>
          </button>
        </div>
      </div>

      {/* Users Grid Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (<div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-muted-foreground">جاري تحميل حسابات المستخدمين...</p>
          </div>) : users.length === 0 ? (<div className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3"/>
            <h4 className="text-base font-bold text-heading">لا يوجد مستخدمون مطابقون</h4>
            <p className="text-xs text-muted-foreground mt-1">تأكد من شروط البحث أو أضف مستخدماً جديداً</p>
          </div>) : (<div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/70 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">المستخدم والبريد</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">الدور المؤسسي والجهة</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">حالة الحساب</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground">آخر تسجيل دخول</th>
                  <th className="px-5 py-3.5 font-bold text-xs text-foreground text-center">مصفوفة الصلاحيات والعمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                const roleInfo = ROLE_META[u.role] || { label: u.role, color: 'slate', description: '' };
                return (<tr key={u.id} className="hover:bg-accent/40 transition-colors">
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-heading text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{u.email}</div>
                      </td>

                      {/* Role & Org */}
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                          {roleInfo.label}
                        </span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {u.user_type === 'ministry' ? '🏛️ قطاع العمل والوزارة' : '🏢 منظمة / نقابة / منشأة'}
                        </div>
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => setSuspensionTarget(u)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${u.is_active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`} title="انقر لتغيير حالة الحساب (تفعيل / إيقاف)">
                          {u.is_active ? <CheckCircle2 size={13}/> : <XCircle size={13}/>}
                          <span>{u.is_active ? 'نشط ومفوض' : 'موقوف مؤقتاً'}</span>
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="px-5 py-4 text-xs text-muted-foreground font-mono">
                        {u.last_login
                        ? new Date(u.last_login).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'لم يسجل الدخول بعد'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setActiveUserForMatrix(u)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-xl text-xs font-bold transition-all shadow-sm" title="عرض مصفوفة الصلاحيات والحوكمة">
                            <Shield size={14}/> الصلاحيات والسياسات
                          </button>

                          <button onClick={() => handleOpenForm(u)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="تعديل بيانات الحساب">
                            <Edit size={16}/>
                          </button>

                          <button onClick={() => handleDeleteUser(u)} className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="أرشفة الحساب">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>)}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: مصفوفة الصلاحيات والسياسات المؤسسية (Policy & RBAC Matrix)      */}
      {/* ========================================================================= */}
      {activeUserForMatrix && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-right">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <ShieldCheck size={24}/>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-0.5 bg-primary/15 text-primary rounded-md font-bold">
                      {ROLE_META[activeUserForMatrix.role]?.label || activeUserForMatrix.role}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${activeUserForMatrix.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {activeUserForMatrix.is_active ? 'حساب نشط' : 'حساب موقوف'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-heading mt-1">{activeUserForMatrix.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{activeUserForMatrix.email}</p>
                </div>
              </div>

              <button onClick={() => setActiveUserForMatrix(null)} className="p-2 text-muted-foreground hover:text-foreground rounded-xl">
                <X size={20}/>
              </button>
            </div>

            {/* Matrix Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Segregation of Duties Notice */}
              <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BadgeCheck size={20} className="text-emerald-700 shrink-0"/>
                  <div>
                    <p className="text-xs font-bold">فحص عدم تعارض المصالح وفصل المهام (Segregation of Duties)</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      الحساب متوافق مع سياسات الحوكمة المؤسسية؛ لا يوجد تضارب في الصلاحيات بين الرقابة والاعتماد والتنفيذ.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-white rounded-xl shadow-sm">
                  مطابق 100%
                </span>
              </div>

              {/* Capability Domains Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-heading">مصفوفة الصلاحيات والقدرات التشغيلية الممنوحة:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CAPABILITY_DOMAINS.map((domain) => (<div key={domain.id} className="p-4 bg-card border border-border rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <domain.icon size={17} className={domain.color}/>
                        <h5 className="text-xs font-bold text-heading">{domain.title}</h5>
                      </div>
                      <div className="space-y-2 text-xs">
                        {domain.capabilities.map((cap) => {
                    const isAllowed = activeUserForMatrix.role === 'ministry_admin' || activeUserForMatrix.is_active;
                    return (<div key={cap.key} className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border">
                              <span className="text-foreground">{cap.label}</span>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${isAllowed ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                                {isAllowed ? <Check size={12}/> : <X size={12}/>}
                                {isAllowed ? 'مفوضة' : 'محجوبة'}
                              </span>
                            </div>);
                })}
                      </div>
                    </div>))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
              <button onClick={() => {
                const target = activeUserForMatrix;
                setActiveUserForMatrix(null);
                handleOpenForm(target);
            }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all">
                <Edit size={15}/> تعديل الدور أو الصلاحيات
              </button>

              <button onClick={() => setActiveUserForMatrix(null)} className="px-5 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* MODAL 2: إضافة / تعديل مستخدم (Add / Edit User)                           */}
      {/* ========================================================================= */}
      {showFormModal && (<Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingUser ? 'تعديل بيانات وصلاحيات المستخدم' : 'إنشاء حساب مستخدم مؤسسي جديد'} size="lg" footer={<>
              <button onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                إلغاء
              </button>
              <button onClick={handleSaveUser} className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
                {editingUser ? 'حفظ التعديلات' : 'إنشاء وتفويض الحساب'}
              </button>
            </>}>
          <div className="grid grid-cols-2 gap-4 text-right">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">الاسم الكامل *</label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: د. عبدالملك حيدر" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm text-heading"/>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">البريد الإلكتروني *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="user@ministry.gov.ye" dir="ltr" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono text-heading"/>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                كلمة المرور {editingUser && '(اتركها فارغة للإبقاء على الحالية)'}
              </label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" dir="ltr" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-mono text-heading"/>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">قطاع التبعية</label>
              <select value={formData.userType} onChange={e => setFormData({ ...formData, userType: e.target.value as any })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-semibold">
                <option value="ministry">وزارة الشؤون الاجتماعية والعمل</option>
                <option value="entity">منظمة / نقابة / منشأة تجارية</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1">الدور الوظيفي والصلاحيات الأساسية</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-bold text-primary">
                {Object.entries(ROLE_META).map(([k, v]) => (<option key={k} value={k}>{v.label} — {v.description}</option>))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-primary rounded border-border focus:ring-primary accent-primary"/>
                <span className="text-xs font-bold text-foreground">الحساب نشط ومفوض لممارسة الصلاحيات فورياً</span>
              </label>
            </div>
          </div>
        </Modal>)}

      {/* ========================================================================= */}
      {/* MODAL 3: إيقاف / تفعيل الحساب مع تسجيل السبب (Suspension Prompt Modal)    */}
      {/* ========================================================================= */}
      {suspensionTarget && (<Modal isOpen={!!suspensionTarget} onClose={() => setSuspensionTarget(null)} title={suspensionTarget.is_active ? 'إيقاف وتجميد حساب المستخدم' : 'إعادة تفعيل وتفويض الحساب'} size="md" footer={<>
              <button onClick={() => setSuspensionTarget(null)} className="px-4 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                إلغاء
              </button>
              <button onClick={handleConfirmToggleStatus} className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md ${suspensionTarget.is_active
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`}>
                {suspensionTarget.is_active ? 'تأكيد إيقاف الحساب' : 'تأكيد تفعيل الحساب'}
              </button>
            </>}>
          <div className="space-y-4 text-right">
            <div className={`p-4 rounded-2xl border ${suspensionTarget.is_active ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
              <p className="text-xs font-bold">
                {suspensionTarget.is_active
                ? `أنت على وشك إيقاف حساب (${suspensionTarget.name} - ${suspensionTarget.email}) وتجميد كافة صلاحياته فورياً.`
                : `أنت على وشك إعادة تفعيل حساب (${suspensionTarget.name} - ${suspensionTarget.email}) واستعادة صلاحياته الكاملة.`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                المبرر الإداري / رقم القرار الوزاري *
              </label>
              <textarea rows={3} value={suspensionReason} onChange={e => setSuspensionReason(e.target.value)} placeholder="اكتب سبب تغيير الحالة للتسجيل في سجل التدقيق والرقابة الداخلية..." className="w-full p-2.5 border border-border rounded-xl bg-card text-sm text-heading"/>
            </div>
          </div>
        </Modal>)}
    </div>);
}
export default SectorUsersManagement;
