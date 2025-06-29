"use client"

import type { loginFormProps } from "../types/loginForm.types"
import styles from "../styles/loginForm.module.css"
import { FiEye, FiEyeOff } from "react-icons/fi"

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
  return (
    <div className={styles.containerForm}>
      <h1>Inicia sesión</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username555">Usuario</label>
        <div className={styles.inputWrapper}>
          <input type="text" id="username" value={username} onChange={(e) => handleUsernameChange(e.target.value)} />
        </div>
        {errors.userName && <p className={styles.inputError}>{errors.userName}</p>}

        <label htmlFor="password">Contraseña</label>
        <div className={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            id="password"
            className={styles.passwordInput}
          />
          <button type="button" className={styles.eyesButton} onClick={togglePasswordVisibility}>
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.password && <p className={styles.inputError}>{errors.password}</p>}

        <button type="submit">Iniciar sesión</button>
        {errors.general && <div className={styles.alertDanger}>{errors.general}</div>}
      </form>
    </div>
  )
}

export default LoginForm
