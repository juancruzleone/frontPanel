import type React from "react"
import { useState, useMemo, useCallback } from "react"
import { validateRegisterForm, validateField, validateRegisterFormWithTranslation, validateFieldWithTranslation } from "../validators/registerValidations"
import { useTranslation } from "react-i18next"

interface RegisterTechnicianFormData {
  username: string
  firstName: string
  lastName: string
  email: string
  documento: string
  profilePhoto?: File | null
  password: string
  confirmPassword: string
}

const useRegisterTechnician = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<RegisterTechnicianFormData>({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    documento: "",
    profilePhoto: null,
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
    return (
      formData.username.trim() !== "" &&
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.documento.trim() !== "" &&
      formData.password.trim() !== "" &&
      formData.confirmPassword.trim() !== ""
    )
  }, [formData])

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
    async (fieldName: string, value: string | File | null) => {
      // Saltar validación para el campo de foto
      if (fieldName === "profilePhoto") {
        return
      }

      // No necesitamos mapear fieldName porque ya coinciden con el esquema de validación
      const validationData = {
        userName: fieldName === "username" ? (value as string) : formData.username,
        firstName: fieldName === "firstName" ? (value as string) : formData.firstName,
        lastName: fieldName === "lastName" ? (value as string) : formData.lastName,
        fullName: `${fieldName === "firstName" ? (value as string) : formData.firstName} ${fieldName === "lastName" ? (value as string) : formData.lastName}`.trim(),
        email: fieldName === "email" ? (value as string) : formData.email,
        documento: fieldName === "documento" ? (value as string) : formData.documento,
        password: fieldName === "password" ? (value as string) : formData.password,
        confirmPassword: fieldName === "confirmPassword" ? (value as string) : formData.confirmPassword,
      }

      // Mapear el nombre del campo para la validación
      const mappedFieldName = fieldName === "username" ? "userName" : fieldName

      const result = await validateFieldWithTranslation(mappedFieldName, value as string, validationData, t)

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
    (name: string, value: string | File | null) => {
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

      const value = formData[fieldName as keyof typeof formData]
      validateSingleField(fieldName, value ?? "")
    },
    [formData, validateSingleField],
  )

  const resetForm = useCallback(() => {
    setFormData({
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      documento: "",
      profilePhoto: null,
      password: "",
      confirmPassword: "",
    })
    setFormErrors({})
    setTouchedFields({})
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [])

  const handleSubmitForm = useCallback(
    async (
      e: React.FormEvent,
      onSuccess: (message: string) => void,
      onAdd: (data: { userName: string; fullName: string; password: string; confirmPassword: string }) => Promise<{ message: string }>,
    ) => {
      e.preventDefault()

      // Marcar todos los campos como tocados
      setTouchedFields({
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        documento: true,
        password: true,
        confirmPassword: true,
      })

      // Verificar que el formulario esté completo antes de proceder
      if (!isFormComplete) {
        // Validar cada campo individualmente para mostrar errores específicos
        const validationPromises = Object.keys(formData)
          .filter(key => key !== "profilePhoto")
          .map(async (fieldName) => {
            const value = formData[fieldName as keyof typeof formData]
            await validateSingleField(fieldName, value ?? "")
          })
        await Promise.all(validationPromises)
        return
      }

      setIsSubmitting(true)

      try {
        const validation = await validateRegisterFormWithTranslation({
          userName: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          documento: formData.documento,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }, t)

        if (!validation.isValid) {
          setFormErrors(validation.errors)
          setIsSubmitting(false)
          return
        }

        // Pasar los datos como objeto incluyendo email, documento y foto
        const submitData = {
          userName: formData.username,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          email: formData.email,
          documento: formData.documento,
          profilePhoto: formData.profilePhoto,
        }

        const result = await onAdd(submitData)
        onSuccess(result.message)
        resetForm()
      } catch (err: any) {
        setFormErrors({ general: err.message })
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, isFormComplete, t, validateSingleField, resetForm],
  )

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
