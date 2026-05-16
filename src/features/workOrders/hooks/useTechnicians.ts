import { useEffect, useState, useCallback } from "react"
import { fetchTechnicians } from "../services/technicianServices"
import { useTechnicianStore } from "../../../store/technicianStore"
import { useAuthStore } from "../../../store/authStore"

export interface Technician {
  _id: string
  userName: string
  role: string
}

const useTechnicians = () => {
  const { technicians: storedTechnicians, setTechnicians, ownerId } = useTechnicianStore()
  const { userId } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const validTechnicians = ownerId === userId ? storedTechnicians : []

  const loadTechnicians = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      if (!navigator.onLine && validTechnicians.length > 0) {
        setLoading(false)
        return
      }
      const data = await fetchTechnicians()
      setTechnicians(data)
    } catch (err: unknown) {
      if (validTechnicians.length > 0) {
        setLoading(false)
        return
      }
      setError((err as Error).message || "Error al cargar técnicos")
    } finally {
      setLoading(false)
    }
  }, [validTechnicians.length, setTechnicians])

  useEffect(() => {
    loadTechnicians()
  }, [loadTechnicians])

  return { technicians: validTechnicians, loading, error, reload: loadTechnicians }
}


export default useTechnicians
