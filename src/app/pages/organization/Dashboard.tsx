import { Users, Activity, DollarSign, FileCheck, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlyActivities = [
  { month: 'يناير', activities: 3 },
  { month: 'فبراير', activities: 5 },
  { month: 'مارس', activities: 4 },
  { month: 'أبريل', activities: 6 },
];

const upcomingActivities = [
  { id: 1, name: 'ورشة عمل حول السلامة المهنية', date: '2026-05-15', location: 'صنعاء', participants: 50 },
  { id: 2, name: 'اجتماع الهيئة الإدارية', date: '2026-05-20', location: 'مقر النقابة', participants: 15 },
  { id: 3, name: 'حملة توعية صحية', date: '2026-05-25', location: 'عدن', participants: 120 },
];

const pendingRequests = [
  { id: 1, service: 'طلب ترخيص نشاط تدريبي', status: 'قيد الإنجاز', date: '2026-04-20' },
  { id: 2, service: 'شهادة تسجيل أعضاء جدد', status: 'معلقة', date: '2026-04-22' },
  { id: 3, service: 'طلب موافقة انتخابات', status: 'قيد الإنجاز', date: '2026-04-25' },
];

export function OrganizationDashboard() {
  return (
    <div className="space-y-6">
      {/* Organization Info Banner */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">نقابة المهندسين اليمنية</h2>
            <p className="text-blue-100">رقم المنظمة: YE-2024-001 • تاريخ التأسيس: 1990-01-15</p>
            <p className="text-blue-100 mt-1">النشاط الاقتصادي: الخدمات المهنية والعلمية والتقنية</p>
          </div>
          <div className="text-left">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <p className="text-sm text-blue-100">النوع</p>
              <p className="text-xl font-bold">نقابة مهنية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-[#1E3A8A]" size={24} />
            </div>
            <span className="text-xs text-gray-500">الأعضاء</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">1,245</h3>
          <p className="text-sm text-gray-600">عضو نشط</p>
          <div className="mt-3 flex items-center gap-1 text-green-600 text-xs">
            <TrendingUp size={14} />
            <span>+45 هذا الشهر</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="text-purple-600" size={24} />
            </div>
            <span className="text-xs text-gray-500">الأنشطة</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">18</h3>
          <p className="text-sm text-gray-600">نشاط هذا العام</p>
          <div className="mt-3 flex items-center gap-1 text-purple-600 text-xs">
            <Calendar size={14} />
            <span>3 قادمة</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="text-[#10B981]" size={24} />
            </div>
            <span className="text-xs text-gray-500">الرصيد المالي</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">2.8M</h3>
          <p className="text-sm text-gray-600">ريال يمني</p>
          <div className="mt-3 flex items-center gap-1 text-green-600 text-xs">
            <TrendingUp size={14} />
            <span>حساب نشط</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <FileCheck className="text-orange-600" size={24} />
            </div>
            <span className="text-xs text-gray-500">الوثائق</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">42</h3>
          <p className="text-sm text-gray-600">وثيقة معتمدة</p>
          <div className="mt-3 flex items-center gap-1 text-orange-600 text-xs">
            <FileCheck size={14} />
            <span>2 قيد المراجعة</span>
          </div>
        </div>
      </div>

      {/* Activities Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          الأنشطة المنفذة (آخر 4 أشهر)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyActivities}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="activities" fill="#1E3A8A" name="عدد الأنشطة" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Activities */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            الأنشطة القادمة
          </h3>
          <div className="space-y-3">
            {upcomingActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100"
              >
                <p className="font-semibold text-sm text-gray-800 mb-2">
                  {activity.name}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>📅 {activity.date}</span>
                  <span>📍 {activity.location}</span>
                  <span>👥 {activity.participants} مشارك</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileCheck size={20} />
            طلبات الخدمات المعلقة
          </h3>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">
                    {request.service}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{request.date}</p>
                </div>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    request.status === 'قيد الإنجاز'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {request.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">الإجراءات السريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center">
            <Users className="mx-auto mb-2 text-[#1E3A8A]" size={24} />
            <p className="text-sm font-semibold text-gray-800">إضافة عضو</p>
          </button>
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center">
            <Activity className="mx-auto mb-2 text-purple-600" size={24} />
            <p className="text-sm font-semibold text-gray-800">نشاط جديد</p>
          </button>
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center">
            <FileCheck className="mx-auto mb-2 text-green-600" size={24} />
            <p className="text-sm font-semibold text-gray-800">رفع وثيقة</p>
          </button>
          <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-center">
            <Calendar className="mx-auto mb-2 text-orange-600" size={24} />
            <p className="text-sm font-semibold text-gray-800">طلب خدمة</p>
          </button>
        </div>
      </div>
    </div>
  );
}
