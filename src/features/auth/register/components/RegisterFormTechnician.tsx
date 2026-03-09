import type React from "react"
import { useCallback } from "react"
import { FiEye, FiEyeOff } from "react-icons/fi"
import styles from "../styles/registerForm.module.css"
import formButtonStyles from "../../../../shared/components/Buttons/formButtons.module.css"
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

interface RegisterTechnicianFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onAdd: (data: { userName: string; fullName: string; password: string; confirmPassword: string }) => Promise<{ message: string }>
  formData: RegisterTechnicianFormData
  formErrors: Record<string, string>
  showPassword: boolean
  showConfirmPassword: boolean
  isFormComplete: boolean
  handleFieldChange: (name: string, value: string | File | null) => void
  handleFieldBlur: (fieldName: string) => void
  handleSubmitForm: (
    e: React.FormEvent,
    onSuccess: (message: string) => void,
    onAdd: (data: { userName: string; fullName: string; password: string; confirmPassword: string }) => Promise<{ message: string }>,
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
  handleFieldChange,
  handleFieldBlur,
  handleSubmitForm,
  isSubmitting,
  togglePasswordVisibility,
  toggleConfirmPasswordVisibility,
  shouldShowError,
}: RegisterTechnicianFormProps) => {
  const { t } = useTranslation()

  const fields = [
    { name: "username", label: t('personal.username'), type: "text", placeholder: t('personal.userNamePlaceholder') },
    { name: "firstName", label: t('personal.firstName'), type: "text", placeholder: t('personal.firstNamePlaceholder') },
    { name: "lastName", label: t('personal.lastName'), type: "text", placeholder: t('personal.lastNamePlaceholder') },
    { name: "email", label: t('personal.email'), type: "email", placeholder: t('personal.emailPlaceholder') },
    { name: "documento", label: t('personal.documento'), type: "text", placeholder: t('personal.documentoPlaceholder') },
    { name: "password", label: t('personal.password'), type: "password", placeholder: t('personal.passwordPlaceholder') },
    { name: "confirmPassword", label: t('personal.confirmPassword'), type: "password", placeholder: t('personal.confirmPasswordPlaceholder') },
  ]

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, files } = e.target
      if (name === "profilePhoto" && files && files[0]) {
        handleFieldChange(name, files[0])
      } else {
        handleFieldChange(name, value)
      }
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
  const isButtonDisabled = isSubmitting

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      handleSubmitForm(e, onSuccess, onAdd)
    },
    [handleSubmitForm, onSuccess, onAdd],
  )

  return (
    <form onSubmit={handleFormSubmit} className={styles.form}>
      <div className={styles.formInner}>
        {fields.map(({ name, label, type, placeholder }) => (
          <div className={styles.formGroup} key={name}>
            <label htmlFor={name}>
              {label} *
            </label>
            <div className={styles.inputWrapper}>
              <input
                type={getInputType(name, type)}
                id={name}
                name={name}
                value={formData[name as keyof RegisterTechnicianFormData] as string || ""}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                disabled={isSubmitting}
                placeholder={placeholder}
                className={shouldShowError(name) ? styles.errorInput : ""}
                autoComplete={name === "username" ? "username" : name === "email" ? "email" : "new-password"}
              />
              {type === "password" && (
                <button
                  type="button"
                  className={styles.eyesButton}
                  onClick={getToggleFunction(name)}
                  disabled={isSubmitting}
                  aria-label={
                    (name === "password" ? showPassword : showConfirmPassword)
                      ? t('personal.hidePassword')
                      : t('personal.showPassword')
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

        {/* Campo de foto de perfil */}
        <div className={styles.formGroup}>
          <label htmlFor="profilePhoto">
            {t('personal.profilePhoto')}
          </label>
          <div className={styles.inputWrapper}>
            <input
              type="file"
              id="profilePhoto"
              name="profilePhoto"
              accept="image/*"
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              disabled={isSubmitting}
              className={shouldShowError("profilePhoto") ? styles.errorInput : ""}
            />
          </div>
          {shouldShowError("profilePhoto") && <p className={styles.inputError}>{formErrors.profilePhoto}</p>}
          <p className={styles.fieldHint}>{t('personal.profilePhotoHint')}</p>
        </div>

        {formErrors.general && (
          <div className={styles.alertDanger}>
            <strong>{t('common.error')}:</strong> {formErrors.general}
          </div>
        )}

      </div>
      <div className={formButtonStyles.actions}>
        <button type="button" onClick={onCancel} disabled={isSubmitting} className={formButtonStyles.cancelButton}>
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={formButtonStyles.submitButton}
        >
          {isSubmitting ? (
            <>
              <div className={styles.buttonSpinner}></div>
              {t('personal.registering')}
            </>
          ) : (
            t('personal.createTechnician')
          )}
        </button>
      </div>
    </form>
  )
}

export default RegisterTechnicianForm

