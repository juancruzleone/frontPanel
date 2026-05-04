import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSuppliers, createSupplier, deleteSupplier } from '../../../../src/features/suppliers/services/supplierServices'

describe('Supplier Services', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    // @ts-expect-error - Mocking import.meta.env
    import.meta.env.VITE_API_URL = 'http://api.test/'
  })

  it('debe llamar a fetch con la URL correcta para obtener proveedores', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ suppliers: [], total: 0 })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await fetchSuppliers()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/proveedores'), expect.any(Object))
  })

  it('debe lanzar error si la obtención de proveedores falla', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Error de servidor' })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(fetchSuppliers()).rejects.toThrow('Error de servidor')
  })

  it('debe normalizar una lista de proveedores devuelta como array', async () => {
    const mockSuppliers = [{ _id: '1', name: 'Prov 1' }]
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(mockSuppliers)
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(fetchSuppliers()).resolves.toEqual({ suppliers: mockSuppliers, total: 1 })
  })

  it('debe normalizar una lista de proveedores devuelta en data', async () => {
    const mockSuppliers = [{ _id: '1', name: 'Prov 1' }]
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: mockSuppliers, total: 5 })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await expect(fetchSuppliers()).resolves.toEqual({ suppliers: mockSuppliers, total: 5 })
  })

  it('debe llamar a fetch con POST para crear un proveedor', async () => {
    const mockSupplier = { name: 'Prov 1' }
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve(mockSupplier)
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await createSupplier(mockSupplier)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/proveedores'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockSupplier)
      })
    )
  })

  it('debe llamar a fetch con DELETE para eliminar un proveedor', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true })
    }
    ;(fetch as any).mockResolvedValue(mockResponse)

    await deleteSupplier('123')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/proveedores/123'),
      expect.objectContaining({
        method: 'DELETE'
      })
    )
  })
})
