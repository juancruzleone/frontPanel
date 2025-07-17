import type React from "react"

// useLogin.ts
import { useState, useEffect } from "react"
import { userLogin } from "../services/loginServices"
import { validateLoginForm } from "../validators/loginValidations"
import { useAuthStore } from "../../../../src/store/authStore.ts"
import { useTranslation } from "react-i18next"

export function useLogin() {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)

  const setUserStore = useAuthStore((state) => state.setUser)
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  // Limpiar error de usuario al escribir
  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setErrors((prev) => {
      if (prev.userName && value.trim() !== "") {
        const { userName, ...rest } = prev
        return rest
      }
      return prev
    })
  }

  // Limpiar error de contraseña al escribir
  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setErrors((prev) => {
      if (prev.password && value.trim() !== "") {
        const { password, ...rest } = prev
        return rest
      }
      return prev
    })
  }

  // Revalidar errores al cambiar de idioma
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      validateLoginForm({ userName: username, password }, t).then((validation) => {
        if (!validation.isValid) {
          setErrors(validation.errors)
        } else {
          setErrors({})
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = await validateLoginForm({ userName: username, password }, t)

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      const response = await userLogin(username, password)
      setResponseMessage(response?.message || "Login exitoso.")
      setIsError(false)
      setUserStore(response.cuenta.userName, response.token, response.cuenta.role) // <-- PASAR ROL
      setShowModal(true)
    } catch (err: any) {
      setResponseMessage(err.message || "Error al iniciar sesión")
      setIsError(true)
      setShowModal(true)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setIsError(false)
    setAuthenticated(true)
  }

  return {
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
  }
}
