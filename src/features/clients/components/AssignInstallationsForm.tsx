import { useState } from "react"
import { useTranslation } from "react-i18next"
import styles from "../styles/AssignInstallationsForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"

interface Installation {
  _id: string
  company: string
  address: string
  city?: string
  province?: string
}

interface AssignInstallationsFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onAssign: (installationIds: string[]) => Promise<{ message: string }>
  installations: Installation[]
  isSubmitting: boolean
  clientName: string
}

const AssignInstallationsForm = ({
  onCancel,
  onSuccess,
  onAssign,
  installations,
  isSubmitting,
  clientName,
}: AssignInstallationsFormProps) => {
  const { t } = useTranslation()
  const [selectedInstallations, setSelectedInstallations] = useState<string[]>([])
  const [error, setError] = useState("")

  const handleToggleInstallation = (installationId: string) => {
    setSelectedInstallations((prev) =>
      prev.includes(installationId)
        ? prev.filter((id) => id !== installationId)
        : [...prev, installationId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (selectedInstallations.length === 0) {
      setError(t('clients.selectAtLeastOneInstallation'))
      return
    }

    try {
      const result = await onAssign(selectedInstallations)
      onSuccess(result.message)
    } catch (err: any) {
      setError(err.message || t('clients.errorAssigningInstallations'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.clientInfo}>
          <p className={styles.clientName}>
            <strong>{t('clients.assigningTo')}:</strong> {clientName}
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.installationsList}>
          <h3 className={styles.sectionTitle}>{t('clients.selectInstallations')}</h3>
          {installations.length === 0 ? (
            <p className={styles.noInstallations}>{t('clients.noInstallationsAvailable')}</p>
          ) : (
            <div className={styles.checkboxList}>
              {installations.map((installation) => (
                <label key={installation._id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={selectedInstallations.includes(installation._id)}
                    onChange={() => handleToggleInstallation(installation._id)}
                    disabled={isSubmitting}
                  />
                  <span className={styles.installationInfo}>
                    <strong>{installation.company}</strong>
                    <span className={styles.installationAddress}>
                      {installation.address}
                      {installation.city && `, ${installation.city}`}
                      {installation.province && `, ${installation.province}`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className={formButtonStyles.actions}>
          <button
            type="submit"
            className={formButtonStyles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.assigning') : t('clients.assignInstallations')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={formButtonStyles.cancelButton}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default AssignInstallationsForm
