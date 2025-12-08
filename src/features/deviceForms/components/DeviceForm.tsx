import React, { useState } from "react"
import { useParams } from "react-router-dom"
import { Wifi, WifiOff, Clock, CheckCircle, Building2, MapPin, ChevronDown, X, Calendar, History } from "lucide-react"
import useDeviceForm from "../hooks/useDeviceForm"
import HybridSelect from "../../workOrders/components/HybridSelect"
import styles from "../styles/deviceForm.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import formCheckboxStyles from "../../../shared/components/Buttons/formCheckboxes.module.css"
import { useTranslation } from "react-i18next"
import { useTheme } from "../../../shared/hooks/useTheme"
import DatePickerModal from "./DatePickerModal"
import ModalSuccess from "./ModalSuccess"
import ModalError from "./ModalError"
import MaintenanceHistoryModal from "./MaintenanceHistoryModal"
import { getMaintenanceHistory, type MaintenanceRecord } from "../services/maintenanceHistoryService"


const DeviceForm: React.FC = () => {
  const { t } = useTranslation();
  const { installationId, deviceId } = useParams()
  const { dark } = useTheme();
  const {
    deviceInfo,
    installationInfo,
    formFields,
    formData,
    loading,
    error,
    success,
    submitting,
    isOnline,
    pendingSubmissions,
    handleChange,
    handleSelectChange,
    handleSelectBlur,
    handleSubmit
  } = useDeviceForm(installationId, deviceId)

  // Estado para mostrar modales
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [modalMessage, setModalMessage] = useState("")

  // Estado para el date picker modal
  const [datePickerOpen, setDatePickerOpen] = useState<{ [key: string]: boolean }>({})
  const [datePickerField, setDatePickerField] = useState<string | null>(null)

  // Estado para el historial de mantenimientos
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Función para formatear fecha a dd/mm/yyyy
  const formatDate = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  // Mostrar modal según resultado
  React.useEffect(() => {
    if (success) {
      setModalMessage(success)
      setShowSuccess(true)
    }
    if (error) {
      setModalMessage(error)
      setShowError(true)
    }
  }, [success, error])

  // Función para cargar historial de mantenimientos
  const handleViewHistory = async () => {
    if (!installationId || !deviceId) return

    setLoadingHistory(true)
    setShowHistoryModal(true)

    try {
      const history = await getMaintenanceHistory(installationId, deviceId)
      setMaintenanceHistory(history)
    } catch (err) {
      console.error('Error al cargar historial:', err)
      setMaintenanceHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  if (loading) return <div className={styles.loader}>{t('deviceForm.loading')}</div>
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
      {/* Información de la instalación */}
      {installationInfo && (
        <div className={styles.installationInfoBox}>
          <div className={styles.infoHeader}>
            <Building2 size={20} />
            <strong>{t('deviceForm.installation')}</strong>
          </div>
          <div className={styles.infoContent}>
            <div className={styles.infoRow}>
              <strong>{t('deviceForm.company')}:</strong> {installationInfo.company}
            </div>
            <div className={styles.infoRow}>
              <MapPin size={18} className={styles.infoIcon} />
              <span>{installationInfo.fullAddress}</span>
            </div>
            <div className={styles.infoRow}>
              <strong>{t('deviceForm.installationType')}:</strong> {installationInfo.installationType}
            </div>
          </div>
        </div>
      )}
      {/* Información del dispositivo (igual estilo que instalación) */}
      <div className={styles.deviceInfoBox}>
        <div className={styles.infoHeader}>
          <Building2 size={20} />
          <strong>{t('deviceForm.deviceDetails')}</strong>
        </div>
        <div className={styles.infoContent}>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.device')}:</strong> {deviceInfo.nombre}
          </div>
          <button
            type="button"
            onClick={handleViewHistory}
            className={styles.historyButton}
            title={t('deviceForm.viewHistory', 'Ver historial de mantenimientos')}
          >
            <History size={18} />
            <span>{t('deviceForm.viewHistory', 'Historial')}</span>
          </button>
          <div className={styles.infoRow}>
            <MapPin size={18} className={styles.infoIcon} />
            <span>{deviceInfo.ubicacion}</span>
          </div>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.category')}:</strong> {deviceInfo.categoria}
          </div>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.brand')}:</strong> {deviceInfo.marca}
          </div>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.model')}:</strong> {deviceInfo.modelo}
          </div>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.serialNumber')}:</strong> {deviceInfo.numeroSerie}
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
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
              <HybridSelect
                name={field.name}
                value={formData[field.name] || ""}
                onChange={(value) => handleSelectChange(field.name, value)}
                onBlur={() => handleSelectBlur(field.name)}
                disabled={false}
                options={[
                  { value: "", label: t('deviceForm.select') },
                  ...field.options.map((opt) => ({
                    value: opt,
                    label: t(`deviceForm.options.${opt}`, opt)
                  }))
                ]}
                placeholder={t('deviceForm.select')}
                error={false}
                required={field.required}
              />
            ) : field.type === "date" ? (
              <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                <input
                  type="text"
                  name={field.name}
                  value={formatDate(formData[field.name])}
                  readOnly
                  required={field.required}
                  className={styles.input}
                  style={{ paddingRight: 40, cursor: 'pointer', background: 'var(--color-bg-light)' }}
                  placeholder={t('deviceForm.selectDate')}
                  onClick={() => {
                    setDatePickerOpen({ ...datePickerOpen, [field.name]: true });
                    setDatePickerField(field.name);
                  }}
                />
                <Calendar
                  size={20}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: dark ? '#f5f5f5' : '#111' }}
                  onClick={() => {
                    setDatePickerOpen({ ...datePickerOpen, [field.name]: true });
                    setDatePickerField(field.name);
                  }}
                />
                <DatePickerModal
                  isOpen={!!datePickerOpen[field.name]}
                  onRequestClose={() => setDatePickerOpen({ ...datePickerOpen, [field.name]: false })}
                  onDateSelect={(date) => {
                    handleChange({
                      target: {
                        name: field.name,
                        value: date,
                        type: 'date',
                      }
                    } as any);
                    setDatePickerOpen({ ...datePickerOpen, [field.name]: false });
                  }}
                  selectedDate={formData[field.name]}
                  title={t('deviceForm.selectDate')}
                  placeholder={t('deviceForm.selectDate')}
                />
              </span>
            ) : field.type === "checkbox" ? (
              <input
                type="checkbox"
                name={field.name}
                checked={!!formData[field.name]}
                onChange={handleChange}
                className={formCheckboxStyles.checkbox}
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
        <div className={formButtonStyles.actions}>
          <button type="submit" disabled={submitting} className={formButtonStyles.submitButton}>
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
      {/* Modales de éxito y error */}
      {showSuccess && (
        <ModalSuccess
          isOpen={showSuccess}
          onRequestClose={() => setShowSuccess(false)}
          mensaje={modalMessage}
        />
      )}
      {showError && (
        <ModalError
          isOpen={showError}
          onRequestClose={() => setShowError(false)}
          mensaje={modalMessage}
        />
      )}
      {/* Modal de historial de mantenimientos */}
      <MaintenanceHistoryModal
        isOpen={showHistoryModal}
        onRequestClose={() => setShowHistoryModal(false)}
        maintenances={maintenanceHistory}
        deviceName={deviceInfo?.nombre || ''}
        loading={loadingHistory}
      />
    </div>
  )
}

export default DeviceForm