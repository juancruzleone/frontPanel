/**
 * OfflineSyncCoordinator: real orchestration with trust/lease/package resolution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Mock stores
const mockTrust = { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }
const mockDevice = { privateKeyHandle: { algorithm: { name: 'ECDSA' } } as unknown as CryptoKey }
const mockPackageKey = { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey
const mockLease = { lease: { tenantId: 't1' }, header: { kid: 'k1' }, signature: 'sig', storedAt: Date.now() }
const mockPackages = [{ packageId: 'pkg-1', scopeKey: 't1:a1:dev-1:pkg-1', manifest: { packageVersion: 1, packageId: 'pkg-1' }, sealedAt: Date.now(), resourceCount: 1 }]

vi.mock('@/store/offlineTrustStore', () => ({ useOfflineTrustStore: { getState: () => mockTrust } }))
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({ getStoredDevice: vi.fn().mockResolvedValue(mockDevice) }))
vi.mock('../../../../src/shared/offline/leaseGate', () => ({ getStoredLease: vi.fn().mockResolvedValue(mockLease) }))
vi.mock('../../../../src/shared/offline/packageStorage', () => ({
  listReadyPackages: vi.fn().mockResolvedValue(mockPackages),
  getPersistedPackageKey: vi.fn().mockResolvedValue(mockPackageKey),
}))

// Mock sub-modules
vi.mock('../../../../src/shared/offline/packageDelta', () => ({
  applyPendingDeltas: vi.fn().mockResolvedValue({ status: 'empty', applied: 0, nextCursor: 0, hasMore: false }),
}))
vi.mock('../../../../src/shared/offline/commandReplay', () => ({
  replayPendingCommands: vi.fn().mockResolvedValue({ outcome: 'accepted', accepted: 0, conflicted: 0, retryable: 0, deadLetter: 0 }),
  getDeadLetters: vi.fn().mockResolvedValue([]),
}))
vi.mock('../../../../src/shared/offline/evidenceFlow', () => ({
  retryPendingEvidence: vi.fn().mockResolvedValue({ submitted: 0, failed: 0 }),
}))
vi.mock('../../../../src/shared/offline/commandJournal', () => ({
  listPendingCommands: vi.fn().mockResolvedValue([]),
}))

const { resolveSyncContext, runSyncCycle } = await import('../../../../src/shared/offline/syncCoordinator')
const { applyPendingDeltas } = await import('../../../../src/shared/offline/packageDelta')
const { replayPendingCommands } = await import('../../../../src/shared/offline/commandReplay')
const { retryPendingEvidence } = await import('../../../../src/shared/offline/evidenceFlow')

localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'a1' } }))

describe('syncCoordinator', () => {
  beforeEach(() => {
    vi.mocked(applyPendingDeltas).mockResolvedValue({ status: 'empty', applied: 0, nextCursor: 0, hasMore: false })
    vi.mocked(replayPendingCommands).mockResolvedValue({ outcome: 'accepted', accepted: 0, conflicted: 0, retryable: 0, deadLetter: 0 })
    vi.mocked(retryPendingEvidence).mockResolvedValue({ submitted: 0, failed: 0 })
  })

  describe('resolveSyncContext', () => {
    it('resolves full context when all stores ready', async () => {
      const r = await resolveSyncContext()
      expect(r.ctx).toBeDefined()
      expect(r.ctx!.tenantId).toBe('t1')
      expect(r.ctx!.actorId).toBe('a1')
      expect(r.ctx!.deviceId).toBe('dev-1')
      expect(r.ctx!.packages).toHaveLength(1)
    })

    it('fails when trust not ready', async () => {
      mockTrust.isOfflineReady = false
      const r = await resolveSyncContext()
      expect(r.ctx).toBeUndefined()
      expect(r.error).toBe('Trust not ready')
      mockTrust.isOfflineReady = true
    })

    it('fails when no auth', async () => {
      localStorage.removeItem('auth-storage')
      const r = await resolveSyncContext()
      expect(r.ctx).toBeUndefined()
      expect(r.error).toBe('No auth')
      localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'a1' } }))
    })
  })

  describe('runSyncCycle', () => {
    it('runs delta → replay → evidence in order', async () => {
      const ctx = (await resolveSyncContext()).ctx!
      const phases: string[] = []
      const r = await runSyncCycle(ctx, (p) => phases.push(p.phase))
      expect(phases).toContain('delta')
      expect(phases).toContain('replay')
      expect(phases).toContain('evidence')
      expect(r.phase).toBe('complete')
      expect(vi.mocked(replayPendingCommands).mock.calls[0][0]).toBe(mockPackageKey)
    })

    it('pauses on cursor_expired', async () => {
      vi.mocked(applyPendingDeltas).mockResolvedValueOnce({ status: 'cursor_expired' })
      const ctx = (await resolveSyncContext()).ctx!
      const r = await runSyncCycle(ctx)
      expect(r.phase).toBe('paused')
      expect(r.pauseReason).toBeTruthy()
    })

    it('pauses on replay auth/lease error', async () => {
      vi.mocked(replayPendingCommands).mockResolvedValueOnce({ outcome: 'paused', accepted: 0, conflicted: 0, retryable: 1, deadLetter: 0, paused: true, pauseReason: 'Device not ready' })
      const ctx = (await resolveSyncContext()).ctx!
      const r = await runSyncCycle(ctx)
      expect(r.phase).toBe('paused')
    })

    it('aggregates counts across packages', async () => {
      vi.mocked(replayPendingCommands).mockResolvedValueOnce({ outcome: 'accepted', accepted: 2, conflicted: 1, retryable: 0, deadLetter: 0 })
      const ctx = (await resolveSyncContext()).ctx!
      const r = await runSyncCycle(ctx)
      expect(r.totalConflicted).toBe(1)
      expect(r.packages[0].commandsAccepted).toBe(2)
    })
  })
})
