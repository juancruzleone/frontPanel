/**
 * R4/R5 — Delta/tombstone application tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

// IDB mock
const stores: Record<string, Record<string, unknown>> = {}
const persistedKey = { algorithm: { name: 'AES-GCM' }, extractable: false } as unknown as CryptoKey
function mkReq(result?: unknown) {
  let ok: ((e: { target: { result: unknown } }) => void) | null = null
  const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result, error: null }
  queueMicrotask(() => ok?.({ target: { result } }))
  return r
}
vi.stubGlobal('indexedDB', {
  open: vi.fn().mockImplementation(() => {
    let ok: ((e: { target: { result: unknown } }) => void) | null = null
    const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result: undefined as unknown, error: null }
    queueMicrotask(() => {
      r.result = {
        objectStoreNames: { contains: () => true },
        transaction: () => {
          const s = (name: string) => stores[name] ?? (stores[name] = {})
          const tx = {
            objectStore: (n: string) => ({
              put: vi.fn().mockImplementation((val: unknown, key?: string) => { const v = val as Record<string, unknown>; s(n)[key ?? (v.id as string) ?? 'x'] = val; return mkReq(undefined) }),
              get: vi.fn().mockImplementation((k: string) => mkReq(s(n)[k])),
              delete: vi.fn().mockImplementation((k: string) => { delete s(n)[k]; return mkReq(undefined) }),
              getAll: vi.fn().mockImplementation(() => mkReq(Object.values(s(n)))),
            }),
            oncomplete: null as unknown,
            onerror: null as unknown,
          }
          setTimeout(() => tx.oncomplete?.(), 0)
          return tx
        },
      }
      ok?.({ target: { result: r.result } })
    })
    return r
  }),
})

// Trust store mock
vi.mock('@/store/offlineTrustStore', () => ({
  useOfflineTrustStore: {
    getState: () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }),
  },
}))

// Auth mock
localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1' } }))

// Mock generateStorageKey and sealJson to avoid real crypto in IDB transaction flow
vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return { ...orig, generateStorageKey: vi.fn().mockResolvedValue({ algorithm: { name: 'AES-GCM', length: 256 }, extractable: false } as unknown as CryptoKey) }
})
vi.mock('../../../../src/shared/offline/envelope', () => ({
  sealJson: vi.fn().mockImplementation(async ({ value }: { value: unknown }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(JSON.stringify(value)), at: Date.now() })),
  type: {},
}))

const { applyPendingDeltas, getPackageCursor } = await import('../../../../src/shared/offline/packageDelta')
const { sealJson } = await import('../../../../src/shared/offline/envelope')

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('R4/R5 packageDelta', () => {
  beforeEach(() => {
    fetchSpy.mockReset()
    for (const k of Object.keys(stores)) delete stores[k]
    stores.offlinePackageKeys = { 't1:u1:dev-1:p1': { key: persistedKey, scopeKey: 't1:u1:dev-1:p1' } }
    vi.mocked(sealJson).mockClear()
  })

  it('returns empty when no deltas available', async () => {
    fetchSpy.mockResolvedValueOnce(json({ packageId: 'p1', deviceId: 'dev-1', deltas: [], nextCursor: 0, hasMore: false }))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('empty')
    expect(r.nextCursor).toBe(0)
  })

  it('applies upsert delta and advances cursor', { timeout: 15000 }, async () => {
    fetchSpy.mockResolvedValueOnce(json({
      packageId: 'p1', deviceId: 'dev-1',
      deltas: [{ cursor: 1, entityId: 'wo1', collection: 'ordenes_trabajo', operation: 'upsert', data: { _id: 'wo1', estado: 'en_progreso' }, timestamp: '2025-01-01T00:00:00Z' }],
      nextCursor: 1, hasMore: false,
    }))
    try {
      const r = await applyPendingDeltas('p1')
      expect(r.status).toBe('applied')
      expect(r.applied).toBe(1)
      expect(r.nextCursor).toBe(1)
      expect(stores.offlinePackageResources['t1:u1:dev-1:p1:workOrders:delta:wo1']).toMatchObject({ entityId: 'wo1' })
      expect(sealJson).toHaveBeenCalledWith(expect.objectContaining({ key: persistedKey }))
    } catch (e) {
      // Log the actual error for debugging
      throw new Error(`applyPendingDeltas threw: ${e}`)
    }
  })

  it('applies delete delta (tombstone)', { timeout: 15000 }, async () => {
    // Pre-populate a resource
    stores.offlinePackageResources = {
      't1:u1:dev-1:p1:workOrders:wo1': { id: 't1:u1:dev-1:p1:workOrders:wo1', envelope: { v: 4, scopeKey: 't1:u1:dev-1:p1', store: 'workOrders', kid: 'k1', iv: 'i', aad: 'a', ct: 'c', at: Date.now() }, kind: 'workOrders', packageId: 'p1', scopeKey: 't1:u1:dev-1:p1', entityId: 'wo1' },
    }
    fetchSpy.mockResolvedValueOnce(json({
      packageId: 'p1', deviceId: 'dev-1',
      deltas: [{ cursor: 2, entityId: 'wo1', collection: 'ordenes_trabajo', operation: 'delete', reason: 'reassignment', timestamp: '2025-01-01T00:00:00Z' }],
      nextCursor: 2, hasMore: false,
    }))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('applied')
    expect(r.applied).toBe(1)
  })

  it('returns cursor_expired on 410 CURSOR_EXPIRED', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Cursor expired', code: 'CURSOR_EXPIRED' } }, 410))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('cursor_expired')
    expect(r.error).toContain('Cursor expired')
  })

  it('returns fetch_failed on other errors', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Not found', code: 'PACKAGE_NOT_FOUND' } }, 404))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('fetch_failed')
    expect(r.error).toContain('PACKAGE_NOT_FOUND')
  })

  it('returns no_trust when trust store not ready', async () => {
    vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: false, deviceId: null, leaseStatus: 'none', lastVerifiedAt: null, setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('no_trust')
    // Restore
    vi.mocked(await import('@/store/offlineTrustStore')).useOfflineTrustStore.getState = () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid', lastVerifiedAt: Date.now(), setTrustReady: vi.fn(), clearTrust: vi.fn(), setLeaseStatus: vi.fn() })
  })

  it('aborts entire batch on unknown collection — no writes, no cursor advance', async () => {
    fetchSpy.mockResolvedValueOnce(json({
      packageId: 'p1', deviceId: 'dev-1',
      deltas: [
        { cursor: 1, entityId: 'wo1', collection: 'ordenes_trabajo', operation: 'upsert', data: { _id: 'wo1', estado: 'en_progreso' }, timestamp: '2025-01-01T00:00:00Z' },
        { cursor: 2, entityId: 'x', collection: 'unknown_collection', operation: 'upsert', data: { _id: 'x' }, timestamp: '2025-01-01T00:00:00Z' },
      ],
      nextCursor: 2, hasMore: false,
    }))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('unknown_collection')
    expect(r.error).toContain('unknown_collection')
    // Cursor must NOT have advanced — no writes should have occurred
    expect(await getPackageCursor('p1')).toBe(0)
  })

  it('aborts entire batch on unknown operation', async () => {
    fetchSpy.mockResolvedValueOnce(json({
      packageId: 'p1', deviceId: 'dev-1',
      deltas: [{ cursor: 1, entityId: 'wo1', collection: 'ordenes_trabajo', operation: 'invalid_op', data: { _id: 'wo1' }, timestamp: '2025-01-01T00:00:00Z' }],
      nextCursor: 1, hasMore: false,
    }))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('unknown_operation')
    expect(r.error).toContain('invalid_op')
    expect(await getPackageCursor('p1')).toBe(0)
  })

  it('aborts on unknown collection even if first entry is valid', async () => {
    // Pre-populate a resource to verify it's NOT modified
    stores.offlinePackageResources = {
      't1:u1:dev-1:p1:workOrders:wo1': { id: 't1:u1:dev-1:p1:workOrders:wo1', envelope: { v: 4 }, kind: 'workOrders', packageId: 'p1', scopeKey: 't1:u1:dev-1:p1', entityId: 'wo1' },
    }
    fetchSpy.mockResolvedValueOnce(json({
      packageId: 'p1', deviceId: 'dev-1',
      deltas: [
        { cursor: 1, entityId: 'wo1', collection: 'ordenes_trabajo', operation: 'delete', reason: 'reassignment', timestamp: '2025-01-01T00:00:00Z' },
        { cursor: 2, entityId: 'z', collection: 'alien_collection', operation: 'upsert', data: { _id: 'z' }, timestamp: '2025-01-01T00:00:00Z' },
      ],
      nextCursor: 2, hasMore: false,
    }))
    const r = await applyPendingDeltas('p1')
    expect(r.status).toBe('unknown_collection')
    // Original resource must still exist (batch aborted before any writes)
    expect(stores.offlinePackageResources['t1:u1:dev-1:p1:workOrders:wo1']).toBeDefined()
    expect(await getPackageCursor('p1')).toBe(0)
  })

  it('getPackageCursor returns 0 for new package', async () => {
    expect(await getPackageCursor('new-pkg')).toBe(0)
  })

  it('sends correct getDelta parameters', async () => {
    fetchSpy.mockResolvedValueOnce(json({ packageId: 'p1', deviceId: 'dev-1', deltas: [], nextCursor: 5, hasMore: false }))
    await applyPendingDeltas('p1')
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.packageId).toBe('p1')
    expect(body.deviceId).toBe('dev-1')
    expect(body.clientCursor).toBe(0) // default cursor
  })
})
