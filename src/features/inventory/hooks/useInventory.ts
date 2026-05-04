import { useState, useCallback, useEffect } from "react"
import { useInventoryStore } from "../../../store/inventoryStore"
import { 
  fetchInventoryItems, 
  fetchInventoryAssets,
  createInventoryItem, 
  updateInventoryItem as apiUpdateInventoryItem,
  deleteInventoryItem as apiDeleteInventoryItem,
  createInventoryMovement,
  updateInventoryAssetStock
} from "../services/inventoryServices"
import { InventoryAsset, InventoryItem } from "../types/inventory.types"

const normalizeItemName = (name: string) => name.trim().toLocaleLowerCase()

const getAssetName = (asset: InventoryAsset): string => asset.nombre || asset.name || ''

const getAssetStock = (asset: InventoryAsset): number => {
  if (typeof asset.currentStock === 'number') return asset.currentStock
  if (typeof asset.stock === 'number') return asset.stock

  return 1
}

const getAssetMinimumStock = (asset: InventoryAsset): number => {
  if (typeof asset.minimumStock === 'number') return asset.minimumStock
  if (typeof asset.stockMinimo === 'number') return asset.stockMinimo

  return 0
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback
}

const buildInventoryRows = (
  inventoryItems: InventoryItem[],
  assets: InventoryAsset[],
  filters: { name?: string; category?: string } = {}
): InventoryItem[] => {
  const existingAssetIds = new Set(
    inventoryItems
      .flatMap((item) => [item.assetId, item.activoId])
      .filter((id): id is string => Boolean(id))
  )
  const existingNames = new Set(inventoryItems.map((item) => normalizeItemName(item.name)))
  const assetNamesWithoutId = new Set<string>()

  const assetRows = assets
    .filter((asset) => {
      const assetName = getAssetName(asset)
      if (!assetName) return false
      if (asset._id && existingAssetIds.has(asset._id)) return false
      if (!asset._id && assetNamesWithoutId.has(normalizeItemName(assetName))) return false
      if (existingNames.has(normalizeItemName(assetName))) return false

      if (!asset._id) assetNamesWithoutId.add(normalizeItemName(assetName))

      return true
    })
    .filter((asset) => {
      const assetName = getAssetName(asset)
      const assetCategory = asset.category || asset.categoria || ''
      const nameMatches = !filters.name || normalizeItemName(assetName).includes(normalizeItemName(filters.name))
      const categoryMatches = !filters.category || normalizeItemName(assetCategory).includes(normalizeItemName(filters.category))

      return nameMatches && categoryMatches
    })
    .map<InventoryItem>((asset) => ({
      _id: asset._id ? `asset-${asset._id}` : undefined,
      tenantId: '',
      name: getAssetName(asset),
      category: asset.category || asset.categoria,
      unit: asset.unit || asset.unidad || 'unidades',
      currentStock: getAssetStock(asset),
      minimumStock: getAssetMinimumStock(asset),
      location: asset.location || asset.ubicacion,
      active: asset.active ?? true,
      assetId: asset._id,
      inventorySource: 'asset',
    }))

  return [
    ...inventoryItems,
    ...assetRows,
  ]
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
      const [result, assetsResult] = await Promise.all([
        fetchInventoryItems(params),
        fetchInventoryAssets().catch(() => []),
      ])
      const assets = assetsResult as InventoryAsset[]
      const inventoryItems = Array.isArray(result.items) ? result.items : []
      const rows = buildInventoryRows(inventoryItems, assets, params)
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
    const beforeStock = item.currentStock
    const afterStock = type === 'entry' ? beforeStock + quantity : type === 'exit' ? beforeStock - quantity : quantity

    if (item.inventorySource === 'asset') {
      if (!item.assetId) {
        throw new Error('No se puede actualizar el stock de este activo')
      }

      await updateInventoryAssetStock(item.assetId, afterStock)
      await loadInventory()
      return
    }

    if (!item._id) {
      throw new Error('No se puede actualizar el stock de este item')
    }
    
    const movement = {
      inventoryItemId: item._id,
      type,
      quantity,
      beforeStock,
      afterStock,
      performedBy: 'user', // Will be filled by backend
      referenceType: 'manual' as const,
      referenceId: reason
    }
    
    await createInventoryMovement(movement)
    
    // Update item stock
    await apiUpdateInventoryItem(item._id, { currentStock: afterStock })
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
