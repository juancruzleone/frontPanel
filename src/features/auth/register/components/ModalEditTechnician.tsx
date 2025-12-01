import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { updateTechnician } from "../services/registerServices"
import { useAuthStore } from "../../../../store/authStore"
import styles from "../styles/Modal.module.css"
import buttonStyles from "../../../../shared/components/Buttons/formButtons.module.css"

interface ModalEditTechnicianProps {
  isOpen: boolean
  onRequestClose: () => void
  onSubmitSuccess: (message: string) => void
  technician: any
}

const ModalEditTechnician = ({
  isOpen,
  onRequestClose,
  onSubmitSuccess,
  technician,
}: ModalEditTechnicianProps) => {
  const { t } = useTranslation()
  const token = useAuthStore((state) => state.token)

  const [userName, setUserName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (technician) {
      setUserName(technician.userName || "")
      setName(technician.name || "")
      setEmail(technician.email || "")
      setPassword("")
      setConfirmPassword("")
    }
  }, [technician])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validaciones
    if (!userName.trim()) {
      setError(t('personal.userNameRequired', { defaultValue: 'El nombre de usuario es requerido' }))
      return
    }

    if (userName.length < 4) {
      setError(t('personal.userNameMinLength', { defaultValue: 'El nombre de usuario debe tener al menos 4 caracteres' }))
      return
    }

    if (password && password.length < 6) {
      setError(t('personal.passwordMinLength', { defaultValue: 'La contraseña debe tener al menos 6 caracteres' }))
      return
    }

    if (password && password !== confirmPassword) {
      setError(t('personal.passwordsDoNotMatch', { defaultValue: 'Las contraseñas no coinciden' }))
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        userName: userName.trim(),
      }

      if (name.trim()) {
        updateData.name = name.trim()
      }

      if (email.trim()) {
        updateData.email = email.trim()
      }

      // Solo incluir password si se está cambiando
      if (password) {
        updateData.password = password
      }

      await updateTechnician(technician._id || technician.id, updateData, token)

      onSubmitSuccess(t('personal.technicianUpdated', { defaultValue: 'Técnico actualizado exitosamente' }))
      onRequestClose()
    } catch (err: any) {
      setError(err.message || t('personal.errorUpdatingTechnician', { defaultValue: 'Error al actualizar el técnico' }))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setPassword("")
    setConfirmPassword("")
    onRequestClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {t('personal.editTechnician', { defaultValue: 'Editar Técnico' })}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label htmlFor="userName" className={styles.label}>
                {t('personal.userName', { defaultValue: 'Nombre de Usuario' })} *
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={styles.input}
                placeholder={t('personal.userNamePlaceholder', { defaultValue: 'Ingrese nombre de usuario' })}
                required
                minLength={4}
                pattern="[a-zA-Z0-9_]+"
                title={t('personal.userNamePattern', { defaultValue: 'Solo letras, números y guiones bajos' })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                {t('personal.fullName', { defaultValue: 'Nombre Completo' })}
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder={t('personal.fullNamePlaceholder', { defaultValue: 'Ingrese nombre completo' })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                {t('personal.email', { defaultValue: 'Email' })}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder={t('personal.emailPlaceholder', { defaultValue: 'Ingrese email' })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                {t('personal.newPassword', { defaultValue: 'Nueva Contraseña' })}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder={t('personal.passwordPlaceholder', { defaultValue: 'Dejar en blanco para no cambiar' })}
                minLength={6}
              />
              <small style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', display: 'block' }}>
                {t('personal.passwordHint', { defaultValue: 'Dejar en blanco si no desea cambiar la contraseña' })}
              </small>
            </div>

            {password && (
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  {t('personal.confirmPassword', { defaultValue: 'Confirmar Contraseña' })} *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  placeholder={t('personal.confirmPasswordPlaceholder', { defaultValue: 'Confirme la nueva contraseña' })}
                  required={!!password}
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div style={{ padding: '12px', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c00', marginBottom: '16px' }}>
                {error}
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? t('common.updating', { defaultValue: 'Actualizando...' })
                : t('common.update', { defaultValue: 'Actualizar' })}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={buttonStyles.cancelButton}
              disabled={loading}
            >
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEditTechnician
