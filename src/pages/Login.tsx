import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import LoginForm from "../features/auth/components/LoginForm"
import ModalSuccess from "../features/auth/components/ModalSuccess"
import ModalError from "../features/forms/components/ModalError"
import { useLogin } from "../features/auth/hooks/useLogin"
import styles from "../features/auth/styles/login.module.css"
import { useAuthStore } from "../../src/store/authStore"
import { useTranslation } from "react-i18next"

const Login = () => {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const logoutMessage = useAuthStore((state) => state.logoutMessage)
  const setLogoutMessage = useAuthStore((state) => state.setLogoutMessage)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    document.title = t("login.titlePage")
    if (logoutMessage && location.pathname === "/") {
      setShowLogoutModal(true)
      setLogoutMessage(null)
    }
  }, [logoutMessage, location, setLogoutMessage, t, i18n.language])

  const {
    username,
    password,
    errors,
    showPassword,
    handleUsernameChange,
    handlePasswordChange,
    togglePasswordVisibility,
    handleSubmit,
    showModal,
    responseMessage,
    isError,
    closeModal,
  } = useLogin()

  return (
    <>
      <div className={styles.containerAuth}>
        <div className={styles.positionContent}>
          <div className={styles.heroMedia}>
            <div className={styles.heroOverlay}></div>
            <div className={styles.heroContent}>
              <div className={styles.heroTopSection}>
                <span className={styles.heroTagline}>{t("login.heroTagline", { defaultValue: "Gestión simplificada" })}</span>
                <h2 className={styles.heroTitle}>
                  {t("login.heroTitle", { defaultValue: "Comienza a gestionar tu mantenimiento" })}
                </h2>
                <p className={styles.heroSubtitle}>
                  {t("login.heroSubtitle", { defaultValue: "Completa estos simples pasos para acceder a tu cuenta." })}
                </p>
              </div>

              <div className={styles.heroSteps}>
                <div className={`${styles.stepCard} ${styles.stepCardActive}`}>
                  <div className={styles.stepNumber}>1</div>
                  <span className={styles.stepLabel}>{t("login.step1", { defaultValue: "Inicia sesión en tu cuenta" })}</span>
                </div>
                <div className={styles.stepCard}>
                  <div className={styles.stepNumber}>2</div>
                  <span className={styles.stepLabel}>{t("login.step2", { defaultValue: "Configura tu espacio de trabajo" })}</span>
                </div>
                <div className={styles.stepCard}>
                  <div className={styles.stepNumber}>3</div>
                  <span className={styles.stepLabel}>{t("login.step3", { defaultValue: "Gestiona tus operaciones" })}</span>
                </div>
              </div>

              <div className={styles.heroBrand}>
                Leonix — {t("login.heroBrandLine", { defaultValue: "Tu plataforma CMMS integral." })}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.positionForm}>
          <LoginForm
            username={username}
            password={password}
            errors={errors}
            showPassword={showPassword}
            handleUsernameChange={handleUsernameChange}
            handlePasswordChange={handlePasswordChange}
            togglePasswordVisibility={togglePasswordVisibility}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>

      <ModalSuccess isOpen={showModal && !isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalError isOpen={showModal && isError} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalSuccess
        isOpen={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
        mensaje="Sesión cerrada con éxito."
      />
    </>
  )
}

export default Login
