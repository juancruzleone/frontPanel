import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'

const storageMock = vi.hoisted(() => ({
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(undefined),
  removeItem: vi.fn().mockResolvedValue(undefined),
}))
const authStoreMock = vi.hoisted(() => ({ tenantId: 'tenant-1' as string | null, userId: 'current-user' as string | null }))
const binaryStorageMock = vi.hoisted(() => ({ removeBinary: vi.fn().mockResolvedValue(undefined) }))

vi.mock('../../../src/utils/indexedDBStorage', () => ({ indexedDBStorage: storageMock }))
vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: { getState: () => ({ tenantId: authStoreMock.tenantId, userId: authStoreMock.userId }) },
}))
vi.mock('../../../src/shared/services/offlineBinaryStorage', () => ({ offlineBinaryStorage: binaryStorageMock }))

import { purgeOfflineQueueForIdentity, useOfflineStore } from '../../../src/store/offlineStore'

describe('offlineStore persistence', () => {
  beforeEach(() => {
    useOfflineStore.setState({ queue: [] })
    authStoreMock.userId = 'current-user'
    authStoreMock.tenantId = 'tenant-1'
    storageMock.getItem.mockResolvedValue(null)
    vi.clearAllMocks()
  })

  it('persists the first owner-scoped installation update in offline-storage', async () => {
    useOfflineStore.getState().addToQueue({
      type: 'UPDATE_INSTALLATION',
      payload: {
        id: 'inst-1',
        data: {
          company: 'Central Plant',
          address: 'Main Street 123',
          installationType: 'Industrial',
        },
      },
    }, 'current-user')

    await waitFor(() => expect(storageMock.setItem).toHaveBeenCalled())

    const [storageKey, serializedState] = storageMock.setItem.mock.calls.at(-1) ?? []
    expect(storageKey).toBe('offline-storage')
    expect(JSON.parse(String(serializedState))).toMatchObject({
      state: {
        queue: [{
          tenantId: 'tenant-1',
          userId: 'current-user',
          type: 'UPDATE_INSTALLATION',
          payload: { id: 'inst-1' },
        }],
      },
    })
  })

  it('compacts existing installation duplicates at the earliest persisted position without reordering other work', async () => {
    useOfflineStore.setState({
      queue: [
        { id: 'unrelated-before', tenantId: 'tenant-1', userId: 'current-user', type: 'DELETE_INSTALLATION', payload: { id: 'other' }, timestamp: 1 },
        { id: 'first-update', tenantId: 'tenant-1', userId: 'current-user', type: 'UPDATE_INSTALLATION', payload: { id: 'inst-1', data: { company: 'Old 1' } }, timestamp: 2, retries: 2, lastError: 'Old error' },
        { id: 'unrelated-middle', tenantId: 'tenant-1', userId: 'current-user', type: 'CREATE_WORK_ORDER', payload: { title: 'Keep position' }, timestamp: 3 },
        { id: 'duplicate-update', tenantId: 'tenant-1', userId: 'current-user', type: 'UPDATE_INSTALLATION', payload: { id: 'inst-1', data: { company: 'Old 2' } }, timestamp: 4 },
        { id: 'other-owner', tenantId: 'tenant-1', userId: 'other-user', type: 'UPDATE_INSTALLATION', payload: { id: 'inst-1', data: { company: 'Other' } }, timestamp: 5 },
      ],
    })
    vi.clearAllMocks()

    const queued = useOfflineStore.getState().queueInstallationUpdate('current-user', 'inst-1', {
      company: 'Latest',
      address: 'Main Street 123',
      installationType: 'Industrial',
    })

    expect(queued).toBe(true)
    expect(useOfflineStore.getState().queue.map((item) => item.id)).toEqual([
      'unrelated-before',
      'first-update',
      'unrelated-middle',
      'other-owner',
    ])
    expect(useOfflineStore.getState().queue[1]).toMatchObject({
      id: 'first-update',
      retries: 0,
      payload: { id: 'inst-1', data: { company: 'Latest' } },
    })
    expect(useOfflineStore.getState().queue[1]).not.toHaveProperty('lastError')

    await waitFor(() => expect(storageMock.setItem).toHaveBeenCalled())
    const serializedState = storageMock.setItem.mock.calls.at(-1)?.[1]
    const persistedQueue = JSON.parse(String(serializedState)).state.queue
    expect(persistedQueue.map((item: { id: string }) => item.id)).toEqual([
      'unrelated-before',
      'first-update',
      'unrelated-middle',
      'other-owner',
    ])
  })

  it('rejects an explicit owner after authenticated identity drift', () => {
    authStoreMock.userId = 'other-user'

    const queued = useOfflineStore.getState().addToQueue({
      type: 'DELETE_INSTALLATION',
      payload: { id: 'inst-1' },
    }, 'current-user')

    expect(queued).toBe(false)
    expect(useOfflineStore.getState().queue).toHaveLength(0)
  })

  it('removes only the exact tenant and user when queue IDs collide', () => {
    const active = { id: 'shared-id', tenantId: 'tenant-1', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: { title: 'Active' }, timestamp: 1 }
    const otherTenant = { id: 'shared-id', tenantId: 'tenant-2', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: { title: 'Other tenant' }, timestamp: 2 }
    const legacy = { id: 'shared-id', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: { title: 'Legacy' }, timestamp: 3 }
    useOfflineStore.setState({ queue: [active, otherTenant, legacy] })

    useOfflineStore.getState().removeFromQueue('shared-id', 'tenant-1', 'current-user')

    expect(useOfflineStore.getState().queue).toEqual([otherTenant, legacy])
  })

  it('updates only the exact tenant and user when queue IDs collide', () => {
    const active = { id: 'shared-id', tenantId: 'tenant-1', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: { title: 'Active' }, timestamp: 1 }
    const otherTenant = { id: 'shared-id', tenantId: 'tenant-2', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: { title: 'Other tenant' }, timestamp: 2 }
    const legacy = { id: 'shared-id', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: { title: 'Legacy' }, timestamp: 3 }
    useOfflineStore.setState({ queue: [active, otherTenant, legacy] })

    useOfflineStore.getState().updateRequest('shared-id', 'tenant-1', 'current-user', {
      retries: 1,
      lastError: 'Retry active tenant',
    })

    expect(useOfflineStore.getState().queue).toEqual([
      { ...active, retries: 1, lastError: 'Retry active tenant' },
      otherTenant,
      legacy,
    ])
  })

  it('does not expose an unscoped destructive queue mutation', () => {
    expect(useOfflineStore.getState()).not.toHaveProperty('clearQueue')
  })

  it('purges only the exact tenant and user while conservatively retaining same-user and legacy records', async () => {
    const departing = { id: 'departing', tenantId: 'tenant-1', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: {}, timestamp: 1, binaryRefs: [{ id: 'binary-1', field: 'photo', filename: 'one.jpg', contentType: 'image/jpeg', size: 1 }] }
    const otherTenant = { id: 'other-tenant', tenantId: 'tenant-2', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: {}, timestamp: 2, binaryRefs: [{ id: 'binary-2', field: 'photo', filename: 'two.jpg', contentType: 'image/jpeg', size: 1 }] }
    const legacy = { id: 'legacy', userId: 'current-user', type: 'CREATE_WORK_ORDER' as const, payload: {}, timestamp: 3, binaryRefs: [{ id: 'binary-legacy', field: 'photo', filename: 'legacy.jpg', contentType: 'image/jpeg', size: 1 }] }
    storageMock.getItem.mockResolvedValue(JSON.stringify({ state: { queue: [departing, otherTenant, legacy] }, version: 0 }))

    await purgeOfflineQueueForIdentity('tenant-1', 'current-user')

    expect(binaryStorageMock.removeBinary).toHaveBeenCalledWith('binary-1')
    expect(binaryStorageMock.removeBinary).not.toHaveBeenCalledWith('binary-2')
    expect(binaryStorageMock.removeBinary).not.toHaveBeenCalledWith('binary-legacy')
    expect(useOfflineStore.getState().queue).toEqual([otherTenant, legacy])
    const persisted = JSON.parse(String(storageMock.setItem.mock.calls.at(-1)?.[1]))
    expect(persisted.state.queue).toEqual([otherTenant, legacy])
  })
})
