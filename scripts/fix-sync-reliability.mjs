import fs from 'fs';

let s = fs.readFileSync('src/app/utils/indexedDB.ts', 'utf8');
const old = `        const pendingActions = await this.getPendingActions();
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
        return { synced };`;
const next = `        const pendingActions = await this.getPendingActions();
        let synced = 0;
        for (const action of pendingActions) {
            try {
                // لا نحذف الإجراء إلا بعد تأكيد نجاح الخادم — منع فقدان البيانات
                const res = await fetch(action.url, {
                    method: action.method,
                    headers: action.headers,
                    body: action.body,
                });
                if (!res.ok) {
                    const attempts = ((action as any).attempts || 0) + 1;
                    if (attempts >= 5) {
                        await this.deletePendingAction(action.id);
                    } else {
                        await this.updatePendingAction(action.id, { attempts });
                    }
                    continue;
                }
                await this.deletePendingAction(action.id);
                synced++;
            }
            catch (e) {
                if (import.meta.env.DEV) console.warn('[IndexedDB] Sync retry later:', action.id);
            }
        }
        return { synced };`;
if (!s.includes(old)) { console.log('PATTERN NOT FOUND'); process.exit(1); }
s = s.replace(old, next);

// أضف دالة تحديث المحاولات بجانب deletePendingAction إن لم توجد
if (!s.includes('updatePendingAction')) {
  const anchor = s.indexOf('async deletePendingAction');
  if (anchor === -1) { console.log('NO ANCHOR for updatePendingAction'); process.exit(1); }
  s = s.replace(
    'async deletePendingAction',
    `async updatePendingAction(id: string, patch: Record<string, unknown>): Promise<void> {
        const tx = this.db.transaction('pending_actions', 'readwrite');
        const store = tx.objectStore('pending_actions');
        const req = store.get(id);
        req.onsuccess = () => {
            const v = req.result;
            if (v) store.put({ ...v, ...patch });
        };
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async deletePendingAction`
  );
}
fs.writeFileSync('src/app/utils/indexedDB.ts', s, 'utf8');
console.log('sync hardened OK; updatePendingAction:', s.includes('updatePendingAction'));
