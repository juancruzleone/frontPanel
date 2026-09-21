/**
 * R2 — Device trust: key generation, backend registration, IndexedDB persistence.
 */
import { fetchWithAuthRetry } from '@/shared/utils/apiHeaders'
import { generateDeviceKeyPair } from './crypto'

const API = '/api/offline'
const DB_NAME = 'GMAO_Offline_DB'
const DB_VERSION = 2
const DEVICE_STORE = 'registeredDevice'
const REQUIRED_STORES = [DEVICE_STORE, 'offlineLease', 'offlinePackageResources', 'offlinePackageMeta', 'offlinePackageKeys', 'offlineDocumentsScoped', 'offlineCommands', 'binaryStaging', 'stagedUploads']

export interface StoredDevice {
  deviceId: string; tenantId: string; userId: string; publicKeyJwk: JsonWebKey
  privateKeyHandle?: CryptoKey; status: 'active' | 'revoked'; registeredAt: number
}
export interface RegisterDeviceResult { device?: StoredDevice; error?: { message: string; code: string } }

export async function registerDevice(): Promise<RegisterDeviceResult> {
  try {
    const scope = getAuthScope()
    if (!scope) return { error: { message: 'No authenticated user', code: 'NO_AUTH' } }
    const existing = await getStoredDevice(`${scope.tenantId}:${scope.userId}`)
    if (existing && existing.status === 'active') return { device: existing }

    const { privateKey, publicKeyJwk } = await generateDeviceKeyPair()
    const res = await fetchWithAuthRetry(`${API}/devices/register`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKeyJwk, clientDeviceId: localStorage.getItem('__offline_device_id') }),
    })
    const body = await parseRes(res)
    if (!res.ok) return { error: extractError(body, res.status) }

    const device: StoredDevice = {
      deviceId: body.deviceId as string, tenantId: scope.tenantId, userId: scope.userId,
      publicKeyJwk: body.publicKeyJwk as JsonWebKey, privateKeyHandle: privateKey,
      status: 'active', registeredAt: Date.now(),
    }
    await persistDevice(device)
    return { device }
  } catch (e) { return { error: { message: e instanceof Error ? e.message : 'Registration failed', code: 'NETWORK_ERROR' } } }
}

export async function getStoredDevice(key: string): Promise<StoredDevice | null> {
  try {
    const { store } = await devStore('readonly')
    return new Promise((resolve, reject) => {
      const r = store.get(key); r.onsuccess = () => resolve((r.result as StoredDevice) ?? null); r.onerror = () => reject(r.error)
    })
  } catch { return null }
}

export async function clearStoredDevice(key: string): Promise<void> {
  const { store, transaction } = await devStore('readwrite')
  const completion = transactionCompletion(transaction)
  store.delete(key)
  await completion
}

function getAuthScope(): { tenantId: string; userId: string } | null {
  try { const raw = localStorage.getItem('auth-storage'); if (!raw) return null; const { state } = JSON.parse(raw); return state?.tenantId && state?.userId ? { tenantId: state.tenantId, userId: state.userId } : null } catch { return null }
}

async function persistDevice(d: StoredDevice): Promise<void> {
  const { store: s } = await devStore('readwrite')
  return new Promise((resolve, reject) => { const r = s.put(d, `${d.tenantId}:${d.userId}`); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error) })
}

function devStore(mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; transaction: IDBTransaction }> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'))
    const r = indexedDB.open(DB_NAME, DB_VERSION)
    r.onerror = () => reject(r.error)
    r.onsuccess = () => {
      const transaction = r.result.transaction(DEVICE_STORE, mode)
      resolve({ store: transaction.objectStore(DEVICE_STORE), transaction })
    }
    r.onupgradeneeded = () => {
      const db = r.result
      for (const name of REQUIRED_STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, name === 'offlinePackageResources' ? { keyPath: 'id' } : undefined)
    }
  })
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

async function parseRes(r: Response): Promise<Record<string, unknown>> { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }
function extractError(b: Record<string, unknown>, s: number) { const e = b.error as { message?: string; code?: string } | undefined; return { message: e?.message ?? `HTTP ${s}`, code: e?.code ?? 'UNKNOWN_ERROR' } }
