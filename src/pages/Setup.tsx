import { Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { SetupWizard } from "../features/setup/components/SetupWizard"
import Skeleton from "../shared/components/Skeleton"

/**
 * Página del asistente de configuración inicial obligatoria.
 * Vive en la ruta fija no traducida y fuera de MainLayout: la guarda
 * de onboarding nunca la redirige a sí misma.
 */
const Setup = () => {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t("setup.page.title", { defaultValue: "Configuración inicial" })
  }, [t])

  return (
    <main>
      <h1>{t("setup.page.heading", { defaultValue: "Configuración inicial obligatoria" })}</h1>
      <p>{t("setup.page.intro", { defaultValue: "Completá estos pasos en orden para habilitar el acceso al sistema." })}</p>
      <Suspense fallback={<Skeleton />}>
        <SetupWizard />
      </Suspense>
    </main>
  )
}

export default Setup
