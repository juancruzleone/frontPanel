import { useState, useCallback, useEffect } from "react"
import { useInventoryStore } from "../../../store/inventoryStore"
import { 
  fetchInventoryItems, 
  createInventoryItem, 
  updateInventoryItem as apiUpdateInventoryItem,
  deleteInventoryItem as apiDeleteInventoryItem,
  createInventoryAdjustment
} from "../services/inventoryServices"
import { InventoryItem } from "../types/inventory.types"

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback
}

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
      const inventoryItems = Array.isArray(result.items) ? result.items : []
      const rows = inventoryItems
      setItems(rows, result.total || rows.length)
      setPagination({
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: result.totalPages || 1,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar inventario'))
      setItems([], 0)
    } finally {
      setLoading(false)
    }
  }, [setItems, setLoading])

  const addInventoryItem = async (item: Partial<InventoryItem>) => {
    const newItem = await createInventoryItem(item)
    await loadInventory() // Refresh list
    return newItem
  }

  const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
    const updated = await apiUpdateInventoryItem(id, item)
    await loadInventory() // Refresh list
    return updated
  }

  const removeInventoryItem = async (id: string) => {
    await apiDeleteInventoryItem(id)
    await loadInventory() // Refresh list
  }

  const adjustStock = async (item: InventoryItem, quantity: number, type: 'entry' | 'exit' | 'adjustment', reason: string) => {
    if (item.inventorySource === 'asset') {
      throw new Error('No se puede ajustar stock sobre filas derivadas de activos')
    }

    if (!item._id) {
      throw new Error('No se puede actualizar el stock de este item')
    }

    await createInventoryAdjustment({
      inventoryItemId: item._id,
      type,
      quantity,
      reason,
    })

    await loadInventory()
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
