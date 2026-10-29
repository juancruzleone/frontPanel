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
  /** force=false usa la caché fresca entre navegaciones (S6); por defecto fuerza. */
  refresh: (force?: boolean) => Promise<void>
  retry: (force?: boolean) => Promise<void>
  complete: () => Promise<TenantOnboardingStatus>
}

/** Promesa en vuelo compartida para no duplicar la consulta entre guardas anidadas. */
let inflightStatus: Promise<TenantOnboardingStatus> | null = null

/**
 * S6: caché breve del estado entre navegaciones. Cada ruta protegida monta
 * su propio OnboardingGate; sin caché cada navegación re-consultaba
 * tenant/onboarding. TTL corto: el servidor sigue siendo la fuente de
 * verdad (refresh forzado y complete() invalidan).
 */
const STATUS_TTL_MS = 45_000
let cachedStatus: { at: number; value: TenantOnboardingStatus } | null = null

export const __resetOnboardingStatusCache = (): void => {
  inflightStatus = null
  cachedStatus = null
}

const loadSharedStatus = (force = false): Promise<TenantOnboardingStatus> => {
  if (!force && cachedStatus && Date.now() - cachedStatus.at < STATUS_TTL_MS) {
    return Promise.resolve(cachedStatus.value)
  }
  if (!inflightStatus) {
    inflightStatus = fetchTenantOnboardingStatus()
      .then((next) => {
        cachedStatus = { at: Date.now(), value: next }
        return next
      })
      .finally(() => {
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

  const refresh = useCallback(async (force = true) => {
    if (disabled) return
    setLoading(true)
    setError(null)
    try {
      const next = await loadSharedStatus(force)
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
    // Montaje del gate: usa caché si está fresca (S6); reintentos y
    // mutaciones usan refresh() forzado.
    void refresh(false)
  }, [disabled, refresh])

  const complete = useCallback(async () => {
    const next = await completeTenantOnboarding()
    cachedStatus = { at: Date.now(), value: next }
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
