import { useState, useCallback, useEffect, useRef } from "react"
import { useInventoryStore } from "../../../store/inventoryStore"
import { useAuthStore } from "../../../store/authStore"
import { 
  fetchInventoryItems, 
  createInventoryItem, 
  updateInventoryItem as apiUpdateInventoryItem,
  deleteInventoryItem as apiDeleteInventoryItem,
  createInventoryAdjustment
} from "../services/inventoryServices"
import { InventoryItem } from "../types/inventory.types"
import { InventoryQuery, mergeInventoryQuery } from "../../../store/inventoryStore"

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback
}

const useInventory = () => {
  const { items, total, loading, ownerId, tenantId, query, freshness, error, setOwnerScope, setQuery, beginRequest, acceptResponse, setError, setFreshness } = useInventoryStore()
  const { userId, tenantId: authTenantId } = useAuthStore()
  const abortRef = useRef<AbortController | null>(null)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setOwnerScope(authTenantId, userId)
  }, [authTenantId, userId, setOwnerScope])

  const validItems = userId && ownerId === userId && authTenantId === tenantId ? items : []

  const loadInventory = useCallback(async (params: Partial<InventoryQuery> = {}) => {
    const currentStore = useInventoryStore.getState()
    const nextQuery = mergeInventoryQuery(currentStore.query, params)
    const hasValidCache = Boolean(userId && authTenantId && currentStore.ownerId === userId && currentStore.tenantId === authTenantId && currentStore.items.length > 0)
    setQuery(nextQuery)
    if (!navigator.onLine && hasValidCache) {
      setFreshness("cached")
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const sequence = beginRequest()
    try {
      const result = await fetchInventoryItems({ ...nextQuery, signal: controller.signal })
      const inventoryItems = Array.isArray(result.items) ? result.items : []
      acceptResponse(sequence, inventoryItems, result.total || inventoryItems.length)
      setTotalPages(result.totalPages || 1)
    } catch (err) {
      if (controller.signal.aborted) return
      if (hasValidCache) {
        setError(getErrorMessage(err, 'Error al actualizar inventario'))
        setFreshness("partial")
        return
      }
      setError(getErrorMessage(err, 'Error al cargar inventario'))
    }
  }, [authTenantId, beginRequest, acceptResponse, setError, setFreshness, setQuery, userId])

  const addInventoryItem = async (item: Partial<InventoryItem>) => {
    const newItem = await createInventoryItem(item)
    await loadInventory() // Refresh current page and filters
    return newItem
  }

  const updateInventoryItem = async (id: string, item: Partial<InventoryItem>) => {
    const updated = await apiUpdateInventoryItem(id, item)
    await loadInventory() // Refresh current page and filters
    return updated
  }

  const removeInventoryItem = async (id: string) => {
    await apiDeleteInventoryItem(id)
    await loadInventory() // Refresh current page and filters
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

  return {
    items: validItems,
    total,
    loading,
    error,
    pagination: { page: query.page, limit: query.limit, totalPages },
    freshness,
    query,
    loadInventory,
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    adjustStock
  }
}

export default useInventory
