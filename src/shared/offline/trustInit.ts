/**
 * R2c — Trust initialization: register device + refresh lease + verify.
 * Called once at app bootstrap when online and authenticated.
 */
import { registerDevice, getStoredDevice } from './deviceTrust'
import { refreshLease, fetchVerificationKeys, verifyLease, getStoredLease } from './leaseGate'
import { useOfflineTrustStore } from '@/store/offlineTrustStore'

export interface TrustInitResult { ok: boolean; error?: string }

/** Initialize offline trust: register device, refresh lease, verify, update store. */
export async function initializeOfflineTrust(): Promise<TrustInitResult> {
  const store = useOfflineTrustStore.getState()

  try {
    // 1. Register device (or get existing)
    const devResult = await registerDevice()
    if (devResult.error) {
      store.clearTrust()
      return { ok: false, error: devResult.error.code }
    }
    const device = devResult.device!

    // 2. Refresh lease from backend
    const leaseResult = await refreshLease(device.deviceId)
    if (leaseResult.error) {
      store.setTrustReady(device.deviceId, 'unknown')
      return { ok: false, error: leaseResult.error.code }
    }
    const storedLease = leaseResult.stored!

    // 3. Fetch verification keys
    const keysResult = await fetchVerificationKeys()
    if (keysResult.error || !keysResult.keys?.length) {
      store.setTrustReady(device.deviceId, 'unknown')
      return { ok: false, error: keysResult.error?.code ?? 'NO_VERIFICATION_KEYS' }
    }

    // 4. Verify lease (signature + binding + expiry)
    const binding = { tenantId: storedLease.lease.tenantId, userId: storedLease.lease.userId, deviceId: device.deviceId }
    const verification = await verifyLease(storedLease, keysResult.keys, binding)
    if (!verification.valid) {
      store.setTrustReady(device.deviceId, (verification as { status: string }).status as 'expired' | 'revoked' | 'unknown')
      return { ok: false, error: (verification as { code: string }).code }
    }

    // 5. All good — mark offline ready
    store.setTrustReady(device.deviceId, 'valid')
    return { ok: true }
  } catch (e) {
    store.clearTrust()
    return { ok: false, error: e instanceof Error ? e.message : 'INIT_FAILED' }
  }
}

/** Check if a stored lease is still valid without network. */
export async function checkStoredLeaseValidity(): Promise<boolean> {
  try {
    const lease = await getStoredLease()
    if (!lease) return false
    const binding = { tenantId: lease.lease.tenantId, userId: lease.lease.userId, deviceId: lease.lease.deviceId }
    const keysResult = await fetchVerificationKeys()
    if (!keysResult.keys?.length) return false
    const result = await verifyLease(lease, keysResult.keys, binding)
    return result.valid
  } catch { return false }
}
