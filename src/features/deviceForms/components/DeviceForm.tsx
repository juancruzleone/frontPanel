import React from "react"
import { useParams } from "react-router-dom"
import { Wifi, WifiOff, Clock, CheckCircle } from "lucide-react"
import useDeviceForm from "../hooks/useDeviceForm"
import styles from "../styles/deviceForm.module.css"

const DeviceForm: React.FC = () => {
  const { installationId, deviceId } = useParams()
  const { 
    deviceInfo, 
    formFields, 
    formData, 
    loading, 
    error, 
    success, 
    submitting, 
    isOnline,
    pendingSubmissions,
    handleChange, 
    handleSubmit 
  } = useDeviceForm(installationId, deviceId)

  if (loading) return <div className={styles.loader}>Cargando formulario...</div>
  if (error) return <div className={styles.error}>Error: {error}</div>
  if (!deviceInfo) return <div className={styles.error}>No se encontró el dispositivo.</div>

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={styles.containerDeviceForm}>
      <h2 className={styles.title}>Formulario de mantenimiento</h2>
      
      {/* Estado de conexión */}
      <div className={styles.connectionStatus}>
        {isOnline ? (
          <div className={styles.onlineStatus}>
            <Wifi size={16} />
            <span>Conectado</span>
          </div>
        ) : (
          <div className={styles.offlineStatus}>
            <WifiOff size={16} />
            <span>Sin conexión - Los datos se guardarán localmente</span>
          </div>
        )}
      </div>

      {/* Envíos pendientes */}
      {pendingSubmissions.length > 0 && (
        <div className={styles.pendingSubmissions}>
          <h3>Enviós pendientes ({pendingSubmissions.length})</h3>
          <div className={styles.pendingList}>
            {pendingSubmissions.map((submission) => (
              <div key={submission.id} className={styles.pendingItem}>
                <Clock size={14} />
                <span>Guardado el {formatTimestamp(submission.timestamp)}</span>
                {submission.retryCount > 0 && (
                  <span className={styles.retryCount}>
                    Reintentos: {submission.retryCount}/3
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.deviceInfoBox}>
        <strong>Dispositivo:</strong> {deviceInfo.nombre} <br />
        <strong>Ubicación:</strong> {deviceInfo.ubicacion} <br />
        <strong>Categoría:</strong> {deviceInfo.categoria} <br />
        <strong>Marca:</strong> {deviceInfo.marca} <br />
        <strong>Modelo:</strong> {deviceInfo.modelo} <br />
        <strong>N° Serie:</strong> {deviceInfo.numeroSerie}
      </div>
      
      <form onSubmit={handleSubmit} className={styles.form}>
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
        
        <div className={styles.submitSection}>
          <button type="submit" disabled={submitting} className={styles.submitButton}>
            {submitting ? "Enviando..." : isOnline ? "Enviar mantenimiento" : "Guardar mantenimiento"}
          </button>
          {!isOnline && (
            <p className={styles.offlineNote}>
              <WifiOff size={14} />
              Los datos se guardarán localmente y se enviarán cuando haya conexión
            </p>
          )}
        </div>
      </form>
      
      {success && (
        <div className={styles.success}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  )
}

export default DeviceForm 