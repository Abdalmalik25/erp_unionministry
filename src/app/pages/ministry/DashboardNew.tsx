import { useEffect, useState } from 'react';
import { Users, FileText, Clock, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, StatsCard } from '../../components/ui/Card';
import { useUnions, useMembers, useServiceRequests } from '../../hooks/useApi';

const monthlyData = [
  { id: 'oct', month: 'أكتوبر', unions: 45 },
  { id: 'nov', month: 'نوفمبر', unions: 52 },
  { id: 'dec', month: 'ديسمبر', unions: 58 },
  { id: 'jan', month: 'يناير', unions: 65 },
  { id: 'feb', month: 'فبراير', unions: 70 },
  { id: 'mar', month: 'مارس', unions: 78 },
];

const unionTypeData = [
  { id: 'worker', name: 'عمالية', value: 42, color: '#3B82F6' },
  { id: 'professional', name: 'مهنية', value: 28, color: '#8B5CF6' },
  { id: 'business', name: 'أصحاب أعمال', value: 8, color: '#10B981' },
];

export function MinistryDashboard() {
  const { data: unionsData, getAll: getAllUnions } = useUnions();
  const { data: membersData, getAll: getAllMembers } = useMembers();
  const { data: requestsData, getAll: getAllRequests } = useServiceRequests();

  const [stats, setStats] = useState({
    totalUnions: 0,
    activeMembers: 0,
    pendingRequests: 0,
    overdueRequests: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [unions, members, requests] = await Promise.all([
        getAllUnions(),
        getAllMembers(),
        getAllRequests(),
      ]);

      setStats({
        totalUnions: unions?.unions?.length || 0,
        activeMembers: members?.members?.length || 0,
        pendingRequests: requests?.requests?.filter((r: any) => r.status === 'pending').length || 0,
        overdueRequests: requests?.requests?.filter((r: any) => r.status === 'overdue').length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="النقابات"
          value={stats.totalUnions}
          icon={<Users size={24} />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          trend={{ value: '+8 هذا الشهر', isPositive: true }}
        />

        <StatsCard
          title="الأعضاء"
          value={stats.activeMembers.toLocaleString()}
          icon={<Users size={24} />}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          trend={{ value: '+320 هذا الشهر', isPositive: true }}
        />

        <StatsCard
          title="الطلبات المعلقة"
          value={stats.pendingRequests}
          icon={<Clock size={24} />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          trend={{ value: `${stats.overdueRequests} متأخرة`, isPositive: false }}
        />

        <StatsCard
          title="الأنشطة هذا الشهر"
          value="18"
          icon={<Activity size={24} />}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          trend={{ value: '+3 عن الشهر الماضي', isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            تطور عدد النقابات (آخر 6 أشهر)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <defs>
                <linearGradient id="colorUnions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="id" stroke="#6B7280" style={{ fontSize: '12px' }} tickFormatter={(value) => {
                const item = monthlyData.find(d => d.id === value);
                return item ? item.month : value;
              }} />
              <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelFormatter={(value) => {
                  const item = monthlyData.find(d => d.id === value);
                  return item ? item.month : value;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="unions"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 7 }}
                fill="url(#colorUnions)"
                name="عدد النقابات"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart */}
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            توزيع النقابات حسب النوع
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={unionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="id"
              >
                {unionTypeData.map((entry, index) => (
                  <Cell key={`cell-${entry.id}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-bold text-gray-800 mb-4">الإجراءات السريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-200 text-center group border border-blue-200">
            <Users className="mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" size={28} />
            <p className="text-sm font-semibold text-gray-800">إضافة نقابة</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all duration-200 text-center group border border-green-200">
            <FileText className="mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" size={28} />
            <p className="text-sm font-semibold text-gray-800">مراجعة وثيقة</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl transition-all duration-200 text-center group border border-purple-200">
            <Activity className="mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" size={28} />
            <p className="text-sm font-semibold text-gray-800">تسجيل نشاط</p>
          </button>
          <button className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl transition-all duration-200 text-center group border border-orange-200">
            <AlertCircle className="mx-auto mb-2 text-orange-600 group-hover:scale-110 transition-transform" size={28} />
            <p className="text-sm font-semibold text-gray-800">الطلبات المعلقة</p>
          </button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" />
          النشاط الأخير
        </h3>
        <div className="space-y-3">
          {[
            { id: 'act-1', action: 'تم إضافة نقابة جديدة', name: 'نقابة الصحفيين', time: 'منذ ساعتين', type: 'success' },
            { id: 'act-2', action: 'تمت الموافقة على وثيقة', name: 'محضر اجتماع الهيئة', time: 'منذ 4 ساعات', type: 'info' },
            { id: 'act-3', action: 'طلب خدمة جديد', name: 'ترخيص نشاط تدريبي', time: 'منذ 6 ساعات', type: 'warning' },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  item.type === 'success' ? 'bg-green-500' :
                  item.type === 'info' ? 'bg-blue-500' : 'bg-orange-500'
                }`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.action}</p>
                  <p className="text-xs text-gray-600">{item.name}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
