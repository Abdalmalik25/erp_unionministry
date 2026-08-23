/**
 * Government Theme - نظام الألوان الحكومي الرسمي
 * UnionSphere Enterprise - الوزارة of الشؤون الاجتماعية والعمل
 */

// ============================================
// الألوان الرسمية للوزارة
// ============================================

export const governmentColors = {
  primary: '#0A2540',    // أزرق كحلي حكومي داكن (رئيسي)
  secondary: '#1A4B8C',  // أزرق مؤسسي
  success: '#16A34A',    // أخضر هادئ
  warning: '#F59E0B',    // برتقالي هادئ
  error: '#DC2626',      // أحمر رسمي
  info: '#1D4ED8',       // أزرق معلوماتي
} as const;

export const grayScale = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
} as const;

// ============================================
// أدوات الألوان
// ============================================

export interface StatusColor {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

export function getStatusColor(status: string): StatusColor {
  const statusMap: Record<string, StatusColor> = {
    active: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: 'text-green-500',
    },
    inactive: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: 'text-gray-500',
    },
    suspended: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
    },
    drafted: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: 'text-blue-500',
    },
    under_review: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: 'text-purple-500',
    },
    approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: 'text-emerald-500',
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'text-red-500',
    },
  };

  return statusMap[status] || statusMap.inactive;
}

export function getRiskColor(riskLevel: string): StatusColor {
  const riskMap: Record<string, StatusColor> = {
    low: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: 'text-green-500',
    },
    medium: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
    },
    high: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: 'text-orange-500',
    },
    critical: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: 'text-red-500',
    },
  };

  return riskMap[riskLevel] || riskMap.low;
}

// ============================================
// تصميم الأزرار
// ============================================

export const buttonVariants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-bright',
  secondary: 'bg-card border border-border text-muted-foreground hover:bg-accent',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  error: 'bg-red-600 hover:bg-red-700 text-white',
  info: 'bg-sky-600 hover:bg-sky-700 text-white',
} as const;

// ============================================
// أنماط البطاقات
// ============================================

export const cardVariants = {
  default: 'bg-card border border-border shadow-sm',
  elevated: 'bg-card shadow-lg border border-border/60',
  interactive: 'bg-card border border-border shadow-sm hover:shadow-md hover:border-border transition-all',
  danger: 'bg-red-50 border border-red-100',
  success: 'bg-emerald-50 border border-emerald-100',
  warning: 'bg-amber-50 border border-amber-100',
} as const;

// ============================================
// أنماط الجداول
// ============================================

export const tableVariants = {
  header: 'bg-muted border-b border-border',
  row: 'border-b border-border hover:bg-accent transition-colors',
  striped: 'divide-y divide-border',
} as const;

// ============================================
// الخطوط
// ============================================

export const fonts = {
  arabic: 'Cairo, system-ui, sans-serif',
  english: 'Inter, system-ui, sans-serif',
} as const;

// ============================================
// أحجام النصوص
// ============================================

export const fontSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
} as const;

// ============================================
// التباعد
// ============================================

export const spacing = {
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-6',
} as const;

// ============================================
// دوال مساعدة
// ============================================

export function getButtonClass(variant: keyof typeof buttonVariants, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${sizeClasses[size]}`;
}

export function getBadgeClass(status: string, interactive: boolean = false): string {
  const base = getStatusColor(status);
  const interactiveClasses = interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';
  return `${base.bg} ${base.text} ${base.border} ${interactiveClasses} inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium`;
}

export function getRiskBadgeClass(riskLevel: string): string {
  const base = getRiskColor(riskLevel);
  return `${base.bg} ${base.text} inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium`;
}