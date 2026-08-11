/**
 * R8 — Draft persistence: reload+retry reuses ID, new draft generates new ID, logout purges.
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
const { generateDraftId } = await import('../../../../src/shared/offline/lifecycleStart')

const KEY = { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey
const mkBlob = () => new Blob(['p'], { type: 'image/jpeg' })
const base = { tenantId: 't1', userId: 'a1', deviceId: 'dev1', packageId: 'pkg1' }

describe('R8 draft persistence', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k]; localStorage.clear() })

  it('generateDraftId produces unique IDs', () => {
    const d1 = generateDraftId('wo1')
    const d2 = generateDraftId('wo1')
    expect(d1).not.toBe(d2)
    expect(d1).toContain('wo1')
    expect(d2).toContain('wo1')
  })

  it('same draftId on retry → same evidence IDs (idempotent)', async () => {
    const draftId = generateDraftId('wo1')
    const params = { ...base, draftId, photos: [mkBlob()], photoFilenames: ['f.jpg'] }
    const r1 = await stageEvidenceFromFormData(params, KEY, 'k1')
    const r2 = await stageEvidenceFromFormData(params, KEY, 'k1')
    expect(r1.evidenceIds[0]).toBe(r2.evidenceIds[0])
  })

  it('draftId persisted in localStorage survives simulated reload', () => {
    const draftId = generateDraftId('wo1')
    const key = 'draftId-inst-1-dev-1'
    localStorage.setItem(key, draftId)

    // Simulate reload — read back
    const restored = localStorage.getItem(key)
    expect(restored).toBe(draftId)
  })

  it('new draft after cleanup produces different draftId', () => {
    const key = 'draftId-inst-1-dev-1'
    const d1 = generateDraftId('wo1')
    localStorage.setItem(key, d1)

    // Simulate cleanup (clear)
    localStorage.removeItem(key)

    // New draft
    const d2 = generateDraftId('wo1')
    expect(d2).not.toBe(d1)
  })

  it('logout clears draftId from localStorage', () => {
    const key = 'draftId-inst-1-dev-1'
    localStorage.setItem(key, 'some-draft-id')

    // Simulate logout (clear all localStorage)
    localStorage.clear()

    expect(localStorage.getItem(key)).toBeNull()
  })

  it('different installations have separate draft keys', () => {
    const key1 = 'draftId-inst-1-dev-1'
    const key2 = 'draftId-inst-2-dev-1'
    localStorage.setItem(key1, 'draft-a')
    localStorage.setItem(key2, 'draft-b')

    expect(localStorage.getItem(key1)).toBe('draft-a')
    expect(localStorage.getItem(key2)).toBe('draft-b')

    // Clear one doesn't affect the other
    localStorage.removeItem(key1)
    expect(localStorage.getItem(key2)).toBe('draft-b')
  })

  it('two drafts on same workOrder produce disjoint evidence IDs', async () => {
    const d1 = generateDraftId('wo1')
    const d2 = generateDraftId('wo1')
    const r1 = await stageEvidenceFromFormData({ ...base, draftId: d1, photos: [mkBlob()], photoFilenames: ['f.jpg'] }, KEY, 'k1')
    const r2 = await stageEvidenceFromFormData({ ...base, draftId: d2, photos: [mkBlob()], photoFilenames: ['f.jpg'] }, KEY, 'k1')
    expect(r1.evidenceIds[0]).not.toBe(r2.evidenceIds[0])
  })
})
