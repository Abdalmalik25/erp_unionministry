import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, Users, Vote, Activity, FileText,
  Briefcase, AlertTriangle, BarChart3, FileSearch,
  Bell, User, LogOut, Menu, ChevronLeft, ChevronDown, Settings, Building2, UserPlus,
  Send, MinusCircle, FolderTree, Shield, DollarSign,
  ClipboardCheck, Award, BadgeCheck, GraduationCap, Scale, Globe,
  BookOpen, TrendingUp, GitBranch, GitCompare, Settings2, Download, BrainCircuit,
  Building, HeartPulse, Map, FileBadge, FileCheck2, UserCog, ListChecks, ShieldAlert, IdCard,
  Layers, Trophy, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions, ROLE_LIST } from '../../hooks/usePermissions';
import { getPortalKind, ROLE_COLOR_CLASSES } from '../../utils/portals';
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
    dashboard: true, 'establishments-system': true, 'unions-system': true,
    occupations: true, documents: true, compliance: true, reports: true, 'labor-records-system': true,
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

  type MenuItem = { icon: any; label: string; path: string; perm?: string };
  type MenuGroup = { id: string; label: string; icon: any; items: MenuItem[] };

  const ministryGroups: MenuGroup[] = [
    {
      id: 'command-centers', label: 'مراكز القيادة الذكية (جديد)', icon: Layers,
      items: [
        { icon: Globe, label: 'المنصة الوطنية الموحدة', path: '/ministry/national-platform', perm: 'view.dashboard' },
        { icon: Building2, label: 'نظام تشغيل صاحب العمل — Employer OS', path: '/ministry/employer-os', perm: 'view.dashboard' },
        { icon: IdCard, label: 'جواز العمل — Worker Passport', path: '/ministry/worker-passport', perm: 'view.dashboard' },
        { icon: ClipboardCheck, label: 'مساحة عمل الموظف — Workspace', path: '/ministry/workspace', perm: 'view.dashboard' },
        { icon: ShieldAlert, label: 'محرك القواعد التشريعية', path: '/ministry/regulatory-rules', perm: 'compliance.view' },
        { icon: FileText, label: 'إدارة الخدمات — بدون كود', path: '/ministry/service-catalog', perm: 'system.audit.view' },
        { icon: Trophy, label: 'لوحة التميز العالمي — Excellence', path: '/ministry/excellence', perm: 'view.dashboard' },
        { icon: ShieldCheck, label: 'مركز جودة البيانات', path: '/ministry/data-quality', perm: 'system.audit.view' },
        { icon: Globe, label: 'التكامل الخارجي — ذكي', path: '/ministry/integrations', perm: 'system.audit.view' },
        { icon: Trophy, label: 'الجاهزية الإنتاجية — شهادة', path: '/ministry/production-readiness', perm: 'view.dashboard' },
        { icon: BrainCircuit, label: 'مركز الذكاء — تنبؤ', path: '/ministry/intelligence', perm: 'view.dashboard' },
      ],
    },
    {
      id: 'dashboard', label: 'لوحة القيادة والمؤشرات العامة', icon: LayoutDashboard,
      items: [{ icon: LayoutDashboard, label: 'لوحة القيادة المركزية', path: '/ministry', perm: 'view.dashboard' }],
    },
    {
      id: 'establishments-system', label: 'نظام المنشآت والشركات وسوق العمل', icon: Building2,
      items: [
        { icon: Building2, label: 'سجل المنشآت والشركات', path: '/ministry/commercial', perm: 'commercial.view' },
        { icon: Briefcase, label: 'تسكين وتوطين المهن (اليمننة)', path: '/ministry/occupation-links', perm: 'occupations.view' },
        { icon: Globe, label: 'تراخيص العمالة الوافدة (غير اليمنية)', path: '/ministry/expatriate-licenses', perm: 'licenses.expat.view' },
        { icon: Send, label: 'إرساليات وتوجيه العمالة', path: '/ministry/dispatches', perm: 'workers.dispatch.view' },
        { icon: MinusCircle, label: 'طلبات تقليص العمالة (اقتصادية)', path: '/ministry/reduction-requests', perm: 'workers.reduction.view' },
        { icon: Users, label: 'الملف الرقمي للعمالة بالمنشآت', path: '/ministry/worker-profiles', perm: 'members.view' },
      ],
    },
    {
      id: 'labor-records-system', label: 'سجلات قطاع شؤون العمل الأساسية', icon: IdCard,
      items: [
        { icon: Map, label: 'سجل المديريات (محافظة/مديرية/عزلة)', path: '/ministry/labor-records/directorates', perm: 'entities.view' },
        { icon: Building, label: 'سجل مكاتب الوزارة', path: '/ministry/labor-records/ministry-offices', perm: 'entities.view' },
        { icon: UserCog, label: 'سجل الموظفين', path: '/ministry/labor-records/ministry-employees', perm: 'entities.view' },
        { icon: ClipboardCheck, label: 'سجل المفتشين', path: '/ministry/labor-records/inspectors', perm: 'inspections.view' },
        { icon: ListChecks, label: 'سجل معايير التفتيش', path: '/ministry/labor-records/inspection-criteria', perm: 'inspections.view' },
        { icon: HeartPulse, label: 'سجل الإصابات والأمراض المهنية', path: '/ministry/labor-records/work-injuries', perm: 'compliance.view' },
        { icon: BadgeCheck, label: 'سجل التأمينات', path: '/ministry/labor-records/insurance-records', perm: 'compliance.view' },
        { icon: Users, label: 'سجل العمالة غير المنتظمة', path: '/ministry/labor-records/irregular-workers', perm: 'members.view' },
        { icon: FileBadge, label: 'سجل شهادات اللياقة الصحية', path: '/ministry/labor-records/health-fitness-certificates', perm: 'members.view' },
        { icon: FileCheck2, label: 'سجل شهادات الخبرة', path: '/ministry/labor-records/experience-certificates', perm: 'members.view' },
        { icon: ShieldAlert, label: 'إجراءات وسياسات العمل', path: '/ministry/labor-records/work-procedures', perm: 'compliance.view' },
      ],
    },
    {
      id: 'unions-system', label: 'نظام النقابات والاتحادات والمنظمات', icon: Users,
      items: [
        { icon: Users, label: 'سجل النقابات والاتحادات العمالية', path: '/ministry/unions', perm: 'unions.view' },
        { icon: GitBranch, label: 'الهيكل والتبعيات النقابية', path: '/ministry/entity-relationships', perm: 'entities.view' },
        { icon: Users, label: 'مجالس وهيئات الإدارة النقابية', path: '/ministry/board-members', perm: 'members.view' },
        { icon: Vote, label: 'الانتخابات والدورات النقابية', path: '/ministry/elections', perm: 'elections.view' },
        { icon: Users, label: 'سجل النقابيين والكوادر العمالية', path: '/ministry/members', perm: 'members.view' },
        { icon: Activity, label: 'سجل الأنشطة والفعاليات النقابية', path: '/ministry/activities', perm: 'activities.view' },
      ],
    },
    {
      id: 'occupations', label: 'استوديو المهن والأنشطة والتوصيف', icon: Briefcase,
      items: [
        { icon: Briefcase, label: 'استوديو توصيف المهن (ISCO-08)', path: '/ministry/professions', perm: 'occupations.view' },
        { icon: FolderTree, label: 'دليل الأنشطة الاقتصادية (ISIC-4)', path: '/ministry/isic4', perm: 'occupations.view' },
        { icon: Layers, label: 'السجلات المعيارية والتراميز والأكواد', path: '/ministry/national-directories', perm: 'occupations.view' },
        { icon: GraduationCap, label: 'سجلات التدريب والتأهيل المهني', path: '/ministry/training-records', perm: 'training.view' },
      ],
    },
    {
      id: 'compliance', label: 'الرقابة والتفتيش والسلامة والنزاعات', icon: Shield,
      items: [
        { icon: Scale, label: 'المنازعات العمالية والصلح (م 128)', path: '/ministry/labor-disputes', perm: 'disputes.view' },
        { icon: ClipboardCheck, label: 'محاضر التفتيش الميداني OSH', path: '/ministry/inspections', perm: 'inspections.view' },
        { icon: AlertTriangle, label: 'المخالفات العمالية والإجراءات', path: '/ministry/violations', perm: 'violations.view' },
        { icon: Award, label: 'شهادات الكفاءة والمطابقة المهنية', path: '/ministry/evaluation-certificates', perm: 'inspections.cert.view' },
        { icon: BadgeCheck, label: 'تراخيص مزاولة الأنشطة', path: '/ministry/licenses', perm: 'licenses.view' },
        { icon: Shield, label: 'تنبيهات الامتثال القانوني', path: '/ministry/compliance-alerts', perm: 'compliance.view' },
        { icon: ClipboardCheck, label: 'مصفوفات الامتثال المؤسسي', path: '/ministry/compliance-matrices', perm: 'compliance.view' },
        { icon: AlertTriangle, label: 'تقييم المخاطر التنبؤي AI', path: '/ministry/risk-assessments', perm: 'compliance.view' },
        { icon: TrendingUp, label: 'مؤشرات النضج المؤسسي', path: '/ministry/maturity-assessments', perm: 'compliance.view' },
        { icon: BookOpen, label: 'الموسوعة القانونية وقانون العمل', path: '/ministry/legal-references', perm: 'compliance.view' },
      ],
    },
    {
      id: 'documents', label: 'الوثائق والخدمات الحكومية', icon: FileText,
      items: [
        { icon: FileText, label: 'الأرشيف واللوائح الداخلية', path: '/ministry/documents', perm: 'documents.view' },
        { icon: Briefcase, label: 'بوابة الخدمات والمعاملات', path: '/ministry/services', perm: 'services.view' },
        { icon: Bell, label: 'سجل التنبيهات والإشعارات', path: '/ministry/notifications', perm: 'notifications.view' },
      ],
    },
    {
      id: 'reports', label: 'التقارير والمؤشرات والرقابة', icon: BarChart3,
      items: [
        { icon: BarChart3, label: 'التقارير الرقابية والإحصائية', path: '/ministry/reports', perm: 'reports.view' },
        { icon: GitCompare, label: 'التحليل المقارن واستشراف AI', path: '/ministry/comparative', perm: 'reports.view' },
        { icon: DollarSign, label: 'سداد الرسوم والتحصيل المالي', path: '/ministry/fee-payments', perm: 'fees.view' },
        { icon: FileSearch, label: 'سجل التدقيق الأمني المؤسسي', path: '/ministry/audit', perm: 'system.audit.view' },
        { icon: Settings, label: 'إدارة النظام والإعدادات المتقدمة', path: '/ministry/system-administration', perm: 'system.users.manage' },
      ],
    },
    {
      id: 'roles-system', label: 'معرض الأدوار الوظيفية', icon: Users,
      items: [
        { icon: Users, label: `معرض الأدوار (${ROLE_LIST.length} أدوار)`, path: '/ministry/roles', perm: 'view.dashboard' },
      ],
    },
    {
      id: 'account-admin', label: 'إدارة الحسابات والجلسات والرقابة', icon: UserCog,
      items: [
        { icon: UserPlus, label: 'طلبات فتح الحسابات والمستخدمون', path: '/ministry/accounts', perm: 'view.dashboard' },
      ],
    },
  ];

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
      message: 'هل تريد تسجيل الخروج من المنصة؟',
      confirmLabel: 'تسجيل الخروج',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await signOut();
      navigate('/');
    } catch (e) {
      console.error('[Layout] Primary signOut failed, retrying:', e);
      await signOut();
      navigate('/');
    }
  }, [confirm, signOut, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex" dir="rtl">
      {/* Pinned Systems Navigation Sidebar (بانل الأنظمة المثبت) */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-20'
        } sticky top-0 h-screen bg-slate-900 text-slate-100 border-l border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-2xl overflow-hidden shrink-0 select-none`}
      >
        {/* Header / Sovereign Branding */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <BrandLogo size={44} rounded="xl" priority="high" className="shadow-lg border border-white/20" />
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm text-slate-100 leading-tight">الجمهورية اليمنية</h1>
                <p className="text-[11px] text-slate-400 truncate">وزارة الشؤون الاجتماعية والعمل</p>
              </div>
            </div>
          ) : (
            <BrandLogo size={40} rounded="lg" priority="high" className="shadow-lg border border-white/20 mx-auto" />
          )}
          <button
            onClick={handleToggleSidebar}
            aria-label={sidebarOpen ? 'طي القائمة الجانبية' : 'توسيع وتثبيت القائمة الجانبية'}
            className={`p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${!sidebarOpen ? 'hidden' : ''}`}
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
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      hasActiveChild && !isGroupOpen
                        ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <GroupIcon size={17} className="text-amber-400 shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="text-xs font-bold flex-1 text-right truncate">{group.label}</span>
                        {visibleItems.length > 1 && (
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 text-slate-400 ${isGroupOpen ? 'rotate-0' : '-rotate-90'}`}
                          />
                        )}
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
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md border-r-4 border-amber-400'
                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                            }`}
                            title={!sidebarOpen ? item.label : undefined}
                          >
                            <Icon size={15} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg border-r-4 border-amber-400'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarOpen && <span className="text-xs font-semibold">{item.label}</span>}
                </Link>
              );
            })
          )}
        </nav>

        {/* Pinned Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                <User size={15} className="text-blue-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-100 truncate">{user.name}</p>
                <span className={`inline-block mt-0.5 px-1.5 py-px rounded-md border text-[9px] font-bold truncate max-w-full ${roleColorClass}`}>
                  {meta(user.role)?.label || user.role}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer mx-auto"
            title={sidebarOpen ? 'طي القائمة' : 'توسيع وتثبيت القائمة'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Framework & Content Area (إطار العمل الموحد مع شريط التمرير) */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-sm z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {portalHeader.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                {portalHeader.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Helper & Governance Tools Dropdown Button (زر الأدوات المساعدة المطور) */}
              <div className="relative">
                <button
                  onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
                  title="الأدوات المساعدة والإعدادات والحوكمة"
                >
                  <Settings2 size={16} className="text-amber-500 shrink-0" />
                  <span className="hidden sm:inline">الأدوات المساعدة</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${toolsMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {toolsMenuOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">الأدوات والخدمات المساعدة</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">الإعدادات، الصلاحيات، التطبيق، الرقابة</p>
                    </div>

                    <Link
                      to={isMinistry ? '/ministry/profile' : '/organization/profile'}
                      onClick={() => setToolsMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                    >
                      <Settings size={16} className="text-blue-500 shrink-0" />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">الإعدادات العامة والملف</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">تخصيص الحساب وبيانات الاعتماد</p>
                      </div>
                    </Link>

                    {isMinistry && can('system.users.manage') && (
                      <Link
                        to="/ministry/users"
                        onClick={() => setToolsMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                      >
                        <Users size={16} className="text-emerald-500 shrink-0" />
                        <div className="text-right flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">إدارة المستخدمين والصلاحيات</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">مصفوفة التحكم والأدوار المؤسسية</p>
                        </div>
                      </Link>
                    )}

                    <button
                      onClick={() => { setToolsMenuOpen(false); setDownloadModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors text-right cursor-pointer"
                    >
                      <Download size={16} className="text-teal-500 shrink-0" />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">تنزيل وتثبيت التطبيق</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">تثبيت التطبيق على الويندوز والموبايل</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setToolsMenuOpen(false); setAiModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors text-right cursor-pointer"
                    >
                      <BrainCircuit size={16} className="text-indigo-500 shrink-0" />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">ذكاء واستشراف سوق العمل AI</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">تحليلات التوطين ومؤشرات العمالة</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setToolsMenuOpen(false); setGuideOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors text-right cursor-pointer"
                    >
                      <BookOpen size={16} className="text-violet-500 shrink-0" />
                      <div className="text-right flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">دليل المستخدم الرسمي</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">دورة العمل الكاملة حسب دورك الوظيفي</p>
                      </div>
                    </button>

                    {isMinistry && can('system.audit.view') && (
                      <Link
                        to="/ministry/audit"
                        onClick={() => setToolsMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                      >
                        <FileSearch size={16} className="text-amber-500 shrink-0" />
                        <div className="text-right flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">سجل الرقابة والتدقيق الأمني</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">تتبع العمليات والمحاضر الرقابية</p>
                        </div>
                      </Link>
                    )}

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                    <button
                      onClick={() => { setToolsMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 text-xs font-semibold transition-colors text-right cursor-pointer"
                    >
                      <LogOut size={16} className="shrink-0" />
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
                  className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="التنبيهات والإشعارات"
                >
                  <Bell size={18} className="text-slate-600 dark:text-slate-300" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </button>

                {notificationsOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      <h3 className="font-bold text-xs">التنبيهات والإشعارات</h3>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-bold">النظام محدث</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                      جميع السجلات والمزامنات بحالة تشغيل ممتازة
                    </p>
                  </div>
                )}
              </div>

              {/* User Profile Badge */}
              {user && (
                <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
                    <User size={14} className="text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.name}</p>
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
          <div className="mx-auto w-full max-w-[1800px]">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
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