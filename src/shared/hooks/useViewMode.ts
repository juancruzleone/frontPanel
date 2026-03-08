import { useState, useEffect } from 'react'

type ViewMode = 'cards' | 'table'

/**
 * Hook personalizado para manejar el modo de vista (cards/tabla)
 * con persistencia en localStorage
 * 
 * @param key - Clave única para identificar la vista en localStorage (ej: 'assets-view', 'installations-view')
 * @param defaultValue - Valor por defecto si no hay nada guardado (por defecto 'cards')
 * @returns [viewMode, setViewMode] - Estado y función para actualizar el modo de vista
 */
export const useViewMode = (key: string, defaultValue: ViewMode = 'cards'): [ViewMode, (mode: ViewMode) => void] => {
  // Inicializar desde localStorage o usar valor por defecto
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(key)
      return (stored === 'cards' || stored === 'table') ? stored : defaultValue
    } catch (error) {
      console.error('Error reading viewMode from localStorage:', error)
      return defaultValue
    }
  })

  // Función para actualizar el estado y localStorage
  const setViewMode = (mode: ViewMode) => {
    try {
      setViewModeState(mode)
      localStorage.setItem(key, mode)
    } catch (error) {
      console.error('Error saving viewMode to localStorage:', error)
    }
  }

  return [viewMode, setViewMode]
}
