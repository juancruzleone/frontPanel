import React from "react"
import { useParams } from "react-router-dom"
import useDeviceForm from "../hooks/useDeviceForm"
import styles from "../styles/deviceForm.module.css"

const DeviceForm: React.FC = () => {
  const { installationId, deviceId } = useParams()
  const { deviceInfo, formFields, formData, loading, error, success, submitting, handleChange, handleSubmit } = useDeviceForm(installationId, deviceId)

  if (loading) return <div className={styles.loader}>Cargando formulario...</div>
  if (error) return <div className={styles.error}>Error: {error}</div>
  if (!deviceInfo) return <div className={styles.error}>No se encontró el dispositivo.</div>

  return (
    <div className={styles.containerDeviceForm}>
      <h2 className={styles.title}>Formulario de mantenimiento</h2>
      <div className={styles.deviceInfoBox}>
        <strong>Dispositivo:</strong> {deviceInfo.nombre} <br />
        <strong>Ubicación:</strong> {deviceInfo.ubicacion} <br />
        <strong>Categoría:</strong> {deviceInfo.categoria} <br />
        <strong>Marca:</strong> {deviceInfo.marca} <br />
        <strong>Modelo:</strong> {deviceInfo.modelo} <br />
        <strong>N° Serie:</strong> {deviceInfo.numeroSerie}
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        {formFields.map((field) => (
          <div key={field.name} className={styles.formGroup}>
            <label className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}> *</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                className={styles.textarea}
              />
            ) : field.type === "select" && field.options ? (
              <select
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                className={styles.select}
              >
                <option value="">Seleccione...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <input
                type="checkbox"
                name={field.name}
                checked={!!formData[field.name]}
                onChange={handleChange}
                className={styles.checkbox}
              />
            ) : (
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name] || ""}
                onChange={handleChange}
                required={field.required}
                className={styles.input}
              />
            )}
          </div>
        ))}
        <div className={styles.buttonRow}>
          <button type="submit" disabled={submitting} className={styles.submitButton}>
            {submitting ? "Enviando..." : "Enviar mantenimiento"}
          </button>
        </div>
        {success && <div className={styles.success}>{success}</div>}
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  )
}

export default DeviceForm 