// src/app/components/a11y/SkipToContent.tsx
// رابط "تخطي إلى المحتوى" للوصولية — يظهر عند تركيز لوحة المفاتيح

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:right-4 focus:z-[10000]
        focus:px-4 focus:py-2 focus:rounded-lg
        focus:bg-primary focus:text-white focus:shadow-2xl
        focus:outline-none focus:ring-4 focus:ring-primary/30
        focus:font-bold focus:text-sm
      "
    >
      تخطي إلى المحتوى الرئيسي
    </a>
  );
}
