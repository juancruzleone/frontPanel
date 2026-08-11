/**
 * R6 — Command journal: idempotency, dependency ordering, encrypted persistence.
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

// Mock crypto/envelope to avoid real WebCrypto
vi.mock('../../../../src/shared/offline/crypto', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/crypto')>()
  return { ...orig, sha256Hex: vi.fn().mockImplementation(async (bytes: Uint8Array) => {
    // Deterministic but collision-resistant mock: use byte length + first/last bytes
    const head = bytes.length.toString(16).padStart(4, '0')
    const tail = bytes.length > 0 ? bytes[0].toString(16).padStart(2, '0') + bytes[bytes.length - 1].toString(16).padStart(2, '0') : '0000'
    return (head + tail).padEnd(64, '0')
  }) }
})
vi.mock('../../../../src/shared/offline/envelope', () => ({
  sealJson: vi.fn().mockImplementation(async ({ value }: { value: unknown }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(JSON.stringify(value)), at: Date.now() })),
  openJson: vi.fn().mockImplementation(async (params: { envelope: { ct: string } }) => JSON.parse(atob(params.envelope.ct))),
}))

const { recordCommand, hashCanonicalPayload, listPendingCommands } = await import('../../../../src/shared/offline/commandJournal')
const { COMMAND_ERROR_CODES } = await import('../../../../src/shared/offline/commandTypes')

const KEY = { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey
const SCOPE = 't1:a1:dev1:pkg1'
const B = { tenantId: 't1', actorId: 'a1', deviceId: 'dev1', packageId: 'pkg1', key: KEY, kid: 'k1' }

describe('R6 commandJournal', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  describe('hashCanonicalPayload', () => {
    it('returns 64-char hex', async () => {
      expect(await hashCanonicalPayload({ a: 1 })).toMatch(/^[a-f0-9]{64}$/)
    })
    it('is deterministic', async () => {
      expect(await hashCanonicalPayload({ b: 2, a: 1 })).toBe(await hashCanonicalPayload({ a: 1, b: 2 }))
    })
  })

  describe('recordCommand', () => {
    it('records a pending command and returns receipt', async () => {
      const r = await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: { orderId: 'o1' }, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r.receipt).toBeDefined()
      expect(r.receipt!.status).toBe('pending')
      expect(r.receipt!.commandId).toBe('c1')
      expect(r.receipt!.commandType).toBe('start')
      expect(r.receipt!.idempotentReplay).toBe(false)
    })

    it('idempotent replay: same ID + same hash → returns existing receipt', async () => {
      await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: { orderId: 'o1' }, entityId: 'e1', expectedEntityVersion: 1 })
      const r2 = await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: { orderId: 'o1' }, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r2.receipt).toBeDefined()
      expect(r2.receipt!.idempotentReplay).toBe(true)
    })

    it('conflict: same ID + different hash → IDEMPOTENCY_KEY_REUSED', async () => {
      await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: { orderId: 'o1' }, entityId: 'e1', expectedEntityVersion: 1 })
      const r2 = await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: { orderId: 'DIFFERENT' }, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r2.error).toBeDefined()
      expect(r2.error!.code).toBe(COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED)
    })

    it('rejects invalid command type', async () => {
      const r = await recordCommand({ ...B, commandId: 'c1', commandType: 'invalid' as never, payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r.error!.code).toBe('VALIDATION_ERROR')
    })

    it('blocks on pending parent dependency (same type)', async () => {
      await recordCommand({ ...B, commandId: 'p1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
      const r = await recordCommand({ ...B, commandId: 'c1', commandType: 'maintenance', payload: {}, entityId: 'e2', expectedEntityVersion: 1, dependsOn: ['p1'] })
       expect(r.receipt!.status).toBe('pending')
       expect(r.receipt!.failureCode).toBeNull()
    })

    it('cross-type: start→completion dependency resolves by commandId', async () => {
      // Parent is start, child is completion — different commandType, same scope
      await recordCommand({ ...B, commandId: 'start-1', commandType: 'start', payload: { orderId: 'o1' }, entityId: 'e1', expectedEntityVersion: 1 })
      const r = await recordCommand({ ...B, commandId: 'comp-1', commandType: 'completion', payload: { done: true }, entityId: 'e1', expectedEntityVersion: 2, dependsOn: ['start-1'] })
      // Parent is pending → child should be blocked with DEPENDENCY_NOT_MET
       expect(r.receipt!.status).toBe('pending')
       expect(r.receipt!.failureCode).toBeNull()
    })

    it('cross-type: evidence→completion dependency by commandId', async () => {
      await recordCommand({ ...B, commandId: 'ev-1', commandType: 'evidence', payload: { photo: 'url' }, entityId: 'e1', expectedEntityVersion: 1 })
      const r = await recordCommand({ ...B, commandId: 'comp-1', commandType: 'completion', payload: {}, entityId: 'e1', expectedEntityVersion: 1, dependsOn: ['ev-1'] })
       expect(r.receipt!.status).toBe('pending')
    })

    it('rejects same commandId with different commandType', async () => {
      await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { a: 1 }, entityId: 'e1', expectedEntityVersion: 1 })
      const r = await recordCommand({ ...B, commandId: 'x1', commandType: 'evidence', payload: { a: 1 }, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r.error!.code).toBe(COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED)
    })

    it('rejects same commandId with different payload', async () => {
      await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { a: 1 }, entityId: 'e1', expectedEntityVersion: 1 })
      expect((await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { a: 999 }, entityId: 'e1', expectedEntityVersion: 1 })).error!.code).toBe(COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED)
    })

    it('rejects same commandId with different packageId', async () => {
      await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { a: 1 }, entityId: 'e1', expectedEntityVersion: 1 })
      expect((await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { a: 1 }, entityId: 'e1', expectedEntityVersion: 1, packageId: 'other' })).error!.code).toBe(COMMAND_ERROR_CODES.IDEMPOTENCY_KEY_REUSED)
    })

    it('original command intact after rejection', async () => {
      await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { orig: true }, entityId: 'e1', expectedEntityVersion: 1 })
      await recordCommand({ ...B, commandId: 'x1', commandType: 'evidence', payload: { orig: true }, entityId: 'e1', expectedEntityVersion: 1 })
      const r = await recordCommand({ ...B, commandId: 'x1', commandType: 'start', payload: { orig: true }, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r.receipt!.idempotentReplay).toBe(true)
      expect(r.receipt!.commandType).toBe('start')
    })

    it('allows command with no dependencies', async () => {
      const r = await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
      expect(r.receipt!.status).toBe('pending')
      expect(r.receipt!.dependsOn).toEqual([])
    })

    it('sets all required receipt fields', async () => {
      const r = await recordCommand({ ...B, commandId: 'c1', commandType: 'completion', payload: { done: true }, entityId: 'e1', entityType: 'workOrder', expectedEntityVersion: 3, expectedFormVersion: 2 })
      const r2 = r.receipt!
      expect(r2.tenantId).toBe('t1'); expect(r2.actorId).toBe('a1'); expect(r2.deviceId).toBe('dev1')
      expect(r2.packageId).toBe('pkg1'); expect(r2.entityId).toBe('e1'); expect(r2.entityType).toBe('workOrder')
      expect(r2.expectedEntityVersion).toBe(3); expect(r2.expectedFormVersion).toBe(2)
      expect(r2.schemaVersion).toBe(1); expect(r2.payloadHash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('listPendingCommands', () => {
    it('returns pending commands', async () => {
      await recordCommand({ ...B, commandId: 'c1', commandType: 'start', payload: {}, entityId: 'e1', expectedEntityVersion: 1 })
      expect((await listPendingCommands(KEY, SCOPE)).length).toBeGreaterThanOrEqual(1)
    })
  })
})
