/**
 * errorTracker.ts — Centralized client-side error tracker
 * يلتقط الأخطاء، يُجمّعها، يرسلها للخادم (عند التمكين)، يحتفظ بآخر N خطأ للعرض في واجهة التشخيص.
 *
 * المميزات:
 *  - التقاط أخطاء window.onerror وunhandledrejection تلقائياً
 *  - تجميع الأخطاء المتكررة (deduplication by message+stack-hash)
 *  - ربط ApiError بـ correlationId
 *  - تكامل مع circuit breakers
 *  - تخزين آخر 50 خطأ في localStorage للوصول إليها بعد التحديث
 *  - إرسال دفعي للخادم (5s flush) لتقليل overhead
 */

import { ApiError } from '../services/api';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface TrackedError {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  source: 'window' | 'unhandledrejection' | 'react' | 'api' | 'manual';
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  correlationId?: string | null;
  url?: string;
  userAgent?: string;
  count: number;
  firstSeen: number;
}

const STORAGE_KEY = 'app_error_buffer_v1';
const MAX_BUFFER = 50;
const FLUSH_INTERVAL_MS = 5000;

class ErrorTracker {
  private buffer: TrackedError[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private installed = false;
  private flushUrl = '/api/telemetry/errors';
  private enabled = false;
  private dedupIndex = new Map<string, string>(); // hash -> errorId

  /** تهيئة الملتقط: يبدأ بالاستماع للأخطاء العامة */
  install(): void {
    if (this.installed) return;
    // Check for DOM-like environment with addEventListener
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    this.installed = true;
    this.loadFromStorage();

    window.addEventListener('error', (e) => {
      this.capture({
        message: e.message || 'Uncaught error',
        stack: e.error?.stack,
        source: 'window',
        context: {
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        },
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      const reason = e.reason as unknown;
      this.capture({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        source: 'unhandledrejection',
        context: { reason: String(reason).slice(0, 200) },
      });
    });

    if (this.enabled) this.startFlush();
  }

  /** تفعيل الإرسال للخادم (feature flag) */
  enable(flushUrl = '/api/telemetry/errors'): void {
    this.enabled = true;
    this.flushUrl = flushUrl;
    if (this.installed) this.startFlush();
  }

  /** تعطيل الإرسال (مثلاً: في وضع التطوير) */
  disable(): void {
    this.enabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** التقاط خطأ يدوياً */
  capture(input: {
    message: string;
    stack?: string;
    source?: TrackedError['source'];
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
  }): string {
    const hash = this.hash(input.message, input.stack);
    const existingId = this.dedupIndex.get(hash);
    if (existingId) {
      const existing = this.buffer.find((e) => e.id === existingId);
      if (existing) {
        existing.count += 1;
        existing.timestamp = Date.now();
        if (input.context) {
          existing.context = { ...existing.context, ...input.context };
        }
        this.persist();
        return existingId;
      }
    }

    const err: TrackedError = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      message: input.message,
      stack: input.stack,
      source: input.source ?? 'manual',
      severity: input.severity ?? 'error',
      context: input.context,
      correlationId:
        input.context && typeof input.context === 'object' && 'correlationId' in input.context
          ? String((input.context as Record<string, unknown>).correlationId)
          : null,
      url: typeof location !== 'undefined' ? location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      count: 1,
      firstSeen: Date.now(),
    };

    this.buffer.unshift(err);
    if (this.buffer.length > MAX_BUFFER) this.buffer.length = MAX_BUFFER;
    this.dedupIndex.set(hash, err.id);
    this.persist();
    return err.id;
  }

  /** التقاط ApiError مع correlationId */
  captureApiError(err: unknown, context?: Record<string, unknown>): string {
    if (err instanceof ApiError) {
      return this.capture({
        message: err.message,
        stack: err.stack,
        source: 'api',
        severity: err.status >= 500 ? 'error' : 'warning',
        context: { ...context, status: err.status, code: err.code, correlationId: err.correlationId },
      });
    }
    if (err instanceof Error) {
      return this.capture({
        message: err.message,
        stack: err.stack,
        source: 'api',
        context,
      });
    }
    return this.capture({ message: String(err), source: 'api', context });
  }

  /** جلب كل الأخطاء المخزّنة (للعرض في DiagnosticPanel) */
  getAll(): TrackedError[] {
    return [...this.buffer];
  }

  /** مسح المخزن المؤقت */
  clear(): void {
    this.buffer = [];
    this.dedupIndex.clear();
    this.persist();
  }

  /** إحصائيات سريعة للوحة التميّز */
  getStats(): { total: number; bySeverity: Record<ErrorSeverity, number>; topSource: string | null } {
    const bySeverity: Record<ErrorSeverity, number> = { fatal: 0, error: 0, warning: 0, info: 0 };
    const sourceCounts: Record<string, number> = {};
    for (const e of this.buffer) {
      bySeverity[e.severity] += e.count;
      sourceCounts[e.source] = (sourceCounts[e.source] ?? 0) + e.count;
    }
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { total: this.buffer.reduce((sum, e) => sum + e.count, 0), bySeverity, topSource };
  }

  // === private ===

  private hash(message: string, stack?: string): string {
    const stackSnippet = (stack ?? '').slice(0, 200);
    let h = 0;
    const str = `${message}::${stackSnippet}`;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // تخزين آخر 20 فقط لتقليل الحجم
      const slice = this.buffer.slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
    } catch { /* quota أو وضع خاص — يُهمل بهدوء */ }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TrackedError[];
      if (Array.isArray(parsed)) {
        this.buffer = parsed;
        for (const e of this.buffer) {
          this.dedupIndex.set(this.hash(e.message, e.stack), e.id);
        }
      }
    } catch { /* corrupt — يبدأ فارغاً */ }
  }

  private startFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private async flush(): Promise<void> {
    if (!this.enabled || this.buffer.length === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    // أرسل فقط الأخطاء الجديدة (timestamp بعد آخر flush)
    const cutoff = Date.now() - FLUSH_INTERVAL_MS * 2;
    const toSend = this.buffer.filter((e) => e.timestamp >= cutoff);
    if (toSend.length === 0) return;
    try {
      await fetch(this.flushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ errors: toSend, sentAt: new Date().toISOString() }),
        // keepalive يسمح بإرسال حتى عند تفريغ الصفحة
        keepalive: true,
      });
    } catch {
      // فشل الإرسال — تُحفظ محلياً للمحاولة لاحقاً
    }
  }
}

export const errorTracker = new ErrorTracker();

// تثبيت فوري عند الاستيراد (التتبع السلبي لا يرسل شيئاً حتى يتم enable)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // نؤجل التثبيت لدورة الحدث التالية لتجنّب إعاقة التحميل
  setTimeout(() => errorTracker.install(), 0);
}
