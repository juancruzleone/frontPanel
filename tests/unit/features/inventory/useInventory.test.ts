import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useInventory from '../../../../src/features/inventory/hooks/useInventory'
import * as services from '../../../../src/features/inventory/services/inventoryServices'
import { useAuthStore } from '../../../../src/store/authStore'
import { useInventoryStore } from '../../../../src/store/inventoryStore'

vi.mock('../../../../src/features/inventory/services/inventoryServices', () => ({
  fetchInventoryItems: vi.fn(),
  createInventoryAdjustment: vi.fn(),
  updateInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn(),
}))

describe('useInventory hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ userId: 'test-user' })
    useInventoryStore.setState({ ownerId: 'test-user', items: [], total: 0 })
  })

  it('debe cargar items al llamar a loadInventory', async () => {
    const mockItems = [{ name: 'Item 1' }]
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: mockItems, total: 1 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.loadInventory()
    })

    expect(result.current.items).toEqual(mockItems)
    expect(services.fetchInventoryItems).toHaveBeenCalled()
  })

  it('debe devolver solo items reales de inventario (sin filas derivadas de activos)', async () => {
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: [], total: 0 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.loadInventory()
    })

    expect(result.current.items).toEqual([])
  })

  it('debe preservar items de inventario sin mezclar activos', async () => {
    const inventoryItem = {
      _id: 'inventory-1',
      assetId: 'asset-1',
      name: 'Bomba centrífuga',
      currentStock: 2,
      minimumStock: 1,
      unit: 'u',
      tenantId: 'tenant',
      active: true,
    }
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: [inventoryItem], total: 1 })
    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.loadInventory()
    })

    expect(result.current.items).toEqual([inventoryItem])
  })

  it('debe eliminar un item y recargar la lista', async () => {
    vi.mocked(services.deleteInventoryItem).mockResolvedValue({ success: true })
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: [], total: 0 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.removeInventoryItem('123')
    })

    expect(services.deleteInventoryItem).toHaveBeenCalledWith('123')
    expect(services.fetchInventoryItems).toHaveBeenCalled()
  })

  it('debe manejar error al eliminar un item', async () => {
    const errorMsg = 'Error al eliminar'
    vi.mocked(services.deleteInventoryItem).mockRejectedValue(new Error(errorMsg))

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await expect(result.current.removeInventoryItem('123')).rejects.toThrow(errorMsg)
    })
  })

  it('debe bloquear ajustes de stock sobre filas derivadas de activos', async () => {
    const assetRow = {
      _id: 'asset-asset-1',
      assetId: 'asset-1',
      tenantId: '',
      name: 'Bomba centrífuga',
      unit: 'unidades',
      currentStock: 4,
      minimumStock: 0,
      active: true,
      inventorySource: 'asset' as const,
    }
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: [], total: 0 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await expect(result.current.adjustStock(assetRow, 3, 'entry', 'Reposición'))
        .rejects.toThrow('No se puede ajustar stock sobre filas derivadas de activos')
    })

    expect(services.createInventoryAdjustment).not.toHaveBeenCalled()
    expect(services.updateInventoryItem).not.toHaveBeenCalled()
    expect(services.fetchInventoryItems).not.toHaveBeenCalled()
  })

  it('debe actualizar stock de items reales de inventario sin usar id sintético', async () => {
    const inventoryRow = {
      _id: 'inventory-1',
      tenantId: 'tenant',
      name: 'Repuesto real',
      unit: 'unidades',
      currentStock: 5,
      minimumStock: 1,
      active: true,
    }
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: [], total: 0 })

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.adjustStock(inventoryRow, 2, 'exit', 'Uso')
    })

    expect(services.createInventoryAdjustment).toHaveBeenCalledWith(expect.objectContaining({
      inventoryItemId: 'inventory-1',
      type: 'exit',
      quantity: 2,
      reason: 'Uso',
    }))
    expect(services.updateInventoryItem).not.toHaveBeenCalled()
  })
})
