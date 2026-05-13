import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup después de cada test
afterEach(() => {
  cleanup()
})

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock de IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock de ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock de localStorage con implementación funcional
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
}

global.localStorage = createLocalStorageMock() as any
global.sessionStorage = createLocalStorageMock() as any

// Mock de indexedDB funcional para tests
const createIDBMock = () => {
  const dbs = new Map();

  return {
    open: (name: string) => {
      const request: any = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          objectStoreNames: {
            contains: () => true
          },
          transaction: (storeName: string) => {
            const store = dbs.get(name) || new Map();
            dbs.set(name, store);
            return {
              objectStore: () => ({
                get: (key: string) => {
                  const req: any = { onsuccess: null, onerror: null, result: store.get(key) };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                  return req;
                },
                getAll: () => {
                  const req: any = { onsuccess: null, onerror: null, result: Array.from(store.values()) };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                  return req;
                },
                put: (val: any, key: string) => {
                  store.set(key, val);
                  const req: any = { onsuccess: null, onerror: null };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                  return req;
                },
                add: (val: any) => {
                  const key = val.id;
                  store.set(key, val);
                  const req: any = { onsuccess: null, onerror: null };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                  return req;
                },
                delete: (key: string) => {
                  store.delete(key);
                  const req: any = { onsuccess: null, onerror: null };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                  return req;
                },
                clear: () => {
                  store.clear();
                  const req: any = { onsuccess: null, onerror: null };
                  setTimeout(() => req.onsuccess && req.onsuccess({ target: req }), 0);
                  return req;
                }
              }),
              oncomplete: null,
              onerror: null
            };
          }
        }
      };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      return request;
    }
  };
};

global.indexedDB = createIDBMock() as any;

// Mock de fetch
global.fetch = vi.fn()

// Mock de console para tests más limpios
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
