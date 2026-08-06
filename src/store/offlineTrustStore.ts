/**
 * R2 — Offline trust store. Reconciles the signed lease with the R1 backend
 * when online (registering the non-extractable device key, caching
 * verification keys, refreshing the lease) and evaluates the cached signed
 * lease when offline. Gate status is never persisted to localStorage: it is
 * derived from IndexedDB trust records and signed claims, so editing editable
 * auth storage can never unlock protected UI.
 */
import { create } from 'zustand'
import {
  getOrCreateDeviceKey, saveDeviceRegistration, registerDeviceWithServer,
  fetchVerificationKeys, saveVerificationKeys, getCachedVerificationKeys,
  refreshLease, saveLease, getStoredLease, evaluateOfflineGate, clearTrustForScope,
  type OfflineGateStatus,
} from '../shared/offline/deviceTrust'
import type { OfflineLeaseClaim, VerificationKey } from '../shared/offline/crypto'
import { useCSRFStore } from './csrfStore'

interface OfflineTrustState {
  status: OfflineGateStatus
  resolved: boolean
  claim: OfflineLeaseClaim | null
  deviceId: string | null
  reconcile: (tenantId: string, userId: string) => Promise<void>
  clearForScope: (tenantId: string, userId: string) => Promise<void>
}
const trustScopeKey = (tenantId: string, userId: string) => `${tenantId}:${userId}`

async function ensureCsrfToken(): Promise<string | undefined> {
  const current = useCSRFStore.getState().token
  if (current) return current
  await useCSRFStore.getState().fetchToken().catch(() => {})
  return useCSRFStore.getState().token ?? undefined
}
export const useOfflineTrustStore = create<OfflineTrustState>((set) => ({
  status: 'pending',
  resolved: false,
  claim: null,
  deviceId: null,

  reconcile: async (tenantId, userId) => {
    const scopeKey = trustScopeKey(tenantId, userId)
    set({ status: 'pending', resolved: false, claim: null })
    try {
      // Non-extractable device key; only the public JWK is ever persisted
      const { stored } = await getOrCreateDeviceKey(scopeKey)
      // Register until the server issues an opaque deviceId (never a client UUID)
      let deviceId = stored.deviceId
      if (!deviceId) {
        const registered = await registerDeviceWithServer({ publicKeyJwk: stored.publicKeyJwk, csrfToken: await ensureCsrfToken() })
        if (registered.ok === true) {
          deviceId = registered.deviceId
          await saveDeviceRegistration(scopeKey, registered.deviceId, stored.publicKeyJwk)
        } else if (registered.kind !== 'network') {
          set({ status: 'lease-invalid', resolved: true }) // explicit rejection: never silently accept
          return
        } else {
          set({ status: 'no-device', resolved: true }) // offline before first registration
          return
        }
      }
      // Verification keys: fetch online, cache for offline reloads
      const fetched = await fetchVerificationKeys().catch(() => [] as VerificationKey[])
      if (fetched.length) await saveVerificationKeys(fetched)
      const keySet = fetched.length ? fetched : await getCachedVerificationKeys()
      // Refresh the signed lease; fall back to the cached lease only on network failure
      const refreshed = await refreshLease({ deviceId, csrfToken: await ensureCsrfToken() })
      if (refreshed.ok === true) {
        await saveLease({ ...refreshed.lease, id: scopeKey })
        set({ status: 'online-authenticated', resolved: true, deviceId })
        return
      }
      if (refreshed.kind === 'network') {
        const lease = await getStoredLease(scopeKey)
        const status = await evaluateOfflineGate({ tenantId, userId, deviceId, lease, keySet, nowMs: Date.now() })
        set({ status, resolved: true, deviceId, claim: status === 'valid' ? lease?.claim ?? null : null })
        return
      }
      set({ status: 'lease-invalid', resolved: true, deviceId }) // explicit 401/403 (revocation etc.)
    } catch {
      set({ status: 'unavailable', resolved: true })
    }
  },

  clearForScope: async (tenantId, userId) => {
    await clearTrustForScope(trustScopeKey(tenantId, userId))
    set({ status: 'pending', resolved: false, claim: null, deviceId: null })
  },
}))