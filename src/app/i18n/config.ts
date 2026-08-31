// src/app/i18n/config.ts — i18next configuration (TD-024)
// يدعم العربية والإنجليزية مع كشف تلقائي واتجاه RTL/LTR

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// قاموس أساسي مضمّن — يضمن عمل التطبيق دون انتظار تحميل الشبكة
const arCommon = {
  app: {
    name: 'المنظومة الوطنية للعمل النقابي',
    abbr: 'UFMOSAL',
    tagline: 'وزارة الشؤون الاجتماعية والعمل — قطاع العمل',
  },
  nav: {
    home: 'الرئيسية',
    dashboard: 'لوحة المعلومات',
    entities: 'المنشآت والكيانات',
    members: 'الأعضاء',
    workers: 'العمال',
    contracts: 'العقود',
    reports: 'التقارير',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
  },
  actions: {
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    exportExcel: 'تصدير Excel',
    exportPDF: 'تصدير PDF',
    exportCSV: 'تصدير CSV',
    print: 'طباعة',
    refresh: 'تحديث',
    sync: 'مزامنة',
    submit: 'إرسال',
    approve: 'اعتماد',
    reject: 'رفض',
    archive: 'أرشفة',
    confirm: 'تأكيد',
    close: 'إغلاق',
    next: 'التالي',
    previous: 'السابق',
    back: 'رجوع',
  },
  status: {
    active: 'نشط',
    inactive: 'غير نشط',
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    archived: 'مؤرشف',
    draft: 'مسودة',
    published: 'منشور',
  },
  messages: {
    loading: 'جاري التحميل...',
    success: 'تمت العملية بنجاح',
    error: 'حدث خطأ',
    confirm: 'هل أنت متأكد؟',
    unsavedChanges: 'لديك تغييرات غير محفوظة',
    noData: 'لا توجد بيانات',
    accessDenied: 'ليس لديك صلاحية',
    networkError: 'خطأ في الاتصال بالشبكة',
    serverError: 'خطأ في الخادم',
  },
  a11y: {
    menuOpen: 'فتح القائمة',
    menuClose: 'إغلاق القائمة',
    expand: 'توسيع',
    collapse: 'طي',
    required: 'حقل مطلوب',
    optional: 'اختياري',
    loading: 'جاري التحميل',
  },
  form: {
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    date: 'التاريخ',
    fromDate: 'من تاريخ',
    toDate: 'إلى تاريخ',
    status: 'الحالة',
    notes: 'ملاحظات',
    description: 'الوصف',
  },
};

const enCommon = {
  app: {
    name: 'National Union Labor Platform',
    abbr: 'UFMOSAL',
    tagline: 'Ministry of Social Affairs and Labor — Work Sector',
  },
  nav: {
    home: 'Home',
    dashboard: 'Dashboard',
    entities: 'Entities',
    members: 'Members',
    workers: 'Workers',
    contracts: 'Contracts',
    reports: 'Reports',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
  },
  actions: {
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    exportExcel: 'Export Excel',
    exportPDF: 'Export PDF',
    exportCSV: 'Export CSV',
    print: 'Print',
    refresh: 'Refresh',
    sync: 'Sync',
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    archive: 'Archive',
    confirm: 'Confirm',
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
    back: 'Back',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    archived: 'Archived',
    draft: 'Draft',
    published: 'Published',
  },
  messages: {
    loading: 'Loading...',
    success: 'Operation successful',
    error: 'An error occurred',
    confirm: 'Are you sure?',
    unsavedChanges: 'You have unsaved changes',
    noData: 'No data available',
    accessDenied: 'Access denied',
    networkError: 'Network error',
    serverError: 'Server error',
  },
  a11y: {
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    expand: 'Expand',
    collapse: 'Collapse',
    required: 'Required',
    optional: 'Optional',
    loading: 'Loading',
  },
  form: {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    date: 'Date',
    fromDate: 'From date',
    toDate: 'To date',
    status: 'Status',
    notes: 'Notes',
    description: 'Description',
  },
};

const resources = {
  ar: { translation: arCommon },
  en: { translation: enCommon },
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    lng: typeof window !== 'undefined'
      ? (localStorage.getItem('i18nextLng') || navigator.language || 'ar').split('-')[0]
      : 'ar',
    supportedLngs: ['ar', 'en'],
    nonExplicitSupportedLngs: false,
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
    },
  });

// مزامنة اتجاه المستند (RTL/LTR) مع اللغة المختارة
const syncDir = (lng: string) => {
  if (typeof document === 'undefined') return;
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('lang', lng);
  document.documentElement.setAttribute('dir', dir);
};
syncDir(i18n.language || 'ar');
i18n.on('languageChanged', syncDir);

export default i18n;

// مخطّط سمات/خصائص حسب اللغة — يُستخدم في المكونات
export const RTL_LANGS = new Set(['ar']);
export const isRTL = (lng?: string) => RTL_LANGS.has(lng || i18n.language || 'ar');
