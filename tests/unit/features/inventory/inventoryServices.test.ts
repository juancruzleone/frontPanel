import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchInventoryItems, createInventoryItem, deleteInventoryItem } from '../../../../src/features/inventory/services/inventoryServices'

describe('Inventory Services', () => {
  beforeEach(() => {
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
