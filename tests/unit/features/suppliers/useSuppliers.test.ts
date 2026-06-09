import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSuppliers } from '../../../../src/features/suppliers/hooks/useSuppliers'
import * as services from '../../../../src/features/suppliers/services/supplierServices'
import { useAuthStore } from '../../../../src/store/authStore'
import { useSupplierStore } from '../../../../src/store/supplierStore'

vi.mock('../../../../src/features/suppliers/services/supplierServices', () => ({
  fetchSuppliers: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
}))

describe('useSuppliers hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ userId: 'test-user' })
    useSupplierStore.setState({ ownerId: 'test-user', suppliers: [], total: 0 })
  })

  it('debe cargar proveedores al llamar a loadSuppliers', async () => {
    const mockSuppliers = [{ name: 'Prov 1' }]
    ;(services.fetchSuppliers as any).mockResolvedValue({ suppliers: mockSuppliers, total: 1 })

    const { result } = renderHook(() => useSuppliers())

    await act(async () => {
      await result.current.loadSuppliers()
    })

    expect(result.current.suppliers).toEqual(mockSuppliers)
    expect(services.fetchSuppliers).toHaveBeenCalled()
  })
})
