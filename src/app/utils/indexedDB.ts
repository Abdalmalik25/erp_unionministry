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
     */
    async sync(): Promise<{
        synced: number;
    }> {
        // منطق المزامنة البسيط
        const pendingActions = await this.getPendingActions();
        let synced = 0;
        for (const action of pendingActions) {
            try {
                await fetch(action.url, {
                    method: action.method,
                    headers: action.headers,
                    body: action.body,
                });
                await this.deletePendingAction(action.id);
                synced++;
            }
            catch (e) {
                console.error('[IndexedDB] Failed to sync pending action:', e);
            }
        }
        return { synced };
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
