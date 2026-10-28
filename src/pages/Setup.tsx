import { Suspense, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { LogOut } from "lucide-react"
import { SetupWizard } from "../features/setup/components/SetupWizard"
import Skeleton from "../shared/components/Skeleton"
import { useAuthStore } from "../store/authStore"
import styles from "../features/setup/styles/setupWizard.module.css"

/**
 * Página del asistente de configuración inicial obligatoria.
 * Vive en la ruta fija no traducida y fuera de MainLayout: la guarda
 * de onboarding nunca la redirige a sí misma.
 */
const Setup = () => {
  const { t } = useTranslation()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    document.title = t("setup.page.title", { defaultValue: "Configuración inicial" })
  }, [t])

  return (
    <div className={styles.setupPageContainer}>
      <header className={styles.setupTopNav}>
        <div className={styles.brandContainer}>
          <img src="/logo leonix 5.svg" alt="Leonix" className={styles.brandLogo} />
          <span className={styles.brandTitle}>Leonix</span>
          <span className={styles.brandBadge}>Setup</span>
        </div>
        <div className={styles.userActions}>
          {user && <span className={styles.userEmail}>{user}</span>}
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => void logout()}
            title={t("nav.logout", { defaultValue: "Cerrar sesión" })}
          >
            <LogOut size={14} />
            <span>{t("nav.logout", { defaultValue: "Cerrar sesión" })}</span>
          </button>
        </div>
      </header>

      <main className={styles.setupMain}>
        <div className={styles.setupCard}>
          <div className={styles.setupHeader}>
            <div className={styles.headerKicker}>
              <span>{t("setup.page.title", { defaultValue: "Configuración inicial" })}</span>
            </div>
            <h1 className={styles.heading}>
              {t("setup.page.heading", { defaultValue: "Configuración inicial obligatoria" })}
            </h1>
            <p className={styles.intro}>
              {t("setup.page.intro", { defaultValue: "Completá estos pasos en orden para habilitar el acceso al sistema." })}
            </p>
          </div>

          <Suspense fallback={<Skeleton />}>
            <SetupWizard />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export default Setup
