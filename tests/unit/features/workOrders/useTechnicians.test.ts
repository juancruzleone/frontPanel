import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useTechnicians from '../../../../src/features/workOrders/hooks/useTechnicians'
import { fetchTechnicians } from '../../../../src/features/workOrders/services/technicianServices'
import { useAuthStore } from '../../../../src/store/authStore'
import { useTechnicianStore } from '../../../../src/store/technicianStore'

vi.mock('../../../../src/features/workOrders/services/technicianServices', () => ({
  fetchTechnicians: vi.fn(),
}))

describe('useTechnicians', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    useAuthStore.setState({ userId: 'user-1' })
    useTechnicianStore.setState({ ownerId: 'user-1', technicians: [], lastUpdated: null })
  })

  it('loads exactly once when the initial response changes the stored length', async () => {
    vi.mocked(fetchTechnicians).mockResolvedValue([{ _id: 'tech-1', userName: 'Tech', role: 'tecnico' }])

    renderHook(() => useTechnicians())

    await waitFor(() => expect(useTechnicianStore.getState().technicians).toHaveLength(1))
    expect(fetchTechnicians).toHaveBeenCalledTimes(1)
  })
})
