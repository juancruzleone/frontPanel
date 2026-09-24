import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { indexedDBStorage } from "../utils/indexedDBStorage"
import { InventoryItem } from "../features/inventory/types/inventory.types"

export interface InventoryQuery {
  page: number
  limit: number
  name: string
  category: string
  lowStock: boolean
}

export type InventoryFreshness = "fresh" | "partial" | "cached" | "stale" | "error"

export const DEFAULT_INVENTORY_QUERY: InventoryQuery = {
  page: 1,
  limit: 10,
  name: "",
  category: "",
  lowStock: false,
}

export const mergeInventoryQuery = (
  current: InventoryQuery,
  patch: Partial<InventoryQuery>,
): InventoryQuery => {
  const filterChanged = ["name", "category", "lowStock"].some((key) =>
    patch[key as keyof InventoryQuery] !== undefined &&
    patch[key as keyof InventoryQuery] !== current[key as keyof InventoryQuery],
  )

  return {
    ...current,
    ...patch,
    page: filterChanged ? 1 : patch.page ?? current.page,
  }
}

export const buildInventoryCacheKey = (tenantId: string, userId: string, query: InventoryQuery): string =>
  `${tenantId}:${userId}:${JSON.stringify(query)}`

interface InventoryState {
  items: InventoryItem[]
  total: number
  loading: boolean
  lastUpdated: number | null
  ownerId: string | null
  tenantId: string | null
  query: InventoryQuery
  freshness: InventoryFreshness
  error: string | null
  requestSequence: number
  setOwnerId: (id: string | null) => void
  setOwnerScope: (tenantId: string | null, userId: string | null) => void
  setItems: (items: InventoryItem[], total: number) => void
  setLoading: (loading: boolean) => void
  setQuery: (query: InventoryQuery) => void
  beginRequest: () => number
  acceptResponse: (sequence: number, items: InventoryItem[], total: number) => boolean
  setFreshness: (freshness: InventoryFreshness) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      loading: false,
      lastUpdated: null,
      ownerId: null,
      tenantId: null,
      query: DEFAULT_INVENTORY_QUERY,
      freshness: "stale",
      error: null,
      requestSequence: 0,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            items: [],
            total: 0,
            lastUpdated: null,
            error: null,
            freshness: "stale",
          }
        }),
      setOwnerScope: (tenantId, ownerId) =>
        set((state) => {
          if (state.tenantId === tenantId && state.ownerId === ownerId) return state
          return { ...state, tenantId, ownerId, items: [], total: 0, lastUpdated: null, error: null, freshness: "stale" }
        }),
      setItems: (items, total) => set({ items, total, lastUpdated: Date.now(), freshness: "fresh", error: null }),
      setLoading: (loading) => set({ loading }),
      setQuery: (query) => set({ query }),
      beginRequest: () => {
        const sequence = get().requestSequence + 1
        set({ requestSequence: sequence, loading: true, error: null })
        return sequence
      },
      acceptResponse: (sequence, items, total) => {
        if (sequence !== get().requestSequence) return false
        set({ items, total, lastUpdated: Date.now(), freshness: "fresh", loading: false, error: null })
        return true
      },
      setFreshness: (freshness) => set({ freshness }),
      setError: (error) => set({ error, freshness: "error", loading: false }),
      reset: () => set({ items: [], total: 0, loading: false, lastUpdated: null, ownerId: null, tenantId: null, query: DEFAULT_INVENTORY_QUERY, freshness: "stale", error: null, requestSequence: 0 }),
    }),
    { 
      name: "inventory-storage",
      storage: createJSONStorage(() => indexedDBStorage)
    }
  )
)
