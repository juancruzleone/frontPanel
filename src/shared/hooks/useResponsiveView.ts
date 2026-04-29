import { useState, useEffect } from 'react'

type ViewMode = 'cards' | 'table' | 'kanban'

/**
 * Hook que combina useViewMode con detección responsive
 * En mobile/tablet siempre muestra cards, en desktop permite elegir
 */
export const useResponsiveView = (storageKey: string, defaultValue: ViewMode = 'cards'): [ViewMode, (mode: ViewMode) => void, boolean] => {
  const [isMobile, setIsMobile] = useState(false)
  
  // Inicializar desde localStorage
  const [savedView, setSavedView] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return (stored === 'cards' || stored === 'table' || stored === 'kanban') ? (stored as ViewMode) : defaultValue
    } catch (error) {
      return defaultValue
    }
  })

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // Tablet y mobile
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Vista efectiva: en mobile siempre cards, en desktop la guardada
  const effectiveView: ViewMode = isMobile ? 'cards' : savedView

  // Función para cambiar vista (solo funciona en desktop)
  const setViewMode = (mode: ViewMode) => {
    if (!isMobile) {
      try {
        setSavedView(mode)
        localStorage.setItem(storageKey, mode)
      } catch (error) {
        console.error('Error saving view mode:', error)
      }
    }
  }

  return [effectiveView, setViewMode, isMobile]
}
