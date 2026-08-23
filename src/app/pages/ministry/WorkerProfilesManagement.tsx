/**
 * WorkerProfilesManagement — إدارة ملفات العمال
 * منصة UnionSphere | وزارة الشؤون الاجتماعية والعمل
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Eye, Edit2, Trash2, Plus, RefreshCw, X, Download, } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { logAudit } from '../../utils/security';
import { toast } from 'sonner';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
interface WorkerProfile {
    id: string;
    member_id: string;
    current_enterprise_id?: string;
    current_occupation_id?: string;
    employment_status: string;
    employment_start_date?: string;
    employment_end_date?: string;
    contract_type?: string;
    social_insurance_number?: string;
    current_salary_grade?: string;
    skills: string[];
    certifications: any[];
    last_medical_check_date?: string;
    next_medical_check_date?: string;
    total_experience_years: number;
    compliance_score: number;
    notes?: string;
    created_at: string;
}
const STATUS_CONFIG: Record<string, {
    label: string;
    color: string;
}> = {
    active: { label: 'نشط', color: 'bg-green-100 text-green-700' },
    on_leave: { label: 'إجازة', color: 'bg-yellow-100 text-yellow-700' },
    terminated: { label: 'منتهي', color: 'bg-red-100 text-red-700' },
    transferred: { label: 'منقول', color: 'bg-blue-100 text-blue-700' },
    retired: { label: 'متقاعد', color: 'bg-gray-100 text-gray-700' },
    deceased: { label: 'متوفى', color: 'bg-gray-100 text-gray-700' },
};
export default function WorkerProfilesManagement() {
    const [profiles, setProfiles] = useState<WorkerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedProfile, setSelectedProfile] = useState<WorkerProfile | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<WorkerProfile | null>(null);
    const [form, setForm] = useState({ member_id: '', employment_status: 'active', contract_type: '', employment_start_date: '', total_experience_years: 0, compliance_score: 100, notes: '' });
    const { confirm, dialog: confirmDialog } = useConfirm();
    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter)
                params.set('status', statusFilter);
            const r = await fetch(`/api/worker-profiles?${params}`);
            if (r.ok) {
                const d = await r.json();
                setProfiles(d.profiles || d.data || []);
            }
        }
        catch { /* empty */ }
        setLoading(false);
    }, [statusFilter]);
    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
    const filtered = useMemo(() => {
        if (!searchQuery)
            return profiles;
        const q = searchQuery.toLowerCase();
        return profiles.filter(p => p.member_id?.toLowerCase().includes(q) ||
            p.social_insurance_number?.toLowerCase().includes(q) ||
            p.current_salary_grade?.toLowerCase().includes(q));
    }, [profiles, searchQuery]);
    const stats = useMemo(() => ({
        total: profiles.length,
        active: profiles.filter(p => p.employment_status === 'active').length,
        avgCompliance: profiles.length ? Math.round(profiles.reduce((s, p) => s + (Number(p.compliance_score) || 0), 0) / profiles.length) : 0,
        avgExperience: profiles.length ? Math.round(profiles.reduce((s, p) => s + (p.total_experience_years || 0), 0) / profiles.length) : 0,
    }), [profiles]);
    const handleSave = async () => {
        try {
            const method = editItem ? 'PUT' : 'POST';
            const url = editItem ? `/api/worker-profiles/${editItem.id}` : '/api/worker-profiles';
            const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (r.ok) {
                toast.success(editItem ? 'تم تحديث الملف' : 'تم إنشاء الملف');
                logAudit({ action: editItem ? 'update' : 'create', resource: 'worker_profile', details: form });
                setShowForm(false);
                setEditItem(null);
                fetchProfiles();
            }
            else {
                toast.error('حدث خطأ');
            }
        }
        catch {
            toast.error('خطأ في الاتصال');
        }
    };
    const handleDelete = async (id: string) => {
        const ok = await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من حذف ملف العامل؟', confirmLabel: 'نعم', variant: 'danger' });
        if (!ok)
            return;
        try {
            const r = await fetch(`/api/worker-profiles/${id}`, { method: 'DELETE' });
            if (r.ok) {
                toast.success('تم الحذف');
                logAudit({ action: 'delete', resource: 'worker_profile', details: { id } });
                fetchProfiles();
            }
        }
        catch {
            toast.error('خطأ');
        }
    };
    return (<div className="space-y-6" dir="rtl">
      {confirmDialog}
      <PageHeader title="ملفات العمال" subtitle="إدارة ملفات العمال وبيانات التوظيف" actions={<button onClick={() => { exportReportToExcel({ title: 'ملفات العمال', reportType: 'statistics', data: profiles, columns: [{ key: 'worker_name', label: 'الاسم' }, { key: 'national_id', label: 'الرقم القومي' }, { key: 'occupation', label: 'المهنة' }, { key: 'employer_name', label: 'صاحب العمل' }, { key: 'status', label: 'الحالة' }] }); logAudit({ action: 'export', resource: 'worker_profiles', details: { count: profiles.length } }); toast.success('تم التصدير'); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"><Download size={16}/>تصدير</button>}/>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500">إجمالي الملفات</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-500">عامل نشط</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.avgCompliance}%</div>
          <div className="text-xs text-gray-500">متوسط الامتثال</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.avgExperience} سنة</div>
          <div className="text-xs text-gray-500">متوسط الخبرة</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="بحث في الملفات..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"/>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={fetchProfiles} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button>
        <button onClick={() => { setEditItem(null); setForm({ member_id: '', employment_status: 'active', contract_type: '', employment_start_date: '', total_experience_years: 0, compliance_score: 100, notes: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4"/> ملف جديد
        </button>
      </div>

      {loading ? (<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>) : filtered.length === 0 ? (<EmptyState title="لا توجد ملفات" description="لم يتم العثور على ملفات عمال"/>) : (<div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الرقم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">مدة الخبرة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">نوع العقد</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">درجة الامتثال</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => {
                const sc = STATUS_CONFIG[p.employment_status] || STATUS_CONFIG.active;
                const score = Number(p.compliance_score) || 0;
                return (<tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.member_id?.slice(0, 8)}</td>
                    <td className="px-4 py-3">{p.total_experience_years || 0} سنة</td>
                    <td className="px-4 py-3 text-xs">{p.contract_type || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, score)}%` }}/>
                        </div>
                        <span className="text-xs font-medium">{score}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedProfile(p)} className="p-1.5 hover:bg-gray-100 rounded" title="عرض"><Eye className="w-4 h-4"/></button>
                        <button onClick={() => { setEditItem(p); setForm({ member_id: p.member_id, employment_status: p.employment_status, contract_type: p.contract_type || '', employment_start_date: p.employment_start_date || '', total_experience_years: p.total_experience_years || 0, compliance_score: p.compliance_score || 100, notes: p.notes || '' }); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded" title="تعديل"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="حذف"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>);
            })}
            </tbody>
          </table>
        </div>)}

      {/* Detail Modal */}
      {selectedProfile && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">ملف العامل</h3>
              <button onClick={() => setSelectedProfile(null)}><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">رقم العضوية:</span><span className="font-mono">{selectedProfile.member_id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الحالة:</span><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_CONFIG[selectedProfile.employment_status]?.color}`}>{STATUS_CONFIG[selectedProfile.employment_status]?.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">نوع العقد:</span><span>{selectedProfile.contract_type || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">مدة الخبرة:</span><span>{selectedProfile.total_experience_years || 0} سنة</span></div>
              <div className="flex justify-between"><span className="text-gray-500">درجة الامتثال:</span><span className="font-bold">{Number(selectedProfile.compliance_score) || 0}%</span></div>
              {selectedProfile.employment_start_date && <div className="flex justify-between"><span className="text-gray-500">تاريخ التعيين:</span><span>{selectedProfile.employment_start_date}</span></div>}
              {selectedProfile.social_insurance_number && <div className="flex justify-between"><span className="text-gray-500">رقم التأمين:</span><span>{selectedProfile.social_insurance_number}</span></div>}
              {selectedProfile.last_medical_check_date && <div className="flex justify-between"><span className="text-gray-500">آخر فحص طبي:</span><span>{selectedProfile.last_medical_check_date}</span></div>}
              {selectedProfile.skills?.length > 0 && (<div><span className="text-gray-500">المهارات:</span><div className="flex flex-wrap gap-1 mt-1">{selectedProfile.skills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>)}</div></div>)}
              {selectedProfile.notes && <div><span className="text-gray-500">ملاحظات:</span><p className="mt-1">{selectedProfile.notes}</p></div>}
            </div>
          </div>
        </div>)}

      {/* Form Modal */}
      {showForm && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editItem ? 'تعديل الملف' : 'ملف جديد'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">رقم العضوية *</label><input value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })} disabled={!!editItem} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">الحالة</label><select value={form.employment_status} onChange={e => setForm({ ...form, employment_status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">{Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">نوع العقد</label><select value={form.contract_type} onChange={e => setForm({ ...form, contract_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="">اختر...</option><option value="دائم">دائم</option><option value="مؤقت">مؤقت</option><option value="مشروع">مشروع</option><option value="تدريبي">تدريبي</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">مدة الخبرة (سنوات)</label><input type="number" value={form.total_experience_years} onChange={e => setForm({ ...form, total_experience_years: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-sm font-medium mb-1">درجة الامتثال (%)</label><input type="number" min="0" max="100" value={form.compliance_score} onChange={e => setForm({ ...form, compliance_score: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">ملاحظات</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">إلغاء</button>
                <button onClick={handleSave} disabled={!form.member_id} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{editItem ? 'تحديث' : 'إنشاء'}</button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
