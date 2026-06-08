
const DB_NAME = 'GMAO_Offline_DB';
const STORE_NAME = 'stagedUploads';
const DB_VERSION = 1;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const offlineBinaryStorage = {
  saveBinary: async (blob: Blob | File, filename?: string): Promise<string> => {
    const db = await getDB();
    const id = crypto.randomUUID();
    const record = {
      id,
      blob,
      filename: filename || (blob instanceof File ? blob.name : 'upload'),
      contentType: blob.type,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record, id);
        
        request.onerror = () => {
          if (request.error?.name === 'QuotaExceededError') {
             reject(new Error('Storage quota exceeded'));
          } else {
             reject(request.error);
          }
        };
        request.onsuccess = () => resolve(id);
      } catch (e) {
        reject(e);
      }
    });
  },

  getBinary: async (id: string): Promise<Blob | null> => {
    const db = await getDB();
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
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  cleanup: async (days: number): Promise<void> => {
    const db = await getDB();
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
