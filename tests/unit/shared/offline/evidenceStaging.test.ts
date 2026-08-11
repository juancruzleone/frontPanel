/**
 * R8 — Evidence staging: draft-based IDs, idempotent retry, disjoint drafts.
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

const { stageEvidenceFromFormData, listStagedBinaries } =
  await import('../../../../src/shared/offline/binaryStaging')

const KEY = { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey
const mkBlob = (c = 'p') => new Blob([c], { type: 'image/jpeg' })
const base = { tenantId: 't1', userId: 'a1', deviceId: 'dev1', packageId: 'pkg1' }

describe('R8 draft-based evidence IDs', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  it('evidence IDs derived from draftId, not workOrderId', async () => {
    const r = await stageEvidenceFromFormData({
      ...base, draftId: 'draft-abc', commandId: 'draft-abc',
      photos: [mkBlob()], photoFilenames: ['f.jpg'],
    }, KEY, 'k1')

    expect(r.evidenceIds[0]).toBe('draft-abc-photo-0')
    expect(r.evidenceIds).not.toContainEqual(expect.stringContaining('wo1'))
  })

  it('same draftId on retry → same evidence IDs (idempotent)', async () => {
    const params = { ...base, draftId: 'draft-xyz', commandId: 'draft-xyz', photos: [mkBlob()], photoFilenames: ['f.jpg'] }
    const r1 = await stageEvidenceFromFormData(params, KEY, 'k1')
    const r2 = await stageEvidenceFromFormData(params, KEY, 'k1')
    expect(r1.evidenceIds[0]).toBe(r2.evidenceIds[0])
    expect(r1.evidenceIds[0]).toBe('draft-xyz-photo-0')
  })

  it('two different drafts on same workOrderId → disjoint evidence IDs', async () => {
    const r1 = await stageEvidenceFromFormData({
      ...base, draftId: 'draft-1', commandId: 'draft-1',
      photos: [mkBlob()], photoFilenames: ['f.jpg'],
    }, KEY, 'k1')
    const r2 = await stageEvidenceFromFormData({
      ...base, draftId: 'draft-2', commandId: 'draft-2',
      photos: [mkBlob()], photoFilenames: ['f.jpg'],
    }, KEY, 'k1')

    expect(r1.evidenceIds[0]).not.toBe(r2.evidenceIds[0])
    expect(r1.evidenceIds[0]).toBe('draft-1-photo-0')
    expect(r2.evidenceIds[0]).toBe('draft-2-photo-0')
  })

  it('signature uses draftId-firma', async () => {
    const r = await stageEvidenceFromFormData({
      ...base, draftId: 'd-1', commandId: 'd-1',
      photos: [], photoFilenames: [],
      signatureBlob: new Blob(['sig'], { type: 'image/png' }),
    }, KEY, 'k1')

    expect(r.evidenceIds).toEqual(['d-1-firma'])
  })

  it('photos + signature both use draftId prefix', async () => {
    const r = await stageEvidenceFromFormData({
      ...base, draftId: 'd-2', commandId: 'd-2',
      photos: [mkBlob('a'), mkBlob('b')], photoFilenames: ['a.jpg', 'b.jpg'],
      signatureBlob: new Blob(['s'], { type: 'image/png' }),
    }, KEY, 'k1')

    expect(r.evidenceIds).toEqual(['d-2-photo-0', 'd-2-photo-1', 'd-2-firma'])
    expect(r.staged).toBe(3)
  })

  it('staged blobs are encrypted (raw content not in IDB)', async () => {
    await stageEvidenceFromFormData({
      ...base, draftId: 'd-3', commandId: 'd-3',
      photos: [mkBlob('secret-data')], photoFilenames: ['f.jpg'],
    }, KEY, 'k1')

    expect(JSON.stringify(stores)).not.toContain('secret-data')
  })

  it('no evidence: returns empty evidenceIds', async () => {
    const r = await stageEvidenceFromFormData({
      ...base, draftId: 'd-4', commandId: 'd-4',
      photos: [], photoFilenames: [],
    }, KEY, 'k1')

    expect(r.evidenceIds).toEqual([])
    expect(r.staged).toBe(0)
  })
})
