import { useState, useEffect } from 'react'

export type ViewMode = 'cards' | 'table' | 'kanban'

interface UseResponsiveViewOptions {
  allowedViews?: readonly ViewMode[]
}

const DEFAULT_ALLOWED_VIEWS: readonly ViewMode[] = ['cards', 'table']

const resolveDefaultView = (defaultValue: ViewMode, allowedViews: readonly ViewMode[]): ViewMode => {
  return allowedViews.includes(defaultValue) ? defaultValue : allowedViews[0]
}

const isAllowedView = (value: string | null, allowedViews: readonly ViewMode[]): value is ViewMode => {
  return value !== null && allowedViews.includes(value as ViewMode)
}

/**
 * Hook que combina useViewMode con detección responsive
 * En mobile/tablet siempre muestra cards, en desktop permite elegir
 */
export const useResponsiveView = (
  storageKey: string,
  defaultValue: ViewMode = 'cards',
  options: UseResponsiveViewOptions = {}
): [ViewMode, (mode: ViewMode) => void, boolean] => {
  const allowedViews = options.allowedViews?.length ? options.allowedViews : DEFAULT_ALLOWED_VIEWS
  const safeDefaultView = resolveDefaultView(defaultValue, allowedViews)
  const [isMobile, setIsMobile] = useState(false)
  
  // Inicializar desde localStorage
  const [savedView, setSavedView] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (isAllowedView(stored, allowedViews)) {
        return stored
      }

      if (stored !== null) {
        localStorage.setItem(storageKey, safeDefaultView)
      }

      return safeDefaultView
    } catch {
      return safeDefaultView
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
    if (!isMobile && allowedViews.includes(mode)) {
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
