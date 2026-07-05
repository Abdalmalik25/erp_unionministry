/**
 * صفحة إنشاء المستخدمين التجريبيين
 * للاختبار فقط - يجب حذفها في الإنتاج
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export function CreateDemoUsers() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const navigate = useNavigate();

  const createUsers = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${API_BASE}/auth/create-demo-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setUsers(data.users);
      } else {
        setError(data.error || 'حدث خطأ أثناء إنشاء المستخدمين');
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const initData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/init-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('تم إضافة البيانات الأولية بنجاح!');
      } else {
        setError(data.error || 'حدث خطأ أثناء إضافة البيانات');
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <UserPlus className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            إنشاء المستخدمين التجريبيين
          </h1>
          <p className="text-gray-600">
            للاختبار والتطوير فقط - يجب حذف هذه الصفحة في الإنتاج
          </p>
        </div>

        {!success ? (
          <div className="space-y-4">
            <button
              onClick={createUsers}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={24} />
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <UserPlus size={24} />
                  <span>إنشاء المستخدمين التجريبيين</span>
                </>
              )}
            </button>

            <button
              onClick={initData}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إضافة البيانات الأولية (نقابات + أعضاء)
            </button>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-800">حدث خطأ</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-6">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <UserPlus size={18} />
                المستخدمون التجريبيون
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="font-semibold text-gray-800">1. مستخدم الوزارة</p>
                  <p className="text-gray-600 mt-1">البريد: ministry@yemen.gov.ye</p>
                  <p className="text-gray-600">كلمة المرور: Ministry@2026</p>
                  <p className="text-xs text-blue-600 mt-1">الوصول: جميع الصلاحيات الإدارية</p>
                </div>

                <div className="bg-white rounded-lg p-3">
                  <p className="font-semibold text-gray-800">2. مستخدم النقابة</p>
                  <p className="text-gray-600 mt-1">البريد: engineers@union.ye</p>
                  <p className="text-gray-600">كلمة المرور: Engineers@2026</p>
                  <p className="text-xs text-purple-600 mt-1">الوصول: نقابة المهندسين (YE-2024-001)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <CheckCircle className="text-green-600 mx-auto mb-3" size={48} />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                تم إنشاء المستخدمين بنجاح! ✨
              </h2>
              <p className="text-green-700">
                يمكنك الآن تسجيل الدخول باستخدام أحد الحسابات التالية
              </p>
            </div>

            <div className="space-y-3">
              {users.map((user, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border-2 border-blue-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-gray-800 mb-1">{user.name}</p>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">الدور:</span> {user.role}
                      </p>
                      <div className="bg-white rounded-lg p-3 space-y-1">
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">البريد الإلكتروني:</span>{' '}
                          <span className="text-blue-600 font-mono">{user.email}</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-gray-700">كلمة المرور:</span>{' '}
                          <span className="text-purple-600 font-mono font-bold">{user.password}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              الانتقال إلى صفحة تسجيل الدخول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
