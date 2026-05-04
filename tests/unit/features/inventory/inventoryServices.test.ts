import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAssets } from '../../../../src/features/assets/services/assetServices'
import { fetchInventoryItems, fetchInventoryAssets, createInventoryItem, deleteInventoryItem } from '../../../../src/features/inventory/services/inventoryServices'

vi.mock('../../../../src/features/assets/services/assetServices', () => ({
  fetchAssets: vi.fn(),
}))

describe('Inventory Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    // @ts-expect-error - Mocking import.meta.env
    import.meta.env.VITE_API_URL = 'http://api.test/'
  })

  it('debe llamar a fetch con la URL correcta para obtener items', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await fetchInventoryItems()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/inventario'), expect.any(Object))
  })

  it('debe lanzar error si el fetch falla', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Error de prueba' })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(createInventoryItem({})).rejects.toThrow('Error de prueba')
  })

  it('debe obtener activos mediante el servicio compartido de activos', async () => {
    const mockAssets = [{ _id: 'asset-1', nombre: 'Activo real', stock: 3 }]
    vi.mocked(fetchAssets).mockResolvedValue({ assets: mockAssets })

    const result = await fetchInventoryAssets()

    expect(fetchAssets).toHaveBeenCalledWith({ page: 1, limit: 1000 })
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/activos'), expect.any(Object))
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/plantillas'), expect.any(Object))
    expect(result).toEqual(mockAssets)
  })

  it('debe llamar a fetch con DELETE para eliminar un item', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await deleteInventoryItem('123')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventario/123'),
      expect.objectContaining({
        method: 'DELETE'
      })
    )
  })

  it('debe lanzar error si la eliminación falla', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Item no encontrado' })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(deleteInventoryItem('999')).rejects.toThrow('Item no encontrado')
  })
})
