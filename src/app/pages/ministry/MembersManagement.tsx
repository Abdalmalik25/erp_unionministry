import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Download, Upload } from 'lucide-react';

const mockMembers = [
  {
    id: 1,
    nationalId: '01011234567',
    fullName: 'أحمد محمد علي',
    gender: 'ذكر',
    birthDate: '1985-03-15',
    union: 'نقابة المهندسين',
    profession: 'مهندس مدني',
    joinDate: '2020-01-10',
    status: 'نشط',
    phone: '777123456',
  },
  {
    id: 2,
    nationalId: '01021234567',
    fullName: 'فاطمة أحمد حسن',
    gender: 'أنثى',
    birthDate: '1990-07-22',
    union: 'نقابة الأطباء',
    profession: 'طبيبة',
    joinDate: '2019-05-15',
    status: 'نشط',
    phone: '777234567',
  },
  {
    id: 3,
    nationalId: '01031234567',
    fullName: 'محمد صالح عبدالله',
    gender: 'ذكر',
    birthDate: '1982-11-08',
    union: 'نقابة عمال البناء',
    profession: 'عامل بناء',
    joinDate: '2018-03-20',
    status: 'نشط',
    phone: '777345678',
  },
  {
    id: 4,
    nationalId: '01041234567',
    fullName: 'سارة علي محمد',
    gender: 'أنثى',
    birthDate: '1995-02-18',
    union: 'نقابة المحامين',
    profession: 'محامية',
    joinDate: '2021-09-01',
    status: 'نشط',
    phone: '777456789',
  },
  {
    id: 5,
    nationalId: '01051234567',
    fullName: 'خالد حسين أحمد',
    gender: 'ذكر',
    birthDate: '1988-06-25',
    union: 'نقابة المعلمين',
    profession: 'معلم',
    joinDate: '2017-02-14',
    status: 'موقف',
    phone: '777567890',
  },
];

export function MembersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnion, setFilterUnion] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('personal');

  const filteredMembers = mockMembers.filter((member) => {
    const matchesSearch =
      member.fullName.includes(searchTerm) ||
      member.nationalId.includes(searchTerm) ||
      member.phone.includes(searchTerm);
    const matchesUnion = filterUnion === 'الكل' || member.union === filterUnion;
    const matchesStatus = filterStatus === 'الكل' || member.status === filterStatus;
    return matchesSearch && matchesUnion && matchesStatus;
  });

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
          <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md">
            <Upload size={20} />
            <span>استيراد Excel</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1E3A8A] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-md"
          >
            <Plus size={20} />
            <span>إضافة عضو</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم الوطني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>

          <select
            value={filterUnion}
            onChange={(e) => setFilterUnion(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="الكل">جميع النقابات</option>
            <option value="نقابة المهندسين">نقابة المهندسين</option>
            <option value="نقابة الأطباء">نقابة الأطباء</option>
            <option value="نقابة المعلمين">نقابة المعلمين</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="الكل">جميع الحالات</option>
            <option value="نشط">نشط</option>
            <option value="موقف">موقف</option>
            <option value="مفصول">مفصول</option>
            <option value="متوفى">متوفى</option>
          </select>

          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download size={20} />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">إجمالي الأعضاء</p>
          <p className="text-2xl font-bold text-gray-800">{mockMembers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">الأعضاء النشطين</p>
          <p className="text-2xl font-bold text-green-600">
            {mockMembers.filter((m) => m.status === 'نشط').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">ذكور</p>
          <p className="text-2xl font-bold text-blue-600">
            {mockMembers.filter((m) => m.gender === 'ذكر').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">إناث</p>
          <p className="text-2xl font-bold text-pink-600">
            {mockMembers.filter((m) => m.gender === 'أنثى').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الرقم الوطني</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الاسم الكامل</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الجنس</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">النقابة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">المهنة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">تاريخ الانتساب</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الحالة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-800 font-mono">{member.nationalId}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 font-semibold">{member.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.gender}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.union}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.profession}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.joinDate}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
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

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            عرض {filteredMembers.length} من {mockMembers.length} عضو
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">السابق</button>
            <button className="px-3 py-1 bg-[#1E3A8A] text-white rounded-lg text-sm">1</button>
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">التالي</button>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-[#1E3A8A] text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">إضافة عضو جديد</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-gray-200 px-6">
              <div className="flex gap-4">
                {['personal', 'contact', 'membership'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`py-3 px-4 border-b-2 transition-colors ${
                      selectedTab === tab
                        ? 'border-[#1E3A8A] text-[#1E3A8A] font-semibold'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'personal'
                      ? 'البيانات الشخصية'
                      : tab === 'contact'
                      ? 'بيانات الاتصال والعمل'
                      : 'بيانات العضوية'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {selectedTab === 'personal' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الرقم الوطني</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="01011234567" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم الكامل</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الجنس</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>ذكر</option>
                      <option>أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الميلاد</label>
                    <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">بلد الميلاد</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" defaultValue="اليمن" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">محافظة الميلاد</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>صنعاء</option>
                      <option>عدن</option>
                      <option>تعز</option>
                    </select>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">المهنة</label>
                    <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">جهة العمل</label>
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

              {selectedTab === 'membership' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">النقابة</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>نقابة المهندسين</option>
                      <option>نقابة الأطباء</option>
                      <option>نقابة المعلمين</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الانتساب</label>
                    <input type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الحالة</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option>نشط</option>
                      <option>موقف</option>
                      <option>مفصول</option>
                      <option>متوفى</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

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
