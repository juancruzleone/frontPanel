import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getClients, getClientsPage } from '../../../../src/features/clients/services/clientServices'
import { getTechnicians, getTechniciansPage } from '../../../../src/features/auth/register/services/registerServices'
import { fetchSubscriptionPage } from '../../../../src/features/subscriptions/services/subscriptionServices'
import { fetchWithAuthRetry } from '../../../../src/shared/utils/apiHeaders'

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  fetchWithAuthRetry: vi.fn(),
  getAuthHeaders: () => ({ Accept: 'application/json' }),
  getHeadersWithContentType: vi.fn(),
  fetchWithCsrf: vi.fn(),
}))
const respond = (body: unknown, ok = true) => vi.mocked(fetchWithAuthRetry).mockResolvedValue({
  ok, json: async () => body,
} as Response)
const pagination = { page: 12, limit: 5, total: 61, totalPages: 13 }

beforeEach(() => vi.clearAllMocks())

describe('explicit server-page services', () => {
  it.each([
    ['clients', getClientsPage, '/clientes-usuarios'],
    ['personnel', getTechniciansPage, '/cuentas/tecnicos'],
  ] as const)('%s forwards query/signal and retains server records and metadata', async (_, load, endpoint) => {
    const body = { data: [{ _id: 'beyond-first-page', userName: 'Ana' }], pagination }
    respond(body)
    const signal = new AbortController().signal
    expect(await load({ page: 12, limit: 5, search: 'Ana & .' }, { signal })).toEqual(body)
    const [url, options] = vi.mocked(fetchWithAuthRetry).mock.calls[0]
    const request = new URL(String(url), 'http://localhost')
    expect(request.pathname).toBe(`/api${endpoint}`)
    expect(Object.fromEntries(request.searchParams)).toEqual({ page: '12', limit: '5', search: 'Ana & .' })
    expect(options).toMatchObject({ signal, headers: { Accept: 'application/json' } })
  })

  it('requests plans past record 50 with server filters and global counts', async () => {
    const body = { data: [{ _id: 'plan-56', company: 'Planta' }], pagination,
      statusCounts: { all: 61, active: 33, inactive: 14, pending: 14 } }
    respond(body)
    expect(await fetchSubscriptionPage({ page: 12, limit: 5, search: 'mensual', maintenanceStatus: 'active', maintenanceMonth: 'Enero' })).toEqual(body)
    const request = new URL(String(vi.mocked(fetchWithAuthRetry).mock.calls[0][0]), 'http://localhost')
    expect(request.pathname).toBe('/api/installations')
    expect(Object.fromEntries(request.searchParams)).toEqual({ maintenancePlan: 'true', page: '12', limit: '5', search: 'mensual', maintenanceStatus: 'active', maintenanceMonth: 'Enero' })
  })

  it.each([getClientsPage, getTechniciansPage, fetchSubscriptionPage])('rejects online API errors rather than returning empty success', async load => {
    respond({ error: { message: 'Unavailable' } }, false)
    await expect(load({ page: 1, limit: 10, search: '' })).rejects.toThrow()
  })

  it('preserves the no-argument client array and URL', async () => {
    const records = [{ _id: 'client', userName: 'Legacy' }]
    respond(records)
    expect(await getClients()).toEqual(records)
    expect(vi.mocked(fetchWithAuthRetry).mock.calls[0][0]).toBe('/api/clientes-usuarios')
  })

  it('preserves the no-argument technician array and URL', async () => {
    const records = [{ _id: 'tech', userName: 'Legacy' }]
    respond({ tecnicos: records })
    expect(await getTechnicians()).toEqual(records)
    expect(vi.mocked(fetchWithAuthRetry).mock.calls[0][0]).toBe('/api/cuentas/tecnicos')
  })
})
