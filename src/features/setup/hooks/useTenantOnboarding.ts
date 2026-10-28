import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthStore } from "../../../store/authStore"
import { isAdmin } from "../../../shared/utils/roleUtils"
import {
  completeTenantOnboarding,
  fetchTenantOnboardingStatus,
  type TenantOnboardingStatus,
} from "../../../shared/services/tenantOnboardingService"

interface UseTenantOnboardingOptions {
  /** Cuando es true no se consulta al servidor (p. ej. super_admin sin tenant). */
  disabled?: boolean
}

interface TenantOnboardingState {
  status: TenantOnboardingStatus | null
  loading: boolean
  error: Error | null
  /** Solo los administradores pueden cerrar la configuración inicial. */
  canComplete: boolean
  refresh: () => Promise<void>
  retry: () => Promise<void>
  complete: () => Promise<TenantOnboardingStatus>
}

/** Promesa en vuelo compartida para no duplicar la consulta entre guardas anidadas. */
let inflightStatus: Promise<TenantOnboardingStatus> | null = null

const loadSharedStatus = (): Promise<TenantOnboardingStatus> => {
  if (!inflightStatus) {
    inflightStatus = fetchTenantOnboardingStatus().finally(() => {
      inflightStatus = null
    })
  }
  return inflightStatus
}

/**
 * Lee el estado del onboarding desde el servidor (única fuente de verdad)
 * y expone el cierre para administradores. Los roles no administradores
 * pueden leer el estado pero no completar.
 */
export const useTenantOnboarding = (options: UseTenantOnboardingOptions = {}): TenantOnboardingState => {
  const { disabled = false } = options
  const role = useAuthStore((state) => state.role)
  const [status, setStatus] = useState<TenantOnboardingStatus | null>(null)
  const [loading, setLoading] = useState(() => !disabled)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (disabled) return
    setLoading(true)
    setError(null)
    try {
      const next = await loadSharedStatus()
      if (mountedRef.current) setStatus(next)
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err : new Error("No se pudo obtener el estado de configuración"))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [disabled])

  useEffect(() => {
    if (disabled) {
      setLoading(false)
      return
    }
    void refresh()
  }, [disabled, refresh])

  const complete = useCallback(async () => {
    const next = await completeTenantOnboarding()
    if (mountedRef.current) setStatus(next)
    return next
  }, [])

  return {
    status,
    loading,
    error,
    canComplete: isAdmin(role),
    refresh,
    retry: refresh,
    complete,
  }
}
