import type React from "react"
import { useEffect, useCallback } from "react"
import RegisterTechnicianForm from "./RegisterFormTechnician"
import useRegisterTechnician from "../hooks/useRegisterTechnician"
import styles from "../styles/Modal.module.css"
import { FiUserPlus } from "react-icons/fi"
import { useTranslation } from "react-i18next"

interface ModalRegisterTechnicianProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  onAdd: (username: string, password: string, fullName: string) => Promise<{ message: string }>
}

const ModalRegisterTechnician = ({ isOpen, onRequestClose, onSubmitSuccess, onAdd }: ModalRegisterTechnicianProps) => {
  const { t } = useTranslation()
  const {
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
  } = useRegisterTechnician()

  const handleClose = useCallback(() => {
    resetForm()
    onRequestClose()
  }, [resetForm, onRequestClose])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose()
      }
    },
    [handleClose],
  )

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetForm()
      setFormErrors({})
    }
  }, [isOpen, resetForm, setFormErrors])

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={handleModalClick}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div>
              <h2 className={styles.title}>{t('personal.registerNewTechnician')}</h2>
              <p className={styles.subtitle}>{t('personal.completeInformation')}</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={handleClose} disabled={isSubmitting} type="button">
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <RegisterTechnicianForm
            onCancel={handleClose}
            onSuccess={onSubmitSuccess}
            onAdd={onAdd}
            formData={formData}
            formErrors={formErrors}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            isFormComplete={isFormComplete}
            handleFieldChange={handleFieldChange}
            handleFieldBlur={handleFieldBlur}
            handleSubmitForm={handleSubmitForm}
            isSubmitting={isSubmitting}
            togglePasswordVisibility={togglePasswordVisibility}
            toggleConfirmPasswordVisibility={toggleConfirmPasswordVisibility}
            shouldShowError={shouldShowError}
          />
        </div>
      </div>
    </div>
  )
}

export default ModalRegisterTechnician
