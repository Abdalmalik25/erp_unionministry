/**
 * SystemAdministration — منظومة الإدارة المؤسسية الشاملة
 * الإعدادات العامة | الصلاحيات المؤسسية | النسخ الاحتياطي والجدولة | الاتصال الإداري
 */
import { useState, useEffect, useCallback } from 'react';
import {
    Settings, ShieldCheck, DatabaseBackup, Megaphone, Save, RefreshCw,
    Plus, Play, X, CheckCircle2, FileText,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'sonner';
import { logAudit } from '../../utils/security';
import { useAuth } from '../../contexts/AuthContext';

interface SystemSetting {
    setting_key: string;
    setting_value: string;
    value_type: string;
    category: string;
    description: string;
    updated_by?: string;
    updated_at?: string;
}

interface RolePermission {
    id: number;
    role_key: string;
    resource: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_export: boolean;
    can_approve: boolean;
}

interface BackupJob {
    id: number;
    job_type: string;
    status: string;
    scheduled_at?: string;
    started_at?: string;
    finished_at?: string;
    size_bytes?: number;
    triggered_by?: string;
    error_message?: string;
    created_at: string;
}

interface AdminCommunication {
    id: number;
    comm_number: string;
    comm_type: string;
    title: string;
    body: string;
    priority: string;
    requires_ack: boolean;
    issued_by?: string;
    is_active: boolean;
    created_at: string;
    ack_count: number;
}

const TABS = [
    { key: 'settings', label: 'الإعدادات العامة', icon: Settings },
    { key: 'permissions', label: 'الصلاحيات المؤسسية', icon: ShieldCheck },
    { key: 'backup', label: 'النسخ الاحتياطي والجدولة', icon: DatabaseBackup },
    { key: 'communications', label: 'الاتصال الإداري', icon: Megaphone },
];

const PERMISSION_FLAGS = [
    { key: 'can_view', label: 'عرض' },
    { key: 'can_create', label: 'إضافة' },
    { key: 'can_edit', label: 'تعديل' },
    { key: 'can_delete', label: 'حذف' },
    { key: 'can_export', label: 'تصدير' },
    { key: 'can_approve', label: 'اعتماد' },
] as const;

const COMM_TYPES = [
    { value: 'circular', label: 'تعميم' },
    { value: 'memo', label: 'مذكرة' },
    { value: 'directive', label: 'توجيه' },
    { value: 'announcement', label: 'إعلان' },
];

const EMPTY_COMM = {
    comm_type: 'circular',
    title: '',
    body: '',
    priority: 'normal',
    requires_ack: false,
    effective_date: '',
    expiry_date: '',
};

export function SystemAdministration() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('settings');
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
    const [communications, setCommunications] = useState<AdminCommunication[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [showCommModal, setShowCommModal] = useState(false);
    const [commForm, setCommForm] = useState({ ...EMPTY_COMM });
    const [savingComm, setSavingComm] = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [s, p, b, c] = await Promise.all([
                fetch('/api/settings').then(r => r.ok ? r.json() : { data: [] }),
                fetch('/api/role-permissions').then(r => r.ok ? r.json() : { data: [] }),
                fetch('/api/backup/jobs').then(r => r.ok ? r.json() : { data: [] }),
                fetch('/api/admin-communications').then(r => r.ok ? r.json() : { data: [] }),
            ]);
            setSettings(s.data || []);
            setPermissions(p.data || []);
            setBackupJobs(b.data || []);
            setCommunications(c.data || []);
        } catch {
            toast.error('خطأ في تحميل بيانات الإدارة');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const payload: Record<string, string> = {};
            settings.forEach(s => { payload[s.setting_key] = s.setting_value; });
            const r = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: payload, updated_by: user?.email || user?.id || 'system' }),
            });
            if (r.ok) {
                toast.success('تم حفظ الإعدادات بنجاح');
                logAudit({ action: 'update', resource: 'system_settings', details: { count: Object.keys(payload).length } });
            } else {
                toast.error('فشل حفظ الإعدادات');
            }
        } catch {
            toast.error('خطأ في الاتصال');
        } finally {
            setSavingSettings(false);
        }
    };

    const togglePermission = async (perm: RolePermission, flag: string) => {
        const newValue = !(perm as any)[flag];
        setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, [flag]: newValue } : p));
        try {
            const r = await fetch(`/api/role-permissions/${perm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [flag]: newValue }),
            });
            if (r.ok) {
                logAudit({ action: 'update', resource: 'role_permissions', details: { role: perm.role_key, resource: perm.resource, flag, value: newValue } });
            } else {
                setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, [flag]: !newValue } : p));
                toast.error('فشل تحديث الصلاحية');
            }
        } catch {
            setPermissions(prev => prev.map(p => p.id === perm.id ? { ...p, [flag]: !newValue } : p));
            toast.error('خطأ في الاتصال');
        }
    };

    const runBackup = async () => {
        try {
            const r = await fetch('/api/backup/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggered_by: 'admin' }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success(`تمت النسخة الاحتياطية: ${d.total_rows} سجل من ${d.tables} جدول`);
                logAudit({ action: 'create', resource: 'backup_job', details: { job_id: d.job_id } });
                loadAll();
            } else {
                toast.error(d.error || 'فشل النسخ الاحتياطي');
            }
        } catch {
            toast.error('خطأ في الاتصال');
        }
    };

    const saveCommunication = async () => {
        if (!commForm.title.trim() || !commForm.body.trim()) {
            toast.error('العنوان والمحتوى مطلوبان');
            return;
        }
        setSavingComm(true);
        try {
            const r = await fetch('/api/admin-communications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...commForm,
                    effective_date: commForm.effective_date || null,
                    expiry_date: commForm.expiry_date || null,
                    issued_by: 'admin',
                }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success(`تم إصدار ${d.data.comm_number}`);
                logAudit({ action: 'create', resource: 'admin_communication', details: { number: d.data.comm_number } });
                setShowCommModal(false);
                setCommForm({ ...EMPTY_COMM });
                loadAll();
            } else {
                toast.error(d.error || 'فشل الإصدار');
            }
        } catch {
            toast.error('خطأ في الاتصال');
        } finally {
            setSavingComm(false);
        }
    };

    const groupedSettings = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});

    const CATEGORY_LABELS: Record<string, string> = {
        identity: 'هوية الجهة',
        general: 'عام',
        security: 'الأمان',
        backup: 'النسخ الاحتياطي',
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { cls: string; label: string }> = {
            completed: { cls: 'bg-emerald-100 text-emerald-800', label: 'مكتملة' },
            running: { cls: 'bg-blue-100 text-blue-800', label: 'جارية' },
            pending: { cls: 'bg-amber-100 text-amber-800', label: 'مجدولة' },
            failed: { cls: 'bg-rose-100 text-rose-800', label: 'فاشلة' },
        };
        const m = map[status] || { cls: 'bg-muted text-muted-foreground', label: status };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
    };

    return (
        <div className="space-y-6" dir="rtl">
            <PageHeader
                title="الإدارة المؤسسية الشاملة"
                subtitle="الإعدادات العامة، الصلاحيات المؤسسية الحقيقية، النسخ الاحتياطي والجدولة، والاتصال الإداري الرسمي"
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={loadAll} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> تحديث
                        </button>
                        {activeTab === 'settings' && (
                            <button onClick={handleSaveSettings} disabled={savingSettings} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20 disabled:opacity-50">
                                <Save size={16} /> {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                            </button>
                        )}
                        {activeTab === 'backup' && (
                            <button onClick={runBackup} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
                                <Play size={16} /> نسخة احتياطية فورية
                            </button>
                        )}
                        {activeTab === 'communications' && (
                            <button onClick={() => setShowCommModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20">
                                <Plus size={16} /> إصدار تعميم
                            </button>
                        )}
                    </div>
                }
            />

            {/* التبويبات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`bg-card border rounded-2xl p-4 text-right transition-all ${activeTab === t.key ? 'border-primary ring-1 ring-primary/30 shadow-md' : 'border-border hover:border-primary/40 shadow-sm'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-heading">{t.label}</span>
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <t.icon size={18} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="bg-card border border-border rounded-2xl py-16 text-center shadow-sm">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-semibold text-muted-foreground">جاري التحميل...</p>
                </div>
            ) : (
                <>
                    {/* الإعدادات العامة */}
                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            {Object.entries(groupedSettings).map(([cat, items]) => (
                                <div key={cat} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 bg-muted/70 border-b border-border">
                                        <h3 className="text-sm font-black text-heading">{CATEGORY_LABELS[cat] || cat}</h3>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {items.map(s => (
                                            <div key={s.setting_key} className="px-5 py-3.5 flex items-center gap-4 flex-wrap">
                                                <div className="flex-1 min-w-[200px]">
                                                    <p className="text-sm font-bold text-heading">{s.description || s.setting_key}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{s.setting_key}</p>
                                                </div>
                                                {s.value_type === 'boolean' ? (
                                                    <button
                                                        onClick={() => setSettings(prev => prev.map(x => x.setting_key === s.setting_key ? { ...x, setting_value: x.setting_value === 'true' ? 'false' : 'true' } : x))}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${s.setting_value === 'true' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                                                    >
                                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${s.setting_value === 'true' ? 'right-0.5' : 'right-6'}`}></span>
                                                    </button>
                                                ) : (
                                                    <input
                                                        value={s.setting_value}
                                                        onChange={(e) => setSettings(prev => prev.map(x => x.setting_key === s.setting_key ? { ...x, setting_value: e.target.value } : x))}
                                                        type={s.value_type === 'number' ? 'number' : 'text'}
                                                        dir={s.value_type === 'number' ? 'ltr' : undefined}
                                                        className="w-56 px-3 py-2 border border-border rounded-xl bg-muted/50 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* الصلاحيات المؤسسية */}
                    {activeTab === 'permissions' && (
                        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-muted/70 border-b border-border">
                                        <tr>
                                            <th className="px-5 py-3.5 font-bold text-xs text-foreground">الدور</th>
                                            <th className="px-5 py-3.5 font-bold text-xs text-foreground">المورد</th>
                                            {PERMISSION_FLAGS.map(f => (
                                                <th key={f.key} className="px-3 py-3.5 font-bold text-xs text-foreground text-center">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {permissions.map(p => (
                                            <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                                                <td className="px-5 py-3 font-mono text-xs font-bold text-primary" dir="ltr">{p.role_key}</td>
                                                <td className="px-5 py-3 font-bold text-heading text-xs">{p.resource}</td>
                                                {PERMISSION_FLAGS.map(f => (
                                                    <td key={f.key} className="px-3 py-3 text-center">
                                                        <button
                                                            onClick={() => togglePermission(p, f.key)}
                                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${(p as any)[f.key] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary'}`}
                                                        >
                                                            {(p as any)[f.key] && <CheckCircle2 size={12} />}
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* النسخ الاحتياطي */}
                    {activeTab === 'backup' && (
                        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                            {backupJobs.length === 0 ? (
                                <div className="py-14 text-center">
                                    <DatabaseBackup className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                                    <h4 className="text-base font-bold text-heading">لا توجد مهام نسخ احتياطي</h4>
                                    <p className="text-xs text-muted-foreground mt-1">اضغط "نسخة احتياطية فورية" لبدء أول نسخة</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-muted/70 border-b border-border">
                                            <tr>
                                                <th className="px-5 py-3.5 font-bold text-xs text-foreground">#</th>
                                                <th className="px-5 py-3.5 font-bold text-xs text-foreground">النوع</th>
                                                <th className="px-5 py-3.5 font-bold text-xs text-foreground">الحالة</th>
                                                <th className="px-5 py-3.5 font-bold text-xs text-foreground">الحجم</th>
                                                <th className="px-5 py-3.5 font-bold text-xs text-foreground">بواسطة</th>
                                                <th className="px-5 py-3.5 font-bold text-xs text-foreground">التاريخ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {backupJobs.map(j => (
                                                <tr key={j.id} className="hover:bg-accent/40 transition-colors">
                                                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{j.id}</td>
                                                    <td className="px-5 py-3 text-xs font-bold text-heading">{j.job_type === 'full' ? 'كاملة' : j.job_type === 'incremental' ? 'تزايدية' : 'مخطط فقط'}</td>
                                                    <td className="px-5 py-3">{statusBadge(j.status)}</td>
                                                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground" dir="ltr">{j.size_bytes ? `${(j.size_bytes / 1024).toFixed(1)} KB` : '—'}</td>
                                                    <td className="px-5 py-3 text-xs text-muted-foreground">{j.triggered_by || '—'}</td>
                                                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono" dir="ltr">{new Date(j.created_at).toLocaleString('ar-YE')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* الاتصال الإداري */}
                    {activeTab === 'communications' && (
                        <div className="space-y-3">
                            {communications.length === 0 ? (
                                <div className="bg-card border border-border rounded-2xl py-14 text-center shadow-sm">
                                    <Megaphone className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                                    <h4 className="text-base font-bold text-heading">لا توجد تعاميم</h4>
                                    <p className="text-xs text-muted-foreground mt-1">أصدر أول تعميم إداري رسمي</p>
                                </div>
                            ) : communications.map(c => (
                                <div key={c.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div className="flex-1 min-w-[240px]">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold font-mono" dir="ltr">{c.comm_number}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : c.priority === 'confidential' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>
                                                    {c.priority === 'urgent' ? 'عاجل' : c.priority === 'confidential' ? 'سري' : 'عادي'}
                                                </span>
                                                {c.requires_ack && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                                                        يتطلب إقرار ({c.ack_count})
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-sm font-black text-heading">{c.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                                            <p className="text-[10px] text-muted-foreground mt-2 font-mono" dir="ltr">
                                                {new Date(c.created_at).toLocaleDateString('ar-YE')} — {c.issued_by || 'الإدارة'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* نافذة إصدار تعميم */}
            {showCommModal && (
                <Modal
                    isOpen={showCommModal}
                    onClose={() => setShowCommModal(false)}
                    title="إصدار تعميم / مذكرة إدارية"
                    size="md"
                    footer={
                        <>
                            <button onClick={() => setShowCommModal(false)} className="px-4 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors">
                                <X size={13} className="inline ml-1" /> إلغاء
                            </button>
                            <button onClick={saveCommunication} disabled={savingComm} className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all shadow-md shadow-primary/20 disabled:opacity-50">
                                <FileText size={13} className="inline ml-1" /> {savingComm ? 'جاري الإصدار...' : 'إصدار رسمي'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-4 text-right">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">النوع *</label>
                                <select value={commForm.comm_type} onChange={(e) => setCommForm({ ...commForm, comm_type: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-semibold">
                                    {COMM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">الأولوية</label>
                                <select value={commForm.priority} onChange={(e) => setCommForm({ ...commForm, priority: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm font-semibold">
                                    <option value="normal">عادي</option>
                                    <option value="urgent">عاجل</option>
                                    <option value="confidential">سري</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">العنوان *</label>
                            <input value={commForm.title} onChange={(e) => setCommForm({ ...commForm, title: e.target.value })} placeholder="عنوان التعاميم الرسمي" className="w-full p-2.5 border border-border rounded-xl bg-card text-sm text-heading" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-foreground mb-1">المحتوى *</label>
                            <textarea value={commForm.body} onChange={(e) => setCommForm({ ...commForm, body: e.target.value })} rows={5} placeholder="نص التعاميم الكامل..." className="w-full p-2.5 border border-border rounded-xl bg-card text-sm text-heading resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">تاريخ السريان</label>
                                <input type="date" value={commForm.effective_date} onChange={(e) => setCommForm({ ...commForm, effective_date: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">تاريخ الانتهاء</label>
                                <input type="date" value={commForm.expiry_date} onChange={(e) => setCommForm({ ...commForm, expiry_date: e.target.value })} className="w-full p-2.5 border border-border rounded-xl bg-card text-sm" />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={commForm.requires_ack} onChange={(e) => setCommForm({ ...commForm, requires_ack: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                            <span className="text-xs font-bold text-foreground">يتطلب إقرار استلام من المستهدفين</span>
                        </label>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default SystemAdministration;