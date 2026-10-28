/**
 * Ruta fija (sin traducir) del asistente de configuración inicial obligatoria.
 * Se registra una sola vez fuera de los bucles de rutas traducidas, siguiendo
 * el precedente de BillingRoute y del callback de OAuth.
 */
import type { OnboardingCheckKey } from "../../shared/services/tenantOnboardingService"

export const SETUP_PATH = "/configuracion-inicial" as const

/** Orden obligatorio de la configuración inicial (S2). */
export const SETUP_STEP_ORDER: OnboardingCheckKey[] = [
  "company",
  "installationTypes",
  "deviceCategories",
  "formCategories",
  "maintenanceTemplate",
]
