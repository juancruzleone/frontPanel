import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { updateTechnician } from "../services/registerServices"
import { useAuthStore } from "../../../../store/authStore"
import styles from "../styles/Modal.module.css"
import formStyles from "../styles/registerForm.module.css"
import buttonStyles from "../../../../shared/components/Buttons/formButtons.module.css"
import { FiUser, FiUserCheck, FiLock, FiShield, FiEye, FiEyeOff } from "react-icons/fi"

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Estados para visibilidad de contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados de validación en tiempo real
  const [userNameError, setUserNameError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [touched, setTouched] = useState({
    userName: false,
    password: false,
    confirmPassword: false,
  })

  useEffect(() => {
    if (technician) {
      setUserName(technician.userName || "")
      setPassword("")
      setConfirmPassword("")
      // Reset validation states
      setUserNameError("")
      setPasswordError("")
      setConfirmPasswordError("")
      setTouched({
        userName: false,
        password: false,
        confirmPassword: false,
      })
    }
  }, [technician])

  // Validación de nombre de usuario
  useEffect(() => {
    if (!touched.userName) return

    if (!userName.trim()) {
      setUserNameError(t('personal.validation.usernameRequired'))
    } else if (userName.length < 4) {
      setUserNameError(t('personal.userNameMinLength'))
    } else if (!/^[a-zA-Z0-9_]+$/.test(userName)) {
      setUserNameError(t('personal.userNamePattern'))
    } else {
      setUserNameError("")
    }
  }, [userName, touched.userName, t])

  // Validación de contraseña
  useEffect(() => {
    if (!touched.password) return

    if (password && password.length < 6) {
      setPasswordError(t('personal.validation.passwordMinLength'))
    } else {
      setPasswordError("")
    }
  }, [password, touched.password, t])

  // Validación de confirmación de contraseña
  useEffect(() => {
    if (!touched.confirmPassword) return

    if (password && !confirmPassword) {
      setConfirmPasswordError(t('personal.validation.confirmPasswordRequired'))
    } else if (password && confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError(t('personal.validation.passwordsDoNotMatch'))
    } else {
      setConfirmPasswordError("")
    }
  }, [password, confirmPassword, touched.confirmPassword, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Marcar todos los campos como touched
    setTouched({
      userName: true,
      password: true,
      confirmPassword: true,
    })

    // Validaciones
    let isValid = true

    if (!userName.trim()) {
      isValid = false
    } else if (userName.length < 4) {
      isValid = false
    } else if (!/^[a-zA-Z0-9_]+$/.test(userName)) {
      isValid = false
    }

    if (password) {
      if (password.length < 6) {
        isValid = false
      }
      if (password !== confirmPassword) {
        isValid = false
      }
    }

    if (!isValid) {
      return
    }

    setLoading(true)

    try {
      const updateData: any = {
        userName: userName.trim(),
        name: userName.trim(), // Usamos userName como name para cumplir con el backend
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
    setUserNameError("")
    setPasswordError("")
    setConfirmPasswordError("")
    setTouched({
      userName: false,
      password: false,
      confirmPassword: false,
    })
    onRequestClose()
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }))
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
          <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={formStyles.formGroup}>
              <label htmlFor="userName">
                <FiUser size={16} />
                {t('personal.userName', { defaultValue: 'Nombre de Usuario' })} *
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={() => handleBlur('userName')}
                  className={userNameError && touched.userName ? formStyles.errorInput : ''}
                  placeholder={t('personal.userNamePlaceholder', { defaultValue: 'Ingrese nombre de usuario' })}
                  required
                  minLength={4}
                  pattern="[a-zA-Z0-9_]+"
                  title={t('personal.userNamePattern', { defaultValue: 'Solo letras, números y guiones bajos' })}
                />
              </div>
              {userNameError && touched.userName && (
                <p className={formStyles.inputError}>
                  {userNameError}
                </p>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label htmlFor="password">
                <FiLock size={16} />
                {t('personal.newPassword', { defaultValue: 'Nueva Contraseña' })}
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={passwordError && touched.password ? formStyles.errorInput : ''}
                  placeholder={t('personal.passwordPlaceholder', { defaultValue: 'Dejar en blanco para no cambiar' })}
                  minLength={6}
                />
                <button
                  type="button"
                  className={formStyles.eyesButton}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('personal.hidePassword') : t('personal.showPassword')}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {passwordError && touched.password ? (
                <p className={formStyles.inputError}>
                  {passwordError}
                </p>
              ) : (
                <small style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', display: 'block' }}>
                  {t('personal.passwordHint', { defaultValue: 'Dejar en blanco si no desea cambiar la contraseña' })}
                </small>
              )}
            </div>

            {password && (
              <div className={formStyles.formGroup}>
                <label htmlFor="confirmPassword">
                  <FiShield size={16} />
                  {t('personal.confirmPassword', { defaultValue: 'Confirmar Contraseña' })} *
                </label>
                <div className={formStyles.inputWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={confirmPasswordError && touched.confirmPassword ? formStyles.errorInput : ''}
                    placeholder={t('personal.confirmPasswordPlaceholder', { defaultValue: 'Confirme la nueva contraseña' })}
                    required={!!password}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className={formStyles.eyesButton}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('personal.hidePassword') : t('personal.showPassword')}
                  >
                    {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                {confirmPasswordError && touched.confirmPassword && (
                  <p className={formStyles.inputError}>
                    {confirmPasswordError}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className={formStyles.alertDanger}>
                <strong>{t('common.error')}:</strong> {error}
              </div>
            )}
          </div>

          <div className={buttonStyles.actions}>
            <button
              type="submit"
              className={buttonStyles.submitButton}
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
