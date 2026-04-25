import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInventoryStore } from '../../../src/store/inventoryStore'

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
    const mockItems = [{ name: 'Item 1' }] as any
    useInventoryStore.getState().setItems(mockItems, 1)
    expect(useInventoryStore.getState().items).toEqual(mockItems)
    expect(useInventoryStore.getState().total).toBe(1)
  })
})
