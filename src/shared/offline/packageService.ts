/**
 * R3 — Package service: prepare + delta API client.
 * Tolerant of backend response shape (flat vs nested signature).
 */
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'
import type { OfflineBootstrap, OfflineDeltaResponse, OfflineManifest, OfflineManifestSignature } from './packageTypes'

const API = '/api/offline'
export const FORM_NOT_DELIVERED = 'FORM_NOT_DELIVERED'

export interface PrepareResult { bootstrap?: OfflineBootstrap; error?: { message: string; code: string } }
export interface DeltaResult { delta?: OfflineDeltaResponse; error?: { message: string; code: string } }

/** POST /api/offline/packages/prepare — full bootstrap. */
export async function preparePackage(deviceId: string, orderId?: string): Promise<PrepareResult> {
  try {
    const res = await fetchWithAuthRetry(`${API}/packages/prepare`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, ...(orderId ? { orderId } : {}) }),
    })
    const body = await parseRes(res)
    if (!res.ok) return { error: extractError(body, res.status) }
    return { bootstrap: normalizeBootstrap(body) }
  } catch (e) { return { error: netErr(e) } }
}

/** POST /api/offline/packages/delta — incremental deltas since cursor. */
export async function getDelta(packageId: string, deviceId: string, clientCursor: number, limit?: number): Promise<DeltaResult> {
  try {
    const res = await fetchWithAuthRetry(`${API}/packages/delta`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, deviceId, clientCursor, ...(limit != null ? { limit } : {}) }),
    })
    const body = await parseRes(res)
    if (!res.ok) return { error: extractError(body, res.status) }
    return { delta: body as unknown as OfflineDeltaResponse }
  } catch (e) { return { error: netErr(e) } }
}

/**
 * Normalize backend response into OfflineBootstrap.
 * Backend spreads manifest claims at top-level and adds `signature` as sibling.
 * R4 design expects manifest.signature nested. We reconcile both shapes.
 */
function normalizeBootstrap(body: Record<string, unknown>): OfflineBootstrap {
  const rawManifest = body.manifest as Record<string, unknown> | undefined
  const sig = (body.signature ?? rawManifest?.signature) as OfflineManifestSignature | undefined

  if (rawManifest && sig) {
    // Manifest exists with signature — ensure signature is nested
    const manifest: OfflineManifest = {
      ...rawManifest,
      signature: rawManifest.signature ?? sig,
    } as OfflineManifest
    return {
      success: body.success as boolean | undefined,
      manifest,
      workOrders: (body.workOrders ?? []) as Array<Record<string, unknown>>,
      installations: (body.installations ?? []) as Array<Record<string, unknown>>,
      assets: (body.assets ?? []) as Array<Record<string, unknown>>,
      forms: (body.forms ?? []) as Array<Record<string, unknown>>,
      inventoryRefs: (body.inventoryRefs ?? []) as Array<Record<string, unknown>>,
    }
  }

  // Fallback: treat entire body as manifest (flat backend shape)
  const { signature: _flatSig, success, workOrders, installations, assets, forms, inventoryRefs, ...claims } = body
  return {
    success: success as boolean | undefined,
    manifest: { ...claims, signature: sig! } as OfflineManifest,
    workOrders: (workOrders ?? []) as Array<Record<string, unknown>>,
    installations: (installations ?? []) as Array<Record<string, unknown>>,
    assets: (assets ?? []) as Array<Record<string, unknown>>,
    forms: (forms ?? []) as Array<Record<string, unknown>>,
    inventoryRefs: (inventoryRefs ?? []) as Array<Record<string, unknown>>,
  }
}

async function parseRes(r: Response): Promise<Record<string, unknown>> { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }
function extractError(b: Record<string, unknown>, s: number) { const e = b.error as { message?: string; code?: string } | undefined; return { message: e?.message ?? `HTTP ${s}`, code: e?.code ?? 'UNKNOWN_ERROR' } }
function netErr(e: unknown) { return { message: e instanceof Error ? e.message : 'Network error', code: 'NETWORK_ERROR' } }
