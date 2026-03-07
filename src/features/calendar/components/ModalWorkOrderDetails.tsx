"use client"

import { useState, useEffect } from "react"
import styles from "../styles/Modal.module.css"
import formButtonStyles from "../../../shared/components/Buttons/formButtons.module.css"
import type { WorkOrder } from "../hooks/useCalendar"
import { Clock, MapPin, User, AlertCircle, Calendar, Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import i18n from "../../../i18n"
import { translatePriority, translateWorkOrderStatus, translateWorkType, translateOrderType, translateOrderOrigin } from "../../../shared/utils/backendTranslations";

interface ModalWorkOrderDetailsProps {
  isOpen: boolean
  onRequestClose: () => void
  workOrder: WorkOrder | null
  onStart?: (id: string) => Promise<void>
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const ModalWorkOrderDetails = ({
  isOpen,
  onRequestClose,
  workOrder,
  onStart,
  onSuccess,
  onError,
}: ModalWorkOrderDetailsProps) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [installationDetails, setInstallationDetails] = useState<any>(null)
  const [loadingInstallation, setLoadingInstallation] = useState(false)

  useEffect(() => {
    const loadInstallation = async () => {
      if (workOrder?.instalacion) {
        setInstallationDetails(workOrder.instalacion)
      } else if (workOrder?.instalacionId) {
        setLoadingInstallation(true)
        try {
          const { fetchInstallationById } = await import('../../../features/installations/services/installationServices')
          const data = await fetchInstallationById(workOrder.instalacionId)
          setInstallationDetails(data)
        } catch (error) {
          console.error("Error loading installation details:", error)
        } finally {
          setLoadingInstallation(false)
        }
      } else {
        setInstallationDetails(null)
      }
    }

    if (isOpen && workOrder) {
      loadInstallation()
    }
  }, [isOpen, workOrder])

  if (!isOpen || !workOrder) return null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "baja":
        return "#4CAF50"
      case "media":
        return "#FFC107"
      case "alta":
        return "#FF9800"
      case "critica":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "#9E9E9E"
      case "asignada":
        return "#2196F3"
      case "en_progreso":
        return "#FF9800"
      case "completada":
        return "#4CAF50"
      case "cancelada":
        return "#F44336"
      default:
        return "#9E9E9E"
    }
  }

  const handleStart = async () => {
    if (!onStart || !workOrder._id) return

    setIsLoading(true)
    try {
      await onStart(workOrder._id)
      onSuccess(t('calendar.orderStarted'))
    } catch (error: any) {
      onError(error.message || t('calendar.errorStartingOrder'))
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    const currentLanguage = i18n.language || 'es'
    return new Date(date).toLocaleDateString(currentLanguage, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>{t('calendar.workOrderDetails')}</h2>
          <button className={styles.closeButton} onClick={onRequestClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.workOrderDetails}>
            <div className={styles.headerSection}>
              <h3 className={styles.workOrderTitle}>{workOrder.titulo}</h3>
              <div className={styles.badges}>
                <span
                  className={styles.priorityBadge}
                  style={{ backgroundColor: getPriorityColor(workOrder.prioridad), color: '#000', fontWeight: 700 }}
                >
                  {translatePriority(workOrder.prioridad)}
                </span>
                <span className={styles.statusBadge} style={{ backgroundColor: getStatusColor(workOrder.estado), color: '#000', fontWeight: 700 }}>
                  {translateWorkOrderStatus(workOrder.estado)}
                </span>
              </div>
            </div>

            {workOrder.estado === "asignada" && onStart && (
              <div className={styles.actions} style={{ marginTop: '16px', marginBottom: '24px' }}>
                <button className={styles.startButton} onClick={handleStart} disabled={isLoading}>
                  <Play size={16} />
                  {isLoading ? t('calendar.starting') : t('calendar.startOrder')}
                </button>
              </div>
            )}

            <div className={styles.section}>
              <h4>{t('calendar.description')}</h4>
              <p>{workOrder.descripcion}</p>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <Calendar size={20} />
                <div>
                  <strong>{t('calendar.scheduledDate')}</strong>
                  <p>{formatDate(workOrder.fechaProgramada)}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock size={20} />
                <div>
                  <strong>{t('calendar.time')}</strong>
                  <p>{workOrder.horaProgramada}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <AlertCircle size={20} />
                <div>
                  <strong>{t('calendar.workType')}</strong>
                  <p>{translateWorkType(workOrder.tipoTrabajo)}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <AlertCircle size={20} />
                <div>
                  <strong>{t('workOrders.orderType')}</strong>
                  <p>{translateOrderType(workOrder.tipoOrden || "correctivo")}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <AlertCircle size={20} />
                <div>
                  <strong>{t('workOrders.origin')}</strong>
                  <p>{translateOrderOrigin(workOrder.origen || "manual")}</p>
                </div>
              </div>

              {(installationDetails || loadingInstallation) && (
                <div className={styles.infoItem}>
                  <MapPin size={20} />
                  <div>
                    <strong>{t('calendar.installation')}</strong>
                    {loadingInstallation ? (
                      <p>{t('common.loading') || 'Cargando...'}</p>
                    ) : (
                      <>
                        <p>{installationDetails?.company}</p>
                        <p className={styles.address}>
                          {installationDetails?.address}, {installationDetails?.city}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.infoItem}>
                <User size={20} />
                <div>
                  <strong>{t('calendar.assignedTechnician')}</strong>
                  <p>
                    {workOrder.tecnico
                      ? (workOrder.tecnico as any).userName
                      : t('calendar.noTechnicianAssigned') || 'Ninguno asignado'}
                  </p>
                </div>
              </div>
            </div>

            {workOrder.observaciones && (
              <div className={styles.section}>
                <h4>{t('calendar.observations')}</h4>
                <p>{workOrder.observaciones}</p>
              </div>
            )}

            {workOrder.trabajoRealizado && (
              <div className={styles.section}>
                <h4>{t('calendar.workDone')}</h4>
                <p>{workOrder.trabajoRealizado}</p>
              </div>
            )}

            {workOrder.fechaCreacion && (
              <div className={styles.section}>
                <h4>{t('calendar.additionalInfo')}</h4>
                <p>
                  <strong>{t('calendar.created')}:</strong> {formatDate(workOrder.fechaCreacion)}
                </p>
                {workOrder.fechaAsignacion && (
                  <p>
                    <strong>{t('calendar.assigned')}:</strong> {formatDate(workOrder.fechaAsignacion)}
                  </p>
                )}
                {workOrder.fechaInicio && (
                  <p>
                    <strong>{t('calendar.started')}:</strong> {formatDate(workOrder.fechaInicio)}
                  </p>
                )}
                {workOrder.fechaCompletada && (
                  <p>
                    <strong>{t('calendar.completed')}:</strong> {formatDate(workOrder.fechaCompletada)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalWorkOrderDetails
