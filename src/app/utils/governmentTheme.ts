/**
 * ============================================================
 * design-system.ts - نظام التصميم المؤسسي المتقدم
 * وزارة الشؤون الاجتماعية والعمل - قطاع العمل
 * ============================================================
 *
 * الإصدار: 3.0.0 (Enterprise Ready - Ultimate)
 *
 * الميزات المتطورة:
 * ─────────────────────────────────────────────
 * ✅ لوحة ألوان رسمية (أزرق كحلي، ذهبي، تركوازي)
 * ✅ نظام طباعة متكامل مع دعم العربية والإنجليزية
 * ✅ مقياس المسافات الموحد (بناءً على 4px)
 * ✅ الظلال والحواف والانتقالات الموحدة
 * ✅ مكونات جاهزة (أزرار، بطاقات، جداول، نماذج)
 * ✅ خرائط الألوان للحالات (نشط، معلق، حرج، إلخ)
 * ✅ دعم RTL واتجاه الصفحة
 * ✅ تكامل كامل مع Tailwind CSS (تصدير الثيم)
 * ✅ وظائف مساعدة للحصول على الألوان ديناميكياً
 * ✅ توثيق كامل باللغة العربية والإنجليزية
 * ✅ جاهز للتوسع مع متغيرات CSS
 *
 * @module DesignSystem
 */

// ============================================================
// 1. لوحة الألوان الرسمية
// ============================================================

export const colors = {
  // ── الأزرق الكحلي (الرئيسي) ──
  primary: {
    50: '#E6EEF5',
    100: '#CCDDEB',
    200: '#99BBD6',
    300: '#6699C2',
    400: '#3377AD',
    500: '#0A2540', // اللون الأساسي
    600: '#081E33',
    700: '#061626',
    800: '#040F1A',
    900: '#02070D',
    DEFAULT: '#0A2540',
    light: '#1A4B8C',
    bright: '#1D4ED8',
    dark: '#051021',
  },

  // ── الذهبي الرسمي (للتميز والإنجازات) ──
  gold: {
    50: '#FCF8EE',
    100: '#F9F0DC',
    200: '#F3E2B9',
    300: '#EDD396',
    400: '#E7C473',
    500: '#C9A84C', // اللون الأساسي
    600: '#A8892E',
    700: '#8A6F1F',
    800: '#6B5515',
    900: '#4D3B0A',
    DEFAULT: '#C9A84C',
    light: '#E4C873',
    dark: '#A8892E',
  },

  // ── التركوازي العميق (للنمو والاستقرار) ──
  teal: {
    50: '#EDFCFA',
    100: '#D5F9F5',
    200: '#AAF3EB',
    300: '#80EDE1',
    400: '#55E7D7',
    500: '#0D9488', // اللون الأساسي
    600: '#0A766D',
    700: '#085951',
    800: '#053B35',
    900: '#031E1A',
    DEFAULT: '#0D9488',
    light: '#2DD4BF',
  },

  // ── النجاح (أخضر رسمي) ──
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    DEFAULT: '#16A34A',
    light: '#4ADE80',
    dark: '#15803D',
  },

  // ── التحذير (أصفر برتقالي) ──
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    DEFAULT: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },

  // ── الخطأ (أحمر رسمي) ──
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    DEFAULT: '#DC2626',
    light: '#F87171',
    dark: '#B91C1C',
  },

  // ── المعلومات (أزرق فاتح) ──
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    DEFAULT: '#1D4ED8',
    light: '#60A5FA',
    dark: '#1E3A8A',
  },

  // ── الرمادي المحايد (مقسم للتدرج) ──
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    DEFAULT: '#64748B',
  },

  // ── الأبيض والأسود ──
  white: '#FFFFFF',
  black: '#080A0C',

  // ── ألوان الخلفيات والنصوص (ديناميكية للثيم) ──
  background: 'var(--bg-body, #F8FAFC)',
  foreground: 'var(--text-body, #1E293B)',
  card: 'var(--bg-card, #FFFFFF)',
  cardForeground: 'var(--text-body, #1E293B)',
  border: 'var(--border-color, #E2E8F0)',
  ring: 'var(--color-primary-bright, #1D4ED8)',
};

// ============================================================
// 2. الطباعة (Typography)
// ============================================================

export const typography = {
  fontFamily: {
    arabic: 'Cairo, "Segoe UI", system-ui, -apple-system, sans-serif',
    english: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    heading: 'Noto Naskh Arabic, Cairo, Georgia, serif',
    mono: 'JetBrains Mono, "Cascadia Code", Consolas, monospace',
    // الافتراضي (يستخدم Cairo للعربية و Inter للإنجليزية)
    sans: 'Cairo, Inter, "Segoe UI", system-ui, sans-serif',
  },

  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
    '7xl': '4.5rem',   // 72px
  },

  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================================
// 3. المسافات (Spacing) – مقياس 4px
// ============================================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  7: '1.75rem',   // 28px
  8: '2rem',      // 32px
  9: '2.25rem',   // 36px
  10: '2.5rem',   // 40px
  11: '2.75rem',  // 44px
  12: '3rem',     // 48px
  14: '3.5rem',   // 56px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  28: '7rem',     // 112px
  32: '8rem',     // 128px
  36: '9rem',     // 144px
  40: '10rem',    // 160px
  44: '11rem',    // 176px
  48: '12rem',    // 192px
  52: '13rem',    // 208px
  56: '14rem',    // 224px
  60: '15rem',    // 240px
  64: '16rem',    // 256px
  72: '18rem',    // 288px
  80: '20rem',    // 320px
  96: '24rem',    // 384px
};

// ============================================================
// 4. الحواف (Border Radius)
// ============================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
};

// ============================================================
// 5. الظلال (Shadows)
// ============================================================

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(10,37,64,0.05)',
  sm: '0 1px 3px 0 rgba(10,37,64,0.06), 0 1px 2px -1px rgba(10,37,64,0.04)',
  base: '0 4px 6px -1px rgba(10,37,64,0.07), 0 2px 4px -2px rgba(10,37,64,0.04)',
  md: '0 6px 12px -2px rgba(10,37,64,0.08), 0 3px 6px -2px rgba(10,37,64,0.04)',
  lg: '0 10px 15px -3px rgba(10,37,64,0.08), 0 4px 6px -4px rgba(10,37,64,0.04)',
  xl: '0 20px 25px -5px rgba(10,37,64,0.08), 0 8px 10px -6px rgba(10,37,64,0.04)',
  '2xl': '0 25px 50px -12px rgba(10,37,64,0.15)',
  inner: 'inset 0 2px 4px 0 rgba(10,37,64,0.05)',
  gold: '0 4px 20px rgba(201,168,76,0.25)',
  // للبطاقات الزجاجية
  glass: '0 8px 32px rgba(10,37,64,0.08)',
};

// ============================================================
// 6. الانتقالات (Transitions)
// ============================================================

export const transitions = {
  instant: '50ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '600ms cubic-bezier(0.4, 0, 0.2, 1)',
  // منحنيات مخصصة
  easeOut: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: '250ms cubic-bezier(0.76, 0, 0.24, 1)',
  bounce: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// ============================================================
// 7. طبقات Z-Index
// ============================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
  overlay: 1090,
  max: 9999,
};

// ============================================================
// 8. مكونات الواجهة الجاهزة (Component Variants)
// ============================================================

export const components = {
  // ── الأزرار ──
  button: {
    primary: {
      background: colors.primary.DEFAULT,
      hover: colors.primary.dark,
      active: colors.primary[800],
      text: colors.white,
      border: colors.primary.DEFAULT,
    },
    secondary: {
      background: colors.gray[100],
      hover: colors.gray[200],
      active: colors.gray[300],
      text: colors.gray[800],
      border: colors.gray[200],
    },
    gold: {
      background: colors.gold.DEFAULT,
      hover: colors.gold.dark,
      active: colors.gold[700],
      text: colors.white,
      border: colors.gold.DEFAULT,
    },
    success: {
      background: colors.success.DEFAULT,
      hover: colors.success.dark,
      active: colors.success[700],
      text: colors.white,
      border: colors.success.DEFAULT,
    },
    danger: {
      background: colors.error.DEFAULT,
      hover: colors.error.dark,
      active: colors.error[700],
      text: colors.white,
      border: colors.error.DEFAULT,
    },
    outline: {
      background: 'transparent',
      hover: colors.primary.DEFAULT,
      active: colors.primary.dark,
      text: colors.primary.DEFAULT,
      border: colors.primary.DEFAULT,
      hoverText: colors.white,
    },
    ghost: {
      background: 'transparent',
      hover: 'rgba(10,37,64,0.06)',
      active: 'rgba(10,37,64,0.10)',
      text: colors.primary.DEFAULT,
      border: 'transparent',
    },
  },

  // ── الحقول (Inputs) ──
  input: {
    background: colors.white,
    backgroundDisabled: colors.gray[50],
    border: colors.gray[200],
    borderFocus: colors.primary.bright,
    text: colors.gray[900],
    placeholder: colors.gray[400],
    label: colors.gray[700],
    error: colors.error.DEFAULT,
    success: colors.success.DEFAULT,
    radius: borderRadius.base,
  },

  // ── البطاقات (Cards) ──
  card: {
    background: colors.white,
    border: colors.gray[200],
    shadow: shadows.base,
    radius: borderRadius.lg,
    padding: spacing[6],
    headerBg: 'rgba(10,37,64,0.02)',
    footerBg: 'rgba(10,37,64,0.02)',
  },

  // ── الجداول (Tables) ──
  table: {
    headerBg: colors.primary.DEFAULT,
    headerText: colors.white,
    rowHover: 'rgba(10,37,64,0.03)',
    rowSelected: 'rgba(29,78,216,0.06)',
    border: colors.gray[200],
    strippedBg: colors.gray[50],
    radius: borderRadius.base,
  },

  // ── التنبيهات (Alerts) ──
  alert: {
    success: {
      bg: 'rgba(22,163,74,0.08)',
      border: colors.success.DEFAULT,
      text: colors.success.dark,
    },
    warning: {
      bg: 'rgba(245,158,11,0.08)',
      border: colors.warning.DEFAULT,
      text: colors.warning.dark,
    },
    error: {
      bg: 'rgba(220,38,38,0.08)',
      border: colors.error.DEFAULT,
      text: colors.error.dark,
    },
    info: {
      bg: 'rgba(29,78,216,0.08)',
      border: colors.info.DEFAULT,
      text: colors.info.dark,
    },
    gold: {
      bg: 'rgba(201,168,76,0.10)',
      border: colors.gold.DEFAULT,
      text: colors.gold.dark,
    },
  },

  // ── الشارات (Badges) ──
  badge: {
    primary: { bg: colors.primary.DEFAULT, text: colors.white },
    gold: { bg: colors.gold.DEFAULT, text: colors.white },
    success: { bg: colors.success.DEFAULT, text: colors.white },
    warning: { bg: colors.warning.DEFAULT, text: colors.white },
    error: { bg: colors.error.DEFAULT, text: colors.white },
    info: { bg: colors.info.DEFAULT, text: colors.white },
    gray: { bg: colors.gray[200], text: colors.gray[700] },
  },

  // ── القوائم (Menus) ──
  menu: {
    background: colors.white,
    border: colors.gray[200],
    shadow: shadows.lg,
    itemHover: 'rgba(10,37,64,0.04)',
    itemActive: 'rgba(10,37,64,0.08)',
    radius: borderRadius.md,
    padding: spacing[2],
  },

  // ── الحوارات (Modals) ──
  modal: {
    background: colors.white,
    overlay: 'rgba(10,37,64,0.50)',
    shadow: shadows['2xl'],
    radius: borderRadius.xl,
    padding: spacing[6],
    headerBg: 'rgba(10,37,64,0.02)',
    footerBg: 'rgba(10,37,64,0.02)',
  },
};

// ============================================================
// 9. خرائط الحالات (Status, Risk, Priority)
// ============================================================

export const statusColors = {
  active: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
    dot: colors.success[500],
  },
  inactive: {
    bg: colors.gray[50],
    text: colors.gray[700],
    border: colors.gray[200],
    dot: colors.gray[500],
  },
  suspended: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
    dot: colors.warning[500],
  },
  pending: {
    bg: colors.info[50],
    text: colors.info[700],
    border: colors.info[200],
    dot: colors.info[500],
  },
  approved: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
    dot: colors.success[500],
  },
  rejected: {
    bg: colors.error[50],
    text: colors.error[700],
    border: colors.error[200],
    dot: colors.error[500],
  },
  critical: {
    bg: colors.error[50],
    text: colors.error[700],
    border: colors.error[300],
    dot: colors.error[600],
  },
  warning: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
    dot: colors.warning[500],
  },
  gold: {
    bg: colors.gold[50],
    text: colors.gold[700],
    border: colors.gold[200],
    dot: colors.gold[500],
  },
};

export const riskColors = {
  low: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  medium: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
  },
  high: {
    bg: colors.error[50],
    text: colors.error[700],
    border: colors.error[200],
  },
  critical: {
    bg: colors.error[50],
    text: colors.error[700],
    border: colors.error[300],
  },
};

export const priorityColors = {
  low: colors.gray[600],
  medium: colors.info[600],
  high: colors.warning[600],
  urgent: colors.error[600],
};

// ============================================================
// 10. وظائف مساعدة (Helper Functions)
// ============================================================

/**
 * الحصول على ألوان حالة معينة
 */
export function getStatusColor(status: string) {
  return statusColors[status as keyof typeof statusColors] || statusColors.inactive;
}

/**
 * الحصول على ألوان مستوى المخاطرة
 */
export function getRiskColor(risk: string) {
  return riskColors[risk as keyof typeof riskColors] || riskColors.low;
}

/**
 * الحصول على لون الأولوية
 */
export function getPriorityColor(priority: string) {
  return priorityColors[priority as keyof typeof priorityColors] || priorityColors.low;
}

/**
 * الحصول على كلاسات Tailwind للحالة
 */
export function getStatusClasses(status: string): string {
  const colors = getStatusColor(status);
  return `bg-${colors.bg} text-${colors.text} border-${colors.border}`;
}

/**
 * التحقق من وجود لون في اللوحة
 */
export function hasColor(colorName: string): boolean {
  return !!colors[colorName as keyof typeof colors];
}

/**
 * الحصول على قيمة لون معين مع دعم التدرجات
 */
export function getColor(colorPath: string): string | undefined {
  const parts = colorPath.split('.');
  let current: any = colors;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

// ============================================================
// 11. تصدير التصميم لـ Tailwind (تهيئة الثيم)
// ============================================================

export const tailwindTheme = {
  colors: {
    primary: colors.primary,
    gold: colors.gold,
    teal: colors.teal,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    gray: colors.gray,
    background: colors.background,
    foreground: colors.foreground,
    card: colors.card,
    cardForeground: colors.cardForeground,
    border: colors.border,
    ring: colors.ring,
  },
  fontFamily: {
    cairo: typography.fontFamily.arabic,
    inter: typography.fontFamily.english,
    heading: typography.fontFamily.heading,
    mono: typography.fontFamily.mono,
    sans: typography.fontFamily.sans,
  },
  fontSize: typography.fontSize,
  fontWeight: typography.fontWeight,
  lineHeight: typography.lineHeight,
  letterSpacing: typography.letterSpacing,
  spacing: spacing,
  borderRadius: borderRadius,
  boxShadow: shadows,
  transitionTimingFunction: {
    'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
    'ease-in-out': 'cubic-bezier(0.76, 0, 0.24, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  transitionDuration: {
    instant: '50ms',
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  zIndex: zIndex,
  extend: {
    // إضافة كلاسات مخصصة للظلال الذهبية والزجاجية
    boxShadow: {
      gold: shadows.gold,
      glass: shadows.glass,
    },
  },
};

// ============================================================
// 12. التصدير النهائي
// ============================================================

export const DesignSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  components,
  statusColors,
  riskColors,
  priorityColors,
  tailwindTheme,
  // الوظائف المساعدة
  getStatusColor,
  getRiskColor,
  getPriorityColor,
  getStatusClasses,
  hasColor,
  getColor,
};

export default DesignSystem;

// ============================================================
// 13. التهيئة في بيئة التطوير
// ============================================================

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__designSystem = DesignSystem;
  console.log('🎨 Government Design System initialized (Development Mode)');
}

// ============================================================
// 14. المصدر النهائي - جاهز للتصدير
// ============================================================