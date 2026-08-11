/**
 * R2c — Offline trust state: device registration + lease verification status.
 * Persisted to localStorage. Cleared on logout/identity switch.
 */
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type LeaseStatus = 'valid' | 'expired' | 'revoked' | 'unknown' | 'none'

interface OfflineTrustState {
  isOfflineReady: boolean
  leaseStatus: LeaseStatus
  deviceId: string | null
  lastVerifiedAt: number | null
  setTrustReady: (deviceId: string, leaseStatus: LeaseStatus) => void
  clearTrust: () => void
  setLeaseStatus: (status: LeaseStatus) => void
}

export const useOfflineTrustStore = create<OfflineTrustState>()(
  persist(
    (set) => ({
      isOfflineReady: false,
      leaseStatus: 'none',
      deviceId: null,
      lastVerifiedAt: null,
      setTrustReady: (deviceId, leaseStatus) => set({
        isOfflineReady: leaseStatus === 'valid',
        leaseStatus,
        deviceId,
        lastVerifiedAt: Date.now(),
      }),
      clearTrust: () => set({
        isOfflineReady: false,
        leaseStatus: 'none',
        deviceId: null,
        lastVerifiedAt: null,
      }),
      setLeaseStatus: (status) => set((s) => ({
        leaseStatus: status,
        isOfflineReady: status === 'valid',
      })),
    }),
    { name: "offline-trust-storage" }
  )
)
