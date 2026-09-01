/**
 * IndexedDB Wrapper - غلاف قاعدة البيانات المحلية
 * تخزين البيانات محلياً للعمل دون اتصال
 */
const DB_NAME = 'UnionSphereDB';
const DB_VERSION = 1;
// ============================================================
// أنواع قاعدة البيانات
// ============================================================
interface DBStore {
    name: string;
    keyPath: string;
    autoIncrement?: boolean;
    indexes?: {
        name: string;
        keyPath: string;
        unique?: boolean;
    }[];
}
export const DEFAULT_STORES: DBStore[] = [
    { name: 'unions', keyPath: 'id', indexes: [
            { name: 'name', keyPath: 'name' },
            { name: 'status', keyPath: 'status' },
        ] },
    { name: 'members', keyPath: 'id', indexes: [
            { name: 'unionId', keyPath: 'unionId' },
            { name: 'status', keyPath: 'status' },
        ] },
    { name: 'activities', keyPath: 'id', indexes: [
            { name: 'unionId', keyPath: 'unionId' },
            { name: 'date', keyPath: 'date' },
        ] },
    { name: 'documents', keyPath: 'id', indexes: [
            { name: 'type', keyPath: 'type' },
            { name: 'status', keyPath: 'status' },
        ] },
    { name: 'backups', keyPath: 'id', indexes: [
            { name: 'timestamp', keyPath: 'metadata.timestamp' },
            { name: 'type', keyPath: 'metadata.type' },
        ] },
    { name: 'settings', keyPath: 'key', indexes: [
            { name: 'key', keyPath: 'key' },
        ] },
    { name: 'pending_sync', keyPath: 'id', indexes: [
            { name: 'timestamp', keyPath: 'timestamp' },
            { name: 'synced', keyPath: 'synced' },
            { name: 'priority', keyPath: 'priority' },
        ] },
    { name: 'sync_history', keyPath: 'id', indexes: [
            { name: 'timestamp', keyPath: 'timestamp' },
            { name: 'endpoint', keyPath: 'endpoint' },
        ] },
    { name: 'operation_logs', keyPath: 'id', indexes: [
            { name: 'type', keyPath: 'type' },
            { name: 'status', keyPath: 'status' },
        ] },
    { name: 'cache', keyPath: 'key', indexes: [
            { name: 'timestamp', keyPath: 'timestamp' },
        ] },
    { name: 'pendingActions', keyPath: 'id', autoIncrement: true, indexes: [
            { name: 'timestamp', keyPath: 'timestamp' },
        ] },
];
// ============================================================
// محرك قاعدة البيانات
// ============================================================
class IndexedDBWrapper {
    private db: IDBDatabase | null = null;
    /**
     * فتح قاعدة البيانات
     */
    async open(): Promise<IDBDatabase> {
        if (this.db) {
            return this.db;
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // إنشاء المخازن
                DEFAULT_STORES.forEach((store) => {
                    if (!db.objectStoreNames.contains(store.name)) {
                        const objectStore = db.createObjectStore(store.name, {
                            keyPath: store.keyPath,
                            autoIncrement: store.autoIncrement,
                        });
                        // إنشاء الفهارس
                        store.indexes?.forEach((index) => {
                            objectStore.createIndex(index.name, index.keyPath, {
                                unique: index.unique || false,
                            });
                        });
                    }
                });
            };
        });
    }
    /**
     * إضافة/تحديث عنصر
     */
    async put<T>(storeName: string, item: T): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
    /**
     * إضافة/تحديث عناصر متعددة
     */
    async putMany<T>(storeName: string, items: T[]): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            items.forEach((item) => store.put(item));
            transaction.onerror = () => reject(transaction.error);
            transaction.oncomplete = () => resolve();
        });
    }
    /**
     * الحصول على عنصر
     */
    async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    /**
     * الحصول على جميع العناصر
     */
    async getAll<T>(storeName: string): Promise<T[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    /**
     * البحث باستخدام فهرس
     */
    async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    /**
     * حذف عنصر
     */
    async delete(storeName: string, key: IDBValidKey): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
    /**
     * حذف جميع العناصر
     */
    async clear(storeName: string): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
    /**
     * العد
     */
    async count(storeName: string): Promise<number> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
    /**
     * إغلاق قاعدة البيانات
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    // ============================================================
    // دوال إضافية للـ Offline Support
    // ============================================================
    /**
     * حفظ عملية معلقة
     */
    async getPendingActions(): Promise<any[]> {
        return this.getAll('pendingActions');
    }
    /**
     * حذف عملية معلقة
     */
    async deletePendingAction(id: number): Promise<void> {
        return this.delete('pendingActions', id);
    }
    /**
     * تحديث حقول عملية معلقة (عداد المحاولات)
     */
    async updatePendingAction(id: number, patch: Record<string, unknown>): Promise<void> {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['pendingActions'], 'readwrite');
            const store = transaction.objectStore('pendingActions');
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const target = getReq.result;
                if (target) store.put({ ...target, ...patch });
            };
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
    /**
     * تسجيل عملية للمزامنة
     */
    async queueAction(action: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: string;
    }): Promise<void> {
        await this.put('pendingActions', {
            ...action,
            timestamp: Date.now(),
        });
    }
    /**
     * مزامنة بيانات المخزن
     * معالجة ذكية للأخطاء وتحمل الفشل:
     *  - تُحسب المحاولات لكل عملية (سواء فشل الشبكة أو HTTP).
     *  - استرجاع تصاعدي (Exponential Backoff) عبر حقل nextAttempt.
     *  - تُحذف العملية نهائياً فقط بعد تجاوز الحد الأقصى للمحاولات — منع فقدان
     *    البيانات مع ضمان عدم إغراق الخادم بمحاولات متلاحقة متكررة.
     */
    async sync(): Promise<{
        synced: number;
        retrying: number;
        failed: number;
    }> {
        const pendingActions = await this.getPendingActions();
        const now = Date.now();
        const MAX_ATTEMPTS = 5;
        const BASE_DELAY_MS = 5_000;
        let synced = 0;
        let retrying = 0;
        let failed = 0;
        for (const action of pendingActions) {
            // استرجاع موقوت: لا نعيد المحاولة قبل نضوج المدة التصاعدية
            if ((action as any).nextAttempt && (action as any).nextAttempt > now) {
                retrying++;
                continue;
            }
            try {
                const res = await fetch(action.url, {
                    method: action.method,
                    headers: action.headers,
                    body: action.body,
                });
                if (!res.ok) {
                    const attempts = ((action as any).attempts || 0) + 1;
                    if (attempts >= MAX_ATTEMPTS) {
                        await this.deletePendingAction(action.id);
                        failed++;
                    } else {
                        await this.updatePendingAction(action.id, {
                            attempts,
                            nextAttempt: now + Math.min(60_000, BASE_DELAY_MS * 2 ** (attempts - 1)),
                        });
                        retrying++;
                    }
                    continue;
                }
                await this.deletePendingAction(action.id);
                synced++;
            }
            catch {
                // فشل الشبكة/عدم الاتصال: لا نضيع البيانات، نجدول إعادة محاولة لاحقاً
                const attempts = ((action as any).attempts || 0) + 1;
                if (attempts >= MAX_ATTEMPTS) {
                    await this.deletePendingAction(action.id);
                    failed++;
                } else {
                    await this.updatePendingAction(action.id, {
                        attempts,
                        nextAttempt: now + Math.min(60_000, BASE_DELAY_MS * 2 ** (attempts - 1)),
                    });
                    retrying++;
                }
            }
        }
        return { synced, retrying, failed };
    }
    /**
     * مسح الكاش المنتهي
     */
    async clearExpiredCache(): Promise<void> {
        const allCache = await this.getAll<{
            key: string;
            timestamp: number;
            ttl: number;
        }>('cache');
        const now = Date.now();
        for (const item of allCache) {
            if (now - item.timestamp > item.ttl) {
                await this.delete('cache', item.key);
            }
        }
    }
}
// Instance واحد مشترك
export const db = new IndexedDBWrapper();
// ============================================================
// دوال مساعدة
// ============================================================
/**
 * تهيئة قاعدة البيانات
 */
export async function initDB(): Promise<IDBDatabase> {
    return db.open();
}
/**
 * حفظ في الكاش
 */
export async function cacheData<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    await db.put('cache', {
        key,
        data,
        timestamp: Date.now(),
        ttl,
    });
}
/**
 * جلب من الكاش
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
    const cached = await db.get<{
        data: T;
        timestamp: number;
        ttl: number;
    }>('cache', key);
    if (!cached) {
        return null;
    }
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
        await db.delete('cache', key);
        return null;
    }
    return cached.data;
}
/**
 * مسح الكاش القديم
 */
export async function clearExpiredCache(): Promise<void> {
    const allCache = await db.getAll<{
        key: string;
        timestamp: number;
        ttl: number;
    }>('cache');
    const now = Date.now();
    for (const item of allCache) {
        if (now - item.timestamp > item.ttl) {
            await db.delete('cache', item.key);
        }
    }
}
export default db;
