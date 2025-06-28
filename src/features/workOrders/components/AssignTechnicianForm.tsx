import React, { useState } from "react"
import styles from "../styles/WorkOrderForm.module.css"

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
  const [selectedTechnician, setSelectedTechnician] = useState("")
  const [error, setError] = useState("")
  const [touched, setTouched] = useState(false)

  console.log("Técnicos en AssignTechnicianForm:", technicians)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTechnician) {
      setError("Seleccione un técnico")
      return
    }
    try {
      const result = await onAssign(selectedTechnician)
      onSuccess(result.message)
    } catch (err: any) {
      console.error("Error al asignar técnico:", err)
      setError(err.message || "Error al asignar técnico")
    }
  }

  const handleBlur = () => {
    setTouched(true)
    if (!selectedTechnician) setError("Seleccione un técnico")
    else setError("")
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formInner}>
        <div className={styles.formGroup}>
          <label>Orden de Trabajo</label>
          <p className={styles.readOnlyField}>{workOrder.titulo}</p>
        </div>

        <div className={styles.formGroup}>
          <label>Seleccionar Técnico</label>
          <select
            value={selectedTechnician}
            onChange={(e) => {
              setSelectedTechnician(e.target.value)
              if (error) setError("")
            }}
            onBlur={handleBlur}
            disabled={isSubmitting || technicians.length === 0}
            className={error && touched ? styles.errorInput : ""}
            aria-label="Seleccionar técnico"
          >
            <option value="">Seleccione un técnico</option>
            {technicians.map((tech) => (
              <option key={tech._id} value={tech._id}>
                {tech.userName} 
              </option>
            ))}
          </select>
          {error && touched && <p className={styles.inputError}>{error}</p>}
          {technicians.length === 0 && (
            <p className={styles.inputWarning}>
              No hay técnicos disponibles
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedTechnician || technicians.length === 0}
            className={styles.submitButton}
          >
            {isSubmitting ? "Asignando..." : "Asignar Técnico"}
          </button>
        </div>
      </div>
    </form>
  )
}

export default AssignTechnicianForm
