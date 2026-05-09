import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { updateTechnician } from "../services/registerServices"
import { useAuthStore } from "../../../../store/authStore"
import styles from "../styles/Modal.module.css"
import formStyles from "../styles/registerForm.module.css"
import buttonStyles from "../../../../shared/components/Buttons/formButtons.module.css"
import { FiEye, FiEyeOff, FiX } from "react-icons/fi"
import { getProfilePhotoUrl } from "../../../../shared/utils/imageUtils"

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
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [documento, setDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Preview de la foto nueva
  const photoPreviewUrl = useMemo(() => {
    if (profilePhoto) {
      return URL.createObjectURL(profilePhoto)
    }
    return null
  }, [profilePhoto])

  // Estados para visibilidad de contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados de validación en tiempo real
  const [userNameError, setUserNameError] = useState("")
  const [firstNameError, setFirstNameError] = useState("")
  const [lastNameError, setLastNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [documentoError, setDocumentoError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [touched, setTouched] = useState({
    userName: false,
    firstName: false,
    lastName: false,
    email: false,
    documento: false,
    password: false,
    confirmPassword: false,
  })

  useEffect(() => {
    if (technician) {
      setUserName(technician.userName || "")
      setFirstName(technician.firstName || "")
      setLastName(technician.lastName || "")
      setEmail(technician.email || "")
      setDocumento(technician.documento || "")
      setPassword("")
      setConfirmPassword("")
      setProfilePhoto(null)
      setCurrentPhotoUrl(getProfilePhotoUrl(technician.profilePhoto))
      // Reset validation states
      setUserNameError("")
      setFirstNameError("")
      setLastNameError("")
      setEmailError("")
      setDocumentoError("")
      setPasswordError("")
      setConfirmPasswordError("")
      setTouched({
        userName: false,
        firstName: false,
        lastName: false,
        email: false,
        documento: false,
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

  // Validación de nombre
  useEffect(() => {
    if (!touched.firstName) return

    if (!firstName.trim()) {
      setFirstNameError(t('personal.validation.firstNameRequired'))
    } else if (firstName.length < 2) {
      setFirstNameError(t('personal.validation.firstNameMinLength'))
    } else {
      setFirstNameError("")
    }
  }, [firstName, touched.firstName, t])

  // Validación de apellido
  useEffect(() => {
    if (!touched.lastName) return

    if (!lastName.trim()) {
      setLastNameError(t('personal.validation.lastNameRequired'))
    } else if (lastName.length < 2) {
      setLastNameError(t('personal.validation.lastNameMinLength'))
    } else {
      setLastNameError("")
    }
  }, [lastName, touched.lastName, t])

  // Validación de email
  useEffect(() => {
    if (!touched.email) return

    if (!email.trim()) {
      setEmailError(t('personal.validation.emailRequired'))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('personal.validation.emailInvalid'))
    } else {
      setEmailError("")
    }
  }, [email, touched.email, t])

  // Validación de documento
  useEffect(() => {
    if (!touched.documento) return

    if (!documento.trim()) {
      setDocumentoError(t('personal.validation.documentoRequired'))
    } else if (documento.length < 6) {
      setDocumentoError(t('personal.validation.documentoMinLength'))
    } else {
      setDocumentoError("")
    }
  }, [documento, touched.documento, t])

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
      firstName: true,
      lastName: true,
      email: true,
      documento: true,
      password: true,
      confirmPassword: true,
    })

    // Validaciones
    let isValid = true

    if (!userName.trim() || userName.length < 4 || !/^[a-zA-Z0-9_]+$/.test(userName)) {
      isValid = false
    }

    if (!firstName.trim() || firstName.length < 2) {
      isValid = false
    }

    if (!lastName.trim() || lastName.length < 2) {
      isValid = false
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      isValid = false
    }

    if (!documento.trim() || documento.length < 6) {
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
      const updateData: { 
        userName?: string
        password?: string
        firstName?: string
        lastName?: string
        email?: string
        documento?: string
        profilePhoto?: File | null
      } = {
        userName: userName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        documento: documento,
      }
      
      if (password) {
        updateData.password = password
      }

      if (profilePhoto) {
        updateData.profilePhoto = profilePhoto
      }

      await updateTechnician(technician._id || technician.id, updateData)

      onSubmitSuccess(t('personal.technicianUpdated'))
      onRequestClose()
    } catch (err: any) {
      setError(err.message || t('personal.errorUpdatingTechnician'))
      // NO resetear el formulario para mantener los datos incluyendo la foto
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setPassword("")
    setConfirmPassword("")
    setProfilePhoto(null)
    setUserNameError("")
    setFirstNameError("")
    setLastNameError("")
    setEmailError("")
    setDocumentoError("")
    setPasswordError("")
    setConfirmPasswordError("")
    setTouched({
      userName: false,
      firstName: false,
      lastName: false,
      email: false,
      documento: false,
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
            {t('personal.editTechnician')}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={formStyles.formGroup}>
              <label htmlFor="userName">
                {t('personal.userName')} *
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={() => handleBlur('userName')}
                  className={userNameError && touched.userName ? formStyles.errorInput : ''}
                  placeholder={t('personal.userNamePlaceholder')}
                  required
                  minLength={4}
                  pattern="[a-zA-Z0-9_]+"
                  title={t('personal.userNamePattern')}
                />
              </div>
              {userNameError && touched.userName && (
                <p className={formStyles.inputError}>
                  {userNameError}
                </p>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label htmlFor="firstName">
                {t('personal.firstName')} *
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  className={firstNameError && touched.firstName ? formStyles.errorInput : ''}
                  placeholder={t('personal.firstNamePlaceholder')}
                  required
                  minLength={2}
                />
              </div>
              {firstNameError && touched.firstName && (
                <p className={formStyles.inputError}>
                  {firstNameError}
                </p>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label htmlFor="lastName">
                {t('personal.lastName')} *
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  className={lastNameError && touched.lastName ? formStyles.errorInput : ''}
                  placeholder={t('personal.lastNamePlaceholder')}
                  required
                  minLength={2}
                />
              </div>
              {lastNameError && touched.lastName && (
                <p className={formStyles.inputError}>
                  {lastNameError}
                </p>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label htmlFor="email">
                {t('personal.email')} *
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={emailError && touched.email ? formStyles.errorInput : ''}
                  placeholder={t('personal.emailPlaceholder')}
                  required
                />
              </div>
              {emailError && touched.email && (
                <p className={formStyles.inputError}>
                  {emailError}
                </p>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label htmlFor="documento">
                {t('personal.documento')} *
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type="text"
                  id="documento"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  onBlur={() => handleBlur('documento')}
                  className={documentoError && touched.documento ? formStyles.errorInput : ''}
                  placeholder={t('personal.documentoPlaceholder')}
                  required
                  minLength={6}
                />
              </div>
              {documentoError && touched.documento && (
                <p className={formStyles.inputError}>
                  {documentoError}
                </p>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label htmlFor="password">
                {t('personal.newPassword')}
              </label>
              <div className={formStyles.inputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={passwordError && touched.password ? formStyles.errorInput : ''}
                  placeholder={t('personal.passwordPlaceholder')}
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
                  {t('personal.passwordHint')}
                </small>
              )}
            </div>

            {password && (
              <div className={formStyles.formGroup}>
                <label htmlFor="confirmPassword">
                  {t('personal.confirmPassword')} *
                </label>
                <div className={formStyles.inputWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={confirmPasswordError && touched.confirmPassword ? formStyles.errorInput : ''}
                    placeholder={t('personal.confirmPasswordPlaceholder')}
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

            <div className={formStyles.formGroup}>
              <label htmlFor="profilePhoto">
                {t('personal.profilePhoto')}
              </label>
              
              {/* Mostrar foto actual o preview de nueva foto */}
              {(photoPreviewUrl || currentPhotoUrl) && (
                <div className={formStyles.photoPreview}>
                  <img 
                    src={photoPreviewUrl || currentPhotoUrl || ''} 
                    alt="Preview" 
                    className={formStyles.photoPreviewImage} 
                  />
                  {photoPreviewUrl && (
                    <button
                      type="button"
                      className={formStyles.photoPreviewRemove}
                      onClick={() => setProfilePhoto(null)}
                      aria-label={t('common.remove')}
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </div>
              )}
              
              <div className={formStyles.inputWrapper}>
                <input
                  type="file"
                  id="profilePhoto"
                  accept="image/*"
                  onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                />
              </div>
              <small style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px', display: 'block' }}>
                {t('personal.profilePhotoHint')}
              </small>
            </div>

            {error && (
              <div className={formStyles.alertDanger}>
                <strong>{t('common.error')}:</strong> {error}
              </div>
            )}
          </div>

          <div className={buttonStyles.actions}>
            <button
              type="button"
              onClick={handleClose}
              className={buttonStyles.cancelButton}
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={buttonStyles.submitButton}
              disabled={loading}
            >
              {loading
                ? t('common.updating')
                : t('common.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEditTechnician
