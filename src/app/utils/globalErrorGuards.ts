/**
 * globalErrorGuards.ts — حرس أخطاء عام (Non-Fatal Media Guards)
 * يجعل أخطاء الوسائط (الصوت/الفيديو) غير قاتلة على مستوى التطبيق كله:
 *
 *  1. unhandledrejection: أي Promise مرفوضة بسبب فشل وسائط (مثل NotSupportedError من
 *     audio.play()، أو AbortError بسبب انقطاع التشغيل) تُمنع من الظهور كـ
 *     "Uncaught (in promise)" ولا تصل إلى أي Error Boundary — الصوت اختياري بطبيعته.
 *  2. error (capture phase): أخطاء عناصر <audio>/<video> (مصدر الصوت فشل) تُبتلع بهدوء —
 *     هذه الأحداث لا تتدفق (no-bubble) لكنها قد تظهر في التتبع العام.
 *
 * ملاحظة: unhandledrejection لا يسبّب شاشة "حدث خطأ غير متوقع" بحد ذاته، لكنه يصل
 * إلى errorTracker ويسمّم الإحصاءات؛ هنا نفلتره من المصدر قبل أي معالج آخر.
 */

/** أنماط رسائل أخطاء الوسائط الحميدة (lowercase) */
const BENIGN_MEDIA_MESSAGE_PATTERNS = [
  'notsupportederror',
  'failed to load because no supported source was found',
  'no supported source',
  'the play() request was interrupted',
  'was interrupted by a call to pause',
  'the element has no supported sources',
  'media-src',
  'demuxer',
  'decoding error',
] as const;

/** MediaError codes 1-4 (MEDIA_ERR_*): كلها غير قاتلة للتطبيق */
function isMediaErrorCode(reason: unknown): boolean {
  if (typeof reason !== 'object' || reason === null) return false;
  const code = (reason as { code?: unknown }).code;
  return typeof code === 'number' && Number.isInteger(code) && code >= 1 && code <= 4;
}

/**
 * هل هذا الرفض/الخطأ خطأ وسائط حميد يجب أن يكون غير قاتل؟
 * نقية قابلة للاختبار — لا تلمس DOM.
 */
export function isBenignMediaError(reason: unknown): boolean {
  if (reason === null || reason === undefined) return false;

  // DOMException الصادرة من audio.play(): name = NotSupportedError | AbortError | NotAllowedError
  const name = (reason as { name?: unknown }).name;
  if (typeof name === 'string' && ['NotSupportedError', 'AbortError', 'NotAllowedError'].includes(name)) {
    return true;
  }

  // كائن MediaError (code 1..4)
  if (isMediaErrorCode(reason)) return true;

  // فحص نص الرسالة (يشمل Error أو string)
  const message =
    reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
  if (!message) return false;
  const lower = message.toLowerCase();
  return BENIGN_MEDIA_MESSAGE_PATTERNS.some((p) => lower.includes(p));
}

let installed = false;

/**
 * تثبيت الحراسة العامة — يُستدعى مرة واحدة قبل render التطبيق في main.tsx.
 * لا يرمي أبداً: فشل التثبيت نفسه يجب ألا يعطل الإقلاع.
 */
export function installGlobalErrorGuards(): void {
  if (installed) return;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

  try {
    // 1) Promise rejections مرتبطة بالوسائط ⇒ غير قاتلة
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      if (isBenignMediaError(event.reason)) {
        event.preventDefault(); // يمنع "Uncaught (in promise) ..." في الكونسول
        console.warn('[Guards] Benign media rejection (non-fatal):', String(event.reason));
      }
    });

    // 2) أخطاء عناصر <audio>/<video> ⇒ غير قاتلة (capture: أحداث الوسائط لا تتدفق)
    window.addEventListener(
      'error',
      (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target || (target.tagName !== 'AUDIO' && target.tagName !== 'VIDEO')) return;
        event.stopPropagation();
        const media = target as HTMLMediaElement;
        const err = media.error;
        if (isBenignMediaError(err) || err) {
          event.preventDefault();
          console.warn('[Guards] Media element error (non-fatal):', media.currentSrc || media.src);
        }
      },
      true,
    );

    installed = true;
  } catch {
    // الحراسة لا تُسقط التطبيق أبداً — حتى لو فشل تثبيتها
  }
}

/** للاختبارات: إعادة ضبط حالة التثبيت */
export function __resetGlobalErrorGuardsForTests(): void {
  installed = false;
}
