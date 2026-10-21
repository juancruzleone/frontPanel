import type { loginFormProps } from "../types/loginForm.types"
import styles from "../styles/loginForm.module.css"
import { FiEye, FiEyeOff } from "react-icons/fi"
import { useTranslation } from "react-i18next"
import { useSocialLogin } from "../hooks/useSocialLogin"
import LanguageSelector from "../../../shared/components/Buttons/LanguageSelector"
import ThemeToggle from "../../../shared/components/Buttons/ThemeToggle"

/** Official Google "G" mark: multicolor paths, no external asset required. */
const GoogleIcon = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false" className={styles.socialIconSvg}>
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
  </svg>
)

/** Official Microsoft mark: four brand squares. */
const MicrosoftIcon = () => (
  <svg viewBox="0 0 21 21" aria-hidden="true" focusable="false" className={styles.socialIconSvg}>
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
)

const LoginForm = ({
  username,
  password,
  errors,
  showPassword,
  handleUsernameChange,
  handlePasswordChange,
  togglePasswordVisibility,
  handleSubmit,
}: loginFormProps) => {
  const { t } = useTranslation()
  const {
    pendingProvider,
    isRedirecting,
    errorMessageKey,
    startLogin,
  } = useSocialLogin()

  const providerName = pendingProvider === "microsoft" ? "Microsoft" : "Google"

  return (
    <div className={styles.containerForm}>
      <form onSubmit={handleSubmit} className={styles.formLogin}>
        <div className={styles.formTopControls}>
          <LanguageSelector direction="down" />
          <ThemeToggle />
        </div>
        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>{t("login.title")}</h1>
          <p className={styles.formSubtitle}>
            {t("login.panelSubtitle", { defaultValue: "Accede al panel CMMS para gestionar mantenimiento y operaciones." })}
          </p>
        </div>
        <label htmlFor="username" className={styles.formLabel}>{t("login.username")}</label>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            id="username"
            className={styles.loginInput}
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder={t("login.usernamePlaceholder")}
          />
        </div>
        {errors.userName && <p className={styles.inputError}>{errors.userName}</p>}

        <label htmlFor="password" className={styles.formLabel}>{t("login.password")}</label>
        <div className={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            id="password"
            className={styles.loginInput}
            placeholder={t("login.passwordPlaceholder")}
          />
          <button
            type="button"
            className={styles.eyesButton}
            onClick={togglePasswordVisibility}
            aria-label={t(showPassword ? "login.hidePassword" : "login.showPassword")}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.password && <p className={styles.inputError}>{errors.password}</p>}

        <button type="submit" className={styles.submitButton}>{t("login.submit")}</button>
        {errors.general && <div className={styles.alertDanger}>{errors.general}</div>}

        <div className={styles.divider}>
          <span className={styles.dividerLabel}>{t("auth.oauth.divider")}</span>
        </div>
        <button
          type="button"
          className={styles.socialButton}
          onClick={() => startLogin("google")}
          disabled={isRedirecting}
          aria-busy={pendingProvider === "google"}
        >
          <GoogleIcon />
          <span>{t("auth.oauth.google")}</span>
        </button>
        <button
          type="button"
          className={styles.socialButton}
          onClick={() => startLogin("microsoft")}
          disabled={isRedirecting}
          aria-busy={pendingProvider === "microsoft"}
        >
          <MicrosoftIcon />
          <span>{t("auth.oauth.microsoft")}</span>
        </button>
        {isRedirecting && (
          <p role="status" aria-live="polite" className={styles.formSubtitle}>
            {t("auth.oauth.redirecting", { provider: providerName })}
          </p>
        )}
        {errorMessageKey && <div role="alert" className={styles.alertDanger}>{t(errorMessageKey)}</div>}
      </form>
    </div>
  )
}

export default LoginForm
