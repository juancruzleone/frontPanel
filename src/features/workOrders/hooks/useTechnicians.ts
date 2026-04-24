import { useEffect, useState } from "react"
import { fetchTechnicians } from "../services/technicianServices"

export interface Technician {
  _id: string
  userName: string
  role: string
}

const useTechnicians = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTechnicians = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTechnicians()
      setTechnicians(data)
    } catch (err: unknown) {
      setError((err as Error).message || "Error al cargar técnicos")
      setTechnicians([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTechnicians()
  }, [])

  return { technicians, loading, error, reload: loadTechnicians }
}

export default useTechnicians
