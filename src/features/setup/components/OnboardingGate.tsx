import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../../store/authStore"
import { isSuperAdmin } from "../../../shared/utils/roleUtils"
import { isOnboardingIncompleteError } from "../../../shared/services/tenantOnboardingService"
import { useTenantOnboarding } from "../hooks/useTenantOnboarding"
import { SETUP_PATH } from "../setupPaths"
import { OnboardingRequiredNotice } from "./OnboardingRequiredNotice"

interface OnboardingGateProps {
  children: ReactNode
  /** La ruta de setup nunca se redirige a sí misma. */
  skip?: boolean
}

/**
 * Guarda de acceso por configuración inicial obligatoria.
 * Se evalúa después de auth, billing_only y roles. El servidor decide:
 * - estado complete → deja pasar
 * - estado incomplete → redirige a la ruta fija de setup
 * - fallo de consulta → muestra reintento explícito y nunca concede acceso
 */
export const OnboardingGate = ({ children, skip = false }: OnboardingGateProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const role = useAuthStore((state) => state.role)
  const bypass = skip || isSuperAdmin(role) || location.pathname === SETUP_PATH
  const { status, loading, error, retry } = useTenantOnboarding({ disabled: bypass })

  if (bypass) return <>{children}</>

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label={t("setup.gate.loading", { defaultValue: "Verificando configuración inicial…" })}>
        {t("setup.gate.loading", { defaultValue: "Verificando configuración inicial…" })}
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert">
        <p>{t("setup.gate.loadError", { defaultValue: "No se pudo verificar la configuración inicial. Reintentá la conexión." })}</p>
        {isOnboardingIncompleteError(error) && <OnboardingRequiredNotice />}
        <button type="button" onClick={() => void retry()}>
          {t("setup.gate.retry", { defaultValue: "Reintentar" })}
        </button>
      </div>
    )
  }

  if (!status || status.status === "incomplete") {
    return <Navigate to={SETUP_PATH} replace />
  }

  return <>{children}</>
}
