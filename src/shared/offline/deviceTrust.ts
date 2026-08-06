/**
 * R2 — Device trust persistence (dedicated GMAO_Trust_DB IndexedDB, separate
 * from U2/U5/U6) + offline gate. Stores the non-extractable device CryptoKey
 * handle, server-issued deviceId, public JWK (never private), cached
 * verification keys, and signed lease. R1 endpoints are CSRF-protected;
 * failures are typed (network/auth/server) so 401/403 never silently unlock.
 */
import { generateDeviceKeyPair, verifyLeaseClaim, type OfflineLeaseClaim, type VerificationKey } from './crypto'
import { getOrCreateDeviceId } from './types'

const DB_NAME = 'GMAO_Trust_DB', DB_VERSION = 1
const DEVICE_KEYS_STORE = 'deviceKeys', LEASES_STORE = 'leases', META_STORE = 'trustMeta'
const VERIFICATION_KEYS_META_KEY = 'verificationKeys'
const API_BASE = '/api/offline'

export interface StoredDeviceKey { id: string; publicKeyJwk: JsonWebKey; deviceId: string; createdAt: number; privateKey: CryptoKey }
export interface StoredLease { id: string; claim: OfflineLeaseClaim; kid: string; signature: string; storedAt: number }
export type DeviceRegisterResult = { ok: true; deviceId: string; publicKeyJwk: JsonWebKey } | { ok: false; kind: 'network' | 'auth' | 'server'; errorCode?: string }
export type LeaseRefreshResult = { ok: true; lease: StoredLease } | { ok: false; kind: 'network' | 'auth' | 'server'; errorCode?: string }
export type OfflineGateStatus =
  | 'pending' | 'online-authenticated' | 'valid' | 'no-device' | 'no-lease'
  | 'no-verification-keys' | 'lease-invalid' | 'lease-expired' | 'binding-mismatch' | 'unavailable'
export interface OfflineGateInput { tenantId: string; userId: string; deviceId: string | null; lease: StoredLease | null; keySet: VerificationKey[]; nowMs: number }
// ── IndexedDB ────────────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(DEVICE_KEYS_STORE)) db.createObjectStore(DEVICE_KEYS_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(LEASES_STORE)) db.createObjectStore(LEASES_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'key' })
    }
  })
}
function idbOp<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(store, mode).objectStore(store))
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result as T)
  })
}
async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDB()
  try { return await fn(db) } finally { db.close() }
}
const getRecord = <T>(store: string, key: string) => withDb((db) => idbOp<T | undefined>(db, store, 'readonly', (s) => s.get(key)).then((v) => v ?? null))
const putRecord = <T extends { id: string }>(store: string, record: T) => withDb((db) => idbOp(db, store, 'readwrite', (s) => s.put(record)))
const deleteRecord = (store: string, key: string) => withDb((db) => idbOp(db, store, 'readwrite', (s) => s.delete(key)))
// ── Device key ───────────────────────────────────────────────────────────────
export const getStoredDevice = (scopeKey: string) => getRecord<StoredDeviceKey>(DEVICE_KEYS_STORE, scopeKey)
export async function getOrCreateDeviceKey(scopeKey: string): Promise<{ privateKey: CryptoKey; stored: StoredDeviceKey }> {
  const existing = await getStoredDevice(scopeKey)
  if (existing?.privateKey) return { privateKey: existing.privateKey, stored: existing }
  const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
  const stored: StoredDeviceKey = { id: scopeKey, publicKeyJwk, deviceId: '', createdAt: Date.now(), privateKey }
  await putRecord(DEVICE_KEYS_STORE, stored)
  return { privateKey, stored }
}
export async function saveDeviceRegistration(scopeKey: string, deviceId: string, publicKeyJwk: JsonWebKey): Promise<void> {
  const existing = await getStoredDevice(scopeKey)
  const stored = existing ?? (await getOrCreateDeviceKey(scopeKey)).stored
  await putRecord(DEVICE_KEYS_STORE, { ...stored, id: scopeKey, deviceId, publicKeyJwk })
}
// ── Verification keys ────────────────────────────────────────────────────────
async function fetchJson(fetchImpl: typeof fetch, path: string, init: RequestInit): Promise<Response> {
  const response = await fetchImpl(`${API_BASE}${path}`, init)
  if (!response || typeof response.status !== 'number') throw new TypeError('invalid response')
  return response
}
async function readErrorCode(response: Response): Promise<string | undefined> {
  try { return (await response.clone().json())?.error?.code } catch { return undefined }
}
/** GET /api/offline/verification-keys — public metadata, no auth required. */
export async function fetchVerificationKeys(fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)): Promise<VerificationKey[]> {
  const response = await fetchJson(fetchImpl, '/verification-keys', { method: 'GET', credentials: 'include' })
  if (!response.ok) return []
  const keys = (await response.json())?.keys ?? []
  return keys.filter((k: VerificationKey) => k && k.kid && k.kty === 'EC' && k.crv === 'P-256' && k.x && k.y)
}
export async function saveVerificationKeys(keys: VerificationKey[]): Promise<void> {
  await withDb((db) => idbOp(db, META_STORE, 'readwrite', (s) => s.put({ key: VERIFICATION_KEYS_META_KEY, value: keys })))
}
export async function getCachedVerificationKeys(): Promise<VerificationKey[]> {
  const record = await getRecord<{ key: string; value: VerificationKey[] }>(META_STORE, VERIFICATION_KEYS_META_KEY)
  return record?.value ?? []
}
// ── R1 registration and lease refresh (CSRF-protected) ───────────────────────
export async function registerDeviceWithServer(params: { publicKeyJwk: JsonWebKey; clientDeviceId?: string; fetchImpl?: typeof fetch; csrfToken?: string }): Promise<DeviceRegisterResult> {
  try {
    const fetchImpl = params.fetchImpl ?? globalThis.fetch.bind(globalThis)
    const response = await fetchJson(fetchImpl, '/devices/register', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(params.csrfToken ? { 'X-CSRF-Token': params.csrfToken } : {}) },
      body: JSON.stringify({ publicKeyJwk: params.publicKeyJwk, clientDeviceId: params.clientDeviceId ?? getOrCreateDeviceId() }),
    })
    if (response.status === 201) { const body = await response.json(); return { ok: true, deviceId: body.deviceId, publicKeyJwk: body.publicKeyJwk } }
    if (response.status === 401 || response.status === 403) return { ok: false, kind: 'auth', errorCode: await readErrorCode(response) }
    return { ok: false, kind: 'server', errorCode: await readErrorCode(response) }
  } catch { return { ok: false, kind: 'network' } }
}
export async function refreshLease(params: { deviceId: string; fetchImpl?: typeof fetch; csrfToken?: string }): Promise<LeaseRefreshResult> {
  try {
    const fetchImpl = params.fetchImpl ?? globalThis.fetch.bind(globalThis)
    const response = await fetchJson(fetchImpl, '/lease/refresh', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(params.csrfToken ? { 'X-CSRF-Token': params.csrfToken } : {}) },
      body: JSON.stringify({ deviceId: params.deviceId }),
    })
    if (response.status === 200) { const body = await response.json(); return { ok: true, lease: { id: params.deviceId, claim: body.lease, kid: body.header?.kid, signature: body.signature, storedAt: Date.now() } } }
    if (response.status === 401 || response.status === 403) return { ok: false, kind: 'auth', errorCode: await readErrorCode(response) }
    return { ok: false, kind: 'server', errorCode: await readErrorCode(response) }
  } catch { return { ok: false, kind: 'network' } }
}
// ── Lease persistence and gate ───────────────────────────────────────────────
export const saveLease = (lease: StoredLease) => putRecord(LEASES_STORE, lease)
export async function getStoredLease(scopeKey: string): Promise<StoredLease | null> {
  const lease = await getRecord<StoredLease>(LEASES_STORE, scopeKey)
  return lease && lease.id === scopeKey ? lease : null
}
export async function clearTrustForScope(scopeKey: string): Promise<void> {
  await deleteRecord(DEVICE_KEYS_STORE, scopeKey)
  await deleteRecord(LEASES_STORE, scopeKey)
}
/** Composite gate: only a valid, unexpired, correctly-bound signed lease unlocks. */
export async function evaluateOfflineGate(input: OfflineGateInput): Promise<OfflineGateStatus> {
  if (!input.deviceId) return 'no-device'
  if (!input.lease) return 'no-lease'
  if (!input.keySet.length) return 'no-verification-keys'
  const result = await verifyLeaseClaim(
    input.lease.claim, input.lease.signature, input.lease.kid, input.keySet,
    { tenantId: input.tenantId, userId: input.userId, deviceId: input.deviceId }, input.nowMs
  )
  switch (result.status) {
    case 'valid': return 'valid'
    case 'expired':
    case 'not_yet_valid': return 'lease-expired'
    case 'binding_mismatch': return 'binding-mismatch'
    case 'no_verification_keys': return 'no-verification-keys'
    default: return 'lease-invalid'
  }
}
