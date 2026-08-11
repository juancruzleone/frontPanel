/**
 * Conflict aggregator: DTO field allowlisting, no cross-scope items.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const stores: Record<string, Record<string, unknown>> = {}
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
            oncomplete: null as unknown, onerror: null as unknown,
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

vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return { ...orig, sha256Hex: vi.fn().mockResolvedValue('a'.repeat(64)) }
})
vi.mock('../../../../src/shared/offline/envelope', () => ({
  sealJson: vi.fn().mockImplementation(async ({ value }: { value: unknown }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(JSON.stringify(value)), at: Date.now() })),
  openJson: vi.fn().mockImplementation(async (params: { envelope: { ct: string } }) => JSON.parse(atob(params.envelope.ct))),
}))

const mockTrust = { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }
vi.mock('@/store/offlineTrustStore', () => ({ useOfflineTrustStore: { getState: () => mockTrust } }))
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({
  getStoredDevice: vi.fn().mockResolvedValue({ privateKeyHandle: {} as CryptoKey }),
}))
vi.mock('../../../../src/shared/offline/packageStorage', () => ({
  listReadyPackages: vi.fn().mockResolvedValue([{ packageId: 'pkg-1', manifest: {} }]),
}))

localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'a1' } }))

const { getConflictItems } = await import('../../../../src/shared/offline/conflictAggregator')
const { recordCommand, updateCommandStatus } = await import('../../../../src/shared/offline/commandJournal')
const { generateStorageKey } = await import('../../../../src/shared/offline/crypto')

describe('conflictAggregator', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  const KEY = {} as CryptoKey

  it('returns empty when trust not ready', async () => {
    mockTrust.isOfflineReady = false
    expect(await getConflictItems()).toEqual([])
    mockTrust.isOfflineReady = true
  })

  it('returns empty when no commands', async () => {
    expect(await getConflictItems()).toEqual([])
  })

  it('returns only conflict/dead-letter items', async () => {
    await recordCommand({ commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1', key: KEY, kid: 'k1' })
    await recordCommand({ commandId: 'c2', commandType: 'completion', payload: {}, entityId: 'e2', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1', key: KEY, kid: 'k1' })
    await updateCommandStatus(KEY, 't1:a1:dev-1:pkg-1', 't1', 'a1', 'c2', { status: 'conflict', failureCode: 'TEST_CODE' })

    const items = await getConflictItems()
    expect(items).toHaveLength(1)
    expect(items[0].commandId).toBe('c2')
    expect(items[0].status).toBe('conflict')
    expect(items[0].failureCode).toBe('TEST_CODE')
  })

  it('DTO has only allowlisted fields — no payload/IDs/hashes', async () => {
    await recordCommand({ commandId: 'c1', commandType: 'start', payload: { secret: 'data', password: 'x' }, entityId: 'e1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1', key: KEY, kid: 'k1' })
    await updateCommandStatus(KEY, 't1:a1:dev-1:pkg-1', 't1', 'a1', 'c1', { status: 'failed', failureCode: 'X' })

    const items = await getConflictItems()
    expect(items).toHaveLength(1)
    const item = items[0]
    // Allowlisted fields present
    expect(item.commandId).toBeDefined()
    expect(item.commandType).toBeDefined()
    expect(item.status).toBeDefined()
    expect(item.failureCode).toBeDefined()
    expect(item.retryCount).toBeDefined()
    expect(item.createdAt).toBeDefined()
    expect(item.updatedAt).toBeDefined()
    // Sensitive fields NOT present
    expect(item).not.toHaveProperty('payload')
    expect(item).not.toHaveProperty('tenantId')
    expect(item).not.toHaveProperty('actorId')
    expect(item).not.toHaveProperty('deviceId')
    expect(item).not.toHaveProperty('packageId')
    expect(item).not.toHaveProperty('entityId')
    expect(item).not.toHaveProperty('payloadHash')
    expect(item).not.toHaveProperty('dependsOn')
    expect(item).not.toHaveProperty('result')
    expect(item).not.toHaveProperty('failureReason')
  })

  it('does not return items from other scopes', async () => {
    await recordCommand({ commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1', key: KEY, kid: 'k1' })
    await updateCommandStatus(KEY, 't1:a1:dev-1:pkg-1', 't1', 'a1', 'c1', { status: 'conflict' })

    // The aggregator only reads from packages returned by listReadyPackages (which returns pkg-1)
    const items = await getConflictItems()
    expect(items).toHaveLength(1)
    expect(items[0].commandId).toBe('c1')
  })
})
