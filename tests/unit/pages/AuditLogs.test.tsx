import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuditLogs from '../../../src/pages/AuditLogs'
import { auditService } from '../../../src/features/audit/services/auditService'
import { useAuditStore } from '../../../src/store/auditStore'
import { useAuthStore } from '../../../src/store/authStore'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../../../src/features/audit/services/auditService', () => ({
  auditService: { getLogs: vi.fn() },
}))

describe('AuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    useAuthStore.setState({ userId: 'user-1' })
    useAuditStore.setState({ ownerId: 'user-1', logs: [], lastUpdated: null })
  })

  it('loads exactly once when the initial response changes the stored length', async () => {
    vi.mocked(auditService.getLogs).mockResolvedValue({
      logs: [{
        _id: 'log-1',
        timestamp: '2026-09-21T00:00:00.000Z',
        userId: 'user-1',
        userName: 'Admin',
        action: 'update',
        targetType: 'inventory',
        targetId: 'item-1',
        details: 'changed',
      }],
      total: 1,
    })

    render(<AuditLogs />)

    await waitFor(() => expect(useAuditStore.getState().logs).toHaveLength(1))
    expect(auditService.getLogs).toHaveBeenCalledTimes(1)
  })
})
