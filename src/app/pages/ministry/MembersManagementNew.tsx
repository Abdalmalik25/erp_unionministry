import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Download, Edit, Trash2, RefreshCw, Users, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SimpleSelect } from '../../components/ui/simple-select';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { logAudit } from '../../utils/security';
import { fetchList } from '../../utils/api';
import { PermissionGate } from '../../hooks/usePermissions';
import { Switch } from '../../components/ui/switch';

const Select = ({ value, onChange, options, label, error, ...props }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; label?: string; error?: string; [key: string]: any }) => (
  <div>
    {label && <label className="block text-sm font-semibold text-foreground mb-1">{label}</label>}
    <SimpleSelect value={value} onChange={(e) => onChange?.(e)} options={options} {...props} />
    {error && <p className="text-xs text-error mt-1">{error}</p>}
  </div>
);

interface Member {
  id?: string;
  entity_id?: string;
  national_id: string;
  member_number?: string;
  full_name: string;
  gender: string;
  birth_date?: string;
  unified_code?: string;
  entity_name?: string;
  profession: string;
  status: string;
  phone?: string;
  email?: string;
  address?: string;
  join_date?: string;
  job_title?: string;
  membership_number?: string;
  [key: string]: any;
}

interface MembersApiResponse {
  data: Member[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = [
  { value: 'نشط', label: 'نشط' },
  { value: 'موقف', label: 'موقف' },
  { value: 'مفصول', label: 'مفصول' },
  { value: 'متوفى', label: 'متوفى' },
];

const PAGE_SIZE = 20;

export function MembersManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [entities, setEntities] = useState<Array<{ entity_id: string; entity_name: string; unified_code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterUnion, setFilterUnion] = useState('الكل');
  const [filterGender, setFilterGender] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedTab, setSelectedTab] = useState('personal');
  const [formData, setFormData] = useState<Partial<Member>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (showDeleted) params.set('include_deleted', 'true');

      const [membersRes, entities_] = await Promise.all([
        fetch(`/api/members?${params.toString()}`).then(async (r) => {
          if (!r.ok) return { data: [], total: 0 } as MembersApiResponse;
          const json = await r.json();
          return {
            data: Array.isArray(json) ? json : json.data ?? json.members ?? [],
            total: json.total ?? (Array.isArray(json) ? json.length : 0),
            page: json.page ?? page,
            limit: json.limit ?? PAGE_SIZE,
          } as MembersApiResponse;
        }),
        fetchList<{ entity_id: string; entity_name: string; unified_code: string }>('/api/entities', undefined, ['entities']),
      ]);

      setMembers(membersRes.data);
      setTotal(membersRes.total);
      setEntities(entities_);
      logAudit({ action: 'view', resource: 'members' });
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, [page, debouncedSearch, showDeleted]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesUnion = filterUnion === 'الكل' || member.unified_code === filterUnion;
      const matchesGender = filterGender === 'الكل' || member.gender === filterGender;
      const matchesStatus = filterStatus === 'الكل' || member.status === filterStatus;
      return matchesUnion && matchesGender && matchesStatus;
    });
  }, [members, filterUnion, filterGender, filterStatus]);

  const entityOptions = useMemo(() => [
    { value: 'الكل', label: 'جميع النقابات والمنظمات' },
    ...entities.map(e => ({ value: e.unified_code, label: e.entity_name })),
  ], [entities]);

  const stats = useMemo(() => ({
    total,
    active: members.filter(m => m.status === 'نشط').length,
    male: members.filter(m => m.gender === 'ذكر').length,
    female: members.filter(m => m.gender === 'أنثى').length,
  }), [members, total]);

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        nationalId: member.national_id,
        fullName: member.full_name,
        gender: member.gender,
        birthDate: member.birth_date,
        unionNumber: member.unified_code,
        profession: member.profession,
        status: member.status,
        phone: member.phone,
        email: member.email,
        address: member.address,
        joinDate: member.join_date,
        jobTitle: member.job_title,
        membershipNumber: member.membership_number,
      });
    } else {
      setEditingMember(null);
      setFormData({ status: 'نشط', gender: 'ذكر', joinDate: new Date().toISOString().split('T')[0] });
    }
    setFormErrors({});
    setSelectedTab('personal');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setFormData({});
    setFormErrors({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.nationalId || formData.nationalId.length !== 11) errors.nationalId = 'الرقم الوطني يجب أن يكون 11 رقماً';
    if (!formData.fullName?.trim()) errors.fullName = 'الاسم مطلوب';
    if (!formData.gender) errors.gender = 'الجنس مطلوب';
    if (!formData.profession?.trim()) errors.profession = 'المهنة مطلوبة';
    if (formData.phone && !/^7[0-9]{8}$/.test(formData.phone)) errors.phone = 'رقم الهاتف غير صحيح (9 أرقام تبدأ بـ 7)';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'البريد الإلكتروني غير صحيح';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) { toast.error('يرجى تصحيح الأخطاء'); return; }
    setSubmitting(true);
    try {
      const endpoint = editingMember?.id ? `/api/members/${editingMember.id}` : '/api/members';
      const method = editingMember?.id ? 'PUT' : 'POST';
      const body = {
        national_id: formData.nationalId,
        full_name: formData.fullName,
        gender: formData.gender,
        birth_date: formData.birthDate,
        occupation: formData.profession,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        join_date: formData.joinDate,
        status: formData.status,
        job_title: formData.jobTitle,
        membership_number: formData.membershipNumber,
        entity_id: entities.find(e => e.unified_code === formData.unionNumber)?.entity_id,
      };
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) {
        toast.success(editingMember ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح');
        logAudit({ action: editingMember ? 'update' : 'create', resource: 'member' });
        handleCloseModal();
        fetchData();
      } else {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || 'حدث خطأ');
      }
    } catch { toast.error('خطأ في الاتصال'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (m: Member) => {
    if (!confirm(`هل أنت متأكد من حذف "${m.full_name}"؟ سيتم نقله إلى المحذوفات ويمكن استعادته لاحقاً.`)) return;
    try {
      const r = await fetch(`/api/members/${m.id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف بنجاح'); logAudit({ action: 'delete', resource: 'member', details: { id: m.id } }); fetchData(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleRestore = async (m: Member) => {
    try {
      const r = await fetch(`/api/members/${m.id}/restore`, { method: 'PUT' });
      if (r.ok) { toast.success('تمت الاستعادة بنجاح'); fetchData(); }
      else { toast.error('خطأ في الاستعادة'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (showDeleted) params.set('include_deleted', 'true');
      params.set('limit', '99999');
      params.set('page', '1');
      const r = await fetch(`/api/members?${params.toString()}`);
      if (!r.ok) { toast.error('خطأ في تحميل البيانات للتصدير'); return; }
      const json = await r.json();
      const allMembers: Member[] = Array.isArray(json) ? json : json.data ?? json.members ?? [];
      const headers = ['الرقم الوطني', 'الاسم', 'الجنس', 'المهنة', 'الحالة', 'الهاتف', 'البريد', 'النقابة', 'تاريخ الانتساب'];
      const rows = allMembers.map(m => [m.national_id, m.full_name, m.gender, m.profession, m.status, m.phone || '', m.email || '', m.unified_code || '', m.join_date || '']);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `أعضاء_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('تم التصدير بنجاح');
      logAudit({ action: 'export', resource: 'members' });
    } catch { toast.error('خطأ في التصدير'); }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="سجل العمال والنقابيين المسجلين" subtitle="عرض وإدارة سجلات القوى العاملة وأعضاء النقابات واللجان المسجّلة"
        actions={<>
          <PermissionGate permission="members:export">
            <Button variant="outline" onClick={handleExport} icon={<Download size={18} />}>تصدير</Button>
          </PermissionGate>
          <PermissionGate permission="members:create">
            <Button onClick={() => handleOpenModal()} icon={<Plus size={18} />}>تسجيل عامل / عضو</Button>
          </PermissionGate>
        </>} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md" className="bg-gradient-to-br from-primary-bright/10 to-primary-bright/15 border-primary-bright/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-bright/15 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-primary-dark" /></div>
            <div><p className="text-xs text-primary-dark font-medium">إجمالي الأعضاء</p><p className="text-2xl font-bold text-primary-dark">{stats.total}</p></div>
          </div>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-success/10 to-success/15 border-success/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/15 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-success-dark" /></div>
            <div><p className="text-xs text-success-dark font-medium">نشطين</p><p className="text-2xl font-bold text-success-dark">{stats.active}</p></div>
          </div>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-gold/10 to-gold/15 border-gold/15">
          <p className="text-xs text-gold-dark font-medium mb-1">ذكور</p>
          <p className="text-2xl font-bold text-gold-dark">{stats.male}</p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-teal/10 to-teal/15 border-teal/15">
          <p className="text-xs text-teal-dark font-medium mb-1">إناث</p>
          <p className="text-2xl font-bold text-teal-dark">{stats.female}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Input placeholder="بحث بالاسم أو الرقم الوطني أو الهاتف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<Search size={18} />} />
          <Select value={filterUnion} onChange={e => setFilterUnion(e.target.value)} options={entityOptions} />
          <Select value={filterGender} onChange={e => setFilterGender(e.target.value)} options={[{ value: 'الكل', label: 'جميع الجنسين' }, { value: 'ذكر', label: 'ذكر' }, { value: 'أنثى', label: 'أنثى' }]} />
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} options={[{ value: 'الكل', label: 'جميع الحالات' }, ...STATUS_OPTIONS]} />
          <div className="flex items-center gap-2">
            <Switch checked={showDeleted} onCheckedChange={setShowDeleted} />
            <span className="text-xs font-semibold text-muted-foreground">المحذوفات</span>
          </div>
          <Button variant="ghost" onClick={fetchData} icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}>تحديث</Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-bright border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <EmptyState title="لا يوجد أعضاء" description="لم يتم تسجيل أي أعضاء بعد" icon={<Users className="w-14 h-14" />} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الرقم الوطني</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الاسم</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الجنس</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">المهنة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">النقابة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الهاتف</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">الحالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((member) => (
                    <tr key={member.id || member.national_id} className={`hover:bg-accent transition-colors ${(member as any).deleted_at ? 'opacity-50 bg-error/5' : ''}`}>
                      <td className="px-6 py-4 text-sm text-heading font-mono">
                        {member.national_id}
                        {member.member_number && <span className="block text-[10px] font-bold text-gold-dark mt-0.5">عضوية: {member.member_number}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-heading font-semibold">
                        {member.full_name}
                        {(member as any).deleted_at && <span className="mr-2 text-xs bg-error/10 text-error px-1.5 py-0.5 rounded">محذوف</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{member.gender === 'ذكر' ? '♂ ذكر' : '♀ أنثى'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{member.profession || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{member.entity_name || member.unified_code || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono" dir="ltr">{member.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          member.status === 'نشط' ? 'bg-success/15 text-success-dark'
                          : member.status === 'موقف' ? 'bg-warning/15 text-warning-dark'
                          : 'bg-error/15 text-error-dark'
                        }`}>{member.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {(member as any).deleted_at ? (
                            <button onClick={() => handleRestore(member)} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-success hover:bg-success/10 rounded-lg transition-colors" title="استعادة">
                              <RotateCcw size={14} /> استعادة
                            </button>
                          ) : (
                            <>
                              <PermissionGate permission="members:edit">
                                <button onClick={() => handleOpenModal(member)} className="p-2 text-primary-bright hover:bg-primary-bright/10 rounded-lg transition-colors" title="تعديل">
                                  <Edit size={16} />
                                </button>
                              </PermissionGate>
                              <PermissionGate permission="members:delete">
                                <button onClick={() => handleDelete(member)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="حذف">
                                  <Trash2 size={16} />
                                </button>
                              </PermissionGate>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {total} عضو
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  icon={<ChevronRight size={16} />}
                >
                  السابق
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-primary-bright text-white'
                            : 'hover:bg-accent text-muted-foreground'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  icon={<ChevronLeft size={16} />}
                >
                  التالي
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={handleCloseModal} title={editingMember ? 'تعديل عضو' : 'إضافة عضو جديد'} size="lg"
          footer={<><Button variant="ghost" onClick={handleCloseModal}>إلغاء</Button><Button onClick={handleSubmit} loading={submitting}>{editingMember ? 'تحديث' : 'حفظ'}</Button></>}>
          <div className="border-b border-border mb-6">
            <div className="flex gap-4">
              {[{ id: 'personal', label: 'البيانات الشخصية' }, { id: 'contact', label: 'بيانات الاتصال' }, { id: 'membership', label: 'بيانات العضوية' }].map(tab => (
                <button key={tab.id} onClick={() => setSelectedTab(tab.id)}
                  className={`py-3 px-4 border-b-2 transition-colors font-medium ${selectedTab === tab.id ? 'text-primary border-primary' : 'border-transparent text-muted-foreground hover:text-heading'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {selectedTab === 'personal' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="الرقم الوطني" value={formData.nationalId || ''} onChange={e => handleInputChange('nationalId', e.target.value)} placeholder="01011234567" required error={formErrors.nationalId} disabled={!!editingMember} />
                <Input label="الاسم الكامل" value={formData.fullName || ''} onChange={e => handleInputChange('fullName', e.target.value)} required error={formErrors.fullName} />
                <Select label="الجنس" value={formData.gender || ''} onChange={e => handleInputChange('gender', e.target.value)} options={[{ value: 'ذكر', label: 'ذكر' }, { value: 'أنثى', label: 'أنثى' }]} error={formErrors.gender} />
                <Input label="تاريخ الميلاد" type="date" value={formData.birthDate || ''} onChange={e => handleInputChange('birthDate', e.target.value)} error={formErrors.birthDate} />
              </div>
            )}
            {selectedTab === 'contact' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="المهنة" value={formData.profession || ''} onChange={e => handleInputChange('profession', e.target.value)} required error={formErrors.profession} />
                <Input label="المنصب الوظيفي" value={formData.jobTitle || ''} onChange={e => handleInputChange('jobTitle', e.target.value)} />
                <Input label="الهاتف" value={formData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} placeholder="777123456" error={formErrors.phone} />
                <Input label="البريد الإلكتروني" type="email" value={formData.email || ''} onChange={e => handleInputChange('email', e.target.value)} error={formErrors.email} />
                <div className="col-span-2"><Input label="العنوان" value={formData.address || ''} onChange={e => handleInputChange('address', e.target.value)} /></div>
              </div>
            )}
            {selectedTab === 'membership' && (
              <div className="grid grid-cols-2 gap-4">
                <Select label="النقابة أو منظمة" value={formData.unionNumber || ''} onChange={e => handleInputChange('unionNumber', e.target.value)} options={entityOptions.slice(1)} error={formErrors.unionNumber} />
                <Input label="رقم العضوية" value={formData.membershipNumber || ''} onChange={e => handleInputChange('membershipNumber', e.target.value)} />
                <Input label="تاريخ الانتساب" type="date" value={formData.joinDate || ''} onChange={e => handleInputChange('joinDate', e.target.value)} />
                <Select label="الحالة" value={formData.status || 'نشط'} onChange={e => handleInputChange('status', e.target.value)} options={STATUS_OPTIONS} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
