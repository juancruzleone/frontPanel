import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useInventory from '../../../../src/features/inventory/hooks/useInventory'
import * as services from '../../../../src/features/inventory/services/inventoryServices'

vi.mock('../../../../src/features/inventory/services/inventoryServices', () => ({
  fetchInventoryItems: vi.fn(),
  fetchInventoryAssets: vi.fn(),
  createInventoryMovement: vi.fn(),
  updateInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn(),
  updateInventoryAssetStock: vi.fn(),
}))

describe('useInventory hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(services.fetchInventoryAssets).mockResolvedValue([])
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
    expect(services.fetchInventoryAssets).toHaveBeenCalled()
  })

  it('debe crear filas derivadas desde activos reales cuando no hay item de inventario', async () => {
    vi.mocked(services.fetchInventoryItems).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(services.fetchInventoryAssets).mockResolvedValue([
      { _id: 'asset-1', nombre: 'Bomba centrífuga', stock: 4, categoria: 'Bombas' },
    ])

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.loadInventory()
    })

    expect(result.current.items).toEqual([
      expect.objectContaining({
        _id: 'asset-asset-1',
        assetId: 'asset-1',
        name: 'Bomba centrífuga',
        category: 'Bombas',
        currentStock: 4,
        minimumStock: 0,
        inventorySource: 'asset',
      }),
    ])
  })

  it('debe preservar items de inventario y evitar duplicados por assetId o nombre', async () => {
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
    vi.mocked(services.fetchInventoryAssets).mockResolvedValue([
      { _id: 'asset-1', nombre: 'Bomba centrífuga', stock: 4 },
      { _id: 'asset-2', nombre: 'Bomba centrífuga', stock: 7 },
      { _id: 'asset-3', nombre: 'Motor', stock: 3 },
    ])

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.loadInventory()
    })

    expect(result.current.items).toEqual([
      inventoryItem,
      expect.objectContaining({ assetId: 'asset-3', name: 'Motor', inventorySource: 'asset' }),
    ])
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

  it('debe actualizar stock de activos derivados usando endpoint de activos', async () => {
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
      await result.current.adjustStock(assetRow, 3, 'entry', 'Reposición')
    })

    expect(services.updateInventoryAssetStock).toHaveBeenCalledWith('asset-1', 7)
    expect(services.createInventoryMovement).not.toHaveBeenCalled()
    expect(services.updateInventoryItem).not.toHaveBeenCalled()
    expect(services.fetchInventoryItems).toHaveBeenCalled()
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

    expect(services.createInventoryMovement).toHaveBeenCalledWith(expect.objectContaining({
      inventoryItemId: 'inventory-1',
      beforeStock: 5,
      afterStock: 3,
    }))
    expect(services.updateInventoryItem).toHaveBeenCalledWith('inventory-1', { currentStock: 3 })
    expect(services.updateInventoryAssetStock).not.toHaveBeenCalled()
  })
})
