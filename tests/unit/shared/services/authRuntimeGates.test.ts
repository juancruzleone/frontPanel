import { beforeEach, describe, expect, it, vi } from 'vitest'
import { warmCacheService } from '../../../../src/shared/services/warmCacheService'
import { socketService } from '../../../../src/shared/services/socketService'
import { useAuthStore } from '../../../../src/store/authStore'
import * as assetServices from '../../../../src/features/assets/services/assetServices'

vi.mock('../../../../src/features/assets/services/assetServices', () => ({
  fetchAssets: vi.fn(),
  fetchTemplates: vi.fn(),
}))
vi.mock('../../../../src/features/inventory/services/inventoryServices', () => ({
  fetchInventoryItems: vi.fn(),
}))
vi.mock('../../../../src/features/forms/services/formServices', () => ({
  fetchFormCategories: vi.fn(),
}))
vi.mock('socket.io-client', () => ({ io: vi.fn() }))

describe('authenticated runtime gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('does not warm protected assets before auth is resolved', async () => {
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: false })

    await warmCacheService.warmAll()

    expect(assetServices.fetchAssets).not.toHaveBeenCalled()
    expect(assetServices.fetchTemplates).not.toHaveBeenCalled()
  })

  it('does not connect Socket.IO before auth is resolved', async () => {
    const { io } = await import('socket.io-client')
    useAuthStore.setState({ isAuthenticated: true, isAuthResolved: false })

    socketService.connect()

    expect(io).not.toHaveBeenCalled()
    socketService.disconnect()
  })
})
