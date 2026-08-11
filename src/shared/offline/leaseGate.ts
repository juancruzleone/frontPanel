/**
 * R2b — Lease gate: refresh, store, verify signature, check status.
 * Fails closed on unknown/invalid/revoked/expired leases.
 */
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'
import { importVerificationKey, verifyCanonicalSignature, type VerificationKey } from './crypto'
import type { OfflineLeaseClaim, OfflineLeaseHeader, StoredLease, LeaseStatus } from './types'

const API = '/api/offline'
const DB_NAME = 'GMAO_Offline_DB'
const LEASE_STORE = 'offlineLease'
const DEVICE_STORE = 'registeredDevice'

export interface RefreshLeaseResult { stored?: StoredLease; error?: { message: string; code: string } }
export type VerifyLeaseResult = { valid: true } | { valid: false; status: LeaseStatus; code: string }

/** POST /api/offline/lease/refresh — refresh signed lease from backend. */
export async function refreshLease(deviceId: string): Promise<RefreshLeaseResult> {
  try {
    const res = await fetchWithAuthRetry(`${API}/lease/refresh`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const body = await parseRes(res)
    if (!res.ok) return { error: extractError(body, res.status) }

    const stored: StoredLease = {
      lease: body.lease as OfflineLeaseClaim,
      header: body.header as OfflineLeaseHeader,
      signature: body.signature as string,
      storedAt: Date.now(),
    }
    await persistLease(stored)
    return { stored }
  } catch (e) { return { error: { message: e instanceof Error ? e.message : 'Network error', code: 'NETWORK_ERROR' } } }
}

/** Verify lease signature against a set of trusted verification keys. */
export async function verifyLeaseSignature(lease: OfflineLeaseClaim, signature: string, kid: string, keySet: VerificationKey[]): Promise<boolean> {
  const jwk = keySet.find(k => k.kid === kid)
  if (!jwk) return false
  try {
    const pubKey = await importVerificationKey(jwk)
    return verifyCanonicalSignature(lease, signature, pubKey)
  } catch { return false }
}

/** Pure lease status check. Fails closed. */
export function checkLeaseStatus(lease: OfflineLeaseClaim, expectedBinding: { tenantId: string; userId: string; deviceId: string }): LeaseStatus {
  if (!lease || typeof lease.expiresAt !== 'string') return 'unknown'
  if (lease.tenantId !== expectedBinding.tenantId || lease.userId !== expectedBinding.userId || lease.deviceId !== expectedBinding.deviceId) return 'revoked'
  const expires = new Date(lease.expiresAt).getTime()
  if (isNaN(expires) || Date.now() > expires) return 'expired'
  return 'valid'
}

/** Full verify: signature + binding + expiry. Returns detailed result. */
export async function verifyLease(stored: StoredLease, keySet: VerificationKey[], binding: { tenantId: string; userId: string; deviceId: string }): Promise<VerifyLeaseResult> {
  const status = checkLeaseStatus(stored.lease, binding)
  if (status !== 'valid') return { valid: false, status, code: status === 'expired' ? 'LEASE_EXPIRED' : status === 'revoked' ? 'OWNERSHIP_MISMATCH' : 'LEASE_INVALID' }
  const sigValid = await verifyLeaseSignature(stored.lease, stored.signature, stored.header.kid, keySet)
  if (!sigValid) return { valid: false, status: 'unknown', code: 'INVALID_SIGNATURE' }
  return { valid: true }
}

/** GET /api/offline/verification-keys — fetch public key set for lease verification. */
export async function fetchVerificationKeys(): Promise<{ keys?: VerificationKey[]; error?: { message: string; code: string } }> {
  try {
    const res = await fetchWithAuthRetry(`${API}/verification-keys`, { method: 'GET', credentials: 'include' })
    const body = await parseRes(res)
    if (!res.ok) return { error: extractError(body, res.status) }
    const keys = (body.keys ?? []) as VerificationKey[]
    return { keys }
  } catch (e) { return { error: { message: e instanceof Error ? e.message : 'Network error', code: 'NETWORK_ERROR' } } }
}

export async function getStoredLease(): Promise<StoredLease | null> {
  try {
    const s = await leaseStore('readonly')
    return new Promise((resolve, reject) => {
      const r = s.get('current'); r.onsuccess = () => resolve((r.result as StoredLease) ?? null); r.onerror = () => reject(r.error)
    })
  } catch { return null }
}

export async function clearStoredLease(): Promise<void> {
  const s = await leaseStore('readwrite')
  return new Promise((resolve, reject) => { const r = s.delete('current'); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error) })
}

async function persistLease(stored: StoredLease): Promise<void> {
  const s = await leaseStore('readwrite')
  return new Promise((resolve, reject) => { const r = s.put(stored, 'current'); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error) })
}

function leaseStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'))
    const r = indexedDB.open(DB_NAME)
    r.onerror = () => reject(r.error)
    r.onsuccess = () => resolve(r.result.transaction(LEASE_STORE, mode).objectStore(LEASE_STORE))
     r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(LEASE_STORE)) r.result.createObjectStore(LEASE_STORE); if (!r.result.objectStoreNames.contains(DEVICE_STORE)) r.result.createObjectStore(DEVICE_STORE) }
  })
}

async function parseRes(r: Response): Promise<Record<string, unknown>> { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }
function extractError(b: Record<string, unknown>, s: number) { const e = b.error as { message?: string; code?: string } | undefined; return { message: e?.message ?? `HTTP ${s}`, code: e?.code ?? 'UNKNOWN_ERROR' } }
