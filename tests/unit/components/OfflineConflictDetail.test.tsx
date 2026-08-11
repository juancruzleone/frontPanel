/**
 * OfflineConflictDetail: redaction, non-destructive conflicts, retry, accessibility.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _k }) }))

const { OfflineConflictDetail } = await import('../../../src/shared/components/OfflineConflictDetail')

const baseItem = {
  commandId: 'cmd-1', commandType: 'start' as const, status: 'conflict' as const,
  failureCode: 'DEPENDENCY_NOT_MET', failureReason: 'Parent pending',
  retryCount: 2, createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:05:00Z',
}

describe('OfflineConflictDetail', () => {
  afterEach(() => { cleanup() })

  it('renders nothing when item is null', () => {
    const { container } = render(<OfflineConflictDetail item={null} onClose={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows command type and status', () => {
    const { container } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
    expect(container.innerHTML).toContain('start')
    expect(container.innerHTML).toContain('conflict')
  })

  it('shows error category label', () => {
    const { getByText } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
    expect(getByText(/DEP_NOT_MET|DEPENDENCY_NOT_MET/i)).toBeTruthy()
  })

  it('shows retry count', () => {
    const { container } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
    // Retry count "2" appears in the retries field
    expect(container.innerHTML).toContain('2')
  })

  it('shows timestamp', () => {
    const { container } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
    expect(container.innerHTML).toContain('2025')
  })

  describe('redaction — never exposes sensitive fields', () => {
    const sensitiveItem = {
      ...baseItem,
      commandId: 'secret-cmd-id',
      failureReason: 'Contains tenantId=t1 and deviceId=dev-1',
    }

    it('does not expose commandId in rendered text', () => {
      const { container } = render(<OfflineConflictDetail item={sensitiveItem} onClose={() => {}} />)
      // commandId is not rendered (only commandType, status, failureCode)
      expect(container.innerHTML).not.toContain('secret-cmd-id')
    })

    it('does not expose failureReason (may contain IDs)', () => {
      const { container } = render(<OfflineConflictDetail item={sensitiveItem} onClose={() => {}} />)
      expect(container.innerHTML).not.toContain('tenantId=t1')
      expect(container.innerHTML).not.toContain('deviceId=dev-1')
    })
  })

  describe('non-destructive conflict handling', () => {
    it('shows admin review guidance for INSUFFICIENT_STOCK', () => {
      const item = { ...baseItem, failureCode: 'INSUFFICIENT_STOCK', status: 'conflict' as const }
      const { getByText } = render(<OfflineConflictDetail item={item} onClose={() => {}} />)
      expect(getByText(/administrator review|no descarte/i)).toBeTruthy()
    })

    it('shows admin review guidance for REASSIGNED', () => {
      const item = { ...baseItem, failureCode: 'REASSIGNED', status: 'conflict' as const }
      const { getByText } = render(<OfflineConflictDetail item={item} onClose={() => {}} />)
      expect(getByText(/administrator review|no descarte/i)).toBeTruthy()
    })

    it('shows admin review guidance for STALE_FORM', () => {
      const item = { ...baseItem, failureCode: 'STALE_FORM', status: 'conflict' as const }
      const { getByText } = render(<OfflineConflictDetail item={item} onClose={() => {}} />)
      expect(getByText(/administrator review|no descarte/i)).toBeTruthy()
    })

    it('no discard button for any conflict', () => {
      const { queryByText } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
      expect(queryByText(/discard|eliminar|descartar/i)).toBeNull()
    })
  })

  describe('retry', () => {
    it('shows retry button for retryable status', () => {
      const { getByText } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} onRetry={() => {}} />)
      expect(getByText(/retry|reintentar/i)).toBeTruthy()
    })

    it('no retry button for dead-letter status', () => {
      const item = { ...baseItem, status: 'dead-letter' as const }
      const { queryByText } = render(<OfflineConflictDetail item={item} onClose={() => {}} onRetry={() => {}} />)
      expect(queryByText(/retry|reintentar/i)).toBeNull()
    })

    it('calls onRetry with commandId', () => {
      const onRetry = vi.fn()
      const { getByLabelText } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} onRetry={onRetry} />)
      fireEvent.click(getByLabelText(/retry|reintentar/i))
      expect(onRetry).toHaveBeenCalledWith('cmd-1')
    })
  })

  describe('accessibility', () => {
    it('has dialog role and aria-modal', () => {
      const { getByRole } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
      const dialog = getByRole('dialog')
      expect(dialog.getAttribute('aria-modal')).toBe('true')
    })

    it('close button has aria-label', () => {
      const { getByLabelText } = render(<OfflineConflictDetail item={baseItem} onClose={() => {}} />)
      expect(getByLabelText(/close|cerrar/i)).toBeTruthy()
    })

    it('escape key closes dialog', () => {
      const onClose = vi.fn()
      render(<OfflineConflictDetail item={baseItem} onClose={onClose} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalled()
    })

    it('click backdrop closes dialog', () => {
      const onClose = vi.fn()
      const { getByRole } = render(<OfflineConflictDetail item={baseItem} onClose={onClose} />)
      const dialog = getByRole('dialog')
      fireEvent.click(dialog) // click backdrop (target = dialog itself)
      expect(onClose).toHaveBeenCalled()
    })
  })
})
