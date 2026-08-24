import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSuppliers, createSupplier, deleteSupplier, previewSupplierImport, commitSupplierImport, exportSuppliers } from '../../../../src/features/suppliers/services/supplierServices'

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

  it('envía el CSV como multipart al endpoint de preview', async () => {
    const preview = { token: 'opaque', payloadHash: 'hash', counts: { create: 1, update: 0, unchanged: 0, error: 0 }, rows: [] }
    ;(fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(preview) })
    const file = new File(['a,b\n1,2'], 'suppliers.csv', { type: 'text/csv' })

    await previewSupplierImport(file)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/proveedores/csv/import/preview'), expect.objectContaining({ method: 'POST', body: expect.any(FormData) }))
  })

  it('reutiliza el token opaco como clave idempotente y es estable en reintentos', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ create: 2 }) })
    const preview = { token: 'stable-token', payloadHash: 'hash', schemaVersion: 'suppliers.v1', delimiter: ',' as const, expiresAt: new Date().toISOString(), counts: { create: 1, update: 1, unchanged: 0, error: 0 }, rows: [] }

    await commitSupplierImport(preview)
    await commitSupplierImport(preview)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/proveedores/csv/import/commit'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Idempotency-Key': 'stable-token' }),
      body: JSON.stringify({ token: 'stable-token', payloadHash: 'hash' }),
    }))
    const [, firstOptions] = vi.mocked(fetch).mock.calls.at(-2) as [string, any]
    const [, secondOptions] = vi.mocked(fetch).mock.calls.at(-1) as [string, any]
    expect(firstOptions.headers['Idempotency-Key']).toBe(secondOptions.headers['Idempotency-Key'])
  })

  it('exporta todo el filtro por servidor', async () => {
    const click = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({ click } as unknown as HTMLAnchorElement)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:url'), revokeObjectURL: vi.fn() })
    ;(fetch as any).mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['csv'])) })

    await exportSuppliers({ name: 'ACME & hijos' })

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('name=ACME+%26+hijos'), expect.any(Object))
    expect(click).toHaveBeenCalled()
  })
})
