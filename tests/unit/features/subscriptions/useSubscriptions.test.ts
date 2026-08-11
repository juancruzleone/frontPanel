import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSubscriptions } from '../../../../src/features/subscriptions/hooks/useSubscriptions'
import { fetchInstallations } from '../../../../src/features/installations/services/installationServices'
import { useAuthStore } from '../../../../src/store/authStore'
import { useInstallationStore } from '../../../../src/store/installationStore'

vi.mock('../../../../src/features/installations/services/installationServices', () => ({
  fetchInstallations: vi.fn(),
}))

describe('useSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ isAuthenticated: true, userId: 'user-1' })
    useInstallationStore.setState({ installations: [], ownerId: 'user-1' })
    vi.mocked(fetchInstallations).mockResolvedValue({ data: [] })
  })

  it('normalizes configured frequency IDs to the values used by maintenance plans', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          frequencies: [
            { id: 'monthly' },
            { id: 'quarterly' },
            { id: 'semiannual' },
            { id: 'annual' },
          ],
        },
      }),
    } as Response)

    const { result } = renderHook(() => useSubscriptions())

    await waitFor(() => {
      expect(result.current.frequencyOptions.map((option) => option.value)).toEqual([
        'mensual',
        'trimestral',
        'semestral',
        'anual',
      ])
    })
  })
})
