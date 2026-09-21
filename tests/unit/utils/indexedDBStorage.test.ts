import { beforeEach, describe, expect, it, vi } from 'vitest'

type TransactionOutcome = 'complete' | 'abort' | 'error' | 'error-then-abort'

let nextOutcome: TransactionOutcome = 'complete'
const values: Record<string, string> = {}

function request(result?: unknown): IDBRequest {
  const idbRequest = {
    result,
    error: null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  }
  queueMicrotask(() => idbRequest.onsuccess?.())
  return idbRequest as unknown as IDBRequest
}

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockImplementation(() => {
    const openRequest = {
      result: undefined as unknown as IDBDatabase,
      error: null,
      onsuccess: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onupgradeneeded: null as (() => void) | null,
    }
    queueMicrotask(() => {
      openRequest.result = {
        objectStoreNames: { contains: () => true },
        transaction: () => {
          const outcome = nextOutcome
          nextOutcome = 'complete'
          const transaction = {
            error: null as DOMException | null,
            oncomplete: null as (() => void) | null,
            onerror: null as (() => void) | null,
            onabort: null as (() => void) | null,
            objectStore: () => ({
              get: (key: string) => request(values[key]),
              put: (value: string, key: string) => {
                values[key] = value
                return request()
              },
              delete: (key: string) => {
                delete values[key]
                return request()
              },
            }),
          }
          setTimeout(() => {
            if (outcome === 'abort') {
              transaction.error = new DOMException('Write aborted', 'AbortError')
              transaction.onabort?.()
              return
            }
            if (outcome === 'error' || outcome === 'error-then-abort') {
              transaction.error = new DOMException('Write failed', 'UnknownError')
              transaction.onerror?.()
              if (outcome === 'error-then-abort') transaction.onabort?.()
              return
            }
            transaction.oncomplete?.()
          }, 0)
          return transaction
        },
      } as unknown as IDBDatabase
      openRequest.onsuccess?.()
    })
    return openRequest
  }),
})

const { indexedDBStorage } = await import('../../../src/utils/indexedDBStorage')

describe('indexedDBStorage transaction durability', () => {
  beforeEach(() => {
    nextOutcome = 'complete'
    for (const key of Object.keys(values)) delete values[key]
  })

  it('rejects setItem when the transaction aborts after the put request succeeds', async () => {
    nextOutcome = 'abort'

    await expect(indexedDBStorage.setItem('state', 'value')).rejects.toThrow('Write aborted')
  })

  it('rejects removeItem when the transaction aborts after the delete request succeeds', async () => {
    values.state = 'value'
    nextOutcome = 'abort'

    await expect(indexedDBStorage.removeItem('state')).rejects.toThrow('Write aborted')
  })

  it('rejects a write when the transaction reports an error', async () => {
    nextOutcome = 'error'

    await expect(indexedDBStorage.setItem('state', 'value')).rejects.toThrow('Write failed')
  })

  it('keeps a successful request pending until its transaction completes', async () => {
    let settled = false
    const write = indexedDBStorage.setItem('state', 'value').finally(() => {
      settled = true
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(settled).toBe(false)

    await expect(write).resolves.toBeUndefined()
    expect(settled).toBe(true)
    await expect(indexedDBStorage.removeItem('state')).resolves.toBeUndefined()
  })

  it('settles once when an error is followed by an abort event', async () => {
    nextOutcome = 'error-then-abort'

    await expect(indexedDBStorage.setItem('state', 'value')).rejects.toThrow('Write failed')
  })
})
