import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import { InventoryItem } from "../features/inventory/types/inventory.types"

interface InventoryState {
  items: InventoryItem[]
  total: number
  loading: boolean
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setItems: (items: InventoryItem[], total: number) => void
  setLoading: (loading: boolean) => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      loading: false,
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) => set({ ownerId: id }),
      setItems: (items, total) => set({ items, total, lastUpdated: Date.now() }),
      setLoading: (loading) => set({ loading }),
    }),
    { 
      name: "inventory-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)
