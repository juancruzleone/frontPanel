import { create } from "zustand"
import { persist } from "zustand/middleware"
import { InventoryItem } from "../features/inventory/types/inventory.types"

interface InventoryState {
  items: InventoryItem[]
  total: number
  loading: boolean
  setItems: (items: InventoryItem[], total: number) => void
  setLoading: (loading: boolean) => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      items: [],
      total: 0,
      loading: false,
      setItems: (items, total) => set({ items, total }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: "inventory-storage" }
  )
)
