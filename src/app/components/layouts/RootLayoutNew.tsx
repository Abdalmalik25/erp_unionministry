import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Users, Activity, FileText,
  Briefcase, FileSearch,
  Bell, User, LogOut, Menu, ChevronLeft, ChevronDown, Settings,
  Download, Settings2, BrainCircuit, BookOpen, ShieldAlert, IdCard, Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getPortalKind, ROLE_COLOR_CLASSES } from '../../utils/portals';
import { SYSTEM_GROUPS, SYSTEMS } from '../../config/systems';
import { CommandPalette, useCommandPalette } from '../CommandPalette';
import { SystemStatusPill } from '../SystemStatusPill';
import { ThemeToggle } from '../ui/ThemeToggle';
import { OfflineWarning, useOnlineStatus } from '../../hooks/useOnlineStatus.tsx';
import { useGlobalShortcuts } from '../../hooks/useKeyboardShortcuts.tsx';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useConfirm } from '../ui/ConfirmDialog';
import { SessionTimeoutWarning } from '../ui/SessionTimeoutWarning';
import { getSessionTimeRemaining } from '../../utils/security';
import { BRAND } from '../../branding';

import { BrandLogo } from '../ui/BrandLogo';
import { AiLaborIntelligenceModal } from '../enterprise/AiLaborIntelligenceModal';
import { AppDownloadModal } from '../enterprise/AppDownloadModal';
import { UserGuideModal } from '../guide/UserGuideModal';
export function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('unionsphere_sidebar_open') !== 'false';
    } catch {
      return true;
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    oversight: true, 'labor-market': true, registries: true, unions: true,
    occupations: true, compliance: true, services: true, reports: true,
  });

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('unionsphere_sidebar_open', String(next));
      } catch {
        // تجاهل أخطاء الوصول للتخزين المحلي (وضع التصفح الخاص)
      }
      return next;
    });
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isMinistry } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // تنبيه «كلمة مرور ابتدائية» — يُخفى لكل جلسة عند الإغلاق أو بعد التغيير
  const [pwdBannerDismissed, setPwdBannerDismissed] = useState(() => sessionStorage.getItem('pwd_banner_dismissed') === '1');
  const showPwdBanner = Boolean(user?.mustChangePassword) && !pwdBannerDismissed;
  const profilePath = `/${(location.pathname.split('/')[1] || 'ministry')}/profile`;

  // Command Palette
  const { isOpen, setIsOpen, defaultCommands } = useCommandPalette();

  // Online Status
  useOnlineStatus(true);

  // Global Shortcuts
  useGlobalShortcuts();

  // صلاحيات الدور الحالي لتصفية القائمة
  const { can, meta } = usePermissions();

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
    setToolsMenuOpen(false);
  }, [location.pathname]);

  const ministryGroups = useMemo(() => {
    return SYSTEM_GROUPS.map((group) => ({
      id: group.id,
      label: group.title,
      icon: group.icon,
      items: SYSTEMS.filter((s) => s.group === group.id).map((s) => ({
        icon: s.icon,
        label: s.title,
        path: s.path,
        perm: s.perm,
      })),
    }));
  }, []);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const organizationMenuItems = [
    { icon: LayoutDashboard, label: 'لوحة القيادة للنقابة', path: '/organization', perm: 'view.dashboard' },
    { icon: Users, label: 'سجل الأعضاء والنقابيين', path: '/organization/members', perm: 'members.view' },
    { icon: Activity, label: 'الأنشطة والفعاليات النقابية', path: '/organization/activities', perm: 'activities.view' },
    { icon: FileText, label: 'اللوائح والوثائق النقابية', path: '/organization/documents', perm: 'documents.view' },
    { icon: Briefcase, label: 'طلبات الخدمات الحكومية', path: '/organization/services', perm: 'services.view' },
  ];

  // بوابة أصحاب العمل — Employer Portal
  const employerMenuItems = [
    { icon: LayoutDashboard, label: 'مركز إدارة المنشأة', path: '/employer', perm: 'dashboard:view' },
    { icon: Users, label: 'سجل العاملين بالمنشأة', path: '/employer/members', perm: 'members.view' },
    { icon: Activity, label: 'الأنشطة التشغيلية', path: '/employer/activities', perm: 'activities.view' },
    { icon: FileText, label: 'العقود واللوائح الداخلية', path: '/employer/documents', perm: 'documents.view' },
    { icon: Briefcase, label: 'طلبات الخدمات الحكومية', path: '/employer/services', perm: 'services.view' },
    { icon: User, label: 'ملف المنشأة', path: '/employer/profile', perm: 'profile:view' },
  ];

  // بوابة العاملين — جواز العمل الرقمي
  const workerMenuItems = [
    { icon: IdCard, label: 'جوازي المهني الرقمي', path: '/worker', perm: 'dashboard:view' },
    { icon: Briefcase, label: 'طلبات وخدماتي الحكومية', path: '/worker/services', perm: 'services.request' },
    { icon: User, label: 'ملفي الشخصي', path: '/worker/profile', perm: 'profile:view' },
  ];

  // البوابة الفعالة حسب المسار ونوع المستخدم
  const activePortal = getPortalKind(location.pathname, isMinistry);
  const portalFlatMenu =
    activePortal === 'employer' ? employerMenuItems
    : activePortal === 'worker' ? workerMenuItems
    : organizationMenuItems;

  // عناوين البوابات (رأس الصفحة)
  const portalHeader = (() => {
    switch (activePortal) {
      case 'employer':
        return {
          title: 'بوابة أصحاب العمل والمنشآت',
          subtitle: 'إدارة العاملين والامتثال والخدمات الحكومية لمنشأتك',
        };
      case 'worker':
        return {
          title: 'جواز العمل الرقمي — بوابة العاملين',
          subtitle: 'هويتك المهنية • عقودك • أجرك • تدريبك • شكاواك في مكان واحد',
        };
      case 'organization':
        return {
          title: 'بوابة النقابات والمنظمات العمالية',
          subtitle: 'إدارة الأعضاء والانتخابات والأنشطة والمعاملات النقابية',
        };
      default:
        return {
          title: 'الجمهورية اليمنية — وزارة الشؤون الاجتماعية والعمل',
          subtitle: 'قطاع العمل | المنظومة الوطنية الشاملة لإدارة المنشآت والنقابات',
        };
    }
  })();

  const roleColorClass = ROLE_COLOR_CLASSES[meta(user?.role)?.color ?? ''] ?? ROLE_COLOR_CLASSES.sky;

  const handleLogout = useCallback(async () => {
    const confirmed = await confirm({
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من المنظومة؟',
      confirmLabel: 'تسجيل الخروج',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error('[Layout] Primary signOut failed, retrying:', e);
      await signOut();
      navigate('/login');
    }
  }, [confirm, signOut, navigate]);

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Pinned Systems Navigation Sidebar (بانل الأنظمة المثبت) */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-20'
        } sticky top-0 h-screen bg-sidebar text-sidebar-foreground border-l border-sidebar-border transition-all duration-300 flex flex-col z-30 shadow-xl overflow-hidden shrink-0 select-none`}
      >
        {/* Header / Sovereign Branding */}
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border bg-black/20">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <BrandLogo size={44} rounded="xl" priority="high" className="shadow-lg border border-white/20" />
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm text-sidebar-foreground leading-tight">الجمهورية اليمنية</h1>
                <p className="text-[11px] text-sidebar-foreground/70 truncate">وزارة الشؤون الاجتماعية والعمل</p>
              </div>
            </div>
          ) : (
            <BrandLogo size={40} rounded="lg" priority="high" className="shadow-lg border border-white/20 mx-auto" />
          )}
          <button
            onClick={handleToggleSidebar}
            aria-label={sidebarOpen ? 'طي القائمة الجانبية' : 'توسيع وتثبيت القائمة الجانبية'}
            className={`p-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${!sidebarOpen ? 'hidden' : ''}`}
            title={sidebarOpen ? 'طي القائمة' : 'تثبيت وتوسيع القائمة'}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Scrollable System Menu Items */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
          {isMinistry && activePortal === 'ministry' ? (
            ministryGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupOpen = openGroups[group.id] ?? true;
              const visibleItems = group.items.filter(it => !it.perm || can(it.perm));
              if (visibleItems.length === 0) return null;
              const hasActiveChild = visibleItems.some(item => location.pathname === item.path);
              return (
                <div key={group.id} className="mb-2">
                  <button
                    onClick={() => sidebarOpen ? toggleGroup(group.id) : handleToggleSidebar()}
                    title={!sidebarOpen ? group.label : undefined}
                    className={`relative flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                      hasActiveChild && !isGroupOpen
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold border border-sidebar-border'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}
                  >
                    {!sidebarOpen && hasActiveChild && (
                      <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gold" aria-hidden />
                    )}
                    <GroupIcon size={17} className="text-gold shrink-0" aria-hidden />
                    {sidebarOpen && (
                      <>
                        <span className="text-xs font-bold flex-1 text-right truncate">{group.label}</span>
                        {visibleItems.length > 1 && (
                          <span
                            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-bold leading-none tabular-nums ${
                              isGroupOpen ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'bg-sidebar-accent/60 text-sidebar-foreground/70'
                            }`}
                          >
                            {visibleItems.length}
                          </span>
                        )}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 text-sidebar-foreground/60 ${isGroupOpen ? 'rotate-0' : '-rotate-90'}`}
                        />
                      </>
                    )}
                  </button>
                  {isGroupOpen && (
                    <div className="mt-1 space-y-0.5 pr-2">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-r-4 border-gold'
                                : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                            }`}
                            title={!sidebarOpen ? item.label : undefined}
                          >
                            <Icon size={15} className={`shrink-0 ${isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/60'}`} />
                            {sidebarOpen && <span className="text-xs truncate">{item.label}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            portalFlatMenu.filter(it => !it.perm || can(it.perm)).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground border-r-4 border-gold'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                  }`}
                >
                  <Icon size={18} className="shrink-0" aria-hidden />
                  {sidebarOpen && <span className="text-xs font-semibold">{item.label}</span>}
                </Link>
              );
            })
          )}
        </nav>

        {/* Pinned Sidebar Footer */}
        <div className="p-3 border-t border-sidebar-border bg-black/25 flex items-center justify-between">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent border border-gold/40 flex items-center justify-center shrink-0">
                <User size={15} className="text-sidebar-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-sidebar-foreground truncate">{user.name}</p>
                <span className={`inline-block mt-0.5 px-1.5 py-px rounded-md border text-[9px] font-bold truncate max-w-full ${roleColorClass}`}>
                  {meta(user.role)?.label || user.role}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors cursor-pointer mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            title={sidebarOpen ? 'طي القائمة' : 'توسيع وتثبيت القائمة'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Framework & Content Area (إطار العمل الموحد مع شريط التمرير) */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-card/95 dark:bg-card/95 backdrop-blur-md border-b border-border px-6 py-3.5 shadow-sm z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-heading tracking-tight truncate">
                {portalHeader.title}
              </h2>
              <p className="text-xs text-muted-foreground font-medium truncate">
                {portalHeader.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Helper & Governance Tools Dropdown Button (زر الأدوات المساعدة المطور) */}
              <div className="relative">
                <button
                  onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                  aria-expanded={toolsMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 px-3.5 py-2 bg-muted hover:bg-accent text-foreground rounded-xl text-xs font-bold transition-colors border border-border shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="الأدوات المساعدة والإعدادات والحوكمة"
                >
                  <Settings2 size={16} className="text-gold-dark dark:text-gold-light shrink-0" aria-hidden />
                  <span className="hidden sm:inline">الأدوات المساعدة</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 text-muted-foreground ${toolsMenuOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>

                {toolsMenuOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-popover text-popover-foreground rounded-2xl shadow-xl border border-border p-2 z-50 animate-in fade-in-50 duration-150" role="menu">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs font-bold text-heading">الأدوات والخدمات المساعدة</p>
                      <p className="text-[11px] text-muted-foreground">الإعدادات، الصلاحيات، التطبيق، الرقابة</p>
                    </div>

                    <Link
                      to={isMinistry ? '/ministry/profile' : '/organization/profile'}
                      onClick={() => setToolsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-xs font-medium transition-colors"
                    >
                      <Settings size={16} className="text-primary-bright shrink-0" aria-hidden />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-foreground">الإعدادات العامة والملف</p>
                        <p className="text-[10px] text-muted-foreground">تخصيص الحساب وبيانات الاعتماد</p>
                      </div>
                    </Link>

                    {isMinistry && can('system.users.manage') && (
                      <Link
                        to="/ministry/users"
                        onClick={() => setToolsMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-xs font-medium transition-colors"
                      >
                        <Users size={16} className="text-success-dark dark:text-success-light shrink-0" aria-hidden />
                        <div className="text-right flex-1">
                          <p className="font-semibold text-foreground">إدارة المستخدمين والصلاحيات</p>
                          <p className="text-[10px] text-muted-foreground">مصفوفة التحكم والأدوار المؤسسية</p>
                        </div>
                      </Link>
                    )}

                    <button
                      onClick={() => { setToolsMenuOpen(false); setDownloadModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-xs font-medium transition-colors text-right cursor-pointer"
                    >
                      <Download size={16} className="text-primary-bright shrink-0" aria-hidden />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-foreground">تنزيل وتثبيت التطبيق</p>
                        <p className="text-[10px] text-muted-foreground">تثبيت التطبيق على الويندوز والموبايل</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setToolsMenuOpen(false); setAiModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-xs font-medium transition-colors text-right cursor-pointer"
                    >
                      <BrainCircuit size={16} className="text-primary-bright shrink-0" aria-hidden />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-foreground">ذكاء واستشراف سوق العمل AI</p>
                        <p className="text-[10px] text-muted-foreground">تحليلات التوطين ومؤشرات العمالة</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setToolsMenuOpen(false); setGuideOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-xs font-medium transition-colors text-right cursor-pointer"
                    >
                      <BookOpen size={16} className="text-gold-dark dark:text-gold-light shrink-0" aria-hidden />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-foreground">دليل المستخدم الرسمي</p>
                        <p className="text-[10px] text-muted-foreground">دورة العمل الكاملة حسب دورك الوظيفي</p>
                      </div>
                    </button>

                    {isMinistry && can('system.audit.view') && (
                      <Link
                        to="/ministry/audit"
                        onClick={() => setToolsMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent text-xs font-medium transition-colors"
                      >
                        <FileSearch size={16} className="text-warning-dark dark:text-warning-light shrink-0" aria-hidden />
                        <div className="text-right flex-1">
                          <p className="font-semibold text-foreground">سجل الرقابة والتدقيق الأمني</p>
                          <p className="text-[10px] text-muted-foreground">تتبع العمليات والمحاضر الرقابية</p>
                        </div>
                      </Link>
                    )}

                    <div className="my-1 border-t border-border" />

                    <button
                      onClick={() => { setToolsMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error/10 text-error text-xs font-semibold transition-colors text-right cursor-pointer"
                    >
                      <LogOut size={16} className="shrink-0" aria-hidden />
                      <span>تسجيل الخروج الآمن</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label="التنبيهات والإشعارات"
                  aria-expanded={notificationsOpen}
                  aria-haspopup="true"
                  className="relative p-2 hover:bg-accent rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="التنبيهات والإشعارات"
                >
                  <Bell size={18} className="text-muted-foreground" aria-hidden />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-success rounded-full animate-pulse" aria-hidden />
                </button>

                {notificationsOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-popover text-popover-foreground rounded-2xl shadow-xl border border-border z-50 p-4">
                    <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                      <h3 className="font-bold text-xs">التنبيهات والإشعارات</h3>
                      <span className="text-[10px] text-success dark:text-success-light bg-success/10 px-2 py-0.5 rounded-full font-bold">النظام محدث</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center py-4">
                      جميع السجلات والمزامنات بحالة تشغيل ممتازة
                    </p>
                  </div>
                )}
              </div>

              {/* User Profile Badge */}
              {user && (
                <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-muted rounded-xl border border-border">
                  <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-sm">
                    <User size={14} className="text-white" aria-hidden />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground leading-tight">{user.name}</p>
                    <span className={`inline-block px-1.5 py-px rounded-md border text-[9px] font-bold ${roleColorClass}`}>
                      {meta(user.role)?.label || user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {showPwdBanner && (
            <div className="mx-auto w-full max-w-[1800px] mb-4 rounded-xl border border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3" role="alert">
              <ShieldAlert size={20} className="text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-amber-900 dark:text-amber-200">تنبيه أمني: حسابك ما يزال بكلمة المرور الابتدائية</p>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                  كلمة المرور الابتدائية مُسلَّمة إدارياً وتُعدّ مؤقتة — غيّرها الآن من «الملف الشخصي ← تغيير كلمة المرور» لتأمين حسابك. التغيير يوثَّق رسمياً.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={profilePath}
                  onClick={() => { setPwdBannerDismissed(true); sessionStorage.setItem('pwd_banner_dismissed', '1'); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning-dark hover:bg-warning text-white text-xs font-black shadow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-warning"
                >
                  <Lock size={13} /> تغيير كلمة المرور الآن
                </Link>
                <button
                  type="button"
                  aria-label="إغلاق التنبيه مؤقتاً"
                  onClick={() => { setPwdBannerDismissed(true); sessionStorage.setItem('pwd_banner_dismissed', '1'); }}
                  className="w-8 h-8 rounded-lg text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-500/20 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <div className="mx-auto w-full max-w-[1800px]">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border px-6 py-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© 2026 {BRAND.systemShort} — {BRAND.ministry}</p>
            <SystemStatusPill />
            <p className="font-medium">{BRAND.systemName} • v2.0</p>
          </div>
        </footer>
      </div>

      {/* Global Components */}
      <CommandPalette isOpen={isOpen} onClose={() => setIsOpen(false)} commands={defaultCommands} />
      <OfflineWarning />
<AiLaborIntelligenceModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
<AppDownloadModal isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
<UserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} role={user?.role} />

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