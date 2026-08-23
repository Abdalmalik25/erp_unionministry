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
    <div className="min-h-screen bg-gradient-to-br from-info/10 to-gold/10 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-2xl w-full bg-card rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-bright to-primary-dark rounded-2xl mx-auto flex items-center justify-center mb-4">
            <UserPlus className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-heading mb-2">
            إنشاء المستخدمين التجريبيين
          </h1>
          <p className="text-muted-foreground">
            للاختبار والتطوير فقط - يجب حذف هذه الصفحة في الإنتاج
          </p>
        </div>

        {!success ? (
          <div className="space-y-4">
            <button
              onClick={createUsers}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-bright to-primary-dark text-white py-4 rounded-xl font-bold text-lg hover:from-primary hover:to-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
              className="w-full bg-gradient-to-r from-success to-success text-white py-4 rounded-xl font-bold text-lg hover:from-success-dark hover:to-success-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إضافة البيانات الأولية (نقابات + أعضاء)
            </button>

            {error && (
              <div className="bg-error/10 border-2 border-error/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-error flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-error">حدث خطأ</p>
                  <p className="text-sm text-error mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-info/10 border-2 border-info/30 rounded-xl p-6 mt-6">
              <h3 className="font-bold text-info-dark mb-3 flex items-center gap-2">
                <UserPlus size={18} />
                المستخدمون التجريبيون
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-card rounded-lg p-3">
                  <p className="font-semibold text-heading">1. مستخدم الوزارة</p>
                  <p className="text-muted-foreground mt-1">البريد: ministry@yemen.gov.ye</p>
                  <p className="text-muted-foreground">كلمة المرور: Ministry@2026</p>
                  <p className="text-xs text-primary-bright mt-1">الوصول: جميع الصلاحيات الإدارية</p>
                </div>

                <div className="bg-card rounded-lg p-3">
                  <p className="font-semibold text-heading">2. مستخدم النقابة</p>
                  <p className="text-muted-foreground mt-1">البريد: engineers@union.ye</p>
                  <p className="text-muted-foreground">كلمة المرور: Engineers@2026</p>
                  <p className="text-xs text-gold-dark mt-1">الوصول: نقابة المهندسين (YE-2024-001)</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-success/10 border-2 border-success/30 rounded-xl p-6 text-center">
              <CheckCircle className="text-success-dark mx-auto mb-3" size={48} />
              <h2 className="text-2xl font-bold text-success-dark mb-2">
                تم إنشاء المستخدمين بنجاح! ✨
              </h2>
              <p className="text-success-dark">
                يمكنك الآن تسجيل الدخول باستخدام أحد الحسابات التالية
              </p>
            </div>

            <div className="space-y-3">
              {users.map((user, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-info/10 to-gold/10 rounded-xl p-5 border-2 border-info/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-heading mb-1">{user.name}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <span className="font-semibold">الدور:</span> {user.role}
                      </p>
                      <div className="bg-card rounded-lg p-3 space-y-1">
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">البريد الإلكتروني:</span>{' '}
                          <span className="text-primary-bright font-mono">{user.email}</span>
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold text-foreground">كلمة المرور:</span>{' '}
                          <span className="text-gold-dark font-mono font-bold">{user.password}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-primary-bright to-primary-dark text-white py-4 rounded-xl font-bold text-lg hover:from-primary hover:to-primary-dark transition-all"
            >
              الانتقال إلى صفحة تسجيل الدخول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
