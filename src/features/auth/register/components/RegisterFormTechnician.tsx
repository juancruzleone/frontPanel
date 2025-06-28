"use client"

import type React from "react"
import { useCallback } from "react"
import { FiEye, FiEyeOff, FiUser, FiLock, FiShield, FiUserPlus } from "react-icons/fi"
import styles from "../styles/registerForm.module.css"

interface RegisterTechnicianFormData {
  username: string
  password: string
  confirmPassword: string
}

interface RegisterTechnicianFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onAdd: (username: string, password: string) => Promise<{ message: string }>
  formData: RegisterTechnicianFormData
  formErrors: Record<string, string>
  showPassword: boolean
  showConfirmPassword: boolean
  isFormComplete: boolean
  isFormValid: boolean
  touchedFields: Record<string, boolean>
  handleFieldChange: (name: string, value: string) => void
  handleFieldBlur: (fieldName: string) => void
  handleSubmitForm: (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onAdd: (username: string, password: string) => Promise<{ message: string }>,
  ) => void
  isSubmitting: boolean
  togglePasswordVisibility: () => void
  toggleConfirmPasswordVisibility: () => void
  shouldShowError: (fieldName: string) => boolean
}

const RegisterTechnicianForm = ({
  onCancel,
  onSuccess,
  onAdd,
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
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  shouldShowError,
}: RegisterTechnicianFormProps) => {
  const fields = [
    { name: "username", label: "Usuario", type: "text", icon: FiUser },
    { name: "password", label: "Contraseña", type: "password", icon: FiLock },
    { name: "confirmPassword", label: "Confirmar Contraseña", type: "password", icon: FiShield },
  ]

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target
      handleFieldChange(name, value)
    },
    [handleFieldChange],
  )

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name } = e.target
      handleFieldBlur(name)
    },
    [handleFieldBlur],
  )

  const getInputType = useCallback(
    (fieldName: string, originalType: string) => {
      if (originalType !== "password") return originalType
      if (fieldName === "password") return showPassword ? "text" : "password"
      if (fieldName === "confirmPassword") return showConfirmPassword ? "text" : "password"
      return originalType
    },
    [showPassword, showConfirmPassword],
  )

  const getToggleFunction = useCallback(
    (fieldName: string) => {
      if (fieldName === "password") return togglePasswordVisibility
      if (fieldName === "confirmPassword") return toggleConfirmPasswordVisibility
      return undefined
    },
    [togglePasswordVisibility, toggleConfirmPasswordVisibility],
  )

  const getPasswordIcon = useCallback(
    (fieldName: string) => {
      if (fieldName === "password") return showPassword ? FiEyeOff : FiEye
      if (fieldName === "confirmPassword") return showConfirmPassword ? FiEyeOff : FiEye
      return FiEye
    },
    [showPassword, showConfirmPassword],
  )

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = isSubmitting || !isFormComplete

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      handleSubmitForm(e, onSuccess, onAdd)
    },
    [handleSubmitForm, onSuccess, onAdd],
  )

  return (
    <form onSubmit={handleFormSubmit} className={styles.form}>
      <div className={styles.formInner}>
        {fields.map(({ name, label, type, icon: Icon }) => (
          <div className={styles.formGroup} key={name}>
            <label htmlFor={name}>
              <Icon size={16} />
              {label}
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={getInputType(name, type)}
                id={name}
                name={name}
                value={formData[name as keyof RegisterTechnicianFormData] || ""}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                disabled={isSubmitting}
                placeholder={`Ingrese ${label.toLowerCase()}`}
                className={shouldShowError(name) ? styles.errorInput : ""}
                autoComplete={name === "username" ? "username" : "new-password"}
              />
              {type === "password" && (
                <button
                  type="button"
                  className={styles.eyesButton}
                  onClick={getToggleFunction(name)}
                  disabled={isSubmitting}
                  aria-label={
                    (name === "password" ? showPassword : showConfirmPassword)
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {(() => {
                    const IconComponent = getPasswordIcon(name)
                    return <IconComponent size={18} />
                  })()}
                </button>
              )}
            </div>
            {shouldShowError(name) && <p className={styles.inputError}>{formErrors[name]}</p>}
          </div>
        ))}

        {formErrors.general && (
          <div className={styles.alertDanger}>
            <strong>Error:</strong> {formErrors.general}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className={styles.cancelButton}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`${styles.submitButton} ${isButtonDisabled ? styles.submitButtonDisabled : ""}`}
        >
          {isSubmitting ? (
            <>
              <div className={styles.buttonSpinner}></div>
              Registrando...
            </>
          ) : (
            <>
              <FiUserPlus size={16} />
              {!isFormComplete ? "Complete todos los campos" : "Registrar Técnico"}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default RegisterTechnicianForm
