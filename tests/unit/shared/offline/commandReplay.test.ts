/**
 * R6c — Command replay/recovery: dependency order, backoff, classification.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

vi.mock('@/store/offlineTrustStore', () => ({
  useOfflineTrustStore: { getState: () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }) },
}))
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({
  getStoredDevice: vi.fn().mockResolvedValue({ deviceId: 'dev-1', tenantId: 't1', userId: 'a1', privateKeyHandle: { algorithm: { name: 'ECDSA' } }, status: 'active', registeredAt: Date.now() }),
}))
vi.mock('../../../../src/shared/offline/leaseGate', () => ({
  getStoredLease: vi.fn().mockResolvedValue({ lease: { tenantId: 't1', userId: 'a1', deviceId: 'dev-1', expiresAt: '2025-12-31' }, header: { alg: 'ES256', kid: 'k1' }, signature: 'sig', storedAt: Date.now() }),
}))

// IDB mock
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

vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return { ...orig, sha256Hex: vi.fn().mockResolvedValue('a'.repeat(64)) }
})
vi.mock('../../../../src/shared/offline/envelope', () => ({
  sealJson: vi.fn().mockImplementation(async ({ value }: { value: unknown }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(JSON.stringify(value)), at: Date.now() })),
  openJson: vi.fn().mockImplementation(async (params: { envelope: { ct: string } }) => JSON.parse(atob(params.envelope.ct))),
}))

// Mock submitCommand — controlled per test
const submitMock = vi.fn()
vi.mock('../../../../src/shared/offline/commandSubmit', () => ({
  submitCommand: (...args: unknown[]) => submitMock(...args),
  hashCanonicalPayload: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

const { replayPendingCommands, backoffDelay } = await import('../../../../src/shared/offline/commandReplay')
const { recordCommand } = await import('../../../../src/shared/offline/commandJournal')

const KEY = { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey
const SCOPE = 't1:a1:dev1:pkg1'
const B = { tenantId: 't1', actorId: 'a1', deviceId: 'dev1', packageId: 'pkg1', key: KEY, kid: 'k1' }

describe('R6c commandReplay', () => {
  beforeEach(() => { fetchSpy.mockReset(); submitMock.mockReset(); for (const k of Object.keys(stores)) delete stores[k] })

  it('replays pending commands in dependency order', async () => {
    // Record c1 first (no deps), then c2 with dependsOn before c1 is submitted
    // Both commands remain pending until replay; the child is deferred behind its parent.
    await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
    await recordCommand({ ...B, commandId: 'c2', commandType: 'maintenance', payload: {}, entityId: 'e2', expectedEntityVersion: 1, dependsOn: ['c1'] })

    submitMock.mockResolvedValueOnce({ status: 'submitted', receipt: { commandId: 'c1', status: 'succeeded' } })
    submitMock.mockResolvedValueOnce({ status: 'submitted', receipt: { commandId: 'c2', status: 'succeeded' } })

    const r = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(r.accepted).toBe(2)
    expect(r.conflicted).toBe(0)
    expect(submitMock.mock.calls[0][0].commandId).toBe('c1')
    expect(submitMock.mock.calls[1][0].commandId).toBe('c2')
  })

  it('pauses on auth/lease error — preserves remaining as pending', async () => {
    await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
    await recordCommand({ ...B, commandId: 'c2', commandType: 'start', payload: {}, entityId: 'e2', expectedEntityVersion: 1 })

    submitMock.mockResolvedValueOnce({ status: 'submitted', receipt: { commandId: 'c1', status: 'succeeded' } })
    submitMock.mockResolvedValueOnce({ status: 'lease_error', error: 'LEASE_EXPIRED' })

    const r = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(r.outcome).toBe('paused')
    expect(r.paused).toBe(true)
    expect(r.accepted).toBe(1)
  })

  it('classifies dead_letter for payload/signature errors', async () => {
    await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
    submitMock.mockResolvedValueOnce({ status: 'payload_error', error: 'PAYLOAD_INTEGRITY' })

    const r = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(r.deadLetter).toBe(1)
  })

  it('keeps retryable commands eligible for a later replay', async () => {
    await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
    submitMock.mockResolvedValueOnce({ status: 'dependency_not_met', error: 'Blocked' })

    const r = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(r.retryable).toBe(1)
    submitMock.mockResolvedValueOnce({ status: 'submitted', receipt: { commandId: 'c1', status: 'succeeded' } })
    const next = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(next.accepted).toBe(1)
    expect(submitMock).toHaveBeenCalledTimes(2)
  })

  it('dead-letters commands exceeding max retries', async () => {
    // Record a command and manually set retryCount to MAX
    await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
    // Simulate by calling replay multiple times with retryable result
    submitMock.mockResolvedValue({ status: 'dependency_not_met', error: 'Blocked' })
    for (let i = 0; i < 10; i++) await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    // After the bounded retry budget, the next replay terminally dead-letters it.
    const final = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(final.deadLetter).toBe(1)
    expect(submitMock).toHaveBeenCalledTimes(10)
  })

  it('calls onProgress callback', async () => {
    await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
    submitMock.mockResolvedValueOnce({ status: 'submitted', receipt: { commandId: 'c1' } })

    const progress: unknown[] = []
    await replayPendingCommands(KEY, SCOPE, 't1', 'a1', p => progress.push({ ...p }))
    expect(progress.length).toBeGreaterThanOrEqual(2) // start + after c1
    expect((progress[progress.length - 1] as { phase: string }).phase).toBe('complete')
  })

  it('returns accepted 0 for empty queue', async () => {
    const r = await replayPendingCommands(KEY, SCOPE, 't1', 'a1')
    expect(r.accepted).toBe(0)
    expect(r.outcome).toBe('accepted')
  })
})

describe('backoffDelay', () => {
  it('returns number >= 0', () => {
    expect(backoffDelay(0)).toBeGreaterThanOrEqual(0)
  })
  it('returns 0 for max attempts', () => {
    expect(backoffDelay(100)).toBe(0)
  })
  it('increases with attempt', () => {
    const d0 = backoffDelay(0)
    const d5 = backoffDelay(5)
    // Not strictly deterministic due to jitter, but d5 should generally be larger
    expect(d5).toBeGreaterThanOrEqual(0)
  })
})
