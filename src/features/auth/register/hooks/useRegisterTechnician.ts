import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { validateRegisterForm, validateField, validateRegisterFormWithTranslation, validateFieldWithTranslation } from "../validators/registerValidations"
import { useTranslation } from "react-i18next"

interface RegisterTechnicianFormData {
  username: string
  password: string
  confirmPassword: string
}

const useRegisterTechnician = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<RegisterTechnicianFormData>({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  // Verificar si el formulario está completo
  const isFormComplete = useMemo(() => {
    return formData.username.trim() !== "" && formData.password.trim() !== "" && formData.confirmPassword.trim() !== ""
  }, [formData.username, formData.password, formData.confirmPassword])

  // Verificar si el formulario es válido (sin errores)
  const isFormValid = useMemo(() => {
    return isFormComplete && Object.keys(formErrors).length === 0
  }, [isFormComplete, formErrors])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev)
  }, [])

  // Validación individual de campo
  const validateSingleField = useCallback(
    async (fieldName: string, value: string) => {
      const mappedFieldName = fieldName === "username" ? "userName" : fieldName

      const validationData = {
        userName: fieldName === "username" ? value : formData.username,
        password: fieldName === "password" ? value : formData.password,
        confirmPassword: fieldName === "confirmPassword" ? value : formData.confirmPassword,
      }

      const result = await validateFieldWithTranslation(mappedFieldName, value, validationData, t)

      setFormErrors((prev) => {
        const newErrors = { ...prev }
        if (result.isValid) {
          delete newErrors[fieldName]
        } else {
          newErrors[fieldName] = result.error || "Error de validación"
        }
        return newErrors
      })
    },
    [formData, t],
  )

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }))

      // Limpiar error inmediatamente cuando el usuario empieza a escribir
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    },
    [formErrors],
  )

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      setTouchedFields((prev) => ({ ...prev, [fieldName]: true }))

      const value = formData[fieldName as keyof RegisterTechnicianFormData]
      validateSingleField(fieldName, value ?? "")
    },
    [formData, validateSingleField],
  )

  const handleSubmitForm = useCallback(
    async (
      e: React.FormEvent,
      onSuccess: (message: string) => void,
      onAdd: (username: string, password: string) => Promise<{ message: string }>,
    ) => {
      e.preventDefault()

      // Marcar todos los campos como tocados
      setTouchedFields({
        username: true,
        password: true,
        confirmPassword: true,
      })

      // Verificar que el formulario esté completo antes de proceder
      if (!isFormComplete) {
        return
      }

      setIsSubmitting(true)

      try {
        const validation = await validateRegisterFormWithTranslation({
          userName: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }, t)

        if (!validation.isValid) {
          setFormErrors(validation.errors)
          setIsSubmitting(false)
          return
        }

        const result = await onAdd(formData.username, formData.password)
        onSuccess(result.message)
        resetForm()
      } catch (err: any) {
        setFormErrors({ general: err.message })
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, isFormComplete],
  )

  const resetForm = useCallback(() => {
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
    })
    setFormErrors({})
    setTouchedFields({})
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [])

  // Función corregida que retorna boolean
  const shouldShowError = useCallback(
    (fieldName: string): boolean => {
      return Boolean(touchedFields[fieldName] && formErrors[fieldName])
    },
    [touchedFields, formErrors],
  )

  return {
    formData,
    formErrors,
    showPassword,
    showConfirmPassword,
    isFormComplete,
    isFormValid,
    touchedFields,
    handleFieldChange,
    handleFieldBlur,
    handleSubmitForm,
    isSubmitting,
    resetForm,
    setFormErrors,
    togglePasswordVisibility,
    toggleConfirmPasswordVisibility,
    shouldShowError,
  }
}

export default useRegisterTechnician
