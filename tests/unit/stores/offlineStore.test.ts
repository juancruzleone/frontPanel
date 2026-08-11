import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'

const storageMock = vi.hoisted(() => ({
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(undefined),
  removeItem: vi.fn().mockResolvedValue(undefined),
}))
const authStoreMock = vi.hoisted(() => ({ userId: 'current-user' as string | null }))

vi.mock('../../../src/utils/indexedDBStorage', () => ({ indexedDBStorage: storageMock }))
vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: { getState: () => ({ userId: authStoreMock.userId }) },
}))

import { useOfflineStore } from '../../../src/store/offlineStore'

describe('offlineStore persistence', () => {
  beforeEach(() => {
    useOfflineStore.setState({ queue: [] })
    authStoreMock.userId = 'current-user'
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
        { id: 'unrelated-before', userId: 'current-user', type: 'DELETE_INSTALLATION', payload: { id: 'other' }, timestamp: 1 },
        { id: 'first-update', userId: 'current-user', type: 'UPDATE_INSTALLATION', payload: { id: 'inst-1', data: { company: 'Old 1' } }, timestamp: 2, retries: 2, lastError: 'Old error' },
        { id: 'unrelated-middle', userId: 'current-user', type: 'CREATE_WORK_ORDER', payload: { title: 'Keep position' }, timestamp: 3 },
        { id: 'duplicate-update', userId: 'current-user', type: 'UPDATE_INSTALLATION', payload: { id: 'inst-1', data: { company: 'Old 2' } }, timestamp: 4 },
        { id: 'other-owner', userId: 'other-user', type: 'UPDATE_INSTALLATION', payload: { id: 'inst-1', data: { company: 'Other' } }, timestamp: 5 },
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
})
