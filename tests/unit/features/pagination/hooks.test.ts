import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClients } from '../../../../src/features/clients/hooks/useClients'
import { useRegister } from '../../../../src/features/auth/register/hooks/useRegister'
import { useSubscriptions } from '../../../../src/features/subscriptions/hooks/useSubscriptions'
import { getClientsPage, createClient } from '../../../../src/features/clients/services/clientServices'
import { getTechniciansPage, userRegister } from '../../../../src/features/auth/register/services/registerServices'
import { fetchSubscriptionPage, updateSubscription } from '../../../../src/features/subscriptions/services/subscriptionServices'
import { useAuthStore } from '../../../../src/store/authStore'
import { useInstallationStore } from '../../../../src/store/installationStore'

vi.mock('../../../../src/features/clients/services/clientServices', () => ({ getClientsPage: vi.fn(), getClients: vi.fn(), createClient: vi.fn() }))
vi.mock('../../../../src/features/auth/register/services/registerServices', () => ({ getTechniciansPage: vi.fn(), getTechnicians: vi.fn(), userRegister: vi.fn() }))
vi.mock('../../../../src/features/subscriptions/services/subscriptionServices', () => ({ fetchSubscriptionPage: vi.fn(), updateSubscription: vi.fn(), triggerAutomaticWorkOrdersGeneration: vi.fn() }))
vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  fetchWithAuthRetry: vi.fn(async () => ({ ok: true, json: async () => ({ data: { frequencies: [{ id: 'monthly' }] } }) })),
  getAuthHeaders: () => ({}),
}))

const account = { _id: 'server-only', userName: 'Server result', name: 'Server', role: 'cliente', createdAt: '2026-01-01' }
const installation = { _id: 'plan-56', company: 'Server result', address: 'Calle', installationType: 'industrial', frecuencia: 'Mensual', mesesFrecuencia: ['Enero'], estado: 'active' as const }
const counts = { all: 61, active: 33, inactive: 14, pending: 14 }
const accountPage = (page = 1, total = 61, empty = false) => ({ data: empty ? [] : [account], pagination: { page, limit: 10, total, totalPages: Math.ceil(total / 10) } })
const planPage = (page = 1, total = 61, empty = false) => ({ data: empty ? [] : [installation], pagination: { page, limit: 5, total, totalPages: Math.ceil(total / 5) }, statusCounts: counts })
const cases = [
  { name: 'clients', load: vi.mocked(getClientsPage), response: accountPage, limit: 10, useList: () => {
    const hook = useClients()
    return { ...hook, records: hook.clients, loading: hook.loadingClients, refresh: hook.fetchClients }
  } },
  { name: 'personnel', load: vi.mocked(getTechniciansPage), response: accountPage, limit: 10, useList: () => {
    const hook = useRegister()
    return { ...hook, records: hook.technicians, loading: hook.loadingTechnicians, refresh: hook.fetchTechnicians }
  } },
  { name: 'plans', load: vi.mocked(fetchSubscriptionPage), response: planPage, limit: 5, useList: () => {
    const hook = useSubscriptions()
    return { ...hook, records: hook.subscriptions, refresh: hook.refreshSubscriptions }
  } },
]

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ isAuthenticated: true, userId: 'user-1', tenantId: 'tenant-1' })
  useInstallationStore.getState().setOwnerId('tenant-1:user-1')
  useInstallationStore.getState().setInstallations([{ ...installation, _id: 'cached-only' }])
  vi.mocked(getClientsPage).mockResolvedValue(accountPage())
  vi.mocked(getTechniciansPage).mockResolvedValue(accountPage())
  vi.mocked(fetchSubscriptionPage).mockResolvedValue(planPage())
})
afterEach(cleanup)

for (const scenario of cases) {
  describe(scenario.name, () => {
    it('loads server records and metadata, navigates remotely and resets search to page one', async () => {
      const { result } = renderHook(scenario.useList)
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.records).toHaveLength(1)
      expect(result.current.pagination).toEqual(scenario.response().pagination)
      expect(scenario.load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: scenario.limit, search: '' }), expect.objectContaining({ signal: expect.any(AbortSignal) }))
      scenario.load.mockResolvedValueOnce(scenario.response(2))
      act(() => result.current.setPage(2))
      await waitFor(() => expect(result.current.pagination.page).toBe(2))
      act(() => result.current.setSearch('not in visible record'))
      await waitFor(() => expect(scenario.load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'not in visible record' }), expect.anything()))
      await waitFor(() => expect(result.current.loading).toBe(false))
      // The hook does not second-guess server search or slice a server page.
      expect(result.current.records).toHaveLength(1)
      expect(result.current.error).toBeNull()
    })

    it('refreshes the current page and recovers after deletion empties the last page', async () => {
      const { result } = renderHook(scenario.useList)
      await waitFor(() => expect(result.current.loading).toBe(false))
      scenario.load.mockResolvedValueOnce(scenario.response(2))
      act(() => result.current.setPage(2))
      await waitFor(() => expect(result.current.pagination.page).toBe(2))
      scenario.load.mockResolvedValueOnce(scenario.response(2, scenario.limit, true))
      scenario.load.mockResolvedValueOnce(scenario.response(1, scenario.limit))
      await act(async () => { await result.current.refresh() })
      await waitFor(() => expect(result.current.pagination.page).toBe(1))
      expect(result.current.records).toHaveLength(1)
      expect(scenario.load.mock.calls.slice(-2).map(call => call[0].page)).toEqual([2, 1])
    })

    it('clears rows and reports online errors without reading or replacing the installation cache', async () => {
      const cached = useInstallationStore.getState().installations
      const updated = useInstallationStore.getState().lastUpdated
      const { result } = renderHook(scenario.useList)
      await waitFor(() => expect(result.current.loading).toBe(false))
      scenario.load.mockRejectedValueOnce(new Error('Online unavailable'))
      await act(async () => { await result.current.refresh() })
      expect(result.current.records).toEqual([])
      expect(result.current.error).toBe('Online unavailable')
      expect(result.current.pagination.total).toBe(0)
      expect(useInstallationStore.getState().installations).toBe(cached)
      expect(useInstallationStore.getState().lastUpdated).toBe(updated)
      expect(useInstallationStore.getState().ownerId).toBe('tenant-1:user-1')
    })

    it('ignores late success and late errors even when a transport ignores abort', async () => {
      const { result } = renderHook(scenario.useList)
      await waitFor(() => expect(result.current.loading).toBe(false))
      let resolveOld!: (value: ReturnType<typeof scenario.response>) => void
      scenario.load.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      act(() => result.current.setPage(2))
      await waitFor(() => expect(scenario.load).toHaveBeenCalledTimes(2))
      const oldSignal = scenario.load.mock.calls[1][1]?.signal
      act(() => result.current.setSearch('new'))
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(oldSignal?.aborted).toBe(true)
      await act(async () => resolveOld(scenario.response(2, 100)))
      expect(result.current.pagination).toEqual(scenario.response().pagination)
      let rejectOld!: (reason: Error) => void
      scenario.load.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject }))
      act(() => result.current.setPage(2))
      await waitFor(() => expect(result.current.loading).toBe(true))
      act(() => result.current.setSearch('newer'))
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => rejectOld(new Error('stale failure')))
      expect(result.current.error).toBeNull()
      expect(result.current.records).toHaveLength(1)
    })
  })
}

it('loads plan pages beyond 50, preserves global counts and resets both plan filters', async () => {
  const { result } = renderHook(() => useSubscriptions())
  await waitFor(() => expect(result.current.loading).toBe(false))
  vi.mocked(fetchSubscriptionPage).mockResolvedValueOnce(planPage(12))
  act(() => result.current.setPage(12))
  await waitFor(() => expect(result.current.pagination.page).toBe(12))
  expect(result.current.subscriptions[0]).toMatchObject({ _id: 'plan-56', installationName: 'Server result', frequency: 'mensual', months: ['Enero'], status: 'active' })
  expect(result.current.statusCounts).toEqual(counts)
  act(() => result.current.setStatus('inactive'))
  await waitFor(() => expect(fetchSubscriptionPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, maintenanceStatus: 'inactive' }), expect.anything()))
  vi.mocked(fetchSubscriptionPage).mockResolvedValueOnce(planPage(2))
  act(() => result.current.setPage(2))
  await waitFor(() => expect(result.current.pagination.page).toBe(2))
  vi.mocked(fetchSubscriptionPage).mockResolvedValueOnce(planPage(1, 0, true))
  act(() => result.current.setMonth('Enero'))
  await waitFor(() => expect(result.current.subscriptions).toEqual([]))
  expect(fetchSubscriptionPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, maintenanceStatus: 'inactive', maintenanceMonth: 'Enero' }), expect.anything())
  expect(result.current.statusCounts).toEqual(counts)
})

it('preserves client creation and refreshes the selected page', async () => {
  vi.mocked(createClient).mockResolvedValue({})
  const { result } = renderHook(() => useClients())
  await waitFor(() => expect(result.current.loadingClients).toBe(false))
  vi.mocked(getClientsPage).mockResolvedValue(accountPage(2))
  act(() => result.current.setPage(2))
  await waitFor(() => expect(result.current.pagination.page).toBe(2))
  await act(async () => { await result.current.addClient('ana', 'password', 'Ana') })
  expect(createClient).toHaveBeenCalledWith('ana', 'password', 'Ana')
  expect(getClientsPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.anything())
  expect(result.current.showModal).toBe(true)
  expect(result.current.isError).toBe(false)
})

it('preserves technician registration fields and photo', async () => {
  vi.mocked(userRegister).mockResolvedValue({ message: 'Created' })
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' })
  const { result } = renderHook(() => useRegister())
  await waitFor(() => expect(result.current.loadingTechnicians).toBe(false))
  await act(async () => { await result.current.addTechnician('ana', 'password', 'Ana', 'a@example.test', '123', photo) })
  expect(userRegister).toHaveBeenCalledWith('ana', 'password', 'Ana', 'a@example.test', '123', photo)
  expect(result.current.responseMessage).toBe('Created')
  expect(result.current.isError).toBe(false)
})

it('preserves plan updates and frequency configuration while refreshing the current page', async () => {
  const { result } = renderHook(() => useSubscriptions())
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.frequencyOptions[0].value).toBe('mensual')
  vi.mocked(fetchSubscriptionPage).mockResolvedValue(planPage(12))
  act(() => result.current.setPage(12))
  await waitFor(() => expect(result.current.pagination.page).toBe(12))
  await act(async () => { await result.current.updateSubscription('plan-56', { frequency: 'quarterly', months: ['Enero'], status: 'inactive' }) })
  expect(updateSubscription).toHaveBeenCalledWith('plan-56', expect.objectContaining({ frecuencia: 'Trimestral', mesesFrecuencia: ['Enero'], estado: 'Inactivo' }))
  expect(fetchSubscriptionPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 12, limit: 5 }), expect.anything())
})
