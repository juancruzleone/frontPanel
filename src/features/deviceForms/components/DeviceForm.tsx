import React from "react"
import { useParams } from "react-router-dom"
import { Wifi, WifiOff, Clock, CheckCircle } from "lucide-react"
import useDeviceForm from "../hooks/useDeviceForm"
import styles from "../styles/deviceForm.module.css"
import { useTranslation } from "react-i18next"

const DeviceForm: React.FC = () => {
  const { t } = useTranslation();
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

  if (loading) return <div className={styles.loader}>{t('deviceForm.loading')}</div>
  if (error) return <div className={styles.error}>{t('deviceForm.error', { error })}</div>
  if (!deviceInfo) return <div className={styles.error}>{t('deviceForm.notFound')}</div>

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
      <h2 className={styles.title}>{t('deviceForm.maintenanceForm')}</h2>
      {/* Estado de conexión */}
      <div className={styles.connectionStatus}>
        {isOnline ? (
          <div className={styles.onlineStatus}>
            <Wifi size={16} />
            <span>{t('deviceForm.connected')}</span>
          </div>
        ) : (
          <div className={styles.offlineStatus}>
            <WifiOff size={16} />
            <span>{t('deviceForm.offline')}</span>
          </div>
        )}
      </div>
      {/* Envíos pendientes */}
      {pendingSubmissions.length > 0 && (
        <div className={styles.pendingSubmissions}>
          <h3>{t('deviceForm.pendingSubmissions', { count: pendingSubmissions.length })}</h3>
          <div className={styles.pendingList}>
            {pendingSubmissions.map((submission) => (
              <div key={submission.id} className={styles.pendingItem}>
                <Clock size={14} />
                <span>{t('deviceForm.savedAt', { date: formatTimestamp(submission.timestamp) })}</span>
                {submission.retryCount > 0 && (
                  <span className={styles.retryCount}>
                    {t('deviceForm.retryCount', { count: submission.retryCount })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={styles.deviceInfoBox}>
        <strong>{t('deviceForm.device')}:</strong> {deviceInfo.nombre} <br />
        <strong>{t('deviceForm.location')}:</strong> {deviceInfo.ubicacion} <br />
        <strong>{t('deviceForm.category')}:</strong> {deviceInfo.categoria} <br />
        <strong>{t('deviceForm.brand')}:</strong> {deviceInfo.marca} <br />
        <strong>{t('deviceForm.model')}:</strong> {deviceInfo.modelo} <br />
        <strong>{t('deviceForm.serialNumber')}:</strong> {deviceInfo.numeroSerie}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        {formFields.map((field) => (
          <div key={field.name} className={styles.formGroup}>
            <label className={styles.label}>
              {t(`deviceForm.fields.${field.name}`, field.label)}
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
                <option value="">{t('deviceForm.select')}</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`deviceForm.options.${opt}`, opt)}
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
            {submitting ? t('deviceForm.sending') : isOnline ? t('deviceForm.sendMaintenance') : t('deviceForm.saveMaintenance')}
          </button>
          {!isOnline && (
            <p className={styles.offlineNote}>
              <WifiOff size={14} />
              {t('deviceForm.localSaveNote')}
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