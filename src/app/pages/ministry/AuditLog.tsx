import { useState } from 'react';
import { FileSearch, Filter, Download } from 'lucide-react';

const mockAuditLogs = [
  {
    id: 1,
    user: 'أحمد محمد (وكيل الوزارة)',
    operation: 'إضافة',
    table: 'النقابات',
    recordId: 'YE-2026-005',
    oldData: null,
    newData: { name: 'نقابة الصحفيين', type: 'مهنية' },
    ip: '192.168.1.10',
    timestamp: '2026-04-30 10:30:15',
  },
  {
    id: 2,
    user: 'فاطمة علي (مختص أول)',
    operation: 'تعديل',
    table: 'الأعضاء',
    recordId: '01011234567',
    oldData: { status: 'نشط' },
    newData: { status: 'موقف' },
    ip: '192.168.1.25',
    timestamp: '2026-04-30 09:15:42',
  },
  {
    id: 3,
    user: 'خالد حسن (مدير إدارة)',
    operation: 'عرض',
    table: 'الوثائق',
    recordId: 'DOC-2026-003',
    oldData: null,
    newData: null,
    ip: '192.168.1.18',
    timestamp: '2026-04-30 08:45:20',
  },
  {
    id: 4,
    user: 'سارة محمود (مراجع)',
    operation: 'موافقة',
    table: 'الوثائق',
    recordId: 'DOC-2026-001',
    oldData: { status: 'قيد المراجعة' },
    newData: { status: 'معتمدة' },
    ip: '192.168.1.32',
    timestamp: '2026-04-29 16:20:10',
  },
  {
    id: 5,
    user: 'محمد عبدالله (مدير مكتب)',
    operation: 'حذف',
    table: 'الأنشطة',
    recordId: 'ACT-2026-004',
    oldData: { name: 'ورشة ملغاة', status: 'ملغاة' },
    newData: null,
    ip: '192.168.1.45',
    timestamp: '2026-04-29 14:10:30',
  },
];

export function AuditLog() {
  const [filterUser, setFilterUser] = useState('الكل');
  const [filterOperation, setFilterOperation] = useState('الكل');
  const [filterTable, setFilterTable] = useState('الكل');
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-04-30');

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesUser = filterUser === 'الكل' || log.user.includes(filterUser);
    const matchesOperation = filterOperation === 'الكل' || log.operation === filterOperation;
    const matchesTable = filterTable === 'الكل' || log.table === filterTable;
    return matchesUser && matchesOperation && matchesTable;
  });

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'إضافة':
        return 'bg-green-100 text-green-800';
      case 'تعديل':
        return 'bg-blue-100 text-blue-800';
      case 'حذف':
        return 'bg-red-100 text-red-800';
      case 'عرض':
        return 'bg-gray-100 text-gray-800';
      case 'موافقة':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">سجل التدقيق</h1>
          <p className="text-sm text-gray-600 mt-1">
            سجل شامل لجميع العمليات المنفذة في النظام (قراءة فقط)
          </p>
        </div>
        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md">
          <Download size={20} />
          <span>تصدير السجل</span>
        </button>
      </div>

      {/* Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
        <FileSearch className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-yellow-800">تنويه أمني</p>
          <p className="text-sm text-yellow-700 mt-1">
            لا يمكن حذف أو تعديل أي سجل في سجل التدقيق. جميع البيانات محفوظة بشكل دائم للمراجعة والتدقيق.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Filter size={18} />
          تصفية السجلات
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">المستخدم</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option>الكل</option>
              <option>أحمد محمد</option>
              <option>فاطمة علي</option>
              <option>خالد حسن</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">نوع العملية</label>
            <select
              value={filterOperation}
              onChange={(e) => setFilterOperation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option>الكل</option>
              <option>إضافة</option>
              <option>تعديل</option>
              <option>حذف</option>
              <option>عرض</option>
              <option>موافقة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">الجدول</label>
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option>الكل</option>
              <option>النقابات</option>
              <option>الأعضاء</option>
              <option>الوثائق</option>
              <option>الأنشطة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-xs text-gray-600">إجمالي السجلات</p>
          <p className="text-xl font-bold text-gray-800">{mockAuditLogs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-xs text-gray-600">عمليات إضافة</p>
          <p className="text-xl font-bold text-green-600">
            {mockAuditLogs.filter((l) => l.operation === 'إضافة').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-xs text-gray-600">عمليات تعديل</p>
          <p className="text-xl font-bold text-blue-600">
            {mockAuditLogs.filter((l) => l.operation === 'تعديل').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-xs text-gray-600">عمليات حذف</p>
          <p className="text-xl font-bold text-red-600">
            {mockAuditLogs.filter((l) => l.operation === 'حذف').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-xs text-gray-600">عمليات عرض</p>
          <p className="text-xl font-bold text-gray-600">
            {mockAuditLogs.filter((l) => l.operation === 'عرض').length}
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">المستخدم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">العملية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">الجدول</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">معرف السجل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">البيانات القديمة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">البيانات الجديدة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">IP</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-800">{log.user}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getOperationColor(log.operation)}`}>
                      {log.operation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-semibold">{log.table}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{log.recordId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {log.oldData ? <code className="bg-gray-100 px-2 py-1 rounded">{JSON.stringify(log.oldData)}</code> : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {log.newData ? <code className="bg-gray-100 px-2 py-1 rounded">{JSON.stringify(log.newData)}</code> : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{log.ip}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">عرض {filteredLogs.length} من {mockAuditLogs.length} سجل</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">السابق</button>
            <button className="px-3 py-1 bg-[#1E3A8A] text-white rounded-lg text-sm">1</button>
            <button className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm">التالي</button>
          </div>
        </div>
      </div>
    </div>
  );
}
