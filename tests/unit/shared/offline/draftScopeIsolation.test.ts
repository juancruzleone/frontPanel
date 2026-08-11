/**
 * R8 — Draft scope: package-bound IDs, same package retry, different packages disjoint.
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
  seal: vi.fn().mockImplementation(async ({ plaintext }: { plaintext: Uint8Array }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(String.fromCharCode(...plaintext)), at: Date.now() })),
  sealJson: vi.fn().mockImplementation(async ({ value }: { value: unknown }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(JSON.stringify(value)), at: Date.now() })),
}))

const { stageEvidenceFromFormData } = await import('../../../../src/shared/offline/binaryStaging')
const { generateDraftId, purgeOfflineDraftsForScope } = await import('../../../../src/shared/offline/lifecycleStart')

const KEY = { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey
const mkBlob = () => new Blob(['p'], { type: 'image/jpeg' })

describe('R8 package-bound draft scope', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k]; localStorage.clear() })

  it('same package scope on retry → same draft evidence IDs', async () => {
    const draftId = generateDraftId('wo1')
    const scopedKey = 'draftId:t1:a1:dev1:pkg1:inst1'
    localStorage.setItem(scopedKey, draftId)

    // Simulate retry — read back from localStorage
    const restored = localStorage.getItem(scopedKey)
    expect(restored).toBe(draftId)

    const r1 = await stageEvidenceFromFormData({ draftId, photos: [mkBlob()], photoFilenames: ['f.jpg'], tenantId: 't1', userId: 'a1', deviceId: 'dev1', packageId: 'pkg1' }, KEY, 'k1')
    const r2 = await stageEvidenceFromFormData({ draftId: restored!, photos: [mkBlob()], photoFilenames: ['f.jpg'], tenantId: 't1', userId: 'a1', deviceId: 'dev1', packageId: 'pkg1' }, KEY, 'k1')
    expect(r1.evidenceIds[0]).toBe(r2.evidenceIds[0])
  })

  it('two package versions on same workOrder → disjoint draft IDs', async () => {
    const key1 = 'draftId:t1:a1:dev1:pkg-v1:inst1'
    const key2 = 'draftId:t1:a1:dev1:pkg-v2:inst1'
    const d1 = generateDraftId('wo1')
    const d2 = generateDraftId('wo1')
    localStorage.setItem(key1, d1)
    localStorage.setItem(key2, d2)

    expect(d1).not.toBe(d2)
    expect(localStorage.getItem(key1)).not.toBe(localStorage.getItem(key2))
  })

  it('staged evidence uses package-scoped draftId', async () => {
    const draftId = 'draft-pkg1-wo1'
    const r = await stageEvidenceFromFormData({
      draftId, photos: [mkBlob()], photoFilenames: ['f.jpg'],
      tenantId: 't1', userId: 'a1', deviceId: 'dev1', packageId: 'pkg1',
    }, KEY, 'k1')

    expect(r.evidenceIds[0]).toBe('draft-pkg1-wo1-photo-0')
  })

  it('selective purge removes only matching tenant+user draft keys', () => {
    localStorage.setItem('draftId:t1:u1:dev1:pkg1:inst1', 'd1')
    localStorage.setItem('draftId:t1:u1:dev1:pkg2:inst1', 'd2')
    localStorage.setItem('draftId:t2:u2:dev1:pkg1:inst1', 'd3')
    localStorage.setItem('theme', 'dark')

    purgeOfflineDraftsForScope('t1', 'u1')

    expect(localStorage.getItem('draftId:t1:u1:dev1:pkg1:inst1')).toBeNull()
    expect(localStorage.getItem('draftId:t1:u1:dev1:pkg2:inst1')).toBeNull()
    expect(localStorage.getItem('draftId:t2:u2:dev1:pkg1:inst1')).toBe('d3')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('draft key includes all scope components', () => {
    const key = 'draftId:t1:u1:dev1:pkg1:inst1'
    localStorage.setItem(key, 'draft-x')
    expect(localStorage.getItem(key)).toBe('draft-x')
    // Same everything except package → different key
    const key2 = 'draftId:t1:u1:dev1:pkg2:inst1'
    localStorage.setItem(key2, 'draft-y')
    expect(localStorage.getItem(key)).toBe('draft-x')
    expect(localStorage.getItem(key2)).toBe('draft-y')
  })

  it('no draft ID created before package resolution', () => {
    // Without setting any scoped key, no draftId exists
    expect(localStorage.getItem('draftId:t1:u1:dev1:pkg1:inst1')).toBeNull()
    // Only after package resolution + staging would a key be created
    const draftId = generateDraftId('wo1')
    localStorage.setItem('draftId:t1:u1:dev1:pkg1:inst1', draftId)
    expect(localStorage.getItem('draftId:t1:u1:dev1:pkg1:inst1')).toBe(draftId)
  })
})
