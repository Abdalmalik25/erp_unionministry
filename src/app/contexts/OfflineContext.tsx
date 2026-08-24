/**
 * Offline Context - سياق العمل دون اتصال
 * إدارة حالة الاتصال والبيانات المخزنة مؤقتاً
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, initDB, cacheData } from '../utils/indexedDB';
import { toast } from '../components/ui/Toast';
interface OfflineContextType {
    isOnline: boolean;
    isOfflineReady: boolean;
    pendingActions: number;
    cacheSize: number;
    syncStatus: 'idle' | 'syncing' | 'error';
    // العمليات الأساسية
    saveUnion: (union: any) => Promise<void>;
    saveMember: (member: any) => Promise<void>;
    saveActivity: (activity: any) => Promise<void>;
    saveDocument: (document: any) => Promise<void>;
    // العمليات العكسية
    getUnions: () => Promise<any[]>;
    getMembers: () => Promise<any[]>;
    getActivities: () => Promise<any[]>;
    getDocuments: () => Promise<any[]>;
    // المزامنة
    syncAll: () => Promise<void>;
    clearCache: () => Promise<void>;
    autoSyncPendingActions: () => Promise<void>;
}
const OfflineContext = createContext<OfflineContextType | undefined>(undefined);
export function OfflineProvider({ children }: {
    children: React.ReactNode;
}) {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine ?? true);
    const [isOfflineReady, setIsOfflineReady] = useState(false);
    const [pendingActions, setPendingActions] = useState(0);
    const [cacheSize] = useState(0);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
    // تهيئة قاعدة البيانات
    useEffect(() => {
        initDB().then(() => {
            setIsOfflineReady(true);
            if (import.meta.env.DEV) console.log('[Offline] IndexedDB initialized');
        }).catch((error) => {
            if (import.meta.env.DEV) console.error('[Offline] Failed to initialize IndexedDB:', error);
            toast.error('فشل تهيئة قاعدة البيانات المحلية');
        });
    }, []);
    // مراقبة حالة الاتصال
    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            toast.success('تم استئناف الاتصال بالإنترنت');
            // المزامنة التلقائية عند عودة الاتصال
            await syncAll();
            await autoSyncPendingActions();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('تم فقدان الاتصال - سيتم حفظ البيانات محلياً');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    // تحديث عدد العمليات المعلقة
    useEffect(() => {
        const updatePendingCount = async () => {
            const actions = await db.getAll('pendingActions');
            setPendingActions(actions.length);
        };
        const interval = setInterval(updatePendingCount, 5000);
        updatePendingCount();
        return () => clearInterval(interval);
    }, []);
    // حفظ البيانات محلياً
    const saveUnion = useCallback(async (union: any) => {
        try {
            await db.put('unions', union);
            await cacheData(`union_${union.id}`, union, 24 * 60 * 60 * 1000);
            if (!isOnline) {
                await db.queueAction({
                    url: `/api/unions/${union.id}`,
                    method: union.id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(union),
                });
                setPendingActions(prev => prev + 1);
            }
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to save union:', error);
            toast.error('فشل حفظ البيانات محلياً');
            throw error;
        }
    }, [isOnline]);
    const saveMember = useCallback(async (member: any) => {
        try {
            await db.put('members', member);
            await cacheData(`member_${member.id}`, member, 24 * 60 * 60 * 1000);
            if (!isOnline) {
                await db.queueAction({
                    url: `/api/members/${member.id}`,
                    method: member.id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(member),
                });
                setPendingActions(prev => prev + 1);
            }
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to save member:', error);
            toast.error('فشل حفظ البيانات محلياً');
            throw error;
        }
    }, [isOnline]);
    const saveActivity = useCallback(async (activity: any) => {
        try {
            await db.put('activities', activity);
            await cacheData(`activity_${activity.id}`, activity, 24 * 60 * 60 * 1000);
            if (!isOnline) {
                await db.queueAction({
                    url: `/api/activities/${activity.id}`,
                    method: activity.id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(activity),
                });
                setPendingActions(prev => prev + 1);
            }
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to save activity:', error);
            toast.error('فشل حفظ البيانات محلياً');
            throw error;
        }
    }, [isOnline]);
    const saveDocument = useCallback(async (document: any) => {
        try {
            await db.put('documents', document);
            await cacheData(`document_${document.id}`, document, 24 * 60 * 60 * 1000);
            if (!isOnline) {
                await db.queueAction({
                    url: `/api/documents/${document.id}`,
                    method: document.id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(document),
                });
                setPendingActions(prev => prev + 1);
            }
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to save document:', error);
            toast.error('فشل حفظ البيانات محلياً');
            throw error;
        }
    }, [isOnline]);
    // استرجاع البيانات
    const getUnions = useCallback(async () => {
        try {
            return await db.getAll('unions');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to get unions:', error);
            return [];
        }
    }, []);
    const getMembers = useCallback(async () => {
        try {
            return await db.getAll('members');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to get members:', error);
            return [];
        }
    }, []);
    const getActivities = useCallback(async () => {
        try {
            return await db.getAll('activities');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to get activities:', error);
            return [];
        }
    }, []);
    const getDocuments = useCallback(async () => {
        try {
            return await db.getAll('documents');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Failed to get documents:', error);
            return [];
        }
    }, []);
    // المزامنة
    const syncAll = useCallback(async () => {
        if (!isOnline)
            return;
        setSyncStatus('syncing');
        try {
            const result = await db.sync();
            setPendingActions(0);
            toast.success(`تم المزامنة: ${result.synced} عنصر مُزامن`);
            setSyncStatus('idle');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Sync failed:', error);
            toast.error('فشلت عملية المزامنة');
            setSyncStatus('error');
        }
    }, [isOnline]);
    const clearCache = useCallback(async () => {
        try {
            await db.clear('cache');
            await db.clearExpiredCache();
            toast.success('تم مسح الذاكرة المؤقتة');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Clear cache failed:', error);
            toast.error('فشل مسح الذاكرة المؤقتة');
        }
    }, []);
    // المزامنة التلقائية للعمليات المعلقة مع واجهة برمجة المنصة الوطنية
    // العمليات تبقى محفوظة محلياً (IndexedDB) حتى تنفيذها عبر نقاط النهاية الرسمية
    const autoSyncPendingActions = useCallback(async () => {
        if (!isOnline || pendingActions === 0)
            return;
        setSyncStatus('syncing');
        try {
            // لا توجد قناة مزامنة خارجية — تُنفذ العمليات عند توافر الخدمة المختصة
            if (import.meta.env.DEV) console.info(`[Offline] ${pendingActions} عملية معلقة بانتظار التزامن`);
            setSyncStatus('idle');
        }
        catch (error) {
            if (import.meta.env.DEV) console.error('[Offline] Auto-sync failed:', error);
            setSyncStatus('error');
        }
    }, [isOnline, pendingActions]);
    return (<OfflineContext.Provider value={{
            isOnline,
            isOfflineReady,
            pendingActions,
            cacheSize,
            syncStatus,
            saveUnion,
            saveMember,
            saveActivity,
            saveDocument,
            getUnions,
            getMembers,
            getActivities,
            getDocuments,
            syncAll,
            clearCache,
            autoSyncPendingActions,
        }}>
      {children}
    </OfflineContext.Provider>);
}
export function useOffline() {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within OfflineProvider');
    }
    return context;
}
