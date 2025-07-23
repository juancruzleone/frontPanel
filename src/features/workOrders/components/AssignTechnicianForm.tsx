import React, { useState } from "react"
import styles from "../styles/workOrderForm.module.css"
import { useTranslation } from "react-i18next"
import { ChevronDown } from 'lucide-react';

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
      setError(t('workOrders.form.selectTechnician'))
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
    if (!selectedTechnician) setError(t('workOrders.form.selectTechnician'))
    else setError("")
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
          <span style={{ position: 'relative', display: 'block', width: '100%' }}>
            <select
              value={selectedTechnician}
              onChange={(e) => {
                setSelectedTechnician(e.target.value)
                if (error) setError("")
              }}
              onBlur={handleBlur}
              disabled={isSubmitting || technicians.length === 0}
              className={error && touched ? styles.errorInput : ""}
              aria-label={t('workOrders.selectTechnician')}
              style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', width: '100%' }}
            >
              <option value="">{t('workOrders.selectTechnician')}</option>
              {technicians.map((tech) => (
                <option key={tech._id} value={tech._id}>
                  {tech.userName} 
                </option>
              ))}
            </select>
            <ChevronDown size={20} className={styles.selectIcon + ' ' + (document.body.dataset.theme === 'dark' ? styles.dark : styles.light)} />
          </span>
          {error && touched && <p className={styles.inputError}>{error}</p>}
          {technicians.length === 0 && (
            <p className={styles.inputWarning}>
              {t('workOrders.noTechniciansAvailable')}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={styles.cancelButton}
          >
            {t('workOrders.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedTechnician || technicians.length === 0}
            className={styles.submitButton}
          >
            {isSubmitting ? t('workOrders.assigning') : t('workOrders.assign')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default AssignTechnicianForm
