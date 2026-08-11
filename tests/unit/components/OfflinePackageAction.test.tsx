/**
 * OfflinePackageAction: visibility by status, prepare flow, accessibility.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k }) }))

const mockState = vi.hoisted(() => ({
  trust: { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' } as Record<string, unknown>,
  auth: { isAuthenticated: true, tenantId: 't1', userId: 'u1' } as Record<string, unknown>,
}))

vi.mock('../../../src/store/offlineTrustStore', () => ({
  useOfflineTrustStore: Object.assign(
    (sel: (s: Record<string, unknown>) => unknown) => sel(mockState.trust),
    { getState: () => mockState.trust },
  ),
}))
vi.mock('../../../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (sel: (s: Record<string, unknown>) => unknown) => sel(mockState.auth),
    { getState: () => mockState.auth },
  ),
}))

const downloadPackageMock = vi.fn().mockResolvedValue({ status: 'success', packageId: 'pkg-1' })
vi.mock('../../../src/shared/offline/packageDownload', () => ({
  downloadPackage: (...args: unknown[]) => downloadPackageMock(...args),
}))
vi.mock('../../../src/shared/offline/packageStorage', () => ({
  listReadyPackages: vi.fn().mockResolvedValue([]),
}))

const { OfflinePackageAction } = await import('../../../src/features/workOrders/components/OfflinePackageAction')

describe('OfflinePackageAction', () => {
  beforeEach(() => {
    downloadPackageMock.mockClear()
    downloadPackageMock.mockResolvedValue({ status: 'success', packageId: 'pkg-1' })
    Object.assign(mockState.trust, { isOfflineReady: true, deviceId: 'dev-1', leaseStatus: 'valid' })
  })
  afterEach(() => { cleanup() })

  describe('visibility by order status', () => {
    it('visible for asignada', () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      expect(container.querySelector('button')).toBeTruthy()
    })

    it('visible for pendiente', () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="pendiente" />)
      expect(container.querySelector('button')).toBeTruthy()
    })

    it('visible for en_progreso', () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="en_progreso" />)
      expect(container.querySelector('button')).toBeTruthy()
    })

    it('hidden for completada (terminal)', () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="completada" />)
      expect(container.innerHTML).toBe('')
    })

    it('hidden for cancelada (terminal)', () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="cancelada" />)
      expect(container.innerHTML).toBe('')
    })

    it('hidden when trust not ready', () => {
      Object.assign(mockState.trust, { isOfflineReady: false })
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('prepare flow', () => {
    it('calls downloadPackage on click', async () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      fireEvent.click(container.querySelector('button')!)
      await waitFor(() => { expect(downloadPackageMock).toHaveBeenCalledWith('wo1') })
    })

    it('shows ready state after success', async () => {
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      fireEvent.click(container.querySelector('button')!)
      await waitFor(() => { expect(container.querySelector('[data-state="ready"]')).toBeTruthy() })
    })

    it('shows error on failure', async () => {
      downloadPackageMock.mockResolvedValueOnce({ status: 'verify_failed', error: 'Tampered' })
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="en_progreso" />)
      fireEvent.click(container.querySelector('button')!)
      await waitFor(() => { expect(container.querySelector('[data-state="error"]')).toBeTruthy() })
    })

    it('shows incomplete when forms missing', async () => {
      downloadPackageMock.mockResolvedValueOnce({ status: 'not_ready', missingForms: ['tpl-1'] })
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      fireEvent.click(container.querySelector('button')!)
      await waitFor(() => { expect(container.querySelector('[data-state="incomplete"]')).toBeTruthy() })
    })

    it('button disabled while downloading', async () => {
      let resolve!: (v: unknown) => void
      downloadPackageMock.mockReturnValueOnce(new Promise(r => { resolve = r }))
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      fireEvent.click(container.querySelector('button')!)
      await waitFor(() => { expect(container.querySelector('button')?.disabled).toBe(true) })
      resolve({ status: 'success' })
    })
  })

  describe('accessibility', () => {
    it('has aria-label and aria-busy', async () => {
      let resolve!: (v: unknown) => void
      downloadPackageMock.mockReturnValueOnce(new Promise(r => { resolve = r }))
      const { container } = render(<OfflinePackageAction orderId="wo1" orderStatus="asignada" />)
      const btn = container.querySelector('button')!
      expect(btn.getAttribute('aria-label')).toBeTruthy()
      fireEvent.click(btn)
      await waitFor(() => { expect(btn.getAttribute('aria-busy')).toBe('true') })
      resolve({ status: 'success' })
    })

    it('does not expose orderId in rendered output', () => {
      const { container } = render(<OfflinePackageAction orderId="secret-id" orderStatus="asignada" />)
      expect(container.innerHTML).not.toContain('secret-id')
    })
  })
})
