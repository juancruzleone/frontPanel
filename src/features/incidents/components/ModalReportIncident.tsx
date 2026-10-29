import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X, Camera, Copy, WifiOff, CheckCircle2 } from 'lucide-react'
import styles from '../styles/modalReportIncident.module.css'
import { incidentService } from '../services/incidentServices'
import type { IncidentType, IncidentPriority } from '../types/incidents.types'

export interface ModalReportIncidentProps {
  isOpen: boolean
  onClose: () => void
  installation?: {
    _id?: string
    company: string
    address?: string
    devices?: { _id?: string; nombre: string; ubicacion?: string; categoria?: string }[]
  } | null
  device?: {
    _id?: string
    nombre: string
    ubicacion?: string
    categoria?: string
  } | null
  availableInstallations?: {
    _id?: string
    company: string
    devices?: { _id?: string; nombre: string; ubicacion?: string; categoria?: string }[]
  }[]
  ordenPreventivaOrigenId?: string | null
  onSubmitSuccess?: (message: string) => void
}

export const ModalReportIncident: React.FC<ModalReportIncidentProps> = ({
  isOpen,
  onClose,
  installation,
  device,
  availableInstallations = [],
  ordenPreventivaOrigenId = null,
  onSubmitSuccess,
}) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedInstallationId, setSelectedInstallationId] = useState<string>(installation?._id || '')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(device?._id || '')
  const [tipoIncidencia, setTipoIncidencia] = useState<IncidentType>('falla_detectada')
  const [prioridadSugerida, setPrioridadSugerida] = useState<IncidentPriority>('media')
  const [descripcion, setDescripcion] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSelectedInstallationId(installation?._id || availableInstallations[0]?._id || '')
      setSelectedDeviceId(device?._id || '')
      setTipoIncidencia('falla_detectada')
      setPrioridadSugerida('media')
      setDescripcion('')
      setFotos([])
      setError(null)
    }
  }, [isOpen, installation, device, availableInstallations])

  const currentInstallation = installation || availableInstallations.find((inst) => inst._id === selectedInstallationId)
  const currentDevice = device || currentInstallation?.devices?.find((d) => d._id === selectedDeviceId)

  const handleCopyExample = () => {
    setTipoIncidencia('falla_detectada')
    setPrioridadSugerida('alta')
    const exampleText = t('incidents.exampleDescription', {
      defaultValue: 'Falla detectada en sensor principal. Lectura intermitente fuera de rango y alarma preventiva activada. Requiere revisión de cableado y posible sustitución de la unidad.',
    })
    setDescripcion(exampleText)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const maxPhotos = 4
    const remainingSlots = maxPhotos - fotos.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          // Comprimir imagen localmente para no saturar memoria/red
          const canvas = document.createElement('canvas')
          const maxDim = 1200
          let width = img.width
          let height = img.height

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.8)

          setFotos((prev) => (prev.length < maxPhotos ? [...prev, compressed] : prev))
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const finalInstallationId = installation?._id || selectedInstallationId
    const finalDeviceId = device?._id || selectedDeviceId

    if (!finalInstallationId) {
      setError(t('incidents.errors.installationRequired', { defaultValue: 'Seleccioná una instalación' }))
      return
    }

    if (!finalDeviceId) {
      setError(t('incidents.errors.deviceRequired', { defaultValue: 'Seleccioná un dispositivo' }))
      return
    }

    if (!descripcion || descripcion.trim().length < 5) {
      setError(t('incidents.errors.descriptionMin', { defaultValue: 'La descripción debe tener al menos 5 caracteres' }))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await incidentService.reportIncident({
        instalacionId: finalInstallationId,
        dispositivoId: finalDeviceId,
        tipoIncidencia,
        prioridadSugerida,
        descripcion: descripcion.trim(),
        fotos,
        ordenPreventivaOrigenId,
      })

      onSubmitSuccess?.(
        response.message ||
          t('incidents.success', {
            defaultValue: 'Incidencia reportada con éxito. Será revisada por la administración.',
          }),
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('incidents.errors.generic', { defaultValue: 'Error al enviar el reporte' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <AlertTriangle className={styles.headerIcon} size={22} />
            <div>
              <h2 className={styles.title}>{t('incidents.reportIncident', { defaultValue: 'Reportar incidencia' })}</h2>
              <p className={styles.subtitle}>
                {t('incidents.reportSubtitle', {
                  defaultValue: 'Registrá una falla detectada en campo para generar la orden correctiva',
                })}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('common.close', { defaultValue: 'Cerrar' })}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          {!isOnline && (
            <div className={styles.offlineNotice}>
              <WifiOff size={16} />
              <span>
                {t('incidents.offlineNotice', {
                  defaultValue: 'Sin conexión. El reporte se guardará en el equipo y se enviará al reconectar.',
                })}
              </span>
            </div>
          )}

          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Información del Dispositivo */}
          {device && installation ? (
            <div className={styles.deviceInfoCard}>
              <AlertTriangle className={styles.deviceInfoIcon} size={20} />
              <div className={styles.deviceInfoContent}>
                <div className={styles.deviceName}>{device.nombre}</div>
                <div className={styles.deviceMeta}>
                  {installation.company}
                  {device.ubicacion ? ` · ${device.ubicacion}` : ''}
                  {device.categoria ? ` · ${device.categoria}` : ''}
                </div>
              </div>
            </div>
          ) : (
            <>
              {!installation && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('incidents.installation', { defaultValue: 'Instalación' })}</label>
                  <select
                    className={styles.select}
                    value={selectedInstallationId}
                    onChange={(e) => {
                      setSelectedInstallationId(e.target.value)
                      setSelectedDeviceId('')
                    }}
                    required
                  >
                    <option value="">{t('incidents.selectInstallation', { defaultValue: 'Seleccionar instalación...' })}</option>
                    {availableInstallations.map((inst) => (
                      <option key={inst._id} value={inst._id}>
                        {inst.company}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!device && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t('incidents.device', { defaultValue: 'Dispositivo' })}</label>
                  <select
                    className={styles.select}
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={!selectedInstallationId}
                    required
                  >
                    <option value="">{t('incidents.selectDevice', { defaultValue: 'Seleccionar dispositivo...' })}</option>
                    {currentInstallation?.devices?.map((dev) => (
                      <option key={dev._id} value={dev._id}>
                        {dev.nombre} {dev.ubicacion ? `(${dev.ubicacion})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Tipo de Incidencia */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('incidents.incidentType', { defaultValue: 'Tipo de incidencia' })}</label>
            <select
              className={styles.select}
              value={tipoIncidencia}
              onChange={(e) => setTipoIncidencia(e.target.value as IncidentType)}
            >
              <option value="falla_detectada">{t('incidents.types.falla_detectada', { defaultValue: 'Falla detectada' })}</option>
              <option value="desgaste_anomalo">{t('incidents.types.desgaste_anomalo', { defaultValue: 'Desgaste anómalo' })}</option>
              <option value="riesgo_seguridad">{t('incidents.types.riesgo_seguridad', { defaultValue: 'Riesgo de seguridad' })}</option>
              <option value="operacion_defectuosa">
                {t('incidents.types.operacion_defectuosa', { defaultValue: 'Operación defectuosa' })}
              </option>
              <option value="otro">{t('incidents.types.otro', { defaultValue: 'Otro' })}</option>
            </select>
          </div>

          {/* Prioridad Sugerida */}
          <div className={styles.formGroup}>
            <label className={styles.label}>{t('incidents.suggestedPriority', { defaultValue: 'Prioridad sugerida' })}</label>
            <div className={styles.priorityGroup}>
              <button
                type="button"
                className={`${styles.priorityBtn} ${prioridadSugerida === 'baja' ? styles.priorityBajaActive : ''}`}
                onClick={() => setPrioridadSugerida('baja')}
              >
                {t('priorities.low', { defaultValue: 'Baja' })}
              </button>
              <button
                type="button"
                className={`${styles.priorityBtn} ${prioridadSugerida === 'media' ? styles.priorityMediaActive : ''}`}
                onClick={() => setPrioridadSugerida('media')}
              >
                {t('priorities.medium', { defaultValue: 'Media' })}
              </button>
              <button
                type="button"
                className={`${styles.priorityBtn} ${prioridadSugerida === 'alta' ? styles.priorityAltaActive : ''}`}
                onClick={() => setPrioridadSugerida('alta')}
              >
                {t('priorities.high', { defaultValue: 'Alta' })}
              </button>
            </div>
          </div>

          {/* Descripción */}
          <div className={styles.formGroup}>
            <div className={styles.label}>
              <span>{t('incidents.description', { defaultValue: 'Descripción' })}</span>
              <button type="button" className={styles.copyExampleBtn} onClick={handleCopyExample}>
                <Copy size={13} />
                <span>{t('incidents.copyExample', { defaultValue: 'Copiar reporte de ejemplo' })}</span>
              </button>
            </div>
            <textarea
              className={styles.textarea}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={t('incidents.descriptionPlaceholder', {
                defaultValue: 'Describí con precisión el problema detectado, ruidos, fugas o síntomas observados...',
              })}
              required
            />
          </div>

          {/* Fotografías de evidencia */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>{t('incidents.photos', { defaultValue: 'Fotografías de evidencia (opcional, máx. 4)' })}</span>
            </label>
            <div className={styles.photosGrid}>
              {fotos.map((foto, index) => (
                <div key={index} className={styles.photoPreview}>
                  <img src={foto} alt={`Evidencia ${index + 1}`} className={styles.photoImg} />
                  <button
                    type="button"
                    className={styles.photoRemoveBtn}
                    onClick={() => handleRemovePhoto(index)}
                    aria-label={t('common.delete', { defaultValue: 'Eliminar' })}
                  >
                    ×
                  </button>
                </div>
              ))}
              {fotos.length < 4 && (
                <button
                  type="button"
                  className={styles.uploadPhotoBtn}
                  onClick={() => fileInputRef.current?.click()}
                  title={t('incidents.addPhoto', { defaultValue: 'Agregar foto' })}
                >
                  <Camera size={20} />
                  <span>{t('incidents.addPhoto', { defaultValue: 'Foto' })}</span>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting
                  ? t('common.sending', { defaultValue: 'Enviando...' })
                  : t('incidents.sendReport', { defaultValue: 'Enviar reporte' })}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalReportIncident
