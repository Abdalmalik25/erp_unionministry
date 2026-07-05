/**
 * Error Boundary - معالجة الأخطاء الذكية
 * التقاط الأخطاء ومعالجتها بشكل احترافي
 */

import { Component, ErrorInfo, ReactNode, ReactElement } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // تسجيل الخطأ
    console.error('Error Boundary caught an error:', error, errorInfo);

    // حفظ الخطأ في localStorage للتحليل
    this.logError(error, errorInfo);

    // استدعاء callback من الأب
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // إرسال إلى خدمة تتبع الأخطاء (مثل Sentry)
    // this.reportToErrorTracking(error, errorInfo);
  }

  logError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      const errors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      errors.push(errorLog);

      // الاحتفاظ بآخر 50 خطأ فقط
      localStorage.setItem('errorLogs', JSON.stringify(errors.slice(-50)));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  reportBug = () => {
    const { error, errorInfo } = this.state;
    const bugReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // نسخ إلى الحافظة
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2));
    alert('تم نسخ تفاصيل الخطأ. الرجاء إرساله إلى فريق الدعم.');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">عذراً! حدث خطأ غير متوقع</h1>
                <p className="text-gray-600 mt-1">نعمل على حل المشكلة في أقرب وقت</p>
              </div>
            </div>

            {/* Error Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-red-800 mb-2">رسالة الخطأ:</p>
              <p className="text-sm text-red-700 font-mono">{error?.message || 'خطأ غير معروف'}</p>
              {errorCount > 1 && (
                <p className="text-xs text-red-600 mt-2">تكرر الخطأ {errorCount} مرات</p>
              )}
            </div>

            {/* Development Info */}
            {isDevelopment && errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 mb-2">
                  تفاصيل تقنية (للمطورين)
                </summary>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-60 text-xs font-mono">
                  <div className="mb-4">
                    <p className="text-yellow-400 font-bold mb-1">Stack Trace:</p>
                    <pre className="whitespace-pre-wrap">{error?.stack}</pre>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold mb-1">Component Stack:</p>
                    <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                  </div>
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={this.handleReset} variant="primary" icon={<RefreshCw size={18} />}>
                حاول مرة أخرى
              </Button>

              <Button onClick={this.handleReload} variant="secondary" icon={<RefreshCw size={18} />}>
                إعادة تحميل الصفحة
              </Button>

              <Button onClick={this.handleGoHome} variant="secondary" icon={<Home size={18} />}>
                الصفحة الرئيسية
              </Button>

              <Button onClick={this.reportBug} variant="ghost" icon={<Bug size={18} />}>
                إبلاغ عن الخطأ
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                إذا استمرت المشكلة، يرجى التواصل مع فريق الدعم الفني
              </p>
              <p className="text-sm text-gray-500 mt-1">📧 support@unionsphere.gov.ye</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error Boundary خفيف للمكونات الصغيرة
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg" dir="rtl">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="text-red-600" size={24} />
        <h3 className="font-bold text-red-800">حدث خطأ في هذا القسم</h3>
      </div>
      <p className="text-sm text-red-700 mb-4">{error.message}</p>
      <Button onClick={resetError} variant="danger" size="sm" icon={<RefreshCw size={16} />}>
        إعادة المحاولة
      </Button>
    </div>
  );
}
