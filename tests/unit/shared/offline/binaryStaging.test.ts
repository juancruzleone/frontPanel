/**
 * R8 — Binary staging: AES-GCM encrypted bytes, identity+package binding, tamper detection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))
vi.mock('@/store/offlineTrustStore', () => ({
  useOfflineTrustStore: { getState: () => ({ isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' }) },
}))
vi.mock('../../../../src/shared/offline/leaseGate', () => ({
  getStoredLease: vi.fn().mockResolvedValue({ lease: { tenantId: 't1' }, header: { kid: 'k1' }, signature: 'sig', storedAt: Date.now() }),
}))

// IDB mock with raw record inspection
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
              put: vi.fn().mockImplementation((val: unknown, key?: string) => { s(n)[key ?? 'x'] = val; return mkReq(undefined) }),
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

const { stageBinary, submitStagedBinary, cleanupStagedBinary, listStagedBinaries, purgeStagedBinary, buildBinaryScopeKey } =
  await import('../../../../src/shared/offline/binaryStaging')
const { generateStorageKey } = await import('../../../../src/shared/offline/crypto')

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('R8 binaryStaging encrypted', () => {
  beforeEach(() => { fetchSpy.mockReset(); for (const k of Object.keys(stores)) delete stores[k] })

  const mkBlob = (content = 'photo-bytes', type = 'image/jpeg') => new Blob([content], { type })

  it('stageBinary encrypts bytes — raw blob not in stored record', async () => {
    const key = await generateStorageKey()
    await stageBinary({ evidenceId: 'ev1', commandId: 'c1', orderId: 'o1', packageId: 'pkg1', blob: mkBlob('secret-photo') }, key, 'k1', 't1', 'u1', 'dev1')

    const raw = stores.binaryStaging['t1:u1:dev1:pkg1:ev1'] as { bytesEnvelope: { ct: string } }
    expect(raw).toBeDefined()
    expect(raw.bytesEnvelope.ct).toBeDefined()
    expect(JSON.stringify(raw)).not.toContain('secret-photo')
  })

  it('submitStagedBinary decrypts and submits with correct scopeKey', async () => {
    const key = await generateStorageKey()
    await stageBinary({ evidenceId: 'ev1', commandId: 'c1', orderId: 'o1', packageId: 'pkg1', blob: mkBlob('exact-bytes') }, key, 'k1', 't1', 'u1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    fetchSpy.mockResolvedValueOnce(json({ success: true }))

    const scopeKey = buildBinaryScopeKey('t1', 'u1', 'dev1', 'pkg1', 'ev1')
    const r = await submitStagedBinary(key, scopeKey, 't1', 'a1')
    expect(r.status).toBe('submitted')
    expect(r.decrypted).toBe(true)
  })

  it('fails on wrong packageId — different package cannot decrypt', async () => {
    const key = await generateStorageKey()
    await stageBinary({ evidenceId: 'ev1', commandId: 'c1', orderId: 'o1', packageId: 'pkg1', blob: mkBlob() }, key, 'k1', 't1', 'u1', 'dev1')

    // Try to submit with wrong packageId in scopeKey
    const wrongScope = buildBinaryScopeKey('t1', 'u1', 'dev1', 'WRONG-PKG', 'ev1')
    const r = await submitStagedBinary(key, wrongScope, 't1', 'a1')
    expect(r.status).toBe('no_trust')
    expect(r.error).toContain('No staged binary')

    // Original staged bytes remain intact
    expect(await listStagedBinaries('t1:u1:dev1:pkg1')).toHaveLength(1)
  })

  it('fails on wrong identity — different tenant cannot decrypt', async () => {
    const key = await generateStorageKey()
    await stageBinary({ evidenceId: 'ev1', commandId: 'c1', orderId: 'o1', packageId: 'pkg1', blob: mkBlob() }, key, 'k1', 't1', 'u1', 'dev1')

    const wrongScope = buildBinaryScopeKey('OTHER', 'u1', 'dev1', 'pkg1', 'ev1')
    const r = await submitStagedBinary(key, wrongScope, 't1', 'a1')
    expect(r.status).toBe('no_trust')
    expect(await listStagedBinaries('t1:u1:dev1:pkg1')).toHaveLength(1)
  })

  it('fails on tampered ciphertext', async () => {
    const key = await generateStorageKey()
    await stageBinary({ evidenceId: 'ev1', commandId: 'c1', orderId: 'o1', packageId: 'pkg1', blob: mkBlob() }, key, 'k1', 't1', 'u1', 'dev1')

    const raw = stores.binaryStaging['t1:u1:dev1:pkg1:ev1'] as { bytesEnvelope: { ct: string } }
    raw.bytesEnvelope.ct = raw.bytesEnvelope.ct.split('').reverse().join('')

    const scopeKey = buildBinaryScopeKey('t1', 'u1', 'dev1', 'pkg1', 'ev1')
    const r = await submitStagedBinary(key, scopeKey, 't1', 'a1')
    expect(r.status).toBe('no_trust')
    expect(r.error).toContain('tampered')
  })

  it('cleanupStagedBinary removes only after receipt confirmed', async () => {
    const key = await generateStorageKey()
    await stageBinary({ evidenceId: 'ev1', commandId: 'c1', orderId: 'o1', packageId: 'pkg1', blob: mkBlob() }, key, 'k1', 't1', 'u1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Not found', code: 'BINARY_NOT_FOUND' } }, 404))
    expect(await cleanupStagedBinary('ev1', key, 't1', 'u1', 'dev1', 'pkg1')).toBe(false)
    expect(await listStagedBinaries('t1:u1:dev1:pkg1')).toHaveLength(1)

    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1' } }))
    expect(await cleanupStagedBinary('ev1', key, 't1', 'u1', 'dev1', 'pkg1')).toBe(true)
    expect(await listStagedBinaries('t1:u1:dev1:pkg1')).toHaveLength(0)
  })

  it('buildBinaryScopeKey includes all 5 components', () => {
    expect(buildBinaryScopeKey('t1', 'u1', 'd1', 'p1', 'ev1')).toBe('t1:u1:d1:p1:ev1')
  })
})
