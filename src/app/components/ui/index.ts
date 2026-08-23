/**
 * ui/index.ts — نقطة دخول موحّدة لجميع مكونات واجهة المستخدم
 * يتيح استيراداً مباشراً وموحّداً عبر النظام
 *
 * مثال الاستخدام:
 *   import { Button, Card, StatusBadge, EmptyState, FilterBar, ActionButtons } from '@/components/ui';
 */

// نظام التصميم الموحّد
export * from './designSystem';

// المكوّنات الأساسية
export { Button, IconButton, buttonVariants } from './Button';

export { Input, Textarea, Select } from './Input';
export type { SelectOption } from './Input';

export { Card, StatsCard, AdvancedCard, TieredCard } from './Card';

export { Modal } from './Modal';
export { AdvancedModal } from './AdvancedModal';
export { ConfirmDialog, useConfirm } from './ConfirmDialog';

// المكوّنات المعيارية الموحّدة
export { StatusBadge } from './StatusBadge';
export { EmptyState } from './EmptyState';
export { FilterBar, type FilterField, type FilterOption } from './FilterBar';
export { ActionButtons, type ActionItem } from './ActionButtons';

// المكوّنات المساعدة الأخرى
export { PageHeader } from './PageHeader';
export { Toast, useToast, toast, type ToastType } from './Toast';
export {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  StatsCardSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  ListSkeleton,
} from './LoadingSkeleton';
export { PageTransition } from './PageTransition';
export { SplashScreen } from './SplashScreen';

// الأدوات المساعدة
export { cn } from './utils';
