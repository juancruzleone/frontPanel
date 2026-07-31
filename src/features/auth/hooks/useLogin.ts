import type React from "react"

// useLogin.ts
import { useState, useEffect } from "react"
import { userLogin } from "../services/loginServices"
import { validateLoginForm } from "../validators/loginValidations"
import { useAuthStore } from "@/store/authStore"
import { useCSRFStore } from "@/store/csrfStore"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

export function useLogin() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // Use named actions from store
  const login = useAuthStore((state) => state.login)
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)
  const role = useAuthStore((state) => state.role)
  const fetchCsrfToken = useCSRFStore((state) => state.fetchToken)

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
      
      // El backend devuelve 'cuenta' en lugar de 'user'
      const user = response.user || response.cuenta;
      
      // Validar que la respuesta tenga la estructura esperada
      if (!user) {
        throw new Error('Respuesta del servidor inválida');
      }
      
      // Guardar los datos del usuario pero NO autenticar todavía
      login(response)
      
      // Fetch CSRF token after successful login
      await fetchCsrfToken()
      
      // Establecer el estado del modal
      setIsError(false)
      setResponseMessage(t('auth.loginSuccess'))
      setShowModal(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión"
      setIsError(true)
      setResponseMessage(message)
      setShowModal(true)
    }
  }

  const closeModal = () => {
    const wasError = isError // Guardar el estado antes de resetearlo
    setShowModal(false)
    setIsError(false)
    // Solo marcar como autenticado y redirigir si no fue un error
    if (!wasError) {
      setAuthenticated(true)
      // Redirigir después de cerrar el modal de éxito
      setTimeout(() => {
        // Si es cliente, redirigir a instalaciones, sino a inicio
        if (role === 'cliente') {
          navigate("/instalaciones", { replace: true })
        } else {
          navigate("/inicio", { replace: true })
        }
      }, 100)
    }
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
    shouldRedirect,
  }
}
