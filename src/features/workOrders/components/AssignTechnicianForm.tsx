import React, { useState } from "react"
import styles from "../styles/workOrderForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import { useTranslation } from "react-i18next"

interface AssignTechnicianFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onAssign: (technicianIds: string[]) => Promise<{ message: string }>
  workOrder: { titulo: string }
  technicians: { _id: string; userName: string; role: string }[]
  initialSelectedTechnicians?: string[]
  isSubmitting: boolean
}

const AssignTechnicianForm: React.FC<AssignTechnicianFormProps> = ({
  onCancel,
  onSuccess,
  onAssign,
  workOrder,
  technicians,
  initialSelectedTechnicians = [],
  isSubmitting,
}) => {
  const { t } = useTranslation()
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>(initialSelectedTechnicians)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedTechnicians.length === 0) {
      setError(t('workOrders.selectTechnician'))
      return
    }
    try {
      const result = await onAssign(selectedTechnicians)
      onSuccess(result.message)
    } catch (err: unknown) {
      setError((err as Error).message || t('workOrders.form.errorAssigningTechnician'))
    }
  }

  const handleBlur = () => {
    setTouched(true)
    if (selectedTechnicians.length === 0) setError(t('workOrders.selectTechnician'))
    else setError("")
  }

  const handleTechnicianToggle = (technicianId: string) => {
    setSelectedTechnicians((prev) => {
      if (prev.includes(technicianId)) {
        return prev.filter((id) => id !== technicianId)
      }
      return [...prev, technicianId]
    })
    setTouched(true)
    if (error) setError("")
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>{t('workOrders.title')}</label>
          <p className={styles.readOnlyField}>{workOrder.titulo}</p>
        </div>

        <div className={styles.formGroup}>
          <label>{t('workOrders.assignTechnician')}</label>
          <div className={`${styles.multiSelectList} ${error && touched ? styles.errorInput : ""}`} onBlur={handleBlur}>
            {technicians.map((tech) => (
              <label key={tech._id} className={styles.multiSelectItem}>
                <input
                  type="checkbox"
                  checked={selectedTechnicians.includes(tech._id)}
                  onChange={() => handleTechnicianToggle(tech._id)}
                  disabled={isSubmitting}
                />
                <span>{tech.userName}</span>
              </label>
            ))}
          </div>
          {error && touched && <p className={styles.inputError}>{error}</p>}
        </div>

      </div>
      {/* Solo mostrar botones si hay técnicos disponibles */}
      {technicians.length > 0 && (
        <div className={formButtonStyles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={formButtonStyles.cancelButton}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={formButtonStyles.submitButton}
          >
            {isSubmitting ? t('workOrders.assigning') : t('workOrders.assign')}
          </button>
        </div>
      )}
    </form>
  )
}

export default AssignTechnicianForm
