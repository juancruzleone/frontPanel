import React, { useState, useRef } from "react"
import { useParams } from "react-router"
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
import RepuestosSelector from "./RepuestosSelector"
import { getMaintenanceHistory, type MaintenanceRecord } from "../services/maintenanceHistoryService"
import { useMaintenanceStore } from "../../../store/maintenanceStore"
import { useAuthStore } from "../../../store/authStore"


const DeviceForm: React.FC = () => {
  const { t } = useTranslation();
  const { installationId, deviceId } = useParams()
  const { dark } = useTheme();
  const { historyByDevice, setHistory, ownerId: maintenanceOwnerId } = useMaintenanceStore()
  const { userId } = useAuthStore()

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
    addRepuesto,
    removeRepuesto,
    repuestosUsados,
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

  const getStringFieldValue = (fieldName: string) => {
    const value = formData[fieldName]
    return typeof value === "string" || typeof value === "number" ? value : ""
  }

  const getDateFieldValue = (fieldName: string) => {
    const value = formData[fieldName]
    return typeof value === "string" ? value : undefined
  }

  // Funciones para manejo de firma digital
  const getCanvasPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return
    const point = getCanvasPoint(clientX, clientY)
    isDrawingRef.current = true
    lastPointRef.current = point
    
    // Dibujar un punto inicial
    const context = canvasRef.current.getContext("2d")
    if (!context) return
    context.beginPath()
    context.arc(point.x, point.y, 1, 0, 2 * Math.PI)
    context.fillStyle = "#0f172a"
    context.fill()
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

    const validCachedHistory = maintenanceOwnerId === userId ? historyByDevice[deviceId] : null

    try {
      if (!navigator.onLine && validCachedHistory) {
        setMaintenanceHistory(validCachedHistory)
        setLoadingHistory(false)
        return
      }

      const history = await getMaintenanceHistory(installationId, deviceId)
      setMaintenanceHistory(history)
      setHistory(deviceId, history)
    } catch (err) {
      if (validCachedHistory) {
        setMaintenanceHistory(validCachedHistory)
      } else {
        setMaintenanceHistory([])
      }
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
    <div className={styles.pageWrapper}>
      <div className={styles.containerDeviceForm}>
        {/* Header con título y estado de conexión */}
        <div className={styles.formHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{t('deviceForm.maintenanceForm')}</h1>
            <div className={styles.connectionBadge}>
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
          </div>
        </div>
        {/* Envíos pendientes */}
        {pendingSubmissions.length > 0 && (
          <div className={styles.pendingAlert}>
            <div className={styles.alertHeader}>
              <Clock size={18} />
              <h3>{t('deviceForm.pendingSubmissions', { count: pendingSubmissions.length })}</h3>
            </div>
            <div className={styles.pendingList}>
              {pendingSubmissions.map((submission) => (
                <div key={submission.id} className={styles.pendingItem}>
                  <span className={styles.pendingDate}>{t('deviceForm.savedAt', { date: formatTimestamp(submission.timestamp) })}</span>
                  {submission.retryCount > 0 && (
                    <span className={styles.retryBadge}>
                      {t('deviceForm.retryCount', { count: submission.retryCount })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid de información */}
        <div className={styles.infoGrid}>
          {/* Información de la instalación */}
          {installationInfo && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <Building2 size={20} />
                <h3>{t('deviceForm.installation')}</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('deviceForm.company')}:</span>
                  <span className={styles.infoValue}>{installationInfo.company}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('deviceForm.installationType')}:</span>
                  <span className={styles.infoValue}>{installationInfo.installationType}</span>
                </div>
                <div className={styles.infoItem}>
                  <MapPin size={16} className={styles.locationIcon} />
                  <span className={styles.infoValue}>{installationInfo.fullAddress}</span>
                </div>
              </div>
            </div>
          )}

          {/* Información del dispositivo */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <Building2 size={20} />
              <h3>{t('deviceForm.deviceDetails')}</h3>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('deviceForm.device')}:</span>
                <span className={styles.infoValue}>{deviceInfo.nombre}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('deviceForm.category')}:</span>
                <span className={styles.infoValue}>{deviceInfo.categoria}</span>
              </div>
              <div className={styles.infoItem}>
                <MapPin size={16} className={styles.locationIcon} />
                <span className={styles.infoValue}>{deviceInfo.ubicacion}</span>
              </div>
              {deviceInfo.marca && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('deviceForm.brand')}:</span>
                  <span className={styles.infoValue}>{deviceInfo.marca}</span>
                </div>
              )}
              {deviceInfo.modelo && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('deviceForm.model')}:</span>
                  <span className={styles.infoValue}>{deviceInfo.modelo}</span>
                </div>
              )}
              {deviceInfo.numeroSerie && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t('deviceForm.serialNumber')}:</span>
                  <span className={styles.infoValue}>{deviceInfo.numeroSerie}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleViewHistory}
                className={styles.historyButton}
              >
                <History size={18} />
                <span>{t('deviceForm.viewHistory', 'Historial')}</span>
              </button>
            </div>
          </div>
        </div>
        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t('deviceForm.maintenanceDetails', 'Detalles del Mantenimiento')}</h2>
            <div className={styles.fieldsGrid}>
              {formFields.map((field) => (
                <div key={field.name} className={styles.formGroup}>
                  <label className={styles.label}>
                    {t(`deviceForm.fields.${field.name}`, field.label)}
                    {field.required && <span className={styles.required}> *</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      value={getStringFieldValue(field.name)}
                      onChange={handleChange}
                      required={field.required}
                      className={styles.textarea}
                      placeholder={t(`deviceForm.fields.${field.name}`, field.label)}
                    />
                  ) : field.type === "select" && field.options ? (
                    <div className={styles.fullWidth}>
                      <HybridSelect
                        name={field.name}
                        value={String(getStringFieldValue(field.name))}
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
                        value={formatDate(getDateFieldValue(field.name) || "")}
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
                          handleSelectChange(field.name, date)
                          setDatePickerOpen({ ...datePickerOpen, [field.name]: false });
                        }}
                        selectedDate={getDateFieldValue(field.name)}
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
                      value={getStringFieldValue(field.name)}
                      onChange={handleChange}
                      required={field.required}
                      className={styles.input}
                      placeholder={t(`deviceForm.fields.${field.name}`, field.label)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sección de repuestos */}
          <RepuestosSelector 
            selectedRepuestos={repuestosUsados}
            onAdd={addRepuesto}
            onRemove={removeRepuesto}
            isOnline={isOnline}
          />

          {/* Sección de evidencia */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>{t('deviceForm.evidenceSection', 'Evidencia y Firma')}</h2>
            
            {/* Campo para subir fotos de evidencia */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {t('deviceForm.evidencePhotos', 'Fotos de Evidencia')}
              </label>
              <p className={styles.fieldDescription}>
                {t('deviceForm.evidencePhotosDescription', 'Agrega fotos que documenten el trabajo realizado')}
              </p>
              <div className={styles.photoUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach(file => handlePhotoUpload(file))
                    e.target.value = ''
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
                        aria-label={t('deviceForm.removePhoto', 'Eliminar foto')}
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
              <p className={styles.fieldDescription}>
                {t('deviceForm.signatureDescription', 'Firma en el recuadro usando tu dedo o mouse')}
              </p>
              <div className={styles.signatureBox}>
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={220}
                  className={styles.signatureCanvas}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    startDrawing(e.clientX, e.clientY)
                  }}
                  onMouseMove={(e) => {
                    e.preventDefault()
                    draw(e.clientX, e.clientY)
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault()
                    stopDrawing()
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault()
                    stopDrawing()
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    const touch = e.touches[0]
                    if (touch) {
                      startDrawing(touch.clientX, touch.clientY)
                    }
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault()
                    const touch = e.touches[0]
                    if (touch) {
                      draw(touch.clientX, touch.clientY)
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    stopDrawing()
                  }}
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
          </div>

          {/* Botones de acción */}
          <div className={styles.formActions}>
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? (
                <>
                  <div className={styles.spinner}></div>
                  <span>{t('deviceForm.sending')}</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>{isOnline ? t('deviceForm.sendMaintenance') : t('deviceForm.saveMaintenance')}</span>
                </>
              )}
            </button>
            {!isOnline && (
              <p className={styles.offlineNote}>
                <WifiOff size={16} />
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
    </div>
  )
}

export default DeviceForm
