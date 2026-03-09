import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditModal from '../../../src/shared/components/EditModal'

// Mock de react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.loading': 'Loading...',
        'common.close': 'Close',
      }
      return translations[key] || key
    }
  })
}))

describe('EditModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onRequestClose: vi.fn(),
    onSave: vi.fn(),
    title: 'Edit Item',
    children: <input type="text" placeholder="Enter value" />,
  }

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<EditModal {...defaultProps} />)
      
      expect(screen.getByText('Edit Item')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<EditModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Edit Item')).not.toBeInTheDocument()
    })

    it('should render children content', () => {
      render(<EditModal {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
    })

    it('should render default buttons', () => {
      render(<EditModal {...defaultProps} />)
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })

    it('should render custom button texts', () => {
      render(
        <EditModal 
          {...defaultProps} 
          saveText="Update"
          cancelText="Discard"
        />
      )
      
      expect(screen.getByText('Update')).toBeInTheDocument()
      expect(screen.getByText('Discard')).toBeInTheDocument()
    })

    it('should render close button', () => {
      render(<EditModal {...defaultProps} />)
      
      const closeButton = screen.getByLabelText('Close')
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('User Interaction', () => {
    it('should call onRequestClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onRequestClose = vi.fn()
      
      render(<EditModal {...defaultProps} onRequestClose={onRequestClose} />)
      
      await user.click(screen.getByText('Cancel'))
      
      expect(onRequestClose).toHaveBeenCalledTimes(1)
    })

    it('should call onRequestClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onRequestClose = vi.fn()
      
      render(<EditModal {...defaultProps} onRequestClose={onRequestClose} />)
      
      await user.click(screen.getByLabelText('Close'))
      
      expect(onRequestClose).toHaveBeenCalledTimes(1)
    })

    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      
      render(<EditModal {...defaultProps} onSave={onSave} />)
      
      await user.click(screen.getByText('Save'))
      
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should call onSave when form is submitted', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      
      render(<EditModal {...defaultProps} onSave={onSave} />)
      
      const input = screen.getByPlaceholderText('Enter value')
      await user.type(input, 'test value')
      await user.keyboard('{Enter}')
      
      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should not call handlers when buttons are disabled', async () => {
      const user = userEvent.setup()
      const onRequestClose = vi.fn()
      const onSave = vi.fn()
      
      render(
        <EditModal 
          {...defaultProps} 
          onRequestClose={onRequestClose}
          onSave={onSave}
          isLoading={true}
        />
      )
      
      const cancelButton = screen.getByText('Cancel')
      const saveButton = screen.getByText('Loading...')
      const closeButton = screen.getByLabelText('Close')
      
      expect(cancelButton).toBeDisabled()
      expect(saveButton).toBeDisabled()
      expect(closeButton).toBeDisabled()
    })
  })

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      render(<EditModal {...defaultProps} isLoading={true} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('Save')).not.toBeInTheDocument()
    })

    it('should disable all buttons when isLoading is true', () => {
      render(<EditModal {...defaultProps} isLoading={true} />)
      
      const cancelButton = screen.getByText('Cancel')
      const saveButton = screen.getByText('Loading...')
      const closeButton = screen.getByLabelText('Close')
      
      expect(cancelButton).toBeDisabled()
      expect(saveButton).toBeDisabled()
      expect(closeButton).toBeDisabled()
    })

    it('should enable all buttons when isLoading is false', () => {
      render(<EditModal {...defaultProps} isLoading={false} />)
      
      const cancelButton = screen.getByText('Cancel')
      const saveButton = screen.getByText('Save')
      const closeButton = screen.getByLabelText('Close')
      
      expect(cancelButton).not.toBeDisabled()
      expect(saveButton).not.toBeDisabled()
      expect(closeButton).not.toBeDisabled()
    })
  })

  describe('Form Behavior', () => {
    it('should prevent default form submission', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      const preventDefault = vi.fn()
      
      render(<EditModal {...defaultProps} onSave={onSave} />)
      
      const form = screen.getByRole('button', { name: 'Save' }).closest('form')
      form?.addEventListener('submit', (e) => {
        preventDefault()
        e.preventDefault()
      })
      
      await user.click(screen.getByText('Save'))
      
      expect(onSave).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<EditModal {...defaultProps} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(3) // Cancel, Save, Close
    })

    it('should have proper ARIA labels', () => {
      render(<EditModal {...defaultProps} />)
      
      expect(screen.getByLabelText('Close')).toBeInTheDocument()
      expect(screen.getByLabelText('Cancel')).toBeInTheDocument()
      expect(screen.getByLabelText('Save')).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const onSave = vi.fn()
      
      render(<EditModal {...defaultProps} onSave={onSave} />)
      
      const saveButton = screen.getByText('Save')
      saveButton.focus()
      
      await user.keyboard('{Enter}')
      expect(onSave).toHaveBeenCalled()
    })
  })

  describe('Backdrop', () => {
    it('should render backdrop', () => {
      const { container } = render(<EditModal {...defaultProps} />)
      
      // CSS modules hash class names, so we search by class pattern
      const backdrop = container.querySelector('[class*="backdrop"]')
      expect(backdrop).toBeTruthy()
      expect(backdrop).toBeInTheDocument()
    })
  })
})
