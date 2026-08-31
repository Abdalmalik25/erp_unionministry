/**
 * ErrorBoundary — Production-grade React error boundary
 * Catches render-phase errors, reports them, provides graceful fallback UI
 */
import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'page' | 'component';
  name?: string;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
  eventId: string | null;
}

class ErrorBoundaryInternal extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
      eventId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const eventId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.setState({ errorInfo, eventId });

    // Log to console in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', this.props.name || 'unnamed', error, errorInfo);
    }

    // Forward to handler if provided
    this.props.onError?.(error, errorInfo);

    // Send to monitoring endpoint if configured
    this.reportError(error, errorInfo, eventId);
  }

  private reportError(error: Error, info: ErrorInfo, eventId: string): void {
    try {
      const payload = {
        eventId,
        level: this.props.level || 'component',
        name: this.props.name || 'unnamed',
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
      };

      // Try to send to monitoring endpoint (non-blocking)
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/errors/report', blob);
      }
    } catch {
      // Silently fail - error reporting should never crash the app
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
      eventId: null,
    });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private toggleStack = (): void => {
    this.setState((s) => ({ showStack: !s.showStack }));
  };

  override render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.handleReset);
    }

    const isAppLevel = this.props.level === 'app';
    const isDev = import.meta.env.DEV;

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-[200px] flex items-center justify-center p-6"
      >
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-600 text-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">
                  {isAppLevel ? 'حدث خطأ في التطبيق' : 'حدث خطأ غير متوقع'}
                </h2>
                <p className="text-red-100 text-sm">
                  نأسف للإزعاج. تم تسجيل الخطأ وسنعمل على إصلاحه.
                </p>
                {this.state.eventId ? (
                  <p className="text-red-200 text-xs mt-2 font-mono">
                    رقم الخطأ: {this.state.eventId}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">رسالة الخطأ</h3>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 font-mono break-words">
                {this.state.error.message || 'خطأ غير معروف'}
              </p>
            </div>

            {(isDev || this.props.showDetails) && this.state.error.stack ? (
              <div>
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                  aria-expanded={this.state.showStack}
                >
                  {this.state.showStack ? (
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                  التفاصيل التقنية
                </button>
                {this.state.showStack ? (
                  <pre
                    dir="ltr"
                    className="mt-2 text-xs bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-64 font-mono"
                  >
                    {this.state.error.stack}
                  </pre>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps): React.ReactElement {
  return <ErrorBoundaryInternal {...props} />;
}

export const AppErrorBoundary = ErrorBoundary;
export const PageErrorBoundary = ErrorBoundary;
export const ComponentErrorBoundary = ErrorBoundary;

export default ErrorBoundary;
