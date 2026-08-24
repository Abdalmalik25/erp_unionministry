/**
 * Global Error Boundary - حدود الأخطاء العامة
 * Catches and handles all React errors gracefully
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // تسجيل الخطأ في السجل
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
      // الاحتفاظ بآخر 50 خطأ فقط
      if (logs.length > 50) logs.splice(0, logs.length - 50);
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('[ErrorBoundary] Failed to save error log:', e);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-error/15 rounded-full">
                <AlertCircle className="h-8 w-8 text-error" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-heading mb-2">
              حدث خطأ غير متوقع
            </h1>
            <p className="text-muted-foreground mb-4">
              نعتذر، حدث خطأ في التطبيق. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-primary-bright text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة التحميل
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Home className="h-4 w-4" />
                الصفحة الرئيسية
              </button>
            </div>
            {this.state.error && (
              <details className="mt-4 text-left">
<summary className="text-sm text-muted-foreground cursor-pointer">
                    التفاصيل الفنية — للمختصين فقط
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}