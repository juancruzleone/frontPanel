import React, { useState } from "react"
import styles from "../styles/workOrderForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import { useTranslation } from "react-i18next"
import HybridSelect from "../../../shared/components/HybridSelect/HybridSelect"

interface AssignTechnicianFormProps {
  onCancel: () => void
  onSuccess: (message: string) => void
  onAssign: (technicianId: string) => Promise<{ message: string }>
  workOrder: { titulo: string }
  technicians: { _id: string; userName: string; role: string }[]
  isSubmitting: boolean
}

const AssignTechnicianForm: React.FC<AssignTechnicianFormProps> = ({
  onCancel,
  onSuccess,
  onAssign,
  workOrder,
  technicians,
  isSubmitting,
}) => {
  const { t } = useTranslation()
  const [selectedTechnician, setSelectedTechnician] = useState("")
  const [error, setError] = useState("")
  const [touched, setTouched] = useState(false)

  console.log("Técnicos en AssignTechnicianForm:", technicians)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("handleSubmit llamado con selectedTechnician:", selectedTechnician)
    if (!selectedTechnician) {
      setError(t('workOrders.selectTechnician'))
      return
    }
    try {
      console.log("Llamando onAssign con technicianId:", selectedTechnician)
      const result = await onAssign(selectedTechnician)
      console.log("onAssign completado con resultado:", result)
      onSuccess(result.message)
    } catch (err: any) {
      console.error("Error al asignar técnico:", err)
      setError(err.message || t('workOrders.form.errorAssigningTechnician'))
    }
  }

  const handleBlur = () => {
    setTouched(true)
    if (!selectedTechnician) setError(t('workOrders.selectTechnician'))
    else setError("")
  }

  const handleTechnicianSelect = (technicianId: string) => {
    setSelectedTechnician(technicianId)
    setTouched(true)
    if (error) setError("")
  }

  // Convertir técnicos a formato de opciones para HybridSelect
  const technicianOptions = technicians.map(tech => ({
    value: tech._id,
    label: tech.userName
  }))

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>{t('workOrders.title')}</label>
          <p className={styles.readOnlyField}>{workOrder.titulo}</p>
        </div>

        <div className={styles.formGroup}>
          <label>{t('workOrders.assignTechnician')}</label>
          <HybridSelect
            value={selectedTechnician}
            onChange={handleTechnicianSelect}
            onBlur={handleBlur}
            options={technicianOptions}
            placeholder={t('workOrders.selectTechnician')}
            disabled={isSubmitting}
            className={error && touched ? styles.errorInput : ""}
          />
          {error && touched && <p className={styles.inputError}>{error}</p>}
        </div>

        {/* Solo mostrar botones si hay técnicos disponibles */}
        {technicians.length > 0 && (
          <div className={formButtonStyles.actions}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={formButtonStyles.submitButton}
            >
              {isSubmitting ? t('workOrders.assigning') : t('workOrders.assign')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={formButtonStyles.cancelButton}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </form>
  )
}

export default AssignTechnicianForm
