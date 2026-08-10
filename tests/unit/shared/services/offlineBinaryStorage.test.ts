import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

vi.mock('../../../../src/shared/offline/types', async () => {
  const a = await vi.importActual<typeof import('../../../../src/shared/offline/types')>('../../../../src/shared/offline/types')
  return { ...a, getOrCreateDeviceId: () => 'test-device-id' }
})
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({ getStoredDevice: vi.fn().mockResolvedValue({ deviceId: 'dev-123' }), getStoredLease: vi.fn().mockResolvedValue(null) }))
vi.mock('../../../../src/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: vi.fn() }))

beforeAll(async () => {
  if (!globalThis.crypto?.subtle) { const { webcrypto } = await import('node:crypto'); vi.stubGlobal('crypto', { ...globalThis.crypto, subtle: webcrypto.subtle, getRandomValues: (a: Uint8Array) => webcrypto.getRandomValues(a) }) }
})

function mkReq(r?: unknown, e?: Error) { const q: any = { onsuccess: null, onerror: null, result: r, error: e }; if (e) { queueMicrotask(() => q.onerror?.({ target: q })) } else { queueMicrotask(() => q.onsuccess?.({ target: q })) } return q }
function createStore() { const d = new Map<string, any>(); return { put(v: any, k?: string) { d.set(k ?? v?.id ?? String(Date.now()), v); return mkReq(k) }, get(k: string) { return mkReq(d.get(k)) }, delete(k: string) { d.delete(k); return mkReq(undefined) }, getAll() { return mkReq([...d.values()]) } } }
function createDB() { const s = new Map<string, ReturnType<typeof createStore>>(); return { _v: 0, objectStoreNames: { contains: (n: string) => s.has(n) }, createObjectStore(n: string) { const st = createStore(); s.set(n, st); return st }, transaction(n: string | string[]) { const tx: any = { oncomplete: null, onerror: null }; tx.objectStore = (name: string) => { if (!s.has(name)) s.set(name, createStore()); return s.get(name)! }; setTimeout(() => tx.oncomplete?.({ target: tx }), 0); return tx }, close() {} } }
const dbs = new Map<string, ReturnType<typeof createDB>>()
const idbMock = { open(name: string, ver = 1) { if (!dbs.has(name)) dbs.set(name, createDB()); const db = dbs.get(name)!; const req: any = { onsuccess: null, onerror: null, onupgradeneeded: null, result: db }; queueMicrotask(() => { if (ver > db._v) { req.onupgradeneeded?.({ target: req, oldVersion: db._v }); db._v = ver } req.onsuccess?.({ target: req }) }); return req }, _clear() { dbs.clear() } }
vi.stubGlobal('indexedDB', idbMock)

import { offlineBinaryStorage } from '../../../../src/shared/services/offlineBinaryStorage'
import { fetchWithAuthRetry } from '../../../../src/shared/utils/apiHeaders'
import { getStoredLease, getStoredDevice } from '../../../../src/shared/offline/deviceTrust'

const F = fetchWithAuthRetry as unknown as ReturnType<typeof vi.fn>
const L = getStoredLease as unknown as ReturnType<typeof vi.fn>
const D = getStoredDevice as unknown as ReturnType<typeof vi.fn>

const mkBlob = (c: string) => new Blob([c], { type: 'image/png' })
const okR = (id: string) => ({ ok: true, status: 201, json: () => Promise.resolve({ success: true, receipt: { evidenceId: id, commandId: 'cmd-001', orderId: 'o-001', packageId: 'p-001', tenantId: 't-1', actorId: 'u-1', deviceId: 'dev-123', contentHash: '', contentSize: 0, contentType: 'image/png', fileName: 'f.png', schemaVersion: 1, status: 'accepted', createdAt: '', updatedAt: '', idempotentReplay: false } }) }) as any
const errR = (s: number, c: string) => ({ ok: false, status: s, json: () => Promise.resolve({ error: { message: c, code: c } }) }) as any
const B1 = { evidenceId: 'ev-001', commandId: 'cmd-001', orderId: 'o-001', packageId: 'p-001' }
const B2 = { evidenceId: 'ev-002', commandId: 'cmd-001', orderId: 'o-001', packageId: 'p-001' }

describe('R8b1 BinaryEvidenceQueue', () => {
  beforeEach(() => { vi.clearAllMocks(); idbMock._clear(); localStorage.setItem('auth-storage', JSON.stringify({ state: { userId: 'u-1', tenantId: 't-1' } })); D.mockResolvedValue({ deviceId: 'dev-123' }); L.mockResolvedValue(null) })

  describe('stage', () => {
    it('SHA-256 hash + AES-GCM envelope + binding + staged status', async () => {
      const r = await offlineBinaryStorage.stage(mkBlob('test'), B1)
      expect(r.evidenceId).toBe('ev-001'); expect(r.contentHash).toMatch(/^[a-f0-9]{64}$/); expect(r.contentSize).toBeGreaterThan(0)
      const rec = await offlineBinaryStorage.get('ev-001')
      expect(rec!.envelope.v).toBe(4); expect(rec!.envelope.scopeKey).toBe('t-1:u-1:dev-123')
      expect(rec!.commandId).toBe('cmd-001'); expect(rec!.status).toBe('staged')
    })
    it('same content → same hash; different → different', async () => {
      const a = await offlineBinaryStorage.stage(mkBlob('same'), B1)
      const b = await offlineBinaryStorage.stage(mkBlob('same'), B2)
      const c = await offlineBinaryStorage.stage(mkBlob('other'), { ...B1, evidenceId: 'ev-003', commandId: 'cmd-002' })
      expect(a.contentHash).toBe(b.contentHash); expect(a.contentHash).not.toBe(c.contentHash)
    })
    it('throws without auth scope', async () => { localStorage.removeItem('auth-storage'); await expect(offlineBinaryStorage.stage(mkBlob('x'), B1)).rejects.toThrow('OFFLINE_BINARY_NO_SCOPE') })
  })

  describe('scope isolation', () => {
    it('different scope cannot see records', async () => {
      await offlineBinaryStorage.stage(mkBlob('s'), B1); expect((await offlineBinaryStorage.list()).length).toBe(1)
      localStorage.setItem('auth-storage', JSON.stringify({ state: { userId: 'u2', tenantId: 't2' } })); D.mockResolvedValue({ deviceId: 'd2' })
      expect((await offlineBinaryStorage.list()).length).toBe(0)
    })
  })

  describe('upload', () => {
    it('POSTs correct metadata to /api/offline/binaries', async () => {
      await offlineBinaryStorage.stage(mkBlob('up'), B1); F.mockResolvedValueOnce(okR('ev-001'))
      await offlineBinaryStorage.upload('ev-001')
      const body = JSON.parse(F.mock.calls[0][1].body)
      expect(body.evidenceId).toBe('ev-001'); expect(body.deviceId).toBe('dev-123'); expect(body.contentHash).toMatch(/^[a-f0-9]{64}$/)
    })
    it('marks accepted; cached receipt on replay', async () => {
      await offlineBinaryStorage.stage(mkBlob('ok'), B1); F.mockResolvedValueOnce(okR('ev-001'))
      await offlineBinaryStorage.upload('ev-001'); expect((await offlineBinaryStorage.get('ev-001'))!.status).toBe('accepted')
      await offlineBinaryStorage.upload('ev-001'); expect(F).toHaveBeenCalledTimes(1)
    })
    it('network error → staged retry; success on next attempt', async () => {
      await offlineBinaryStorage.stage(mkBlob('r'), B1); F.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await offlineBinaryStorage.upload('ev-001').catch(() => {}); expect((await offlineBinaryStorage.get('ev-001'))!.retries).toBe(1)
      F.mockResolvedValueOnce(okR('ev-001')); await offlineBinaryStorage.upload('ev-001')
      expect((await offlineBinaryStorage.get('ev-001'))!.status).toBe('accepted'); expect((await offlineBinaryStorage.get('ev-001'))!.retries).toBe(2)
    })
    it('includes lease when available', async () => {
      await offlineBinaryStorage.stage(mkBlob('l'), B1); L.mockResolvedValue({ claim: { t: 1 }, kid: 'k1', signature: 's' }); F.mockResolvedValueOnce(okR('ev-001'))
      await offlineBinaryStorage.upload('ev-001'); expect(JSON.parse(F.mock.calls[0][1].body).lease).toBeDefined()
    })
  })

  describe('evidence binding', () => {
    it('multiple binaries upload independently', async () => {
      await offlineBinaryStorage.stage(mkBlob('a'), B1); await offlineBinaryStorage.stage(mkBlob('b'), B2)
      F.mockResolvedValueOnce(okR('ev-001')).mockResolvedValueOnce(okR('ev-002'))
      await offlineBinaryStorage.upload('ev-001'); await offlineBinaryStorage.upload('ev-002')
      expect((await offlineBinaryStorage.get('ev-001'))!.status).toBe('accepted'); expect((await offlineBinaryStorage.get('ev-002'))!.status).toBe('accepted')
    })
  })

  describe('receipt gating', () => {
    it('ready when no evidence; blocked when missing; ready when all accepted', async () => {
      expect((await offlineBinaryStorage.checkCommandEvidence('none')).ready).toBe(true)
      await offlineBinaryStorage.stage(mkBlob('p'), B1); await offlineBinaryStorage.stage(mkBlob('q'), B2); F.mockResolvedValueOnce(okR('ev-001'))
      await offlineBinaryStorage.upload('ev-001')
      const r = await offlineBinaryStorage.checkCommandEvidence('cmd-001'); expect(r.ready).toBe(false); expect(r.missing).toContain('ev-002')
      F.mockResolvedValueOnce(okR('ev-002')); await offlineBinaryStorage.upload('ev-002')
      expect((await offlineBinaryStorage.checkCommandEvidence('cmd-001')).ready).toBe(true)
    })
  })

  describe('tamper: permanent → dead-letter', () => {
    it.each(['HASH_MISMATCH', 'SIZE_MISMATCH', 'INVALID_CONTENT_TYPE', 'CROSS_COMMAND_BINDING', 'OWNERSHIP_MISMATCH', 'DUPLICATE_EVIDENCE_ID'] as const)('%s', async (c) => {
      await offlineBinaryStorage.stage(mkBlob(c), B1); F.mockResolvedValueOnce(errR(400, c))
      await expect(offlineBinaryStorage.upload('ev-001')).rejects.toThrow('OFFLINE_BINARY_DEAD_LETTER')
      expect((await offlineBinaryStorage.get('ev-001'))!.status).toBe('dead-letter')
    })
  })

  describe('retryable → staged', () => {
    it.each(['DEVICE_NOT_REGISTERED', 'DEVICE_REVOKED', 'LEASE_EXPIRED', 'LEASE_INVALID'] as const)('%s', async (c) => {
      await offlineBinaryStorage.stage(mkBlob(c), B1); F.mockResolvedValueOnce(errR(403, c))
      await expect(offlineBinaryStorage.upload('ev-001')).rejects.toThrow('OFFLINE_BINARY_RETRYABLE')
      expect((await offlineBinaryStorage.get('ev-001'))!.status).toBe('staged')
    })
  })

  describe('decrypt round-trip', () => {
    it('getBytes returns original bytes', async () => {
      await offlineBinaryStorage.stage(mkBlob('decrypt-me'), B1)
      expect(new TextDecoder().decode((await offlineBinaryStorage.getBytes('ev-001'))!)).toBe('decrypt-me')
    })
  })
})
