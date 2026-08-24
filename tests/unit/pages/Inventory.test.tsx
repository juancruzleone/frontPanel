import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Inventory from '../../../src/pages/Inventory'
import { useAuthStore } from '../../../src/store/authStore'
import useInventory from '../../../src/features/inventory/hooks/useInventory'

vi.mock('../../../src/store/authStore')
vi.mock('../../../src/features/inventory/hooks/useInventory')
vi.mock('../../../src/shared/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('Inventory Page', () => {
  const mockLoadInventory = vi.fn()
  const mockRemoveInventoryItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthStore as any).mockReturnValue('admin')
    ;(useInventory as any).mockReturnValue({
      items: [{ _id: '1', name: 'Item 1', currentStock: 10, minimumStock: 5, unit: 'u', category: 'Cat 1' }],
      loading: false,
      loadInventory: mockLoadInventory,
      removeInventoryItem: mockRemoveInventoryItem,
    })
  })

  it('debe llamar a removeInventoryItem cuando se confirma la eliminación', async () => {
    render(<Inventory />)
    
    // Find delete button and click it
    const deleteButtons = screen.getAllByRole('button', { name: /common.delete/i })
    fireEvent.click(deleteButtons[0])

    // Wait for confirm modal and click confirm (it should be the last one added or we can find by class)
    const allDeleteButtons = await screen.findAllByRole('button', { name: /common.delete/i })
    const confirmButton = allDeleteButtons[allDeleteButtons.length - 1]
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockRemoveInventoryItem).toHaveBeenCalledWith('1')
    })
  })

  it('debe filtrar inventario por categoría', async () => {
    render(<Inventory />)

    fireEvent.click(screen.getByText('inventory.filterByCategory'))
    fireEvent.click(screen.getAllByText('Cat 1')[0])

    await waitFor(() => {
      expect(mockLoadInventory).toHaveBeenCalledWith({ name: '', category: 'Cat 1' })
    })
  })

  it('muestra importación solo a admin y exportación a roles con acceso', () => {
    const { rerender } = render(<Inventory />)
    expect(screen.getByText('inventory.csv.import')).toBeInTheDocument()
    expect(screen.getByText('inventory.csv.exportFiltered')).toBeInTheDocument()

    ;(useAuthStore as any).mockReturnValue('tecnico')
    rerender(<Inventory />)
    expect(screen.queryByText('inventory.csv.import')).not.toBeInTheDocument()
    expect(screen.getByText('inventory.csv.exportFiltered')).toBeInTheDocument()
  })

  it('oculta exportación al rol cliente sin acceso', () => {
    ;(useAuthStore as any).mockReturnValue('cliente')
    render(<Inventory />)
    expect(screen.queryByText('inventory.csv.exportFiltered')).not.toBeInTheDocument()
  })
})
