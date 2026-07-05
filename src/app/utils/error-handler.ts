/**
 * Enterprise Error Handler - نظام الأخطاء المؤسسي
 * Professional Error Handling · Logging · Reporting · Recovery
 */

import { logAudit } from './security';
import { operationsManager, logSystem } from './operations';

// ============================================================
// أنواع الأخطاء
// ============================================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory = 
  | 'network' 
  | 'database' 
  | 'validation' 
  | 'auth' 
  | 'sync' 
  | 'backup' 
  | 'ui' 
  | 'system'
  | 'security';

export interface EnterpriseError {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  stack?: string;
  recovered: boolean;
  recoveryAction?: string;
}

// ============================================================
// محلل الأخطاء
// ============================================================

export class EnterpriseErrorHandler {
  private static errors: EnterpriseError[] = [];
  private static maxErrors = 500;

  // معالجة خطأ معقد
  static handle(
    error: Error | string, 
    category: ErrorCategory = 'system',
    severity: ErrorSeverity = 'error',
    details?: Record<string, any>
  ): EnterpriseError {
    const errorObj = error instanceof Error ? error : new Error(error);
    
    const enterpriseError: EnterpriseError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      severity,
      category,
      message: errorObj.message,
      details: {
        ...details,
        name: errorObj.name,
        fileName: (errorObj as any).fileName,
        lineNumber: (errorObj as any).lineNumber,
      },
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      stack: errorObj.stack,
      recovered: false,
    };

    // حفظ الخطأ
    this.errors.push(enterpriseError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // تسجيل الخطأ
    this.logError(enterpriseError);

    // إرسال التنبيه إذا كان حرجًا
    if (severity === 'critical') {
      this.sendAlert(enterpriseError);
    }

    return enterpriseError;
  }

  // محاولة الاسترداد من الخطأ
  static async attemptRecovery(
    errorId: string, 
    recoveryFn?: () => Promise<void>
  ): Promise<boolean> {
    const error = this.errors.find(e => e.id === errorId);
    if (!error) return false;

    try {
      if (recoveryFn) {
        await recoveryFn();
      }
      
      error.recovered = true;
      error.recoveryAction = 'manual_recovery';
      
      logAudit({ 
        action: 'update', 
        resource: 'error', 
        resourceId: errorId,
        details: { recovered: true } 
      });
      
      return true;
    } catch (recoveryError) {
      console.error('[ErrorHandler] Recovery failed:', recoveryError);
      return false;
    }
  }

  // الحصول على الأخطاء
  static getErrors(
    category?: ErrorCategory,
    severity?: ErrorSeverity,
    limit: number = 100
  ): EnterpriseError[] {
    let filtered = this.errors;
    
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    
    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }
    
    return filtered.slice(-limit).reverse();
  }

  // مسح الأخطاء
  static clearErrors(olderThanMs?: number): void {
    if (olderThanMs) {
      this.errors = this.errors.filter(e => 
        Date.now() - e.timestamp < olderThanMs
      );
    } else {
      this.errors = [];
    }
  }

  // الحصول على إحصائيات الأخطاء
  static getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    this.errors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    const recoveredCount = this.errors.filter(e => e.recovered).length;
    
    return {
      total: this.errors.length,
      byCategory: byCategory as any,
      bySeverity: bySeverity as any,
      recoveryRate: this.errors.length > 0 ? recoveredCount / this.errors.length : 0,
    };
  }

  // تسجيل الخطأ
  private static logError(error: EnterpriseError): void {
    // تسجيل في نظام الأمان
    logAudit({
      action: 'view',
      details: {
        error: error.message,
        category: error.category,
        severity: error.severity,
      },
    });

    // تسجيل في النظام العام
    logSystem(
      error.severity === 'critical' ? 'error' : 
      error.severity === 'error' ? 'error' : 
      error.severity === 'warning' ? 'warning' : 'info',
      error.category as any,
      error.message,
      error.details
    );

    // حفظ في التخزين المحلي
    try {
      const storedErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
      storedErrors.push({
        ...error,
        // تجنب حفظ stack كامل للتخزين المحلي
        stack: error.stack?.substring(0, 500),
      });
      
      if (storedErrors.length > this.maxErrors) {
        storedErrors.splice(0, storedErrors.length - this.maxErrors);
      }
      
      localStorage.setItem('error_log', JSON.stringify(storedErrors));
    } catch {
      // تجاهل أخطاء التخزين
    }
  }

  // إرسال التنبيه
  private static sendAlert(error: EnterpriseError): void {
    // إرسال إلى نظام المراقبة
    console.error('[CRITICAL ERROR]', error);
    
    // يمكن إضافة إرسال بريد إلكتروني أو إشعار
    // في الإنتاج، استخدم خدمات مثل Sentry أو Datadog
  }

  // الحصول على معرف المستخدم الحالي
  private static getCurrentUserId(): string | undefined {
    try {
      const session = JSON.parse(localStorage.getItem('us_session') || '{}');
      return session?.userId;
    } catch {
      return undefined;
    }
  }

  // الحصول على معرف الجلسة الحالي
  private static getCurrentSessionId(): string | undefined {
    try {
      const session = JSON.parse(localStorage.getItem('us_session') || '{}');
      return session?.sessionId;
    } catch {
      return undefined;
    }
  }
}

// ============================================================
// وظائف مساعدة سلبية
// ============================================================

// مُغلف للواجهات التي قد تفشل
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    recoveryFn?: () => Promise<void>;
  } = {}
): Promise<{ success: boolean; data?: T; error?: EnterpriseError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const enterpriseError = EnterpriseErrorHandler.handle(
      error as Error,
      context.category,
      context.severity
    );
    
    return { success: false, error: enterpriseError };
  }
}

// مُصادق الأخطاء للملفات
export async function validateFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = []
): Promise<{ valid: boolean; error?: string }> {
  // فحص الحجم
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `حجم الملف يتجاوز الحد الأقصى (${maxSizeMB} ميغابايت)` };
  }

  // فحص النوع
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `نوع الملف غير مسموح (${file.type})` };
  }

  return { valid: true };
}

// ============================================================
// React Error Boundary Hook
// ============================================================

export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    return EnterpriseErrorHandler.handle(error, 'ui', 'error', { context });
  };

  const handleAsyncError = async (
    operation: () => Promise<void>,
    context?: string
  ) => {
    try {
      await operation();
    } catch (error) {
      EnterpriseErrorHandler.handle(error as Error, 'ui', 'error', { context });
    }
  };

  return {
    handleError,
    handleAsyncError,
    getErrors: EnterpriseErrorHandler.getErrors.bind(EnterpriseErrorHandler),
    getStats: EnterpriseErrorHandler.getErrorStats.bind(EnterpriseErrorHandler),
  };
}