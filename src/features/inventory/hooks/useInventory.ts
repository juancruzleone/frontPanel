import { useState, useCallback, useEffect } from "react"
import { useInventoryStore } from "../../../store/inventoryStore"
import { 
  fetchInventoryItems, 
  createInventoryItem, 
  updateInventoryItem as apiUpdateInventoryItem,
  deleteInventoryItem as apiDeleteInventoryItem,
  createInventoryMovement
} from "../services/inventoryServices"
import { InventoryItem } from "../types/inventory.types"

const useInventory = () => {
  const { items, total, loading, setItems, setLoading } = useInventoryStore()
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
  })

  const loadInventory = useCallback(async (params: { page?: number, limit?: number, name?: string, category?: string, lowStock?: boolean } = {}) => {
    setLoading(true)
    try {
      const result = await fetchInventoryItems(params)
      setItems(result.items || [], result.total || 0)
      setPagination({
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: result.totalPages || 1,
      })
    } catch (err: any) {
      setError(err.message)
      setItems([], 0)
    } finally {
      setLoading(false)
    }
  }, [setItems, setLoading])

  const addInventoryItem = async (item: Partial<InventoryItem>) => {
    try {
      const newItem = await createInventoryItem(item)
      await loadInventory() // Refresh list
      return newItem
    } catch (err: any) {
      throw err
    }
  }

  const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
    try {
      const updated = await apiUpdateInventoryItem(id, item)
      await loadInventory() // Refresh list
      return updated
    } catch (err: any) {
      throw err
    }
  }

  const removeInventoryItem = async (id: string) => {
    try {
      await apiDeleteInventoryItem(id)
      await loadInventory() // Refresh list
    } catch (err: any) {
      throw err
    }
  }

  const adjustStock = async (itemId: string, quantity: number, type: 'entry' | 'exit' | 'adjustment', reason: string, currentStock: number) => {
    try {
      const beforeStock = currentStock
      const afterStock = type === 'entry' ? beforeStock + quantity : type === 'exit' ? beforeStock - quantity : quantity
      
      const movement = {
        inventoryItemId: itemId,
        type,
        quantity,
        beforeStock,
        afterStock,
        performedBy: 'user', // Will be filled by backend
        referenceType: 'manual',
        referenceId: reason
      }
      
      await createInventoryMovement(movement)
      
      // Update item stock
      await apiUpdateInventoryItem(itemId, { currentStock: afterStock })
      await loadInventory()
    } catch (err: any) {
        throw err
    }
  }

  useEffect(() => {
    // Optional: auto-load on first use if needed
  }, [])

  return {
    items,
    total,
    loading,
    error,
    pagination,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    adjustStock
  }
}

export default useInventory
