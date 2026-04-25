import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useInventory from '../../../../src/features/inventory/hooks/useInventory'
import * as services from '../../../../src/features/inventory/services/inventoryServices'

vi.mock('../../../../src/features/inventory/services/inventoryServices', () => ({
  fetchInventoryItems: vi.fn(),
  deleteInventoryItem: vi.fn(),
}))

describe('useInventory hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe cargar items al llamar a loadInventory', async () => {
    const mockItems = [{ name: 'Item 1' }]
    ;(services.fetchInventoryItems as any).mockResolvedValue({ items: mockItems, total: 1 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.loadInventory()
    })

    expect(result.current.items).toEqual(mockItems)
    expect(services.fetchInventoryItems).toHaveBeenCalled()
  })

  it('debe eliminar un item y recargar la lista', async () => {
    ;(services.deleteInventoryItem as any).mockResolvedValue({ success: true })
    ;(services.fetchInventoryItems as any).mockResolvedValue({ items: [], total: 0 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.removeInventoryItem('123')
    })

    expect(services.deleteInventoryItem).toHaveBeenCalledWith('123')
    expect(services.fetchInventoryItems).toHaveBeenCalled()
  })

  it('debe manejar error al eliminar un item', async () => {
    const errorMsg = 'Error al eliminar'
    ;(services.deleteInventoryItem as any).mockRejectedValue(new Error(errorMsg))

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await expect(result.current.removeInventoryItem('123')).rejects.toThrow(errorMsg)
    })
  })
})
