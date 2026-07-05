import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { useMembers } from '../../hooks/useApi';
import { validate, memberValidationSchema, sanitizeData, validateYemeniNationalId } from '../../utils/validation';

interface Member {
  nationalId: string;
  fullName: string;
  gender: string;
  birthDate: string;
  unionNumber: string;
  profession: string;
  status: string;
  phone?: string;
  email?: string;
  address?: string;
  joinDate?: string;
}

export function MembersManagement() {
  const { data, loading, error, getAll, create } = useMembers();
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnion, setFilterUnion] = useState('الكل');
  const [filterGender, setFilterGender] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedTab, setSelectedTab] = useState('personal');
  const [formData, setFormData] = useState<Partial<Member>>({});
  const [formErrors, setFormErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (data?.members) {
      setMembers(data.members.map((m: any) => m.value || m));
    }
  }, [data]);

  const loadMembers = async () => {
    try {
      await getAll();
    } catch (err) {
      toast.error('فشل في تحميل البيانات');
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.fullName?.includes(searchTerm) ||
        member.nationalId?.includes(searchTerm) ||
        member.phone?.includes(searchTerm);

      const matchesUnion = filterUnion === 'الكل' || member.unionNumber === filterUnion;
      const matchesGender = filterGender === 'الكل' || member.gender === filterGender;
      const matchesStatus = filterStatus === 'الكل' || member.status === filterStatus;

      return matchesSearch && matchesUnion && matchesGender && matchesStatus;
    });
  }, [members, searchTerm, filterUnion, filterGender, filterStatus]);

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData(member);
    } else {
      setEditingMember(null);
      setFormData({
        status: 'نشط',
        gender: 'ذكر',
        joinDate: new Date().toISOString().split('T')[0],
      });
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // التحقق من الرقم الوطني اليمني
    if (formData.nationalId && !validateYemeniNationalId(formData.nationalId)) {
      setFormErrors({ ...formErrors, nationalId: 'رقم وطني غير صحيح' });
      toast.error('الرقم الوطني غير صحيح');
      return;
    }

    const errors = validate(formData, memberValidationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('الرجاء تصحيح الأخطاء في النموذج');
      return;
    }

    setSubmitting(true);

    try {
      const cleanData = sanitizeData(formData);
      await create(cleanData);
      toast.success('تم إضافة العضو بنجاح');
      handleCloseModal();
      await loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === 'نشط').length,
    male: members.filter((m) => m.gender === 'ذكر').length,
    female: members.filter((m) => m.gender === 'أنثى').length,
  }), [members]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الأعضاء</h1>
          <p className="text-sm text-gray-600 mt-1">
            عرض وإدارة جميع أعضاء المنظمات النقابية
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="success"
            icon={<Upload size={20} />}
          >
            استيراد Excel
          </Button>
          <Button
            onClick={() => handleOpenModal()}
            variant="primary"
            icon={<Plus size={20} />}
          >
            إضافة عضو
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-1">إجمالي الأعضاء</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-sm text-green-700 font-medium mb-1">الأعضاء النشطين</p>
          <p className="text-3xl font-bold text-green-900">{stats.active}</p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm text-purple-700 font-medium mb-1">ذكور</p>
          <p className="text-3xl font-bold text-purple-900">{stats.male}</p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <p className="text-sm text-pink-700 font-medium mb-1">إناث</p>
          <p className="text-3xl font-bold text-pink-900">{stats.female}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            placeholder="بحث بالاسم أو الرقم الوطني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />

          <Select
            value={filterUnion}
            onChange={(e) => setFilterUnion(e.target.value)}
            options={[
              { value: 'الكل', label: 'جميع النقابات' },
              { value: 'YE-2024-001', label: 'نقابة المهندسين' },
              { value: 'YE-2024-002', label: 'نقابة عمال البناء' },
            ]}
          />

          <Select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            options={[
              { value: 'الكل', label: 'جميع الجنسين' },
              { value: 'ذكر', label: 'ذكر' },
              { value: 'أنثى', label: 'أنثى' },
            ]}
          />

          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'الكل', label: 'جميع الحالات' },
              { value: 'نشط', label: 'نشط' },
              { value: 'موقف', label: 'موقف' },
              { value: 'مفصول', label: 'مفصول' },
            ]}
          />

          <Button variant="success" icon={<Download size={18} />}>
            تصدير Excel
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">لا يوجد أعضاء</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الرقم الوطني</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الاسم الكامل</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الجنس</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">المهنة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الحالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.nationalId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800 font-mono">{member.nationalId}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-semibold">{member.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.gender}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.profession}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            member.status === 'نشط'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(member)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                عرض {filteredMembers.length} من {members.length} عضو
              </p>
            </div>
          </>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingMember ? 'تعديل عضو' : 'إضافة عضو جديد'}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={handleCloseModal}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
              >
                {editingMember ? 'تحديث' : 'حفظ'}
              </Button>
            </>
          }
        >
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-4">
              {[
                { id: 'personal', label: 'البيانات الشخصية' },
                { id: 'contact', label: 'بيانات الاتصال والعمل' },
                { id: 'membership', label: 'بيانات العضوية' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-3 px-4 border-b-2 transition-colors font-medium ${
                    selectedTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-4">
            {selectedTab === 'personal' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="الرقم الوطني"
                  value={formData.nationalId || ''}
                  onChange={(e) => handleInputChange('nationalId', e.target.value)}
                  placeholder="01011234567"
                  required
                  error={formErrors.nationalId}
                  helperText="11 رقم"
                  disabled={!!editingMember}
                />
                <Input
                  label="الاسم الكامل"
                  value={formData.fullName || ''}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                  error={formErrors.fullName}
                />
                <Select
                  label="الجنس"
                  value={formData.gender || ''}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  options={[
                    { value: 'ذكر', label: 'ذكر' },
                    { value: 'أنثى', label: 'أنثى' },
                  ]}
                  required
                  error={formErrors.gender}
                />
                <Input
                  label="تاريخ الميلاد"
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  required
                  error={formErrors.birthDate}
                />
              </div>
            )}

            {selectedTab === 'contact' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input
                    label="العنوان"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
                <Input
                  label="المهنة"
                  value={formData.profession || ''}
                  onChange={(e) => handleInputChange('profession', e.target.value)}
                  required
                  error={formErrors.profession}
                />
                <Input
                  label="الهاتف"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="777123456"
                  error={formErrors.phone}
                  helperText="9 أرقام تبدأ بـ 7"
                />
                <Input
                  label="البريد الإلكتروني"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={formErrors.email}
                />
              </div>
            )}

            {selectedTab === 'membership' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="رقم النقابة"
                  value={formData.unionNumber || ''}
                  onChange={(e) => handleInputChange('unionNumber', e.target.value)}
                  placeholder="YE-2024-001"
                  required
                  error={formErrors.unionNumber}
                />
                <Input
                  label="تاريخ الانتساب"
                  type="date"
                  value={formData.joinDate || ''}
                  onChange={(e) => handleInputChange('joinDate', e.target.value)}
                />
                <Select
                  label="الحالة"
                  value={formData.status || 'نشط'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={[
                    { value: 'نشط', label: 'نشط' },
                    { value: 'موقف', label: 'موقف' },
                    { value: 'مفصول', label: 'مفصول' },
                    { value: 'متوفى', label: 'متوفى' },
                  ]}
                  required
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
