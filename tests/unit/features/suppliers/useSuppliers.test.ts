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
    vi.mocked(services.fetchSuppliers).mockResolvedValue({ suppliers: mockSuppliers, total: 1 })

    const { result } = renderHook(() => useSuppliers())

    await act(async () => {
      await result.current.loadSuppliers()
    })

    expect(result.current.suppliers).toEqual(mockSuppliers)
    expect(services.fetchSuppliers).toHaveBeenCalled()
  })

  it('keeps loadSuppliers stable when the supplier count changes', async () => {
    vi.mocked(services.fetchSuppliers).mockResolvedValue({ suppliers: [{ name: 'Prov 1' }], total: 1 })
    const { result } = renderHook(() => useSuppliers())
    const initialCallback = result.current.loadSuppliers

    await act(async () => {
      await initialCallback()
    })

    expect(result.current.loadSuppliers).toBe(initialCallback)
    expect(services.fetchSuppliers).toHaveBeenCalledTimes(1)
  })
})
