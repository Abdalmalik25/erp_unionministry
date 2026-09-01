/**
 * Ministry - Unions Management
 * إدارة المنظمات النقابية — CRUD كامل + بروفايل تفصيلي + تصدير
 */

import  { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Download, RefreshCw, X, Building2, MapPin, Phone, Mail, Hash, Calendar, BadgeCheck } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { logAudit } from '../../utils/security';
import { fetchList } from '../../utils/api';
import { PermissionGate } from '../../hooks/usePermissions';
import { exportReportToExcel } from '../../components/enterprise/PrintExportManager';
import { useGovernorates } from '../../hooks/useReferenceData';

interface Entity {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  unified_code: string;
  registration_number: string;
  national_number?: string;
  governorate: string;
  status: string;
  member_count?: number;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  established_date?: string;
  license_number?: string;
  sector?: string;
  activity_description?: string;
  president_name?: string;
  vice_president?: string;
  secretary?: string;
  treasurer?: string;
  board_member_count?: number;
  total_budget?: number;
  last_audit_date?: string;
  compliance_score?: number;
  created_at?: string;
  updated_at?: string;
}

const STATUS_MAP: Record<string, string> = { active: 'نشط', suspended: 'موقف', inactive: 'غير نشط' };
const TYPE_MAP: Record<string, string> = { union: 'نقابة', federation: 'اتحاد', organization: 'منظمة', branch: 'فرع' };
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/15 text-success-dark',
  suspended: 'bg-warning/15 text-warning-dark',
  inactive: 'bg-muted text-heading',
};

export function UnionsManagementNew() {
  const [unions, setUnions] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('الكل');
  const [filterProvince, setFilterProvince] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Entity | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState<Partial<Entity>>({});

  const { governorates } = useGovernorates();

  const fetchUnions = useCallback(async () => {
    setLoading(true);
    try {
      setUnions(await fetchList('/api/entities'));
      logAudit({ action: 'view', resource: 'entities' });
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUnions(); }, [fetchUnions]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النقابة أو منظمة؟')) return;
    try {
      const r = await fetch(`/api/entities/${id}`, { method: 'DELETE' });
      if (r.ok) { toast.success('تم الحذف بنجاح'); logAudit({ action: 'delete', resource: 'entity', details: { id } }); fetchUnions(); }
      else { toast.error('خطأ في الحذف'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleSave = async () => {
    if (!formData.entity_name?.trim()) { toast.error('اسم النقابة أو منظمة مطلوب'); return; }
    try {
      const endpoint = editItem ? `/api/entities/${editItem.entity_id}` : '/api/entities';
      const method = editItem ? 'PUT' : 'POST';
      const r = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (r.ok) { toast.success(editItem ? 'تم التحديث' : 'تمت الإضافة'); logAudit({ action: editItem ? 'update' : 'create', resource: 'entity' }); setShowAddModal(false); setEditItem(null); fetchUnions(); }
      else { toast.error('حدث خطأ'); }
    } catch { toast.error('خطأ في الاتصال'); }
  };

  const handleOpenEdit = (item: Entity) => {
    setEditItem(item);
    setFormData({
      entity_name: item.entity_name, entity_type: item.entity_type,
      unified_code: item.unified_code, registration_number: item.registration_number,
      governorate: item.governorate, phone: item.phone || '', email: item.email || '',
      address: item.address || '', website: item.website || '',
      established_date: item.established_date || '', license_number: item.license_number || '',
      sector: item.sector || '', activity_description: item.activity_description || '',
      president_name: item.president_name || '', vice_president: item.vice_president || '',
      secretary: item.secretary || '', treasurer: item.treasurer || '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormData({ entity_name: '', entity_type: 'union', unified_code: '', registration_number: '', governorate: '', phone: '', email: '', address: '', website: '', established_date: '', license_number: '', sector: '', activity_description: '' });
    setShowAddModal(true);
  };

  const handleExport = () => {
    exportReportToExcel({
      title: 'إدارة النقابات والمنظمات المسجّلة',
      reportType: 'statistics',
      data: filteredUnions,
      columns: [
        { key: 'unified_code', label: 'الرمز الموحد' },
        { key: 'entity_name', label: 'اسم النقابة أو منظمة' },
        { key: 'entity_type', label: 'النوع' },
        { key: 'registration_number', label: 'رقم التسجيل' },
        { key: 'governorate', label: 'المحافظة' },
        { key: 'status', label: 'الحالة' },
        { key: 'member_count', label: 'عدد الأعضاء' },
        { key: 'president_name', label: 'رئيس النقابة أو منظمة' },
        { key: 'phone', label: 'الهاتف' },
        { key: 'email', label: 'البريد الإلكتروني' },
      ],
    });
    logAudit({ action: 'export', resource: 'entities', details: { count: filteredUnions.length } });
    toast.success('تم التصدير بنجاح');
  };

  const filteredUnions = unions.filter(u => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || u.entity_name?.toLowerCase().includes(q) || u.unified_code?.toLowerCase().includes(q) || u.registration_number?.toLowerCase().includes(q) || u.national_number?.toLowerCase().includes(q) || u.president_name?.toLowerCase().includes(q);
    const matchType = filterType === 'الكل' || u.entity_type === filterType;
    const matchProvince = filterProvince === 'الكل' || u.governorate === filterProvince;
    const matchStatus = filterStatus === 'الكل' || u.status === filterStatus;
    return matchSearch && matchType && matchProvince && matchStatus;
  });

  const uniqueGovernorates = [...new Set([...unions.map(u => u.governorate).filter(Boolean), ...governorates])];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">سجل النقابات والاتحادات العمالية والمهنية</h1>
          <p className="text-sm text-muted-foreground mt-1">عرض وإدارة جميع النقابات العامة والفرعية والاتحادات العمالية المسجلة — {unions.length} نقابة ومنظمة</p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionGate permission="entities:export">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
              <Download size={18} />تصدير
            </button>
          </PermissionGate>
          <button onClick={fetchUnions} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <PermissionGate permission="entities:create">
            <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors shadow-md">
              <Plus size={20} /><span>تسجيل نقابة جديدة</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="بحث بالاسم أو الرمز أو الرئيس..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع الأنواع</option>
            <option value="union">نقابة</option>
            <option value="federation">اتحاد</option>
            <option value="organization">منظمة</option>
            <option value="branch">فرع</option>
          </select>
          <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع المحافظات</option>
            {uniqueGovernorates.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
            <option value="الكل">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقف</option>
            <option value="inactive">غير نشط</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => { setSearchTerm(''); setFilterType('الكل'); setFilterProvince('الكل'); setFilterStatus('الكل'); }}
              className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted">مسح الفلاتر</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي النقابات والمنظمات', value: unions.length, color: 'text-primary' },
          { label: 'نشط', value: unions.filter(u => u.status === 'active').length, color: 'text-success' },
          { label: 'موقف', value: unions.filter(u => u.status === 'suspended').length, color: 'text-warning' },
          { label: 'غير نشط', value: unions.filter(u => u.status === 'inactive').length, color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">الرمز الموحد</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">اسم النقابة أو منظمة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">الرئيس</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">المحافظة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">الأعضاء</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-muted-foreground">جاري التحميل...</span></div>
                </td></tr>
              ) : filteredUnions.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">لا توجد بيانات مطابقة</td></tr>
              ) : filteredUnions.map(u => (
                <tr key={u.entity_id} className="hover:bg-accent transition-colors cursor-pointer" onClick={() => setSelectedEntity(u)}>
                  <td className="px-4 py-3 text-sm font-mono text-heading">{u.unified_code}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading">
                    {u.entity_name}
                    <span className="block text-[10px] font-mono text-gold-dark mt-0.5" dir="ltr">{u.national_number || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{TYPE_MAP[u.entity_type] || u.entity_type}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.president_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={13} />{u.governorate || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-heading font-bold">{u.member_count || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[u.status] || 'bg-muted text-heading'}`}>
                      {STATUS_MAP[u.status] || u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedEntity(u)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg" title="عرض التفاصيل"><Eye size={16} /></button>
                      <PermissionGate permission="entities:edit">
                        <button onClick={() => handleOpenEdit(u)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg" title="تعديل"><Edit size={16} /></button>
                      </PermissionGate>
                      <PermissionGate permission="entities:delete">
                        <button onClick={() => handleDelete(u.entity_id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg" title="حذف"><Trash2 size={16} /></button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-muted border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">عرض {filteredUnions.length} من {unions.length} كيان</p>
        </div>
      </div>

      {/* ═══════════════ Detail Modal ═══════════════ */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEntity(null)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-heading">{selectedEntity.entity_name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedEntity.unified_code} · {TYPE_MAP[selectedEntity.entity_type]}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntity(null)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedEntity.status] || 'bg-muted text-heading'}`}>
                  {STATUS_MAP[selectedEntity.status] || selectedEntity.status}
                </span>
                {selectedEntity.compliance_score != null && (
                  <span className="text-sm text-muted-foreground">نسبة الامتثال: <span className="font-bold text-heading">{selectedEntity.compliance_score}%</span></span>
                )}
              </div>

              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-bold text-heading mb-3 pb-2 border-b border-border">المعلومات الأساسية</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'الرقم الوطني', value: selectedEntity.national_number, icon: BadgeCheck },
                    { label: 'الرمز الموحد', value: selectedEntity.unified_code, icon: Hash },
                    { label: 'رقم التسجيل', value: selectedEntity.registration_number, icon: Hash },
                    { label: 'المحافظة', value: selectedEntity.governorate, icon: MapPin },
                    { label: 'رقم الترخيص', value: selectedEntity.license_number, icon: Hash },
                    { label: 'تاريخ التأسيس', value: selectedEntity.established_date, icon: Calendar },
                    { label: 'القطاع', value: selectedEntity.sector, icon: Building2 },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><item.icon size={12} />{item.label}</p>
                      <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-sm font-bold text-heading mb-3 pb-2 border-b border-border">معلومات الاتصال</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'الهاتف', value: selectedEntity.phone, icon: Phone },
                    { label: 'البريد الإلكتروني', value: selectedEntity.email, icon: Mail },
                    { label: 'الموقع الإلكتروني', value: selectedEntity.website, icon: Building2 },
                    { label: 'العنوان', value: selectedEntity.address, icon: MapPin },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><item.icon size={12} />{item.label}</p>
                      <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Board Members */}
              <div>
                <h4 className="text-sm font-bold text-heading mb-3 pb-2 border-b border-border">مجلس الإدارة</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'الرئيس', value: selectedEntity.president_name },
                    { label: 'النائب', value: selectedEntity.vice_president },
                    { label: 'الأمين', value: selectedEntity.secretary },
                    { label: 'أمين الصندوق', value: selectedEntity.treasurer },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-heading mt-1">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
                {selectedEntity.board_member_count != null && (
                  <p className="text-xs text-muted-foreground mt-2">عدد أعضاء المجلس: <span className="font-bold text-heading">{selectedEntity.board_member_count}</span></p>
                )}
              </div>

              {/* Financial */}
              <div>
                <h4 className="text-sm font-bold text-heading mb-3 pb-2 border-b border-border">المعلومات المالية</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">الميزانية الإجمالية</p>
                    <p className="text-sm font-bold text-heading mt-1">{selectedEntity.total_budget ? `${selectedEntity.total_budget.toLocaleString('ar-YE')} ريال` : '—'}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">آخر مراجعة مالية</p>
                    <p className="text-sm font-semibold text-heading mt-1">{selectedEntity.last_audit_date || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Activity */}
              {selectedEntity.activity_description && (
                <div>
                  <h4 className="text-sm font-bold text-heading mb-3 pb-2 border-b border-border">وصف النشاط</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 leading-relaxed">{selectedEntity.activity_description}</p>
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-muted-foreground flex items-center gap-4 pt-2 border-t border-border">
                {selectedEntity.created_at && <span>أنشئ: {new Date(selectedEntity.created_at).toLocaleDateString('ar-YE')}</span>}
                {selectedEntity.updated_at && <span>آخر تحديث: {new Date(selectedEntity.updated_at).toLocaleDateString('ar-YE')}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Add/Edit Modal ═══════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-heading">{editItem ? 'تعديل كيان' : 'إضافة كيان جديد'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold text-foreground mb-1">اسم النقابة أو منظمة *</label><input value={formData.entity_name || ''} onChange={e => setFormData({ ...formData, entity_name: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-foreground mb-1">النوع</label><select value={formData.entity_type || 'union'} onChange={e => setFormData({ ...formData, entity_type: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="union">نقابة</option><option value="federation">اتحاد</option><option value="organization">منظمة</option><option value="branch">فرع</option></select></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">المحافظة</label><select value={formData.governorate || ''} onChange={e => setFormData({ ...formData, governorate: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm"><option value="">— اختر —</option>{governorates.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-foreground mb-1">الرمز الموحد</label><input value={formData.unified_code || ''} onChange={e => setFormData({ ...formData, unified_code: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">رقم التسجيل</label><input value={formData.registration_number || ''} onChange={e => setFormData({ ...formData, registration_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-foreground mb-1">الهاتف</label><input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">البريد الإلكتروني</label><input value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold text-foreground mb-1">العنوان</label><input value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-foreground mb-1">رئيس النقابة أو منظمة</label><input value={formData.president_name || ''} onChange={e => setFormData({ ...formData, president_name: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
                <div><label className="block text-sm font-semibold text-foreground mb-1">رقم الترخيص</label><input value={formData.license_number || ''} onChange={e => setFormData({ ...formData, license_number: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" /></div>
              </div>
              <div><label className="block text-sm font-semibold text-foreground mb-1">وصف النشاط</label><textarea value={formData.activity_description || ''} onChange={e => setFormData({ ...formData, activity_description: e.target.value })} className="w-full p-2.5 border border-border rounded-lg bg-card text-sm" rows={3} /></div>
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
