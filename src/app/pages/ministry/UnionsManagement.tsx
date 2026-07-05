import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Download } from 'lucide-react';

const mockUnions = [
  {
    id: 1,
    unionNumber: 'YE-2024-001',
    nameAr: 'نقابة المهندسين اليمنية',
    nameEn: 'Yemen Engineers Syndicate',
    type: 'مهنية',
    structure: 'اتحاد',
    establishDate: '1990-01-15',
    province: 'صنعاء',
    members: 1245,
    status: 'نشط',
  },
  {
    id: 2,
    unionNumber: 'YE-2024-002',
    nameAr: 'نقابة عمال البناء',
    nameEn: 'Construction Workers Union',
    type: 'عمالية',
    structure: 'نقابة',
    establishDate: '1995-03-20',
    province: 'عدن',
    members: 2340,
    status: 'نشط',
  },
  {
    id: 3,
    unionNumber: 'YE-2024-003',
    nameAr: 'نقابة التجار',
    nameEn: 'Merchants Union',
    type: 'أصحاب أعمال',
    structure: 'جمعية',
    establishDate: '2000-06-10',
    province: 'تعز',
    members: 890,
    status: 'نشط',
  },
  {
    id: 4,
    unionNumber: 'YE-2024-004',
    nameAr: 'نقابة الأطباء',
    nameEn: 'Doctors Syndicate',
    type: 'مهنية',
    structure: 'اتحاد',
    establishDate: '1985-11-05',
    province: 'صنعاء',
    members: 3200,
    status: 'نشط',
  },
  {
    id: 5,
    unionNumber: 'YE-2024-005',
    nameAr: 'نقابة المعلمين',
    nameEn: 'Teachers Union',
    type: 'مهنية',
    structure: 'نقابة',
    establishDate: '1980-09-01',
    province: 'حضرموت',
    members: 5600,
    status: 'موقف',
  },
];

export function UnionsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('الكل');
  const [filterProvince, setFilterProvince] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('basic');

  const filteredUnions = mockUnions.filter((union) => {
    const matchesSearch =
      union.nameAr.includes(searchTerm) ||
      union.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      union.unionNumber.includes(searchTerm);
    const matchesType = filterType === 'الكل' || union.type === filterType;
    const matchesProvince = filterProvince === 'الكل' || union.province === filterProvince;
    return matchesSearch && matchesType && matchesProvince;
  });

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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#1E3A8A] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-md"
        >
          <Plus size={20} />
          <span>إضافة نقابة جديدة</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="الكل">جميع الأنواع</option>
            <option value="عمالية">عمالية</option>
            <option value="مهنية">مهنية</option>
            <option value="أصحاب أعمال">أصحاب أعمال</option>
          </select>

          <select
            value={filterProvince}
            onChange={(e) => setFilterProvince(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="الكل">جميع المحافظات</option>
            <option value="صنعاء">صنعاء</option>
            <option value="عدن">عدن</option>
            <option value="تعز">تعز</option>
            <option value="حضرموت">حضرموت</option>
          </select>

          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download size={20} />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">رقم المنظمة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الاسم العربي</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">النوع</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الهيكل</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">المحافظة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">عدد الأعضاء</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUnions.map((union) => (
                <tr key={union.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-800 font-mono">{union.unionNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 font-semibold">{union.nameAr}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{union.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{union.structure}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{union.province}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{union.members.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        union.status === 'نشط'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {union.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="تعديل">
                        <Edit size={18} />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            عرض {filteredUnions.length} من {mockUnions.length} نقابة
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">السابق</button>
            <button className="px-3 py-1 bg-[#1E3A8A] text-white rounded-lg text-sm">1</button>
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">2</button>
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">التالي</button>
          </div>
        </div>
      </div>

      {/* Add Union Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1E3A8A] text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">إضافة نقابة جديدة</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <div className="flex gap-4">
                {['basic', 'contact', 'financial', 'files', 'structure'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`py-3 px-4 border-b-2 transition-colors ${
                      selectedTab === tab
                        ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'basic'
                      ? 'المعلومات الأساسية'
                      : tab === 'contact'
                      ? 'بيانات الاتصال'
                      : tab === 'financial'
                      ? 'المعلومات المالية'
                      : tab === 'files'
                      ? 'الملفات'
                      : 'الهيكل التنظيمي'}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {selectedTab === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رقم المنظمة</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="YE-2024-XXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم العربي</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الإنجليزي</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">النشاط الاقتصادي</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>الخدمات المهنية والعلمية والتقنية</option>
                      <option>التشييد والبناء</option>
                      <option>الصناعات التحويلية</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">النوع</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>عمالية</option>
                      <option>مهنية</option>
                      <option>أصحاب أعمال</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الهيكل</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>نقابة</option>
                      <option>اتحاد</option>
                      <option>جمعية</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ التأسيس</label>
                    <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الإشهار</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              )}

              {selectedTab === 'contact' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">العنوان</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المحافظة</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>صنعاء</option>
                      <option>عدن</option>
                      <option>تعز</option>
                      <option>حضرموت</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المديرية</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الهاتف</label>
                    <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                    <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              )}

              {selectedTab === 'financial' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رسوم الانتساب (ريال)</label>
                    <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاشتراك الشهري (ريال)</label>
                    <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                إلغاء
              </button>
              <button className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg hover:bg-blue-800 transition-colors">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
