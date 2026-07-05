import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, Users, Vote, Activity, FileText,
  Briefcase, AlertTriangle, BarChart3, FileSearch,
  Bell, User, LogOut, Menu, X, ChevronLeft, Settings, Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CommandPalette, useCommandPalette } from '../CommandPalette';
import { OfflineWarning, useOnlineStatus } from '../../hooks/useOnlineStatus.tsx';
import { useGlobalShortcuts } from '../../hooks/useKeyboardShortcuts.tsx';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useConfirm } from '../ui/ConfirmDialog';
import { SessionTimeoutWarning } from '../ui/SessionTimeoutWarning';
import { getSessionTimeRemaining } from '../../utils/security';

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

  // Command Palette
  const { isOpen, setIsOpen, defaultCommands } = useCommandPalette();

  // Online Status
  useOnlineStatus(true);

  // Global Shortcuts
  useGlobalShortcuts();

  // مراقبة الجلسة
  const handleSessionExpire = useCallback(async () => {
    setShowSessionWarning(false);
    await signOut();
    navigate('/', { replace: true });
  }, [signOut, navigate]);

  const { isWarning, remainingSeconds } = useSessionTimeout(handleSessionExpire);

  useEffect(() => {
    if (isWarning) { setShowSessionWarning(true); setSessionRemaining(remainingSeconds); }
  }, [isWarning, remainingSeconds]);

  useEffect(() => {
    if (!showSessionWarning) return;
    const t = setInterval(() => setSessionRemaining(Math.ceil(getSessionTimeRemaining() / 1000)), 1000);
    return () => clearInterval(t);
  }, [showSessionWarning]);

  // إغلاق القوائم عند التنقل
  useEffect(() => {
    setNotificationsOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const ministryMenuItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/ministry' },
    { icon: Building2, label: 'إدارة الكيانات', path: '/ministry/enterprise' },
    { icon: Users, label: 'النقابات', path: '/ministry/unions' },
    { icon: Users, label: 'الأعضاء', path: '/ministry/members' },
    { icon: Vote, label: 'الانتخابات', path: '/ministry/elections' },
    { icon: Activity, label: 'الأنشطة', path: '/ministry/activities' },
    { icon: FileText, label: 'الوثائق', path: '/ministry/documents' },
    { icon: Briefcase, label: 'الخدمات', path: '/ministry/services' },
    { icon: AlertTriangle, label: 'المخالفات', path: '/ministry/violations' },
    { icon: BarChart3, label: 'التقارير', path: '/ministry/reports' },
    { icon: FileSearch, label: 'سجل التدقيق', path: '/ministry/audit' },
  ];

  const organizationMenuItems = [
    { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/organization' },
    { icon: Users, label: 'الأعضاء', path: '/organization/members' },
    { icon: Activity, label: 'الأنشطة', path: '/organization/activities' },
    { icon: FileText, label: 'الوثائق', path: '/organization/documents' },
    { icon: Briefcase, label: 'الخدمات', path: '/organization/services' },
  ];

  const menuItems = isMinistry ? ministryMenuItems : organizationMenuItems;

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm({
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من المنصة؟',
      confirmLabel: 'تسجيل الخروج',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await signOut();
      navigate('/');
    } catch {
      await signOut();
      navigate('/');
    }
  }, [confirm, signOut, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-600 to-blue-800 text-white transition-all duration-300 flex flex-col shadow-xl`}
      >
        {/* Logo & Toggle */}
        <div className="p-4 flex items-center justify-between border-b border-blue-700/30">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg p-1">
                <img
                  src="/src/imports/image.png"
                  alt="الشعار الجمهوري"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-bold text-sm">الجمهورية اليمنية</h1>
                <p className="text-xs text-blue-200">وزارة الشؤون الاجتماعية والعمل</p>
              </div>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg p-1">
              <img
                src="/src/imports/image.png"
                alt="الشعار"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-700/50 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 shadow-lg border-r-4 border-white'
                    : 'hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                {!sidebarOpen && isActive && (
                  <div className="absolute right-0 w-1 h-8 bg-white rounded-l" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-blue-700/30 bg-blue-900/30">
          {sidebarOpen && user && (
            <div className="mb-3 p-3 bg-blue-700/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <User size={16} />
                <p className="text-sm font-semibold">{user.name}</p>
              </div>
              <p className="text-xs text-blue-200">{user.role}</p>
            </div>
          )}
          <Link
            to={isMinistry ? '/ministry/profile' : '/organization/profile'}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-700/50 rounded-lg transition-colors mb-2"
          >
            <Settings size={20} />
            {sidebarOpen && <span className="text-sm font-medium">الإعدادات</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-700/50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {isMinistry ? 'منصة الوزارة' : 'منصة المنظمة النقابية'}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {isMinistry
                  ? 'إدارة المنظمات النقابية'
                  : 'إدارة بيانات النقابة'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell size={20} className="text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>

                {notificationsOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-bold text-sm text-gray-800">الإشعارات</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 text-center">
                        لا توجد إشعارات جديدة
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-600">{user.role}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2026 منصة UnionSphere - وزارة الشؤون الاجتماعية والعمل</p>
            <p>الإصدار 1.0.0</p>
          </div>
        </footer>
      </div>

      {/* Global Components */}
      <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} commands={defaultCommands} />
      <OfflineWarning />

      {showSessionWarning && (
        <SessionTimeoutWarning
          remainingSeconds={sessionRemaining}
          onExtend={() => setShowSessionWarning(false)}
          onLogout={handleSessionExpire}
        />
      )}

      {confirmDialog}
    </div>
  );
}
