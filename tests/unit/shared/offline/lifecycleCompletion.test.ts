/**
 * R7 — Lifecycle completion: conditional dependency on local start.
 * Tests: local start included, no local start no dependency, failed start blocks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// IDB mock for commandJournal
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
  openJson: vi.fn().mockImplementation(async (params: { envelope: { ct: string } }) => JSON.parse(atob(params.envelope.ct))),
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

const { completeWorkOrderOnlineOrOffline, resolveStartContext, buildStartCommandId } =
  await import('../../../../src/shared/offline/lifecycleStart')
const { recordCommand, getCommandStatus } = await import('../../../../src/shared/offline/commandJournal')

describe('R7 completion dependency', () => {
  beforeEach(() => { for (const k of Object.keys(stores)) delete stores[k] })

  it('local pending start → includes dependsOn', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    // Record a local start command (pending)
    await recordCommand({
      commandId: 'start-wo1', commandType: 'start', payload: { workOrderId: 'wo1' },
      entityId: 'wo1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1',
      key: ctx.key, kid: 'k1',
    })

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'Done' }, ctx, 'start-wo1', vi.fn())
    expect(r.status).toBe('pending_offline')

    const stored = Object.values(stores.offlineCommands).find((v: unknown) => {
      const d = JSON.parse(atob((v as { envelope: { ct: string } }).envelope.ct))
      return d.commandType === 'completion'
    }) as { envelope: { ct: string } }
    const decoded = JSON.parse(atob(stored.envelope.ct))
    expect(decoded.dependsOn).toEqual(['start-wo1'])
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('no local start (authoritative en_progreso) → no dependsOn', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    // No start command recorded — order is already en_progreso authoritatively

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'Done' }, ctx, 'start-wo1', vi.fn())
    expect(r.status).toBe('pending_offline')

    const stored = Object.values(stores.offlineCommands)[0] as { envelope: { ct: string } }
    const decoded = JSON.parse(atob(stored.envelope.ct))
    expect(decoded.dependsOn).toEqual([])
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('stages signature and photo securely and preserves completion DTO references', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const result = await completeWorkOrderOnlineOrOffline('wo1', {
      trabajoRealizado: 'Done',
      observaciones: 'Verified',
      tiempoTrabajo: 2,
      estadoDispositivo: 'Activo',
      materialesUtilizados: [{ nombre: 'Filtro', cantidad: 1, unidad: 'u' }],
      firmaTecnico: 'data:image/png;base64,c2lnbmF0dXJl',
      evidenciaFoto: 'data:image/jpeg;base64,cGhvdG8=',
      nombreFoto: 'proof.jpg',
    }, ctx, 'start-wo1', vi.fn())

    expect(result.status).toBe('pending_offline')
    expect(Object.values(stores.binaryStaging)).toHaveLength(2)
    const commandRecord = Object.values(stores.offlineCommands)[0] as { envelope: { ct: string } }
    const command = JSON.parse(atob(commandRecord.envelope.ct))
    expect(command.payload).toMatchObject({
      trabajoRealizado: 'Done',
      tiempoTrabajo: 2,
      estadoDispositivo: 'Activo',
      materialesUtilizados: [{ nombre: 'Filtro', cantidad: 1, unidad: 'u' }],
      firmaTecnicoEvidenceId: 'completion-wo1-signature',
      evidenciaFotoEvidenceId: 'completion-wo1-photo',
      evidenceIds: ['completion-wo1-signature', 'completion-wo1-photo'],
    })
    expect(command.payload).not.toHaveProperty('firmaTecnico')
    expect(command.payload).not.toHaveProperty('evidenciaFoto')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('failed local start → blocks completion', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    // Record a start command then mark it failed
    await recordCommand({
      commandId: 'start-wo1', commandType: 'start', payload: { workOrderId: 'wo1' },
      entityId: 'wo1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1',
      key: ctx.key, kid: 'k1',
    })
    // Update status to failed
    const { updateCommandStatus } = await import('../../../../src/shared/offline/commandJournal')
    const scopeKey = 't1:a1:dev-1:pkg-1'
    await updateCommandStatus(ctx.key, scopeKey, 't1', 'a1', 'start-wo1', { status: 'failed', failureCode: 'TEST', failureReason: 'test' })

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'Done' }, ctx, 'start-wo1', vi.fn())
    expect(r.status).toBe('failed')
    expect(r.messageKey).toBe('workOrders.startCommandBlocked')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('conflict local start → blocks completion', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    await recordCommand({
      commandId: 'start-wo1', commandType: 'start', payload: { workOrderId: 'wo1' },
      entityId: 'wo1', tenantId: 't1', actorId: 'a1', deviceId: 'dev-1', packageId: 'pkg-1',
      key: ctx.key, kid: 'k1',
    })
    const { updateCommandStatus } = await import('../../../../src/shared/offline/commandJournal')
    await updateCommandStatus(ctx.key, 't1:a1:dev-1:pkg-1', 't1', 'a1', 'start-wo1', { status: 'conflict' })

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const r = await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'Done' }, ctx, 'start-wo1', vi.fn())
    expect(r.status).toBe('failed')
    expect(r.messageKey).toBe('workOrders.startCommandBlocked')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('online: delegates to API, no journal query', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    const onlineFn = vi.fn().mockResolvedValue({ estado: 'completada' })
    const r = await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'Done' }, ctx, 'start-wo1', onlineFn)
    expect(r.status).toBe('accepted')
    expect(onlineFn).toHaveBeenCalled()
  })

  it('online network error: falls through to offline', async () => {
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    const onlineFn = vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    const r = await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'Done' }, ctx, 'start-wo1', onlineFn)
    expect(r.status).toBe('pending_offline')
  })

  it('CompletionAdapterPayload extends Record<string, unknown>', async () => {
    // Verify no unsafe cast needed — payload is directly assignable
    const ctx = (await resolveStartContext('t1', 'a1', 'wo1')).ctx!
    const onlineFn = vi.fn().mockResolvedValue({})
    await completeWorkOrderOnlineOrOffline('wo1', { trabajoRealizado: 'X' }, ctx, 'start-wo1', onlineFn)
    const sentPayload = onlineFn.mock.calls[0][1]
    expect(typeof sentPayload).toBe('object')
    expect(sentPayload.trabajoRealizado).toBe('X')
  })
})
