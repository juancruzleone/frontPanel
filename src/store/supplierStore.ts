import { create } from "zustand"
import { persist } from "zustand/middleware"

interface Supplier {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
}

interface SupplierState {
  suppliers: Supplier[]
  total: number
  loading: boolean
  setSuppliers: (suppliers: Supplier[], total: number) => void
  setLoading: (loading: boolean) => void
}

export const useSupplierStore = create<SupplierState>()(
  persist(
    (set) => ({
      suppliers: [],
      total: 0,
      loading: false,
      setSuppliers: (suppliers, total) => set({ suppliers, total }),
      setLoading: (loading) => set({ loading }),
    }),
    { name: "supplier-storage" }
  )
)
