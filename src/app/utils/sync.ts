/**
 * Enterprise Sync System - نظام المزامنة الأونلاين/أوفلاين المؤسسي
 * Reliable Sync · Offline Support · Conflict Resolution · Cloud Integration
 */

import { db } from './indexedDB';
import { operationsManager, Operation } from './operations';
import { logAudit } from './security';

// ============================================================
// أنواع المزامنة
// ============================================================

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'syncing';

export interface SyncItem<T = any> {
  id: string;
  data: T;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  synced: boolean;
  retryCount: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  endpoint: string;
  attemptTime?: number;
  error?: string;
  conflict?: {
    serverVersion?: T;
    localVersion?: T;
    resolution?: 'local' | 'server' | 'merge';
  };
}

export interface SyncStats {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSync: number | null;
  averageSyncTime: number;
}

export interface SyncResult {
  successful: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

// ============================================================
// الحقل الذي يتحقق من الاتصال
// ============================================================

export function getConnectionStatus(): ConnectionStatus {
  return navigator.onLine ? 'online' : 'offline';
}

// ============================================================
// مراقبة حالة الاتصال
// ============================================================

export function monitorConnection(
  onOnline: () => void,
  onOffline: () => void,
  onSync?: () => void
): () => void {
  const handleOnline = () => {
    onOnline();
    if (onSync) {
      onSync();
      processPendingSync().catch(console.error);
    }
  };

  const handleOffline = () => {
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ============================================================
// حفظ العملية معلقة للمزامنة
// ============================================================

export async function savePendingSync<T>(
  action: SyncItem['action'],
  endpoint: string,
  data: T,
  priority: SyncItem['priority'] = 'normal'
): Promise<string> {
  // استخدام اسم مخزن موحد: pending_sync
  const syncItem: SyncItem<T> = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    data,
    action,
    timestamp: Date.now(),
    synced: false,
    retryCount: 0,
    priority,
    endpoint,
  };

  await db.put('pending_sync', syncItem);
  logAudit({ action: 'create', resource: 'sync_item', resourceId: syncItem.id, details: { action, priority } });

  return syncItem.id;
}

// ============================================================
// معالجة المزامنة المعلقة
// ============================================================

export async function processPendingSync(): Promise<SyncResult> {
  if (!navigator.onLine) {
    console.log('[Sync] Still offline, skipping sync');
    return { successful: 0, failed: 0, conflicts: 0, errors: ['غير متصل بالإنترنت'] };
  }

  const operation = operationsManager.createOperation('sync', 1, { type: 'batch_sync' });
  const pendingItems = await db.getAll<SyncItem>('pending_sync');

  let successful = 0;
  let failed = 0;
  let conflicts = 0;
  const errors: string[] = [];

  for (const item of pendingItems) {
    try {
      operationsManager.updateProgress(operation.id, 1, `مزامنة العنصر ${successful + failed + 1}/${pendingItems.length}...`);
      
      await syncToServer(item);

      // تم المزامنة الناجحة
      const updatedItem = { ...item, synced: true };
      await db.put('pending_sync', updatedItem);

      successful++;
      logAudit({ action: 'update', resource: 'sync_item', resourceId: item.id, details: { status: 'synced' } });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      failed++;
      errors.push(errorMsg);

      // زيادة عداد المحاولات
      const updatedItem = { 
        ...item, 
        retryCount: (item.retryCount || 0) + 1,
        attemptTime: Date.now(),
        error: errorMsg,
      };

      if ((updatedItem.retryCount || 0) >= 3) {
        // حذف العنصر بعد 3 محاولات فاشلة
        await db.delete('pending_sync', item.id);
        logAudit({ action: 'delete', resource: 'sync_item', resourceId: item.id, details: { reason: 'max_retries_exceeded' } });
      } else {
        await db.put('pending_sync', updatedItem);
      }
    }
  }

  operationsManager.completeOperation(operation.id, `${successful} عناصر مزامنة بنجاح`);

  return { successful, failed, conflicts, errors };
}

// ============================================================
// مزامنة العنصر للخادم
// ============================================================

async function syncToServer<T>(item: SyncItem<T>): Promise<void> {
  const response = await fetch(item.endpoint, {
    method: getMethodFromAction(item.action),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sync failed with status ${response.status}: ${errorText}`);
  }
}

// ============================================================
// الحصول على طريقة HTTP من الإجراء
// ============================================================

function getMethodFromAction(action: SyncItem['action']): string {
  switch (action) {
    case 'create':
      return 'POST';
    case 'update':
      return 'PUT';
    case 'delete':
      return 'DELETE';
    default:
      return 'POST';
  }
}

// ============================================================
// إنشاء نسخة احتياطية محلية
// ============================================================

export async function createLocalBackup<T>(key: string, data: T): Promise<void> {
  const backup = {
    data,
    timestamp: Date.now(),
    version: '2.0',
  };

  sessionStorage.setItem(`backup_${key}`, JSON.stringify(backup));
}

// ============================================================
// استعادة النسخة الاحتياطية
// ============================================================

export async function restoreLocalBackup<T>(key: string): Promise<T | null> {
  const backupStr = sessionStorage.getItem(`backup_${key}`);
  
  if (!backupStr) {
    return null;
  }

  try {
    const backup = JSON.parse(backupStr);
    return backup.data as T;
  } catch {
    return null;
  }
}

// ============================================================
// مزامنة البيانات مع حفظ الحالة
// ============================================================

export async function syncWithState(
  key: string,
  fetchFn: () => Promise<any>,
  saveFn: (data: any) => Promise<void>
): Promise<void> {
  try {
    const data = await fetchFn();
    await saveFn(data);
    await createLocalBackup(key, data);
  } catch (error) {
    console.error('[Sync] Sync failed, attempting local restore:', error);
    
    const backup = await restoreLocalBackup(key);
    if (backup) {
      await saveFn(backup);
    }
    throw error;
  }
}

// ============================================================
// فحص وجود نسخة احتياطية حديثة
// ============================================================

export function hasRecentBackup(key: string, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  const backupStr = sessionStorage.getItem(`backup_${key}`);
  
  if (!backupStr) {
    return false;
  }

  try {
    const backup = JSON.parse(backupStr);
    return Date.now() - backup.timestamp < maxAgeMs;
  } catch {
    return false;
  }
}

// ============================================================
// مزامنة دفعية (Batch Sync)
// ============================================================

export async function batchSync(
  items: SyncItem[],
  batchSize: number = 10
): Promise<SyncResult> {
  const operation = operationsManager.createOperation('sync', items.length, { type: 'batch' });
  
  let successful = 0;
  let failed = 0;
  let conflicts = 0;
  const errors: string[] = [];

  // ترتيب العناصر حسب الأولوية
  const sortedItems = [...items].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // تقسيم إلى دفعات
  for (let i = 0; i < sortedItems.length; i += batchSize) {
    const batch = sortedItems.slice(i, i + batchSize);
    
    operationsManager.updateProgress(
      operation.id, 
      Math.min(i + batchSize, sortedItems.length),
      `معالجة الدفعة ${(i / batchSize) + 1}`
    );

    // محاولة المزامنة الدفعية
    try {
      await Promise.all(batch.map(item => syncToServer(item)));
      successful += batch.length;
      
      // حذف العناصر المزامنة
      await Promise.all(batch.map(item => db.delete('pending_sync', item.id)));
    } catch (batchError) {
      // مزامنة فردية للمتبقيين
      for (const item of batch) {
        try {
          await syncToServer(item);
          successful++;
        } catch (error) {
          failed++;
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    }
  }

  operationsManager.completeOperation(operation.id, `${successful} عناصر مزامنة`);
  return { successful, failed, conflicts, errors };
}

// ============================================================
// الحصول على إحصائيات المزامنة
// ============================================================

export async function getSyncStats(): Promise<SyncStats> {
  const pending = await db.getAll<SyncItem>('pending_sync');
  const synced = await db.getAll<SyncItem>('sync_history');

  const lastSync = synced.length > 0 
    ? Math.max(...synced.map(s => s.timestamp)) 
    : null;

  // حساب متوسط زمن المزامنة
  const syncTimes = synced
    .filter(s => s.attemptTime)
    .map(s => s.timestamp - (s.attemptTime || s.timestamp));
  
  const averageSyncTime = syncTimes.length > 0 
    ? syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length 
    : 0;

  return {
    pendingCount: pending.length,
    syncedCount: synced.length,
    failedCount: pending.filter(p => (p.retryCount || 0) >= 2).length,
    lastSync,
    averageSyncTime,
  };
}

// ============================================================
// مسح محلقات المزامنة الفاشلة
// ============================================================

export async function clearFailedSyncItems(): Promise<number> {
  const pending = await db.getAll<SyncItem>('pending_sync');
  const failedItems = pending.filter(item => (item.retryCount || 0) >= 3);

  for (const item of failedItems) {
    await db.delete('pending_sync', item.id);
  }

  logAudit({ action: 'delete', resource: 'sync_items', details: { count: failedItems.length, reason: 'failed_items_cleared' } });
  return failedItems.length;
}

// ============================================================
// مزامنة مع Supabase
// ============================================================

export async function syncWithSupabase(): Promise<SyncResult> {
  const supabaseUrl = localStorage.getItem('supabase_url');
  const supabaseKey = localStorage.getItem('supabase_key');

  if (!supabaseUrl || !supabaseKey) {
    return { successful: 0, failed: 0, conflicts: 0, errors: ['إعدادات Supabase غير مُعرّفة'] };
  }

  const operation = operationsManager.createOperation('sync', 1, { type: 'supabase_sync' });

  try {
    operationsManager.updateProgress(operation.id, 1, 'مزامنة البيانات مع Supabase...');

    // جلب البيانات المعلقة
    const pendingItems = await db.getAll<SyncItem>('pending_sync');

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of pendingItems) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/${item.endpoint}`, {
          method: getMethodFromAction(item.action),
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined,
        });

        if (response.ok) {
          await db.delete('pending_sync', item.id);
          successful++;
        } else {
          failed++;
          errors.push(`HTTP ${response.status}`);
        }
      } catch (error) {
        failed++;
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    operationsManager.completeOperation(operation.id, `مزامنة Supabase: ${successful} عناصر`);
    return { successful, failed, conflicts: 0, errors };
  } catch (error) {
    operationsManager.failOperation(operation.id, error instanceof Error ? error.message : String(error));
    return { successful: 0, failed: 0, conflicts: 0, errors: [error instanceof Error ? error.message : String(error)] };
  }
}