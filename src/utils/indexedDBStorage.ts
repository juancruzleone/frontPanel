import { StateStorage } from 'zustand/middleware'

const DB_NAME = 'GMAO_Zustand_DB';
const STORE_NAME = 'states';
const DB_VERSION = 1;

const awaitTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };

    transaction.oncomplete = () => settle(resolve);
    transaction.onerror = () => settle(() => reject(
      transaction.error ?? new DOMException('IndexedDB transaction failed', 'UnknownError'),
    ));
    transaction.onabort = () => settle(() => reject(
      transaction.error ?? new DOMException('IndexedDB transaction aborted', 'AbortError'),
    ));
  });

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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

export const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, name);
    await awaitTransaction(transaction);
  },
  removeItem: async (name: string): Promise<void> => {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(name);
    await awaitTransaction(transaction);
  },
};
