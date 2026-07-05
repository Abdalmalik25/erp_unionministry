import { useState } from 'react';
import { User, Mail, Shield, Bell, Moon, Sun, Lock, Save, Info, Building2, Code } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { validatePasswordStrength } from '../utils/validation';

export function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    system: true,
    documents: true,
    activities: false,
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [passwordStrength, setPasswordStrength] = useState<any>(null);

  const handlePasswordChange = (value: string) => {
    setPasswordData((prev) => ({ ...prev, new: value }));
    if (value) {
      setPasswordStrength(validatePasswordStrength(value));
    } else {
      setPasswordStrength(null);
    }
  };

  const handleSaveProfile = () => {
    toast.success('تم حفظ التغييرات بنجاح');
  };

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    if (!passwordStrength?.isStrong) {
      toast.error('كلمة المرور ضعيفة. الرجاء اختيار كلمة مرور أقوى');
      return;
    }

    toast.success('تم تغيير كلمة المرور بنجاح');
    setPasswordData({ current: '', new: '', confirm: '' });
    setPasswordStrength(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">الملف الشخصي والإعدادات</h1>
        <p className="text-sm text-gray-600 mt-1">إدارة معلوماتك الشخصية وإعدادات الحساب</p>
      </div>

      {/* User Info Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <User size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-blue-100 mt-1">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                {user?.role}
              </span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                {user?.userType === 'ministry' ? 'وزارة' : 'منظمة نقابية'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {[
            { id: 'profile', label: 'المعلومات الشخصية', icon: User },
            { id: 'password', label: 'تغيير كلمة المرور', icon: Lock },
            { id: 'notifications', label: 'الإشعارات', icon: Bell },
            { id: 'appearance', label: 'المظهر', icon: Moon },
            { id: 'about', label: 'حول المنصة', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            المعلومات الشخصية
          </h3>

          <div className="space-y-4 max-w-2xl">
            <Input
              label="الاسم الكامل"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              icon={<User size={18} />}
            />

            <Input
              label="البريد الإلكتروني"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              icon={<Mail size={18} />}
              disabled
              helperText="لا يمكن تغيير البريد الإلكتروني"
            />

            <Input
              label="رقم الهاتف"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="777123456"
            />

            <div className="pt-4">
              <Button
                onClick={handleSaveProfile}
                variant="primary"
                icon={<Save size={18} />}
              >
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Lock size={20} className="text-blue-600" />
            تغيير كلمة المرور
          </h3>

          <div className="space-y-4 max-w-2xl">
            <Input
              label="كلمة المرور الحالية"
              type="password"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              placeholder="••••••••"
            />

            <Input
              label="كلمة المرور الجديدة"
              type="password"
              value={passwordData.new}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              helperText={passwordStrength?.message}
              error={passwordStrength && !passwordStrength.isStrong ? passwordStrength.message : undefined}
            />

            {passwordStrength?.isStrong && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">✓ كلمة مرور قوية</p>
              </div>
            )}

            <Input
              label="تأكيد كلمة المرور الجديدة"
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              placeholder="••••••••"
            />

            <div className="pt-4">
              <Button
                onClick={handleChangePassword}
                variant="primary"
                icon={<Lock size={18} />}
              >
                تغيير كلمة المرور
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Bell size={20} className="text-blue-600" />
            إعدادات الإشعارات
          </h3>

          <div className="space-y-4 max-w-2xl">
            {[
              { id: 'email', label: 'إشعارات البريد الإلكتروني', desc: 'استقبال الإشعارات عبر البريد' },
              { id: 'system', label: 'إشعارات النظام', desc: 'الإشعارات داخل المنصة' },
              { id: 'documents', label: 'إشعارات الوثائق', desc: 'عند مراجعة أو اعتماد الوثائق' },
              { id: 'activities', label: 'إشعارات الأنشطة', desc: 'عند إضافة أو تحديث الأنشطة' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{item.label}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[item.id as keyof typeof notifications]}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [item.id]: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}

            <div className="pt-4">
              <Button
                onClick={() => toast.success('تم حفظ إعدادات الإشعارات')}
                variant="primary"
                icon={<Save size={18} />}
              >
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'appearance' && (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Moon size={20} className="text-blue-600" />
            المظهر
          </h3>

          <div className="space-y-4 max-w-2xl">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                  <div>
                    <p className="font-semibold text-gray-800">الوضع الداكن</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {darkMode ? 'تم التفعيل' : 'معطل'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => {
                      setDarkMode(e.target.checked);
                      toast.info('ميزة الوضع الداكن قيد التطوير');
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>نصيحة:</strong> الوضع الداكن يقلل من إجهاد العين في الإضاءة المنخفضة
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'about' && (
        <Card>
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Info size={20} className="text-blue-600" />
            حول المنصة
          </h3>

          <div className="space-y-6">
            {/* Platform Info */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Building2 size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">UnionSphere Enterprise</h4>
                  <p className="text-sm text-gray-600 mt-1">نظام إدارة الكيانات المؤسسية الموحد</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-white/80 backdrop-blur-sm rounded-lg">
                  <p className="text-sm text-gray-600">الإصدار</p>
                  <p className="text-lg font-bold text-gray-900">2.0.0</p>
                </div>
                <div className="p-4 bg-white/80 backdrop-blur-sm rounded-lg">
                  <p className="text-sm text-gray-600">تاريخ الإصدار</p>
                  <p className="text-lg font-bold text-gray-900">مايو 2026</p>
                </div>
              </div>
            </div>

            {/* Ministry Info */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                الجهة المستفيدة
              </h5>
              <div className="space-y-2 text-gray-700">
                <p><strong>الوزارة:</strong> وزارة الشؤون الاجتماعية والعمل</p>
                <p><strong>الدولة:</strong> الجمهورية اليمنية</p>
                <p><strong>النطاق:</strong> dynamicgsye.com</p>
              </div>
            </div>

            {/* Developer Info */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Code size={24} />
                </div>
                <div>
                  <h5 className="text-xl font-bold text-gray-900">تطوير وتنفيذ</h5>
                  <p className="text-sm text-emerald-700 font-medium">شركة ديناميك لخدمات البرمجيات</p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <p><strong>الشركة:</strong> Dynamic Software Services</p>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <p><strong>التخصص:</strong> حلول البرمجيات المؤسسية والحكومية</p>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <p><strong>التقنيات:</strong> React, TypeScript, Supabase, Vercel</p>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <p><strong>النوع:</strong> نظام ERP حكومي ذكي</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg">
                <p className="text-sm text-gray-600 italic text-center">
                  "حلول برمجية احترافية مصممة خصيصاً لخدمة القطاع الحكومي والمؤسسات الوطنية"
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h5 className="font-bold text-gray-900 mb-4">المزايا الرئيسية</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'نموذج موحد للكيانات المؤسسية',
                  'هيكل تنظيمي شجري تفاعلي',
                  'نماذج ديناميكية ذكية',
                  'تحليلات وتقارير مفصلة',
                  'نظام صلاحيات متقدم',
                  'تكامل مع قواعد البيانات الحكومية',
                  'واجهة عربية كاملة (RTL)',
                  'أمان على مستوى حكومي',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Copyright */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                © 2026 <strong>شركة ديناميك لخدمات البرمجيات</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                جميع الحقوق محفوظة - الجمهورية اليمنية
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Made with ❤️ for Yemen
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
