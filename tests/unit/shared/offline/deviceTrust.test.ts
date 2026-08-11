/**
 * R2 — Device trust: registration, persistence, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)
vi.mock('@/shared/utils/apiHeaders', () => ({ fetchWithAuthRetry: async (url: string, opts?: RequestInit) => fetchSpy(url, opts) }))

interface MockRec { [k: string]: unknown }
const dbStore: Record<string, MockRec> = {}
const createdStores: string[] = []
function mkReq(result?: unknown) {
  let ok: ((e: { target: { result: unknown } }) => void) | null = null
  const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, result, error: null }
  queueMicrotask(() => ok?.({ target: { result } }))
  return r
}
const mockStore = {
  put: vi.fn().mockImplementation((val: MockRec, key: string) => { dbStore[key] = val; return mkReq(undefined) }),
  get: vi.fn().mockImplementation((k: string) => mkReq(dbStore[k])),
  delete: vi.fn().mockImplementation((k: string) => { delete dbStore[k]; return mkReq(undefined) }),
}
vi.stubGlobal('indexedDB', {
  open: vi.fn().mockImplementation(() => {
    let ok: ((e: { target: { result: unknown } }) => void) | null = null
     const r = { set onsuccess(fn: ((e: { target: { result: unknown } }) => void) | null) { ok = fn }, get onsuccess() { return ok }, set onerror(_fn: unknown) {}, onupgradeneeded: null as (() => void) | null, result: undefined as unknown, error: null }
     queueMicrotask(() => { r.result = { objectStoreNames: { contains: (name: string) => createdStores.includes(name) }, createObjectStore: (name: string) => { createdStores.push(name); return {} }, transaction: () => ({ objectStore: (name: string) => { if (!createdStores.includes(name)) throw new Error(`Missing store ${name}`); return mockStore } }) }; if (createdStores.length === 0) r.onupgradeneeded?.(); ok?.({ target: { result: r.result } }) })
    return r
  }),
})

localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1' } }))

const { registerDevice, getStoredDevice, clearStoredDevice } = await import('../../../../src/shared/offline/deviceTrust')

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

describe('R2 deviceTrust', () => {
  beforeEach(() => { fetchSpy.mockReset(); createdStores.length = 0; for (const k of Object.keys(dbStore)) delete dbStore[k] })

  it('creates both trust stores during fresh database initialization', async () => {
    await getStoredDevice('missing')
    fetchSpy.mockResolvedValueOnce(json({ lease: {}, header: { kid: 'k1' }, signature: 'sig' }))
    const { refreshLease } = await import('../../../../src/shared/offline/leaseGate')

    await refreshLease('d1')

    expect(createdStores).toEqual(expect.arrayContaining([
      'registeredDevice', 'offlineLease', 'offlinePackageResources', 'offlinePackageMeta', 'offlinePackageKeys',
    ]))
  })

  it('generates key, registers with backend, persists locally', async () => {
    fetchSpy.mockResolvedValueOnce(json({ success: true, deviceId: 'srv-1', publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'a', y: 'b' } }))
    const r = await registerDevice()
    expect(r.device!.deviceId).toBe('srv-1')
    expect(r.device!.status).toBe('active')
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/offline/devices/register')
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.publicKeyJwk.crv).toBe('P-256')
    expect(await getStoredDevice('t1:u1')).toBeDefined()
  })

  it('returns existing active device without re-registering', async () => {
    dbStore['t1:u1'] = { deviceId: 'existing', tenantId: 't1', userId: 'u1', publicKeyJwk: {}, status: 'active', registeredAt: Date.now() }
    const r = await registerDevice()
    expect(r.device!.deviceId).toBe('existing')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns error on backend DEVICE_REVOKED (403)', async () => {
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Revoked', code: 'DEVICE_REVOKED' } }, 403))
    expect((await registerDevice()).error!.code).toBe('DEVICE_REVOKED')
  })

  it('returns NO_AUTH when not logged in', async () => {
    localStorage.removeItem('auth-storage')
    expect((await registerDevice()).error!.code).toBe('NO_AUTH')
    localStorage.setItem('auth-storage', JSON.stringify({ state: { tenantId: 't1', userId: 'u1' } }))
  })

  it('clearStoredDevice removes device', async () => {
    dbStore['t1:u1'] = { deviceId: 'd1' }
    await clearStoredDevice('t1:u1')
    expect(dbStore['t1:u1']).toBeUndefined()
  })

  it('getStoredDevice returns null for missing key', async () => {
    expect(await getStoredDevice('missing')).toBeNull()
  })
})
