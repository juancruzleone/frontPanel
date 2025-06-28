// useLogin.ts
import { useState } from "react"
import { userLogin } from "../services/loginServices"
import { validateLoginForm } from "../validators/loginValidations"
import { useAuthStore } from "../../../../src/store/authStore.ts"

export function useLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")

  const setUserStore = useAuthStore((state) => state.setUser)
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = await validateLoginForm({ userName: username, password })

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      const response = await userLogin(username, password)
      setResponseMessage(response?.message || "Login exitoso.")
      setUserStore(response.cuenta.userName, response.token)
      setShowModal(true)
    } catch (err: any) {
      setErrors({ general: err.message })
    }
  }

  const closeModal = () => {
    setShowModal(false)
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
    closeModal,
  }
}
