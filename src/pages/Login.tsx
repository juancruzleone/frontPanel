"use client"

import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import LoginForm from "../features/auth/components/LoginForm"
import ModalSuccess from "../features/auth/components/ModalSuccess"
import { useLogin } from "../features/auth/hooks/useLogin"
import styles from "../features/auth/styles/login.module.css"
import { useAuthStore } from "../../src/store/authStore"

const Login = () => {
  const location = useLocation()
  const logoutMessage = useAuthStore((state) => state.logoutMessage)
  const setLogoutMessage = useAuthStore((state) => state.setLogoutMessage)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    document.title = "Iniciar sesión | LeoneSuite"
    // Mostrar modal solo si hay mensaje y estamos efectivamente en el login
    if (logoutMessage && location.pathname === "/") {
      setShowLogoutModal(true)
      setLogoutMessage(null)
    }
  }, [logoutMessage, location, setLogoutMessage])

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
    closeModal,
  } = useLogin()

  return (
    <>
      <div className={styles.containerAuth}>
        <div className={styles.positionContent}></div>
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
      <ModalSuccess isOpen={showModal} onRequestClose={closeModal} mensaje={responseMessage} />
      <ModalSuccess
        isOpen={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
        mensaje="Sesión cerrada con éxito."
      />
    </>
  )
}

export default Login
