import { fetchAssets, fetchTemplates } from "../../features/assets/services/assetServices"
import { fetchInventoryItems } from "../../features/inventory/services/inventoryServices"
import { fetchFormCategories } from "../../features/forms/services/formServices"
import { useAssetStore } from "../../store/assetStore"
import { useInventoryStore } from "../../store/inventoryStore"
import { useAuthStore } from "../../store/authStore"

class WarmCacheService {
  private isWarming = false

  async warmAll() {
    const { isAuthenticated, isAuthResolved } = useAuthStore.getState()
    if (this.isWarming || !navigator.onLine || !isAuthResolved || !isAuthenticated) return
    this.isWarming = true

    try {
      // 1. Warm Assets
      const assetsResult = await fetchAssets({ limit: 1000 }) // Fetch a large enough batch
      if (assetsResult.assets && Array.isArray(assetsResult.assets)) {
        useAssetStore.getState().setAssets(assetsResult.assets)
      }

      // 2. Warm Templates
      const templates = await fetchTemplates({ limit: 100 })
      useAssetStore.getState().setTemplates(templates)

      // 3. Warm Categories
      const categoriesResult = await fetchFormCategories()
      const fetchedCategories = categoriesResult.categories || categoriesResult
      if (Array.isArray(fetchedCategories)) {
        useAssetStore.getState().setCategories(fetchedCategories.map((cat: any) => cat.nombre))
      }

      // 4. Warm Inventory
      const inventoryResult = await fetchInventoryItems({ limit: 1000 })
      if (inventoryResult.items && Array.isArray(inventoryResult.items)) {
        useInventoryStore.getState().setItems(inventoryResult.items, inventoryResult.total)
      }

    } catch (error) {
      // Silent error during background warming
    } finally {
      this.isWarming = false
    }
  }
}

export const warmCacheService = new WarmCacheService()
