/**
 * R8 — Evidence flow: capture → stage → command → submit → cleanup.
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

const { captureAndStageEvidence, submitEvidenceCommand, retryPendingEvidence } =
  await import('../../../../src/shared/offline/evidenceFlow')
const { generateStorageKey } = await import('../../../../src/shared/offline/crypto')

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const mkBlob = (content = 'photo') => new Blob([content], { type: 'image/jpeg' })

describe('R8 evidenceFlow', () => {
  beforeEach(() => { fetchSpy.mockReset(); for (const k of Object.keys(stores)) delete stores[k] })

  it('captureAndStageEvidence stages encrypted blob', async () => {
    const key = await generateStorageKey()
    const r = await captureAndStageEvidence({
      evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob('photo-data'),
    }, key, 'k1', 't1', 'u1', 'dev1')

    expect(r.status).toBe('staged')
    expect(r.meta!.evidenceId).toBe('ev1')
    expect(r.meta!.scopeKey).toBe('t1:u1:dev1:pkg1:ev1')
    // Raw bytes not in IDB
    expect(JSON.stringify(stores)).not.toContain('photo-data')
  })

  it('submitEvidenceCommand records command then submits binary', async () => {
    const key = await generateStorageKey()
    // Stage first (same userId as actorId for scopeKey match)
    await captureAndStageEvidence({
      evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob(),
    }, key, 'k1', 't1', 'a1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    fetchSpy.mockResolvedValueOnce(json({ success: true }))

    const r = await submitEvidenceCommand(
      { evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob() },
      key, 'k1', 't1', 'a1', 'dev1', 'pkg1',
    )

    expect(r.status).toBe('submitted')
    expect(r.commandId).toBe('evidence-ev1')
  })

  it('submitEvidenceCommand preserves staged blob on upload failure', async () => {
    const key = await generateStorageKey()
    await captureAndStageEvidence({
      evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob(),
    }, key, 'k1', 't1', 'a1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'Storage full' } }, 500))

    const r = await submitEvidenceCommand(
      { evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob() },
      key, 'k1', 't1', 'a1', 'dev1', 'pkg1',
    )

    expect(r.status).toBe('failed')
    expect(r.commandId).toBe('evidence-ev1')
  })

  it('submitEvidenceCommand supports dependsOn for ordering', async () => {
    const key = await generateStorageKey()
    await captureAndStageEvidence({
      evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob(), dependsOn: ['start-cmd'],
    }, key, 'k1', 't1', 'a1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    fetchSpy.mockResolvedValueOnce(json({ success: true }))

    const r = await submitEvidenceCommand(
      { evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob(), dependsOn: ['start-cmd'] },
      key, 'k1', 't1', 'a1', 'dev1', 'pkg1',
    )

    expect(r.status).toBe('submitted')
  })

  it('retryPendingEvidence resubmits staged binaries', async () => {
    const key = await generateStorageKey()
    await captureAndStageEvidence({
      evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob(),
    }, key, 'k1', 't1', 'a1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ success: true, receipt: { evidenceId: 'ev1', status: 'accepted' } }))
    fetchSpy.mockResolvedValueOnce(json({ success: true }))

    const r = await retryPendingEvidence(key, 't1', 'a1', 'dev1', 'pkg1')
    expect(r.submitted).toBe(1)
    expect(r.failed).toBe(0)
  })

  it('retryPendingEvidence counts failures without clearing', async () => {
    const key = await generateStorageKey()
    await captureAndStageEvidence({
      evidenceId: 'ev1', orderId: 'o1', packageId: 'pkg1', workOrderId: 'wo1', blob: mkBlob(),
    }, key, 'k1', 't1', 'a1', 'dev1')

    fetchSpy.mockResolvedValueOnce(json({ error: { message: 'No device', code: 'DEVICE_NOT_REGISTERED' } }, 403))

    const r = await retryPendingEvidence(key, 't1', 'a1', 'dev1', 'pkg1')
    expect(r.failed).toBe(1)
    expect(r.submitted).toBe(0)
    const { listStagedBinaries } = await import('../../../../src/shared/offline/binaryStaging')
    expect(await listStagedBinaries('t1:a1:dev1:pkg1:')).toHaveLength(1)
  })
})
