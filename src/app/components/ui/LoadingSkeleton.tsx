/**
 * Loading Skeleton - هياكل التحميل
 * تحسين تجربة المستخدم أثناء التحميل
 */

import { memo } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`bg-border ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
});

// ============================================
// Table Skeleton - هيكل الجدول
// ============================================
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton = memo(function TableSkeleton({
  rows = 5,
  columns = 6,
}: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 bg-muted p-4 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="100%" height="1.5rem" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="100%" height="1.25rem" />
          ))}
        </div>
      ))}
    </div>
  );
});

// ============================================
// Card Skeleton - هيكل البطاقة
// ============================================
export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-6 border border-border space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="1.25rem" />
          <Skeleton width="40%" height="1rem" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton width="100%" height="1rem" />
        <Skeleton width="90%" height="1rem" />
        <Skeleton width="95%" height="1rem" />
      </div>

      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </div>
    </div>
  );
});

// ============================================
// Stats Card Skeleton - هيكل بطاقة الإحصائيات
// ============================================
export const StatsCardSkeleton = memo(function StatsCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-muted to-border rounded-xl p-6 border border-border">
      <Skeleton width="60%" height="1rem" className="mb-3" />
      <Skeleton width="40%" height="2.5rem" />
    </div>
  );
});

// ============================================
// Dashboard Skeleton - هيكل لوحة التحكم
// ============================================
export const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <Skeleton width="40%" height="1.5rem" className="mb-4" />
          <Skeleton width="100%" height={300} variant="rounded" />
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <Skeleton width="40%" height="1.5rem" className="mb-4" />
          <Skeleton width="100%" height={300} variant="rounded" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <Skeleton width="30%" height="1.5rem" className="mb-4" />
        <TableSkeleton rows={5} columns={6} />
      </div>
    </div>
  );
});

// ============================================
// Form Skeleton - هيكل النموذج
// ============================================
export const FormSkeleton = memo(function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="30%" height="1rem" />
          <Skeleton width="100%" height="2.5rem" variant="rounded" />
        </div>
      ))}

      <div className="flex gap-3 justify-end pt-4">
        <Skeleton width={100} height={40} variant="rounded" />
        <Skeleton width={100} height={40} variant="rounded" />
      </div>
    </div>
  );
});

// ============================================
// List Skeleton - هيكل القائمة
// ============================================
interface ListSkeletonProps {
  items?: number;
}

export const ListSkeleton = memo(function ListSkeleton({ items = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height="1rem" />
            <Skeleton width="50%" height="0.875rem" />
          </div>
          <Skeleton width={80} height={32} variant="rounded" />
        </div>
      ))}
    </div>
  );
});
