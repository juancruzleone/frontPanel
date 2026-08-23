import { useEffect, useState } from "react"
import { useLocation } from "react-router"
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
            <div className={styles.heroContent}>
              <div className={styles.heroBrandLockup}>
                <img className={styles.heroLogo} src="/logo leonix 5.svg" alt="" />
                <div>
                  <span className={styles.brandName}>Leonix</span>
                  <span className={styles.productName}>{t("login.logoText", { defaultValue: "GMAO" })}</span>
                </div>
              </div>

              <div className={styles.heroMessage}>
                <span className={styles.heroTagline}>{t("login.heroTagline", { defaultValue: "Gestión simplificada" })}</span>
                <h2 className={styles.heroTitle}>
                  {t("login.heroTitle", { defaultValue: "Comienza a gestionar tu mantenimiento" })}
                </h2>
                <p className={styles.heroSubtitle}>
                  {t("login.heroSubtitle", { defaultValue: "Completa estos simples pasos para acceder a tu cuenta." })}
                </p>
              </div>

              <ul className={styles.operationalAreas}>
                <li>{t("nav.workOrders")}</li>
                <li>{t("nav.maintenancePlan")}</li>
                <li>{t("nav.assets")}</li>
              </ul>

              <p className={styles.heroBrandLine}>
                {t("login.heroBrandLine", { defaultValue: "Tu plataforma CMMS integral." })}
              </p>
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
