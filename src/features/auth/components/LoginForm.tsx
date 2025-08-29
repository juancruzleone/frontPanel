import type { loginFormProps } from "../types/loginForm.types"
import styles from "../styles/loginForm.module.css"
import { FiEye, FiEyeOff } from "react-icons/fi"
import { useTranslation } from "react-i18next"
import LanguageSelector from "../../../shared/components/Buttons/LanguageSelector"
import ThemeToggle from "../../../shared/components/Buttons/ThemeToggle"

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

  return (
    <div className={styles.containerForm}>
      <form onSubmit={handleSubmit} className={styles.formLogin}>
        <div className={styles.formTopControls}>
          <LanguageSelector />
          <ThemeToggle />
        </div>
        <h1>{t("login.title")}</h1>
        <label htmlFor="username">{t("login.username")}</label>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder={t("login.usernamePlaceholder")}
          />
        </div>
        {errors.userName && <p className={styles.inputError}>{errors.userName}</p>}

        <label htmlFor="password">{t("login.password")}</label>
        <div className={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            id="password"
            className={styles.passwordInput}
            placeholder={t("login.passwordPlaceholder")}
          />
          <button type="button" className={styles.eyesButton} onClick={togglePasswordVisibility}>
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.password && <p className={styles.inputError}>{errors.password}</p>}

        <button type="submit">{t("login.submit")}</button>
        {errors.general && <div className={styles.alertDanger}>{errors.general}</div>}
      </form>
    </div>
  )
}

export default LoginForm
