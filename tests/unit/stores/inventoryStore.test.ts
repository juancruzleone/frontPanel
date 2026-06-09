import { describe, it, expect, beforeEach } from 'vitest'
import { useInventoryStore } from '../../../src/store/inventoryStore'
import { InventoryItem } from '../../../src/features/inventory/types/inventory.types'

describe('Inventory Store', () => {
  beforeEach(() => {
    useInventoryStore.setState({ items: [], total: 0, loading: false })
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
})
