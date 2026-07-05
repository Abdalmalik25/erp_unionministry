import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Download, Filter, X, FileSpreadsheet, FileText, Printer, Upload } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { useUnions } from '../../hooks/useApi';
import { validate, unionValidationSchema, sanitizeData } from '../../utils/validation';
import { exportToExcel, exportToCSV, exportToPDF, importFromExcel, printReport } from '../../utils/exportImport';

interface Union {
  unionNumber: string;
  nameAr: string;
  nameEn: string;
  type: string;
  structure: string;
  establishDate: string;
  province: string;
  status: string;
  phone?: string;
  email?: string;
  address?: string;
}

const provinces = [
  'صنعاء', 'عدن', 'تعز', 'حضرموت', 'الحديدة', 'إب', 'ذمار', 'عمران',
  'صعدة', 'حجة', 'المحويت', 'الضالع', 'لحج', 'أبين', 'شبوة', 'مأرب',
  'البيضاء', 'الجوف', 'ريمة', 'المهرة', 'سقطرى'
];

export function UnionsManagement() {
  const { data, loading, error, getAll, create, update } = useUnions();
  const [unions, setUnions] = useState<Union[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('الكل');
  const [filterProvince, setFilterProvince] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editingUnion, setEditingUnion] = useState<Union | null>(null);
  const [selectedTab, setSelectedTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<Union>>({});
  const [formErrors, setFormErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUnions();
  }, []);

  useEffect(() => {
    if (data?.unions) {
      setUnions(data.unions.map((u: any) => u.value || u));
    }
  }, [data]);

  const loadUnions = async () => {
    try {
      await getAll();
    } catch (err) {
      toast.error('فشل في تحميل البيانات');
    }
  };

  const filteredUnions = useMemo(() => {
    return unions.filter((union) => {
      const matchesSearch =
        union.nameAr?.includes(searchTerm) ||
        union.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        union.unionNumber?.includes(searchTerm);

      const matchesType = filterType === 'الكل' || union.type === filterType;
      const matchesProvince = filterProvince === 'الكل' || union.province === filterProvince;
      const matchesStatus = filterStatus === 'الكل' || union.status === filterStatus;

      return matchesSearch && matchesType && matchesProvince && matchesStatus;
    });
  }, [unions, searchTerm, filterType, filterProvince, filterStatus]);

  const handleOpenModal = (union?: Union) => {
    if (union) {
      setEditingUnion(union);
      setFormData(union);
    } else {
      setEditingUnion(null);
      setFormData({
        status: 'نشط',
        type: 'عمالية',
        structure: 'نقابة',
      });
    }
    setFormErrors({});
    setSelectedTab('basic');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUnion(null);
    setFormData({});
    setFormErrors({});
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // Validate
    const errors = validate(formData, unionValidationSchema);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('الرجاء تصحيح الأخطاء في النموذج');
      return;
    }

    setSubmitting(true);

    try {
      const cleanData = sanitizeData(formData);

      if (editingUnion) {
        await update(editingUnion.unionNumber, cleanData);
        toast.success('تم تحديث النقابة بنجاح');
      } else {
        await create(cleanData);
        toast.success('تم إضافة النقابة بنجاح');
      }

      handleCloseModal();
      await loadUnions();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (union: Union) => {
    if (!confirm(`هل أنت متأكد من حذف النقابة "${union.nameAr}"؟`)) {
      return;
    }

    try {
      // Soft delete - just update status
      await update(union.unionNumber, { ...union, status: 'محذوف' });
      toast.success('تم حذف النقابة بنجاح');
      await loadUnions();
    } catch (err) {
      toast.error('فشل في حذف النقابة');
    }
  };

  // Export/Import handlers
  const handleExportExcel = () => {
    const result = exportToExcel(
      filteredUnions,
      `النقابات_${new Date().toLocaleDateString('ar-YE')}`,
      'النقابات'
    );
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleExportCSV = () => {
    const result = exportToCSV(filteredUnions, `النقابات_${new Date().toLocaleDateString('ar-YE')}`);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'رقم النقابة', dataKey: 'unionNumber' },
      { header: 'الاسم بالعربي', dataKey: 'nameAr' },
      { header: 'النوع', dataKey: 'type' },
      { header: 'التصنيف', dataKey: 'structure' },
      { header: 'المحافظة', dataKey: 'province' },
      { header: 'الحالة', dataKey: 'status' },
    ];

    const result = exportToPDF(
      filteredUnions,
      `تقرير_النقابات_${new Date().toLocaleDateString('ar-YE')}`,
      columns,
      'تقرير المنظمات النقابية'
    );

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let importedData: any[];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        importedData = await importFromExcel(file);
      } else {
        toast.error('نوع الملف غير مدعوم. الرجاء استخدام ملف Excel');
        return;
      }

      // Validate and import data
      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        try {
          const errors = validate(row, unionValidationSchema);
          if (Object.keys(errors).length === 0) {
            await create(sanitizeData(row));
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      toast.success(`تم استيراد ${successCount} نقابة بنجاح. فشل: ${errorCount}`);
      await loadUnions();
    } catch (err) {
      toast.error('فشل في استيراد البيانات');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePrint = () => {
    printReport('unions-table', 'تقرير المنظمات النقابية');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المنظمات النقابية</h1>
          <p className="text-sm text-gray-600 mt-1">
            عرض وإدارة جميع النقابات والاتحادات المسجلة
          </p>
        </div>
        <div className="flex gap-3">
          {/* Export/Import Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleExportExcel}
              variant="secondary"
              icon={<FileSpreadsheet size={18} />}
              title="تصدير إلى Excel"
            >
              Excel
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="secondary"
              icon={<FileText size={18} />}
              title="تصدير إلى CSV"
            >
              CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="secondary"
              icon={<Download size={18} />}
              title="تصدير إلى PDF"
            >
              PDF
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              icon={<Printer size={18} />}
              title="طباعة"
            >
              طباعة
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              icon={<Upload size={18} />}
              title="استيراد من Excel"
            >
              استيراد
            </Button>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            variant="primary"
            icon={<Plus size={20} />}
          >
            إضافة نقابة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-1">إجمالي النقابات</p>
          <p className="text-3xl font-bold text-blue-900">{unions.length}</p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-sm text-green-700 font-medium mb-1">النقابات النشطة</p>
          <p className="text-3xl font-bold text-green-900">
            {unions.filter((u) => u.status === 'نشط').length}
          </p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm text-purple-700 font-medium mb-1">نقابات مهنية</p>
          <p className="text-3xl font-bold text-purple-900">
            {unions.filter((u) => u.type === 'مهنية').length}
          </p>
        </Card>
        <Card padding="md" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-sm text-orange-700 font-medium mb-1">نقابات عمالية</p>
          <p className="text-3xl font-bold text-orange-900">
            {unions.filter((u) => u.type === 'عمالية').length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            placeholder="بحث بالاسم أو الرقم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} />}
          />

          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'الكل', label: 'جميع الأنواع' },
              { value: 'عمالية', label: 'عمالية' },
              { value: 'مهنية', label: 'مهنية' },
              { value: 'أصحاب أعمال', label: 'أصحاب أعمال' },
            ]}
          />

          <Select
            value={filterProvince}
            onChange={(e) => setFilterProvince(e.target.value)}
            options={[
              { value: 'الكل', label: 'جميع المحافظات' },
              ...provinces.map((p) => ({ value: p, label: p })),
            ]}
          />

          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'الكل', label: 'جميع الحالات' },
              { value: 'نشط', label: 'نشط' },
              { value: 'موقف', label: 'موقف' },
              { value: 'محذوف', label: 'محذوف' },
            ]}
          />

        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : filteredUnions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">لا توجد نقابات</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto" id="unions-table">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">رقم المنظمة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الاسم العربي</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">النوع</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الهيكل</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">المحافظة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الحالة</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUnions.map((union) => (
                    <tr key={union.unionNumber} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800 font-mono">{union.unionNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-semibold">{union.nameAr}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{union.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{union.structure}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{union.province}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            union.status === 'نشط'
                              ? 'bg-green-100 text-green-800'
                              : union.status === 'موقف'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {union.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(union)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(union)}
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
                عرض {filteredUnions.length} من {unions.length} نقابة
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
          title={editingUnion ? 'تعديل نقابة' : 'إضافة نقابة جديدة'}
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
                {editingUnion ? 'تحديث' : 'حفظ'}
              </Button>
            </>
          }
        >
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-4">
              {[
                { id: 'basic', label: 'المعلومات الأساسية' },
                { id: 'contact', label: 'بيانات الاتصال' },
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
            {selectedTab === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="رقم المنظمة"
                  value={formData.unionNumber || ''}
                  onChange={(e) => handleInputChange('unionNumber', e.target.value)}
                  placeholder="YE-2024-001"
                  required
                  error={formErrors.unionNumber}
                  disabled={!!editingUnion}
                />
                <Input
                  label="الاسم العربي"
                  value={formData.nameAr || ''}
                  onChange={(e) => handleInputChange('nameAr', e.target.value)}
                  required
                  error={formErrors.nameAr}
                />
                <Input
                  label="الاسم الإنجليزي"
                  value={formData.nameEn || ''}
                  onChange={(e) => handleInputChange('nameEn', e.target.value)}
                  required
                  error={formErrors.nameEn}
                />
                <Select
                  label="النوع"
                  value={formData.type || ''}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  options={[
                    { value: 'عمالية', label: 'عمالية' },
                    { value: 'مهنية', label: 'مهنية' },
                    { value: 'أصحاب أعمال', label: 'أصحاب أعمال' },
                  ]}
                  required
                  error={formErrors.type}
                />
                <Select
                  label="الهيكل"
                  value={formData.structure || ''}
                  onChange={(e) => handleInputChange('structure', e.target.value)}
                  options={[
                    { value: 'نقابة', label: 'نقابة' },
                    { value: 'اتحاد', label: 'اتحاد' },
                    { value: 'جمعية', label: 'جمعية' },
                  ]}
                  required
                  error={formErrors.structure}
                />
                <Input
                  label="تاريخ التأسيس"
                  type="date"
                  value={formData.establishDate || ''}
                  onChange={(e) => handleInputChange('establishDate', e.target.value)}
                  required
                  error={formErrors.establishDate}
                />
                <Select
                  label="المحافظة"
                  value={formData.province || ''}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  options={provinces.map((p) => ({ value: p, label: p }))}
                  required
                  error={formErrors.province}
                />
                <Select
                  label="الحالة"
                  value={formData.status || 'نشط'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={[
                    { value: 'نشط', label: 'نشط' },
                    { value: 'موقف', label: 'موقف' },
                  ]}
                  required
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
                  label="الهاتف"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="777123456"
                  error={formErrors.phone}
                />
                <Input
                  label="البريد الإلكتروني"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="union@example.com"
                  error={formErrors.email}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
