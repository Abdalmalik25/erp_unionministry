/**
 * error-handler.ts - نظام إدارة الأخطاء المؤسسي المتقدم
 * الإصدار: 3.0.0 (مُصلح للبيئة المتصفح)
 */
// الأنواع | Types
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical' | 'fatal';
export type ErrorCategory = 'network' | 'database' | 'validation' | 'auth' | 'sync' | 'backup' | 'ui' | 'system' | 'security' | 'storage' | 'performance' | 'external' | 'business';
export type ErrorStatus = 'new' | 'analyzing' | 'recovering' | 'resolved' | 'ignored';
export type RecoveryStrategy = 'retry' | 'fallback' | 'degrade' | 'manual' | 'ignore';
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
    status: ErrorStatus;
    occurrences: number;
    groupId?: string;
}
export interface ErrorHandlerOptions {
    maxErrors?: number;
    enableLocalStorage?: boolean;
    enableAuditLog?: boolean;
    enableNotifications?: boolean;
    enableDeduplication?: boolean;
    deduplicationWindow?: number;
    providers?: any[];
    defaultRecoveryStrategies?: Record<ErrorCategory, RecoveryStrategy>;
}
export interface RecoveryResult {
    success: boolean;
    action: string;
    message?: string;
}
export interface ErrorStatistics {
    total: number;
    open: number;
    resolved: number;
    recovered: number;
    ignored: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
}
const DEFAULT_MAX_ERRORS = 500;
// فئة معالج الأخطاء
export class EnterpriseErrorHandler {
    private static instance: EnterpriseErrorHandler;
    private errors: EnterpriseError[] = [];
    private options: ErrorHandlerOptions;
    private constructor(options: ErrorHandlerOptions = {}) {
        this.options = {
            maxErrors: options.maxErrors || DEFAULT_MAX_ERRORS,
            enableLocalStorage: options.enableLocalStorage ?? true,
            enableAuditLog: options.enableAuditLog ?? true,
            enableNotifications: options.enableNotifications ?? true,
            enableDeduplication: options.enableDeduplication ?? true,
            ...options,
        };
        this.restoreFromLocalStorage();
    }
    public static getInstance(options?: ErrorHandlerOptions): EnterpriseErrorHandler {
        if (!EnterpriseErrorHandler.instance) {
            EnterpriseErrorHandler.instance = new EnterpriseErrorHandler(options);
        }
        return EnterpriseErrorHandler.instance;
    }
    public handle(error: Error | string, category: ErrorCategory = 'system', severity: ErrorSeverity = 'error', details?: Record<string, any>): EnterpriseError {
        const errorObj = error instanceof Error ? error : new Error(error);
        const enterpriseError: EnterpriseError = {
            id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            severity,
            category,
            message: errorObj.message,
            details,
            timestamp: Date.now(),
            userAgent: navigator?.userAgent,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            recovered: false,
            status: 'new',
            occurrences: 1,
        };
        this.errors.push(enterpriseError);
        if (this.errors.length > this.options.maxErrors!) {
            this.errors.shift();
        }
        this.notifyError(enterpriseError);
        this.saveToLocalStorage();
        return enterpriseError;
    }
    public async handleAsync<T>(operation: () => Promise<T>, context: any = {}): Promise<{
        success: boolean;
        data?: T;
        error?: EnterpriseError;
    }> {
        try {
            const data = await operation();
            return { success: true, data };
        }
        catch (error) {
            const enterpriseError = this.handle(error as Error, context.category || 'system', context.severity || 'error', context.details);
            return { success: false, error: enterpriseError };
        }
    }
    public getErrors(filters?: any): EnterpriseError[] {
        let filtered = [...this.errors];
        if (filters?.category) {
            filtered = filtered.filter(e => e.category === filters.category);
        }
        if (filters?.severity) {
            filtered = filtered.filter(e => e.severity === filters.severity);
        }
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
    }
    public getStatistics(): ErrorStatistics {
        const stats = {
            total: this.errors.length,
            open: this.errors.filter(e => e.status !== 'resolved').length,
            resolved: this.errors.filter(e => e.status === 'resolved').length,
            recovered: this.errors.filter(e => e.recovered).length,
            ignored: this.errors.filter(e => e.status === 'ignored').length,
            byCategory: {} as Record<ErrorCategory, number>,
            bySeverity: {} as Record<ErrorSeverity, number>,
            recoveryRate: 0,
        };
        this.errors.forEach(e => {
            stats.byCategory[e.category] = (stats.byCategory[e.category] || 0) + 1;
            stats.bySeverity[e.severity] = (stats.bySeverity[e.severity] || 0) + 1;
        });
        stats.recoveryRate = this.errors.length > 0 ? stats.recovered / this.errors.length : 0;
        return stats;
    }
    public async exportErrors(): Promise<void> {
        // استيراد ديناميكي فقط
        console.log('Export errors:', this.errors.length);
    }
    public updateErrorStatus(errorId: string, status: ErrorStatus): boolean {
        const error = this.errors.find(e => e.id === errorId);
        if (!error)
            return false;
        error.status = status;
        this.saveToLocalStorage();
        return true;
    }
    public clearErrors(olderThanMs?: number): void {
        if (olderThanMs) {
            const cutoff = Date.now() - olderThanMs;
            this.errors = this.errors.filter(e => e.timestamp >= cutoff);
        }
        else {
            this.errors = [];
        }
        this.saveToLocalStorage();
    }
    private notifyError(error: EnterpriseError): void {
        const emoji = error.severity === 'critical' ? '🚨' :
            error.severity === 'error' ? '❌' :
                error.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} [${error.category}] ${error.message}`);
    }
    private saveToLocalStorage(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('error_handler_errors', JSON.stringify(this.errors));
            }
        }
        catch (e) {
            console.error('[ErrorHandler] Failed to save errors to localStorage:', e);
        }
    }
    private restoreFromLocalStorage(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem('error_handler_errors');
                if (stored) {
                    this.errors = JSON.parse(stored);
                }
            }
        }
        catch (e) {
            console.error('[ErrorHandler] Failed to restore errors from localStorage:', e);
        }
    }
}
// React Hook
export function useErrorHandler() {
    const handler = EnterpriseErrorHandler.getInstance();
    return {
        handleError: handler.handle.bind(handler),
        handleAsync: handler.handleAsync.bind(handler),
        getErrors: handler.getErrors.bind(handler),
        getStats: handler.getStatistics.bind(handler),
        clearErrors: handler.clearErrors.bind(handler),
        exportErrors: handler.exportErrors.bind(handler),
    };
}
// وظائف مساعدة
export async function withErrorHandling<T>(operation: () => Promise<T>, context?: any): Promise<{
    success: boolean;
    data?: T;
    error?: EnterpriseError;
}> {
    const handler = EnterpriseErrorHandler.getInstance();
    return handler.handleAsync(operation, context);
}
export async function retry<T>(operation: () => Promise<T>, options: {
    retries?: number;
    delay?: number;
    backoff?: boolean;
} = {}): Promise<T> {
    const { retries = 3, delay = 1000, backoff = true } = options;
    let lastError: Error;
    let attempt = 0;
    while (attempt <= retries) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error as Error;
            attempt++;
            if (attempt > retries)
                break;
            await new Promise(resolve => setTimeout(resolve, backoff ? delay * Math.pow(2, attempt - 1) : delay));
        }
    }
    throw lastError!;
}
export default EnterpriseErrorHandler;
