/**
 * BrandLogo — مكوّن شعار موحّد ومستقر
 * يحل مشاكل:
 *  - إزاحة التخطيط (CLS) عبر تثبيت الأبعاد وعدم انتظار تحميل الصورة
 *  - ظهور أيقونة الصورة المكسورة عند غياب الشعار (بديل نصي رسمي)
 *  - إعادة التحميل المتكرر عبر التخزين المؤقت والرسم غير المتزامن
 */

import { memo, useState } from 'react';
import { BRAND } from '../../branding';

interface BrandLogoProps {
  /** الحجم بالبكسل (مربع) */
  size?: number;
  className?: string;
  /**
   * variant = أي شعار يُعرض:
   * - 'mark'   شعار المنظومة (الافتراضي — كل الواجهات)
   * - 'emblem' الطير الجمهوري (المستندات والتقارير والشاشة الرئيسية للبوابات فقط)
   */
  variant?: 'mark' | 'emblem';
  /** أولوية التحميل — use 'high' في الشاشات الافتتاحية والرأسية الثابتة */
  priority?: 'high' | 'auto';
  /** نص بديل للوصول */
  alt?: string;
  /** دائري الإطار (للأماكن المربعة المكسوة) */
  rounded?: 'lg' | 'xl' | '2xl';
}

const ROUNDED: Record<string, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

const VARIANT_SRC = {
  mark: BRAND.markUrl,
  emblem: BRAND.emblemUrl,
} as const;

function BrandLogoBase({
  size = 44,
  className = '',
  variant = 'mark',
  priority = 'auto',
  alt,
  rounded = 'xl',
}: BrandLogoProps) {
  const [errored, setErrored] = useState(false);
  const resolvedAlt = alt ?? (variant === 'emblem' ? 'طير الجمهورية اليمنية' : 'شعار المنظومة الوطنية');

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-white/5 ${ROUNDED[rounded]} ${className}`}
      style={{ width: size, height: size }}
      aria-label={resolvedAlt}
      role="img"
    >
      {errored ? (
        <span
          className="flex items-center justify-center w-full h-full text-[10px] font-black leading-tight text-center text-amber-200 bg-gradient-to-br from-blue-700/80 to-amber-600/80 p-1 select-none"
          title={BRAND.ministry}
        >
          {variant === 'emblem' ? (
            <>الجمهورية<br />اليمنية</>
          ) : (
            <>المنظومة<br />الوطنية</>
          )}
        </span>
      ) : (
        <img
          src={VARIANT_SRC[variant]}
          alt={resolvedAlt}
          width={size}
          height={size}
          decoding="async"
          loading={priority === 'high' ? 'eager' : 'lazy'}
          // @ts-expect-error fetchpriority هو سمة HTML قياسية مدعومة في المتصفحات الحديثة
          fetchpriority={priority === 'high' ? 'high' : 'auto'}
          onError={() => setErrored(true)}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

export const BrandLogo = memo(BrandLogoBase);
