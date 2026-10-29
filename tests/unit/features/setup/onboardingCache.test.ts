import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { __resetOnboardingStatusCache, useTenantOnboarding } from '../../../../src/features/setup/hooks/useTenantOnboarding'

vi.mock('../../../../src/shared/services/tenantOnboardingService', () => ({
  fetchTenantOnboardingStatus: vi.fn(),
  completeTenantOnboarding: vi.fn(),
}))

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: (selector: (state: { role: string }) => unknown) => selector({ role: 'admin' }),
}))

const COMPLETE_STATUS = {
  status: 'complete',
  version: 1,
  completedAt: new Date().toISOString(),
  checks: { company: true, installationTypes: true, deviceCategories: true, formCategories: true, maintenanceTemplate: true },
  missing: [],
}

describe('useTenantOnboarding caché entre navegaciones (S6)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    __resetOnboardingStatusCache()
    const { fetchTenantOnboardingStatus } = await import('../../../../src/shared/services/tenantOnboardingService')
    vi.mocked(fetchTenantOnboardingStatus).mockResolvedValue(COMPLETE_STATUS as never)
  })

  it('reutiliza el estado entre montajes sin re-consultar al servidor', async () => {
    const { fetchTenantOnboardingStatus } = await import('../../../../src/shared/services/tenantOnboardingService')

    const first = renderHook(() => useTenantOnboarding())
    await waitFor(() => expect(first.result.current.status?.status).toBe('complete'))
    expect(fetchTenantOnboardingStatus).toHaveBeenCalledTimes(1)
    first.unmount()

    const second = renderHook(() => useTenantOnboarding())
    await waitFor(() => expect(second.result.current.status?.status).toBe('complete'))
    expect(fetchTenantOnboardingStatus).toHaveBeenCalledTimes(1)
    second.unmount()
  })

  it('refresh() fuerza una nueva consulta (reintento explícito)', async () => {
    const { fetchTenantOnboardingStatus } = await import('../../../../src/shared/services/tenantOnboardingService')

    const { result } = renderHook(() => useTenantOnboarding())
    await waitFor(() => expect(result.current.status?.status).toBe('complete'))
    expect(fetchTenantOnboardingStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refresh()
    })
    expect(fetchTenantOnboardingStatus).toHaveBeenCalledTimes(2)
  })
})
