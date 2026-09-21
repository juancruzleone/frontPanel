import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clearTrust: vi.fn(),
  purgeQueue: vi.fn().mockResolvedValue(undefined),
  purgeEvidence: vi.fn().mockResolvedValue(undefined),
  purgeCommands: vi.fn().mockResolvedValue(undefined),
  clearDevice: vi.fn().mockResolvedValue(undefined),
  purgeDocuments: vi.fn().mockResolvedValue(undefined),
  getLease: vi.fn(),
  clearLease: vi.fn().mockResolvedValue(undefined),
  purgeDrafts: vi.fn().mockResolvedValue(undefined),
  purgePackages: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../../src/store/offlineTrustStore', () => ({
  useOfflineTrustStore: { getState: () => ({ clearTrust: mocks.clearTrust }) },
}))
vi.mock('../../../../src/store/offlineStore', () => ({ purgeOfflineQueueForIdentity: mocks.purgeQueue }))
vi.mock('../../../../src/shared/offline/binaryStaging', () => ({ purgeStagedBinariesForIdentity: mocks.purgeEvidence }))
vi.mock('../../../../src/shared/offline/commandJournal', () => ({ purgeCommandsForIdentity: mocks.purgeCommands }))
vi.mock('../../../../src/shared/offline/deviceTrust', () => ({ clearStoredDevice: mocks.clearDevice }))
vi.mock('../../../../src/shared/offline/documentStorage', () => ({ purgeDocumentsForIdentity: mocks.purgeDocuments }))
vi.mock('../../../../src/shared/offline/leaseGate', () => ({ getStoredLease: mocks.getLease, clearStoredLease: mocks.clearLease }))
vi.mock('../../../../src/shared/offline/lifecycleStart', () => ({ purgeOfflineDraftsForScope: mocks.purgeDrafts }))
vi.mock('../../../../src/shared/offline/packageStorage', () => ({ purgePackageStorageForIdentity: mocks.purgePackages }))

import { purgeOfflineIdentity } from '../../../../src/shared/offline/identityPurge'

describe('offline identity purge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getLease.mockResolvedValue(null)
  })

  it('awaits all identity-scoped stores and clears the matching lease', async () => {
    mocks.getLease.mockResolvedValue({ lease: { tenantId: 'tenant-1', userId: 'user-1' } })

    await purgeOfflineIdentity('tenant-1', 'user-1')

    expect(mocks.purgeDrafts).toHaveBeenCalledWith('tenant-1', 'user-1')
    expect(mocks.purgePackages).toHaveBeenCalledWith('tenant-1', 'user-1')
    expect(mocks.purgeCommands).toHaveBeenCalledWith('tenant-1', 'user-1')
    expect(mocks.purgeEvidence).toHaveBeenCalledWith('tenant-1', 'user-1')
    expect(mocks.purgeDocuments).toHaveBeenCalledWith('tenant-1', 'user-1')
    expect(mocks.clearDevice).toHaveBeenCalledWith('tenant-1:user-1')
    expect(mocks.purgeQueue).toHaveBeenCalledWith('tenant-1', 'user-1')
    expect(mocks.clearLease).toHaveBeenCalledTimes(1)
    expect(mocks.clearTrust).toHaveBeenCalledTimes(1)
  })

  it('retains lease data owned by another identity', async () => {
    mocks.getLease.mockResolvedValue({ lease: { tenantId: 'tenant-1', userId: 'other-user' } })

    await purgeOfflineIdentity('tenant-1', 'user-1')

    expect(mocks.clearLease).not.toHaveBeenCalled()
    expect(mocks.clearTrust).toHaveBeenCalledTimes(1)
  })

  it('fails closed without reporting a purge when the stored lease cannot be read', async () => {
    mocks.getLease.mockRejectedValueOnce(new Error('lease read failed'))

    await expect(purgeOfflineIdentity('tenant-1', 'user-1')).rejects.toThrow('lease read failed')

    expect(mocks.purgeDrafts).not.toHaveBeenCalled()
    expect(mocks.purgePackages).not.toHaveBeenCalled()
    expect(mocks.purgeCommands).not.toHaveBeenCalled()
    expect(mocks.purgeEvidence).not.toHaveBeenCalled()
    expect(mocks.purgeDocuments).not.toHaveBeenCalled()
    expect(mocks.clearDevice).not.toHaveBeenCalled()
    expect(mocks.purgeQueue).not.toHaveBeenCalled()
    expect(mocks.clearLease).not.toHaveBeenCalled()
    expect(mocks.clearTrust).not.toHaveBeenCalled()
  })

  it('waits for every deletion and still revokes local trust when persistence cleanup fails', async () => {
    let finishDocuments: (() => void) | undefined
    mocks.purgePackages.mockRejectedValueOnce(new Error('package purge failed'))
    mocks.purgeDocuments.mockReturnValueOnce(new Promise<void>((resolve) => { finishDocuments = resolve }))

    const result = purgeOfflineIdentity('tenant-1', 'user-1')
    let settled = false
    void result.finally(() => { settled = true }).catch(() => undefined)
    await Promise.resolve()

    expect(settled).toBe(false)
    finishDocuments?.()
    await expect(result).rejects.toThrow('package purge failed')
    expect(mocks.clearTrust).toHaveBeenCalledTimes(1)
  })
})
