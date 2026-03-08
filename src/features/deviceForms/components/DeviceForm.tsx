import React, { useState, useRef } from "react"
import { useParams } from "react-router-dom"
import { Wifi, WifiOff, Clock, CheckCircle, Building2, MapPin, ChevronDown, X, Calendar, History, Camera, Trash2 } from "lucide-react"
import useDeviceForm from "../hooks/useDeviceForm"
import HybridSelect from "../../../shared/components/HybridSelect/HybridSelect"
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
    handleSubmit,
    handlePhotoUpload,
    handlePhotoRemove,
    handleSignatureChange,
    clearSignature,
    fotosEvidencia,
    firmaTecnico
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

  // Refs para firma digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Función para formatear fecha a dd/mm/yyyy
  const formatDate = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  // Funciones para manejo de firma digital
  const getCanvasPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (clientX: number, clientY: number) => {
    const point = getCanvasPoint(clientX, clientY)
    isDrawingRef.current = true
    lastPointRef.current = point
  }

  const draw = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPointRef.current) return
    const context = canvasRef.current.getContext("2d")
    if (!context) return

    const point = getCanvasPoint(clientX, clientY)
    context.lineWidth = 2
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#0f172a"
    context.beginPath()
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPointRef.current = point
  }

  const stopDrawing = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png")
      handleSignatureChange(dataUrl)
    }
  }

  const handleClearSignature = () => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    clearSignature()
  }

  // Inicializar canvas
  React.useEffect(() => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext("2d")
    if (!context) return
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [])

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
              <strong>{t('deviceForm.installationType')}:</strong> {installationInfo.installationType}
            </div>
            <div className={styles.infoRow}>
              <MapPin size={18} className={styles.infoIcon} />
              <span>{installationInfo.fullAddress}</span>
            </div>
          </div>
        </div>
      )}
      {/* Información del dispositivo (igual estilo que instalación) */}
      <div className={styles.deviceInfoBox}>
        <div className={styles.infoHeader}>
          <Building2 size={24} />
          <strong>{t('deviceForm.deviceDetails')}</strong>
        </div>
        <div className={styles.infoContent}>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.device')}:</strong> {deviceInfo.nombre}
          </div>
          <div className={styles.infoRow}>
            <strong>{t('deviceForm.category')}:</strong> {deviceInfo.categoria}
          </div>
          <div className={styles.infoRow}>
            <MapPin size={18} className={styles.infoIcon} />
            <span>{deviceInfo.ubicacion}</span>
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
          {deviceInfo.marca && (
            <div className={styles.infoRow}>
              <strong>{t('deviceForm.brand')}:</strong> {deviceInfo.marca}
            </div>
          )}
          {deviceInfo.modelo && (
            <div className={styles.infoRow}>
              <strong>{t('deviceForm.model')}:</strong> {deviceInfo.modelo}
            </div>
          )}
          {deviceInfo.numeroSerie && (
            <div className={styles.infoRow}>
              <strong>{t('deviceForm.serialNumber')}:</strong> {deviceInfo.numeroSerie}
            </div>
          )}
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
              <div className={styles.fullWidth}>
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
              </div>
            ) : field.type === "date" ? (
              <span style={{ position: 'relative', display: 'block', width: '100%' }}>
                <input
                  type="text"
                  name={field.name}
                  value={formatDate(formData[field.name])}
                  readOnly
                  required={field.required}
                  className={styles.input}
                  style={{ paddingRight: 46, cursor: 'pointer' }}
                  placeholder={t('deviceForm.selectDate')}
                  onClick={() => {
                    setDatePickerOpen({ ...datePickerOpen, [field.name]: true });
                    setDatePickerField(field.name);
                  }}
                />
                <Calendar
                  size={22}
                  className={styles.calendarIconOverlay}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    opacity: 0.7
                  }}
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

        {/* Campo para subir fotos de evidencia */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            {t('deviceForm.evidencePhotos', 'Fotos de Evidencia')}
          </label>
          <div className={styles.photoUploadContainer}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                files.forEach(file => handlePhotoUpload(file))
                e.target.value = '' // Reset input
              }}
              className={styles.fileInput}
              id="photo-upload"
              disabled={submitting}
            />
            <label htmlFor="photo-upload" className={styles.photoUploadButton}>
              <Camera size={20} />
              <span>{t('deviceForm.addPhoto', 'Agregar Foto')}</span>
            </label>
          </div>
          
          {fotosEvidencia.length > 0 && (
            <div className={styles.photosGrid}>
              {fotosEvidencia.map((foto, index) => (
                <div key={index} className={styles.photoPreview}>
                  <img src={foto} alt={`Evidencia ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => handlePhotoRemove(index)}
                    className={styles.removePhotoButton}
                    disabled={submitting}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campo para firma digital */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            {t('deviceForm.digitalSignature', 'Firma Digital del Técnico')}
            <span className={styles.required}> *</span>
          </label>
          <div className={styles.signatureBox}>
            <canvas
              ref={canvasRef}
              width={720}
              height={220}
              className={styles.signatureCanvas}
              onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
              onMouseMove={(e) => draw(e.clientX, e.clientY)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                e.preventDefault()
                const touch = e.touches[0]
                startDrawing(touch.clientX, touch.clientY)
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                const touch = e.touches[0]
                draw(touch.clientX, touch.clientY)
              }}
              onTouchEnd={stopDrawing}
            />
          </div>
          <button
            type="button"
            onClick={handleClearSignature}
            disabled={submitting}
            className={styles.clearSignatureButton}
          >
            {t('deviceForm.clearSignature', 'Limpiar Firma')}
          </button>
        </div>

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