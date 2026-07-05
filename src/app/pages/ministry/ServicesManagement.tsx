import { useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';

const services = [
  { code: '423.03.01', name: 'ترخيص نشاط جديد', category: 'التراخيص' },
  { code: '423.03.02', name: 'تجديد ترخيص نشاط', category: 'التراخيص' },
  { code: '423.03.03', name: 'شهادة عضوية', category: 'الشهادات' },
  { code: '423.03.04', name: 'موافقة انتخابات', category: 'الموافقات' },
  { code: '423.03.05', name: 'دعم مالي', category: 'الدعم' },
];

const mockRequests = [
  {
    id: 1,
    requestNumber: 'REQ-2026-001',
    service: 'ترخيص نشاط جديد',
    union: 'نقابة المهندسين',
    date: '2026-04-25',
    status: 'قيد الإنجاز',
    assignedTo: 'أحمد محمد',
  },
  {
    id: 2,
    requestNumber: 'REQ-2026-002',
    service: 'شهادة عضوية',
    union: 'نقابة الأطباء',
    date: '2026-04-22',
    status: 'منجزة',
    assignedTo: 'فاطمة علي',
    completionDate: '2026-04-24',
  },
  {
    id: 3,
    requestNumber: 'REQ-2026-003',
    service: 'موافقة انتخابات',
    union: 'نقابة المعلمين',
    date: '2026-04-28',
    status: 'معلقة',
  },
  {
    id: 4,
    requestNumber: 'REQ-2026-004',
    service: 'دعم مالي',
    union: 'نقابة عمال البناء',
    date: '2026-04-20',
    status: 'مرفوضة',
    assignedTo: 'خالد حسن',
    rejectionReason: 'لا يستوفي الشروط المطلوبة',
  },
];

export function ServicesManagement() {
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);

  const filteredRequests = mockRequests.filter(
    (req) => selectedStatus === 'الكل' || req.status === selectedStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'منجزة':
        return 'bg-green-100 text-green-800';
      case 'مرفوضة':
        return 'bg-red-100 text-red-800';
      case 'قيد الإنجاز':
        return 'bg-blue-100 text-blue-800';
      case 'معلقة':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الخدمات والطلبات</h1>
          <p className="text-sm text-gray-600 mt-1">متابعة وإدارة طلبات الخدمات (47 خدمة)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowServicesModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-md"
          >
            <Briefcase size={20} />
            <span>قائمة الخدمات</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1E3A8A] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-md"
          >
            <Plus size={20} />
            <span>طلب جديد</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">إجمالي الطلبات</p>
          <p className="text-2xl font-bold text-gray-800">{mockRequests.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">منجزة</p>
          <p className="text-2xl font-bold text-green-600">
            {mockRequests.filter((r) => r.status === 'منجزة').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">قيد الإنجاز</p>
          <p className="text-2xl font-bold text-blue-600">
            {mockRequests.filter((r) => r.status === 'قيد الإنجاز').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">معلقة</p>
          <p className="text-2xl font-bold text-orange-600">
            {mockRequests.filter((r) => r.status === 'معلقة').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">مرفوضة</p>
          <p className="text-2xl font-bold text-red-600">
            {mockRequests.filter((r) => r.status === 'مرفوضة').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex gap-2">
          {['الكل', 'معلقة', 'قيد الإنجاز', 'منجزة', 'مرفوضة'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedStatus === status
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">رقم الطلب</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الخدمة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">النقابة</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">التاريخ</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">المسند إليه</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-800 font-mono">{request.requestNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-800 font-semibold">{request.service}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.union}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.assignedTo || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Services List Modal */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">قائمة الخدمات المتاحة</h2>
              <button
                onClick={() => setShowServicesModal(false)}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.code} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{service.name}</p>
                        <p className="text-xs text-gray-600 mt-1">الرمز: {service.code}</p>
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                        {service.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
