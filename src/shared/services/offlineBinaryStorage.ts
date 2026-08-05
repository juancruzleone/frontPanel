
import { type OfflineIdentityScope, buildScopeKey, getOrCreateDeviceId } from '../offline/types'
import { openDB } from '../offline/storage'

const STORE_NAME = 'stagedUploads';

/** Read current auth identity and build a scope for owner-stamping. */
function getCurrentScope(): OfflineIdentityScope | null {
  try {
    const authState = window.localStorage.getItem('auth-storage')
    if (!authState) return null
    const parsed = JSON.parse(authState)
    const state = parsed.state
    if (!state?.userId || !state?.tenantId) return null
    return {
      tenantId: state.tenantId,
      userId: state.userId,
      deviceId: getOrCreateDeviceId(),
    }
  } catch {
    return null
  }
}

export const offlineBinaryStorage = {
  saveBinary: async (blob: Blob | File, filename?: string): Promise<string> => {
    const db = await openDB();
    const id = crypto.randomUUID();
    const scope = getCurrentScope();
    const scopedId = scope ? `${buildScopeKey(scope)}:${id}` : id;
    const record = {
      id: scopedId,
      blob,
      filename: filename || (blob instanceof File ? blob.name : 'upload'),
      contentType: blob.type,
      timestamp: Date.now(),
      ownerScope: scope ?? undefined,
    };

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record, scopedId);
        
        request.onerror = () => {
          if (request.error?.name === 'QuotaExceededError') {
             reject(new Error('Storage quota exceeded'));
          } else {
             reject(request.error);
          }
        };
        request.onsuccess = () => resolve(scopedId);
      } catch (e) {
        reject(e);
      }
    });
  },

  getBinary: async (id: string): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.blob : null);
      };
    });
  },

  removeBinary: async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  cleanup: async (days: number): Promise<void> => {
    const db = await openDB();
    const now = Date.now();
    const maxAge = days * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const record = cursor.value;
          if (now - record.timestamp > maxAge) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
};
