/**
 * Organization Members Management - إدارة أعضاء النقابة
 * CRUD كامل مع تصدير وبروفايل تفصيلي
 */

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Download, Edit, Trash2, Eye, X, Phone, Mail, MapPin, RefreshCw } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { logAudit } from '../../utils/security';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';

interface Member {
  member_id: string;
  full_name: string;
  gender: string;
  birth_date: string;
  phone: string;
  email: string;
  address: string;
  nationality: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  membership_type: string;
  payment_status: string;
  status: string;
  entity_id: string;
  join_date: string;
  member_number: string;
  workplace: string;
}

const STATUS_MAP: Record<string, string> = { active: 'نشط', suspended: 'معلق', inactive: 'متوقف' };
const STATUS_COLORS: Record<string, string> = { active: 'bg-success/15 text-success-dark', suspended: 'bg-warning/15 text-warning-dark', inactive: 'bg-muted text-heading' };

export function OrganizationMembersManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Member | null>(null);
  const [formData, setFormData] = useState<Partial<Member>>({});

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/members');
      if (r.ok) {
        const data = await r.json();
        setMembers(Array.isArray(data) ? data : data.data || []);
        logAudit({ action: 'view', resource: 'organization_members' });
      }
    } catch { toast.error('خطأ في تحميل الأعضاء'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    try {
      const r = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف'); logAudit({ action: 'delete', resource: 'member', details: { id } }); fetchMembers(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleSave = async () => {
    if (!formData.full_name?.trim()) { toast.error('اسم العضو مطلوب'); return; }
    try {
      const endpoint = editItem ? `/api/members/${editItem.member_id}` : '/api/members';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); setShowAddModal(false); setEditItem(null); fetchMembers(); }
      else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleOpenEdit = (item: Member) => {
    setEditItem(item);
    setFormData({ full_name: item.full_name, gender: item.gender, phone: item.phone, email: item.email, address: item.address, nationality: item.nationality, specialization: item.specialization, qualification: item.qualification, experience_years: item.experience_years, membership_type: item.membership_type, workplace: item.workplace });
    setShowAddModal(true);
  };

  const handleExport = () => {
    exportReportToExcel({
      title: 'إدارة أعضاء المنظمة', reportType: 'statistics', data: filteredMembers,
      columns: [
        { key: 'member_number', label: 'رقم العضوية' }, { key: 'full_name', label: 'الاسم' },
        { key: 'specialization', label: 'التخصص' }, { key: 'phone', label: 'الهاتف' },
        { key: 'membership_type', label: 'نوع العضوية' }, { key: 'status', label: 'الحالة' },
      ],
    });
    logAudit({ action: 'export', resource: 'organization_members', details: { count: filteredMembers.length } });
    toast.success('تم التصدير');
  };

  const filteredMembers = members.filter(m => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || m.full_name?.toLowerCase().includes(q) || m.member_number?.toLowerCase().includes(q) || m.specialization?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'الكل' || m.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    newThisMonth: members.filter(m => { const d = new Date(m.join_date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    specializations: [...new Set(members.map(m => m.specialization).filter(Boolean))].length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-bright to-primary-dark rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة الأعضاء</h1>
            <p className="text-blue-100 mt-1">عرض وإدارة أعضاء المنظمة — {members.length} عضو</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"><Download size={16} />تصدير</button>
            <button onClick={fetchMembers} className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            <button onClick={() => { setEditItem(null); setFormData({}); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-white/90 font-semibold text-sm"><Plus size={18} />إضافة عضو</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأعضاء', value: stats.total, color: 'text-primary' },
          { label: 'عضو نشط', value: stats.active, color: 'text-success' },
          { label: 'أعضاء جدد هذا الشهر', value: stats.newThisMonth, color: 'text-info' },
          { label: 'تخصصات مختلفة', value: stats.specializations, color: 'text-gold' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالاسم أو رقم العضوية أو التخصص..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع الحالات</option>
            <option value="active">نشط</option><option value="suspended">معلق</option><option value="inactive">متوقف</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold">رقم العضوية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الاسم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">التخصص</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الهاتف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">نوع العضوية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-muted-foreground">جاري التحميل...</span></div></td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">لا توجد بيانات</td></tr>
              ) : filteredMembers.map(m => (
                <tr key={m.member_id} className="hover:bg-accent transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-heading">{m.member_number}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading">{m.full_name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{m.specialization || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground" dir="ltr">{m.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{m.membership_type || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[m.status] || 'bg-muted text-heading'}`}>{STATUS_MAP[m.status] || m.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedMember(m)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"><Eye size={16} /></button>
                      <button onClick={() => handleOpenEdit(m)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(m.member_id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-muted border-t border-border text-sm text-muted-foreground">عرض {filteredMembers.length} من {members.length} عضو</div>
      </div>

      {/* Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="text-lg font-bold text-heading">{selectedMember.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedMember.member_number}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'رقم العضوية', value: selectedMember.member_number },
                  { label: 'الجنس', value: selectedMember.gender === 'male' ? 'ذكر' : selectedMember.gender === 'female' ? 'أنثى' : selectedMember.gender },
                  { label: 'تاريخ الميلاد', value: selectedMember.birth_date },
                  { label: 'الجنسية', value: selectedMember.nationality },
                  { label: 'التخصص', value: selectedMember.specialization },
                  { label: 'المؤهل', value: selectedMember.qualification },
                  { label: 'سنوات الخبرة', value: selectedMember.experience_years },
                  { label: 'مكان العمل', value: selectedMember.workplace },
                  { label: 'نوع العضوية', value: selectedMember.membership_type },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2"><Phone size={14} className="text-muted-foreground" /><div><p className="text-xs text-muted-foreground">الهاتف</p><p className="text-sm font-semibold text-heading">{selectedMember.phone || '—'}</p></div></div>
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2"><Mail size={14} className="text-muted-foreground" /><div><p className="text-xs text-muted-foreground">البريد</p><p className="text-sm font-semibold text-heading">{selectedMember.email || '—'}</p></div></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /><div><p className="text-xs text-muted-foreground">العنوان</p><p className="text-sm font-semibold text-heading">{selectedMember.address || '—'}</p></div></div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedMember.status] || 'bg-muted text-heading'}`}>{STATUS_MAP[selectedMember.status]}</span>
                {selectedMember.payment_status && <span className="text-xs text-muted-foreground">حالة الدفع: <span className="font-bold text-heading">{selectedMember.payment_status}</span></span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل عضو' : 'إضافة عضو جديد'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div><label className="block text-sm font-semibold mb-1">الاسم الكامل *</label><input value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">الجنس</label><select value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">اختر</option><option value="male">ذكر</option><option value="female">أنثى</option></select></div>
                <div><label className="block text-sm font-semibold mb-1">الهاتف</label><input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">البريد الإلكتروني</label><input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">التخصص</label><input value={formData.specialization || ''} onChange={e => setFormData({ ...formData, specialization: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">المؤهل</label><input value={formData.qualification || ''} onChange={e => setFormData({ ...formData, qualification: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-semibold mb-1">سنوات الخبرة</label><input type="number" value={formData.experience_years || ''} onChange={e => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold mb-1">مكان العمل</label><input value={formData.workplace || ''} onChange={e => setFormData({ ...formData, workplace: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold mb-1">العنوان</label><input value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">إلغاء</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark">{editItem ? 'تحديث' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
