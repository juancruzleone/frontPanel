/**
 * R2 — offlineTrustStore behavior at the deviceTrust boundary: online
 * reconcile (registration, key cache, lease refresh, CSRF wiring), offline
 * fallback, forged-identity non-unlock, explicit 401/403 lock, and purge.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOfflineTrustStore } from '../../../src/store/offlineTrustStore'
import { useAuthStore } from '../../../src/store/authStore'
import { useCSRFStore } from '../../../src/store/csrfStore'
import * as trustApi from '../../../src/shared/offline/deviceTrust'

vi.mock('../../../src/shared/offline/deviceTrust', () => ({
  getOrCreateDeviceKey: vi.fn(), saveDeviceRegistration: vi.fn(), registerDeviceWithServer: vi.fn(),
  fetchVerificationKeys: vi.fn(), saveVerificationKeys: vi.fn(), getCachedVerificationKeys: vi.fn(),
  refreshLease: vi.fn(), saveLease: vi.fn(), getStoredLease: vi.fn(), evaluateOfflineGate: vi.fn(), clearTrustForScope: vi.fn(),
}))

const TENANT = 'tenant-A', USER = 'user-1', DEVICE = 'device-1', SCOPE = `${TENANT}:${USER}`
const CLAIM = { schemaVersion: 1, tenantId: TENANT, userId: USER, deviceId: DEVICE, role: 'tecnico', permissions: ['offline:read'], issuedAt: 'x', lastVerifiedAt: 'x', expiresAt: 'x' }
const STORED_LEASE = { id: SCOPE, claim: CLAIM, kid: 'kid', signature: 'sig', storedAt: 1 }
const m = vi.mocked(trustApi)

function seedDevice(deviceId = '') {
  m.getOrCreateDeviceKey.mockResolvedValue({ privateKey: {} as CryptoKey, stored: { id: SCOPE, publicKeyJwk: { kty: 'EC' }, deviceId, createdAt: 1, privateKey: {} as CryptoKey } })
}

describe('offlineTrustStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCSRFStore.setState({ token: 'csrf-test', isLoading: false, error: null })
    useOfflineTrustStore.setState({ status: 'pending', resolved: false, claim: null, deviceId: null })
    useAuthStore.setState({ user: null, userId: null, tenantId: null, role: null, permissions: null, isAuthenticated: false, isAuthResolved: false })
  })
  it('reconciles online: registers the device, caches keys, refreshes the lease, sends CSRF', async () => {
    seedDevice('')
    m.registerDeviceWithServer.mockResolvedValue({ ok: true, deviceId: DEVICE, publicKeyJwk: { kty: 'EC' } })
    m.fetchVerificationKeys.mockResolvedValue([])
    m.refreshLease.mockResolvedValue({ ok: true, lease: STORED_LEASE })
    await useOfflineTrustStore.getState().reconcile(TENANT, USER)

    expect(useOfflineTrustStore.getState().status).toBe('online-authenticated')
    expect(useOfflineTrustStore.getState().deviceId).toBe(DEVICE)
    expect(m.registerDeviceWithServer).toHaveBeenCalledWith(expect.objectContaining({ csrfToken: 'csrf-test' }))
    expect(m.refreshLease).toHaveBeenCalledWith(expect.objectContaining({ deviceId: DEVICE, csrfToken: 'csrf-test' }))
    expect(m.saveDeviceRegistration).toHaveBeenCalledWith(SCOPE, DEVICE, expect.anything())
    expect(m.saveLease).toHaveBeenCalledWith({ ...STORED_LEASE, id: SCOPE })
  })
  it('falls back to the cached signed lease when offline and unlocks with a valid lease', async () => {
    seedDevice(DEVICE)
    m.fetchVerificationKeys.mockRejectedValue(new TypeError('Failed to fetch'))
    m.refreshLease.mockResolvedValue({ ok: false, kind: 'network' })
    m.getStoredLease.mockResolvedValue(STORED_LEASE)
    m.evaluateOfflineGate.mockResolvedValue('valid')

    await useOfflineTrustStore.getState().reconcile(TENANT, USER)

    expect(useOfflineTrustStore.getState().status).toBe('valid')
    expect(useOfflineTrustStore.getState().claim).toBe(STORED_LEASE.claim)
  })
  it('locks when offline and no signed lease exists', async () => {
    seedDevice(DEVICE)
    m.fetchVerificationKeys.mockRejectedValue(new TypeError('Failed to fetch'))
    m.refreshLease.mockResolvedValue({ ok: false, kind: 'network' })
    m.evaluateOfflineGate.mockResolvedValue('no-lease')

    await useOfflineTrustStore.getState().reconcile(TENANT, USER)

    expect(['no-device', 'no-lease']).toContain(useOfflineTrustStore.getState().status)
  })
  it('does not unlock for a forged tenant identity scope', async () => {
    seedDevice('')
    m.registerDeviceWithServer.mockResolvedValue({ ok: false, kind: 'network' })
    await useOfflineTrustStore.getState().reconcile('forged-tenant', USER)

    expect(useOfflineTrustStore.getState().status).toBe('no-device')
  })
  it('locks on explicit 401/403 (revocation) instead of silently accepting a cached lease', async () => {
    seedDevice(DEVICE)
    m.fetchVerificationKeys.mockResolvedValue([])
    m.refreshLease.mockResolvedValue({ ok: false, kind: 'auth', errorCode: 'DEVICE_REVOKED' })
    m.getStoredLease.mockResolvedValue(STORED_LEASE)

    await useOfflineTrustStore.getState().reconcile(TENANT, USER)

    expect(useOfflineTrustStore.getState().status).toBe('lease-invalid')
    expect(m.evaluateOfflineGate).not.toHaveBeenCalled()
  })
  it('clearForScope purges trust records for the scope and resets state', async () => {
    await useOfflineTrustStore.getState().clearForScope(TENANT, USER)
    expect(m.clearTrustForScope).toHaveBeenCalledWith(SCOPE)
    expect(useOfflineTrustStore.getState()).toMatchObject({ status: 'pending', resolved: false, claim: null, deviceId: null })
  })
})