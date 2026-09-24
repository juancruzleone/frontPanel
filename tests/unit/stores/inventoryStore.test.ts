import { describe, it, expect, beforeEach } from 'vitest'
import { buildInventoryCacheKey, mergeInventoryQuery, useInventoryStore } from '../../../src/store/inventoryStore'
import { InventoryItem } from '../../../src/features/inventory/types/inventory.types'

describe('Inventory Store', () => {
  beforeEach(() => {
    useInventoryStore.getState().reset()
  })

  it('debe iniciar con estado vacío', () => {
    const state = useInventoryStore.getState()
    expect(state.items).toEqual([])
    expect(state.loading).toBe(false)
  })

  it('debe actualizar items correctamente', () => {
    const mockItems: InventoryItem[] = [{ tenantId: 'tenant1', name: 'Item 1', unit: 'u', currentStock: 1, minimumStock: 0, active: true }]
    useInventoryStore.getState().setItems(mockItems, 1)
    expect(useInventoryStore.getState().items).toEqual(mockItems)
    expect(useInventoryStore.getState().total).toBe(1)
  })

  it('debe limpiar datos al cambiar el ownerId', () => {
    // Setup state
    useInventoryStore.setState({
      items: [{ tenantId: 'tenant1', name: 'Stale Item', unit: 'u', currentStock: 1, minimumStock: 0, active: true }],
      total: 1,
      ownerId: 'user1'
    })

    // Change owner
    useInventoryStore.getState().setOwnerId('user2')

    const state = useInventoryStore.getState()
    expect(state.ownerId).toBe('user2')
    expect(state.items).toEqual([])
    expect(state.total).toBe(0)
  })

  it('no debe limpiar datos si el ownerId es el mismo', () => {
    const mockItems: InventoryItem[] = [{ tenantId: 'tenant1', name: 'Current Item', unit: 'u', currentStock: 1, minimumStock: 0, active: true }]
    useInventoryStore.setState({
      items: mockItems,
      total: 1,
      ownerId: 'user1'
    })

    // Same owner
    useInventoryStore.getState().setOwnerId('user1')

    const state = useInventoryStore.getState()
    expect(state.items).toEqual(mockItems)
    expect(state.total).toBe(1)
  })

  it('conserva todos los filtros al cambiar de página y reinicia la página al cambiar un filtro', () => {
    const query = mergeInventoryQuery(
      { page: 3, limit: 25, name: 'bearing', category: 'Parts', lowStock: true },
      { category: 'Tools' },
    )

    expect(query).toEqual({ page: 1, limit: 25, name: 'bearing', category: 'Tools', lowStock: true })
    expect(mergeInventoryQuery(query, { page: 2 })).toEqual({ ...query, page: 2 })
  })

  it('genera claves de caché aisladas por tenant, usuario y consulta', () => {
    const query = { page: 1, limit: 10, name: '', category: '', lowStock: false }
    expect(buildInventoryCacheKey('tenant-a', 'user-a', query)).not.toBe(buildInventoryCacheKey('tenant-b', 'user-a', query))
    expect(buildInventoryCacheKey('tenant-a', 'user-a', query)).not.toBe(buildInventoryCacheKey('tenant-a', 'user-b', query))
    expect(buildInventoryCacheKey('tenant-a', 'user-a', query)).not.toBe(buildInventoryCacheKey('tenant-a', 'user-a', { ...query, lowStock: true }))
  })

  it('rechaza respuestas antiguas y expone estados cached, partial y error', () => {
    const store = useInventoryStore.getState()
    store.setOwnerScope('tenant-a', 'user-a')
    expect(store.beginRequest()).toBe(1)
    expect(store.beginRequest()).toBe(2)
    expect(store.acceptResponse(1, [{ tenantId: 'tenant-a', name: 'Old', unit: 'u', currentStock: 1, minimumStock: 0, active: true }], 1)).toBe(false)
    expect(store.acceptResponse(2, [{ tenantId: 'tenant-a', name: 'New', unit: 'u', currentStock: 2, minimumStock: 0, active: true }], 1)).toBe(true)
    store.setFreshness('cached')
    expect(useInventoryStore.getState().freshness).toBe('cached')
    store.setFreshness('partial')
    expect(useInventoryStore.getState().freshness).toBe('partial')
    store.setError('No se pudo actualizar')
    expect(useInventoryStore.getState().error).toBe('No se pudo actualizar')
  })
})
