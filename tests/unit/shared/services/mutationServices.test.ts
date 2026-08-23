import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchWithAuthRetry = vi.hoisted(() => vi.fn())

vi.mock('../../../../src/shared/utils/apiHeaders', () => ({
  fetchWithAuthRetry,
  getAuthHeaders: vi.fn(() => ({ 'X-Requested-With': 'XMLHttpRequest' })),
  getHeadersWithContentType: vi.fn(() => ({
    'Content-Type': 'application/json',
    'X-CSRF-Token': 'csrf-token',
    'X-Requested-With': 'XMLHttpRequest',
  })),
}))

vi.mock('../../../../src/store/authStore', () => ({
  useAuthStore: { getState: () => ({ isAuthenticated: true }) },
}))

import { startWorkOrder } from '../../../../src/features/calendar/services/calendarServices'
import { createTechnician } from '../../../../src/features/workOrders/services/technicianServices'
import { tenantServices } from '../../../../src/features/tenants/services/tenantServices'
import { assignInstallationsToClient } from '../../../../src/features/clients/services/clientServices'
import { deleteFormTemplate } from '../../../../src/features/forms/services/formServices'
import { createManual } from '../../../../src/features/manuals/services/manualServices'
import { updateSubscription } from '../../../../src/features/subscriptions/services/subscriptionServices'

describe('reported mutation services', () => {
  beforeEach(() => {
    fetchWithAuthRetry.mockReset()
    fetchWithAuthRetry.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true, data: {}, tenant: {} }),
    })
  })

  it('routes state-changing requests through the canonical auth/CSRF retry wrapper', async () => {
    await startWorkOrder('wo-1')
    await createTechnician({ userName: 'tech', role: 'tecnico' })
    await tenantServices.createTenant({ name: 'Tenant' } as never)
    await assignInstallationsToClient('client-1', ['installation-1'])
    await deleteFormTemplate('template-1')
    await createManual({ titulo: 'Manual' })
    await updateSubscription('installation-1', { estado: 'activa' })

    expect(fetchWithAuthRetry).toHaveBeenCalledTimes(7)
    for (const [, options] of fetchWithAuthRetry.mock.calls) {
      expect(options.method).toMatch(/POST|PUT|PATCH|DELETE/)
    }
  })

  it('preserves JSON bodies for retry-safe request reconstruction', async () => {
    await assignInstallationsToClient('client-1', ['installation-1'])

    expect(fetchWithAuthRetry).toHaveBeenCalledWith(
      expect.stringContaining('clientes-usuarios/client-1/instalaciones'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ instalaciones: ['installation-1'] }),
      }),
    )
  })

  it('preserves multipart bodies without forcing a JSON content type', async () => {
    await createManual({ titulo: 'Manual' })

    const options = fetchWithAuthRetry.mock.calls[0][1] as RequestInit
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.headers).not.toHaveProperty('Content-Type')
  })
})
