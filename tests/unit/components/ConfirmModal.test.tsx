import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmModal from '../../../src/shared/components/ConfirmModal'

// Mock de react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.deleting': 'Loading...',
        'common.loading': 'Loading...',
        'common.ok': 'OK',
      }
      return translations[key] || key
    }
  })
}))

describe('ConfirmModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onRequestClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  }

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<ConfirmModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
    })

    it('should render default buttons', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should render custom button texts', () => {
      render(
        <ConfirmModal 
          {...defaultProps} 
          confirmText="Yes, proceed"
          cancelText="No, go back"
        />
      )
      
      expect(screen.getByText('Yes, proceed')).toBeInTheDocument()
      expect(screen.getByText('No, go back')).toBeInTheDocument()
    })

    it('should render warning icon', () => {
      const { container } = render(<ConfirmModal {...defaultProps} />)
      
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('User Interaction', () => {
    it('should call onRequestClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onRequestClose = vi.fn()
      
      render(<ConfirmModal {...defaultProps} onRequestClose={onRequestClose} />)
      
      await user.click(screen.getByText('Cancel'))
      
      expect(onRequestClose).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />)
      
      await user.click(screen.getByText('Delete'))
      
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should not call handlers when buttons are disabled', async () => {
      const user = userEvent.setup()
      const onRequestClose = vi.fn()
      const onConfirm = vi.fn()
      
      render(
        <ConfirmModal 
          {...defaultProps} 
          onRequestClose={onRequestClose}
          onConfirm={onConfirm}
          isLoading={true}
        />
      )
      
      const cancelButton = screen.getByText('Cancel')
      const confirmButton = screen.getByText('Loading...')
      
      expect(cancelButton).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      render(<ConfirmModal {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should disable buttons when isLoading is true', () => {
      render(<ConfirmModal {...defaultProps} isLoading={true} />)
      
      const cancelButton = screen.getByText('Cancel')
      const confirmButton = screen.getByText('Loading...')
      
      expect(cancelButton).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })

    it('should enable buttons when isLoading is false', () => {
      render(<ConfirmModal {...defaultProps} isLoading={false} />)
      
      const cancelButton = screen.getByText('Cancel')
      const confirmButton = screen.getByText('Delete')
      
      expect(cancelButton).not.toBeDisabled()
      expect(confirmButton).not.toBeDisabled()
    })
  })

  describe('Variants', () => {
    it('should accept danger variant', () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />)
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })

    it('should accept warning variant', () => {
      render(<ConfirmModal {...defaultProps} variant="warning" />)
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })

    it('should accept info variant', () => {
      render(<ConfirmModal {...defaultProps} variant="info" />)
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })

    it('should default to danger variant', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />)
      
      const confirmButton = screen.getByText('Delete')
      confirmButton.focus()
      
      await user.keyboard('{Enter}')
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  describe('Backdrop', () => {
    it('should render backdrop', () => {
      const { container } = render(<ConfirmModal {...defaultProps} />)
      
      // CSS modules hash class names, so we search by class pattern
      const backdrop = container.querySelector('[class*="backdrop"]')
      expect(backdrop).toBeTruthy()
      expect(backdrop).toBeInTheDocument()
    })
  })
})
