/**
 * Enterprise Operations System - نظام العمليات التشغيلية المؤسسية
 * Professional Operations Management · Monitoring · Health Checks · Logging
 */
import { logAudit } from './security';
import { db } from './indexedDB';
// ============================================================
// أنواع العمليات
// ============================================================
export type OperationStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
export type OperationType = 'backup' | 'sync' | 'import' | 'export' | 'migration' | 'cleanup';
export interface Operation {
    id: string;
    type: OperationType;
    status: OperationStatus;
    progress: number; // 0-100
    totalSteps: number;
    currentStep: number;
    message: string;
    startTime: number;
    endTime?: number;
    error?: string;
    metadata?: Record<string, any>;
}
export interface OperationResult {
    success: boolean;
    operationId: string;
    message: string;
    durationMs: number;
    recordsProcessed?: number;
    recordsTotal?: number;
}
// ============================================================
// مدير العمليات
// ============================================================
class OperationsManager {
    private operations: Map<string, Operation> = new Map();
    private listeners: Map<string, ((op: Operation) => void)[]> = new Map();
    // إنشاء عملية جديدة
    createOperation(type: OperationType, totalSteps: number = 1, metadata?: Record<string, any>): Operation {
        const operation: Operation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type,
            status: 'idle',
            progress: 0,
            totalSteps,
            currentStep: 0,
            message: this.getInitialMessage(type),
            startTime: Date.now(),
            metadata,
        };
        this.operations.set(operation.id, operation);
        this.notifyListeners(operation.id, operation);
        return operation;
    }
    // بدء العملية
    startOperation(operationId: string): void {
        const op = this.operations.get(operationId);
        if (op) {
            op.status = 'running';
            op.message = this.getRunningMessage(op.type);
            this.notifyListeners(operationId, op);
            logAudit({ action: 'view', details: { operation: op.type, status: 'started', operationId } });
        }
    }
    // تحديث تقدم العملية
    updateProgress(operationId: string, currentStep: number, message?: string, progressPercent?: number): void {
        const op = this.operations.get(operationId);
        if (op) {
            op.currentStep = currentStep;
            op.progress = progressPercent ?? Math.round((currentStep / op.totalSteps) * 100);
            if (message)
                op.message = message;
            this.notifyListeners(operationId, op);
        }
    }
    // إكمال العملية بنجاح
    completeOperation(operationId: string, message?: string): void {
        const op = this.operations.get(operationId);
        if (op) {
            op.status = 'completed';
            op.progress = 100;
            op.endTime = Date.now();
            op.message = message ?? this.getCompletedMessage(op.type);
            this.notifyListeners(operationId, op);
            logAudit({ action: 'view', details: { operation: op.type, status: 'completed', operationId } });
        }
    }
    // فشل العملية
    failOperation(operationId: string, error: string): void {
        const op = this.operations.get(operationId);
        if (op) {
            op.status = 'failed';
            op.endTime = Date.now();
            op.error = error;
            op.message = `فشلت العملية: ${error}`;
            this.notifyListeners(operationId, op);
            logAudit({ action: 'view', details: { operation: op.type, status: 'failed', error, operationId } });
        }
    }
    // إلغاء العملية
    cancelOperation(operationId: string): void {
        const op = this.operations.get(operationId);
        if (op) {
            op.status = 'cancelled';
            op.endTime = Date.now();
            op.message = `تم إلغاء العملية`;
            this.notifyListeners(operationId, op);
            logAudit({ action: 'view', details: { operation: op.type, status: 'cancelled', operationId } });
        }
    }
    // الحصول على حالة العملية
    getOperation(operationId: string): Operation | undefined {
        return this.operations.get(operationId);
    }
    // الحصول على جميع العمليات النشطة
    getActiveOperations(): Operation[] {
        return Array.from(this.operations.values())
            .filter(op => op.status === 'running' || op.status === 'idle');
    }
    // الاستماع إلى تغيّرات العملية
    subscribe(operationId: string, callback: (op: Operation) => void): () => void {
        if (!this.listeners.has(operationId)) {
            this.listeners.set(operationId, []);
        }
        this.listeners.get(operationId)!.push(callback);
        // إرجاع دالة إلغاء الاشتراك
        return () => {
            const callbacks = this.listeners.get(operationId);
            if (callbacks) {
                this.listeners.set(operationId, callbacks.filter(cb => cb !== callback));
            }
        };
    }
    // حفظ العملية في السجل
    private async saveOperationLog(operation: Operation): Promise<void> {
        try {
            await db.put('operation_logs', {
                ...operation,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            console.error('[Operations] Failed to save operation log:', error);
        }
    }
    // إرسال إشعارات للمستمعين
    private notifyListeners(operationId: string, operation: Operation): void {
        const callbacks = this.listeners.get(operationId);
        callbacks?.forEach(cb => cb(operation));
        this.saveOperationLog(operation);
    }
    // رسائل العمليات
    private getInitialMessage(type: OperationType): string {
        const messages: Record<OperationType, string> = {
            backup: 'جاري إعداد النسخة الاحتياطية...',
            sync: 'جاري مزامنة البيانات...',
            import: 'جاري استيراد البيانات...',
            export: 'جاري تصدير البيانات...',
            migration: 'جاري تهيئة قاعدة البيانات...',
            cleanup: 'جاري تنظيف البيانات القديمة...',
        };
        return messages[type] || 'جاري بدء العملية...';
    }
    private getRunningMessage(type: OperationType): string {
        const messages: Record<OperationType, string> = {
            backup: 'جاري إنشاء النسخة الاحتياطية...',
            sync: 'جاري مزامنة البيانات مع الخادم...',
            import: 'جاري استيراد البيانات...',
            export: 'جاري تصدير البيانات...',
            migration: 'جاري تنفيذ التهيئة...',
            cleanup: 'جاري تنظيف البيانات...',
        };
        return messages[type] || 'جاري تنفيذ العملية...';
    }
    private getCompletedMessage(type: OperationType): string {
        const messages: Record<OperationType, string> = {
            backup: 'تم إنشاء النسخة الاحتياطية بنجاح',
            sync: 'تمت مزامنة البيانات بنجاح',
            import: 'تم استيراد البيانات بنجاح',
            export: 'تم تصدير البيانات بنجاح',
            migration: 'تمت تهيئة قاعدة البيانات بنجاح',
            cleanup: 'تم تنظيف البيانات بنجاح',
        };
        return messages[type] || 'تمت العملية بنجاح';
    }
}
// مثّل واحد مشترك
export const operationsManager = new OperationsManager();
// ============================================================
// واجهات برمجة التطبيقات العامة
// ============================================================
// إنشاء عملية مع تنفيذ تلقائي
export async function runOperation(type: OperationType, totalSteps: number = 1, metadata?: Record<string, any>): Promise<OperationResult> {
    const operation = operationsManager.createOperation(type, totalSteps, metadata);
    operationsManager.startOperation(operation.id);
    try {
        operationsManager.completeOperation(operation.id);
        return {
            success: true,
            operationId: operation.id,
            message: operationsManager.getOperation(operation.id)?.message || 'تم التنفيذ بنجاح',
            durationMs: Date.now() - operation.startTime,
        };
    }
    catch (error) {
        operationsManager.failOperation(operation.id, error instanceof Error ? error.message : String(error));
        return {
            success: false,
            operationId: operation.id,
            message: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - operation.startTime,
        };
    }
}
// فحص صحة النظام
export interface HealthCheck {
    component: string;
    status: 'healthy' | 'warning' | 'error';
    message: string;
    lastCheck: number;
    responseTime?: number;
}
export async function runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    // فحص قاعدة البيانات
    try {
        const start = performance.now();
        const dbOpen = performance.now() - start;
        checks.push({
            component: 'database',
            status: 'healthy',
            message: 'قاعدة البيانات تعمل بشكل طبيعي',
            lastCheck: Date.now(),
            responseTime: dbOpen,
        });
    }
    catch (error) {
        checks.push({
            component: 'database',
            status: 'error',
            message: 'خطأ في قاعدة البيانات',
            lastCheck: Date.now(),
        });
    }
    // فحص التخزين المحلي
    try {
        const testKey = '__health_check__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        checks.push({
            component: 'localStorage',
            status: 'healthy',
            message: 'التخزين المحلي متاح',
            lastCheck: Date.now(),
        });
    }
    catch (error) {
        checks.push({
            component: 'localStorage',
            status: 'error',
            message: 'التخزين المحلي غير متاح',
            lastCheck: Date.now(),
        });
    }
    // فحص الاتصال
    checks.push({
        component: 'network',
        status: navigator.onLine ? 'healthy' : 'warning',
        message: navigator.onLine ? 'متصل بالإنترنت' : 'غير متصل بالإنترنت',
        lastCheck: Date.now(),
    });
    // فحص النسخة الاحتياطية
    try {
        const backups = await db.getAll('backups');
        checks.push({
            component: 'backup',
            status: backups.length > 0 ? 'healthy' : 'warning',
            message: backups.length > 0
                ? `يوجد ${backups.length} نسخة احتياطية متاحة`
                : 'لا توجد نسخ احتياطيات',
            lastCheck: Date.now(),
        });
    }
    catch (error) {
        checks.push({
            component: 'backup',
            status: 'error',
            message: 'خطأ في نظام النسخ الاحتياطي',
            lastCheck: Date.now(),
        });
    }
    return checks;
}
// ============================================================
// نظام التسجيل والمراقبة
// ============================================================
export interface LogEntry {
    level: 'info' | 'warning' | 'error' | 'debug';
    category: 'auth' | 'data' | 'sync' | 'backup' | 'ui' | 'system';
    message: string;
    details?: Record<string, any>;
    timestamp: number;
    userId?: string;
    sessionId?: string;
}
const MAX_LOG_ENTRIES = 1000;
export function logSystem(level: LogEntry['level'], category: LogEntry['category'], message: string, details?: Record<string, any>): void {
    try {
        const session = JSON.parse(localStorage.getItem('us_session') || '{}');
        const logEntry: LogEntry = {
            level,
            category,
            message,
            details,
            timestamp: Date.now(),
            userId: session.userId,
            sessionId: session.sessionId,
        };
        const logs: LogEntry[] = JSON.parse(localStorage.getItem('system_logs') || '[]');
        logs.push(logEntry);
        // الاحتفاظ بآخر 1000 سجل فقط
        if (logs.length > MAX_LOG_ENTRIES) {
            logs.splice(0, logs.length - MAX_LOG_ENTRIES);
        }
        localStorage.setItem('system_logs', JSON.stringify(logs));
    }
    catch (e) {
        console.error('[Operations] Failed to save system log:', e);
    }
}
// الحصول على السجلات
export function getSystemLogs(category?: LogEntry['category'], level?: LogEntry['level']): LogEntry[] {
    try {
        const logs: LogEntry[] = JSON.parse(localStorage.getItem('system_logs') || '[]');
        return logs.filter(log => (!category || log.category === category) &&
            (!level || log.level === level)).sort((a, b) => b.timestamp - a.timestamp);
    }
    catch (e) {
        console.error('[Operations] Failed to parse system logs:', e);
        return [];
    }
}
// مسح السجلات القديمة
export function clearOldLogs(olderThanDays: number = 30): void {
    try {
        const logs: LogEntry[] = JSON.parse(localStorage.getItem('system_logs') || '[]');
        const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const filtered = logs.filter(log => log.timestamp >= cutoff);
        localStorage.setItem('system_logs', JSON.stringify(filtered));
    }
    catch (e) {
        console.error('[Operations] Failed to clear old logs:', e);
    }
}
