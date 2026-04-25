import { useState, useCallback } from "react"
import { useSupplierStore } from "../../../store/supplierStore"
import { 
  fetchSuppliers, 
  createSupplier as apiCreateSupplier, 
  updateSupplier as apiUpdateSupplier,
  deleteSupplier as apiDeleteSupplier
} from "../services/supplierServices"

export const useSuppliers = () => {
  const { suppliers, total, loading, setSuppliers, setLoading } = useSupplierStore()
  const [error, setError] = useState<string | null>(null)

  const loadSuppliers = useCallback(async (params: { page?: number, limit?: number, name?: string } = {}) => {
    setLoading(true)
    try {
      const result = await fetchSuppliers(params)
      setSuppliers(result.suppliers || [], result.total || 0)
    } catch (err: any) {
      setError(err.message)
      setSuppliers([], 0)
    } finally {
      setLoading(false)
    }
  }, [setSuppliers, setLoading])

  const addSupplier = async (supplier: any) => {
    try {
      const newSupplier = await apiCreateSupplier(supplier)
      await loadSuppliers()
      return newSupplier
    } catch (err: any) {
      throw err
    }
  }

  const updateSupplier = async (id: string, supplier: any) => {
    try {
      const updated = await apiUpdateSupplier(id, supplier)
      await loadSuppliers()
      return updated
    } catch (err: any) {
      throw err
    }
  }

  const removeSupplier = async (id: string) => {
    try {
      await apiDeleteSupplier(id)
      await loadSuppliers()
    } catch (err: any) {
      throw err
    }
  }

  return {
    suppliers,
    total,
    loading,
    error,
    loadSuppliers,
    addSupplier,
    updateSupplier,
    removeSupplier
  }
}
