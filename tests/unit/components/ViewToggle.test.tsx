import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ViewToggle from '../../../src/components/ViewToggle/ViewToggle'

// Mock de react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'viewToggle.contentView': 'Content View',
        'viewToggle.cardsView': 'Cards View',
        'viewToggle.tableView': 'Table View',
        'viewToggle.kanbanView': 'Kanban View',
        'viewToggle.cards': 'Cards',
        'viewToggle.table': 'Table',
        'viewToggle.kanban': 'Kanban',
      }
      return translations[key] || key
    }
  })
}))

describe('ViewToggle Component', () => {
  describe('Rendering', () => {
    it('should render both view options', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
       
      expect(screen.getByText('Cards')).toBeInTheDocument()
      expect(screen.getByText('Table')).toBeInTheDocument()
      expect(screen.queryByText('Kanban')).not.toBeInTheDocument()
    })

    it('should render kanban only when explicitly allowed', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} allowedViews={['cards', 'table', 'kanban']} />)
      
      expect(screen.getByText('Cards')).toBeInTheDocument()
      expect(screen.getByText('Table')).toBeInTheDocument()
      expect(screen.getByText('Kanban')).toBeInTheDocument()
    })

    it('should render with custom label', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} label="View Mode:" />)
      
      expect(screen.getByText('View Mode:')).toBeInTheDocument()
    })

    it('should not render label when not provided', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const label = container.querySelector('.label')
      expect(label).not.toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('should mark cards button as active when view is cards', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      expect(cardsButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should mark table button as active when view is table', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="table" onViewChange={onViewChange} />)
      
      const tableButton = screen.getByLabelText('Table View')
      expect(tableButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should mark kanban button as active when kanban is allowed', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="kanban" onViewChange={onViewChange} allowedViews={['cards', 'table', 'kanban']} />)
      
      const kanbanButton = screen.getByLabelText('Kanban View')
      expect(kanbanButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should apply active class to cards button', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      // CSS modules generate hashed class names, so we check if it contains 'active' in the class
      expect(cardsButton.className).toMatch(/active/i)
    })

    it('should apply active class to table button', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="table" onViewChange={onViewChange} />)
      
      const tableButton = screen.getByLabelText('Table View')
      // CSS modules generate hashed class names, so we check if it contains 'active' in the class
      expect(tableButton.className).toMatch(/active/i)
    })
  })

  describe('User Interaction', () => {
    it('should call onViewChange with cards when cards button is clicked', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle view="table" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      await user.click(cardsButton)
      
      expect(onViewChange).toHaveBeenCalledWith('cards')
      expect(onViewChange).toHaveBeenCalledTimes(1)
    })

    it('should call onViewChange with table when table button is clicked', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const tableButton = screen.getByLabelText('Table View')
      await user.click(tableButton)
      
      expect(onViewChange).toHaveBeenCalledWith('table')
      expect(onViewChange).toHaveBeenCalledTimes(1)
    })

    it('should call onViewChange with kanban when kanban is allowed and clicked', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} allowedViews={['cards', 'table', 'kanban']} />)
      
      const kanbanButton = screen.getByLabelText('Kanban View')
      await user.click(kanbanButton)
      
      expect(onViewChange).toHaveBeenCalledWith('kanban')
      expect(onViewChange).toHaveBeenCalledTimes(1)
    })

    it('should allow clicking the same button multiple times', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      await user.click(cardsButton)
      await user.click(cardsButton)
      
      expect(onViewChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('Slider Animation', () => {
    it('should position slider at start for cards view', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      // CSS modules hash class names, so we search by class pattern
      const slider = container.querySelector('[class*="slider"]')
      expect(slider).toBeTruthy()
      expect(slider).toHaveStyle({ transform: 'translateX(0%)' })
    })

    it('should position slider at end for table view', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="table" onViewChange={onViewChange} />)
      
      // CSS modules hash class names, so we search by class pattern
      const slider = container.querySelector('[class*="slider"]')
      expect(slider).toBeTruthy()
      expect(slider).toHaveStyle({ transform: 'translateX(100%)' })
    })

    it('should position slider at end for kanban view when allowed', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="kanban" onViewChange={onViewChange} allowedViews={['cards', 'table', 'kanban']} />)
      
      const slider = container.querySelector('[class*="slider"]')
      expect(slider).toBeTruthy()
      expect(slider).toHaveStyle({ transform: 'translateX(200%)' })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      expect(screen.getByLabelText('Cards View')).toBeInTheDocument()
      expect(screen.getByLabelText('Table View')).toBeInTheDocument()
    })

    it('should have role group', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const group = screen.getByRole('group')
      expect(group).toHaveAttribute('aria-label', 'Content View')
    })

    it('should have proper aria-pressed attributes', () => {
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      const tableButton = screen.getByLabelText('Table View')
      
      expect(cardsButton).toHaveAttribute('aria-pressed', 'true')
      expect(tableButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      const onViewChange = vi.fn()
      render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      cardsButton.focus()
      
      await user.keyboard('{Enter}')
      expect(onViewChange).toHaveBeenCalled()
    })
  })

  describe('Icons', () => {
    it('should render LayoutGrid icon for cards', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="cards" onViewChange={onViewChange} />)
      
      const cardsButton = screen.getByLabelText('Cards View')
      const svg = cardsButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render Table icon for table', () => {
      const onViewChange = vi.fn()
      const { container } = render(<ViewToggle view="table" onViewChange={onViewChange} />)
      
      const tableButton = screen.getByLabelText('Table View')
      const svg = tableButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })
})
