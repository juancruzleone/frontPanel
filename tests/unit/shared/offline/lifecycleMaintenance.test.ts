/**
 * R7 — Maintenance: fail-closed form resolution, evidence staging check.
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
  sealJson: vi.fn().mockImplementation(async ({ value }: { value: unknown }) => ({ v: 4, scopeKey: 'mock', store: 'mock', kid: 'mock', iv: 'i', aad: 'a', ct: btoa(JSON.stringify(value)), at: Date.now() })),
  openJson: vi.fn().mockImplementation(async (params: { envelope: { ct: string } }) => JSON.parse(atob(params.envelope.ct))),
}))

// Mock packageStorage.resolveFormForWorkOrder
const mockForm = { templateId: 'tpl-1', version: 3, checksum: 'abc123', campos: [{ name: 'campo1', type: 'text' }], packageId: 'pkg-1' }
vi.mock('../../../../src/shared/offline/packageStorage', () => ({
  resolveFormForWorkOrder: vi.fn().mockResolvedValue({ form: mockForm }),
}))

// Mock binaryStaging.listStagedBinaries
vi.mock('../../../../src/shared/offline/binaryStaging', () => ({
  listStagedBinaries: vi.fn().mockResolvedValue([{ evidenceId: 'ev-1', packageId: 'pkg-1', scopeKey: 't1:a1:dev-1:pkg-1:ev-1' }]),
}))

const mockCtx = {
  tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1',
  key: { algorithm: { name: 'AES-GCM' } } as unknown as CryptoKey, kid: 'k1',
  expectedEntityVersion: 2,
}
vi.mock('../../../../src/shared/offline/lifecycleStart', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../../src/shared/offline/lifecycleStart')>()
  return { ...orig, resolveStartContext: vi.fn().mockResolvedValue({ ctx: mockCtx }) }
})

const { recordMaintenanceOffline, resolveStartContext } =
  await import('../../../../src/shared/offline/lifecycleStart')

describe('R7 maintenance fail-closed', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  it('records command with pinned form version/checksum', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const r = await recordMaintenanceOffline('wo1', 'cmd-wo1-1', { campo1: 'valor' }, ['ev-1'], ctx, 'start-wo1')
    expect(r.status).toBe('pending_offline')

    const stored = Object.values(stores.offlineCommands)[0] as { envelope: { ct: string } }
    const decoded = JSON.parse(atob(stored.envelope.ct))
    expect(decoded.commandType).toBe('maintenance')
    expect(decoded.payload.formVersion).toBe(3)
    expect(decoded.payload.formChecksum).toBe('abc123')
    expect(decoded.payload.templateId).toBe('tpl-1')
    expect(decoded.expectedFormVersion).toBe(3)
    expect(decoded.payload.evidenceIds).toEqual(['ev-1'])
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('fails closed when form unavailable', async () => {
    const { resolveFormForWorkOrder } = await import('../../../../src/shared/offline/packageStorage')
    vi.mocked(resolveFormForWorkOrder).mockResolvedValueOnce({ error: 'Form not delivered' })

    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await recordMaintenanceOffline('wo1', 'cmd-test', { campo1: 'v' }, [], ctx, 'start-wo1')
    expect(r.status).toBe('form_unavailable')
    expect(r.messageKey).toBe('offline.formUnavailable')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('fails closed when form envelope tampered', async () => {
    const { resolveFormForWorkOrder } = await import('../../../../src/shared/offline/packageStorage')
    vi.mocked(resolveFormForWorkOrder).mockResolvedValueOnce({ error: 'Form envelope tampered' })

    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await recordMaintenanceOffline('wo1', 'cmd-test', { campo1: 'v' }, [], ctx, 'start-wo1')
    expect(r.status).toBe('form_unavailable')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('fails with evidence_not_staged when evidence not in R8 staging', async () => {
    const { listStagedBinaries } = await import('../../../../src/shared/offline/binaryStaging')
    vi.mocked(listStagedBinaries).mockResolvedValueOnce([]) // no staged evidence

    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await recordMaintenanceOffline('wo1', 'cmd-test', { campo1: 'v' }, ['ev-missing'], ctx, 'start-wo1')
    expect(r.status).toBe('evidence_not_staged')
    expect(r.messageKey).toBe('offline.evidenceNotStaged')
    // No command recorded
    expect(stores.offlineCommands).toBeUndefined()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('allows maintenance with no evidence (empty evidenceIds)', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await recordMaintenanceOffline('wo1', 'cmd-test', { campo1: 'v' }, [], ctx, 'start-wo1')
    expect(r.status).toBe('pending_offline')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('blocks on failed local start', async () => {
    const { recordCommand, updateCommandStatus } = await import('../../../../src/shared/offline/commandJournal')
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    await recordCommand({
      commandId: 'start-wo1', commandType: 'start', payload: {},
      entityId: 'wo1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1',
      key: ctx.key, kid: 'k1',
    })
    await updateCommandStatus(ctx.key, 't1:a1:dev-1:pkg-1', 't1', 'a1', 'start-wo1', { status: 'failed', failureCode: 'X', failureReason: 'test' })

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await recordMaintenanceOffline('wo1', 'cmd-test', { campo1: 'v' }, [], ctx, 'start-wo1')
    expect(r.status).toBe('failed')
    expect(r.messageKey).toBe('workOrders.startCommandBlocked')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })
})
