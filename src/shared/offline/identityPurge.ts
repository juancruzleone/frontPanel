import { useOfflineTrustStore } from '@/store/offlineTrustStore'
import { purgeOfflineQueueForIdentity } from '@/store/offlineStore'
import { purgeStagedBinariesForIdentity } from './binaryStaging'
import { purgeCommandsForIdentity } from './commandJournal'
import { clearStoredDevice } from './deviceTrust'
import { purgeDocumentsForIdentity } from './documentStorage'
import { getStoredLease, clearStoredLease } from './leaseGate'
import { purgeOfflineDraftsForScope } from './lifecycleStart'
import { purgePackageStorageForIdentity } from './packageStorage'

/** Await every identity-bound offline deletion before local logout completes. */
export async function purgeOfflineIdentity(tenantId: string, userId: string): Promise<void> {
  const lease = await getStoredLease()
  const deletions: Array<Promise<void>> = [
    purgeOfflineDraftsForScope(tenantId, userId),
    purgePackageStorageForIdentity(tenantId, userId),
    purgeCommandsForIdentity(tenantId, userId),
    purgeStagedBinariesForIdentity(tenantId, userId),
    purgeDocumentsForIdentity(tenantId, userId),
    clearStoredDevice(`${tenantId}:${userId}`),
    purgeOfflineQueueForIdentity(tenantId, userId),
  ]

  if (lease?.lease.tenantId === tenantId && lease.lease.userId === userId) {
    deletions.push(clearStoredLease())
  }

  const results = await Promise.allSettled(deletions)
  useOfflineTrustStore.getState().clearTrust()
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failure) throw failure.reason
}
