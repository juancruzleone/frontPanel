import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Supplier {
  _id: string
  externalId?: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  taxId?: string
  notes?: string
  active?: boolean
}

interface SupplierState {
  suppliers: Supplier[]
  total: number
  loading: boolean
  lastUpdated: number | null
  ownerId: string | null
  setOwnerId: (id: string | null) => void
  setSuppliers: (suppliers: Supplier[], total: number) => void
  setLoading: (loading: boolean) => void
}

export const useSupplierStore = create<SupplierState>()(
  persist(
    (set) => ({
      suppliers: [],
      total: 0,
      loading: false,
      lastUpdated: null,
      ownerId: null,
      setOwnerId: (id) =>
        set((state) => {
          if (state.ownerId === id) return state
          return {
            ownerId: id,
            suppliers: [],
            total: 0,
            lastUpdated: null,
          }
        }),
      setSuppliers: (suppliers, total) => set({ suppliers, total, lastUpdated: Date.now() }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: "supplier-storage" }
  )
)
