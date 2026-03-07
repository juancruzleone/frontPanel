import { useState, useEffect } from 'react'

export interface SettingsCategory {
  _id?: string
  nombre: string
  tipo: 'instalacion' | 'activo' | 'dispositivo' | 'formulario'
}

const useSettings = () => {
  const [loading, setLoading] = useState(false)

  return {
    loading,
  }
}

export default useSettings
