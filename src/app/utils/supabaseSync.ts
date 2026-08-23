/**
 * supabaseSync.ts - نظام المزامنة مع Supabase
 * مزامنة تلقائية للاتصال وعدم الاتصال
 */

import { db } from './indexedDB';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * مزامنة بيانات النقابات مع Supabase
 */
export async function syncUnions(): Promise<{ success: number; failed: number }> {
  const pending = await db.getPendingActions();
  let success = 0;
  let failed = 0;

  for (const action of pending) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/unions`, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: action.body,
      });

      if (response.ok || response.status === 409) {
        await db.deletePendingAction(action.id);
        success++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error('[SupabaseSync] Failed to sync action:', e);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * مزامنة البيانات عند استئناف الاتصال
 */
export async function syncAllStores(): Promise<void> {
  if (!navigator.onLine) return;

  const stores = ['unions', 'members', 'activities', 'documents'] as const;
  
  for (const storeName of stores) {
    const pending = await db.getPendingActions();
    const storePending = pending.filter(a => a.url.includes(storeName));
    
    if (storePending.length === 0) continue;

    // مزامنة كل عملية معلقة
    for (const action of storePending) {
      await db.queueAction({
        url: action.url,
        method: action.method,
        headers: action.headers,
        body: action.body,
      });
    }
  }
}

/**
 * تسجيل change listener للمزامنة التلقائية
 */
export function setupAutoSync(): () => void {
  const handleOnline = async () => {
    console.log('[Sync] Connection restored, starting sync...');
    await syncAllStores();
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}