/**
 * RootLayout — الهيكل الرئيسي للتطبيق
 * مع إدارة الجلسة · RBAC · تحذيرات انتهاء الجلسة · إشعارات
 */

import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, Users, Vote, Activity, FileText,
  Briefcase, AlertTriangle, BarChart3, FileSearch,
  Bell, User, LogOut, Menu, X, Building2, Shield,
  ChevronDown, Settings, Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useConfirm } from '../ui/ConfirmDialog';
import { SessionTimeoutWarning } from '../ui/SessionTimeoutWarning';
import { getSessionTimeRemaining } from '../../utils/security';

// ============================================================
// قائمة التنقل
// ============================================================

const MINISTRY_MENU = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/ministry' },
  { icon: Building2,       label: 'النقابات',     path: '/ministry/unions' },
  { icon: Users,           label: 'الأعضاء',      path: '/ministry/members' },
  { icon: Vote,            label: 'الانتخابات',   path: '/ministry/elections' },
  { icon: Activity,        label: 'الأنشطة',      path: '/ministry/activities' },
  { icon: FileText,        label: 'الوثائق',      path: '/ministry/documents' },
  { icon: Briefcase,       label: 'الخدمات',      path: '/ministry/services' },
  { icon: AlertTriangle,   label: 'المخالفات',    path: '/ministry/violations' },
  { icon: BarChart3,       label: 'التقارير',     path: '/ministry/reports' },
  { icon: FileSearch,      label: 'سجل التدقيق',  path: '/ministry/audit' },
];

const ORG_MENU = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/organization' },
  { icon: Users,           label: 'الأعضاء',      path: '/organization/members' },
  { icon: Activity,        label: 'الأنشطة',      path: '/organization/activities' },
  { icon: FileText,        label: 'الوثائق',      path: '/organization/documents' },
  { icon: Briefcase,       label: 'الخدمات',      path: '/organization/services' },
];

// إشعارات وهمية للتجريب
const MOCK_NOTIFICATIONS = [
  { id: 1, text: 'نقابة المهندسين: طلب تجديد ترخيص', time: 'منذ 5 دقائق', unread: true, type: 'warning' },
  { id: 2, text: 'تمت الموافقة على طلب الخدمة #SRV-044', time: 'منذ ساعة', unread: true, type: 'success' },
  { id: 3, text: 'تقرير الامتثال الشهري جاهز للمراجعة', time: 'منذ 3 ساعات', unread: false, type: 'info' },
];

// ============================================================
// المكوّن الرئيسي
// ============================================================

export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isMinistry } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // مراقبة انتهاء الجلسة
  const handleSessionExpire = useCallback(async () => {
    setShowSessionWarning(false);
    await signOut();
    navigate('/', { replace: true });
  }, [signOut, navigate]);

  const { isWarning, remainingSeconds } = useSessionTimeout(handleSessionExpire);

  useEffect(() => {
    if (isWarning) {
      setShowSessionWarning(true);
      setSessionRemaining(remainingSeconds);
    }
  }, [isWarning, remainingSeconds]);

  // تحديث العداد كل ثانية عند ظهور التحذير
  useEffect(() => {
    if (!showSessionWarning) return;
    const t = setInterval(() => {
      setSessionRemaining(Math.ceil(getSessionTimeRemaining() / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [showSessionWarning]);

  // إغلاق القوائم عند التنقل
  useEffect(() => {
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm({
      title: 'تسجيل الخروج',
      message: 'هل أنت متأكد من رغبتك في تسجيل الخروج من المنصة؟',
      confirmLabel: 'تسجيل الخروج',
      cancelLabel: 'إلغاء',
      variant: 'warning',
    });
    if (!confirmed) return;
    await signOut();
    navigate('/', { replace: true });
  }, [confirm, signOut, navigate]);

  const menuItems = isMinistry ? MINISTRY_MENU : ORG_MENU;
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => n.unread).length;

  // إغلاق القوائم عند النقر خارجها
  const handleOverlayClick = useCallback(() => {
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">

      {/* Overlay لإغلاق القوائم */}
      {(notificationsOpen || userMenuOpen) && (
        <div className="fixed inset-0 z-20" onClick={handleOverlayClick} />
      )}

      {/* ============ الشريط الجانبي ============ */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} bg-[#1E3A8A] text-white transition-all duration-300 flex flex-col shrink-0 relative z-30`}>

        {/* الترويسة */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-blue-700/60">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#1E3A8A]" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate">وزارة الشؤون</p>
                <p className="text-[11px] text-blue-300 truncate">الاجتماعية والعمل</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-2 hover:bg-blue-700/60 rounded-lg transition-colors shrink-0"
            aria-label={sidebarOpen ? 'طي الشريط' : 'فتح الشريط'}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* نوع المستخدم */}
        {sidebarOpen && (
          <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-blue-700/40 rounded-lg">
            <p className="text-[11px] text-blue-300">الوضع الحالي</p>
            <p className="text-sm font-bold text-white">{isMinistry ? '🏛️ الوزارة' : '🏢 المنظمة'}</p>
          </div>
        )}

        {/* التنقل */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/ministry' && item.path !== '/organization' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold shadow-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={19} className="shrink-0" />
                {sidebarOpen && <span className="text-sm truncate">{item.label}</span>}
                {isActive && sidebarOpen && (
                  <span className="mr-auto w-1.5 h-1.5 bg-white rounded-full shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* الملف الشخصي + الخروج */}
        <div className="p-3 border-t border-blue-700/60 space-y-1">
          <Link
            to={isMinistry ? '/ministry/profile' : '/organization/profile'}
            className="flex items-center gap-3 px-3 py-2.5 text-blue-100 hover:bg-white/10 hover:text-white rounded-lg transition-all"
          >
            <Settings size={18} className="shrink-0" />
            {sidebarOpen && <span className="text-sm">الإعدادات</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-red-300 hover:bg-red-900/30 hover:text-red-200 rounded-lg transition-all"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span className="text-sm">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ============ المحتوى الرئيسي ============ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* شريط الرأس */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-4 z-10 sticky top-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-800 truncate">
              {isMinistry ? 'منصة إدارة المنظمات النقابية' : 'بوابة المنظمة النقابية'}
            </h2>
            <p className="text-xs text-gray-400 truncate">
              {location.pathname.replace('/ministry/', '').replace('/organization/', '').replace('/', 'الرئيسية')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            {/* مؤشر الجلسة */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs border border-green-200">
              <Clock className="w-3.5 h-3.5" />
              <span>الجلسة نشطة</span>
            </div>

            {/* الإشعارات */}
            <div className="relative">
              <button
                onClick={() => { setNotificationsOpen(v => !v); setUserMenuOpen(false); }}
                className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="الإشعارات"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-30 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-sm text-gray-800">الإشعارات</h3>
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{unreadCount} جديد</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {MOCK_NOTIFICATIONS.map(n => (
                      <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${n.unread ? 'bg-blue-50/50' : ''}`}>
                        <p className="text-sm text-gray-800 leading-snug">{n.text}</p>
                        <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                    <button className="text-xs text-[#1E3A8A] font-semibold hover:underline">عرض جميع الإشعارات</button>
                  </div>
                </div>
              )}
            </div>

            {/* قائمة المستخدم */}
            <div className="relative">
              <button
                onClick={() => { setUserMenuOpen(v => !v); setNotificationsOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <div className="w-7 h-7 bg-[#1E3A8A] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user?.name?.charAt(0) || 'م'}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name || 'مستخدم'}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{isMinistry ? 'وزارة' : 'منظمة'}</p>
                </div>
                <ChevronDown size={14} className="text-gray-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-30 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to={isMinistry ? '/ministry/profile' : '/organization/profile'}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User size={16} className="text-gray-400" />
                      الملف الشخصي
                    </Link>
                    <Link
                      to={isMinistry ? '/ministry/profile' : '/organization/profile'}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings size={16} className="text-gray-400" />
                      الإعدادات
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* محتوى الصفحة */}
        <main className="flex-1 p-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* تحذير انتهاء الجلسة */}
      {showSessionWarning && (
        <SessionTimeoutWarning
          remainingSeconds={sessionRemaining}
          onExtend={() => setShowSessionWarning(false)}
          onLogout={handleSessionExpire}
        />
      )}

      {/* نوافذ التأكيد */}
      {confirmDialog}
    </div>
  );
}
